import '@/lib/server-only';

/**
 * Shared auth helpers for server actions + API routes.
 *
 * Pattern: every operator surface call (kill switch, source library,
 * audit export, voice-profile CRUD, etc.) calls one of these to verify
 *   (a) the user is signed in
 *   (b) they have an operator-level role (admin / auditor / operator)
 *
 * Use these consistently — bypassing them in a new endpoint creates
 * surface area that defeats the rest of the auth posture.
 */

import { auth } from './auth';
import type { UserRole } from '@/lib/db/types';

const OPERATOR_ROLES = new Set<UserRole>(['admin', 'auditor', 'operator']);

export type ScopedActor = {
  userId: string;
  role: UserRole;
};

export type ActionFailure = {
  ok: false;
  error: string;
  code?: 'unauthenticated' | 'forbidden';
};

/**
 * Require an authenticated operator-class actor. Returns the actor on
 * success, or a structured failure the caller can render.
 */
export async function requireOperator(): Promise<
  { ok: true; actor: ScopedActor } | ActionFailure
> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: 'Not signed in.', code: 'unauthenticated' };
  }
  const role = session.user.role as UserRole;
  if (!OPERATOR_ROLES.has(role)) {
    return { ok: false, error: 'Insufficient permissions.', code: 'forbidden' };
  }
  return { ok: true, actor: { userId: session.user.id, role } };
}

/** Require admin specifically — for destructive operations. */
export async function requireAdmin(): Promise<
  { ok: true; actor: ScopedActor } | ActionFailure
> {
  const result = await requireOperator();
  if (!result.ok) return result;
  if (result.actor.role !== 'admin') {
    return { ok: false, error: 'This action is admin-only.', code: 'forbidden' };
  }
  return result;
}

/** Require any authenticated user (incl. customer). */
export async function requireUser(): Promise<
  { ok: true; actor: ScopedActor } | ActionFailure
> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: 'Not signed in.', code: 'unauthenticated' };
  }
  return {
    ok: true,
    actor: { userId: session.user.id, role: session.user.role as UserRole },
  };
}
