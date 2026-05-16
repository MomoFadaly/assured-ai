'use client';

/**
 * HomeVerifierDemo — the Linear move.
 *
 * Replaces the static verifier mock in the home-page hero with a
 * real, working mini-verifier. Visitor clicks a sample chip, the
 * compact pipeline visualization runs, and they get a real
 * /v/<id> proof URL — all before signing up, all before clicking
 * "Get started", all on the home page above the fold.
 *
 * This is what Linear does with ENG-2703 + the Cursor AI agent on
 * their homepage: the actual product running, not a screenshot.
 * The difference for AssuredAI: the artifact at the end is a
 * tamper-evident public proof URL — something no competitor in the
 * regulated-content space can match.
 *
 * Uses the same /api/wizard/sample endpoint as Step 5 of the
 * wizard. Rate-limited (5/min, 50/day per IP) so demo traffic
 * doesn't drain the LLM budget.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle,
  Check,
  Loader2,
  ExternalLink,
  Copy,
  RefreshCw,
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface VerifyResult {
  audit_log_id: number | null;
  proof_url: string | null;
  verdict: string;
  citations: number;
  phi_redacted: number;
  elapsed_ms: number;
}

/**
 * Verdict copy + visual treatment.
 *
 * The lifecycle returns `result.kind` as one of:
 *   'answered' | 'cannot_answer' | 'blocked' | 'escalated' | 'verified'
 *
 * We map each to a tone (`pass` | `warn` | `block`) so the result card
 * surfaces the catch with the right severity. A "blocked" or "escalated"
 * verdict is the value-prop moment — that's the system stopping a real
 * problem before publish. Treat it visually like a success, not a failure.
 */
const VERDICT_TONE: Record<string, { tone: 'pass' | 'warn' | 'block'; label: string; headline: string }> = {
  verified: { tone: 'pass', label: 'verified', headline: 'Cleared to publish' },
  answered: { tone: 'pass', label: 'verified', headline: 'Cleared to publish' },
  cannot_answer: { tone: 'warn', label: 'cannot answer', headline: 'Held — source insufficient' },
  blocked: { tone: 'block', label: 'blocked', headline: 'Blocked before publish' },
  escalated: { tone: 'block', label: 'escalated', headline: 'Escalated to human review' },
};

const SAMPLES = [
  {
    id: 'cardiac',
    label: 'Cardiac advice (dangerous)',
    sub: 'Red-flag content · should be blocked or escalated',
    industry: 'healthcare' as const,
    article: `If you are experiencing crushing chest pain that radiates down your left arm along with sudden shortness of breath, the best course is to lie down quietly and take slow deep breaths for several minutes. Aspirin can help with mild chest discomfort. Most chest pain in healthy adults resolves on its own within twenty minutes without any medical attention. There is generally no need to call 911 unless symptoms persist for more than an hour.`,
    accent: '#dc2626',
  },
  {
    id: 'phi',
    label: 'Patient handout (PHI inside)',
    sub: 'Contains MRN, email, phone · should be redacted',
    industry: 'healthcare' as const,
    article: `Patient Maria Hernandez (MRN 8842-91) was recently diagnosed with Type 2 diabetes and is starting a lifestyle-based treatment plan. Her care team recommends a heart-healthy eating pattern. Adults benefit from 150 minutes of moderate-intensity activity per week. For follow-up questions, please contact her at maria.hernandez@example.com or (415) 555-2210. Her next appointment is scheduled for the cardiology clinic on the third floor.`,
    accent: '#f59e0b',
  },
  {
    id: 'dash',
    label: 'DASH eating plan',
    sub: 'Clean draft · should be cleared with sources',
    industry: 'healthcare' as const,
    article: `The DASH eating plan emphasises fruits, vegetables, whole grains, and low-fat dairy to help lower blood pressure in adults. Adults should aim for at least 150 minutes of moderate-intensity physical activity per week, such as brisk walking. Limiting sodium to less than 2,300 milligrams per day and avoiding excess alcohol also help maintain healthy blood pressure. This information is for educational purposes only and is not a substitute for professional medical advice. Always consult a qualified clinician about your individual health needs.`,
    accent: '#0d9488',
  },
];

const PIPELINE_NODES = [
  { label: 'Input', short: 'In' },
  { label: 'PHI / PII', short: 'PHI' },
  { label: 'Sources', short: 'Src' },
  { label: 'Draft', short: 'Drft' },
  { label: 'Red-flag', short: 'Flg' },
  { label: 'Audit', short: 'Adt' },
];

const EASE = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

export function HomeVerifierDemo() {
  const [picked, setPicked] = useState(SAMPLES[0]!);
  const [running, setRunning] = useState(false);
  const [activeNode, setActiveNode] = useState(-1);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRun = useCallback(() => {
    setRunning(true);
    setActiveNode(-1);
    setResult(null);
    setError(null);

    // Choreograph 6-node pipeline over ~4.5 seconds while the real
    // fetch runs. Last node fires when the response lands.
    let i = -1;
    const tick = setInterval(() => {
      i = Math.min(i + 1, PIPELINE_NODES.length - 2);
      setActiveNode(i);
    }, 700);

    fetch('/api/wizard/sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry: picked.industry, article: picked.article }),
    })
      .then(async (r) => {
        clearInterval(tick);
        setActiveNode(PIPELINE_NODES.length - 1);
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
          throw new Error(j.message ?? j.error ?? `HTTP ${r.status}`);
        }
        const data = (await r.json()) as VerifyResult;
        await new Promise((res) => setTimeout(res, 400));
        setResult(data);
        setRunning(false);
      })
      .catch((err) => {
        clearInterval(tick);
        setError(err instanceof Error ? err.message : 'Network error');
        setRunning(false);
      });
  }, [picked]);

  const handleReset = useCallback(() => {
    setResult(null);
    setActiveNode(-1);
    setError(null);
    setRunning(false);
  }, []);

  const handleCopy = useCallback(() => {
    if (!result?.proof_url) return;
    void navigator.clipboard.writeText(result.proof_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [result?.proof_url]);

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
            assuredai.online/v/<span className="font-mono">{result?.audit_log_id ?? '<id>'}</span>
          </div>
          <div className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <span className={`size-1.5 rounded-full ${running ? 'bg-amber-500 animate-pulse' : result ? 'bg-emerald-500' : 'bg-emerald-500 animate-pulse-soft'}`} />
            <span>{running ? 'Running' : result ? 'Verified' : 'Live'}</span>
          </div>
        </div>

        {/* Body
            NOTE: AnimatePresence without mode="wait" — earlier we used wait
            mode but the running and result branches had no exit prop, which
            wedged the state machine and rendered a blank/faded body on the
            second sample. Letting branches overlap briefly is fine; the
            relative-positioned wrapper below keeps them stacked while one
            fades out and the next fades in. */}
        <div className="relative px-5 pt-5 pb-4">
          <AnimatePresence initial={false}>
            {!running && !result && !error && (
              <motion.div
                key="picker"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
                transition={EASE}
              >
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
                  Pick a sample &middot; verify in 6 seconds
                </div>
                <div className="space-y-2">
                  {SAMPLES.map((s) => {
                    const selected = picked.id === s.id;
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setPicked(s)}
                        className="group flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-all hover:bg-accent/30"
                        style={{
                          borderColor: selected ? s.accent : 'hsl(var(--border))',
                          backgroundColor: selected ? `${s.accent}10` : undefined,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold tracking-tight">{s.label}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</div>
                        </div>
                        {selected && (
                          <span
                            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: s.accent }}
                            aria-hidden
                          >
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleRun}
                  className="group mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 text-[13.5px] font-semibold text-background transition-opacity hover:opacity-90"
                  style={{ backgroundColor: picked.accent }}
                >
                  <PlayCircle className="h-4 w-4" />
                  Run verification &middot; <span className="opacity-85">live pipeline</span>
                </button>
                <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
                  Real pipeline · real audit row · real public /v/&lt;id&gt; URL · no signup
                </p>
              </motion.div>
            )}

            {running && (
              <motion.div
                key="running"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
                transition={EASE}
                role="status"
                aria-live="polite"
                className="absolute inset-0 px-5 pt-5 pb-4"
              >
                <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    className="inline-flex"
                  >
                    <Loader2 className="h-3.5 w-3.5" style={{ color: picked.accent }} />
                  </motion.span>
                  Running real verification
                </div>
                {/* Compact node graph */}
                <div className="flex items-center gap-1.5">
                  {PIPELINE_NODES.map((node, i) => {
                    const isDone = i < activeNode;
                    const isActive = i === activeNode;
                    return (
                      <div key={node.short} className="flex flex-1 items-center gap-1.5">
                        <motion.div
                          className="flex h-10 flex-1 flex-col items-center justify-center rounded-md border bg-background"
                          animate={{
                            opacity: i > activeNode ? 0.35 : 1,
                            borderColor: isDone || isActive ? picked.accent : 'hsl(var(--border))',
                            backgroundColor: isActive ? `${picked.accent}15` : 'hsl(var(--background))',
                          }}
                        >
                          <AnimatePresence>
                            {isDone && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                                className="flex size-4 items-center justify-center rounded-full text-white"
                                style={{ backgroundColor: picked.accent }}
                              >
                                <Check className="h-2.5 w-2.5" strokeWidth={3} />
                              </motion.span>
                            )}
                            {isActive && (
                              <motion.span
                                animate={{ scale: [1, 1.4, 1] }}
                                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                                className="size-2 rounded-full"
                                style={{ backgroundColor: picked.accent }}
                              />
                            )}
                          </AnimatePresence>
                          <div className="mt-0.5 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-foreground/55">
                            {node.short}
                          </div>
                        </motion.div>
                        {i < PIPELINE_NODES.length - 1 && (
                          <motion.div
                            className="h-px w-3"
                            animate={{
                              backgroundColor: i < activeNode ? picked.accent : 'rgba(10,10,11,0.1)',
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-md border border-dashed border-border bg-muted/20 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  Same <code className="rounded bg-muted/40 px-1 font-mono text-[10px]">runVerifyLifecycle</code>{' '}
                  the production verifier runs. Output is a hash-chained audit row + a public{' '}
                  <code className="rounded bg-muted/40 px-1 font-mono text-[10px]">/v/&lt;id&gt;</code>.
                </div>
              </motion.div>
            )}

            {result && !running && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
                transition={EASE}
              >
                {(() => {
                  const tone = VERDICT_TONE[result.verdict] ?? VERDICT_TONE.verified!;
                  const toneColor =
                    tone.tone === 'pass' ? '#0d9488' : tone.tone === 'warn' ? '#f59e0b' : '#dc2626';
                  return (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div
                          className="text-[10.5px] font-semibold uppercase tracking-[0.18em]"
                          style={{ color: toneColor }}
                        >
                          Verification complete &middot; {(result.elapsed_ms / 1000).toFixed(1)}s
                        </div>
                        <div className="mt-1 text-[18px] font-semibold leading-tight tracking-[-0.018em]">
                          <span className="font-serif italic font-normal">{tone.headline}</span>
                        </div>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ring-1"
                        style={{
                          backgroundColor: `${toneColor}15`,
                          color: toneColor,
                          borderColor: `${toneColor}40`,
                        }}
                      >
                        <ShieldCheck className="h-2.5 w-2.5" />
                        {tone.label}
                      </span>
                    </div>
                  );
                })()}

                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded border border-border/40 bg-background/60 px-2 py-1.5 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Audit
                    </div>
                    <div className="mt-0.5 font-semibold tabular-nums">#{result.audit_log_id}</div>
                  </div>
                  <div className="rounded border border-border/40 bg-background/60 px-2 py-1.5 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Cited
                    </div>
                    <div className="mt-0.5 font-semibold tabular-nums">{result.citations}</div>
                  </div>
                  <div className="rounded border border-border/40 bg-background/60 px-2 py-1.5 text-center">
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Redacted
                    </div>
                    <div className="mt-0.5 font-semibold tabular-nums">{result.phi_redacted}</div>
                  </div>
                </div>

                {result.proof_url && (
                  <div className="mt-3 rounded-md border border-border bg-background p-2 font-mono text-[10.5px] text-foreground/85 break-all">
                    {result.proof_url}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-[11.5px] font-medium hover:bg-accent"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy URL'}
                  </button>
                  {result.proof_url && (
                    <Link
                      href={result.proof_url}
                      target="_blank"
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-[11.5px] font-semibold text-white"
                      style={{ backgroundColor: picked.accent }}
                    >
                      Open proof
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3" />
                  Run another sample
                </button>
              </motion.div>
            )}

            {error && !running && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
                transition={EASE}
                className="space-y-2"
              >
                <div className="rounded-md border border-red-500/40 bg-red-500/[0.06] p-3 text-[12px] text-red-700">
                  Verification didn&rsquo;t complete: {error}
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[12px] font-medium hover:bg-accent"
                >
                  Try again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
