'use client';

import * as React from 'react';
import type { Scenario } from '@/lib/db/types';
import { getSessionId } from '@/lib/utils';
import { Header } from './Header';
import { InputPanel, type DraftFormat, type InputMode } from './InputPanel';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import { ResultPanel, type VerifyResponse } from './ResultPanel';
import { Sidebar, type HistoryEntry } from './Sidebar';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const HISTORY_KEY = 'assured-ai-history-v1';
const HISTORY_LIMIT = 200;
const THREAD_KEY = 'assured-ai-thread-v1';
const THREAD_LIMIT = 50;
const MODE_KEY = 'assured-ai-mode-v1';

interface ThreadEntry {
  id: string;
  submittedAt: string;
  // Snapshot of the submitted request so it shows in the thread
  request: {
    /** Vertical-pack slug. Typed as string so non-legacy packs (finance,
     *  legal, custom) are valid. */
    scenario: string;
    mode: InputMode;
    article?: string;
    brief?: string;
    format?: DraftFormat;
  };
  /** Null while the request is pending */
  response: VerifyResponse | null;
  /** Whether the entry is collapsed in the thread view */
  collapsed: boolean;
}

export function VerifyInterface({
  initialScenario = 'healthcare' as Scenario,
}: {
  initialScenario?: Scenario;
}) {
  // Holds a vertical-pack slug. Typed as a string so non-built-in packs
  // (finance, legal, custom) populated from /api/packs are valid values.
  const [scenario, setScenario] = React.useState<string>(initialScenario);
  const [mode, setMode] = React.useState<InputMode>('paste');
  const [article, setArticle] = React.useState('');
  const [brief, setBrief] = React.useState('');
  const [format, setFormat] = React.useState<DraftFormat>('handout');
  const [submitting, setSubmitting] = React.useState(false);
  const [thread, setThread] = React.useState<ThreadEntry[]>([]);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [syncing, setSyncing] = React.useState(false);
  const topRef = React.useRef<HTMLDivElement>(null);

  // Load persisted history + thread + last-used mode on mount
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryEntry[];
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {}
    try {
      const raw = localStorage.getItem(THREAD_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ThreadEntry[];
        if (Array.isArray(parsed)) setThread(parsed);
      }
    } catch {}
    try {
      const m = localStorage.getItem(MODE_KEY);
      if (m === 'paste' || m === 'draft') setMode(m);
    } catch {}
  }, []);

  const handleModeChange = React.useCallback((next: InputMode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {}
  }, []);

  const persistHistory = React.useCallback((next: HistoryEntry[]) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, HISTORY_LIMIT)));
    } catch {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, 30)));
      } catch {}
    }
  }, []);

  const persistThread = React.useCallback((next: ThreadEntry[]) => {
    try {
      localStorage.setItem(THREAD_KEY, JSON.stringify(next.slice(0, THREAD_LIMIT)));
    } catch {
      try {
        localStorage.setItem(THREAD_KEY, JSON.stringify(next.slice(0, 10)));
      } catch {}
    }
  }, []);

  const runVerify = React.useCallback(
    async (override?: {
      scenario?: Scenario;
      mode?: InputMode;
      article?: string;
      brief?: string;
      format?: DraftFormat;
    }) => {
      if (submitting) return;
      const effScenario = override?.scenario ?? scenario;
      const effMode = override?.mode ?? mode;
      const effArticle = override?.article ?? article;
      const effBrief = override?.brief ?? brief;
      const effFormat = override?.format ?? format;

      // Send vertical_pack_slug — the resolver in /api/verify accepts
      // slug, id, or legacy scenario. We send slug so the verifier can
      // operate on packs introduced after this build shipped.
      const request = {
        vertical_pack_slug: effScenario,
        // scenario stays for any back-compat consumer; identical to slug today.
        scenario: effScenario as 'healthcare' | 'government',
        input_mode: effMode,
        article: effMode === 'paste' ? effArticle : undefined,
        brief: effMode === 'draft' ? effBrief : undefined,
        format: effMode === 'draft' ? effFormat : undefined,
      };
      const previewSource =
        effMode === 'paste' ? effArticle.trim().slice(0, 100) : effBrief.trim().slice(0, 100);

      // Insert pending entry at top of the thread IMMEDIATELY for instant feedback.
      const entryId = crypto.randomUUID();
      const pending: ThreadEntry = {
        id: entryId,
        submittedAt: new Date().toISOString(),
        request: {
          scenario: effScenario,
          mode: effMode,
          article: effMode === 'paste' ? effArticle : undefined,
          brief: effMode === 'draft' ? effBrief : undefined,
          format: effMode === 'draft' ? effFormat : undefined,
        },
        response: null,
        collapsed: false,
      };

      setSubmitting(true);
      setThread((cur) => {
        // Collapse all prior expanded entries so the new pending one is the focal point
        const collapsedPrior = cur.map((e) => ({ ...e, collapsed: true }));
        const next = [pending, ...collapsedPrior];
        persistThread(next);
        return next;
      });

      // Scroll the new entry into view at the top
      requestAnimationFrame(() => {
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      try {
        const response = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session-id': getSessionId() },
          body: JSON.stringify(request),
        });
        const data: VerifyResponse = await response.json();

        // Update the pending entry with the real response
        setThread((cur) => {
          const next = cur.map((e) => (e.id === entryId ? { ...e, response: data } : e));
          persistThread(next);
          return next;
        });

        // Also push to legacy sidebar history
        const histEntry: HistoryEntry = {
          id: entryId,
          audit_log_id: 'audit_log_id' in data ? data.audit_log_id : null,
          occurred_at: pending.submittedAt,
          scenario: effScenario,
          mode: effMode,
          outcome: data.kind === 'verified' ? 'verified' : data.kind,
          preview: previewSource,
          pii_count: data.kind === 'verified' ? data.report.pii_input_count : 0,
          unsourced_count: data.kind === 'verified' ? data.report.unsourced_paragraph_count : 0,
          drafted: effMode === 'draft',
          payload: data,
          request,
          source: 'local',
        };
        setHistory((cur) => {
          const next = [
            histEntry,
            ...cur.filter((h) => h.source !== 'server' || h.audit_log_id !== histEntry.audit_log_id),
          ].slice(0, HISTORY_LIMIT);
          persistHistory(next);
          return next;
        });
      } catch {
        // Mark the pending entry as failed
        setThread((cur) => {
          const next = cur.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  response: {
                    kind: 'error' as const,
                    message: 'Network error. Please try again.',
                    audit_log_id: null,
                    latency_ms: 0,
                  } as VerifyResponse,
                }
              : e,
          );
          persistThread(next);
          return next;
        });
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, scenario, mode, article, brief, format, persistThread, persistHistory],
  );

  const handleSubmit = () => runVerify();

  const handleRegenerate = () => runVerify();

  const handleNew = () => {
    setArticle('');
    setBrief('');
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleClearThread = () => {
    if (thread.length === 0) return;
    const ok = window.confirm(
      `Clear all ${thread.length} verification${thread.length === 1 ? '' : 's'} from the thread? Your saved history will stay intact.`,
    );
    if (!ok) return;
    setThread([]);
    persistThread([]);
  };

  const handleToggleCollapse = (id: string) => {
    setThread((cur) => {
      const next = cur.map((e) => (e.id === id ? { ...e, collapsed: !e.collapsed } : e));
      persistThread(next);
      return next;
    });
  };

  const handleDeleteEntry = (id: string) => {
    setThread((cur) => {
      const next = cur.filter((e) => e.id !== id);
      persistThread(next);
      return next;
    });
  };

  const handleSelectFromSidebar = (entry: HistoryEntry) => {
    if (entry.payload === null && entry.source === 'server') {
      if (entry.audit_log_id !== null) {
        window.open(`/audit?id=${entry.audit_log_id}`, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    // Restore the form so the user can re-submit / iterate
    setScenario(entry.scenario);
    setMode(entry.mode);
    const req = entry.request as { article?: string; brief?: string; format?: DraftFormat } | null;
    if (req) {
      if (entry.mode === 'paste') {
        setArticle(req.article ?? '');
        setBrief('');
      } else {
        setBrief(req.brief ?? '');
        setArticle('');
        if (req.format) setFormat(req.format);
      }
    }
  };

  const handleDeleteHist = (id: string) => {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    persistHistory(next);
  };

  const handleTogglePinHist = (id: string) => {
    const next = history.map((h) => (h.id === id ? { ...h, pinned: !h.pinned } : h));
    setHistory(next);
    persistHistory(next);
  };

  const handleClearAllHist = () => {
    setHistory([]);
    persistHistory([]);
  };

  const handleSyncServer = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const r = await fetch('/api/conversations');
      const data = (await r.json()) as {
        conversations: Array<{
          id: number;
          occurred_at: string;
          scenario: string;
          outcome: string;
          preview: string;
          pii_in: boolean;
          red_flag_category: string | null;
          drafted: boolean;
        }>;
      };
      const knownAudit = new Set(
        history.map((h) => h.audit_log_id).filter((x): x is number => x !== null),
      );
      const stubs: HistoryEntry[] = data.conversations
        .filter((c) => !knownAudit.has(c.id))
        .map((c) => ({
          id: `srv_${c.id}`,
          audit_log_id: c.id,
          occurred_at: c.occurred_at,
          scenario: c.scenario as 'healthcare' | 'government',
          mode: c.preview.startsWith('<DRAFT_BRIEF>') || c.drafted ? 'draft' : 'paste',
          outcome:
            c.outcome === 'red_flag_escalation'
              ? 'red_flag_blocked'
              : c.outcome === 'answered'
                ? 'verified'
                : c.outcome === 'i_dont_know'
                  ? 'verified'
                  : 'error',
          preview: c.preview.replace(/^<DRAFT_BRIEF>\s*/, ''),
          pii_count: c.pii_in ? 1 : 0,
          unsourced_count: 0,
          drafted: c.drafted,
          payload: null,
          request: null,
          source: 'server',
        }));
      const merged = [...history, ...stubs].sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
      );
      setHistory(merged);
      persistHistory(merged);
    } catch {
      // silent
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 gradient-mesh" aria-hidden />
      <div className="relative">
        <Header scenario={scenario} onScenarioChange={setScenario} activePath="/chat" />
        <div className="flex">
          <Sidebar
            history={history}
            activeId={null}
            onNew={handleNew}
            onSelect={handleSelectFromSidebar}
            onDelete={handleDeleteHist}
            onTogglePin={handleTogglePinHist}
            onClearAll={handleClearAllHist}
            onSyncServer={handleSyncServer}
            syncing={syncing}
          />
          <main className="flex-1 px-5 py-6">
            <div className="mx-auto max-w-[1200px]">
              <div className="grid gap-5 lg:grid-cols-[minmax(380px,440px)_1fr]">
                {/* LEFT: input panel — sticky */}
                <section className="lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
                  <div className="flex h-full flex-col rounded-2xl border border-border bg-card/60 shadow-sm backdrop-blur-sm">
                    <div className="px-5 pt-5">
                      <h1 className="text-[19px] font-semibold tracking-tight">
                        Verify content before it ships
                      </h1>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        Paste a draft, or describe what you want written. Every submission stays
                        in the thread on the right — no result ever gets clobbered.
                      </p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <InputPanel
                        mode={mode}
                        onModeChange={handleModeChange}
                        article={article}
                        onArticleChange={setArticle}
                        brief={brief}
                        onBriefChange={setBrief}
                        format={format}
                        onFormatChange={setFormat}
                        submitting={submitting}
                        onSubmit={handleSubmit}
                        packSlug={scenario}
                      />
                    </div>
                  </div>
                </section>

                {/* RIGHT: thread — accumulates results */}
                <section className="space-y-4" ref={topRef}>
                  {thread.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card/60 shadow-sm backdrop-blur-sm min-h-[600px]">
                      <EmptyState />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Thread · {thread.length} {thread.length === 1 ? 'verification' : 'verifications'}
                        </div>
                        <button
                          type="button"
                          onClick={handleClearThread}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label="Clear thread"
                        >
                          <Trash2 className="h-3 w-3" />
                          Clear thread
                        </button>
                      </div>

                      {thread.map((entry) => (
                        <ThreadEntryView
                          key={entry.id}
                          entry={entry}
                          scenario={scenario}
                          onToggleCollapse={() => handleToggleCollapse(entry.id)}
                          onDelete={() => handleDeleteEntry(entry.id)}
                          onRegenerate={handleRegenerate}
                          onReset={handleNew}
                        />
                      ))}
                    </>
                  )}
                </section>
              </div>

              <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-2 pb-6 pt-4 text-[11px] text-muted-foreground">
                <div>AssuredAI · governed AI for healthcare and government publishers</div>
                <div className="flex items-center gap-3">
                  <Link href="/audit" className="hover:text-foreground">
                    Audit log
                  </Link>
                  <span>·</span>
                  <Link href="/library" className="hover:text-foreground">
                    Source library
                  </Link>
                </div>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function ThreadEntryView({
  entry,
  scenario,
  onToggleCollapse,
  onDelete,
  onRegenerate,
  onReset,
}: {
  entry: ThreadEntry;
  scenario: string;
  onToggleCollapse: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onReset: () => void;
}) {
  const isPending = entry.response === null;
  const submittedTime = new Date(entry.submittedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const preview = entry.request.article ?? entry.request.brief ?? '';

  return (
    <article
      className={`rounded-2xl border bg-card/60 shadow-sm backdrop-blur-sm transition-colors ${
        isPending ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
      }`}
    >
      {/* Header strip — always visible */}
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {submittedTime}
          </span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {entry.request.mode === 'paste' ? 'Paste' : 'Draft'}
          </span>
          <span className="truncate text-[12.5px] text-foreground/85">
            {preview.slice(0, 80)}
            {preview.length > 80 ? '…' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isPending && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              Running
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={entry.collapsed ? 'Expand' : 'Collapse'}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {entry.collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Remove from thread"
            disabled={isPending}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Body — collapsible */}
      {!entry.collapsed && (
        <div className="min-h-[200px]">
          {isPending ? (
            <LoadingState mode={entry.request.mode} />
          ) : (
            <ResultPanel
              result={entry.response!}
              onReset={onReset}
              onRegenerate={onRegenerate}
              scenario={scenario}
            />
          )}
        </div>
      )}
    </article>
  );
}
