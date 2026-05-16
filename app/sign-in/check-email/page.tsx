/**
 * /sign-in/check-email — landing after a successful signup submission.
 *
 * Generic message regardless of whether the email is real and a token
 * was actually sent — that's the no-enumeration guarantee.
 */

import Link from 'next/link';
import { Mail, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Check your inbox · AssuredAI',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ email?: string }>;

export default async function CheckEmail({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { email } = await searchParams;
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
          <div className="mx-auto mb-5 inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/40">
            <Mail className="w-6 h-6 text-foreground" />
          </div>
          <h1 className="font-semibold text-2xl md:text-3xl leading-tight tracking-tight text-foreground mb-2">
            Confirm your email.
          </h1>
          <p className="text-foreground/70 text-sm leading-relaxed">
            We just sent a verification link to{' '}
            <span className="font-semibold">{email ?? 'your inbox'}</span>. Tap it to finish
            setting up your account — the link is good for 24 hours.
          </p>
          <p className="text-xs text-muted-foreground mt-6">
            Didn&rsquo;t see it? Check spam, or{' '}
            <Link
              href="/sign-in?signup=1"
              className="text-foreground hover:underline font-semibold"
            >
              try again
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
