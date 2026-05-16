'use server';

/**
 * /get-started server actions.
 *
 * After Step 6 provisions a sandbox tenant, the visitor needs to land
 * inside their workspace already authenticated — making them re-type
 * their just-set password would be the dumbest friction at the highest-
 * intent moment of the funnel.
 *
 * `signInAfterProvisionAction` runs server-side, calls NextAuth's
 * `signIn('credentials')` with the credentials the visitor just used to
 * provision, and returns the redirect path. The Step 6 reveal client
 * navigates there once it confirms the session cookie landed.
 */

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth/auth';
import { AuthError } from 'next-auth';
import { logger } from '@/lib/logger';

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type AutoSignInResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function signInAfterProvisionAction(input: {
  email: string;
  password: string;
}): Promise<AutoSignInResult> {
  const parsed = SignInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Missing email or password.' };
  }
  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      logger.warn(
        { email: parsed.data.email, code: err.type },
        'auto-signin after provision failed',
      );
      return {
        ok: false,
        error:
          'Auto sign-in failed. Use the credentials you just set on the sign-in page.',
      };
    }
    throw err;
  }
  // Sandboxes are provisioned with role='admin' (of their own tenant) so /chat
  // is the right landing — that's where the verifier lives. /admin works too
  // but is mostly empty for a fresh tenant.
  return { ok: true, redirectTo: '/chat' };
}

/**
 * Thin server-side redirect helper for the "Take me to my sandbox"
 * button on the reveal screen. We can't use a plain client redirect
 * because the cookie set by signIn needs the server to flush before
 * Next.js routing picks up the new session.
 */
export async function redirectToSandbox(redirectTo: string): Promise<never> {
  redirect(redirectTo);
}
