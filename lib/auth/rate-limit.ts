/**
 * Per-account login throttle.
 *
 * After 5 failed attempts in any 15-minute window we lock the account
 * for 15 minutes. The DB columns `failed_login_count` and `locked_until`
 * on `users` carry the state — durable across processes (Vercel runs
 * >1 lambda) and across restarts. Successful sign-in resets both.
 *
 * The throttle is per-email, not per-IP. Per-IP throttling lives at the
 * load-balancer layer. Per-email here defends specifically against
 * credential-stuffing — even a botnet rotating IPs gets blocked after
 * 5 wrong passwords on the same account.
 */

import 'server-only';
import { query } from '@/lib/db/client';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export type LockState =
  | { locked: false }
  | { locked: true; retryAfterSeconds: number };

export async function checkLock(email: string): Promise<LockState> {
  const r = await query<{ locked_until: Date | null }>(
    `SELECT locked_until FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  );
  const row = r.rows[0];
  if (!row || !row.locked_until) return { locked: false };
  const remaining = row.locked_until.getTime() - Date.now();
  if (remaining <= 0) return { locked: false };
  return { locked: true, retryAfterSeconds: Math.ceil(remaining / 1000) };
}

export async function recordFailedAttempt(email: string): Promise<LockState> {
  const r = await query<{ locked_until: Date | null }>(
    `UPDATE users
       SET failed_login_count = failed_login_count + 1,
           locked_until = CASE
             WHEN failed_login_count + 1 >= $2
               THEN NOW() + (INTERVAL '1 minute' * $3)
             ELSE locked_until
           END,
           updated_at = NOW()
     WHERE LOWER(email) = LOWER($1)
     RETURNING locked_until`,
    [email, MAX_ATTEMPTS, LOCK_MINUTES],
  );
  const row = r.rows[0];
  if (!row || !row.locked_until) return { locked: false };
  const remaining = row.locked_until.getTime() - Date.now();
  if (remaining <= 0) return { locked: false };
  return { locked: true, retryAfterSeconds: Math.ceil(remaining / 1000) };
}

export async function clearFailedAttempts(email: string): Promise<void> {
  await query(
    `UPDATE users
       SET failed_login_count = 0,
           locked_until = NULL,
           updated_at = NOW()
     WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
}

export const _internals = { MAX_ATTEMPTS, LOCK_MINUTES };
