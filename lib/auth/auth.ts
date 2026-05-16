/**
 * Auth.js v5 — Node-runtime config for AssuredAI.
 *
 * Two providers, fully interchangeable on the same account:
 *
 *   1. Credentials  — email + bcrypt-hashed password. Self-serve signup
 *      with email-verification gating, forgot-password reset flow, and
 *      per-account login throttling (5 wrong → 15-min lock).
 *
 *   2. Google OAuth — one-click sign-in. Auto-links to an existing
 *      credentials account when the email matches, because Google
 *      always returns a verified email (`email_verified: true` in the
 *      ID token). That's the ONLY place we enable
 *      `allowDangerousEmailAccountLinking` — never on a provider that
 *      doesn't itself verify ownership.
 *
 * The lean edge-safe config lives in `auth.config.ts` and is what the
 * proxy / middleware imports. This file only runs in Node-runtime
 * contexts: API routes, server components, server actions.
 *
 * Cross-link defence: an extra signIn callback step guards against
 * Auth.js's known footgun where an authenticated session can capture
 * an OAuth account link from a different email. See inline comments.
 */

import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import PostgresAdapter from '@auth/pg-adapter';
import { Pool } from 'pg';
import { getConfig } from '@/lib/config';
import { query } from '@/lib/db/client';
import { authConfig } from './auth.config';
import {
  verifyPassword,
  needsRehash,
  hashPassword,
} from './password-server';
import {
  checkLock,
  recordFailedAttempt,
  clearFailedAttempts,
} from './rate-limit';
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import type { UserRole } from '@/lib/db/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession['user'];
  }
  interface User {
    role: UserRole;
  }
}

const HAS_GOOGLE = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

/**
 * Exported so UI can show/hide the Google button without duplicating the
 * env-var check. Read on the server; never expose the secret.
 */
export const googleEnabled = HAS_GOOGLE;

/**
 * @auth/pg-adapter wants its own pg Pool. We create a dedicated one
 * here rather than reusing the app pool — keeps the adapter's queries
 * cleanly isolated and avoids pool-handler conflicts.
 */
const adapterPool = new Pool({
  connectionString: getConfig().DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PostgresAdapter(adapterPool),
  providers: [
    Credentials({
      name: 'Email + password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const email = String(raw?.email ?? '').trim().toLowerCase();
        const password = String(raw?.password ?? '');
        if (!email || !password) return null;

        const lock = await checkLock(email);
        if (lock.locked) {
          // Auth.js surfaces this as a generic CredentialsSignin error — we
          // never tell the attacker "the account is locked" or "the password
          // was wrong" specifically. The server action layer translates the
          // generic error back into a user-friendly message based on its own
          // checkLock() call.
          return null;
        }

        const r = await query<{
          id: string;
          email: string;
          name: string | null;
          image: string | null;
          role: UserRole;
          password_hash: string | null;
          email_verified: Date | null;
          deleted_at: Date | null;
        }>(
          `SELECT id, email, name, image, role, password_hash, email_verified, deleted_at
             FROM users
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1`,
          [email],
        );
        const u = r.rows[0];
        if (!u || !u.password_hash) {
          // Don't leak "account exists but no password set" — Google-only
          // accounts look identical to non-existent ones from this path.
          await recordFailedAttempt(email).catch(() => {});
          return null;
        }
        if (u.deleted_at) return null;
        if (!u.email_verified) {
          await recordFailedAttempt(email).catch(() => {});
          return null;
        }

        const ok = await verifyPassword(password, u.password_hash);
        if (!ok) {
          await recordFailedAttempt(email).catch(() => {});
          return null;
        }

        // Successful auth — clear any prior failures and lazy-rehash if
        // the stored cost factor is below current target.
        await clearFailedAttempts(email).catch(() => {});
        if (needsRehash(u.password_hash)) {
          try {
            const next = await hashPassword(password);
            await query(
              `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
              [next, u.id],
            );
          } catch {
            // Non-fatal — the user is signed in, we just didn't upgrade.
          }
        }

        return {
          id: u.id,
          email: u.email,
          name: u.name,
          image: u.image,
          role: u.role,
        };
      },
    }),
    ...(HAS_GOOGLE
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            // Google guarantees email ownership (the OAuth token includes
            // `email_verified: true` and the SDK only honours that). It's
            // safe to merge a Google sign-in with a pre-existing local
            // account that has the same email — that's the whole point
            // of "interchangeable sign-in".
            allowDangerousEmailAccountLinking: true,
            authorization: {
              params: {
                // Force the chooser so users with multiple Google accounts
                // can pick. `consent` would also ensure a fresh refresh_token
                // but bothers users on every sign-in; we only need it on
                // first connect, so default `select_account` is fine.
                prompt: 'select_account',
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account, profile }) {
      // Credentials: authorize() already vetted the user. Allow.
      if (account?.provider === 'credentials') return true;

      // ----------------------------------------------------------------
      // Cross-session-account-link defence (CRITICAL).
      //
      // Auth.js v5's OAuth login handler has a subtle but dangerous
      // behaviour: if the user already has an active session AND the
      // OAuth account they're completing is not yet linked, the OAuth
      // account is auto-linked to the *current session user* — with NO
      // email match check.
      //
      // Concretely: a signed-in admin clicks "Sign up with Google",
      // selects a personal Google account → that personal Google account
      // gets linked to the admin row. Any future Google sign-in with the
      // personal account then logs in as admin. Privilege-escalation
      // primitive.
      //
      // The fix: peek at the existing session cookie and refuse the
      // OAuth callback when the session-user's email doesn't match the
      // OAuth profile's email. Users wanting to sign in with a different
      // account must sign out first.
      // ----------------------------------------------------------------
      if (!user.email) return false;
      const lower = user.email.toLowerCase();
      const profileVerified =
        (profile as { email_verified?: boolean } | undefined)?.email_verified;
      if (account?.provider === 'google' && profileVerified !== true) {
        return false;
      }

      try {
        const c = await cookies();
        const cookieName = process.env.AUTH_URL?.startsWith('https')
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token';
        const tok =
          c.get(cookieName)?.value ??
          c.get('authjs.session-token')?.value ??
          c.get('__Secure-authjs.session-token')?.value;
        if (tok && process.env.AUTH_SECRET) {
          const decoded = await decode({
            token: tok,
            secret: process.env.AUTH_SECRET,
            salt: cookieName,
          }).catch(() => null);
          const sessionEmail =
            typeof decoded?.email === 'string' ? decoded.email.toLowerCase() : null;
          if (sessionEmail && sessionEmail !== lower) {
            // eslint-disable-next-line no-console
            console.warn(
              '[auth:signIn] refused cross-link: active session for',
              sessionEmail,
              'tried to OAuth as',
              lower,
            );
            return false;
          }
        }
      } catch {
        // Cookie peek failure → fall through. We never want a defensive
        // check to brick legitimate sign-ins on a bad cookie parse.
      }

      // Google: ensure a users row exists. The PostgresAdapter would
      // create one automatically, but we want to seed `role` and
      // `email_verified` and avoid duplicate rows when the email matches
      // an existing local account. That existing-row path is what makes
      // Google + email interchangeable.
      const existingResult = await query<{
        id: string;
        deleted_at: Date | null;
      }>(`SELECT id, deleted_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [
        lower,
      ]);
      const existing = existingResult.rows[0];

      if (existing) {
        if (existing.deleted_at) return false;
        // Backfill name/image/email_verified from the Google profile if
        // we don't have them yet. Don't overwrite existing values.
        await query(
          `UPDATE users
              SET name = COALESCE($1, name),
                  image = COALESCE($2, image),
                  email_verified = COALESCE(email_verified, CASE WHEN $3 THEN NOW() ELSE NULL END),
                  updated_at = NOW()
            WHERE id = $4`,
          [user.name ?? null, user.image ?? null, profileVerified === true, existing.id],
        );
        return true;
      }

      // First-time Google signup: create as customer with verified email.
      try {
        await query(
          `INSERT INTO users (email, name, image, role, email_verified, created_at, updated_at)
           VALUES (LOWER($1), $2, $3, 'customer', NOW(), NOW(), NOW())
           ON CONFLICT (email) DO NOTHING`,
          [lower, user.name ?? null, user.image ?? null],
        );
        return true;
      } catch {
        return false;
      }
    },

    async jwt({ token, user, account, profile, trigger }) {
      // Defensive identity reset on OAuth sign-in. See lib/auth.ts in
      // Wild Pest for the long-form rationale (cross-link bug remediation).
      if (trigger === 'signIn' && account?.provider === 'google' && profile) {
        const oauthEmail =
          typeof (profile as { email?: string }).email === 'string'
            ? (profile as { email: string }).email.toLowerCase()
            : null;
        if (oauthEmail) {
          const r = await query<{ id: string; role: UserRole }>(
            `SELECT id, role FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
            [oauthEmail],
          );
          const u = r.rows[0];
          if (u) {
            token.sub = u.id;
            token.email = oauthEmail;
            (token as Record<string, unknown>).role = u.role;
            delete (token as Record<string, unknown>).name;
            delete (token as Record<string, unknown>).picture;
          }
        }
      }

      // Standard claim population on initial sign-in.
      if (user) {
        token.sub = (user as { id?: string }).id ?? token.sub;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
        if (user.image) token.picture = user.image;
        if ('role' in user && (user as { role?: UserRole }).role) {
          (token as Record<string, unknown>).role = (user as { role: UserRole }).role;
        }
      }

      // Defensive rehydration from DB on token rotation (every 24h) or
      // when role is missing on the cached token.
      const tokenRole = (token as Record<string, unknown>).role;
      const needsRehydrate =
        token.sub && (trigger === 'update' || !tokenRole);
      if (needsRehydrate) {
        try {
          const r = await query<{
            role: UserRole;
            deleted_at: Date | null;
          }>(`SELECT role, deleted_at FROM users WHERE id = $1 LIMIT 1`, [token.sub!]);
          const u = r.rows[0];
          if (u && !u.deleted_at) {
            (token as Record<string, unknown>).role = u.role;
          } else if (u?.deleted_at) {
            // Soft-deleted user — clear the session by stripping sub.
            delete token.sub;
            delete (token as Record<string, unknown>).role;
          }
        } catch {
          // DB blip — don't blow up the request, but don't lie about role.
        }
      }

      return token;
    },
  },
  events: {
    async signIn({ user }) {
      const id = (user as { id?: string }).id;
      if (!id) return;
      await query(
        `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
        [id],
      ).catch(() => {
        // last_login_at is observability — never block sign-in on it.
      });
    },
  },
});
