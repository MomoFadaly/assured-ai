'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../_components/Card';
import type { MonitorFindingRow } from '@/lib/admin/queries';

export function FindingRow({ finding }: { finding: MonitorFindingRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setStatus(status: 'acknowledged' | 'resolved' | 'dismissed' | 'new') {
    setError(null);
    start(async () => {
      try {
        const r = await fetch(`/api/admin/monitor/findings/${finding.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || `HTTP ${r.status}`);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed.');
      }
    });
  }

  return (
    <div className="bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-accent/30"
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <StatusBadge status={finding.status} />
            <span className="text-[11.5px] text-muted-foreground">
              {formatDistanceToNow(new Date(finding.scanned_at), { addSuffix: true })}
            </span>
            {finding.audit_log_id && (
              <span className="font-mono text-[11px] text-muted-foreground">
                · audit #{finding.audit_log_id}
              </span>
            )}
          </div>
          <div className="text-[13.5px] font-medium text-foreground truncate">{finding.summary}</div>
          <a
            href={finding.page_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex w-fit items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
          >
            {finding.page_url}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </button>

      {open && (
        <div className="border-t border-border/60 bg-muted/10 px-5 py-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] md:grid-cols-4">
            <Detail label="PHI/PII detected" value={finding.pii_count} accent={finding.pii_count > 0} />
            <Detail
              label="Unsourced paragraphs"
              value={finding.unsourced_count}
              accent={finding.unsourced_count > 0}
            />
            <Detail label="Supported paragraphs" value={finding.supported_count} />
            <Detail
              label="Disclaimer"
              value={finding.disclaimer_missing ? 'missing' : 'present'}
              accent={finding.disclaimer_missing}
            />
          </div>
          {finding.red_flag_category && (
            <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-[12.5px] text-red-800 ring-1 ring-red-200">
              <span className="font-semibold uppercase tracking-[0.06em]">Red flag · </span>
              {finding.red_flag_category}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {finding.audit_log_id && (
              <Link
                href={`/v/${finding.audit_log_id}`}
                target="_blank"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:bg-accent"
              >
                <Eye className="h-3.5 w-3.5" />
                Open proof URL
              </Link>
            )}
            {finding.status === 'new' && (
              <button
                type="button"
                onClick={() => setStatus('acknowledged')}
                disabled={pending}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:bg-accent disabled:opacity-60"
              >
                Acknowledge
              </button>
            )}
            {(finding.status === 'new' || finding.status === 'acknowledged') && (
              <>
                <button
                  type="button"
                  onClick={() => setStatus('resolved')}
                  disabled={pending}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-3 text-[12px] font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resolve
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('dismissed')}
                  disabled={pending}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:bg-accent disabled:opacity-60"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Dismiss
                </button>
              </>
            )}
            {(finding.status === 'resolved' || finding.status === 'dismissed') && (
              <button
                type="button"
                onClick={() => setStatus('new')}
                disabled={pending}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:bg-accent disabled:opacity-60"
              >
                Reopen
              </button>
            )}
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          {error && (
            <div className="mt-2 rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div
        className={
          accent ? 'mt-1 font-semibold text-amber-800' : 'mt-1 font-medium text-foreground'
        }
      >
        {value}
      </div>
    </div>
  );
}
