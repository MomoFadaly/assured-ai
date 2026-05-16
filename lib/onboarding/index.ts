/**
 * Onboarding helpers — backing data for the /welcome wizard.
 *
 * Centralised so admin tools and the wizard share one truth about
 * "is this user onboarded?" and "what pack did they pick?".
 */

import '@/lib/server-only';
import { randomBytes, createHash } from 'node:crypto';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';

const INVITE_TTL_DAYS = 14;
const INVITE_TOKEN_BYTES = 32;

export interface UserPrefs {
  preferred_pack_slug: string | null;
  onboarded_at: Date | null;
}

export async function getUserPrefs(userId: string): Promise<UserPrefs | null> {
  const r = await query<UserPrefs>(
    `SELECT preferred_pack_slug, onboarded_at FROM users WHERE id = $1`,
    [userId],
  );
  return r.rows[0] ?? null;
}

export async function setPreferredPack(userId: string, slug: string | null): Promise<void> {
  await query(
    `UPDATE users SET preferred_pack_slug = $2, updated_at = NOW() WHERE id = $1`,
    [userId, slug],
  );
}

export async function markOnboarded(userId: string): Promise<void> {
  await query(
    `UPDATE users
        SET onboarded_at = COALESCE(onboarded_at, NOW()),
            updated_at = NOW()
      WHERE id = $1`,
    [userId],
  );
}

/**
 * Returns true when the user must visit /welcome before the rest of
 * the app. Used by the proxy + sign-in completion handler.
 */
export async function needsOnboarding(userId: string): Promise<boolean> {
  const p = await getUserPrefs(userId);
  return !p?.onboarded_at;
}

// ============================================================
// TEAMMATE INVITES
// ============================================================

export interface CreateInviteInput {
  tenantId: string;
  email: string;
  role: 'operator' | 'admin' | 'auditor' | 'customer';
  invitedBy: string;
}

export interface CreatedInvite {
  id: string;
  token: string;        // plaintext — return ONCE, never persisted
  expiresAt: Date;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createTeammateInvite(input: CreateInviteInput): Promise<CreatedInvite> {
  const token = randomBytes(INVITE_TOKEN_BYTES).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const r = await query<{ id: string }>(
    `INSERT INTO teammate_invites (tenant_id, email, role, token_hash, invited_by, expires_at)
     VALUES ($1, LOWER($2), $3, $4, $5, $6)
     RETURNING id`,
    [input.tenantId, input.email, input.role, tokenHash, input.invitedBy, expiresAt],
  );
  return { id: r.rows[0]!.id, token, expiresAt };
}

export interface PendingInvite {
  id: string;
  tenant_id: string;
  email: string;
  role: 'operator' | 'admin' | 'auditor' | 'customer';
  invited_by: string;
  expires_at: Date;
}

export async function findInviteByToken(token: string): Promise<PendingInvite | null> {
  const r = await query<PendingInvite>(
    `SELECT id, tenant_id, email, role, invited_by, expires_at
       FROM teammate_invites
      WHERE token_hash = $1
        AND accepted_at IS NULL
        AND expires_at > NOW()`,
    [hashToken(token)],
  );
  return r.rows[0] ?? null;
}

export async function acceptInvite(token: string, acceptedByUserId: string): Promise<void> {
  await query(
    `UPDATE teammate_invites
        SET accepted_at = NOW(),
            accepted_by = $2
      WHERE token_hash = $1
        AND accepted_at IS NULL`,
    [hashToken(token), acceptedByUserId],
  );
}

export async function listPendingInvitesForTenant(tenantId: string): Promise<Array<{
  id: string;
  email: string;
  role: string;
  invited_at: Date;
  expires_at: Date;
  inviter_email: string | null;
}>> {
  const r = await query<{
    id: string;
    email: string;
    role: string;
    invited_at: Date;
    expires_at: Date;
    inviter_email: string | null;
  }>(
    `SELECT ti.id, ti.email, ti.role, ti.created_at AS invited_at, ti.expires_at,
            u.email AS inviter_email
       FROM teammate_invites ti
       LEFT JOIN users u ON u.id = ti.invited_by
      WHERE ti.tenant_id = $1
        AND ti.accepted_at IS NULL
        AND ti.expires_at > NOW()
      ORDER BY ti.created_at DESC`,
    [tenantId],
  );
  return r.rows;
}

export async function revokeInvite(id: string, tenantId: string): Promise<void> {
  await query(
    `DELETE FROM teammate_invites WHERE id = $1 AND tenant_id = $2 AND accepted_at IS NULL`,
    [id, tenantId],
  );
  logger.info({ id, tenantId }, 'teammate invite revoked');
}
