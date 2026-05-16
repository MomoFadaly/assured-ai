/**
 * /accept-invite/[token] — entry point for teammate invitees.
 *
 * Renders a single signup-style form with the invitee's email pre-filled
 * (and locked — the invite is bound to that address). On submit, the
 * server action creates or updates the user, attaches them to the
 * invite's tenant + role, marks email_verified (the email link proves
 * inbox ownership), and bounces them to /sign-in.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
import { BrandLockup } from '@/components/verify/Brand';
import { findInviteByToken } from '@/lib/onboarding';
import { query } from '@/lib/db/client';
import { AcceptInviteForm } from './AcceptInviteForm';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Accept invite · AssuredAI',
  robots: { index: false, follow: false },
};

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 8) notFound();

  const invite = await findInviteByToken(token);
  if (!invite) {
    return (
      <Shell>
        <h1 className="mt-4 text-[28px] sm:text-[32px] font-semibold leading-tight tracking-tight">
          This invite link is no longer valid.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-foreground/75">
          Invites expire after 14 days, are single-use, and can be revoked. Ask the person who
          invited you to send a fresh one.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-[13.5px] font-medium text-foreground hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </Shell>
    );
  }

  const meta = await query<{ tenant_name: string; inviter_email: string | null; inviter_name: string | null }>(
    `SELECT t.name AS tenant_name, u.email AS inviter_email, u.name AS inviter_name
       FROM teammate_invites ti
       JOIN tenants t ON t.id = ti.tenant_id
       LEFT JOIN users u ON u.id = ti.invited_by
      WHERE ti.id = $1`,
    [invite.id],
  );
  const m = meta.rows[0];
  const tenantName = m?.tenant_name ?? 'an AssuredAI workspace';
  const inviterLabel = m?.inviter_name?.trim()
    ? `${m.inviter_name} (${m.inviter_email})`
    : m?.inviter_email ?? 'A teammate';

  return (
    <Shell>
      <div className="mb-3 flex items-center gap-3">
        <span className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
          Accept invite
        </span>
        <span className="h-px w-10 bg-foreground/25" />
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
          Join {tenantName}
        </span>
      </div>
      <h1 className="text-balance text-[32px] sm:text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">
        You&rsquo;ve been invited to{' '}
        <span className="font-serif italic font-normal text-primary">{tenantName}</span>.
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-foreground/75">
        {inviterLabel} added you as a{' '}
        <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.06em]">
          {invite.role}
        </span>
        . Set your name and password to finish creating your account.
      </p>

      <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2 text-[12.5px] text-emerald-800 dark:text-emerald-200">
        <ShieldCheck className="h-3.5 w-3.5" />
        Hash-chained audit log · PHI/PII redaction · public proof URLs
      </div>

      <div className="mt-8">
        <AcceptInviteForm token={token} email={invite.email} />
      </div>

      <p className="mt-10 border-t border-border pt-6 text-[12px] text-muted-foreground">
        Not the right person? Forward this email to the teammate who should join, or ask{' '}
        {m?.inviter_email ? (
          <a
            href={`mailto:${m.inviter_email}`}
            className="text-foreground underline underline-offset-2"
          >
            {m.inviter_email}
          </a>
        ) : (
          'the inviter'
        )}{' '}
        to send a fresh invite.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-5">
          <Link href="/" className="rounded-md transition-opacity hover:opacity-80">
            <BrandLockup />
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            <Mail className="h-3.5 w-3.5" />
            Already have an account? Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[640px] px-5 pb-24 pt-14 sm:pt-20">{children}</main>
    </div>
  );
}
