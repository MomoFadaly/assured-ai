/**
 * Ollama provider — for zero-egress, fully on-prem deployments.
 *
 * Why: the most regulated buyers (federal, large hospital systems with
 * strict data-residency requirements, defence-adjacent) cannot send
 * content to any cloud LLM regardless of BAA. Running Llama / Mixtral /
 * etc. inside the client's own infrastructure via Ollama is the only
 * compliant path.
 *
 * Wire format: Ollama's /api/chat endpoint with `format: 'json'` for
 * structured output. Ollama does NOT have native tool-use enforcement
 * the way Anthropic + OpenAI do, so we prompt the model to emit JSON
 * conforming to the schema and validate via the caller's type guard.
 *
 * Two models per environment:
 *   OLLAMA_SYNTHESIS_MODEL   e.g. llama3.1:70b, mixtral:8x22b
 *   OLLAMA_CLASSIFIER_MODEL  e.g. llama3.1:8b
 *
 * No retries on paid calls (consistent with ADR even when "paid" is
 * just GPU-time — keeps cost + behavior predictable).
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

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: { role: string; content: string };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
  total_duration?: number;
}

export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';
  private readonly host: string;
  private readonly synthesisModel: string;
  private readonly classifierModel: string;

  constructor() {
    const config = getConfig();
    this.host = config.OLLAMA_HOST.replace(/\/+$/, '');
    this.synthesisModel = config.OLLAMA_SYNTHESIS_MODEL;
    this.classifierModel = config.OLLAMA_CLASSIFIER_MODEL;
  }

  private modelFor(intent: 'classifier' | 'synthesis'): string {
    return intent === 'classifier' ? this.classifierModel : this.synthesisModel;
  }

  async textCompletion(req: TextCompletionRequest): Promise<CompletionResult<string>> {
    const model = this.modelFor(req.intent);
    const start = performance.now();
    try {
      const r = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: req.systemPrompt },
            { role: 'user', content: req.userPrompt },
          ] satisfies OllamaChatMessage[],
          stream: false,
          options: {
            temperature: req.temperature ?? 0,
            num_predict: req.maxOutputTokens ?? (req.intent === 'classifier' ? 256 : 2048),
          },
        }),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`Ollama HTTP ${r.status}: ${text.slice(0, 400)}`);
      }
      const data = (await r.json()) as OllamaChatResponse;
      return {
        output: data.message?.content ?? '',
        model: data.model ?? model,
        inputTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (err) {
      logger.error({ err, model, intent: req.intent }, 'Ollama textCompletion failed');
      throw new LlmTransportError(this.name, err);
    }
  }

  async jsonCompletion<T>(req: JsonCompletionRequest<T>): Promise<CompletionResult<T>> {
    const model = this.synthesisModel;
    const start = performance.now();

    // Augment the system prompt with the schema. Ollama lacks native
    // tool-use, so we ask the model for raw JSON + use Ollama's `format`
    // flag to enforce JSON-only output at the decoding layer. We DO NOT
    // include any chain-of-thought scaffolding — the goal is one clean
    // JSON object that satisfies the caller's validate() guard.
    const schemaSystem = `${req.systemPrompt}

IMPORTANT: Reply with ONE valid JSON object only. The object must match this JSON Schema exactly:
${JSON.stringify(req.schema, null, 2)}

Do not include any commentary, code fence, or markdown — only the JSON object.`;

    try {
      const r = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: schemaSystem },
            { role: 'user', content: req.userPrompt },
          ] satisfies OllamaChatMessage[],
          stream: false,
          format: 'json',
          options: {
            temperature: req.temperature ?? 0,
            num_predict: req.maxOutputTokens ?? 4096,
          },
        }),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`Ollama HTTP ${r.status}: ${text.slice(0, 400)}`);
      }
      const data = (await r.json()) as OllamaChatResponse;
      const raw = data.message?.content ?? '';

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        throw new JsonSchemaViolation(
          this.name,
          raw,
          `Output was not valid JSON despite format=json: ${e instanceof Error ? e.message : 'unknown'}`,
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
        model: data.model ?? model,
        inputTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (err) {
      if (err instanceof JsonSchemaViolation) throw err;
      logger.error({ err, model }, 'Ollama jsonCompletion failed');
      throw new LlmTransportError(this.name, err);
    }
  }
}
