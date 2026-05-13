/**
 * Audit log writer.
 *
 * Step 9 of the lifecycle. Append-only at the database level (UPDATE / DELETE
 * permissions revoked); hash-chained via the `audit_log_hash_chain` trigger.
 *
 * IMPORTANT: this writer never silently fails. If we cannot persist the
 * audit record, the entire request is failed by the orchestrator. No silent
 * loss. See ADR-004.
 */

import { query, transaction } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import type {
  AuditCitation,
  EscalationSeverity,
  Outcome,
  RedFlagCategory,
  Scenario,
} from '@/lib/db/types';

export interface AuditEntry {
  scenario: Scenario;
  user_session_id: string | null;
  query_redacted: string;
  response_redacted: string | null;
  retrieved_chunk_ids: string[] | null;
  citations: AuditCitation[] | null;
  /** Full paragraph + sentence detail used to render the /v/[id] proof page. */
  verification_detail?: unknown;
  confidence_score: number | null;
  outcome: Outcome;
  outcome_reason: string | null;
  pii_detected_input: boolean;
  pii_detected_output: boolean;
  red_flag_category: RedFlagCategory | null;
  latency_ms: number | null;
  model_used: string | null;
}

export interface AuditWriteResult {
  audit_log_id: number;
  hash: string;
  prev_hash: string | null;
}

/**
 * Insert an audit row. Returns the new row's id and hash.
 *
 * NOTE: prev_hash and hash are computed by the database trigger; the values
 * inserted by application code are ignored. We read them back via RETURNING.
 */
export async function writeAudit(entry: AuditEntry): Promise<AuditWriteResult> {
  try {
    const result = await query<{ id: number; hash: string; prev_hash: string | null }>(
      `INSERT INTO audit_log
       (scenario, user_session_id, query_redacted, response_redacted,
        retrieved_chunk_ids, citations, verification_detail, confidence_score,
        outcome, outcome_reason, pii_detected_input, pii_detected_output,
        red_flag_category, latency_ms, model_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, hash, prev_hash`,
      [
        entry.scenario,
        entry.user_session_id,
        entry.query_redacted,
        entry.response_redacted,
        entry.retrieved_chunk_ids,
        entry.citations === null ? null : JSON.stringify(entry.citations),
        entry.verification_detail === undefined || entry.verification_detail === null
          ? null
          : JSON.stringify(entry.verification_detail),
        entry.confidence_score,
        entry.outcome,
        entry.outcome_reason,
        entry.pii_detected_input,
        entry.pii_detected_output,
        entry.red_flag_category,
        entry.latency_ms,
        entry.model_used,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Audit insert returned no row');
    }
    return { audit_log_id: row.id, hash: row.hash, prev_hash: row.prev_hash };
  } catch (err) {
    logger.error({ err, outcome: entry.outcome }, 'audit write failed');
    throw new AuditWriteError('Failed to persist audit log', err);
  }
}

/**
 * Insert an audit row + an escalation row in a single transaction.
 * Used by the red-flag step.
 */
export async function writeAuditWithEscalation(
  entry: AuditEntry,
  escalation: {
    category: RedFlagCategory;
    severity: EscalationSeverity;
    triggering_phrase: string | null;
  },
): Promise<AuditWriteResult> {
  return transaction(async (client) => {
    const result = await client.query<{ id: number; hash: string; prev_hash: string | null }>(
      `INSERT INTO audit_log
       (scenario, user_session_id, query_redacted, response_redacted,
        retrieved_chunk_ids, citations, verification_detail, confidence_score,
        outcome, outcome_reason, pii_detected_input, pii_detected_output,
        red_flag_category, latency_ms, model_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, hash, prev_hash`,
      [
        entry.scenario,
        entry.user_session_id,
        entry.query_redacted,
        entry.response_redacted,
        entry.retrieved_chunk_ids,
        entry.citations === null ? null : JSON.stringify(entry.citations),
        entry.verification_detail === undefined || entry.verification_detail === null
          ? null
          : JSON.stringify(entry.verification_detail),
        entry.confidence_score,
        entry.outcome,
        entry.outcome_reason,
        entry.pii_detected_input,
        entry.pii_detected_output,
        entry.red_flag_category,
        entry.latency_ms,
        entry.model_used,
      ],
    );

    const row = result.rows[0];
    if (!row) throw new Error('Audit insert returned no row');

    await client.query(
      `INSERT INTO escalations (audit_log_id, category, severity, triggering_phrase)
       VALUES ($1, $2, $3, $4)`,
      [row.id, escalation.category, escalation.severity, escalation.triggering_phrase],
    );

    return { audit_log_id: row.id, hash: row.hash, prev_hash: row.prev_hash };
  });
}

export class AuditWriteError extends Error {
  constructor(
    message: string,
    public readonly originalCause: unknown,
  ) {
    super(message);
    this.name = 'AuditWriteError';
  }
}
