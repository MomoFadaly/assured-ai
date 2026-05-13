/**
 * Anthropic Claude provider.
 *
 * Default LLM provider. Implements the LlmProvider interface using the
 * Anthropic SDK. Two model tiers:
 *  - Synthesis (Sonnet 4.5): the main answer generator
 *  - Classifier (Haiku 4.5): fast checks (red-flag detection, small classifications)
 *
 * Uses Anthropic's tool-use mechanism for JSON-constrained output. The "tool"
 * is the structured response schema; the model is forced to call it.
 *
 * Cost discipline (never retry paid calls automatically):
 *   - One attempt. Failures bubble up.
 *   - Caller decides whether to fall back (e.g., to Haiku for synthesis).
 */

import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '@/lib/config';
import { logger } from '@/lib/logger';
import {
  type CompletionResult,
  type JsonCompletionRequest,
  JsonSchemaViolation,
  type LlmProvider,
  LlmTransportError,
  type TextCompletionRequest,
} from './provider';

const SYNTHESIS_TOOL_NAME = 'submit_governed_response';

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;
  private readonly synthesisModel: string;
  private readonly classifierModel: string;

  constructor() {
    const config = getConfig();
    if (!config.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic. Set it in .env.',
      );
    }
    this.client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    this.synthesisModel = config.ANTHROPIC_SYNTHESIS_MODEL;
    this.classifierModel = config.ANTHROPIC_CLASSIFIER_MODEL;
  }

  async textCompletion(req: TextCompletionRequest): Promise<CompletionResult<string>> {
    const model = req.intent === 'classifier' ? this.classifierModel : this.synthesisModel;
    const maxTokens = req.maxOutputTokens ?? (req.intent === 'classifier' ? 256 : 2048);
    const start = performance.now();
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: req.temperature ?? 0,
        system: req.systemPrompt,
        messages: [{ role: 'user', content: req.userPrompt }],
      });
      const latencyMs = Math.round(performance.now() - start);

      // Concatenate all text blocks into a single string.
      const output = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return {
        output,
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs,
      };
    } catch (err) {
      logger.error({ err, model, intent: req.intent }, 'Anthropic textCompletion failed');
      throw new LlmTransportError(this.name, err);
    }
  }

  async jsonCompletion<T>(req: JsonCompletionRequest<T>): Promise<CompletionResult<T>> {
    const model = this.synthesisModel;
    const maxTokens = req.maxOutputTokens ?? 4096;
    const toolName = req.toolName ?? SYNTHESIS_TOOL_NAME;
    const toolDescription =
      req.toolDescription ??
      'Submit the structured governed response. You MUST call this tool exactly once.';
    const start = performance.now();

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: req.temperature ?? 0,
        system: req.systemPrompt,
        messages: [{ role: 'user', content: req.userPrompt }],
        tools: [
          {
            name: toolName,
            description: toolDescription,
            input_schema: req.schema as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: 'tool', name: toolName },
      });

      const latencyMs = Math.round(performance.now() - start);

      // Find the tool_use block.
      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock =>
          block.type === 'tool_use' && block.name === toolName,
      );

      if (!toolUseBlock) {
        // Capture as much of the response as possible for diagnosis.
        const rawText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n');
        throw new JsonSchemaViolation(
          this.name,
          rawText || JSON.stringify(response.content),
          'Model did not invoke the required tool',
        );
      }

      const parsed = toolUseBlock.input;
      if (!req.validate(parsed)) {
        throw new JsonSchemaViolation(
          this.name,
          JSON.stringify(parsed),
          'Tool input failed schema validation guard',
        );
      }

      return {
        output: parsed,
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs,
      };
    } catch (err) {
      if (err instanceof JsonSchemaViolation) throw err;
      logger.error({ err, model }, 'Anthropic jsonCompletion failed');
      throw new LlmTransportError(this.name, err);
    }
  }
}
