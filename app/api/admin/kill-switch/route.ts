/**
 * POST /api/admin/kill-switch — admin-gated engage/disengage of the kill switch.
 *
 * Body: { engaged: boolean, reason?: string }
 *
 * Supersedes the old /api/kill-switch (which had a TODO for role-check).
 * This handler enforces admin via requireAdmin + writes both the verification
 * audit_log row and an admin_actions row.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { setKillSwitchState } from '@/lib/orchestration/kill-switch';
import { writeAudit } from '@/lib/audit/write';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { auth } from '@/lib/auth/auth';
import { logAdminAction } from '@/lib/admin/log';
import { notifyEvent } from '@/lib/notifications/dispatch';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const Body = z.object({
  engaged: z.boolean(),
  reason: z.string().max(1000).nullable().optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.code === 'unauthenticated' ? 401 : 403 },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request', details: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const session = await auth();

  try {
    const state = await setKillSwitchState({
      engaged: body.engaged,
      reason: body.reason ?? null,
      user_id: guard.actor.userId,
    });

    await writeAudit({
      scenario: 'healthcare',
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

    await logAdminAction({
      actor: {
        userId: guard.actor.userId,
        role: guard.actor.role,
        email: session?.user?.email ?? null,
      },
      action: body.engaged ? 'kill_switch_engaged' : 'kill_switch_disengaged',
      targetKind: 'kill_switch',
      targetId: '1',
      reason: body.reason ?? null,
      afterState: { engaged: body.engaged, reason: body.reason ?? null },
    });

    void notifyEvent({
      kind: body.engaged ? 'kill_switch_engaged' : 'kill_switch_disengaged',
      event_key: `killswitch:${body.engaged ? 'engaged' : 'disengaged'}:${new Date().toISOString()}`,
      reason: body.reason ?? null,
      actor_email: session?.user?.email ?? null,
    });

    return NextResponse.json({ ok: true, state });
  } catch (err) {
    logger.error({ err }, 'kill-switch update failed');
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
