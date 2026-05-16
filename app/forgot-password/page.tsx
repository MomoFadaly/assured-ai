/**
 * /forgot-password — request a password-reset link.
 *
 * We always render the same "we sent a link if the account exists" page
 * regardless of whether the email is in the DB. That prevents account
 * enumeration.
 */

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { ForgotPasswordForm } from './form';

export const metadata = {
  title: 'Forgot password · AssuredAI',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
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
            Reset password
          </div>
          <h1 className="font-semibold text-2xl md:text-3xl leading-tight tracking-tight text-foreground mb-2">
            Forgot the password?
          </h1>
          <p className="text-foreground/70 text-sm mb-6 leading-relaxed">
            Drop your email and we&rsquo;ll send a one-time link to set a new one. The link works
            once and expires in an hour.
          </p>
          <ForgotPasswordForm />
          <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            Remembered it?{' '}
            <Link href="/sign-in" className="text-foreground hover:underline font-semibold">
              Back to sign-in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
