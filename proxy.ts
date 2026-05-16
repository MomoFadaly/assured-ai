/**
 * Next.js proxy (the Next 16.x rename of `middleware.ts`).
 *
 * Two-layer gating:
 *
 *   1. Auth.js's `authorized` callback (lib/auth/auth.config.ts) decides
 *      yes/no — that's the source of truth.
 *   2. This wrapper overrides where unauthorized requests go:
 *      - Not signed in        → /sign-in?callbackUrl=...
 *      - Signed in, wrong role → /forbidden?path=...&required=...
 *
 *   The second case is the important UX fix. Bouncing an authenticated
 *   customer to /sign-in when they hit /library makes the platform look
 *   like it forgot they were signed in. The /forbidden page tells them
 *   exactly what's happening and offers a clean sign-out-and-back-in
 *   path for stale JWTs.
 *
 * Edge-safe: this file imports the lean authConfig only (no DB adapter,
 * no bcryptjs, no Node-only deps).
 */

import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/auth.config';
import type { UserRole } from '@/lib/db/types';

const { auth } = NextAuth(authConfig);

const ADMIN_PREFIXES = ['/admin'];
const OPERATOR_PREFIXES = ['/library', '/audit', '/escalations', '/voice'];

function requiredRoleFor(pathname: string): 'admin' | 'operator' | null {
  if (ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) return 'admin';
  if (OPERATOR_PREFIXES.some((p) => pathname.startsWith(p))) return 'operator';
  return null;
}

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // Public + auth flow + API routes: authConfig.authorized already
  // returned true. Nothing to override.
  if (req.auth?.user) {
    // Authenticated. Check whether they actually have the right role for
    // this pathname; if not, redirect to /forbidden instead of /sign-in.
    const required = requiredRoleFor(pathname);
    if (required) {
      const role = req.auth.user.role as UserRole | undefined;
      const ok =
        required === 'admin'
          ? role === 'admin'
          : role === 'admin' || role === 'auditor' || role === 'operator';
      if (!ok) {
        const url = req.nextUrl.clone();
        url.pathname = '/forbidden';
        url.search = `?path=${encodeURIComponent(pathname)}&required=${required}`;
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // Unauthenticated. The authConfig.authorized callback decides public
  // vs gated; the default NextAuth response (redirect to /sign-in)
  // handles the rest. Return undefined to let it do its thing.
  return undefined;
});

export const config = {
  matcher: [
    // Run on every navigation except static + Next internals + known asset paths.
    '/((?!_next|api/auth|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
