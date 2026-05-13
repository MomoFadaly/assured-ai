/**
 * GET /api/audit/chain?to=<id>&start=<id>
 *
 * Walks the hash chain from `start` (defaults to id-1) up to `to` (the target),
 * returning each step with its recomputed hash and the stored hash so the
 * client can render a step-by-step verification animation.
 *
 * If `to=42` and `start=37`, you get 6 rows: 37, 38, 39, 40, 41, 42 — each
 * with `recomputed_hash`, `stored_hash`, `prev_hash`, `match`.
 */

import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { query } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChainRow {
  id: number;
  occurred_at_text: string;
  scenario: string;
  query_redacted: string;
  response_redacted: string | null;
  outcome: string;
  outcome_reason: string | null;
  prev_hash: string | null;
  hash: string;
}

interface ChainStep {
  id: number;
  occurred_at: string;
  outcome: string;
  prev_hash: string;
  stored_hash: string;
  recomputed_hash: string;
  match: boolean;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const toRaw = url.searchParams.get('to');
  if (!toRaw) {
    return NextResponse.json({ error: 'missing ?to=<id>' }, { status: 400 });
  }
  const to = Number(toRaw);
  if (!Number.isFinite(to) || to < 1) {
    return NextResponse.json({ error: 'invalid ?to' }, { status: 400 });
  }
  // Show at most 6 prior steps by default so the UI animation is readable.
  const windowSize = Math.max(1, Math.min(10, Number(url.searchParams.get('window') ?? '6')));
  const start = Math.max(1, to - windowSize + 1);

  const rowsResult = await query<ChainRow>(
    `SELECT id, occurred_at::text AS occurred_at_text, scenario, query_redacted,
            response_redacted, outcome, outcome_reason, prev_hash, hash
       FROM audit_log
       WHERE id >= $1 AND id <= $2
       ORDER BY id ASC`,
    [start, to],
  );

  const steps: ChainStep[] = rowsResult.rows.map((r) => {
    const canonical =
      r.scenario +
      '|' +
      r.query_redacted +
      '|' +
      (r.response_redacted ?? '') +
      '|' +
      r.outcome +
      '|' +
      (r.outcome_reason ?? '') +
      '|' +
      r.occurred_at_text +
      '|' +
      (r.prev_hash ?? '');
    const recomputed = createHash('sha256').update(canonical, 'utf8').digest('hex');
    return {
      id: r.id,
      occurred_at: r.occurred_at_text,
      outcome: r.outcome,
      prev_hash: r.prev_hash ?? 'genesis',
      stored_hash: r.hash,
      recomputed_hash: recomputed,
      match: recomputed === r.hash,
    };
  });

  const startsAtGenesis = start === 1;
  return NextResponse.json({
    to,
    start,
    starts_at_genesis: startsAtGenesis,
    valid: steps.every((s) => s.match) && (startsAtGenesis ? true : true),
    steps,
  });
}
