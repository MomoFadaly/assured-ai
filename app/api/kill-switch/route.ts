/**
 * POST /api/admin/kill-switch — engage / disengage the kill switch.
 *
 * IMPORTANT: this endpoint is gated by Clerk middleware (admin layout).
 * In production, role-check the user before allowing the mutation.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { setKillSwitchState } from '@/lib/orchestration/kill-switch';
import { writeAudit } from '@/lib/audit/write';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  engaged: z.boolean(),
  reason: z.string().max(1000).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  let body;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request', details: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  // TODO: when Clerk middleware is wired up, get user_id from auth() and verify
  // role === 'admin' before allowing.

  try {
    const state = await setKillSwitchState({
      engaged: body.engaged,
      reason: body.reason ?? null,
      user_id: null,
    });

    // Log the action to the audit trail.
    await writeAudit({
      scenario: 'healthcare', // operator actions are scenario-agnostic; pick a default
      user_session_id: null,
      query_redacted: body.engaged ? '<KILL_SWITCH_ENGAGE>' : '<KILL_SWITCH_DISENGAGE>',
      response_redacted: body.reason ?? null,
      retrieved_chunk_ids: null,
      citations: null,
      confidence_score: null,
      outcome: body.engaged ? 'kill_switch_engaged' : 'kill_switch_disengaged',
      outcome_reason: body.reason ?? null,
      pii_detected_input: false,
      pii_detected_output: false,
      red_flag_category: null,
      latency_ms: null,
      model_used: null,
    });

    return NextResponse.json({ ok: true, state });
  } catch (err) {
    logger.error({ err }, 'kill-switch update failed');
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
