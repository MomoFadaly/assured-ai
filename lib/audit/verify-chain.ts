/**
 * Audit chain verifier.
 *
 * Walks the audit_log table in id-ascending order, recomputing each row's
 * hash and verifying:
 *   - Each row's hash matches the recomputed canonical SHA-256
 *   - Each row's prev_hash equals the previous row's hash
 *   - The first row's prev_hash is the literal string "genesis"
 *
 * Returns a typed result rather than throwing — callers (CLI + admin UI)
 * present the result.
 */

import { createHash } from 'node:crypto';
import { query } from '@/lib/db/client';

export interface VerifyResult {
  valid: boolean;
  rowsChecked: number;
  firstFailureId: number | null;
  firstFailureReason: string | null;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
}

interface AuditRow {
  id: number;
  /**
   * Stringified by Postgres exactly as the trigger sees it. We must hash this
   * raw text — JavaScript's Date.toISOString() converts to UTC and truncates
   * to ms, which the SQL canonical form does not. Reading occurred_at::text
   * keeps the timezone and microsecond precision the trigger committed.
   */
  occurred_at_text: string;
  scenario: string;
  query_redacted: string;
  response_redacted: string | null;
  outcome: string;
  outcome_reason: string | null;
  prev_hash: string | null;
  hash: string;
}

const PAGE_SIZE = 1000;

export async function verifyChain(options: { startId?: number; endId?: number } = {}): Promise<VerifyResult> {
  const startedAt = new Date();
  const startId = options.startId ?? 1;
  const endId = options.endId ?? Number.MAX_SAFE_INTEGER;

  let rowsChecked = 0;
  let lastHash = startId === 1 ? 'genesis' : null;
  let cursor = startId;

  // Fetch the row immediately preceding startId if startId !== 1
  if (lastHash === null) {
    const prev = await query<AuditRow>(
      `SELECT hash FROM audit_log WHERE id < $1 ORDER BY id DESC LIMIT 1`,
      [startId],
    );
    lastHash = prev.rows[0]?.hash ?? 'genesis';
  }

  while (true) {
    const result = await query<AuditRow>(
      `SELECT id, occurred_at::text AS occurred_at_text, scenario, query_redacted, response_redacted,
              outcome, outcome_reason, prev_hash, hash
       FROM audit_log
       WHERE id >= $1 AND id <= $2
       ORDER BY id ASC
       LIMIT $3`,
      [cursor, endId, PAGE_SIZE],
    );
    if (result.rows.length === 0) break;

    for (const row of result.rows) {
      rowsChecked++;
      const recomputed = recomputeHash(row, lastHash);
      if (row.prev_hash !== lastHash) {
        return finishResult(false, rowsChecked, row.id, 'prev_hash mismatch', startedAt);
      }
      if (row.hash !== recomputed) {
        return finishResult(false, rowsChecked, row.id, 'hash mismatch', startedAt);
      }
      lastHash = row.hash;
      cursor = row.id + 1;
    }

    if (result.rows.length < PAGE_SIZE) break;
  }

  return finishResult(true, rowsChecked, null, null, startedAt);
}

function recomputeHash(row: AuditRow, prevHash: string): string {
  const canonical =
    row.scenario +
    '|' +
    (row.query_redacted ?? '') +
    '|' +
    (row.response_redacted ?? '') +
    '|' +
    row.outcome +
    '|' +
    (row.outcome_reason ?? '') +
    '|' +
    row.occurred_at_text +
    '|' +
    prevHash;
  return createHash('sha256').update(canonical, 'utf-8').digest('hex');
}

function finishResult(
  valid: boolean,
  rowsChecked: number,
  firstFailureId: number | null,
  firstFailureReason: string | null,
  startedAt: Date,
): VerifyResult {
  const finishedAt = new Date();
  return {
    valid,
    rowsChecked,
    firstFailureId,
    firstFailureReason,
    startedAt,
    finishedAt,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
  };
}
