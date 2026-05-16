/**
 * DELETE /api/admin/api-keys/[id] — revoke (soft-delete). Admin only.
 *
 * Body (optional): { reason: string }
 *
 * Revoked keys cannot be undone — operators rotate by issuing a new one.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { auth } from '@/lib/auth/auth';
import { logAdminAction } from '@/lib/admin/log';
import { revokeApiKey } from '@/lib/api-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
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

  let reason: string | null = null;
  try {
    const body = (await req.json().catch(() => null)) as { reason?: string } | null;
    reason = body?.reason ?? null;
  } catch {
    reason = null;
  }

  await revokeApiKey({ id, revokedBy: guard.actor.userId, reason });

  const session = await auth();
  await logAdminAction({
    actor: {
      userId: guard.actor.userId,
      role: guard.actor.role,
      email: session?.user?.email ?? null,
    },
    action: 'api_key_revoked',
    targetKind: 'api_key',
    targetId: id,
    reason,
  });

  return NextResponse.json({ ok: true });
}
