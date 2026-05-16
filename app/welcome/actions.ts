'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth/auth';
import { logger } from '@/lib/logger';
import { requireTenantContext } from '@/lib/tenants';
import {
  createTeammateInvite,
  markOnboarded,
  setPreferredPack,
} from '@/lib/onboarding';
import { sendTeammateInviteEmail } from '@/lib/email/teammate-invite';
import { query } from '@/lib/db/client';

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const PackSchema = z.object({
  slug: z.enum(['healthcare', 'finance', 'government', 'legal']),
});

export async function pickPackAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in.' };

  const parsed = PackSchema.safeParse({ slug: formData.get('slug') });
  if (!parsed.success) return { ok: false, error: 'Pick a valid vertical pack.' };

  await setPreferredPack(session.user.id, parsed.data.slug);
  return { ok: true };
}

const InviteSchema = z.object({
  email: z.string().email().max(200),
  role: z.enum(['operator', 'admin', 'auditor', 'customer']).default('operator'),
});

export async function inviteTeammateAction(formData: FormData): Promise<ActionResult<{
  sent: boolean;
}>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in.' };

  const parsed = InviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role') ?? 'operator',
  });
  if (!parsed.success) {
    return { ok: false, error: 'Provide a valid email + role.' };
  }

  const ctx = await requireTenantContext();
  if (!ctx.ok) return { ok: false, error: 'No tenant context.' };

  // Reject if user already exists in this tenant — avoids confusing
  // "invite sent" messages when the person is already a member.
  const existing = await query<{ id: string }>(
    `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND tenant_id = $2`,
    [parsed.data.email, ctx.tenant.id],
  );
  if (existing.rows.length > 0) {
    return { ok: false, error: 'That person already has an account in this workspace.' };
  }

  const invite = await createTeammateInvite({
    tenantId: ctx.tenant.id,
    email: parsed.data.email,
    role: parsed.data.role,
    invitedBy: session.user.id,
  });

  // Look up tenant display name for the email + inviter display name.
  const tRow = await query<{ name: string }>(
    `SELECT name FROM tenants WHERE id = $1`,
    [ctx.tenant.id],
  );
  const tenantName = tRow.rows[0]?.name ?? 'Your AssuredAI workspace';

  const inviterName = session.user.name ?? '';
  const inviterEmail = session.user.email ?? '';

  const res = await sendTeammateInviteEmail({
    to: parsed.data.email,
    inviterName,
    inviterEmail,
    tenantName,
    role: parsed.data.role,
    token: invite.token,
    expiresAt: invite.expiresAt,
  });

  if (!res.ok) {
    logger.error({ inviteId: invite.id, err: res.error }, 'teammate invite email failed');
    return { ok: false, error: `Invite created but email send failed: ${res.error}` };
  }

  logger.info(
    { inviteId: invite.id, to: parsed.data.email, provider: res.provider },
    'teammate invite sent',
  );
  return { ok: true, data: { sent: true } };
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in.' };

  await markOnboarded(session.user.id);
  return { ok: true };
}
