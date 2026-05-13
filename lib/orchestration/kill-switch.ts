/**
 * Kill switch — step 1 of the lifecycle.
 *
 * Single-row table, mutated by the operator console. On every request, we
 * check the engaged flag and, if true, return a maintenance response without
 * touching the model.
 *
 * Cached for 1 second to avoid hammering Postgres on every request, balanced
 * against the operator's expectation that an engaged kill switch takes effect
 * within roughly a second site-wide.
 */

import { query } from '@/lib/db/client';

const CACHE_TTL_MS = 1000;

interface CachedState {
  value: { is_engaged: boolean; reason: string | null; engaged_at: Date | null };
  fetchedAt: number;
}

let cache: CachedState | null = null;

export interface KillSwitchState {
  is_engaged: boolean;
  reason: string | null;
  engaged_at: Date | null;
}

export async function getKillSwitchState(): Promise<KillSwitchState> {
  const now = Date.now();
  if (cache !== null && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.value;
  }
  const result = await query<KillSwitchState>(
    `SELECT is_engaged, reason, engaged_at FROM kill_switch_state WHERE id = 1`,
  );
  const value = result.rows[0] ?? { is_engaged: false, reason: null, engaged_at: null };
  cache = { value, fetchedAt: now };
  return value;
}

/**
 * Engage or disengage the kill switch. Operator console only.
 * Invalidates the local cache so subsequent reads see the change immediately.
 */
export async function setKillSwitchState(opts: {
  engaged: boolean;
  reason: string | null;
  user_id: string | null;
}): Promise<KillSwitchState> {
  await query(
    `UPDATE kill_switch_state
     SET is_engaged = $1,
         reason = $2,
         engaged_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
         engaged_by = $3
     WHERE id = 1`,
    [opts.engaged, opts.reason, opts.user_id],
  );
  cache = null;
  return getKillSwitchState();
}

/** For tests. */
export function _resetKillSwitchCache(): void {
  cache = null;
}

export const KILL_SWITCH_MESSAGE =
  'AssuredAI is currently in maintenance. Please try again shortly.';
