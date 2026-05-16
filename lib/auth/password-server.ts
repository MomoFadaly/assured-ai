/**
 * Password hashing — server-only.
 *
 * Uses bcryptjs (pure JS, no native compile) with cost factor 12.
 * 12 is the sweet spot in 2026 — ~250ms on a modest server CPU,
 * which is fast enough to be invisible to the user but slow enough
 * to make brute-forcing a leaked DB infeasible at scale.
 *
 * The hash format includes the cost factor and salt, so future
 * upgrades (raise cost to 13, swap to argon2id, etc.) can be done
 * lazily on next successful sign-in via `needsRehash()`.
 */

import 'server-only';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 1) {
    throw new Error('Password is empty');
  }
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  if (!plain || !hash) return false;
  // bcrypt.compare is constant-time relative to the hash. We deliberately
  // don't short-circuit on length mismatches — that would leak timing info.
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Returns true when the stored hash uses an old cost factor or algorithm
 * and should be re-hashed on the user's next successful sign-in. Today
 * that means anything bcrypt below cost 12. We can extend this later for
 * algorithm migrations (e.g. bcrypt → argon2id).
 */
export function needsRehash(hash: string): boolean {
  // bcrypt format: $2{a,b,y}$<cost>$<salt+hash>
  const m = hash.match(/^\$2[aby]\$(\d{2})\$/);
  if (!m) return true; // unknown format
  const cost = Number(m[1]);
  return cost < BCRYPT_COST;
}
