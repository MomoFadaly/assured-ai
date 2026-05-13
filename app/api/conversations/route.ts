/**
 * GET /api/conversations — list recent verifications for the chat-history sidebar.
 *
 * Returns up to 50 most-recent audit_log entries shaped for the sidebar:
 *   id · scenario · outcome · short preview of the redacted query · timestamp
 *
 * The full verification result lives in client localStorage (so the user can
 * restore it instantly without re-querying). This endpoint is for the
 * server-side history view that survives across browsers.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Row {
  id: number;
  occurred_at: Date;
  scenario: string;
  outcome: string;
  query_redacted: string;
  pii_detected_input: boolean;
  red_flag_category: string | null;
  model_used: string | null;
}

export async function GET() {
  const result = await query<Row>(
    `SELECT id, occurred_at, scenario, outcome, query_redacted,
            pii_detected_input, red_flag_category, model_used
       FROM audit_log
       WHERE outcome IN ('answered', 'i_dont_know', 'red_flag_escalation')
       ORDER BY id DESC
       LIMIT 50`,
  );
  return NextResponse.json({
    conversations: result.rows.map((r) => ({
      id: r.id,
      occurred_at: r.occurred_at,
      scenario: r.scenario,
      outcome: r.outcome,
      preview: r.query_redacted.replace(/^<DRAFT_BRIEF>\s*/, '').slice(0, 90),
      pii_in: r.pii_detected_input,
      red_flag_category: r.red_flag_category,
      drafted: r.model_used !== null,
    })),
  });
}
