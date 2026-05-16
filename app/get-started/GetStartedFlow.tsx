'use client';

/**
 * /get-started — the wizard orchestrator.
 *
 * Six steps, split-canvas layout (wizard left, workspace preview
 * right), top progress bar, persistent back/skip/continue footer.
 * State lives in a single reducer (lib/wizard/types.ts).
 *
 * Scope of THIS commit (the scaffolding pass):
 *   - Full split-canvas shell + progress bar
 *   - Step 1 fully working (industry picker, page re-tints on pick)
 *   - Steps 2–6 functional skeletons: click-through navigation,
 *     placeholder content, will be fleshed out in the next commit
 *   - Workspace preview on the right rail (static for now; will
 *     materialise dynamically once Steps 2–4 are fleshed out)
 *   - Step 5 ("Verify") and Step 6 ("Provision") explicitly stubbed
 *     with a "wiring up the live verification / provisioning"
 *     placeholder + a link out to the production-path section
 */

import { useReducer, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  Sparkles,
  Stethoscope,
  Banknote,
  Landmark,
  Scale,
  PlayCircle,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import {
  INDUSTRIES,
  INDUSTRY_META,
  INITIAL_WIZARD_STATE,
  ROLES_BY_INDUSTRY,
  STEP_LABELS,
  wizardReducer,
  type Industry,
  type WizardAction,
  type WizardState,
} from '@/lib/wizard/types';

type WizardDispatch = React.Dispatch<WizardAction>;

const INDUSTRY_ICONS: Record<Industry, React.ComponentType<{ className?: string }>> = {
  healthcare: Stethoscope,
  finance: Banknote,
  government: Landmark,
  legal: Scale,
};

export function GetStartedFlow() {
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_WIZARD_STATE);

  // Accent color threads through the progress bar fill, hover states,
  // and badge tints once an industry is picked.
  const accent = state.industry ? INDUSTRY_META[state.industry].accent : '#0a0a0b';
  const accentSoft = state.industry ? INDUSTRY_META[state.industry].accentSoft : '#e5e7eb';

  return (
    <div className="relative">
      {/* Top progress bar */}
      <ProgressBar step={state.step} accent={accent} />

      {/* Split canvas */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-0 lg:grid-cols-[1.2fr_1fr]">
        {/* Left — the active step */}
        <div className="relative min-h-[640px] border-b border-border lg:border-b-0 lg:border-r">
          <div className="px-6 py-10 sm:px-10 sm:py-14">
            <StepHeader state={state} />
            <div className="mt-10">
              {state.step === 1 && <Step1Industry state={state} dispatch={dispatch} />}
              {state.step === 2 && <Step2Role state={state} dispatch={dispatch} />}
              {state.step === 3 && <Step3Publishing state={state} dispatch={dispatch} />}
              {state.step === 4 && <Step4Compliance state={state} dispatch={dispatch} />}
              {state.step === 5 && <Step5Verify state={state} dispatch={dispatch} />}
              {state.step === 6 && <Step6Provision state={state} dispatch={dispatch} />}
            </div>
            <StepNav state={state} dispatch={dispatch} accent={accent} />
          </div>
        </div>

        {/* Right — workspace preview */}
        <div
          className="relative min-h-[640px] bg-muted/20 px-6 py-10 sm:px-10 sm:py-14"
          style={state.industry ? { backgroundColor: `${accentSoft}40` } : undefined}
        >
          <WorkspacePreview state={state} accent={accent} />
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Top progress bar
// =============================================================

function ProgressBar({ step, accent }: { step: WizardState['step']; accent: string }) {
  const segments = [1, 2, 3, 4, 5, 6] as const;
  return (
    <div className="border-b border-border bg-background/95 px-6 py-4 sm:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex gap-1.5">
          {segments.map((n) => {
            const filled = n <= step;
            const active = n === step;
            return (
              <div
                key={n}
                className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/[0.08]"
                aria-hidden
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: filled ? '100%' : '0%',
                    backgroundColor: filled ? accent : 'transparent',
                    opacity: active ? 1 : filled ? 0.85 : 0,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
          {segments.map((n, i) => (
            <span key={n} className="inline-flex items-baseline gap-2">
              <span
                className={
                  n === step
                    ? 'font-serif italic text-foreground'
                    : n < step
                      ? 'text-foreground/55'
                      : 'text-foreground/30'
                }
              >
                {STEP_LABELS[n]}
              </span>
              {i < segments.length - 1 && <span className="text-foreground/20">·</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Step header (shared)
// =============================================================

function StepHeader({ state }: { state: WizardState }) {
  const eyebrows: Record<WizardState['step'], { kicker: string; title: string; lede: string }> = {
    1: {
      kicker: 'Step 1 · Pick your vertical',
      title: 'Which regulated industry do you publish in?',
      lede:
        'This drives every default downstream — the recognizer set, the disclaimer library, the red-flag rules, the seed sources we pre-load into your sandbox.',
    },
    2: {
      kicker: 'Step 2 · Tell us about you',
      title: "What's your role?",
      lede:
        'Different roles read different parts of the platform first. We optimise the sandbox layout for what you care about.',
    },
    3: {
      kicker: 'Step 3 · How you publish',
      title: 'Where does your content come from?',
      lede:
        'AssuredAI is the gate every piece passes through &mdash; in-house, agency, freelance, vendor, or AI-drafted. Pick everything that applies.',
    },
    4: {
      kicker: 'Step 4 · Compliance posture',
      title: 'What does your regulator expect?',
      lede:
        'Pre-checked based on your vertical, but you set the floor. These flow straight into your sandbox tenant settings.',
    },
    5: {
      kicker: 'Step 5 · See it work',
      title: 'Run a real verification on a sample.',
      lede:
        'Pipeline runs end-to-end against the live AssuredAI verifier. You get a real hash-chained proof URL at the end &mdash; before you even sign up.',
    },
    6: {
      kicker: 'Step 6 · Create your sandbox tenant',
      title: 'Three lines and you&rsquo;re in.',
      lede:
        'We pre-provision the tenant with the pack, sources, region, and retention you just picked. The API key lands once on the next screen.',
    },
  };
  const e = eyebrows[state.step];
  return (
    <div>
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
        {e.kicker}
      </div>
      <h1
        className="mt-4 text-balance text-[34px] sm:text-[44px] font-semibold leading-[1.05] tracking-[-0.025em]"
        dangerouslySetInnerHTML={{ __html: e.title }}
      />
      <p
        className="mt-4 max-w-2xl text-[15px] leading-relaxed text-foreground/75"
        dangerouslySetInnerHTML={{ __html: e.lede }}
      />
    </div>
  );
}

// =============================================================
// Step 1 — Industry picker
// =============================================================

function Step1Industry({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: WizardDispatch;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {INDUSTRIES.map((id) => {
        const meta = INDUSTRY_META[id];
        const Icon = INDUSTRY_ICONS[id];
        const selected = state.industry === id;
        return (
          <button
            type="button"
            key={id}
            onClick={() => {
              dispatch({ type: 'set_industry', industry: id });
            }}
            className="group relative flex flex-col rounded-2xl border bg-card p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{
              borderColor: selected ? meta.accent : 'hsl(var(--border))',
              boxShadow: selected ? `0 0 0 1px ${meta.accent}40` : undefined,
              backgroundColor: selected ? `${meta.accentSoft}50` : undefined,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className="flex size-11 items-center justify-center rounded-xl ring-1"
                style={{
                  backgroundColor: selected ? meta.accent : 'hsl(var(--foreground) / 0.04)',
                  color: selected ? 'white' : 'hsl(var(--foreground) / 0.7)',
                  borderColor: selected ? meta.accent : undefined,
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              {selected && (
                <span
                  className="flex size-6 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: meta.accent }}
                  aria-hidden
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="mt-4 text-[20px] font-semibold tracking-tight">{meta.name}</div>
            <div className="mt-1 text-[12.5px] text-muted-foreground">{meta.compliance}</div>
            <div className="mt-5 flex items-center justify-between text-[11.5px]">
              <span className="text-muted-foreground">
                {meta.recent} verified · 7d
              </span>
              <span
                className="inline-flex items-center gap-1 font-medium"
                style={{ color: selected ? meta.accent : 'hsl(var(--foreground) / 0.55)' }}
              >
                {selected ? 'Selected' : 'Pick'}
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================
// Step 2 — Role
// =============================================================

function Step2Role({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: WizardDispatch;
}) {
  if (!state.industry) {
    return <PlaceholderBackToStep1 />;
  }
  const roles = ROLES_BY_INDUSTRY[state.industry];
  const accent = INDUSTRY_META[state.industry].accent;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((r) => {
        const selected = state.role === r.id;
        return (
          <button
            type="button"
            key={r.id}
            onClick={() => dispatch({ type: 'set_role', role: r.id })}
            className="group flex flex-col rounded-xl border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm"
            style={{
              borderColor: selected ? accent : 'hsl(var(--border))',
              boxShadow: selected ? `0 0 0 1px ${accent}40` : undefined,
            }}
          >
            <div className="text-[15px] font-semibold tracking-tight">{r.label}</div>
            <div className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">{r.sub}</div>
            {selected && (
              <div
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: accent }}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
                Selected
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================
// Step 3 — Publishing context (stub — next commit)
// =============================================================

function Step3Publishing({ state }: { state: WizardState; dispatch: WizardDispatch }) {
  if (!state.industry) return <PlaceholderBackToStep1 />;
  return (
    <StubSection
      message="Publishing-context picker — content sources, CMS platform, monthly volume — wires up in the next commit."
      preview={[
        'In-house writers · AI-drafted · Agency · Freelance · Vendor-supplied',
        'WordPress · custom CMS · headless · AEM · Sitecore · SFMC',
        'Volume bands from < 100/mo to 10k+/mo',
      ]}
    />
  );
}

// =============================================================
// Step 4 — Compliance posture (stub — next commit)
// =============================================================

function Step4Compliance({ state }: { state: WizardState; dispatch: WizardDispatch }) {
  if (!state.industry) return <PlaceholderBackToStep1 />;
  return (
    <StubSection
      message="Compliance-posture picker — BAA, SOC 2, FedRAMP, region pin, retention window — wires up in the next commit."
      preview={[
        'BAA required · SOC 2 Type II required · FedRAMP-ready required',
        'Region: US East / US West / EU Central / AP Southeast',
        'Audit retention: defaults to 7y (HIPAA) / 6y (FINRA) / 3y (ABA), overridable',
      ]}
    />
  );
}

// =============================================================
// Step 5 — Live verification (stub — backend in next-next commit)
// =============================================================

function Step5Verify({ state }: { state: WizardState; dispatch: WizardDispatch }) {
  if (!state.industry) return <PlaceholderBackToStep1 />;
  return (
    <div className="space-y-5">
      <StubSection
        message="Live verification against the real AssuredAI pipeline — wires up after the publishing/compliance steps land."
        preview={[
          'Sample article tailored to your industry (or paste your own)',
          'Pipeline runs end-to-end: PHI/PII redact → source retrieval → draft → red-flag → disclaimer → audit',
          'Real /v/<id> proof URL you can copy + share BEFORE signup',
        ]}
      />
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
          <PlayCircle className="h-4 w-4" />
          Want to verify something right now?
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/80">
          The live verifier at <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[12px]">/chat</code>{' '}
          accepts any content and produces a real hash-chained proof URL — no signup needed
          for a single demo run. That&rsquo;s the same pipeline the wizard will run for you
          in the next iteration.
        </p>
        <Link
          href="/chat"
          target="_blank"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-4 text-[12.5px] font-semibold text-foreground hover:bg-accent"
        >
          Open the live verifier
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// =============================================================
// Step 6 — Provision (stub — backend in next-next commit)
// =============================================================

function Step6Provision({ state }: { state: WizardState; dispatch: WizardDispatch }) {
  if (!state.industry) return <PlaceholderBackToStep1 />;
  return (
    <div className="space-y-5">
      <StubSection
        message="Sandbox-tenant provisioning — creates a real workspace with your pack, sources, region, retention, and API key — wires up in the final wizard commit."
        preview={[
          'Tenant created · pack installed · seed sources loaded',
          'Region pinned · retention set · audit channel drafted',
          'API key minted (shown once) · WordPress plugin snippet pre-filled',
          'First verification from Step 5 already in your audit log',
        ]}
      />
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
          <Calendar className="h-4 w-4" />
          Ready for a production deployment instead?
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/80">
          The sandbox above is for exploration. Production deployment is its own engagement
          &mdash; BAA, SSO, IT review, custom pack tuning, SOC 2 evidence pack. Book a
          30-minute working session and we&rsquo;ll scope it together.
        </p>
        <Link
          href="/book-a-demo"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-[12.5px] font-semibold text-background hover:opacity-90"
        >
          Book a working session
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// =============================================================
// Step navigation (footer)
// =============================================================

function StepNav({
  state,
  dispatch,
  accent,
}: {
  state: WizardState;
  dispatch: WizardDispatch;
  accent: string;
}) {
  const canAdvance = useMemo(() => {
    switch (state.step) {
      case 1:
        return state.industry !== null;
      case 2:
        return state.role !== null;
      case 3:
      case 4:
      case 5:
        return true; // stubs allow advance
      case 6:
        return false; // requires actual provisioning
      default:
        return false;
    }
  }, [state]);

  const handleNext = useCallback(() => dispatch({ type: 'next' }), [dispatch]);
  const handleBack = useCallback(() => dispatch({ type: 'back' }), [dispatch]);

  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          disabled={state.step === 1}
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-[12.5px] font-medium text-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-card"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <Link
          href="/"
          className="hidden text-[11.5px] text-muted-foreground hover:text-foreground sm:inline"
        >
          Skip and read the case
        </Link>
      </div>
      {state.step < 6 ? (
        <button
          type="button"
          onClick={handleNext}
          disabled={!canAdvance}
          className="inline-flex h-11 items-center gap-2 rounded-md px-5 text-[13.5px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: accent }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex h-11 items-center gap-2 rounded-md bg-foreground/40 px-5 text-[13.5px] font-semibold text-white"
          title="Provisioning wires up in the final wizard commit"
        >
          Create my sandbox · provisioning wiring up
          <Sparkles className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// =============================================================
// Workspace preview (right rail) — static morphing for now
// =============================================================

function WorkspacePreview({ state, accent }: { state: WizardState; accent: string }) {
  const meta = state.industry ? INDUSTRY_META[state.industry] : null;
  return (
    <div className="space-y-5">
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
        Your workspace
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/70" />
            <span className="size-2.5 rounded-full bg-amber-400/70" />
            <span className="size-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <div className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-0.5 font-mono text-[10.5px] text-muted-foreground">
            <ShieldCheck className="h-2.5 w-2.5" />
            sandbox.assuredai.online
          </div>
          <span
            className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground"
            style={meta ? { color: accent } : undefined}
          >
            <span
              className="size-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: meta?.accent ?? '#94a3b8' }}
            />
            {meta ? `${meta.name} pack` : 'awaiting pick'}
          </span>
        </div>
        <div className="px-5 py-5">
          <PreviewRow label="Tenant" value={meta ? 'sandbox-yours' : '—'} />
          <PreviewRow
            label="Pack"
            value={meta ? `${meta.name.toLowerCase()} · ${meta.compliance}` : 'awaiting Step 1'}
          />
          <PreviewRow
            label="Role"
            value={
              state.role && state.industry
                ? (ROLES_BY_INDUSTRY[state.industry].find((r) => r.id === state.role)?.label ?? state.role)
                : 'awaiting Step 2'
            }
          />
          <PreviewRow label="Content sources" value="awaiting Step 3" muted />
          <PreviewRow label="Region" value="awaiting Step 4" muted />
          <PreviewRow label="Retention" value="awaiting Step 4" muted />
          <PreviewRow label="First verification" value="awaiting Step 5" muted />
          <PreviewRow label="API key" value="awaiting Step 6" muted />
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground/65">Sandbox · not production.</span>{' '}
        Everything you see here is yours to explore. When you&rsquo;re ready for real
        deployment (BAA, SSO, IT review), we move to a working session.
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className={`text-[12.5px] tabular-nums ${muted ? 'text-muted-foreground/60' : 'text-foreground/85'}`}>
        {value}
      </div>
    </div>
  );
}

// =============================================================
// Shared placeholders for stubbed steps
// =============================================================

function StubSection({ message, preview }: { message: string; preview: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5">
      <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
        <Sparkles className="h-4 w-4" />
        Wiring up
      </div>
      <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/80">{message}</p>
      <ul className="mt-4 space-y-1.5 text-[12.5px] text-muted-foreground">
        {preview.map((p, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span className="text-foreground/30">·</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlaceholderBackToStep1() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-[13.5px] text-foreground/80">
      Pick an industry first &mdash; that drives every default downstream.
    </div>
  );
}
