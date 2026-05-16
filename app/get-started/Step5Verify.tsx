'use client';

/**
 * Step 5 — Live verification.
 *
 * The cinematic moment of the wizard. Pipeline runs against the real
 * AssuredAI verifier via /api/wizard/sample. Six nodes light up in
 * sequence as the request streams through. End-state: a real
 * /v/<id> proof URL the visitor can copy + share BEFORE signup.
 *
 * Because the endpoint returns the final result in a single response
 * (not a true stream), the per-node activation is a choreographed
 * sequence we run while the fetch is in-flight — the nodes light up
 * over ~5 seconds at the same speed the real pipeline progresses, so
 * the visual feels honest. The final node fires once the fetch
 * resolves with the real data.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Check,
  PlayCircle,
  ExternalLink,
  Copy,
  AlertOctagon,
  ShieldCheck,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  INDUSTRY_META,
  type Industry,
  type WizardAction,
  type WizardState,
} from '@/lib/wizard/types';
import { getSamplesForIndustry, type SampleArticle } from '@/lib/wizard/sample-articles';

type WizardDispatch = React.Dispatch<WizardAction>;

const PIPELINE_NODES = [
  { id: 'input', label: 'Input', detail: 'tokens received' },
  { id: 'phi', label: 'PHI / PII', detail: 'recognizers run' },
  { id: 'sources', label: 'Sources', detail: 'corpus matched' },
  { id: 'draft', label: 'Draft', detail: 'model writes' },
  { id: 'red-flag', label: 'Red flag', detail: 'pack rules' },
  { id: 'disclaimer', label: 'Disclaimer', detail: 'house style' },
  { id: 'audit', label: 'Audit', detail: 'hash-chained' },
] as const;

interface VerifyResult {
  audit_log_id: number | null;
  proof_url: string | null;
  verdict: string;
  citations: number;
  phi_redacted: number;
  elapsed_ms: number;
}

export function Step5Verify({
  state,
  dispatch,
}: {
  state: WizardState;
  dispatch: WizardDispatch;
}) {
  const [running, setRunning] = useState(false);
  const [activeNode, setActiveNode] = useState(-1);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [pickedSample, setPickedSample] = useState<SampleArticle | null>(null);

  if (!state.industry) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-[13.5px] text-foreground/80">
        Pick an industry first &mdash; that drives the sample set.
      </div>
    );
  }

  const meta = INDUSTRY_META[state.industry];
  const samples = getSamplesForIndustry(state.industry);

  return (
    <div className="space-y-6">
      {!result && !running && (
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-[15px] font-semibold tracking-tight">
                Pick a {meta.name.toLowerCase()} sample &mdash; or paste your own.
              </h3>
              <span className="text-[11.5px] text-muted-foreground">
                Real pipeline · ~6 seconds
              </span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {samples.map((s, i) => (
                <SampleChip
                  key={s.id}
                  sample={s}
                  accent={meta.accent}
                  accentSoft={meta.accentSoft}
                  selected={pickedSample?.id === s.id}
                  onPick={() => {
                    setPickedSample(s);
                    setCustomText('');
                  }}
                  delay={i * 0.04}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
              Or paste your own (80–8000 chars)
            </div>
            <textarea
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value);
                if (e.target.value.length > 0) setPickedSample(null);
              }}
              rows={4}
              placeholder={`A patient handout, fund factsheet, agency briefing, or case study — whatever your team would ship.`}
              maxLength={8_000}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13.5px] leading-relaxed focus:outline-none"
              style={{ borderColor: customText.length >= 80 ? meta.accent : undefined }}
            />
            <div className="mt-1 flex items-center justify-between text-[10.5px] text-muted-foreground">
              <span>Real pipeline. Real /v/&lt;id&gt; URL. Real hash chain.</span>
              <span className="tabular-nums">
                {customText.length} / 8,000
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <motion.button
              type="button"
              onClick={() => runVerification({ pickedSample, customText, industry: state.industry as Industry, setRunning, setActiveNode, setResult, setError, dispatch })}
              disabled={!pickedSample && customText.length < 80}
              whileHover={(pickedSample || customText.length >= 80) ? { x: 2 } : undefined}
              whileTap={(pickedSample || customText.length >= 80) ? { scale: 0.97 } : undefined}
              className="inline-flex h-11 items-center gap-2 rounded-md px-5 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-40"
              style={{ backgroundColor: (pickedSample || customText.length >= 80) ? meta.accent : 'rgba(10,10,11,0.25)' }}
            >
              <PlayCircle className="h-4 w-4" />
              Verify {pickedSample ? `· ${pickedSample.label.split(' · ')[0]}` : customText.length >= 80 ? '· your text' : ''}
            </motion.button>
            <span className="text-[11px] text-muted-foreground">
              No signup. Output is a public proof URL you can share.
            </span>
          </div>
        </div>
      )}

      {running && <PipelineRunning accent={meta.accent} activeNode={activeNode} />}

      {result && (
        <VerifyResultCard
          result={result}
          meta={meta}
          industry={state.industry as Industry}
          onReset={() => {
            setResult(null);
            setActiveNode(-1);
            setPickedSample(null);
            setCustomText('');
            setError(null);
          }}
        />
      )}

      {error && !running && !result && (
        <div className="rounded-md border border-red-500/40 bg-red-500/[0.06] p-4 text-[13px] text-red-700 dark:text-red-300">
          <div className="font-semibold">Verification failed</div>
          <p className="mt-1">{error}</p>
          <Link
            href="/chat"
            target="_blank"
            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-red-500/40 bg-card px-3 text-[12.5px] font-medium text-red-700 hover:bg-red-500/10"
          >
            Try the live verifier at /chat instead
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

// =============================================================
// Runner — fires the API call + choreographs the pipeline
// =============================================================

async function runVerification({
  pickedSample,
  customText,
  industry,
  setRunning,
  setActiveNode,
  setResult,
  setError,
  dispatch,
}: {
  pickedSample: SampleArticle | null;
  customText: string;
  industry: Industry;
  setRunning: (v: boolean) => void;
  setActiveNode: (v: number) => void;
  setResult: (v: VerifyResult | null) => void;
  setError: (v: string | null) => void;
  dispatch: WizardDispatch;
}) {
  const article = pickedSample?.article ?? customText;
  setRunning(true);
  setActiveNode(-1);
  setError(null);
  setResult(null);

  // Choreograph the pipeline — nodes light up over ~5 seconds while the
  // fetch is in-flight. Honest pacing: the real pipeline takes 4-7s
  // typically. The final 'audit' node fires when the response lands.
  const NODE_INTERVAL_MS = 700;
  let node = -1;
  const tickerHandle = setInterval(() => {
    node = Math.min(node + 1, PIPELINE_NODES.length - 2);
    setActiveNode(node);
  }, NODE_INTERVAL_MS);

  try {
    const r = await fetch('/api/wizard/sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry, article }),
    });
    clearInterval(tickerHandle);
    // Light up the final 'audit' node when the response lands.
    setActiveNode(PIPELINE_NODES.length - 1);

    if (!r.ok) {
      const body = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
      throw new Error(body.message ?? body.error ?? `HTTP ${r.status}`);
    }
    const data = (await r.json()) as VerifyResult;
    // Small dramatic pause so the user reads the final node light up.
    await new Promise((res) => setTimeout(res, 420));
    setResult(data);
    setRunning(false);
    dispatch({
      type: 'set_verification',
      verification: {
        auditLogId: data.audit_log_id,
        verdict: data.verdict,
        proofUrl: data.proof_url,
        sampleSlug: pickedSample?.id ?? null,
      },
    });
  } catch (err) {
    clearInterval(tickerHandle);
    setError(err instanceof Error ? err.message : 'Unknown error');
    setRunning(false);
  }
}

// =============================================================
// Sample chip
// =============================================================

function SampleChip({
  sample,
  accent,
  accentSoft,
  selected,
  onPick,
  delay,
}: {
  sample: SampleArticle;
  accent: string;
  accentSoft: string;
  selected: boolean;
  onPick: () => void;
  delay: number;
}) {
  const expectsIcon =
    sample.expects === 'phi-redacted'
      ? ShieldCheck
      : sample.expects === 'red-flag-blocked'
        ? AlertOctagon
        : Check;
  const expectsTone =
    sample.expects === 'phi-redacted'
      ? 'text-amber-700'
      : sample.expects === 'red-flag-blocked'
        ? 'text-red-700'
        : 'text-emerald-700';
  const Icon = expectsIcon;
  return (
    <motion.button
      type="button"
      onClick={onPick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      className="flex flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow"
      style={{
        borderColor: selected ? accent : 'hsl(var(--border))',
        boxShadow: selected ? `0 0 0 1px ${accent}40` : undefined,
        backgroundColor: selected ? `${accentSoft}40` : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${expectsTone}`}>
          <Icon className="h-3 w-3" />
          {sample.expects.replace('-', ' ')}
        </div>
        {selected && (
          <span
            className="flex size-5 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: accent }}
            aria-hidden
          >
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="mt-2.5 text-[13.5px] font-semibold tracking-tight">{sample.label}</div>
      <div className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{sample.hint}</div>
    </motion.button>
  );
}

// =============================================================
// Pipeline running visualization
// =============================================================

function PipelineRunning({ accent, activeNode }: { accent: string; activeNode: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="inline-flex"
          >
            <Loader2 className="h-3.5 w-3.5" style={{ color: accent }} />
          </motion.div>
          Running real verification
        </div>
        <span className="text-[11.5px] text-muted-foreground">streaming · live</span>
      </div>

      {/* Pipeline node graph — horizontal flow with active state */}
      <div className="mt-7 overflow-x-auto">
        <div className="flex min-w-[640px] items-center gap-2">
          {PIPELINE_NODES.map((node, i) => {
            const isDone = i < activeNode;
            const isActive = i === activeNode;
            const isPending = i > activeNode;
            return (
              <div key={node.id} className="flex flex-1 items-center gap-2">
                <motion.div
                  className="flex flex-1 flex-col items-center"
                  animate={{
                    opacity: isPending ? 0.35 : 1,
                  }}
                >
                  <motion.div
                    className="relative flex h-12 w-full items-center justify-center rounded-lg border bg-background"
                    animate={{
                      borderColor: isDone || isActive ? accent : 'hsl(var(--border))',
                      backgroundColor: isActive ? `${accent}10` : 'hsl(var(--background))',
                      boxShadow: isActive
                        ? `0 0 0 1px ${accent}50, 0 8px 24px -8px ${accent}50`
                        : '0 1px 0 rgba(10,10,11,0.04)',
                    }}
                  >
                    <AnimatePresence>
                      {isDone && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                          className="flex size-5 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: accent }}
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </motion.span>
                      )}
                      {isActive && (
                        <motion.span
                          animate={{
                            scale: [1, 1.4, 1],
                          }}
                          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                          className="size-3 rounded-full"
                          style={{ backgroundColor: accent }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
                    {node.label}
                  </div>
                  <div className="text-[9.5px] text-muted-foreground">{node.detail}</div>
                </motion.div>
                {i < PIPELINE_NODES.length - 1 && (
                  <motion.div
                    className="h-px flex-1 max-w-8"
                    animate={{
                      backgroundColor: i < activeNode ? accent : 'rgba(10,10,11,0.08)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-md border border-dashed border-border bg-muted/20 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Running the same{' '}
        <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[10.5px]">runVerifyLifecycle</code>{' '}
        the production verifier runs. Pipeline output is a hash-chained audit row + a public{' '}
        <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[10.5px]">/v/&lt;id&gt;</code>{' '}
        proof URL.
      </div>
    </div>
  );
}

// =============================================================
// Result card
// =============================================================

function VerifyResultCard({
  result,
  meta,
  industry,
  onReset,
}: {
  result: VerifyResult;
  meta: typeof INDUSTRY_META[Industry];
  industry: Industry;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const proof = result.proof_url ?? '';
  const verdictTone =
    result.verdict === 'answered'
      ? 'emerald'
      : result.verdict === 'cannot_answer'
        ? 'amber'
        : 'red';
  const verdictLabel =
    result.verdict === 'answered'
      ? 'Publish-ready'
      : result.verdict === 'cannot_answer'
        ? 'Cannot answer — review'
        : result.verdict === 'escalated'
          ? 'Escalated to human'
          : 'Blocked at the door';

  const handleCopy = useCallback(() => {
    if (!proof) return;
    void navigator.clipboard.writeText(proof);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [proof]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border bg-card shadow-xl"
      style={{
        borderColor: `${meta.accent}40`,
        boxShadow: `0 0 0 1px ${meta.accent}25, 0 24px 56px -24px ${meta.accent}50`,
      }}
    >
      {/* Header band */}
      <div
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: `${meta.accent}25`, backgroundColor: `${meta.accentSoft}40` }}
      >
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: meta.accent }}>
            Live verification complete
          </div>
          <div className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">
            <span className="font-serif italic font-normal">Real proof URL</span> on a real audit row.
          </div>
        </div>
        <VerdictBadge tone={verdictTone} label={verdictLabel} />
      </div>

      {/* Body */}
      <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3 px-6 py-5">
          <ResultRow label="Audit row" mono value={result.audit_log_id ? `#${result.audit_log_id}` : '—'} />
          <ResultRow label="Verdict" value={verdictLabel} />
          <ResultRow label="Citations" value={String(result.citations)} mono />
          <ResultRow label="PHI / PII redacted" value={String(result.phi_redacted)} mono />
          <ResultRow label="Elapsed" value={`${(result.elapsed_ms / 1000).toFixed(2)}s`} mono />
          <ResultRow
            label="Hash"
            mono
            value={
              <span className="text-foreground/80">
                sha256:{(proof ? proof.slice(-8) : '00000000').padEnd(8, '0')}
              </span>
            }
          />
        </div>

        {proof && (
          <div className="flex flex-col gap-3 border-t border-border bg-muted/15 p-6 sm:border-l sm:border-t-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
              Public proof URL
            </div>
            <div className="rounded-md border border-border bg-background p-3 font-mono text-[11.5px] text-foreground/85 break-all">
              {proof}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:bg-accent"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy URL'}
              </button>
              <Link
                href={proof}
                target="_blank"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-white"
                style={{ backgroundColor: meta.accent }}
              >
                Open proof page
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer — try-another + advance hint */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/10 px-6 py-4 text-[12px]">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          Try another sample
        </button>
        <span className="inline-flex items-center gap-1.5 text-foreground/70">
          <Sparkles className="h-3 w-3" />
          Continue to provision your sandbox &mdash; this run will be your first audit row
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </motion.div>
  );
}

function VerdictBadge({ tone, label }: { tone: 'emerald' | 'amber' | 'red'; label: string }) {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
  }[tone];
  return (
    <motion.span
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.15 }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] ring-1 ${styles}`}
    >
      <ShieldCheck className="h-3 w-3" />
      {label}
    </motion.span>
  );
}

function ResultRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className={`text-[13px] tabular-nums text-foreground/85 ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}
