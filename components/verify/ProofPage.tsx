'use client';

import * as React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Download,
  Sparkles,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { BrandLockup } from './Brand';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AnnotatedArticle, type ParagraphCheck } from './AnnotatedArticle';
import type { HighlightSelection } from './highlight';
import type { AuditCitation } from '@/lib/db/types';
import { cn } from '@/lib/utils';

interface AuditProof {
  id: number;
  occurred_at: string;
  scenario: string;
  outcome: string;
  outcome_reason: string | null;
  article: string;
  citations: AuditCitation[];
  verification_detail: unknown;
  pii_input: boolean;
  pii_output: boolean;
  red_flag_category: string | null;
  latency_ms: number;
  model_used: string | null;
  prev_hash: string;
  hash: string;
}

interface ChainStep {
  id: number;
  occurred_at: string;
  outcome: string;
  prev_hash: string;
  stored_hash: string;
  recomputed_hash: string;
  match: boolean;
}

export function ProofPage({ audit }: { audit: AuditProof }) {
  const [highlight, setHighlight] = React.useState<HighlightSelection | null>(null);
  const [copyState, setCopyState] = React.useState<'idle' | 'url' | 'hash' | 'embed'>('idle');

  const detail = parseDetail(audit.verification_detail);
  const paragraphs = detail.paragraphs;
  const isClean =
    audit.outcome === 'answered' && !audit.pii_input && !detail.disclaimerInjected;

  const proofUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/v/${audit.id}` : `/v/${audit.id}`;
  const embedCode = `<iframe src="${proofUrl}?embed=1" width="100%" height="640" frameborder="0"></iframe>`;

  const copy = async (text: string, key: 'url' | 'hash' | 'embed') => {
    await navigator.clipboard.writeText(text);
    setCopyState(key);
    setTimeout(() => setCopyState('idle'), 1500);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative min-h-screen bg-background">
        <div className="pointer-events-none absolute inset-0 gradient-mesh" aria-hidden />
        <div className="relative">
          {/* Slim header */}
          <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-lg">
            <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-5">
              <Link
                href="/"
                aria-label="AssuredAI home"
                className="rounded-md transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <BrandLockup />
              </Link>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/audit/${audit.id}/pdf`}>
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </a>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/chat">Verify your own</a>
                </Button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1100px] px-5 py-10">
            {/* Hero stamp */}
            <section
              className={cn(
                'mb-8 overflow-hidden rounded-3xl border p-8 shadow-sm',
                isClean
                  ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-white dark:border-emerald-900/60 dark:from-emerald-950/40 dark:to-card'
                  : 'border-amber-200 bg-gradient-to-br from-amber-50/90 to-white dark:border-amber-900/60 dark:from-amber-950/40 dark:to-card',
              )}
            >
              <div className="flex items-start gap-5">
                <div
                  className={cn(
                    'flex size-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-md',
                    isClean
                      ? 'bg-emerald-500 shadow-emerald-500/30'
                      : 'bg-amber-500 shadow-amber-500/30',
                  )}
                >
                  {isClean ? (
                    <ShieldCheck className="h-7 w-7" />
                  ) : (
                    <ShieldAlert className="h-7 w-7" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> Cryptographic proof
                  </div>
                  <h1 className="text-[28px] font-semibold leading-tight tracking-tight">
                    {isClean
                      ? 'Verified by AssuredAI'
                      : audit.outcome === 'red_flag_escalation'
                        ? 'Auto-blocked by AssuredAI'
                        : 'Verified with notes by AssuredAI'}
                  </h1>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                    This content was run through AssuredAI&apos;s compliance pipeline on{' '}
                    <strong className="text-foreground">
                      {new Date(audit.occurred_at).toLocaleString(undefined, {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })}
                    </strong>
                    . The hash chain below cryptographically links this audit
                    entry to every prior verification — back to the genesis
                    record.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px]">
                    <Badge variant="outline" className="bg-background/80 font-mono">
                      Audit #{audit.id}
                    </Badge>
                    <Badge variant="outline" className="bg-background/80 capitalize">
                      {audit.scenario}
                    </Badge>
                    {audit.model_used && (
                      <Badge variant="outline" className="bg-background/80">
                        {audit.model_used.replace(/-20\d{6}$/, '')}
                      </Badge>
                    )}
                    {audit.latency_ms > 0 && (
                      <Badge variant="outline" className="bg-background/80 tabular-nums">
                        {audit.latency_ms.toLocaleString()}ms
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Cryptographic proof card */}
            <ChainWalker auditId={audit.id} storedHash={audit.hash} prevHash={audit.prev_hash} />

            {/* Article body */}
            {audit.outcome === 'red_flag_escalation' ? (
              <RedFlagBlock category={audit.red_flag_category} message={audit.article} />
            ) : (
              <section className="mt-8 rounded-3xl border border-border bg-card p-8 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Verified article
                  </h2>
                  <span className="text-[11px] text-muted-foreground">
                    {wordCount(audit.article).toLocaleString()} words
                  </span>
                </div>
                {paragraphs.length > 0 ? (
                  <AnnotatedArticle
                    paragraphs={paragraphs}
                    disclaimerInjected={detail.disclaimerInjected}
                    highlight={highlight}
                    setHighlight={setHighlight}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-[15px] leading-[1.7]">
                    {audit.article}
                  </pre>
                )}
              </section>
            )}

            {/* Citations */}
            {audit.citations.length > 0 && (
              <section className="mt-8 rounded-3xl border border-border bg-card p-8 shadow-sm">
                <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Sources cited · {audit.citations.length}
                </h2>
                <ul className="space-y-2">
                  {audit.citations.map((c) => (
                    <li key={c.url}>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors hover:bg-accent"
                      >
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10.5px] font-semibold uppercase tracking-wide text-primary">
                          {orgInitials(c.organization)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">
                            {c.title}
                          </span>
                          <span className="block truncate text-[11.5px] text-muted-foreground">
                            {c.organization} · {prettyHost(c.url)}
                          </span>
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-opacity group-hover:text-foreground" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Compliance metadata */}
            <section className="mt-8 rounded-3xl border border-border bg-card p-8 shadow-sm">
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Compliance metadata
              </h2>
              <dl className="grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2">
                <Meta label="Outcome">
                  <Badge
                    variant={audit.outcome === 'answered' ? 'success' : audit.outcome === 'red_flag_escalation' ? 'danger' : 'muted'}
                  >
                    {audit.outcome.replace(/_/g, ' ')}
                  </Badge>
                </Meta>
                <Meta label="Scenario">{audit.scenario}</Meta>
                <Meta label="PII detected (input)">{audit.pii_input ? 'Yes' : 'No'}</Meta>
                <Meta label="PII detected (output)">{audit.pii_output ? 'Yes' : 'No'}</Meta>
                {detail.disclaimerInjected && (
                  <Meta label="Disclaimer">Auto-injected</Meta>
                )}
                {audit.red_flag_category && (
                  <Meta label="Red flag">
                    <span className="capitalize">
                      {audit.red_flag_category.replace(/_/g, ' ')}
                    </span>
                  </Meta>
                )}
                {audit.model_used && <Meta label="Model">{audit.model_used}</Meta>}
                <Meta label="Latency">{audit.latency_ms.toLocaleString()}ms</Meta>
                <Meta label="Genesis hash (prev)" mono>
                  {audit.prev_hash === 'genesis' ? 'genesis' : audit.prev_hash.slice(0, 18) + '…'}
                </Meta>
                <Meta label="This hash" mono>
                  {audit.hash.slice(0, 18)}…
                </Meta>
              </dl>
            </section>

            {/* Share + embed */}
            <section className="mt-8 rounded-3xl border border-border bg-card p-8 shadow-sm">
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Share this proof
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <code className="flex-1 truncate font-mono text-[12px] text-foreground">
                    {proofUrl}
                  </code>
                  <Button variant="ghost" size="sm" onClick={() => copy(proofUrl, 'url')}>
                    {copyState === 'url' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy URL
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <code className="flex-1 truncate font-mono text-[12px] text-muted-foreground">
                    {embedCode}
                  </code>
                  <Button variant="ghost" size="sm" onClick={() => copy(embedCode, 'embed')}>
                    {copyState === 'embed' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy embed
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </section>

            <footer className="mt-10 px-1 text-center text-[11.5px] text-muted-foreground">
              Generated by{' '}
              <a href="/chat" className="text-primary hover:underline">
                AssuredAI
              </a>
              . Anyone can re-verify this proof —{' '}
              <a
                href={`/api/audit/chain?to=${audit.id}&window=10`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                inspect the raw chain
              </a>
              .
            </footer>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ChainWalker({
  auditId,
  storedHash,
  prevHash,
}: {
  auditId: number;
  storedHash: string;
  prevHash: string;
}) {
  const [steps, setSteps] = React.useState<ChainStep[] | null>(null);
  const [running, setRunning] = React.useState(false);
  const [completed, setCompleted] = React.useState(-1);
  const [error, setError] = React.useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setSteps(null);
    setCompleted(-1);
    try {
      const r = await fetch(`/api/audit/chain?to=${auditId}&window=6`);
      const data = (await r.json()) as { steps: ChainStep[]; valid: boolean };
      setSteps(data.steps);
      // Animate step-by-step
      for (let i = 0; i < data.steps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 380));
        setCompleted(i);
        if (!data.steps[i]?.match) {
          setError(`Hash mismatch at audit #${data.steps[i]?.id}`);
          break;
        }
      }
    } catch {
      setError('Failed to fetch chain');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section id="verify-chain" className="scroll-mt-20 rounded-3xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Cryptographic chain
          </h2>
          <p className="mt-1 text-[13.5px] text-foreground">
            Walks the SHA-256 hash chain. Each entry hashes the previous entry&apos;s hash, so
            altering any historical row breaks every entry that follows.
          </p>
        </div>
        <Button onClick={run} disabled={running} size="default">
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" /> Verify chain
            </>
          )}
        </Button>
      </div>

      {!steps && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-[12.5px] text-muted-foreground">
          <p>
            Click <strong>Verify chain</strong> to walk the last 6 hash links and re-compute each
            one in your browser.
          </p>
          <p className="mt-2 font-mono text-[11px]">
            this hash · <span className="text-foreground">{storedHash.slice(0, 16)}…</span> · prev ·{' '}
            <span className="text-foreground">
              {prevHash === 'genesis' ? 'genesis' : prevHash.slice(0, 16) + '…'}
            </span>
          </p>
        </div>
      )}

      {steps && (
        <ol className="space-y-1.5">
          {steps.map((s, i) => {
            const state: 'done' | 'active' | 'pending' =
              i < completed || (i === completed && !running)
                ? 'done'
                : i === completed && running
                  ? 'active'
                  : 'pending';
            const success = state === 'done' && s.match;
            const failed = state === 'done' && !s.match;
            return (
              <li
                key={s.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all',
                  success && 'bg-emerald-50 dark:bg-emerald-950/30',
                  failed && 'bg-red-50 dark:bg-red-950/30',
                  state === 'active' && 'bg-primary/5',
                )}
              >
                <div className="mt-0.5">
                  {success ? (
                    <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  ) : failed ? (
                    <div className="flex size-5 items-center justify-center rounded-full bg-red-500 text-white">
                      <AlertTriangle className="h-3 w-3" />
                    </div>
                  ) : state === 'active' ? (
                    <div className="flex size-5 items-center justify-center rounded-full border-2 border-primary">
                      <div className="size-2 animate-pulse rounded-full bg-primary" />
                    </div>
                  ) : (
                    <div className="size-5 rounded-full border-2 border-border" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium tabular-nums">Audit #{s.id}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {s.outcome.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {s.recomputed_hash.slice(0, 24)}…
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}
      {steps && !running && completed === steps.length - 1 && !error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <ShieldCheck className="h-4 w-4" />
          <span>
            Chain verified — every hash matched. This proof is genuine.
          </span>
        </div>
      )}
    </section>
  );
}

function RedFlagBlock({ category, message }: { category: string | null; message: string }) {
  return (
    <section className="mt-8 rounded-3xl border-2 border-red-500 bg-red-50 p-8 dark:bg-red-950/30">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-red-900 dark:text-red-200">
        <AlertTriangle className="h-5 w-5" /> Auto-blocked · {category?.replace(/_/g, ' ')}
      </div>
      <pre className="mt-3 whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-red-900 dark:text-red-200">
        {message}
      </pre>
    </section>
  );
}

function Meta({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className={cn('mt-0.5 text-[13px]', mono && 'font-mono text-[11.5px]')}>{children}</dd>
    </div>
  );
}

function parseDetail(detail: unknown): {
  paragraphs: ParagraphCheck[];
  disclaimerInjected: boolean;
} {
  if (!detail || typeof detail !== 'object') {
    return { paragraphs: [], disclaimerInjected: false };
  }
  const d = detail as { paragraphs?: ParagraphCheck[]; report?: { disclaimer_injected?: boolean } };
  return {
    paragraphs: Array.isArray(d.paragraphs) ? d.paragraphs : [],
    disclaimerInjected: d.report?.disclaimer_injected ?? false,
  };
}

function orgInitials(org: string): string {
  if (org.includes('/')) return org.split('/')[1]?.slice(0, 3) ?? org.slice(0, 3);
  const words = org.split(' ').filter(Boolean);
  if (words.length >= 2 && words[0] && words[1]) return (words[0][0] ?? '') + (words[1][0] ?? '');
  return org.slice(0, 3);
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
