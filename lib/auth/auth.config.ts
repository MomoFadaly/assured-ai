import type { NextAuthConfig } from 'next-auth';
import type { UserRole } from '@/lib/db/types';

/**
 * Edge-safe Auth.js v5 config — used by `proxy.ts` (the Next 16
 * middleware) on the edge runtime. Cannot import the @auth/pg-adapter
 * (uses pg, which is Node-only) or bcryptjs. The full Node-runtime
 * config in `lib/auth/auth.ts` extends this with providers + adapter.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/sign-in',
    verifyRequest: '/sign-in/check-email',
    error: '/sign-in',
  },
  providers: [],
  callbacks: {
    /**
     * Route guard. Runs in the proxy on every request matching the
     * config matcher. Two tiers of protection:
     *
     *   - admin-only (/admin, /api/admin)
     *   - operator+  (/library, /audit, /escalations, /voice)
     *
     * Everything else stays public — marketing, /chat verifier, /v/[id]
     * public proof, sign-in flows.
     */
    async authorized({ request, auth }) {
      const { pathname } = request.nextUrl;

      // Auth.js's own callback / signin / signout routes — never gate.
      if (pathname.startsWith('/api/auth/')) return true;

      // Public auth pages — never gate.
      if (
        pathname.startsWith('/sign-in') ||
        pathname.startsWith('/sign-up') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password') ||
        pathname.startsWith('/verify-email')
      ) {
        return true;
      }

      const role = auth?.user?.role as UserRole | undefined;

      // API routes (other than /api/auth/*) — always let through. Each
      // handler runs its own role check via requireAdmin / requireOperator
      // and returns JSON 401/403 rather than a redirect (which would
      // break fetch() callers).
      if (pathname.startsWith('/api/')) return true;

      // Admin-only HTML pages
      if (pathname.startsWith('/admin')) {
        return role === 'admin';
      }

      // Operator+ HTML pages (admin, auditor, operator)
      if (
        pathname.startsWith('/library') ||
        pathname.startsWith('/escalations') ||
        pathname.startsWith('/voice') ||
        pathname.startsWith('/audit')
      ) {
        return role === 'admin' || role === 'auditor' || role === 'operator';
      }

      // Everything else is public.
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        (token as Record<string, unknown>).role = (user as { role?: UserRole }).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const role = (token as Record<string, unknown>).role as UserRole | undefined;
        const sub = token.sub;
        // Null guard: a token without sub or role is malformed. Returning
        // a session whose user has `role: undefined` would cause middleware
        // to bounce between protected routes — fail closed and force a
        // fresh sign-in instead.
        if (!sub || !role) {
          return { ...session, user: undefined as never };
        }
        session.user.id = sub;
        session.user.role = role;
      }
      return session;
    },
  },
};
