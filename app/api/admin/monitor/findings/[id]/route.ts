/**
 * PATCH /api/admin/monitor/findings/[id]
 *
 * Mutate a finding's lifecycle: acknowledge → resolve → dismiss.
 * Body: { status: 'new'|'acknowledged'|'resolved'|'dismissed', notes?: string }
 *
 * Admin only.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { auth } from '@/lib/auth/auth';
import { logAdminAction } from '@/lib/admin/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  status: z.enum(['new', 'acknowledged', 'resolved', 'dismissed']),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.code === 'unauthenticated' ? 401 : 403 },
    );
  }

  const { id } = await context.params;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid body', detail: e instanceof Error ? e.message : null },
      { status: 400 },
    );
  }

  const before = await query<{ status: string; site_id: string }>(
    `SELECT status, site_id FROM monitor_findings WHERE id = $1`,
    [id],
  );
  const cur = before.rows[0];
  if (!cur) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const sets: string[] = ['status = $2::monitor_finding_status_t'];
  const params: unknown[] = [id, body.status];
  if (body.status === 'acknowledged') {
    params.push(guard.actor.userId);
    sets.push(`acknowledged_at = NOW()`, `acknowledged_by = $${params.length}`);
  }
  if (body.status === 'resolved' || body.status === 'dismissed') {
    params.push(guard.actor.userId);
    sets.push(`resolved_at = NOW()`, `resolved_by = $${params.length}`);
  }
  if (body.notes !== undefined) {
    params.push(body.notes);
    sets.push(`resolution_notes = $${params.length}`);
  }
  if (body.status === 'new') {
    sets.push('acknowledged_at = NULL', 'acknowledged_by = NULL');
    sets.push('resolved_at = NULL', 'resolved_by = NULL');
    sets.push('resolution_notes = NULL');
  }

  await query(`UPDATE monitor_findings SET ${sets.join(', ')} WHERE id = $1`, params);

  // Refresh site totals
  await query(
    `UPDATE monitored_sites
        SET total_findings_open = (
              SELECT COUNT(*) FROM monitor_findings
               WHERE site_id = $1 AND status = 'new'
            ),
            updated_at = NOW()
      WHERE id = $1`,
    [cur.site_id],
  );

  const session = await auth();
  await logAdminAction({
    actor: {
      userId: guard.actor.userId,
      role: guard.actor.role,
      email: session?.user?.email ?? null,
    },
    action: `monitor_finding_${body.status}`,
    targetKind: 'finding',
    targetId: id,
    beforeState: { status: cur.status },
    afterState: { status: body.status, notes: body.notes ?? null },
  });

  return NextResponse.json({ ok: true });
}
