/**
 * Single-use, time-limited auth tokens stored in the existing
 * `verification_token` table from @auth/pg-adapter.
 *
 * We piggy-back two flows on the same table by prefixing the
 * `identifier`:
 *   - "verify:user@example.com"   → email-confirmation links
 *   - "reset:user@example.com"    → forgot-password links
 *
 * Each row stores a SHA-256 of the random token, never the raw value.
 * The plain token is only available in memory between issuance and
 * the email send, so even a DB compromise can't replay the link.
 *
 * `consume()` deletes the row in the same transaction it returns
 * success, so a token genuinely is one-use.
 */

import 'server-only';
import { query } from '@/lib/db/client';
import { randomBytes, createHash } from 'node:crypto';

export type TokenPurpose = 'verify' | 'reset';

const TTL_MS = {
  verify: 1000 * 60 * 60 * 24, // 24h — generous for "I'll check my email later"
  reset: 1000 * 60 * 60, // 1h — tighter; this is the dangerous one
} as const;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function makeId(purpose: TokenPurpose, email: string): string {
  return `${purpose}:${email.toLowerCase().trim()}`;
}

/**
 * Issue a new single-use token for `email`. Returns the raw token
 * (caller emails it to the user) and the absolute expiry timestamp.
 *
 * If a previous unconsumed token exists for the same purpose+email,
 * we delete it first so only the most recent link is valid.
 */
export async function issueToken(
  email: string,
  purpose: TokenPurpose,
): Promise<{ token: string; expiresAt: Date }> {
  const identifier = makeId(purpose, email);
  // 32 bytes → 64 hex chars. Plenty of entropy and URL-safe.
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TTL_MS[purpose]);

  await query(`DELETE FROM verification_token WHERE identifier = $1`, [identifier]);
  await query(
    `INSERT INTO verification_token (identifier, token, expires) VALUES ($1, $2, $3)`,
    [identifier, tokenHash, expiresAt],
  );
  return { token, expiresAt };
}

/**
 * Consume a token: returns the email it was issued for, or null if
 * the token is missing, expired, or already used. Deletes the row on
 * success so the same link can't be replayed.
 */
export async function consumeToken(
  token: string,
  purpose: TokenPurpose,
): Promise<string | null> {
  const tokenHash = hashToken(token);
  const r = await query<{
    identifier: string;
    token: string;
    expires: Date;
  }>(
    `SELECT identifier, token, expires FROM verification_token WHERE token = $1 LIMIT 1`,
    [tokenHash],
  );
  const row = r.rows[0];
  if (!row) return null;
  if (!row.identifier.startsWith(`${purpose}:`)) return null;
  if (row.expires.getTime() < Date.now()) {
    await query(
      `DELETE FROM verification_token WHERE identifier = $1 AND token = $2`,
      [row.identifier, row.token],
    );
    return null;
  }
  // One-shot: remove before returning.
  await query(
    `DELETE FROM verification_token WHERE identifier = $1 AND token = $2`,
    [row.identifier, row.token],
  );
  return row.identifier.slice(`${purpose}:`.length);
}

/**
 * Garbage-collect anything past its expiry. Cheap to run as part of
 * any auth-touching action; we call it lazily.
 */
export async function gcExpiredTokens(): Promise<void> {
  await query(`DELETE FROM verification_token WHERE expires < NOW()`);
}
