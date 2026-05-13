/**
 * AssuredAI configuration.
 *
 * All runtime config is read from environment variables. No hardcoded values.
 * This module is the single source of truth for configuration shape.
 */

import { z } from 'zod';

/**
 * Configuration schema. Validated on first import; throws if env is malformed.
 */
const ConfigSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // LLM provider
  LLM_PROVIDER: z.enum(['anthropic', 'azure-openai', 'ollama']).default('anthropic'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_SYNTHESIS_MODEL: z.string().default('claude-sonnet-4-5'),
  ANTHROPIC_CLASSIFIER_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_SYNTHESIS_DEPLOYMENT: z.string().optional(),
  AZURE_OPENAI_CLASSIFIER_DEPLOYMENT: z.string().optional(),
  OLLAMA_HOST: z.string().default('http://localhost:11434'),
  OLLAMA_SYNTHESIS_MODEL: z.string().default('llama3.1:70b'),
  OLLAMA_CLASSIFIER_MODEL: z.string().default('llama3.1:8b'),

  // Embeddings
  EMBEDDING_PROVIDER: z.enum(['voyage', 'openai', 'ollama']).default('voyage'),
  VOYAGE_API_KEY: z.string().optional(),
  VOYAGE_EMBEDDING_MODEL: z.string().default('voyage-3'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-large'),

  // PII redaction
  PRESIDIO_ANALYZER_URL: z.string().default('http://localhost:5001/analyze'),
  PRESIDIO_ANONYMIZER_URL: z.string().default('http://localhost:5001/anonymize'),

  // Auth
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/admin/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/admin/sign-up'),

  // Observability
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),

  // Confidence gates
  RETRIEVAL_TOP_K: z.coerce.number().int().min(1).max(50).default(8),
  RETRIEVAL_MIN_SIMILARITY: z.coerce.number().min(0).max(1).default(0.65),
  SYNTHESIS_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.72),

  // Emergency phone numbers (regional override)
  EMERGENCY_PHONE_911: z.string().default('911'),
  MENTAL_HEALTH_CRISIS_PHONE: z.string().default('988'),
  POISON_CONTROL_PHONE: z.string().default('1-800-222-1222'),

  // Deployment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Validate and freeze the configuration at import time.
 * Fast-fail: if config is wrong, the app does not start.
 */
function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return parsed.data;
}

let _config: Config | null = null;

/**
 * Returns the validated configuration. Cached after first call.
 *
 * In test environments, call resetConfig() between tests to pick up env changes.
 */
export function getConfig(): Config {
  if (_config === null) {
    _config = loadConfig();
  }
  return _config;
}

/** Reset cached config — for tests only. */
export function resetConfig(): void {
  _config = null;
}
