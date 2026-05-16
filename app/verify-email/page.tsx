/**
 * /verify-email?token=… — landing for the magic link in the
 * confirm-email message. Consumes the token, stamps `email_verified`
 * on the user, then sends them to sign-in with a "✓ verified" banner.
 *
 * Pure server component — no client JS. Token is consumed exactly once.
 */

import Link from 'next/link';
import { CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { consumeToken } from '@/lib/auth/tokens';
import { query } from '@/lib/db/client';

export const metadata = {
  title: 'Confirm your email · AssuredAI',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ token?: string }>;

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token } = await searchParams;
  let state: 'ok' | 'expired' | 'missing' = 'missing';

  if (token) {
    const email = await consumeToken(token, 'verify');
    if (email) {
      await query(
        `UPDATE users SET email_verified = NOW(), updated_at = NOW() WHERE LOWER(email) = LOWER($1)`,
        [email],
      );
      state = 'ok';
    } else {
      state = 'expired';
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-6 w-6" />
            <span className="font-semibold tracking-tight text-lg">AssuredAI</span>
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-sm">
          {state === 'ok' ? (
            <>
              <div className="mx-auto mb-5 inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100">
                <CheckCircle2 className="w-7 h-7 text-emerald-700" />
              </div>
              <h1 className="font-semibold text-2xl md:text-3xl leading-tight tracking-tight text-foreground mb-2">
                Email confirmed.
              </h1>
              <p className="text-foreground/70 text-sm leading-relaxed mb-6">
                Your account is ready. Sign in with your email and password — or with Google if
                you connect it later.
              </p>
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-foreground hover:opacity-90 text-background font-medium text-base transition-all active:scale-[0.98]"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto mb-5 inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100">
                <AlertCircle className="w-7 h-7 text-amber-700" />
              </div>
              <h1 className="font-semibold text-2xl md:text-3xl leading-tight tracking-tight text-foreground mb-2">
                Link not valid.
              </h1>
              <p className="text-foreground/70 text-sm leading-relaxed mb-6">
                {state === 'expired'
                  ? 'This link expired or was already used. Sign up again to get a new one.'
                  : "We couldn't find a confirmation link in this URL. If you came here by mistake, head to sign-in below."}
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/sign-in?signup=1"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-foreground hover:opacity-90 text-background font-medium text-base transition-all active:scale-[0.98]"
                >
                  Get a new link
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center text-sm text-muted-foreground hover:text-foreground py-2"
                >
                  I already confirmed — take me to sign-in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
