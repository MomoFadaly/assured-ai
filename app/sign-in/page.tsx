/**
 * Unified sign-in / sign-up page for AssuredAI.
 *
 * One URL handles both flows:
 *   /sign-in           → "Welcome back" with email + password
 *   /sign-in?signup=1  → "Create your account" with name + email + password
 *
 * Both modes show the same Google one-click button at the top. Auth.js
 * handles the rest:
 *   - Credentials authorize() verifies the bcrypt hash
 *   - Google OAuth uses `allowDangerousEmailAccountLinking` so signing
 *     into an existing email/password account with Google (same email)
 *     just merges the two — no duplicate user, no "this email is taken".
 *
 * After auth, /chat (or callbackUrl) takes over. The verifier UI shows
 * a Sign-out chip when an authenticated session is present.
 */

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { SignInForm, SignUpForm } from './forms';
import { GoogleButton } from './google-button';
import { googleEnabled } from '@/lib/auth/auth';

export const metadata = {
  title: 'Sign in · AssuredAI',
  description:
    'Sign in or create your AssuredAI account. Email + password, or one click with Google.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  callbackUrl?: string;
  error?: string;
  signup?: string;
  reset?: string;
}>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { callbackUrl, error, signup, reset } = await searchParams;
  const isSignup = signup === '1';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-6 w-6" />
            <span className="font-semibold tracking-tight text-lg">AssuredAI</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/60 mb-3">
            {isSignup ? 'Create account' : 'Sign in'}
          </div>
          <h1 className="font-semibold text-2xl md:text-3xl leading-tight tracking-tight text-foreground mb-2">
            {isSignup ? 'Make an AssuredAI account.' : 'Welcome back.'}
          </h1>
          <p className="text-foreground/70 text-sm mb-6 leading-relaxed">
            {isSignup
              ? 'Two ways in, one account. Use email + password or your Google sign-in — pick now or add the second one later.'
              : 'Sign in with email + password, or one click with Google. Either gets you to the same place.'}
          </p>

          {reset === '1' && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
              Password updated. Sign in with your new one.
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error === 'OAuthAccountNotLinked'
                ? 'That email is already used with email + password. Sign in that way first, then connect Google from your account.'
                : 'Something went sideways with sign-in. Try again, or use the other method.'}
            </div>
          )}

          {googleEnabled && (
            <>
              <GoogleButton
                callbackUrl={callbackUrl ?? '/chat'}
                label={isSignup ? 'Continue with Google' : 'Sign in with Google'}
              />
              <div
                className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground"
                aria-hidden="true"
              >
                <span className="flex-1 h-px bg-border" />
                or
                <span className="flex-1 h-px bg-border" />
              </div>
            </>
          )}

          {isSignup ? <SignUpForm /> : <SignInForm callbackUrl={callbackUrl} />}

          <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            {isSignup ? (
              <>
                Already have an account?{' '}
                <Link
                  href={
                    callbackUrl
                      ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`
                      : '/sign-in'
                  }
                  className="text-foreground hover:underline font-semibold"
                >
                  Sign in instead
                </Link>
              </>
            ) : (
              <>
                New to AssuredAI?{' '}
                <Link
                  href={
                    callbackUrl
                      ? `/sign-in?signup=1&callbackUrl=${encodeURIComponent(callbackUrl)}`
                      : '/sign-in?signup=1'
                  }
                  className="text-foreground hover:underline font-semibold"
                >
                  Create an account
                </Link>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          One sign-in works for writers, operators, and admins. The right surface finds you.
        </p>
      </div>
    </div>
  );
}
