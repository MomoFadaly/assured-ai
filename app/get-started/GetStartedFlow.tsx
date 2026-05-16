'use client';

/**
 * /get-started — the wizard orchestrator (v2 · craft pass).
 *
 * Six steps, split-canvas, with motion that earns its keep:
 *   - Cursor-tracking gradient mesh background that re-tints with
 *     the picked industry (signature interactive element)
 *   - Top progress bar with industry-accent gradient fill +
 *     spring-physics motion on advance
 *   - Per-step entrance animations (subtle, 320ms, ease-out)
 *   - Right rail workspace preview that materialises FOR REAL:
 *     seed sources stagger in as you finish Step 1, role row
 *     fades in at Step 2, content-source pills appear at Step 3,
 *     compliance badges spring in at Step 4
 *   - Industry accent threads through ~12 distinct UI elements
 *
 * Steps 1–4 fully functional. Steps 5–6 still stubbed with proper
 * motion frames so the stub doesn't look like a placeholder — it
 * looks like a step that's about to do something real. Backend
 * (real /api/wizard/sample + /api/wizard/provision) lands next.
 */

import { useReducer, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Transition,
} from 'framer-motion';
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
  Lock,
  Globe2,
  FileText,
  Clock,
  Database,
  KeyRound,
} from 'lucide-react';
import {
  CMS_OPTIONS,
  CONTENT_SOURCE_OPTIONS,
  INDUSTRIES,
  INDUSTRY_META,
  INITIAL_WIZARD_STATE,
  REGION_OPTIONS,
  ROLES_BY_INDUSTRY,
  STEP_LABELS,
  VOLUME_OPTIONS,
  wizardReducer,
  type ContentSource,
  type Industry,
  type Region,
  type WizardAction,
  type WizardState,
} from '@/lib/wizard/types';
import { SEED_SOURCES } from '@/lib/wizard/seed-sources';
import { MeshBackground } from './MeshBackground';

type WizardDispatch = React.Dispatch<WizardAction>;

const INDUSTRY_ICONS: Record<Industry, React.ComponentType<{ className?: string }>> = {
  healthcare: Stethoscope,
  finance: Banknote,
  government: Landmark,
  legal: Scale,
};

const EASE: Transition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] };

export function GetStartedFlow() {
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_WIZARD_STATE);
  const reduceMotion = useReducedMotion();

  const accent = state.industry ? INDUSTRY_META[state.industry].accent : '#0a0a0b';
  const accentSoft = state.industry ? INDUSTRY_META[state.industry].accentSoft : '#e2e8f0';

  return (
    <div className="relative">
      <MeshBackground accent={accent} accentSoft={accentSoft} />
      <ProgressBar step={state.step} accent={accent} />
      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-0 lg:grid-cols-[1.2fr_1fr]">
        {/* Left — active step */}
        <div className="relative min-h-[680px] border-b border-border/70 lg:border-b-0 lg:border-r">
          <div className="px-6 py-10 sm:px-10 sm:py-14">
            <StepHeader state={state} />
            <div className="mt-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={state.step}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={EASE}
                >
                  {state.step === 1 && <Step1Industry state={state} dispatch={dispatch} />}
                  {state.step === 2 && <Step2Role state={state} dispatch={dispatch} />}
                  {state.step === 3 && <Step3Publishing state={state} dispatch={dispatch} />}
                  {state.step === 4 && <Step4Compliance state={state} dispatch={dispatch} />}
                  {state.step === 5 && <Step5Verify state={state} />}
                  {state.step === 6 && <Step6Provision state={state} />}
                </motion.div>
              </AnimatePresence>
            </div>
            <StepNav state={state} dispatch={dispatch} accent={accent} />
          </div>
        </div>

        {/* Right — workspace materializing live */}
        <div className="relative min-h-[680px] px-6 py-10 sm:px-10 sm:py-14">
          <WorkspacePreview state={state} accent={accent} accentSoft={accentSoft} />
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Progress bar
// =============================================================

function ProgressBar({ step, accent }: { step: WizardState['step']; accent: string }) {
  const segments = [1, 2, 3, 4, 5, 6] as const;
  return (
    <div className="relative border-b border-border/70 bg-background/85 px-6 py-4 backdrop-blur-xl sm:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex gap-1.5">
          {segments.map((n) => (
            <div
              key={n}
              className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/[0.07]"
              aria-hidden
            >
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                initial={false}
                animate={{
                  width: n <= step ? '100%' : '0%',
                  backgroundColor: accent,
                }}
                transition={{ ...EASE, duration: 0.5 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
          {segments.map((n, i) => (
            <span key={n} className="inline-flex items-baseline gap-2">
              <span
                className={
                  n === step
                    ? 'font-serif italic'
                    : n < step
                      ? 'text-foreground/55'
                      : 'text-foreground/30'
                }
                style={n === step ? { color: accent } : undefined}
              >
                {STEP_LABELS[n]}
              </span>
              {i < segments.length - 1 && <span className="text-foreground/15">·</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Step header — serif italic on the inflection word
// =============================================================

function StepHeader({ state }: { state: WizardState }) {
  const eyebrows: Record<
    WizardState['step'],
    { kicker: string; title: React.ReactNode; lede: string }
  > = {
    1: {
      kicker: 'Step 1 · Pick your vertical',
      title: <>Which regulated industry do you <i className="font-serif font-normal text-foreground">publish in?</i></>,
      lede:
        'This drives every default downstream — the recognizer set, the disclaimer library, the red-flag rules, the seed sources we pre-load into your sandbox.',
    },
    2: {
      kicker: 'Step 2 · Tell us about you',
      title: <>What&rsquo;s <i className="font-serif font-normal text-foreground">your role?</i></>,
      lede: 'Different roles read different parts of the platform first. We optimise the sandbox layout for what you care about.',
    },
    3: {
      kicker: 'Step 3 · How you publish',
      title: <>Where does your <i className="font-serif font-normal text-foreground">content come from?</i></>,
      lede:
        'AssuredAI is the gate every piece passes through — in-house, agency, freelance, vendor, or AI-drafted. Pick everything that applies.',
    },
    4: {
      kicker: 'Step 4 · Compliance posture',
      title: <>What does your <i className="font-serif font-normal text-foreground">regulator expect?</i></>,
      lede: 'Pre-checked based on your vertical, but you set the floor. These flow straight into your sandbox tenant settings.',
    },
    5: {
      kicker: 'Step 5 · See it work',
      title: <>Run a real verification on a <i className="font-serif font-normal text-foreground">sample.</i></>,
      lede:
        'Pipeline runs end-to-end against the live AssuredAI verifier. You get a real hash-chained proof URL at the end — before you even sign up.',
    },
    6: {
      kicker: 'Step 6 · Create your sandbox tenant',
      title: <>Three lines and you&rsquo;re <i className="font-serif font-normal text-foreground">in.</i></>,
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
      <h1 className="mt-4 text-balance text-[34px] sm:text-[44px] md:text-[48px] font-semibold leading-[1.05] tracking-[-0.028em]">
        {e.title}
      </h1>
      <p className="mt-4 max-w-2xl text-[15.5px] leading-[1.6] text-foreground/75">{e.lede}</p>
    </div>
  );
}

// =============================================================
// Step 1 — Industry
// =============================================================

function Step1Industry({ state, dispatch }: { state: WizardState; dispatch: WizardDispatch }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {INDUSTRIES.map((id, i) => {
        const meta = INDUSTRY_META[id];
        const Icon = INDUSTRY_ICONS[id];
        const selected = state.industry === id;
        return (
          <motion.button
            type="button"
            key={id}
            onClick={() => dispatch({ type: 'set_industry', industry: id })}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...EASE, delay: i * 0.05 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.985 }}
            className="group relative flex flex-col rounded-2xl border bg-card p-6 text-left shadow-sm transition-shadow hover:shadow-md"
            style={{
              borderColor: selected ? meta.accent : 'hsl(var(--border))',
              boxShadow: selected
                ? `0 0 0 1px ${meta.accent}40, 0 12px 32px -12px ${meta.accent}60`
                : undefined,
              backgroundColor: selected ? `${meta.accentSoft}40` : undefined,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <motion.div
                className="flex size-12 items-center justify-center rounded-xl ring-1 ring-foreground/10"
                animate={{
                  backgroundColor: selected ? meta.accent : 'rgba(10,10,11,0.04)',
                  color: selected ? '#ffffff' : 'rgba(10,10,11,0.7)',
                }}
                transition={EASE}
              >
                <Icon className="h-5 w-5" />
              </motion.div>
              <AnimatePresence>
                {selected && (
                  <motion.span
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                    className="flex size-6 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: meta.accent }}
                    aria-hidden
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="mt-4 text-[22px] font-semibold tracking-[-0.018em]">{meta.name}</div>
            <div className="mt-1 text-[12.5px] text-muted-foreground">{meta.compliance}</div>
            <div className="mt-5 flex items-center justify-between text-[11.5px]">
              <span className="text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground/70">{meta.recent}</span>{' '}
                verified · last 7 days
              </span>
              <span
                className="inline-flex items-center gap-1 font-semibold"
                style={{ color: selected ? meta.accent : 'rgba(10,10,11,0.55)' }}
              >
                {selected ? 'Selected' : 'Pick'}
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

// =============================================================
// Step 2 — Role
// =============================================================

function Step2Role({ state, dispatch }: { state: WizardState; dispatch: WizardDispatch }) {
  if (!state.industry) return <PlaceholderBackToStep1 />;
  const roles = ROLES_BY_INDUSTRY[state.industry];
  const meta = INDUSTRY_META[state.industry];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((r, i) => {
        const selected = state.role === r.id;
        return (
          <motion.button
            type="button"
            key={r.id}
            onClick={() => dispatch({ type: 'set_role', role: r.id })}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...EASE, delay: i * 0.04 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="group flex flex-col rounded-xl border bg-card p-5 text-left shadow-sm transition-shadow hover:shadow-md"
            style={{
              borderColor: selected ? meta.accent : 'hsl(var(--border))',
              boxShadow: selected ? `0 0 0 1px ${meta.accent}40` : undefined,
              backgroundColor: selected ? `${meta.accentSoft}30` : undefined,
            }}
          >
            <div className="text-[15.5px] font-semibold tracking-[-0.012em]">{r.label}</div>
            <div className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">{r.sub}</div>
            <AnimatePresence>
              {selected && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold"
                  style={{ color: meta.accent }}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                  Selected
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

// =============================================================
// Step 3 — Publishing context
// =============================================================

function Step3Publishing({ state, dispatch }: { state: WizardState; dispatch: WizardDispatch }) {
  if (!state.industry) return <PlaceholderBackToStep1 />;
  const meta = INDUSTRY_META[state.industry];
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold tracking-tight">
            Which sources feed your content pipeline?
          </h3>
          <span className="text-[11.5px] text-muted-foreground">Pick everything that applies</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {CONTENT_SOURCE_OPTIONS.map((opt, i) => {
            const selected = state.contentSources.includes(opt.id);
            return (
              <motion.button
                type="button"
                key={opt.id}
                onClick={() => dispatch({ type: 'toggle_content_source', source: opt.id })}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...EASE, delay: i * 0.03 }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow"
                style={{
                  borderColor: selected ? meta.accent : 'hsl(var(--border))',
                  backgroundColor: selected ? `${meta.accentSoft}40` : undefined,
                }}
              >
                <motion.span
                  animate={{
                    backgroundColor: selected ? meta.accent : 'rgba(10,10,11,0.04)',
                    color: selected ? '#ffffff' : 'rgba(10,10,11,0.4)',
                  }}
                  transition={EASE}
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded ring-1 ring-foreground/10"
                  aria-hidden
                >
                  <AnimatePresence>
                    {selected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium tracking-tight">{opt.label}</div>
                  <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                    {opt.sub}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Where does it publish?">
          <select
            value={state.cmsPlatform ?? ''}
            onChange={(e) => dispatch({ type: 'set_cms', cms: e.target.value as never })}
            className="h-11 w-full rounded-md border border-border bg-card px-3 text-[13.5px] focus:outline-none"
            style={{ borderColor: state.cmsPlatform ? meta.accent : undefined }}
          >
            <option value="" disabled>
              Pick your CMS / surface
            </option>
            {CMS_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Monthly volume (estimate)">
          <select
            value={state.monthlyVolume ?? ''}
            onChange={(e) => dispatch({ type: 'set_volume', volume: e.target.value })}
            className="h-11 w-full rounded-md border border-border bg-card px-3 text-[13.5px] focus:outline-none"
            style={{ borderColor: state.monthlyVolume ? meta.accent : undefined }}
          >
            <option value="" disabled>
              Pick a band
            </option>
            {VOLUME_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

// =============================================================
// Step 4 — Compliance
// =============================================================

const COMPLIANCE_DEFAULTS: Record<
  Industry,
  { baa: boolean; soc2: boolean; fedramp: boolean; retentionDays: number; retentionLabel: string }
> = {
  healthcare: { baa: true, soc2: true, fedramp: false, retentionDays: 2555, retentionLabel: '7y · HIPAA' },
  finance: { baa: false, soc2: true, fedramp: false, retentionDays: 2190, retentionLabel: '6y · FINRA' },
  government: { baa: false, soc2: true, fedramp: true, retentionDays: 2555, retentionLabel: '7y · NARA / agency policy' },
  legal: { baa: false, soc2: true, fedramp: false, retentionDays: 1825, retentionLabel: '5y · ABA Model Rule 1.15' },
};

function Step4Compliance({ state, dispatch }: { state: WizardState; dispatch: WizardDispatch }) {
  if (!state.industry) return <PlaceholderBackToStep1 />;
  const meta = INDUSTRY_META[state.industry];
  const defaults = COMPLIANCE_DEFAULTS[state.industry];

  useEffect(() => {
    if (
      state.compliance.retentionDays === 2555 &&
      !state.compliance.baaNeeded &&
      !state.compliance.soc2Needed &&
      !state.compliance.fedrampNeeded
    ) {
      dispatch({
        type: 'set_compliance',
        compliance: {
          baaNeeded: defaults.baa,
          soc2Needed: defaults.soc2,
          fedrampNeeded: defaults.fedramp,
          retentionDays: defaults.retentionDays,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.industry]);

  const certs = [
    {
      id: 'baa' as const,
      label: 'BAA required',
      sub: 'HIPAA Business Associate Agreement at signing',
      checked: state.compliance.baaNeeded,
      icon: ShieldCheck,
      toggle: () =>
        dispatch({
          type: 'set_compliance',
          compliance: { baaNeeded: !state.compliance.baaNeeded },
        }),
    },
    {
      id: 'soc2' as const,
      label: 'SOC 2 Type II',
      sub: 'Annual report under MNDA, evidence portal',
      checked: state.compliance.soc2Needed,
      icon: FileText,
      toggle: () =>
        dispatch({
          type: 'set_compliance',
          compliance: { soc2Needed: !state.compliance.soc2Needed },
        }),
    },
    {
      id: 'fedramp' as const,
      label: 'FedRAMP-ready',
      sub: 'Moderate baseline, authorised region',
      checked: state.compliance.fedrampNeeded,
      icon: Lock,
      toggle: () =>
        dispatch({
          type: 'set_compliance',
          compliance: { fedrampNeeded: !state.compliance.fedrampNeeded },
        }),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold tracking-tight">
            Certifications you need on file
          </h3>
          <span className="text-[11.5px] text-muted-foreground">Pre-checked for your vertical</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {certs.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.button
                type="button"
                key={c.id}
                onClick={c.toggle}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...EASE, delay: i * 0.05 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow"
                style={{
                  borderColor: c.checked ? meta.accent : 'hsl(var(--border))',
                  backgroundColor: c.checked ? `${meta.accentSoft}40` : undefined,
                }}
              >
                <motion.span
                  animate={{
                    backgroundColor: c.checked ? meta.accent : 'rgba(10,10,11,0.04)',
                    color: c.checked ? '#ffffff' : 'rgba(10,10,11,0.5)',
                  }}
                  transition={EASE}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-foreground/10"
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </motion.span>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium tracking-tight">{c.label}</div>
                  <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                    {c.sub}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Region pin">
          <select
            value={state.compliance.region}
            onChange={(e) =>
              dispatch({
                type: 'set_compliance',
                compliance: { region: e.target.value as Region },
              })
            }
            className="h-11 w-full rounded-md border border-border bg-card px-3 text-[13.5px] focus:outline-none"
            style={{ borderColor: meta.accent }}
          >
            {REGION_OPTIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Audit retention (default: ${defaults.retentionLabel})`}>
          <input
            type="number"
            min={30}
            max={36500}
            value={state.compliance.retentionDays}
            onChange={(e) =>
              dispatch({
                type: 'set_compliance',
                compliance: { retentionDays: parseInt(e.target.value, 10) || 0 },
              })
            }
            className="h-11 w-full rounded-md border border-border bg-card px-3 text-[13.5px] tabular-nums focus:outline-none"
            style={{ borderColor: meta.accent }}
          />
        </Field>
      </div>
    </div>
  );
}

// =============================================================
// Step 5 — Verify (stub for backend pass)
// =============================================================

function Step5Verify({ state }: { state: WizardState }) {
  if (!state.industry) return <PlaceholderBackToStep1 />;
  return (
    <BackendPending
      title="Live verification · wiring up"
      message="The pipeline runs against the real AssuredAI verifier and streams node activations into your workspace preview. Real hash-chained /v/<id> proof URL produced before signup."
      steps={[
        'Sample tailored to your industry, or paste your own',
        'PHI/PII redact → source retrieval → draft → red-flag → disclaimer → audit',
        'Real /v/<id> proof URL · copy + share before you commit',
      ]}
      cta={{ href: '/chat', label: 'Open the live verifier in a new tab', icon: PlayCircle }}
    />
  );
}

// =============================================================
// Step 6 — Provision (stub for backend pass)
// =============================================================

function Step6Provision({ state }: { state: WizardState }) {
  if (!state.industry) return <PlaceholderBackToStep1 />;
  return (
    <BackendPending
      title="Sandbox provisioning · wiring up"
      message="Transactional creation of your sandbox: tenant + pack + seed sources + API key + draft channel + first audit row from Step 5, all in one shot."
      steps={[
        'Tenant created · pack installed · seed sources loaded (8 per vertical)',
        'Region pinned · retention set · audit channel drafted',
        'API key minted (shown once) · WordPress plugin snippet pre-filled',
        'First verification from Step 5 already in your audit log',
      ]}
      cta={{ href: '/book-a-demo', label: 'Skip ahead — book a working session', icon: Calendar }}
    />
  );
}

// =============================================================
// Step nav footer
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
        return (
          state.contentSources.length > 0 &&
          state.cmsPlatform !== null &&
          state.monthlyVolume !== null
        );
      case 4:
        return true;
      case 5:
        return true;
      case 6:
        return false;
      default:
        return false;
    }
  }, [state]);

  const handleNext = useCallback(() => dispatch({ type: 'next' }), [dispatch]);
  const handleBack = useCallback(() => dispatch({ type: 'back' }), [dispatch]);

  return (
    <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-6">
      <div className="flex items-center gap-2">
        <motion.button
          type="button"
          onClick={handleBack}
          disabled={state.step === 1}
          whileHover={state.step !== 1 ? { x: -2 } : undefined}
          whileTap={state.step !== 1 ? { scale: 0.97 } : undefined}
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-[12.5px] font-medium text-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-card"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </motion.button>
        <Link
          href="/"
          className="hidden text-[11.5px] text-muted-foreground hover:text-foreground sm:inline"
        >
          Skip and read the case
        </Link>
      </div>
      {state.step < 6 ? (
        <motion.button
          type="button"
          onClick={handleNext}
          disabled={!canAdvance}
          whileHover={canAdvance ? { x: 2 } : undefined}
          whileTap={canAdvance ? { scale: 0.97 } : undefined}
          className="inline-flex h-11 items-center gap-2 rounded-md px-5 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-40"
          style={{ backgroundColor: canAdvance ? accent : 'rgba(10,10,11,0.25)' }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex h-11 items-center gap-2 rounded-md bg-foreground/40 px-5 text-[13.5px] font-semibold text-white"
        >
          Create my sandbox · provisioning wiring up
          <Sparkles className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// =============================================================
// Workspace preview — the right rail, materializing live
// =============================================================

function WorkspacePreview({
  state,
  accent,
  accentSoft,
}: {
  state: WizardState;
  accent: string;
  accentSoft: string;
}) {
  const meta = state.industry ? INDUSTRY_META[state.industry] : null;
  const sources = state.industry ? SEED_SOURCES[state.industry] : [];

  return (
    <motion.div
      className="sticky top-24"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={EASE}
    >
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
        Your sandbox · live preview
      </div>

      <motion.div
        className="mt-4 overflow-hidden rounded-2xl border bg-card shadow-xl"
        animate={{
          boxShadow: meta
            ? `0 0 0 1px ${accent}25, 0 24px 48px -24px ${accent}50, 0 8px 24px -8px rgba(10,10,11,0.08)`
            : '0 1px 0 rgba(10,10,11,0.04), 0 8px 24px -8px rgba(10,10,11,0.08)',
          borderColor: meta ? `${accent}30` : 'hsl(var(--border))',
        }}
        transition={EASE}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/70" />
            <span className="size-2.5 rounded-full bg-amber-400/70" />
            <span className="size-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <div className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-0.5 font-mono text-[10.5px] text-muted-foreground">
            <ShieldCheck className="h-2.5 w-2.5" />
            sandbox.assuredai.online
          </div>
          <motion.span
            className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] font-medium"
            animate={{ color: meta ? accent : 'rgb(100 116 139)' }}
            transition={EASE}
          >
            <motion.span
              className="size-1.5 rounded-full"
              animate={{
                backgroundColor: meta?.accent ?? '#94a3b8',
                scale: meta ? [1, 1.3, 1] : 1,
              }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            />
            {meta ? `${meta.name} pack · live` : 'awaiting your pick'}
          </motion.span>
        </div>

        <div className="px-5 py-5">
          <PreviewSection label="Identity">
            <PreviewRow
              icon={Database}
              label="Tenant"
              value={meta ? <span className="font-mono">sandbox-{meta.name.toLowerCase()}</span> : '—'}
            />
            <PreviewRow
              icon={ShieldCheck}
              label="Pack"
              value={meta ? `${meta.name} · ${meta.compliance}` : 'pick an industry'}
              valueAccent={meta ? accent : undefined}
            />
            <AnimatePresence>
              {state.role && state.industry && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={EASE}
                  className="overflow-hidden"
                >
                  <PreviewRow
                    icon={KeyRound}
                    label="Role"
                    value={
                      ROLES_BY_INDUSTRY[state.industry].find((r) => r.id === state.role)?.label ??
                      state.role
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </PreviewSection>

          {/* Seed sources stagger in once industry is picked */}
          {meta && (
            <PreviewSection label={`Seed sources · ${sources.length}`} delay={0.2}>
              <div className="space-y-1.5">
                {sources.map((src, i) => (
                  <motion.div
                    key={src.url}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...EASE, delay: 0.3 + i * 0.07 }}
                    className="flex items-center justify-between rounded border border-border/40 bg-background/60 px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2 text-[11.5px]">
                      <motion.span
                        className="flex size-3.5 items-center justify-center rounded-full"
                        style={{ backgroundColor: accent }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.3 + i * 0.07 + 0.15,
                          type: 'spring',
                          stiffness: 360,
                          damping: 18,
                        }}
                      >
                        <Check className="h-2 w-2 text-white" strokeWidth={3.5} />
                      </motion.span>
                      <span className="font-medium text-foreground/85">{src.name}</span>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {src.type}
                    </span>
                  </motion.div>
                ))}
              </div>
            </PreviewSection>
          )}

          {/* Content sources — appear at Step 3 */}
          <AnimatePresence>
            {state.contentSources.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={EASE}
                className="overflow-hidden"
              >
                <PreviewSection label={`Content sources · ${state.contentSources.length}`}>
                  <div className="flex flex-wrap gap-1.5">
                    {state.contentSources.map((cs: ContentSource, i) => {
                      const opt = CONTENT_SOURCE_OPTIONS.find((o) => o.id === cs);
                      return (
                        <motion.span
                          key={cs}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ ...EASE, delay: i * 0.04 }}
                          className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[10.5px] font-medium"
                          style={{ borderColor: `${accent}40`, color: accent }}
                        >
                          {opt?.label ?? cs}
                        </motion.span>
                      );
                    })}
                  </div>
                  {state.cmsPlatform && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 rounded border border-border/40 bg-background/60 px-2 py-1.5">
                        <Globe2 className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{CMS_OPTIONS.find((c) => c.id === state.cmsPlatform)?.label}</span>
                      </div>
                      {state.monthlyVolume && (
                        <div className="flex items-center gap-1.5 rounded border border-border/40 bg-background/60 px-2 py-1.5">
                          <Database className="h-3 w-3 text-muted-foreground" />
                          <span className="tabular-nums">
                            {VOLUME_OPTIONS.find((v) => v.id === state.monthlyVolume)?.label}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </PreviewSection>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compliance — appear at Step 4 */}
          <AnimatePresence>
            {(state.compliance.baaNeeded ||
              state.compliance.soc2Needed ||
              state.compliance.fedrampNeeded) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={EASE}
                className="overflow-hidden"
              >
                <PreviewSection label="Compliance">
                  <div className="flex flex-wrap gap-1.5">
                    {state.compliance.baaNeeded && (
                      <Badge accent={accent} icon={ShieldCheck}>
                        BAA
                      </Badge>
                    )}
                    {state.compliance.soc2Needed && (
                      <Badge accent={accent} icon={FileText}>
                        SOC 2 Type II
                      </Badge>
                    )}
                    {state.compliance.fedrampNeeded && (
                      <Badge accent={accent} icon={Lock}>
                        FedRAMP
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 rounded border border-border/40 bg-background/60 px-2 py-1.5">
                      <Globe2 className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{state.compliance.region}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded border border-border/40 bg-background/60 px-2 py-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="tabular-nums">{state.compliance.retentionDays}d</span>
                    </div>
                  </div>
                </PreviewSection>
              </motion.div>
            )}
          </AnimatePresence>

          {state.step < 5 && (
            <PreviewSection label="Awaiting">
              <div className="space-y-1.5 text-[11px] text-muted-foreground/70">
                <div className="flex items-center gap-2">
                  <span className="size-1 rounded-full bg-muted-foreground/40" /> First verification &mdash; Step 5
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-1 rounded-full bg-muted-foreground/40" /> API key &mdash; Step 6
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-1 rounded-full bg-muted-foreground/40" /> Slack channel draft &mdash; Step 6
                </div>
              </div>
            </PreviewSection>
          )}
        </div>
      </motion.div>

      <div className="mt-4 rounded-xl border border-dashed border-border bg-background/40 px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground/65">Sandbox · not production.</span>{' '}
        Everything here is yours to explore. Real deployment (BAA, SSO, IT review) moves to a working
        session.
      </div>
    </motion.div>
  );
}

function PreviewSection({
  label,
  children,
  delay = 0,
}: {
  label: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...EASE, delay }}
      className="border-b border-border/40 py-3 first:pt-0 last:border-0 last:pb-0"
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      {children}
    </motion.div>
  );
}

function PreviewRow({
  icon: Icon,
  label,
  value,
  valueAccent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  valueAccent?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div
        className="text-right text-[12px] tabular-nums text-foreground/85"
        style={valueAccent ? { color: valueAccent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function Badge({
  children,
  accent,
  icon: Icon,
}: {
  children: React.ReactNode;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 18 }}
      className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11px] font-semibold"
      style={{ borderColor: `${accent}40`, color: accent }}
    >
      <Icon className="h-3 w-3" />
      {children}
    </motion.span>
  );
}

// =============================================================
// Helpers
// =============================================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
        {label}
      </div>
      {children}
    </label>
  );
}

function BackendPending({
  title,
  message,
  steps,
  cta,
}: {
  title: string;
  message: string;
  steps: string[];
  cta: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
}) {
  const Icon = cta.icon;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6">
        <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
          <Sparkles className="h-4 w-4" />
          {title}
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-foreground/80">{message}</p>
        <ul className="mt-4 space-y-2 text-[12.5px] text-muted-foreground">
          {steps.map((s, i) => (
            <li key={i} className="flex items-baseline gap-2">
              <span className="text-foreground/30">·</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link
        href={cta.href}
        target={cta.href.startsWith('http') ? '_blank' : undefined}
        className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-[13px] font-semibold text-foreground hover:bg-accent"
      >
        <Icon className="h-4 w-4" />
        {cta.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
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
