'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { hashPassword } from '@/lib/auth/password-server';
import { evaluatePassword } from '@/lib/auth/password';
import {
  acceptInvite,
  findInviteByToken,
} from '@/lib/onboarding';

const FormSchema = z.object({
  token: z.string().min(8).max(200),
  name: z.string().min(1).max(120),
  password: z.string().min(10).max(200),
});

export type AcceptInviteResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function acceptInviteAction(
  _prev: AcceptInviteResult | undefined,
  formData: FormData,
): Promise<AcceptInviteResult> {
  const parsed = FormSchema.safeParse({
    token: formData.get('token'),
    name: formData.get('name'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'Provide your name + a strong password.' };
  }

  const invite = await findInviteByToken(parsed.data.token);
  if (!invite) {
    return { ok: false, error: 'This invite link is invalid or expired.' };
  }

  const strength = evaluatePassword(parsed.data.password, invite.email);
  if (!strength.ok) {
    return { ok: false, error: strength.reasons[0] ?? 'Pick a stronger password.' };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  // Find-or-create the user, attach them to the invite's tenant + role.
  // The email link itself proves ownership of the inbox, so we mark
  // email_verified at the same time — no second round-trip needed.
  try {
    const existing = await query<{ id: string }>(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [invite.email],
    );
    let userId: string;
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      await query(
        `UPDATE users
            SET name = COALESCE($1, name),
                password_hash = $2,
                tenant_id = $3,
                role = $4,
                email_verified = COALESCE(email_verified, NOW()),
                invited_by = COALESCE(invited_by, $5),
                updated_at = NOW()
          WHERE id = $6`,
        [
          parsed.data.name,
          passwordHash,
          invite.tenant_id,
          invite.role,
          invite.invited_by,
          userId,
        ],
      );
    } else {
      const ins = await query<{ id: string }>(
        `INSERT INTO users (email, name, role, password_hash, tenant_id, email_verified, invited_by, created_at, updated_at)
         VALUES (LOWER($1), $2, $3, $4, $5, NOW(), $6, NOW(), NOW())
         RETURNING id`,
        [
          invite.email,
          parsed.data.name,
          invite.role,
          passwordHash,
          invite.tenant_id,
          invite.invited_by,
        ],
      );
      userId = ins.rows[0]!.id;
    }

    await acceptInvite(parsed.data.token, userId);
    logger.info(
      { inviteId: invite.id, userId, tenantId: invite.tenant_id, role: invite.role },
      'teammate invite accepted',
    );
  } catch (err) {
    logger.error({ err, inviteId: invite.id }, 'accept-invite persistence failed');
    return { ok: false, error: 'Could not complete signup — try again in a moment.' };
  }

  // Funnel into sign-in. We deliberately do NOT auto-sign the inbound
  // user in here — they should authenticate fresh so the JWT is built
  // with the right tenant + role straight from the DB on next login.
  const redirectTo =
    '/sign-in?email=' +
    encodeURIComponent(invite.email) +
    '&accepted=1';
  redirect(redirectTo);
}
