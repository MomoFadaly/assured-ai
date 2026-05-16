'use client';

/**
 * Step 6 — Provision sandbox tenant.
 *
 * Three states:
 *   1. FORM     — name / email / password, plus a "this is what will
 *                 be created" summary card from the wizard state
 *   2. RUNNING  — provisioning animation: 7 checklist items light up
 *                 in sequence as the server creates them (tenant,
 *                 user, sources, API key, channel, audit retag,
 *                 welcome). The fetch fires once; the choreography
 *                 mirrors the real backend phases.
 *   3. REVEAL   — API key shown ONCE with copy button, sign-in CTA,
 *                 production-path follow-up
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Sparkles,
  KeyRound,
  Copy,
  ExternalLink,
  ShieldCheck,
  Database,
  Bell,
  LogIn,
  Building2,
  Globe2,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { signInAfterProvisionAction, redirectToSandbox } from './actions';
import {
  INDUSTRY_META,
  ROLES_BY_INDUSTRY,
  type WizardAction,
  type WizardState,
} from '@/lib/wizard/types';

type WizardDispatch = React.Dispatch<WizardAction>;

interface ProvisionResult {
  tenant: { id: string; slug: string };
  api_key: { prefix: string; plaintext: string };
  seed_source_count: number;
  first_audit_log_id: number | null;
  channel_draft_id: string | null;
  sign_in_url: string;
}

const PROVISION_PHASES = [
  { id: 'tenant', label: 'Tenant created', icon: Building2 },
  { id: 'pack', label: 'Pack installed', icon: ShieldCheck },
  { id: 'sources', label: 'Seed sources loaded', icon: Database },
  { id: 'user', label: 'Owner account created', icon: KeyRound },
  { id: 'key', label: 'API key minted', icon: KeyRound },
  { id: 'channel', label: 'Notification channel draft', icon: Bell },
  { id: 'welcome', label: 'Welcoming you', icon: Sparkles },
] as const;

export function Step6Provision({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: WizardDispatch;
}) {
  const [phase, setPhase] = useState<'form' | 'running' | 'reveal' | 'error'>('form');
  const [activePhase, setActivePhase] = useState(-1);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailInUse, setEmailInUse] = useState(false);

  if (!state.industry) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-[13.5px] text-foreground/80">
        Pick an industry first &mdash; that drives every default downstream.
      </div>
    );
  }

  const meta = INDUSTRY_META[state.industry];

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {phase === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProvisionForm
              state={state}
              dispatch={dispatch}
              meta={meta}
              emailInUse={emailInUse}
              onSubmit={async (account) => {
                setEmailInUse(false);
                setError(null);
                setPhase('running');
                setActivePhase(-1);
                await provisionSandbox({
                  state,
                  account,
                  onPhase: (i) => setActivePhase(i),
                  onResult: (r) => {
                    setResult(r);
                    setPhase('reveal');
                  },
                  onError: (msg, isEmailInUse) => {
                    setError(msg);
                    setEmailInUse(isEmailInUse);
                    setPhase(isEmailInUse ? 'form' : 'error');
                  },
                });
              }}
            />
          </motion.div>
        )}

        {phase === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProvisionRunning accent={meta.accent} activePhase={activePhase} />
          </motion.div>
        )}

        {phase === 'reveal' && result && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProvisionReveal state={state} result={result} meta={meta} />
          </motion.div>
        )}

        {phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32 }}
            className="rounded-md border border-red-500/40 bg-red-500/[0.06] p-5 text-[13px] text-red-700 dark:text-red-300"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">Provisioning failed</div>
                <p className="mt-1 text-[12.5px]">{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setPhase('form');
                    setError(null);
                  }}
                  className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-red-500/40 bg-card px-3 text-[12.5px] font-medium text-red-700 hover:bg-red-500/10"
                >
                  Try again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================
// Runner
// =============================================================

async function provisionSandbox({
  state,
  account,
  onPhase,
  onResult,
  onError,
}: {
  state: WizardState;
  account: { name: string; email: string; password: string };
  onPhase: (i: number) => void;
  onResult: (r: ProvisionResult) => void;
  onError: (msg: string, emailInUse: boolean) => void;
}) {
  // Choreograph phase ticker — fires on a 600ms cadence while the
  // server runs the real provision call (typically 1.5-3s).
  let i = -1;
  const handle = setInterval(() => {
    i = Math.min(i + 1, PROVISION_PHASES.length - 2);
    onPhase(i);
  }, 480);

  try {
    const r = await fetch('/api/wizard/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        industry: state.industry,
        role: state.role,
        contentSources: state.contentSources,
        cmsPlatform: state.cmsPlatform,
        monthlyVolume: state.monthlyVolume,
        compliance: state.compliance,
        account,
        sampleAuditLogId: state.verification.auditLogId,
      }),
    });
    clearInterval(handle);
    onPhase(PROVISION_PHASES.length - 1);

    if (!r.ok) {
      const body = (await r.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      const isEmailInUse = body.error === 'email_in_use';
      onError(body.message ?? body.error ?? `HTTP ${r.status}`, isEmailInUse);
      return;
    }
    const data = (await r.json()) as ProvisionResult;
    await new Promise((res) => setTimeout(res, 400)); // let final check-mark settle
    onResult(data);
  } catch (err) {
    clearInterval(handle);
    onError(err instanceof Error ? err.message : 'Network error', false);
  }
}

// =============================================================
// Form
// =============================================================

function ProvisionForm({
  state,
  dispatch,
  meta,
  emailInUse,
  onSubmit,
}: {
  state: WizardState;
  dispatch: WizardDispatch;
  meta: typeof INDUSTRY_META[keyof typeof INDUSTRY_META];
  emailInUse: boolean;
  onSubmit: (account: { name: string; email: string; password: string }) => void;
}) {
  const [name, setName] = useState(state.account.name);
  const [email, setEmail] = useState(state.account.email);
  const [password, setPassword] = useState(state.account.password);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = name.trim().length > 0 && /.+@.+\..+/.test(email) && password.length >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    dispatch({ type: 'set_account', account: { name, email, password } });
    onSubmit({ name, email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Avery Patel"
            className="h-11 w-full rounded-md border border-border bg-card px-3 text-[14px] focus:outline-none"
            style={{ borderColor: name.trim() ? meta.accent : undefined }}
          />
        </Field>
        <Field label="Work email" required hint={emailInUse ? 'Email already in use' : undefined} hintTone={emailInUse ? 'error' : undefined}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="avery@acmehealth.org"
            className="h-11 w-full rounded-md border bg-card px-3 text-[14px] focus:outline-none"
            style={{ borderColor: emailInUse ? '#dc2626' : email ? meta.accent : 'hsl(var(--border))' }}
          />
        </Field>
        <Field label="Password" required hint="At least 10 characters · bcrypt-hashed" className="sm:col-span-2">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="h-11 w-full rounded-md border border-border bg-card px-3 pr-11 text-[14px] focus:outline-none"
              style={{ borderColor: password.length >= 10 ? meta.accent : undefined }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </Field>
      </div>

      {/* What's about to be created — actual values from wizard state */}
      <div
        className="rounded-xl border bg-card p-5 shadow-sm"
        style={{ borderColor: `${meta.accent}30`, backgroundColor: `${meta.accentSoft}30` }}
      >
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: meta.accent }}>
          What we&rsquo;ll create
        </div>
        <div className="mt-3 grid gap-2 text-[12.5px] sm:grid-cols-2">
          <SummaryLine icon={Building2} label="Tenant" value={`sandbox-${state.industry}`} />
          <SummaryLine icon={ShieldCheck} label="Pack" value={meta.name} />
          <SummaryLine icon={Database} label="Seed sources" value="8 canonical" />
          <SummaryLine icon={Globe2} label="Region" value={state.compliance.region} />
          <SummaryLine icon={KeyRound} label="API key" value="ak_·_  (shown once)" />
          <SummaryLine icon={Bell} label="Channel draft" value="email · ready to wire to Slack" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <Link
          href="/book-a-demo"
          className="text-[11.5px] text-muted-foreground hover:text-foreground"
        >
          Need production deployment instead? Book a working session →
        </Link>
        <motion.button
          type="submit"
          disabled={!canSubmit}
          whileHover={canSubmit ? { x: 2 } : undefined}
          whileTap={canSubmit ? { scale: 0.97 } : undefined}
          className="inline-flex h-12 items-center gap-2 rounded-md px-6 text-[14px] font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-40"
          style={{ backgroundColor: canSubmit ? meta.accent : 'rgba(10,10,11,0.25)' }}
        >
          Create my sandbox
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    </form>
  );
}

function SummaryLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded border border-border/40 bg-background/60 px-2 py-1.5">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="ml-auto truncate font-mono text-[11.5px] text-foreground/85">{value}</span>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  hintTone,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  hintTone?: 'error';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        {hint && (
          <span className={`text-[11px] ${hintTone === 'error' ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

// =============================================================
// Running
// =============================================================

function ProvisionRunning({ accent, activePhase }: { accent: string; activePhase: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          >
            <Loader2 className="h-3.5 w-3.5" style={{ color: accent }} />
          </motion.div>
          Building your sandbox
        </div>
        <span className="text-[11.5px] text-muted-foreground">transactional · &lt;3s</span>
      </div>

      <ul
        className="mt-6 space-y-2"
        role="status"
        aria-live="polite"
        aria-label={`Provisioning progress. Current phase: ${activePhase >= 0 && activePhase < PROVISION_PHASES.length ? PROVISION_PHASES[activePhase]!.label : 'starting'}.`}
      >
        {PROVISION_PHASES.map((phase, i) => {
          const isDone = i < activePhase;
          const isActive = i === activePhase;
          const isPending = i > activePhase;
          const Icon = phase.icon;
          return (
            <motion.li
              key={phase.id}
              className="flex items-center gap-3 rounded-md border bg-background/40 px-3 py-2.5"
              animate={{
                opacity: isPending ? 0.4 : 1,
                borderColor: isDone || isActive ? `${accent}40` : 'hsl(var(--border))',
              }}
            >
              <motion.span
                className="flex size-7 items-center justify-center rounded-md ring-1 ring-foreground/10"
                animate={{
                  backgroundColor: isDone ? accent : isActive ? `${accent}25` : 'rgba(10,10,11,0.04)',
                  color: isDone ? '#ffffff' : isActive ? accent : 'rgba(10,10,11,0.4)',
                }}
              >
                <AnimatePresence mode="wait">
                  {isDone ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </motion.span>
                  ) : (
                    <motion.span key="icon">
                      <Icon className="h-3.5 w-3.5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>
              <span className="flex-1 text-[13px] font-medium">{phase.label}</span>
              {isActive && (
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: accent }}
                />
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

// =============================================================
// Reveal — API key + welcome
// =============================================================

function ProvisionReveal({
  state,
  result,
  meta,
}: {
  state: WizardState;
  result: ProvisionResult;
  meta: typeof INDUSTRY_META[keyof typeof INDUSTRY_META];
}) {
  const [keyCopied, setKeyCopied] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [keyHidden, setKeyHidden] = useState(false);

  const copyKey = useCallback(() => {
    void navigator.clipboard.writeText(result.api_key.plaintext);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 1800);
  }, [result.api_key.plaintext]);

  const wpSnippet = `<?php
// Add to wp-config.php
define('ASSUREDAI_API_KEY', '${result.api_key.plaintext}');
define('ASSUREDAI_BASE_URL', 'https://assuredai.online');
define('ASSUREDAI_DEFAULT_PACK', '${state.industry}');`;

  const copySnippet = useCallback(() => {
    void navigator.clipboard.writeText(wpSnippet);
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 1800);
  }, [wpSnippet]);

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <div
        className="overflow-hidden rounded-2xl border shadow-xl"
        style={{
          borderColor: `${meta.accent}40`,
          boxShadow: `0 0 0 1px ${meta.accent}25, 0 24px 56px -24px ${meta.accent}50`,
        }}
      >
        <div
          className="border-b px-6 py-5"
          style={{ borderColor: `${meta.accent}25`, backgroundColor: `${meta.accentSoft}50` }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: meta.accent }}>
                Sandbox ready &middot; {result.tenant.slug}
              </div>
              <div className="mt-2 text-[24px] font-semibold tracking-[-0.02em] leading-tight">
                <span className="font-serif italic font-normal">Welcome</span> to your{' '}
                {meta.name.toLowerCase()} sandbox.
              </div>
              <p className="mt-2 text-[13.5px] text-foreground/75">
                {result.seed_source_count} seed sources loaded · API key minted ·
                {result.first_audit_log_id
                  ? ` first audit row #${result.first_audit_log_id} from your Step 5 run`
                  : ' ready for your first verification'}
              </p>
            </div>
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.15 }}
              className="flex size-12 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: meta.accent }}
            >
              <Check className="h-6 w-6" strokeWidth={3} />
            </motion.div>
          </div>
        </div>

        {/* API key reveal */}
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-50/40 p-4">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-amber-800">
              <KeyRound className="h-3 w-3" />
              API key · shown once · copy it now
            </div>
            <div className="flex items-stretch gap-2">
              <div
                className="flex-1 overflow-x-auto rounded-md border border-amber-500/30 bg-white px-3 py-2.5 font-mono text-[13px] text-foreground/85"
                style={{ filter: keyHidden ? 'blur(4px)' : undefined }}
              >
                {result.api_key.plaintext}
              </div>
              <button
                type="button"
                onClick={() => setKeyHidden((v) => !v)}
                className="inline-flex h-auto items-center gap-1 rounded-md border border-amber-500/30 bg-white px-3 text-[11.5px] font-medium text-amber-800 hover:bg-amber-50"
                aria-label={keyHidden ? 'Show key' : 'Hide key'}
              >
                {keyHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={copyKey}
                className="inline-flex h-auto items-center gap-1.5 rounded-md bg-amber-900 px-3 text-[12px] font-semibold text-white hover:bg-amber-950"
              >
                {keyCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {keyCopied ? 'Copied' : 'Copy key'}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-amber-800/80">
              Store this in your password manager now. We hash + discard it server-side; if you lose
              it, you&rsquo;ll need to issue a new one.
            </p>
          </div>

          {/* WordPress snippet pre-filled */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
                WordPress plugin · pre-filled snippet
              </div>
              <button
                type="button"
                onClick={copySnippet}
                className="inline-flex h-7 items-center gap-1 rounded border border-border bg-card px-2 text-[10.5px] font-medium text-foreground hover:bg-accent"
              >
                {snippetCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {snippetCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-[10.5px] leading-relaxed text-foreground/85">
{wpSnippet}
            </pre>
          </div>

          {/* Next steps — primary is auto-signin, gated by 'key copied'
              confirmation so visitors don't accidentally lose the key. */}
          <AutoSignInBlock
            email={state.account.email}
            password={state.account.password}
            keyCopiedHint={keyCopied}
            accent={meta.accent}
            extras={[
              ...(result.first_audit_log_id
                ? [{
                    icon: ShieldCheck,
                    title: 'Open your proof',
                    body: `Audit row #${result.first_audit_log_id} from Step 5`,
                    href: `/v/${result.first_audit_log_id}`,
                  }]
                : []),
              {
                icon: ExternalLink,
                title: 'Talk production',
                body: 'Book a working session for BAA + SSO',
                href: '/book-a-demo',
              },
            ]}
          />
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground/65">Sandbox tenant.</span> Real data, real
        audit chain, all yours to explore. When you&rsquo;re ready to roll AssuredAI into your
        production CMS with BAA / SOC 2 evidence / SSO wired up, we move to a working session.
      </div>
    </div>
  );
}

// =============================================================
// AutoSignInBlock — gated auto sign-in after provision
// =============================================================
//
// The cleanest possible landing: visitor confirms they've saved the
// API key, clicks ONE button, server-side signs them in with their
// just-set credentials, redirects them to /chat already authenticated.
// No re-typing the password they set 4 seconds ago.

function AutoSignInBlock({
  email,
  password,
  keyCopiedHint,
  accent,
  extras,
}: {
  email: string;
  password: string;
  /** Hint that they've already clicked "Copy key" — pre-checks the confirm box. */
  keyCopiedHint: boolean;
  accent: string;
  extras: Array<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    body: string;
    href: string;
  }>;
}) {
  const [confirmed, setConfirmed] = useState(keyCopiedHint);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep `confirmed` in sync if the user clicks the COPY button on the
  // amber card above after first arriving here.
  if (keyCopiedHint && !confirmed) {
    // Defer to next tick to avoid React render-cycle warning.
    setTimeout(() => setConfirmed(true), 0);
  }

  const handleSignIn = useCallback(async () => {
    setError(null);
    setSigningIn(true);
    try {
      const res = await signInAfterProvisionAction({ email, password });
      if (!res.ok) {
        setError(res.error);
        setSigningIn(false);
        return;
      }
      // Server action redirect via a follow-up server call — needed because
      // the cookie set by signIn doesn't reach the client router until the
      // next request boundary.
      await redirectToSandbox(res.redirectTo);
    } catch (err) {
      // redirectToSandbox throws a Next.js redirect signal — that's the
      // expected control-flow exit, not an error. Anything else is real.
      const message = err instanceof Error ? err.message : String(err);
      if (!/NEXT_REDIRECT/i.test(message)) {
        setError(message);
        setSigningIn(false);
      }
    }
  }, [email, password]);

  return (
    <div>
      {/* Confirmation gate */}
      <label
        className="mb-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-card p-3 text-[12.5px]"
        style={{ borderColor: confirmed ? `${accent}40` : undefined }}
      >
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
          style={{ accentColor: accent }}
        />
        <span className="text-foreground/85">
          I&rsquo;ve saved my API key somewhere I&rsquo;ll find it again.{' '}
          <span className="text-muted-foreground">
            (We hash + discard it server-side. If you lose it you&rsquo;ll have to issue a new
            one from <code className="font-mono text-[11px]">/admin/api-keys</code>.)
          </span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <motion.button
          type="button"
          onClick={handleSignIn}
          disabled={!confirmed || signingIn}
          whileHover={confirmed && !signingIn ? { y: -2 } : undefined}
          whileTap={confirmed && !signingIn ? { scale: 0.985 } : undefined}
          className="group flex flex-col rounded-xl border p-4 text-left shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:hover:shadow-sm"
          style={{
            backgroundColor: confirmed && !signingIn ? accent : 'rgba(10,10,11,0.18)',
            borderColor: confirmed && !signingIn ? accent : 'hsl(var(--border))',
            color: '#ffffff',
          }}
        >
          {signingIn ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <LogIn className="h-4 w-4 text-white" />
          )}
          <div className="mt-2 text-[13.5px] font-semibold tracking-tight">
            {signingIn ? 'Signing you in…' : 'Open my sandbox'}
          </div>
          <div className="mt-0.5 text-[11.5px] text-white/85">
            {signingIn ? 'Setting your session' : 'One-click sign-in → /chat'}
          </div>
        </motion.button>

        {extras.map((extra) => {
          const Icon = extra.icon;
          return (
            <Link
              key={extra.href}
              href={extra.href}
              target={extra.href.startsWith('http') ? '_blank' : undefined}
              className="group flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span style={{ color: accent }}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="mt-2 text-[13.5px] font-semibold tracking-tight">{extra.title}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">{extra.body}</div>
            </Link>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/[0.06] px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

function NextStep({
  icon: Icon,
  title,
  body,
  href,
  primary,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href: string;
  primary?: boolean;
  accent: string;
}) {
  return (
    <Link
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      className="group flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{
        borderColor: primary ? accent : 'hsl(var(--border))',
        backgroundColor: primary ? accent : undefined,
        color: primary ? '#ffffff' : undefined,
      }}
    >
      <Icon className={`h-4 w-4 ${primary ? 'text-white' : ''}`} />
      <div className="mt-2 text-[13.5px] font-semibold tracking-tight">{title}</div>
      <div className={`mt-0.5 text-[11.5px] ${primary ? 'text-white/85' : 'text-muted-foreground'}`}>
        {body}
      </div>
    </Link>
  );
}
