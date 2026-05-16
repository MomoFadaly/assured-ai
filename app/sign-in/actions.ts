/**
 * Server actions for the unified /sign-in surface.
 *
 *   signInWithPasswordAction   — verifies email + password, opens session.
 *   signUpAction               — creates a pending user + sends verify email.
 *   requestPasswordResetAction — issues a reset token, sends email.
 *   resetPasswordAction        — consumes reset token, sets new password.
 *
 * Every action returns a structured `FormState` so the client form can
 * render specific field errors via React's `useActionState`.
 *
 * Rate-limit policy:
 *   - Sign-in: per-account throttle (5/15min) lives in lib/auth/rate-limit.ts.
 *   - Sign-up + reset-request: we deliberately respond identically whether
 *     the email is in use or not, so attackers can't enumerate accounts.
 */

'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password-server';
import { evaluatePassword } from '@/lib/auth/password';
import {
  issueToken,
  consumeToken,
  gcExpiredTokens,
} from '@/lib/auth/tokens';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '@/lib/email/auth-emails';
import { signIn } from '@/lib/auth/auth';
import { checkLock, clearFailedAttempts } from '@/lib/auth/rate-limit';
import { AuthError } from 'next-auth';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { getDefaultTenant } from '@/lib/tenants';
import { needsOnboarding } from '@/lib/onboarding';

export type FormState = {
  ok?: boolean;
  values?: {
    email?: string;
    name?: string;
  };
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    name?: string;
  };
  redirectTo?: string;
};

const SignInSchema = z.object({
  email: z.string().email('Enter a valid email address.').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required.'),
  callbackUrl: z.string().optional(),
});

const SignUpSchema = z.object({
  email: z.string().email('Enter a valid email address.').trim().toLowerCase(),
  password: z.string().min(10, 'Password must be at least 10 characters.'),
  name: z.string().trim().optional(),
});

const RequestResetSchema = z.object({
  email: z.string().email('Enter a valid email address.').trim().toLowerCase(),
});

const ResetSchema = z.object({
  token: z.string().min(20, 'Missing or invalid reset link.'),
  password: z.string().min(10, 'Password must be at least 10 characters.'),
});

// ----------------------------------------------------------------------
// Sign-in (existing account)
// ----------------------------------------------------------------------

export async function signInWithPasswordAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    callbackUrl: formData.get('callbackUrl') ?? undefined,
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      values: { email: String(formData.get('email') ?? '') },
      fieldErrors: { email: f.email?.[0], password: f.password?.[0] },
    };
  }
  const { email, password, callbackUrl } = parsed.data;

  const lock = await checkLock(email);
  if (lock.locked) {
    const mins = Math.ceil(lock.retryAfterSeconds / 60);
    return {
      ok: false,
      values: { email },
      error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}, or reset your password.`,
    };
  }

  // Pre-flight: surface useful errors BEFORE handing off to Auth.js
  // (which only returns a generic error). Never reveal "wrong password"
  // vs "no account" — only handle the non-security-sensitive cases.
  const r = await query<{
    id: string;
    password_hash: string | null;
    email_verified: Date | null;
    deleted_at: Date | null;
  }>(
    `SELECT id, password_hash, email_verified, deleted_at
       FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  );
  const u = r.rows[0];
  if (u && !u.deleted_at) {
    if (!u.password_hash) {
      return {
        ok: false,
        values: { email },
        error:
          'This account was created with Google. Use the Google button to sign in, or reset the password to set one.',
      };
    }
    if (!u.email_verified) {
      return {
        ok: false,
        values: { email },
        error:
          'Confirm your email first — check your inbox for the verification link, or sign up again to get a new one.',
      };
    }
  }

  try {
    await signIn('credentials', { email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      return {
        ok: false,
        values: { email },
        error: 'Email or password is incorrect.',
      };
    }
    throw e;
  }

  await clearFailedAttempts(email).catch(() => {});

  // Default destination: the verifier. If the user has an explicit
  // callbackUrl, honour it (it's been safety-defanged). Otherwise, send
  // brand-new accounts through /welcome and returning users to /chat.
  const safe = safeRedirectPath(callbackUrl, '');
  if (safe && safe !== '/chat') {
    redirect(safe);
  }
  if (u && (await needsOnboarding(u.id))) {
    redirect('/welcome');
  }
  redirect('/chat');
}

// ----------------------------------------------------------------------
// Sign-up (new account)
// ----------------------------------------------------------------------

export async function signUpAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = SignUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name') ?? undefined,
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      values: {
        email: String(formData.get('email') ?? ''),
        name: String(formData.get('name') ?? ''),
      },
      fieldErrors: {
        email: f.email?.[0],
        password: f.password?.[0],
        name: f.name?.[0],
      },
    };
  }
  const { email, password, name } = parsed.data;

  const strength = evaluatePassword(password, email);
  if (!strength.ok) {
    return {
      ok: false,
      values: { email, name },
      fieldErrors: { password: strength.reasons[0] ?? 'Pick a stronger password.' },
    };
  }

  // Find-or-create. We DO NOT disclose existence — every code path below
  // returns the same "check your inbox" UX so an attacker can't enumerate.
  const r = await query<{
    id: string;
    email_verified: Date | null;
    password_hash: string | null;
    deleted_at: Date | null;
  }>(
    `SELECT id, email_verified, password_hash, deleted_at
       FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  );
  const existing = r.rows[0];

  if (existing && !existing.deleted_at) {
    if (existing.email_verified && existing.password_hash) {
      // Real existing account. Don't tell the attacker.
      return {
        ok: true,
        values: { email, name },
        redirectTo: '/sign-in/check-email?email=' + encodeURIComponent(email),
      };
    }
    // Account exists but is unverified, or was Google-only. (Re-)issue a
    // verification token and let them complete signup. Google-only case
    // also sets a password hash for the first time.
    const passwordHash = await hashPassword(password);
    await query(
      `UPDATE users SET name = COALESCE($1, name), password_hash = $2, updated_at = NOW() WHERE id = $3`,
      [name ?? null, passwordHash, existing.id],
    );

    const { token } = await issueToken(email, 'verify');
    await sendVerificationEmail({ to: email, token, name });
    return {
      ok: true,
      values: { email, name },
      redirectTo: '/sign-in/check-email?email=' + encodeURIComponent(email),
    };
  }

  // Fresh account.
  try {
    const passwordHash = await hashPassword(password);
    const defaultTenant = await getDefaultTenant();
    await query(
      `INSERT INTO users (email, name, role, password_hash, tenant_id, created_at, updated_at)
       VALUES (LOWER($1), $2, 'customer', $3, $4, NOW(), NOW())
       ON CONFLICT (email) DO NOTHING`,
      [email, name ?? null, passwordHash, defaultTenant.id],
    );

    const { token } = await issueToken(email, 'verify');
    await sendVerificationEmail({ to: email, token, name });
    await gcExpiredTokens().catch(() => {});

    return {
      ok: true,
      values: { email, name },
      redirectTo: '/sign-in/check-email?email=' + encodeURIComponent(email),
    };
  } catch {
    return {
      ok: false,
      values: { email, name },
      error: "Couldn't create the account just now — try again in a moment.",
    };
  }
}

// ----------------------------------------------------------------------
// Forgot-password (request reset link)
// ----------------------------------------------------------------------

export async function requestPasswordResetAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = RequestResetSchema.safeParse({
    email: formData.get('email'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      values: { email: String(formData.get('email') ?? '') },
      fieldErrors: { email: 'Enter a valid email.' },
    };
  }
  const { email } = parsed.data;

  const r = await query<{ id: string; name: string | null; deleted_at: Date | null }>(
    `SELECT id, name, deleted_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  );
  const u = r.rows[0];

  // Generic success regardless of existence — don't enumerate.
  if (u && !u.deleted_at) {
    const { token } = await issueToken(email, 'reset');
    await sendPasswordResetEmail({ to: email, token, name: u.name });
  }

  return {
    ok: true,
    values: { email },
    redirectTo: '/forgot-password/sent?email=' + encodeURIComponent(email),
  };
}

// ----------------------------------------------------------------------
// Reset-password (consume token + set new hash)
// ----------------------------------------------------------------------

export async function resetPasswordAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const parsed = ResetSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      fieldErrors: { password: f.password?.[0] },
      error: f.token?.[0],
    };
  }
  const { token, password } = parsed.data;

  const email = await consumeToken(token, 'reset');
  if (!email) {
    return {
      ok: false,
      error: 'This reset link is invalid or expired. Request a new one.',
      redirectTo: '/forgot-password',
    };
  }

  const strength = evaluatePassword(password, email);
  if (!strength.ok) {
    return {
      ok: false,
      fieldErrors: { password: strength.reasons[0] ?? 'Pick a stronger password.' },
      error:
        "That password didn't meet the rules. Request a fresh reset link and try again.",
      redirectTo: '/forgot-password',
    };
  }

  const passwordHash = await hashPassword(password);
  await query(
    `UPDATE users
        SET password_hash = $1,
            email_verified = COALESCE(email_verified, NOW()),
            failed_login_count = 0,
            locked_until = NULL,
            updated_at = NOW()
      WHERE LOWER(email) = LOWER($2)`,
    [passwordHash, email],
  );

  return { ok: true, redirectTo: '/sign-in?reset=1' };
}

// ----------------------------------------------------------------------
// Sign-out
// ----------------------------------------------------------------------

export async function signOutAction(): Promise<void> {
  const { signOut } = await import('@/lib/auth/auth');
  await signOut({ redirectTo: '/' });
}
