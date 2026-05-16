/**
 * Azure OpenAI provider.
 *
 * Selected when `LLM_PROVIDER=azure-openai`. The Azure flavour matters
 * for regulated buyers — Microsoft holds the HIPAA Business Associate
 * Agreement that lets Azure OpenAI process PHI without violating the
 * Security Rule. Same applies to Microsoft's federal / DoD impact
 * regions for FedRAMP Moderate / High deployments.
 *
 * The wire format is mostly OpenAI Chat Completions over an
 * Azure-specific URL shape:
 *   {endpoint}/openai/deployments/{deployment}/chat/completions?api-version=...
 *
 * Two deployments per environment:
 *   AZURE_OPENAI_SYNTHESIS_DEPLOYMENT  e.g. gpt-4o (or gpt-4.1)
 *   AZURE_OPENAI_CLASSIFIER_DEPLOYMENT e.g. gpt-4o-mini
 *
 * JSON-mode: Azure OpenAI supports OpenAI's `tools` + `tool_choice`
 * pattern, which we use to force structured output exactly like
 * AnthropicProvider's tool-use enforcement. We do NOT use response_format
 * because tool-choice gives stricter shape conformance + an explicit
 * function name we can validate.
 *
 * No retries on paid calls (ADR + repeated feedback memory).
 */

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

const DEFAULT_API_VERSION = '2024-08-01-preview';
const SYNTHESIS_TOOL_NAME = 'submit_governed_response';

interface AzureMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

interface AzureToolCall {
  id?: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface AzureChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    tool_calls?: AzureToolCall[];
  };
  finish_reason: string;
}

interface AzureResponse {
  id: string;
  object: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  choices: AzureChoice[];
}

export class AzureOpenAiProvider implements LlmProvider {
  readonly name = 'azure-openai';
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly synthesisDeployment: string;
  private readonly classifierDeployment: string;
  private readonly apiVersion: string;

  constructor() {
    const config = getConfig();
    if (!config.AZURE_OPENAI_ENDPOINT || !config.AZURE_OPENAI_API_KEY) {
      throw new Error(
        'AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are required when LLM_PROVIDER=azure-openai.',
      );
    }
    if (
      !config.AZURE_OPENAI_SYNTHESIS_DEPLOYMENT ||
      !config.AZURE_OPENAI_CLASSIFIER_DEPLOYMENT
    ) {
      throw new Error(
        'AZURE_OPENAI_SYNTHESIS_DEPLOYMENT and AZURE_OPENAI_CLASSIFIER_DEPLOYMENT are required for the synthesis + classifier model tiers.',
      );
    }
    this.endpoint = config.AZURE_OPENAI_ENDPOINT.replace(/\/+$/, '');
    this.apiKey = config.AZURE_OPENAI_API_KEY;
    this.synthesisDeployment = config.AZURE_OPENAI_SYNTHESIS_DEPLOYMENT;
    this.classifierDeployment = config.AZURE_OPENAI_CLASSIFIER_DEPLOYMENT;
    this.apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? DEFAULT_API_VERSION;
  }

  private deploymentFor(intent: 'classifier' | 'synthesis'): string {
    return intent === 'classifier' ? this.classifierDeployment : this.synthesisDeployment;
  }

  private url(deployment: string): string {
    return `${this.endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(this.apiVersion)}`;
  }

  async textCompletion(req: TextCompletionRequest): Promise<CompletionResult<string>> {
    const deployment = this.deploymentFor(req.intent);
    const maxTokens = req.maxOutputTokens ?? (req.intent === 'classifier' ? 256 : 2048);
    const messages: AzureMessage[] = [
      { role: 'system', content: req.systemPrompt },
      { role: 'user', content: req.userPrompt },
    ];
    const start = performance.now();
    try {
      const r = await fetch(this.url(deployment), {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          max_tokens: maxTokens,
          temperature: req.temperature ?? 0,
        }),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`Azure OpenAI HTTP ${r.status}: ${text.slice(0, 400)}`);
      }
      const data = (await r.json()) as AzureResponse;
      const choice = data.choices[0];
      const output = choice?.message?.content ?? '';
      return {
        output,
        model: data.model ?? deployment,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (err) {
      logger.error({ err, deployment, intent: req.intent }, 'Azure textCompletion failed');
      throw new LlmTransportError(this.name, err);
    }
  }

  async jsonCompletion<T>(req: JsonCompletionRequest<T>): Promise<CompletionResult<T>> {
    const deployment = this.synthesisDeployment;
    const maxTokens = req.maxOutputTokens ?? 4096;
    const toolName = req.toolName ?? SYNTHESIS_TOOL_NAME;
    const toolDescription =
      req.toolDescription ??
      'Submit the structured governed response. You MUST call this tool exactly once.';
    const start = performance.now();

    try {
      const r = await fetch(this.url(deployment), {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: req.systemPrompt },
            { role: 'user', content: req.userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: req.temperature ?? 0,
          tools: [
            {
              type: 'function',
              function: {
                name: toolName,
                description: toolDescription,
                parameters: req.schema,
              },
            },
          ],
          // Force the model to call this exact tool — the OpenAI-style
          // analog of Anthropic's `tool_choice: { type, name }`.
          tool_choice: {
            type: 'function',
            function: { name: toolName },
          },
        }),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`Azure OpenAI HTTP ${r.status}: ${text.slice(0, 400)}`);
      }
      const data = (await r.json()) as AzureResponse;
      const latencyMs = Math.round(performance.now() - start);

      const choice = data.choices[0];
      const call = choice?.message?.tool_calls?.find((c) => c.function?.name === toolName);
      if (!call) {
        const rawText = choice?.message?.content ?? '';
        throw new JsonSchemaViolation(
          this.name,
          rawText || JSON.stringify(choice ?? {}),
          'Model did not invoke the required tool',
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(call.function.arguments);
      } catch (parseErr) {
        throw new JsonSchemaViolation(
          this.name,
          call.function.arguments,
          `tool arguments not valid JSON: ${parseErr instanceof Error ? parseErr.message : 'unknown'}`,
        );
      }
      if (!req.validate(parsed)) {
        throw new JsonSchemaViolation(
          this.name,
          JSON.stringify(parsed),
          'Tool input failed schema validation guard',
        );
      }

      return {
        output: parsed,
        model: data.model ?? deployment,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        latencyMs,
      };
    } catch (err) {
      if (err instanceof JsonSchemaViolation) throw err;
      logger.error({ err, deployment }, 'Azure jsonCompletion failed');
      throw new LlmTransportError(this.name, err);
    }
  }
}
