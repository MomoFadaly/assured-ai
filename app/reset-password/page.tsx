/**
 * /reset-password?token=… — set a new password using a reset token.
 *
 * The token is validated lazily by the server action; the page itself
 * just renders the form. We don't pre-validate on GET because any
 * "invalid token" UX would disclose token reality.
 */

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { ResetPasswordForm } from './form';

export const metadata = {
  title: 'Set a new password · AssuredAI',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ token?: string }>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token } = await searchParams;
  if (!token) {
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
            <h1 className="font-semibold text-2xl md:text-3xl leading-tight tracking-tight text-foreground mb-2">
              No reset token.
            </h1>
            <p className="text-foreground/70 text-sm mb-6 leading-relaxed">
              This page only works from the link in your reset email. Request a new one if the
              link expired.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-foreground hover:opacity-90 text-background font-medium text-base transition-all active:scale-[0.98]"
            >
              Request a reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            New password
          </div>
          <h1 className="font-semibold text-2xl md:text-3xl leading-tight tracking-tight text-foreground mb-2">
            Set your new password.
          </h1>
          <p className="text-foreground/70 text-sm mb-6 leading-relaxed">
            Pick something at least 10 characters. A passphrase (4+ random words) is easier to
            remember than a complex one.
          </p>
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </div>
  );
}
