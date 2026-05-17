'use client';

/**
 * HomeVerifierDemo — the inline live verifier on the marketing home page.
 *
 * Three states in one card:
 *
 *   COMPOSE   Textarea + 4 sample chips (one per vertical) + auto-detected
 *             industry pill + Verify button. User pastes their own content
 *             OR clicks a sample to populate the textarea, then runs.
 *
 *   STREAM    Real Server-Sent Events from /api/wizard/sample arriving as
 *             log lines as each lifecycle phase completes. "Checking
 *             against HIPAA Privacy Rule…" / "Found 3 PHI spans (MRN,
 *             EMAIL, PHONE)" / "Matched 2 sources: AHA Cardiac Emergency
 *             Guide · CDC heart-attack signs" / "Audit #72 · sha256:5f8a…
 *             ← prev:8d4c…". The source/recognizer/rule names come from
 *             the actual pack JSON — we are not faking the cadence.
 *
 *   RESULT    Compact inline mirror of the /v/<id> view: verdict band
 *             with severity tone, citations panel with title + org +
 *             link, PII redaction summary, fired red-flag rules with
 *             matched category, disclaimer outcome, audit-chain hash
 *             reference, proof URL with copy/open/retry CTAs.
 *
 * No competitor in the regulated-content space lets a visitor see the
 * actual pipeline output on the home page. That's the differentiator —
 * we surface the work, including which regulations and sources the
 * content is being checked against, by name, as it happens.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle,
  Check,
  ExternalLink,
  Copy,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Sparkles,
  ArrowRight,
  Stethoscope,
  Banknote,
  Landmark,
  Scale,
  CircleDot,
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import {
  HOME_VERIFIER_SAMPLES,
  type HomeVerifierSample,
} from '@/lib/marketing/home-verifier-samples';
import type { IndustrySlug } from '@/lib/marketing/classify-industry';

const ICON_BY_NAME: Record<HomeVerifierSample['icon'], LucideIcon> = {
  stethoscope: Stethoscope,
  banknote: Banknote,
  landmark: Landmark,
  scale: Scale,
};

const INDUSTRY_LABEL: Record<IndustrySlug, string> = {
  healthcare: 'Healthcare',
  finance: 'Financial services',
  government: 'Government',
  legal: 'Legal',
};

const VERDICT_TONE: Record<
  string,
  {
    tone: 'pass' | 'warn' | 'block';
    headline: string;
    label: string;
    color: string;
  }
> = {
  verified: { tone: 'pass', headline: 'Cleared to publish', label: 'verified', color: '#0d9488' },
  red_flag_blocked: {
    tone: 'block',
    headline: 'Blocked before publish',
    label: 'red flag',
    color: '#dc2626',
  },
  kill_switch: {
    tone: 'block',
    headline: 'Kill switch engaged',
    label: 'blocked',
    color: '#dc2626',
  },
  error: {
    tone: 'warn',
    headline: 'Verification could not complete',
    label: 'error',
    color: '#f59e0b',
  },
};

interface RegulatoryRef {
  name: string;
  url: string;
}
interface PackContext {
  pack_slug: string;
  pack_name: string;
  compliance_framework: string | null;
  regulatory_references: RegulatoryRef[];
  recognizers: string[];
  red_flag_rule_count: number;
}

interface LogLine {
  id: string;
  tone: 'check' | 'pass' | 'warn' | 'block' | 'info';
  text: string;
  /** Optional named entity reference for hover-tooltip (e.g. URL to source) */
  href?: string;
}

interface VerifyResult {
  ok: boolean;
  kind: string;
  audit_log_id: number | null;
  proof_url: string | null;
  verdict: string;
  ready_to_publish?: boolean;
  elapsed_ms: number;
  citations?: Array<{ title: string; url: string; organization: string | null }>;
  paragraphs?: { total: number; supported: number; unsourced: number };
  /** Working article AFTER input/output redaction + disclaimer injection. */
  verified_article?: string;
  /** Per-paragraph: text + supported flag + matched citations. */
  verified_paragraphs?: Array<{
    text: string;
    supported: boolean;
    citations: Array<{ title: string; url: string; organization: string | null }>;
    best_match_similarity: number;
    best_match_url?: string | null;
  }>;
  pii?: { input_count: number; output_count: number };
  disclaimer?: { required: boolean; was_present: boolean; injected: boolean };
  red_flag?: { triggered: boolean; category?: string; message?: string };
  blocking_issues?: string[];
  warnings?: string[];
  message?: string;
}

type Phase = 'compose' | 'running' | 'result' | 'error';

export function HomeVerifierDemo() {
  // Phase is DERIVED from the underlying state (isStreaming / result / error)
  // — never set imperatively. An earlier version had a separate `phase` state
  // that got reset back to 'compose' under some race condition, leaving the
  // chrome pip showing "verified" while the body showed the compose pane.
  // Deriving phase from the truth-bearing state removes that bug class.
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<HomeVerifierSample | null>(null);
  const [industry, setIndustry] = useState<IndustrySlug>('healthcare');
  const [industryDetected, setIndustryDetected] = useState<{
    primary: IndustrySlug | null;
    confidence: 'high' | 'medium' | 'low';
    alternate?: IndustrySlug | null;
    scores?: Array<{ industry: IndustrySlug; percent: number }>;
  } | null>(null);

  const [log, setLog] = useState<LogLine[]>([]);
  const [packContext, setPackContext] = useState<PackContext | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);

  const phase: Phase = errorMessage
    ? 'error'
    : result
      ? 'result'
      : isStreaming
        ? 'running'
        : 'compose';

  const logEndRef = useRef<HTMLDivElement | null>(null);
  const classifyAbort = useRef<AbortController | null>(null);

  // -----------------------------------------------------------
  // Industry auto-detect — debounced 450ms after the last keystroke.
  // -----------------------------------------------------------
  useEffect(() => {
    if (text.trim().length < 40) {
      setIndustryDetected(null);
      return;
    }
    const handle = setTimeout(() => {
      classifyAbort.current?.abort();
      const ctrl = new AbortController();
      classifyAbort.current = ctrl;
      void fetch('/api/wizard/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (j: {
            primary: IndustrySlug | null;
            alternate?: IndustrySlug | null;
            confidence: 'high' | 'medium' | 'low';
            scores?: Array<{ industry: IndustrySlug; percent: number }>;
          } | null) => {
            if (!j) return;
            setIndustryDetected({
              primary: j.primary,
              confidence: j.confidence,
              alternate: j.alternate ?? null,
              scores: j.scores,
            });
            if (j.primary && j.confidence !== 'low') {
              setIndustry(j.primary);
            }
          },
        )
        .catch(() => {
          /* aborted or network — silently ignore */
        });
    }, 450);
    return () => clearTimeout(handle);
  }, [text]);

  // Pick a sample → populate textarea, sync industry.
  const handlePickSample = useCallback((s: HomeVerifierSample) => {
    setPicked(s);
    setText(s.article);
    setIndustry(s.pack);
    setIndustryDetected({ primary: s.pack, confidence: 'high' });
  }, []);

  // -----------------------------------------------------------
  // Stream verification via SSE.
  // -----------------------------------------------------------
  const handleVerify = useCallback(async () => {
    if (text.trim().length < 80) {
      setErrorMessage('Paste at least a few sentences (80 characters minimum).');
      return;
    }
    setIsStreaming(true);
    setLog([]);
    setResult(null);
    setErrorMessage(null);
    setPackContext(null);

    try {
      const res = await fetch('/api/wizard/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, article: text, mode: 'stream' }),
      });

      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // SSE parser: events separated by blank line, each event has
      // `event: <name>\n` and `data: <json>\n` lines.
      const consumeEvent = (raw: string) => {
        const lines = raw.split('\n');
        let event = 'message';
        let dataStr = '';
        for (const line of lines) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
        }
        if (!dataStr) return;
        let data: unknown;
        try {
          data = JSON.parse(dataStr);
        } catch {
          return;
        }
        handleSseEvent(event, data);
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          consumeEvent(raw);
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsStreaming(false);
    }
  }, [industry, text]);

  // -----------------------------------------------------------
  // Translate SSE events into log lines + final result.
  // -----------------------------------------------------------
  const handleSseEvent = useCallback((event: string, data: unknown) => {
    if (event === 'pack_context') {
      const d = data as PackContext;
      setPackContext(d);
      // Open the log with a "we're about to check against" header so the
      // user sees the regulatory frame before lifecycle work starts.
      const refs = d.regulatory_references.slice(0, 3);
      if (refs.length > 0) {
        appendLog({
          id: 'frame',
          tone: 'info',
          text: `Pack: ${d.pack_name} · ${d.compliance_framework ?? 'no framework declared'}`,
        });
        for (const r of refs) {
          appendLog({
            id: `ref-${r.name}`,
            tone: 'check',
            text: `Checking against ${r.name}`,
            href: r.url,
          });
        }
      }
      return;
    }

    if (event === 'progress') {
      const e = data as { phase: string } & Record<string, unknown>;
      const line = progressToLog(e);
      if (line) appendLog(line);
      return;
    }

    if (event === 'result') {
      const r = data as VerifyResult;
      const tone = VERDICT_TONE[r.verdict] ?? VERDICT_TONE.verified!;
      appendLog({
        id: 'done',
        tone: tone.tone === 'pass' ? 'pass' : tone.tone === 'block' ? 'block' : 'warn',
        text: `${tone.headline} · ${(r.elapsed_ms / 1000).toFixed(1)}s · audit #${r.audit_log_id ?? '—'}`,
      });
      // Setting result alone is enough — phase derives from (errorMessage,
      // result, isStreaming). When result becomes truthy, phase flips to
      // 'result' on the next render. We also setIsStreaming(false) here
      // rather than waiting for the SSE end event so the transition fires
      // immediately when verification completes.
      setResult(r);
      setIsStreaming(false);
      return;
    }

    if (event === 'error') {
      const e = data as { message?: string; error?: string };
      setErrorMessage(e.message ?? e.error ?? 'Verification failed');
      setIsStreaming(false);
      return;
    }
  }, []);

  const appendLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev, line]);
    setTimeout(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 30);
  }, []);

  const handleReset = useCallback(() => {
    setLog([]);
    setResult(null);
    setErrorMessage(null);
    setPackContext(null);
    setIsStreaming(false);
  }, []);

  const handleCopy = useCallback(() => {
    if (!result?.proof_url) return;
    void navigator.clipboard.writeText(result.proof_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [result?.proof_url]);

  const accent = picked?.accent ?? '#0d9488';
  const verdictTone = result ? VERDICT_TONE[result.verdict] ?? VERDICT_TONE.verified! : null;

  return (
    <div className="relative">
      {/* Halo glow */}
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-primary/18 to-emerald-500/8 blur-2xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/15 ring-1 ring-foreground/5">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-amber-400/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-0.5 text-[10.5px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
            assuredai.online/v/
            <span className="font-mono">{result?.audit_log_id ?? '<id>'}</span>
          </div>
          <div className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <span
              className={`size-1.5 rounded-full ${
                phase === 'running'
                  ? 'bg-amber-500 animate-pulse'
                  : phase === 'result'
                    ? verdictTone?.tone === 'block'
                      ? 'bg-red-500'
                      : 'bg-emerald-500'
                    : 'bg-emerald-500 animate-pulse-soft'
              }`}
            />
            <span>
              {phase === 'running'
                ? 'Streaming verification…'
                : phase === 'result'
                  ? verdictTone?.label ?? 'Verified'
                  : 'Live'}
            </span>
          </div>
        </div>

        {/* Phase swap WITHOUT AnimatePresence.
            Earlier iterations used framer's AnimatePresence with mode="wait"
            but the exit animation got stuck mid-transition — the compose
            pane stayed visible at ~30% opacity for the entire run instead
            of unmounting. Replaced with hard conditional rendering plus a
            CSS-only fade-in animation on the entering pane. Trade-off:
            no exit animation, but reliable phase swaps. min-h locks the
            container height so swaps don't cause layout jump.

            The `key` on the wrapper div forces React to remount on phase
            change, which retriggers the CSS `animate-in fade-in` class. */}
        <div className="relative min-h-[488px]">
          <div key={phase} className="animate-in fade-in duration-200">
            {phase === 'compose' && (
              <ComposePane
                text={text}
                setText={setText}
                industry={industry}
                setIndustry={setIndustry}
                industryDetected={industryDetected}
                samples={HOME_VERIFIER_SAMPLES}
                onPickSample={handlePickSample}
                onVerify={handleVerify}
                accent={accent}
                picked={picked}
              />
            )}
            {phase === 'running' && (
              <RunningPane
                log={log}
                packContext={packContext}
                logEndRef={logEndRef}
                accent={accent}
              />
            )}
            {phase === 'result' && result && verdictTone && (
              <ResultPane
                result={result}
                tone={verdictTone}
                packContext={packContext}
                onReset={handleReset}
                onCopy={handleCopy}
                copied={copied}
              />
            )}
            {phase === 'error' && (
              <div className="px-5 py-6">
                <div className="rounded-md border border-red-500/40 bg-red-500/[0.06] p-3 text-[12.5px] text-red-700">
                  Verification didn&rsquo;t complete: {errorMessage ?? 'Unknown error'}
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[12.5px] font-medium hover:bg-accent"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer link to full wizard */}
        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/15 px-4 py-2.5 text-[11px]">
          <div className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Same pipeline · real audit chain
          </div>
          <Link
            href="/get-started"
            className="inline-flex items-center gap-1 font-semibold text-foreground/80 hover:text-foreground"
          >
            Configure your own sandbox
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// COMPOSE pane
// =============================================================

function ComposePane({
  text,
  setText,
  industry,
  setIndustry,
  industryDetected,
  samples,
  onPickSample,
  onVerify,
  accent,
  picked,
}: {
  text: string;
  setText: (s: string) => void;
  industry: IndustrySlug;
  setIndustry: (i: IndustrySlug) => void;
  industryDetected: { primary: IndustrySlug | null; confidence: 'high' | 'medium' | 'low' } | null;
  samples: HomeVerifierSample[];
  onPickSample: (s: HomeVerifierSample) => void;
  onVerify: () => void;
  accent: string;
  picked: HomeVerifierSample | null;
}) {
  const tooShort = text.trim().length > 0 && text.trim().length < 80;
  return (
    <div className="px-5 pt-5 pb-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
          Paste or pick a sample · verify in 6 seconds
        </div>
        <IndustryPill
          industry={industry}
          setIndustry={setIndustry}
          detected={industryDetected}
        />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste an article, patient handout, fund factsheet, citizen guidance, case summary — anything you'd publish externally. Or pick a sample below to start fast."
        className="block h-[120px] w-full resize-y rounded-md border border-border bg-background px-3 py-2.5 text-[12.5px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-[160px]"
        spellCheck={false}
      />
      <div className="mt-1 flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span
          className={
            tooShort
              ? 'text-amber-600'
              : text.length > 7600
                ? 'text-amber-600'
                : 'text-muted-foreground'
          }
        >
          {text.length.toLocaleString()} / 8,000 chars
          {tooShort ? ' · need at least 80' : ''}
        </span>
        <span className="text-muted-foreground/70">
          {picked ? `Sample loaded: ${picked.label}` : 'Or paste your own'}
        </span>
      </div>

      {/* Sample chips — one per vertical. */}
      <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {samples.map((s) => {
          const Icon = ICON_BY_NAME[s.icon];
          const selected = picked?.id === s.id;
          return (
            <button
              type="button"
              key={s.id}
              onClick={() => onPickSample(s)}
              className="group flex items-start gap-2.5 rounded-md border bg-card px-2.5 py-2 text-left transition-all hover:bg-accent/30"
              style={{
                borderColor: selected ? s.accent : 'hsl(var(--border))',
                backgroundColor: selected ? `${s.accent}10` : undefined,
              }}
            >
              <span
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded text-foreground/70 ring-1 ring-foreground/10 transition-colors"
                style={{
                  backgroundColor: selected ? `${s.accent}20` : 'hsl(var(--foreground) / 0.04)',
                  color: selected ? s.accent : undefined,
                }}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold tracking-tight">
                  {s.label}
                </span>
                <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                  {s.sub}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onVerify}
        disabled={text.trim().length < 80}
        className="group mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-[13.5px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        <PlayCircle className="h-4 w-4" />
        Verify content · live pipeline
      </button>
      <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
        Real pipeline · real audit row · real public /v/&lt;id&gt; URL · no signup
      </p>
    </div>
  );
}

function IndustryPill({
  industry,
  setIndustry,
  detected,
}: {
  industry: IndustrySlug;
  setIndustry: (i: IndustrySlug) => void;
  detected: {
    primary: IndustrySlug | null;
    confidence: 'high' | 'medium' | 'low';
    alternate?: IndustrySlug | null;
    scores?: Array<{ industry: IndustrySlug; percent: number }>;
  } | null;
}) {
  const Icon =
    industry === 'healthcare'
      ? Stethoscope
      : industry === 'finance'
        ? Banknote
        : industry === 'government'
          ? Landmark
          : Scale;

  // Low-confidence cross-vertical content (e.g. "financial planning for
  // diabetics") gets a disambiguation chip-group so the user picks the
  // right pack in one tap, with the actual percentage scores from the
  // classifier visible. Same data is available from /api/wizard/classify.
  if (detected?.primary && detected.confidence === 'low' && detected.alternate && detected.scores) {
    const top2 = detected.scores.filter((s) => s.percent > 0).slice(0, 2);
    return (
      <div className="inline-flex items-center gap-1">
        <span className="hidden text-[9.5px] uppercase tracking-[0.14em] text-amber-600 sm:inline">
          ambiguous · pick
        </span>
        {top2.map((s) => (
          <button
            key={s.industry}
            type="button"
            onClick={() => setIndustry(s.industry)}
            className="inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10.5px] font-medium"
            style={{
              borderColor: s.industry === industry ? '#0d9488' : 'hsl(var(--border))',
              backgroundColor: s.industry === industry ? 'rgba(13,148,136,0.08)' : 'transparent',
            }}
          >
            {INDUSTRY_LABEL[s.industry]} · {s.percent}%
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {detected?.primary && detected.confidence !== 'low' && detected.primary === industry && (
        <span className="text-[9.5px] uppercase tracking-[0.14em] text-emerald-600">
          auto-detected
        </span>
      )}
      <label className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[10.5px] font-medium text-foreground/85">
        <Icon className="h-3 w-3" strokeWidth={1.75} />
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value as IndustrySlug)}
          className="border-none bg-transparent text-[10.5px] font-medium focus:outline-none"
          aria-label="Pack"
        >
          <option value="healthcare">Healthcare</option>
          <option value="finance">Financial services</option>
          <option value="government">Government</option>
          <option value="legal">Legal</option>
        </select>
      </label>
    </div>
  );
}

// =============================================================
// RUNNING pane — streamed log lines as the lifecycle ticks.
// =============================================================

function RunningPane({
  log,
  packContext,
  logEndRef,
  accent,
}: {
  log: LogLine[];
  packContext: PackContext | null;
  logEndRef: React.RefObject<HTMLDivElement | null>;
  accent: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-[488px] flex-col px-5 pt-4 pb-4"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <div className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
          <motion.span
            className="inline-block size-1.5 rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{ backgroundColor: accent }}
          />
          Live verification · streaming
        </div>
        {packContext && (
          <div className="text-[10px] text-muted-foreground">
            {packContext.compliance_framework}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-md border border-border bg-[#0a0f1c] px-3 py-2 font-mono text-[11px] leading-[1.55] text-emerald-300/85">
        {log.length === 0 && (
          <span className="text-emerald-300/55">Connecting to pipeline…</span>
        )}
        <ul className="space-y-1">
          <AnimatePresence initial={false}>
            {log.map((line) => (
              <motion.li
                key={line.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22 }}
                className="flex items-start gap-2"
              >
                <LineGlyph tone={line.tone} />
                {line.href ? (
                  <a
                    href={line.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-words text-emerald-200/90 hover:text-emerald-200 hover:underline"
                  >
                    {line.text}
                  </a>
                ) : (
                  <span
                    className={`break-words ${
                      line.tone === 'block'
                        ? 'text-red-300'
                        : line.tone === 'warn'
                          ? 'text-amber-200'
                          : line.tone === 'pass'
                            ? 'text-emerald-200'
                            : 'text-emerald-100/85'
                    }`}
                  >
                    {line.text}
                  </span>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

function LineGlyph({ tone }: { tone: LogLine['tone'] }) {
  if (tone === 'check')
    return <CircleDot className="mt-[2px] h-3 w-3 shrink-0 text-emerald-300/65" strokeWidth={2} />;
  if (tone === 'pass')
    return <CheckCircle2 className="mt-[2px] h-3 w-3 shrink-0 text-emerald-300" strokeWidth={2} />;
  if (tone === 'warn')
    return <AlertTriangle className="mt-[2px] h-3 w-3 shrink-0 text-amber-300" strokeWidth={2} />;
  if (tone === 'block')
    return <ShieldAlert className="mt-[2px] h-3 w-3 shrink-0 text-red-300" strokeWidth={2} />;
  return <Sparkles className="mt-[2px] h-3 w-3 shrink-0 text-emerald-300/55" strokeWidth={2} />;
}

// =============================================================
// RESULT pane — compact mirror of /v/<id>.
// =============================================================

function ResultPane({
  result,
  tone,
  packContext,
  onReset,
  onCopy,
  copied,
}: {
  result: VerifyResult;
  tone: (typeof VERDICT_TONE)[string];
  packContext: PackContext | null;
  onReset: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="max-h-[520px] overflow-y-auto px-5 pt-4 pb-4">
      {/* Verdict band */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className="text-[10.5px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: tone.color }}
          >
            Verification complete · {(result.elapsed_ms / 1000).toFixed(1)}s · audit #
            {result.audit_log_id ?? '—'}
          </div>
          <div
            className="mt-1 text-[18px] font-semibold leading-tight tracking-[-0.018em]"
            style={{ color: tone.color }}
          >
            {tone.tone === 'block' ? '⛔ ' : tone.tone === 'warn' ? '⚠ ' : '✓ '}
            <span className="font-serif italic font-normal">{tone.headline}</span>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ring-1"
          style={{
            backgroundColor: `${tone.color}15`,
            color: tone.color,
            borderColor: `${tone.color}40`,
          }}
        >
          <ShieldCheck className="h-2.5 w-2.5" />
          {tone.label}
        </span>
      </div>

      {/* Red flag (if fired) */}
      {result.red_flag?.triggered && (
        <Panel title="Red-flag rule fired" tone="block">
          <div className="text-[12px] font-semibold text-red-700">
            {result.red_flag.category}
          </div>
          {result.red_flag.message && (
            <div className="mt-1 text-[11.5px] leading-relaxed text-red-700/85">
              {result.red_flag.message}
            </div>
          )}
        </Panel>
      )}

      {/* VERIFIED CONTENT — paragraph by paragraph, with redaction tokens
          rendered as styled chips and per-paragraph citation badges. This
          is the world-class differentiator: visitors see the actual work
          done on their content, not a summary of counts. */}
      {result.verified_paragraphs && result.verified_paragraphs.length > 0 && (
        <Panel title="Your verified content" tone="pass">
          <div className="space-y-2.5">
            {result.verified_paragraphs.map((p, idx) => (
              <div
                key={idx}
                className="rounded-md border border-border/60 bg-background/60 px-2.5 py-2"
              >
                <div className="text-[11.5px] leading-relaxed text-foreground/85">
                  {renderParagraphWithRedactionChips(p.text)}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {p.supported ? (
                    p.citations.map((c) => (
                      <a
                        key={c.url}
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-500/[0.12]"
                        title={c.organization ?? undefined}
                      >
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {c.title}
                      </a>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Unsourced — review recommended
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Citations */}
      {result.citations && result.citations.length > 0 && (
        <Panel
          title={`Sources cited · ${result.citations.length}`}
          tone="pass"
        >
          <ul className="space-y-1.5">
            {result.citations.slice(0, 5).map((c) => (
              <li key={c.url} className="flex items-start gap-2 text-[11.5px]">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    {c.title}
                  </a>
                  {c.organization && (
                    <span className="ml-1 text-muted-foreground">· {c.organization}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Paragraph support summary */}
      {result.paragraphs && result.paragraphs.total > 0 && (
        <Panel
          title={`Paragraph support · ${result.paragraphs.supported}/${result.paragraphs.total} sourced`}
          tone={result.paragraphs.unsourced > 0 ? 'warn' : 'pass'}
        >
          <div className="text-[11.5px] text-muted-foreground">
            {result.paragraphs.unsourced > 0
              ? `${result.paragraphs.unsourced} paragraph${result.paragraphs.unsourced === 1 ? '' : 's'} not matched to a seeded source — flagged for editor review.`
              : `Every paragraph was matched to at least one seeded source.`}
          </div>
        </Panel>
      )}

      {/* PII redactions */}
      {result.pii && (result.pii.input_count > 0 || result.pii.output_count > 0) && (
        <Panel
          title={`PII / PHI redacted · ${result.pii.input_count} input · ${result.pii.output_count} output`}
          tone="warn"
        >
          <div className="text-[11.5px] text-muted-foreground">
            {result.pii.input_count > 0
              ? `${result.pii.input_count} sensitive entit${result.pii.input_count === 1 ? 'y' : 'ies'} found in input and redacted before fact-checking. `
              : ''}
            {result.pii.output_count > 0
              ? `${result.pii.output_count} additional entit${result.pii.output_count === 1 ? 'y' : 'ies'} caught in second-pass output redaction.`
              : ''}
          </div>
        </Panel>
      )}

      {/* Disclaimer */}
      {result.disclaimer?.required && (
        <Panel
          title={
            result.disclaimer.injected
              ? 'Disclaimer auto-injected'
              : result.disclaimer.was_present
                ? 'Disclaimer present'
                : 'Disclaimer missing'
          }
          tone={
            result.disclaimer.injected ? 'warn' : result.disclaimer.was_present ? 'pass' : 'warn'
          }
        >
          <div className="text-[11.5px] text-muted-foreground">
            {packContext?.pack_name ?? 'This pack'} requires a disclaimer for publishable content.
            {result.disclaimer.injected
              ? ' The canonical disclaimer was added to the working draft.'
              : result.disclaimer.was_present
                ? ' Detected in the original input.'
                : ' One was not detected.'}
          </div>
        </Panel>
      )}

      {/* Warnings (if any) */}
      {result.warnings && result.warnings.length > 0 && (
        <Panel title="Editorial warnings" tone="warn">
          <ul className="space-y-1 text-[11.5px] text-muted-foreground">
            {result.warnings.map((w) => (
              <li key={w}>· {w}</li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Proof URL + CTAs */}
      {result.proof_url && (
        <div className="mt-3 rounded-md border border-border bg-muted/20 px-2.5 py-2 font-mono text-[10.5px] text-foreground/85 break-all">
          {result.proof_url}
        </div>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-[11.5px] font-medium hover:bg-accent"
          disabled={!result.proof_url}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy /v/ URL'}
        </button>
        {result.proof_url && (
          <Link
            href={result.proof_url}
            target="_blank"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-[11.5px] font-semibold text-white"
            style={{ backgroundColor: tone.color }}
          >
            Open full proof page
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className="h-3 w-3" />
        Verify another piece
      </button>
    </div>
  );
}

function Panel({
  title,
  tone,
  children,
}: {
  title: string;
  tone: 'pass' | 'warn' | 'block';
  children: React.ReactNode;
}) {
  const accent = tone === 'pass' ? '#0d9488' : tone === 'warn' ? '#b45309' : '#dc2626';
  return (
    <div className="mt-3 rounded-md border border-border bg-card/60 p-2.5">
      <div
        className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: accent }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * Render a paragraph whose Presidio output may contain `<TOKEN>` placeholders
 * (e.g. <PERSON>, <EMAIL_ADDRESS>, <PHONE_NUMBER>, <MEDICAL_RECORD_NUMBER>) as
 * styled redaction chips inline with the normal text. This makes the
 * verification VISIBLE — the user can see exactly which spans the system
 * caught and replaced, not just a count.
 *
 * The regex matches all-caps tokens inside angle brackets — that's the
 * Presidio default format. Unrelated angle-bracketed content (rare in
 * regulated copy) will be treated as a chip too, which is an acceptable
 * false-positive for the demo surface.
 */
function renderParagraphWithRedactionChips(text: string): React.ReactNode {
  const pattern = /<([A-Z][A-Z_0-9]*)>/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let chipIdx = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const token = match[1] ?? 'REDACTED';
    parts.push(
      <span
        key={`chip-${chipIdx++}`}
        className="inline-flex items-center rounded bg-amber-500/[0.18] px-1 py-px font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-amber-700"
        title={`Redacted: ${token}`}
      >
        {token}
      </span>,
    );
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length > 0 ? parts : text;
}

// =============================================================
// SSE progress event → log line
// =============================================================

function progressToLog(
  e: { phase: string } & Record<string, unknown>,
): LogLine | null {
  const id = `${e.phase}-${Math.random().toString(36).slice(2, 6)}`;
  switch (e.phase) {
    case 'start':
      return {
        id,
        tone: 'info',
        text: `Tokenizing input · ${e.input_chars ?? 0} chars · ${INDUSTRY_LABEL[(e.pack_slug as IndustrySlug) ?? 'healthcare']} pack`,
      };
    case 'kill_switch':
      return e.engaged
        ? { id, tone: 'block', text: 'Kill switch engaged — verification halted' }
        : null; // skip the noisy "kill switch not engaged" line
    case 'redact_input_begin':
      return {
        id,
        tone: 'check',
        text: `Running PII recognizers · ${(e.recognizers as string[]).slice(0, 5).join(' · ')}${(e.recognizers as string[]).length > 5 ? ' · …' : ''}`,
      };
    case 'redact_input_complete': {
      const n = Number(e.entities_found ?? 0);
      const types = (e.entity_types as string[]) ?? [];
      if (n === 0) {
        return { id, tone: 'pass', text: 'No PII / PHI detected in input' };
      }
      return {
        id,
        tone: 'warn',
        text: `Found ${n} PII / PHI ${n === 1 ? 'span' : 'spans'}${
          types.length ? ` (${types.join(', ')})` : ''
        } — redacted before fact-check`,
      };
    }
    case 'red_flag_begin':
      return {
        id,
        tone: 'check',
        text: `Evaluating ${(e.rule_categories as string[]).length} red-flag rule${(e.rule_categories as string[]).length === 1 ? '' : 's'} · ${(e.rule_categories as string[]).slice(0, 4).join(' · ')}`,
      };
    case 'red_flag_complete': {
      if (e.triggered) {
        const cat = String(e.category ?? 'unknown');
        const phrase = e.triggering_phrase
          ? ` — matched on "${String(e.triggering_phrase).slice(0, 60)}"`
          : '';
        return { id, tone: 'block', text: `Red-flag rule fired: ${cat}${phrase}` };
      }
      return { id, tone: 'pass', text: 'No red-flag rules fired' };
    }
    case 'fact_check_begin':
      return {
        id,
        tone: 'check',
        text: `Fact-checking ${e.paragraphs ?? 0} paragraph${(e.paragraphs ?? 0) === 1 ? '' : 's'} against seeded sources`,
      };
    case 'fact_check_complete': {
      const titles = (e.cited_titles as string[]) ?? [];
      const supported = Number(e.supported ?? 0);
      const unsourced = Number(e.unsourced ?? 0);
      if (titles.length > 0) {
        return {
          id,
          tone: 'pass',
          text: `Matched ${supported} paragraph${supported === 1 ? '' : 's'} to ${e.unique_sources ?? 0} source${(e.unique_sources ?? 0) === 1 ? '' : 's'}: ${titles.slice(0, 3).join(' · ')}${titles.length > 3 ? ' · …' : ''}`,
        };
      }
      if (unsourced > 0) {
        return {
          id,
          tone: 'warn',
          text: `${unsourced} paragraph${unsourced === 1 ? '' : 's'} could not be matched to a seeded source`,
        };
      }
      return { id, tone: 'pass', text: 'Fact-check complete' };
    }
    case 'disclaimer_complete':
      if (e.injected) {
        return { id, tone: 'warn', text: 'Required disclaimer was missing — auto-injected' };
      }
      if (e.present) {
        return { id, tone: 'pass', text: 'Disclaimer present in input' };
      }
      return null; // not required, no need for a line
    case 'redact_output_complete': {
      const n = Number(e.entities_found ?? 0);
      if (n === 0) return null; // skip — same as input redaction
      return {
        id,
        tone: 'warn',
        text: `Second-pass redaction caught ${n} additional PII / PHI span${n === 1 ? '' : 's'} in working draft`,
      };
    }
    case 'audit_write_begin':
      return { id, tone: 'check', text: 'Writing hash-chained audit row…' };
    case 'audit_write_complete': {
      const h = String(e.hash ?? '').slice(0, 12);
      const ph = e.prev_hash ? String(e.prev_hash).slice(0, 12) : 'genesis';
      return {
        id,
        tone: 'pass',
        text: `Audit #${e.audit_log_id} · sha256:${h}… ← prev:${ph}${ph === 'genesis' ? '' : '…'}`,
      };
    }
    default:
      return null;
  }
}
