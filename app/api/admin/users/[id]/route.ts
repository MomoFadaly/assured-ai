/**
 * PATCH /api/admin/users/[id] — change role and/or activate/deactivate.
 *
 * Body (any combination):
 *   { role: 'admin'|'auditor'|'operator'|'customer' }
 *   { deactivated: true | false }
 *
 * Role gate: admin only (enforced by proxy + this handler's requireAdmin).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { query } from '@/lib/db/client';
import { auth } from '@/lib/auth/auth';
import { logAdminAction } from '@/lib/admin/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z
  .object({
    role: z.enum(['admin', 'auditor', 'operator', 'customer']).optional(),
    deactivated: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.deactivated !== undefined, {
    message: 'Provide at least one of: role, deactivated',
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
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid body', detail: e instanceof Error ? e.message : null },
      { status: 400 },
    );
  }

  // Load current state for the audit log + self-protection check
  const before = await query<{
    email: string;
    role: 'admin' | 'auditor' | 'operator' | 'customer';
    deleted_at: Date | null;
  }>(`SELECT email, role, deleted_at FROM users WHERE id = $1`, [id]);
  const cur = before.rows[0];
  if (!cur) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Self-protection: don't let an admin remove their own admin role or
  // deactivate themselves. (Prevents accidental lockout of the only admin.)
  const session = await auth();
  if (session?.user?.id === id) {
    if (body.role && body.role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot remove your own admin role from this UI.' },
        { status: 400 },
      );
    }
    if (body.deactivated === true) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account.' },
        { status: 400 },
      );
    }
  }

  const updates: string[] = [];
  const params: unknown[] = [id];
  if (body.role) {
    params.push(body.role);
    updates.push(`role = $${params.length}::user_role_t`);
  }
  if (body.deactivated !== undefined) {
    if (body.deactivated) {
      updates.push('deleted_at = NOW()');
    } else {
      updates.push('deleted_at = NULL');
    }
  }
  updates.push('updated_at = NOW()');

  await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $1`, params);

  await logAdminAction({
    actor: {
      userId: guard.actor.userId,
      role: guard.actor.role,
      email: session?.user?.email ?? null,
    },
    action:
      body.deactivated === true
        ? 'user_deactivated'
        : body.deactivated === false
          ? 'user_restored'
          : 'user_role_changed',
    targetKind: 'user',
    targetId: id,
    beforeState: { role: cur.role, deactivated: !!cur.deleted_at, email: cur.email },
    afterState: {
      role: body.role ?? cur.role,
      deactivated:
        body.deactivated !== undefined ? body.deactivated : !!cur.deleted_at,
    },
  });

  return NextResponse.json({ ok: true });
}
