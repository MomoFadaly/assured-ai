'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { StatusChips, type VerdictReport } from './StatusChips';
import { AnnotatedArticle, type ParagraphCheck } from './AnnotatedArticle';
import { SourcesList } from './SourcesList';
import { ActionBar } from './ActionBar';
import type { HighlightSelection } from './highlight';
import type { AuditCitation, RedFlagCategory } from '@/lib/db/types';

export type DraftFormat = 'qa' | 'handout' | 'faq' | 'social' | 'email';

export interface VerifySuccess {
  kind: 'verified';
  verified_article: string;
  paragraphs: ParagraphCheck[];
  citations: AuditCitation[];
  report: VerdictReport;
  draft_metadata: { model: string; format: DraftFormat } | null;
  audit_log_id: number;
  latency_ms: number;
}

export interface VerifyRedFlag {
  kind: 'red_flag_blocked';
  message: string;
  category: RedFlagCategory;
  audit_log_id: number;
  latency_ms: number;
}

export interface VerifyKill {
  kind: 'kill_switch';
  message: string;
  audit_log_id: number;
  latency_ms: number;
}

export interface VerifyError {
  kind: 'error';
  message: string;
  audit_log_id: number | null;
  latency_ms: number;
}

export type VerifyResponse = VerifySuccess | VerifyRedFlag | VerifyKill | VerifyError;

export function ResultPanel({
  result,
  onReset,
  onRegenerate,
  scenario,
}: {
  result: VerifyResponse;
  onReset: () => void;
  onRegenerate?: () => void;
  scenario?: 'healthcare' | 'government';
}) {
  if (result.kind === 'red_flag_blocked') {
    return <RedFlagPanel result={result} />;
  }
  if (result.kind === 'kill_switch' || result.kind === 'error') {
    return (
      <div className="px-8 py-10">
        <div className="rounded-xl border border-border bg-muted/30 p-5 text-[14px]">
          <div className="font-semibold">
            {result.kind === 'kill_switch' ? 'System paused' : 'Something went wrong'}
          </div>
          <div className="mt-1 text-muted-foreground">{result.message}</div>
        </div>
      </div>
    );
  }
  return (
    <VerifiedPanel
      result={result}
      onReset={onReset}
      onRegenerate={onRegenerate}
      scenario={scenario}
    />
  );
}

function VerifiedPanel({
  result,
  onReset,
  onRegenerate,
  scenario,
}: {
  result: VerifySuccess;
  onReset: () => void;
  onRegenerate?: () => void;
  scenario?: 'healthcare' | 'government';
}) {
  const [highlight, setHighlight] = React.useState<HighlightSelection | null>(null);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
        <div className="space-y-4 px-8 py-7">
          <StatusChips
            report={result.report}
            audit_log_id={result.audit_log_id}
            latency_ms={result.latency_ms}
            drafted={result.draft_metadata !== null}
          />

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Verified article
              </h3>
              <span className="text-[11px] text-muted-foreground">
                {wordCount(result.verified_article).toLocaleString()} words
              </span>
            </div>
            <AnnotatedArticle
              paragraphs={result.paragraphs}
              disclaimerInjected={result.report.disclaimer_injected}
              highlight={highlight}
              setHighlight={setHighlight}
              scenario={scenario}
            />
          </div>

          <SourcesList
            citations={result.citations}
            paragraphs={result.paragraphs}
            highlight={highlight}
            setHighlight={setHighlight}
          />

          <ActionBar
            article={result.verified_article}
            auditLogId={result.audit_log_id}
            scenario={scenario}
            onReset={onReset}
            onRegenerate={onRegenerate}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

function RedFlagPanel({ result }: { result: VerifyRedFlag }) {
  return (
    <div className="px-8 py-10 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div className="rounded-xl border-2 border-red-500 bg-red-50 p-5 dark:bg-red-950/30">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-red-900 dark:text-red-200">
          <AlertTriangle className="h-5 w-5" />
          Blocked: medical red flag detected ({result.category})
        </div>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-red-900 dark:text-red-200">
          {result.message}
        </pre>
        <p className="mt-4 text-[11px] text-red-800 dark:text-red-300">
          Audit #{result.audit_log_id} · {result.latency_ms}ms
        </p>
      </div>
      <p className="mt-4 px-1 text-[12.5px] leading-relaxed text-muted-foreground">
        AssuredAI auto-blocks content that contains medical-emergency language and surfaces the
        appropriate hotline. To publish content that <em>references</em> emergency symptoms (for
        example, a patient education article on heart-attack warning signs), use third-person
        framing instead of urgency language and re-run the check.
      </p>
    </div>
  );
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

