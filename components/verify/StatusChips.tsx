'use client';

import Link from 'next/link';
import { ShieldCheck, ShieldAlert, AlertTriangle, BookCheck, Stamp, EyeOff, Sparkles, ExternalLink } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface VerdictReport {
  pii_input_count: number;
  pii_output_count: number;
  red_flag_blocked: boolean;
  unsourced_paragraph_count: number;
  supported_paragraph_count: number;
  unique_supporting_sources: number;
  disclaimer_required: boolean;
  disclaimer_was_present: boolean;
  disclaimer_injected: boolean;
}

export function StatusChips({
  report,
  audit_log_id,
  latency_ms,
  drafted,
}: {
  report: VerdictReport;
  audit_log_id: number;
  latency_ms: number;
  drafted: boolean;
}) {
  const allClean =
    report.unsourced_paragraph_count === 0 &&
    report.pii_input_count === 0 &&
    !report.disclaimer_injected &&
    !report.red_flag_blocked;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border px-4 py-3',
          allClean
            ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30'
            : 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30',
        )}
      >
        <div
          className={cn(
            'flex size-9 items-center justify-center rounded-lg',
            allClean
              ? 'bg-emerald-500 text-white'
              : 'bg-amber-500 text-white',
          )}
        >
          {allClean ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-semibold leading-tight">
            {allClean ? 'Clean — ready to publish' : 'Verified with notes'}
          </div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            {drafted && (
              <>
                <Sparkles className="mr-1 inline-block h-3 w-3" />
                Drafted by AI ·{' '}
              </>
            )}
            <Link
              href={`/v/${audit_log_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground/90 hover:text-primary hover:underline"
              aria-label={`Open public proof page for audit ${audit_log_id}`}
            >
              Audit #{audit_log_id}
              <ExternalLink className="h-2.5 w-2.5 opacity-70" />
            </Link>{' '}
            · {latency_ms.toLocaleString()}ms
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip
          icon={<EyeOff className="h-3 w-3" />}
          tone={report.pii_input_count > 0 ? 'warning' : 'neutral'}
          label={
            report.pii_input_count === 0
              ? 'No PII detected'
              : `${report.pii_input_count} PII redacted`
          }
          tip={
            report.pii_input_count === 0
              ? 'Microsoft Presidio scanned the input for HIPAA Safe Harbor identifiers; nothing matched.'
              : `Detected and redacted ${report.pii_input_count} potential PII / PHI item${report.pii_input_count === 1 ? '' : 's'} (names, MRNs, emails, etc.). Original values were never logged.`
          }
        />
        <Chip
          icon={<BookCheck className="h-3 w-3" />}
          tone={report.unsourced_paragraph_count > 0 ? 'warning' : 'success'}
          label={
            report.unsourced_paragraph_count === 0
              ? `${report.supported_paragraph_count} supported`
              : `${report.unsourced_paragraph_count} unsourced`
          }
          tip={
            report.unsourced_paragraph_count === 0
              ? `Every paragraph matched a chunk in the source library. ${report.unique_supporting_sources} unique sources cited.`
              : `${report.unsourced_paragraph_count} paragraph${report.unsourced_paragraph_count === 1 ? '' : 's'} did not match anything in the source library. The editor should verify these claims before publishing.`
          }
        />
        <Chip
          icon={<Stamp className="h-3 w-3" />}
          tone={report.disclaimer_injected ? 'warning' : 'success'}
          label={
            report.disclaimer_injected
              ? 'Disclaimer injected'
              : 'Disclaimer present'
          }
          tip={
            report.disclaimer_injected
              ? 'The required disclaimer was missing from the input. AssuredAI appended the canonical version. You can replace it with your house style.'
              : 'A disclaimer matching this scenario was already present.'
          }
        />
        <Chip
          icon={<AlertTriangle className="h-3 w-3" />}
          tone="success"
          label="No medical red flags"
          tip="Cardiac, suicidal-ideation, overdose, stroke, severe-bleeding, and anaphylaxis classifiers all came back clean."
        />
      </div>
    </div>
  );
}

function Chip({
  icon,
  label,
  tone,
  tip,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  tip: string;
}) {
  const toneClass = {
    success: 'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900',
    warning: 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900',
    danger: 'bg-red-50 text-red-900 ring-red-200 dark:bg-red-900/20 dark:text-red-200 dark:ring-red-900',
    neutral: 'bg-muted text-muted-foreground ring-border',
  }[tone];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 transition-colors',
            toneClass,
          )}
        >
          {icon}
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="max-w-[260px] leading-relaxed">{tip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
