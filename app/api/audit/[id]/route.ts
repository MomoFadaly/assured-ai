/**
 * GET /api/audit/[id] — fetch a single audit_log entry by id.
 *
 * Returns the full row including verification_detail (for the public proof
 * page) and the join to whatever red-flag escalation was recorded.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AuditRow {
  id: number;
  occurred_at: Date;
  scenario: string;
  query_redacted: string;
  response_redacted: string | null;
  retrieved_chunk_ids: string[] | null;
  citations: unknown;
  verification_detail: unknown;
  confidence_score: number | null;
  outcome: string;
  outcome_reason: string | null;
  pii_detected_input: boolean;
  pii_detected_output: boolean;
  red_flag_category: string | null;
  latency_ms: number | null;
  model_used: string | null;
  prev_hash: string | null;
  hash: string;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId < 1) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  const result = await query<AuditRow>(
    `SELECT id, occurred_at, scenario, query_redacted, response_redacted,
            retrieved_chunk_ids, citations, verification_detail,
            confidence_score, outcome, outcome_reason,
            pii_detected_input, pii_detected_output,
            red_flag_category, latency_ms, model_used, prev_hash, hash
       FROM audit_log
       WHERE id = $1`,
    [numericId],
  );
  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(result.rows[0]);
}
