'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Loader2,
  Mail,
  Stethoscope,
  Landmark,
  Banknote,
  Scale,
  Layers,
  PlayCircle,
  KeyRound,
  Sparkles,
  ShieldCheck,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { BrandLockup } from '@/components/verify/Brand';
import {
  pickPackAction,
  inviteTeammateAction,
  completeOnboardingAction,
} from './actions';

interface PackSummary {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  compliance_framework: string | null;
  recognizer_count: number;
  red_flag_category_count: number;
}

const PACK_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  healthcare: Stethoscope,
  finance: Banknote,
  government: Landmark,
  legal: Scale,
};

interface SentInvite {
  email: string;
  role: string;
}

const STEPS = [
  { n: 1, label: 'Pick a pack' },
  { n: 2, label: 'Try a verification' },
  { n: 3, label: 'Invite teammates' },
  { n: 4, label: 'You’re live' },
] as const;

export function OnboardingWizard({
  tenantName,
  userName,
  userEmail,
  userRole,
  packs,
  initialPackSlug,
  canInviteAdmins,
  alreadyOnboarded,
  tenantContextOk,
}: {
  tenantName: string;
  userName: string;
  userEmail: string;
  userRole: string;
  packs: PackSummary[];
  initialPackSlug: string | null;
  canInviteAdmins: boolean;
  alreadyOnboarded: boolean;
  tenantContextOk: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [packSlug, setPackSlug] = useState<string | null>(initialPackSlug);
  const [savingPack, startSavingPack] = useTransition();
  const [packError, setPackError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'operator' | 'admin' | 'auditor' | 'customer'>(
    'operator',
  );
  const [sendingInvite, startSendingInvite] = useTransition();
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);

  const [finishing, startFinishing] = useTransition();
  const [finishError, setFinishError] = useState<string | null>(null);

  function goToStep(n: number) {
    setStep(n);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handlePickPack(slug: string) {
    setPackSlug(slug);
    setPackError(null);
    const fd = new FormData();
    fd.set('slug', slug);
    startSavingPack(async () => {
      const res = await pickPackAction(fd);
      if (!res.ok) {
        setPackError(res.error);
      }
    });
  }

  function handleAdvanceFromPack() {
    if (!packSlug) {
      setPackError('Pick a pack first.');
      return;
    }
    goToStep(2);
  }

  function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    const fd = new FormData();
    fd.set('email', inviteEmail.trim());
    fd.set('role', inviteRole);
    startSendingInvite(async () => {
      const res = await inviteTeammateAction(fd);
      if (!res.ok) {
        setInviteError(res.error);
        return;
      }
      setSentInvites((prev) => [...prev, { email: inviteEmail.trim(), role: inviteRole }]);
      setInviteEmail('');
    });
  }

  function handleFinish() {
    setFinishError(null);
    startFinishing(async () => {
      const res = await completeOnboardingAction();
      if (!res.ok) {
        setFinishError(res.error);
        return;
      }
      router.push('/chat');
      router.refresh();
    });
  }

  const operatorOrAdmin = userRole === 'operator' || userRole === 'admin';

  return (
    <div className="relative min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-5">
          <Link
            href="/"
            aria-label="AssuredAI home"
            className="rounded-md transition-opacity hover:opacity-80"
          >
            <BrandLockup />
          </Link>
          <div className="hidden items-center gap-3 text-[12.5px] text-muted-foreground sm:flex">
            <span>Signed in as <span className="font-medium text-foreground">{userEmail}</span></span>
            <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em]">
              {userRole}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[920px] px-5 pb-24 pt-10 sm:pt-14">
        {/* Eyebrow */}
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
            Welcome
          </span>
          <span className="h-px w-10 bg-foreground/25" />
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
            Set up {tenantName}
          </span>
        </div>

        <h1 className="text-balance text-[36px] sm:text-[44px] font-semibold leading-[1.05] tracking-[-0.025em]">
          Hi{userName ? `, ${userName.split(' ')[0]}` : ''}.{' '}
          <span className="font-serif italic font-normal text-primary">
            Four short steps
          </span>{' '}
          and you&rsquo;re running governed verifications.
        </h1>
        <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-foreground/75">
          Pick the vertical pack that matches what you publish, run a sample verification,
          invite the people on your editorial / compliance team, and we&rsquo;ll drop you
          into the live verifier.
        </p>

        {!tenantContextOk && (
          <div className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/[0.06] p-4 text-[13px] text-amber-900 dark:text-amber-100">
            We couldn&rsquo;t resolve your workspace. Refresh this page; if the warning
            persists, sign out and back in.
          </div>
        )}

        {alreadyOnboarded && (
          <div className="mt-6 rounded-md border border-emerald-500/40 bg-emerald-500/[0.06] p-4 text-[13px] text-emerald-900 dark:text-emerald-100">
            You&rsquo;ve already finished onboarding. You can re-run any step from here —
            nothing will be reset.
          </div>
        )}

        {/* Stepper */}
        <ol className="mt-10 flex flex-wrap gap-2">
          {STEPS.map((s) => {
            const isDone = step > s.n;
            const isCurrent = step === s.n;
            return (
              <li key={s.n}>
                <button
                  type="button"
                  onClick={() => goToStep(s.n)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    isCurrent
                      ? 'border-foreground bg-foreground text-background'
                      : isDone
                        ? 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-100'
                        : 'border-border bg-card text-foreground/65 hover:bg-accent'
                  }`}
                >
                  <span
                    className={`inline-flex size-5 items-center justify-center rounded-full text-[10.5px] font-bold ${
                      isCurrent
                        ? 'bg-background text-foreground'
                        : isDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-foreground/[0.06] text-foreground/65'
                    }`}
                  >
                    {isDone ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : s.n}
                  </span>
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>

        {/* Step content */}
        <div className="mt-10">
          {step === 1 && (
            <Section
              title="Pick the vertical pack you publish into."
              lede="Each pack is a complete recognizer set, disclaimer library, and escalation ruleset. You can switch later — this just sets your default."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {packs.map((p) => {
                  const Icon = PACK_ICON[p.slug] ?? Layers;
                  const selected = packSlug === p.slug;
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => handlePickPack(p.slug)}
                      className={`group relative flex flex-col rounded-2xl border p-5 text-left transition-all ${
                        selected
                          ? 'border-primary bg-primary/[0.05] ring-1 ring-primary/30'
                          : 'border-border bg-card hover:bg-accent/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
                          <Icon className="h-4 w-4" />
                          {p.slug}
                        </div>
                        {selected && (
                          <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-[18px] font-semibold tracking-tight">
                        {p.name}
                      </div>
                      {p.description && (
                        <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/75">
                          {p.description}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-1.5 text-[10.5px] font-medium text-muted-foreground">
                        {p.compliance_framework && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            {p.compliance_framework}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5">
                          {p.recognizer_count} recognizers
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5">
                          {p.red_flag_category_count} red-flag categories
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {packError && (
                <p className="mt-3 text-[12.5px] text-red-700 dark:text-red-300">{packError}</p>
              )}

              <NavRow>
                <span className="text-[12px] text-muted-foreground">
                  {savingPack ? 'Saving…' : packSlug ? `Selected: ${packSlug}` : 'No pack selected'}
                </span>
                <button
                  type="button"
                  onClick={handleAdvanceFromPack}
                  disabled={!packSlug || savingPack}
                  className="inline-flex h-11 items-center gap-1.5 rounded-md bg-foreground px-5 text-[13.5px] font-semibold text-background disabled:opacity-50 hover:opacity-90"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              </NavRow>
            </Section>
          )}

          {step === 2 && (
            <Section
              title="Run a verification, end-to-end."
              lede="The verifier is a real pipeline run against your selected pack. Paste content, watch it route through PHI/PII redaction, source retrieval, draft, red-flag review, and disclaimer. Every run produces a public proof URL."
            >
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/70 ring-1 ring-foreground/10">
                    <PlayCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[18px] font-semibold tracking-tight">
                      Open the verifier with your pack pre-loaded
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/75">
                      We&rsquo;ll route you to <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[12px]">/chat?scenario={packSlug ?? 'healthcare'}</code> —
                      pick a sample chip or paste your own content. The verifier writes a
                      hash-chained row into your audit log on every run. Come back here when
                      you&rsquo;re done.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/chat?scenario=${packSlug ?? 'healthcare'}`}
                        target="_blank"
                        className="inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-5 text-[13.5px] font-semibold text-background hover:opacity-90"
                      >
                        <PlayCircle className="h-4 w-4" />
                        Open verifier
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href="/demo"
                        target="_blank"
                        className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-[13px] font-medium text-foreground hover:bg-accent"
                      >
                        <Layers className="h-4 w-4" />
                        Browse curated showcase
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <NavRow>
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-[13px] font-medium text-foreground hover:bg-accent"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-md bg-foreground px-5 text-[13.5px] font-semibold text-background hover:opacity-90"
                >
                  I&rsquo;ll come back to it
                  <ChevronRight className="h-4 w-4" />
                </button>
              </NavRow>
            </Section>
          )}

          {step === 3 && (
            <Section
              title="Invite the people who&rsquo;ll review with you."
              lede="Editors, legal reviewers, compliance officers, auditors. They receive an email link to set their password and join this workspace. Skippable if you&rsquo;re flying solo for now."
            >
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                <form onSubmit={handleSendInvite} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
                      Email
                    </span>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="reviewer@yourcompany.com"
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-[13.5px] focus:border-foreground focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
                      Role
                    </span>
                    <select
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(
                          e.target.value as 'operator' | 'admin' | 'auditor' | 'customer',
                        )
                      }
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-[13.5px] focus:border-foreground focus:outline-none"
                    >
                      <option value="operator">Operator (editor)</option>
                      <option value="auditor">Auditor (read-only)</option>
                      <option value="customer">Customer (chat-only)</option>
                      {canInviteAdmins && <option value="admin">Admin</option>}
                    </select>
                  </label>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={sendingInvite || !inviteEmail}
                      className="inline-flex h-10 items-center gap-1.5 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background disabled:opacity-50 hover:opacity-90"
                    >
                      {sendingInvite ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      Send invite
                    </button>
                  </div>
                </form>

                {inviteError && (
                  <p className="mt-3 text-[12.5px] text-red-700 dark:text-red-300">
                    {inviteError}
                  </p>
                )}

                {sentInvites.length > 0 && (
                  <div className="mt-6 rounded-md border border-emerald-500/30 bg-emerald-500/[0.05] p-4">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-200">
                      Invites sent ({sentInvites.length})
                    </div>
                    <ul className="space-y-1.5 text-[13px]">
                      {sentInvites.map((inv, i) => (
                        <li key={i} className="flex items-center gap-2 text-foreground/85">
                          <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} />
                          <span className="font-mono text-[12px]">{inv.email}</span>
                          <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em]">
                            {inv.role}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <NavRow>
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-[13px] font-medium text-foreground hover:bg-accent"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-md bg-foreground px-5 text-[13.5px] font-semibold text-background hover:opacity-90"
                >
                  {sentInvites.length > 0 ? 'Continue' : 'Skip for now'}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </NavRow>
            </Section>
          )}

          {step === 4 && (
            <Section
              title="You&rsquo;re set."
              lede="Below are the doors into the platform. Start with the verifier; circle back to admin when you&rsquo;re ready to hand out API keys or wire up Slack."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <DoorCard
                  icon={PlayCircle}
                  title="Open the verifier"
                  body="Paste content, watch the pipeline run, get a hash-chained proof URL."
                  href={`/chat?scenario=${packSlug ?? 'healthcare'}`}
                />
                <DoorCard
                  icon={Layers}
                  title="Browse curated showcase"
                  body="Real audit URLs we&rsquo;re proud of: PHI blocked, fraud caught, clean publish-ready."
                  href="/demo"
                />
                {operatorOrAdmin && (
                  <DoorCard
                    icon={KeyRound}
                    title="Issue an API key"
                    body="Mint a programmatic key (ak_*) for your CMS or WordPress integration."
                    href="/admin/api-keys"
                    disabled={!operatorOrAdmin}
                  />
                )}
                {operatorOrAdmin && (
                  <DoorCard
                    icon={Sparkles}
                    title="Wire up notifications"
                    body="Slack, email, or webhook. Routes red-flag blocks + escalations to where your team lives."
                    href="/admin/notifications"
                    disabled={!operatorOrAdmin}
                  />
                )}
              </div>

              {finishError && (
                <p className="mt-4 text-[12.5px] text-red-700 dark:text-red-300">
                  {finishError}
                </p>
              )}

              <NavRow>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-[13px] font-medium text-foreground hover:bg-accent"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={finishing}
                  className="group inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground shadow-sm disabled:opacity-50 hover:opacity-90"
                >
                  {finishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Finish onboarding & open verifier
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </NavRow>
            </Section>
          )}
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-tight leading-snug">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-foreground/75">{lede}</p>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function NavRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
      {children}
    </div>
  );
}

function DoorCard({
  icon: Icon,
  title,
  body,
  href,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="relative flex flex-col rounded-2xl border border-border bg-muted/20 p-5 opacity-60">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
          <Icon className="h-4 w-4" />
          {title}
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-0.5 text-[9.5px] normal-case tracking-normal text-muted-foreground">
            <X className="h-2.5 w-2.5" />
            requires operator
          </span>
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/65">{body}</p>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
          <Icon className="h-4 w-4" />
          {title}
        </div>
        <ArrowUpRight className="h-4 w-4 text-foreground/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/75">{body}</p>
    </Link>
  );
}
