/**
 * LLM provider abstraction.
 *
 * All LLM calls go through this interface. The concrete provider (Anthropic,
 * Azure OpenAI, Ollama) is selected at runtime via LLM_PROVIDER env var.
 *
 * Why abstract:
 * 1. Different healthcare clients have different BAA postures. The most
 *    regulated will demand on-prem Ollama; mid-market will accept Azure
 *    OpenAI; unregulated POC demos can use Anthropic direct.
 * 2. ADR-002 documents this decision in detail.
 * 3. Tests can stub the provider without network calls.
 */

import type { Outcome } from '@/lib/db/types';

/** A request that returns plain text. Used for the red-flag classifier. */
export interface TextCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Hint: 'classifier' for fast small-model calls; 'synthesis' for the main answer. */
  intent: 'classifier' | 'synthesis';
  /** Hard cap on output tokens. Defaults applied per intent if omitted. */
  maxOutputTokens?: number;
  /** 0..1; lower = more deterministic. */
  temperature?: number;
}

/**
 * A request that returns JSON matching a schema. Used for synthesis with
 * citation enforcement.
 *
 * The provider is responsible for using whatever native JSON-mode / tool-use
 * mechanism produces the most reliable schema-conformant output. We do not
 * ask the provider to "please return JSON" — we use structural enforcement.
 */
export interface JsonCompletionRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  /** A JSON Schema (draft-07-compatible) describing the expected shape. */
  schema: Record<string, unknown>;
  /** Type guard to validate parsed JSON. Required: structure is the contract. */
  validate: (raw: unknown) => raw is T;
  intent: 'synthesis';
  maxOutputTokens?: number;
  temperature?: number;
  /** Optional override of the forced tool-use tool name. */
  toolName?: string;
  /** Optional override of the forced tool-use tool description. */
  toolDescription?: string;
}

export interface CompletionResult<T = string> {
  output: T;
  /** Model identifier as reported by the provider. */
  model: string;
  /** Approximate input + output tokens, if reported. */
  inputTokens?: number;
  outputTokens?: number;
  /** Time spent in the provider call, in ms. */
  latencyMs: number;
}

export interface LlmProvider {
  /** Provider identifier ('anthropic', 'azure-openai', 'ollama'). */
  readonly name: string;

  /** Fast, plain-text completion. Used for red-flag classification. */
  textCompletion(req: TextCompletionRequest): Promise<CompletionResult<string>>;

  /**
   * JSON-schema-constrained completion. Used for synthesis with citation
   * enforcement.
   *
   * Implementations MUST validate output against `req.validate` and throw
   * `JsonSchemaViolation` if validation fails. They MUST NOT silently retry
   * on validation failure (per ADR + memory guidance: no retries on paid calls).
   */
  jsonCompletion<T>(req: JsonCompletionRequest<T>): Promise<CompletionResult<T>>;
}

/** Thrown when an LLM returns JSON that does not match the validation guard. */
export class JsonSchemaViolation extends Error {
  constructor(
    public readonly providerName: string,
    public readonly rawOutput: string,
    public readonly reason: string,
  ) {
    super(`${providerName} JSON output failed validation: ${reason}`);
    this.name = 'JsonSchemaViolation';
  }
}

/** Thrown when an LLM call fails at the network/transport level. */
export class LlmTransportError extends Error {
  constructor(
    public readonly providerName: string,
    public readonly originalCause: unknown,
  ) {
    super(`${providerName} call failed at transport layer`);
    this.name = 'LlmTransportError';
  }
}

/** Outcome to record in audit log when an LLM call fails. */
export function llmFailureOutcome(): Outcome {
  return 'model_error';
}

// ============================================================
// PROVIDER FACTORY
// ============================================================

import { getConfig } from '@/lib/config';
import { AnthropicProvider } from './anthropic';
import { AzureOpenAiProvider } from './azure-openai';
import { OllamaProvider } from './ollama';

let _provider: LlmProvider | null = null;

/**
 * Returns the singleton LLM provider for the current process.
 *
 * The choice is locked at first call. To switch providers, restart the
 * process. Available providers:
 *
 *   - anthropic    Cloud Anthropic API (Sonnet + Haiku). Default.
 *   - azure-openai HIPAA-BAA path via Microsoft. Set AZURE_OPENAI_*.
 *   - ollama       Zero-egress on-prem (Llama / Mixtral / etc).
 */
export function getLlmProvider(): LlmProvider {
  if (_provider !== null) return _provider;

  const config = getConfig();
  switch (config.LLM_PROVIDER) {
    case 'anthropic':
      _provider = new AnthropicProvider();
      return _provider;
    case 'azure-openai':
      _provider = new AzureOpenAiProvider();
      return _provider;
    case 'ollama':
      _provider = new OllamaProvider();
      return _provider;
  }
}

/** For tests only. */
export function _resetLlmProvider(): void {
  _provider = null;
}
