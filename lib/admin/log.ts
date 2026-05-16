/**
 * Admin-action audit log.
 *
 * Every administrator-initiated mutation MUST land here. This is the
 * forensic record separate from `audit_log` (which captures verification
 * events). Use `logAdminAction` from every mutating server action +
 * admin API route.
 */

import '@/lib/server-only';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import type { ScopedActor } from '@/lib/auth/scoped-actor';

export interface AdminActionInput {
  actor: ScopedActor & { email?: string | null };
  action: string;
  targetKind?: string | null;
  targetId?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  reason?: string | null;
  ipHint?: string | null;
}

export async function logAdminAction(input: AdminActionInput): Promise<void> {
  try {
    await query(
      `INSERT INTO admin_actions
         (actor_user_id, actor_email, actor_role, action, target_kind, target_id,
          before_state, after_state, reason, ip_hint)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        input.actor.userId,
        input.actor.email ?? null,
        input.actor.role,
        input.action,
        input.targetKind ?? null,
        input.targetId ?? null,
        input.beforeState === undefined ? null : JSON.stringify(input.beforeState),
        input.afterState === undefined ? null : JSON.stringify(input.afterState),
        input.reason ?? null,
        input.ipHint ?? null,
      ],
    );
  } catch (err) {
    // Never block a mutation on a logging failure — the action already
    // happened in the calling code. But always surface in the logs.
    logger.error({ err, action: input.action }, 'admin-action log write failed');
  }
}
