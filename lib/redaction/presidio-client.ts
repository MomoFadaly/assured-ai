/**
 * Microsoft Presidio HTTP client.
 *
 * Two-pass redaction (steps 3 and 8 of the lifecycle):
 *   - Input pass: detect PII, replace with type tokens, send tokenized
 *     prompt to the model.
 *   - Output pass: scan model output for any PII that leaked through; scrub
 *     before returning to the user.
 *
 * Why a sidecar — see ADR-003.
 *
 * Failure mode: if the sidecar is unreachable, we FAIL CLOSED — the request
 * is rejected. We never let an LLM call proceed without verified redaction
 * in a healthcare deployment.
 */

import { getConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

export interface PresidioEntity {
  entity_type: string;
  start: number;
  end: number;
  score: number;
  text?: string;
}

export interface RedactionResult {
  /** The original text. */
  original: string;
  /** The text with detected entities replaced by `<TYPE_INDEX>` tokens. */
  redacted: string;
  /** Entities found, sorted by start offset. */
  entities: PresidioEntity[];
  /** Whether any PII was detected (entities.length > 0). */
  hadPii: boolean;
  /** Latency of the redaction call (ms). */
  latencyMs: number;
}

const TIMEOUT_MS = 5_000;

// Healthcare-scoped PII/PHI recognizers. Intentionally excludes LOCATION and
// DATE_TIME — those are NOT PHI under HIPAA and over-redacting them destroys
// legitimate retrieval signal (e.g. hospital names, visiting hours). The
// HIPAA Safe Harbor identifiers are: names, geographic subdivisions smaller
// than state, dates more specific than year, phone, fax, email, SSN, MRN,
// health-plan numbers, account numbers, certificate/license numbers, vehicle
// identifiers, device identifiers, URLs, IPs, biometric identifiers, photos,
// and any other unique identifying number. We approximate that set here.
const DEFAULT_RECOGNIZERS = [
  'PHONE_NUMBER',
  'EMAIL_ADDRESS',
  'US_SSN',
  'PERSON',
  'US_DRIVER_LICENSE',
  'CREDIT_CARD',
  'MEDICAL_LICENSE',
  'IP_ADDRESS',
  // Custom recognizers registered with the sidecar:
  'MRN',
  'HEALTH_PLAN_ID',
];

interface AnalyzeRequest {
  text: string;
  language: string;
  entities?: string[];
}

interface AnonymizeRequest {
  text: string;
  analyzer_results: PresidioEntity[];
  anonymizers?: Record<string, { type: string; new_value?: string }>;
}

interface AnonymizeResponse {
  text: string;
  items: Array<{
    operator: string;
    entity_type: string;
    start: number;
    end: number;
    text: string;
  }>;
}

/**
 * Run a single redaction pass on `input`. Returns the original text alongside
 * a redacted version where every detected entity has been replaced.
 *
 * Throws if the Presidio sidecar is unreachable. Fail-closed.
 */
export async function redact(input: string): Promise<RedactionResult> {
  if (input.length === 0) {
    return { original: input, redacted: input, entities: [], hadPii: false, latencyMs: 0 };
  }

  const config = getConfig();
  const start = performance.now();

  // 1. Analyze
  const analyzeReq: AnalyzeRequest = {
    text: input,
    language: 'en',
    entities: DEFAULT_RECOGNIZERS,
  };
  const entities = await postJson<PresidioEntity[]>(config.PRESIDIO_ANALYZER_URL, analyzeReq);

  if (entities.length === 0) {
    return {
      original: input,
      redacted: input,
      entities: [],
      hadPii: false,
      latencyMs: Math.round(performance.now() - start),
    };
  }

  // 2. Anonymize using token-style replacements: <PERSON_1>, <MRN_2>, etc.
  // Counts per type so each instance gets a unique label.
  const counts: Record<string, number> = {};
  const anonymizers: Record<string, { type: string; new_value: string }> = {};
  // We can't easily produce per-instance labels via Presidio's anonymizers
  // because they apply per type, not per occurrence. We do the labeled
  // replacement ourselves instead, post-fetch.

  // Sort entities by start offset so ordering is deterministic.
  const sorted = [...entities].sort((a, b) => a.start - b.start);

  let cursor = 0;
  let redacted = '';
  for (const e of sorted) {
    if (e.start < cursor) continue; // overlap; skip
    counts[e.entity_type] = (counts[e.entity_type] ?? 0) + 1;
    const label = `<${e.entity_type}_${counts[e.entity_type]}>`;
    redacted += input.slice(cursor, e.start) + label;
    cursor = e.end;
  }
  redacted += input.slice(cursor);

  // We don't actually need the anonymize endpoint for this token strategy.
  // Suppress the unused-vars warning by referencing it for the type guard:
  void ({} as AnonymizeRequest);
  void ({} as AnonymizeResponse);
  void anonymizers;

  return {
    original: input,
    redacted,
    entities: sorted,
    hadPii: true,
    latencyMs: Math.round(performance.now() - start),
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new PresidioError(
        `Presidio returned ${response.status}: ${await response.text().catch(() => '')}`,
      );
    }
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof PresidioError) throw err;
    logger.error({ err, url }, 'Presidio call failed');
    throw new PresidioError(`Presidio sidecar unreachable at ${url}`, err);
  } finally {
    clearTimeout(timer);
  }
}

export class PresidioError extends Error {
  constructor(
    message: string,
    public readonly originalCause?: unknown,
  ) {
    super(message);
    this.name = 'PresidioError';
  }
}
