'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Check, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { acknowledgeAnomalyAction } from './actions';

interface Anomaly {
  id: string;
  tenant_id: string | null;
  kind: string;
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  detail: Record<string, unknown>;
  window_start: Date;
  window_end: Date;
  acknowledged_at: Date | null;
  acknowledged_by: string | null;
  created_at: Date;
}

const SEVERITY_TONE: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 ring-red-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  info: 'bg-slate-50 text-slate-700 ring-slate-200',
};

export function AnomaliesTable({
  rows,
  focusId,
}: {
  rows: Anomaly[];
  focusId: string | null;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(focusId ? [focusId] : []),
  );
  const focusRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    if (focusId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusId]);

  if (rows.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">
        No anomalies detected. Either everything is healthy or the cron hasn&rsquo;t fired yet —
        click the manual scan button above to verify.
      </div>
    );
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-[12.5px]">
        <thead className="bg-muted/30 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foreground/65">
          <tr>
            <th className="w-6 px-4 py-3" />
            <th className="px-4 py-3 text-left">Detected</th>
            <th className="px-4 py-3 text-left">Severity</th>
            <th className="px-4 py-3 text-left">Kind</th>
            <th className="px-4 py-3 text-left">Summary</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const open = expanded.has(r.id);
            const isFocus = focusId === r.id;
            return (
              <RowWithDetail
                key={r.id}
                row={r}
                open={open}
                onToggle={() => toggle(r.id)}
                isFocus={isFocus}
                ref={isFocus ? focusRef : undefined}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { forwardRef } from 'react';

const RowWithDetail = forwardRef<
  HTMLTableRowElement,
  { row: Anomaly; open: boolean; onToggle: () => void; isFocus: boolean }
>(function RowWithDetail({ row, open, onToggle, isFocus }, ref) {
  return (
    <>
      <tr
        ref={ref}
        onClick={onToggle}
        className={`cursor-pointer hover:bg-accent/40 ${isFocus ? 'bg-blue-50/40' : ''}`}
      >
        <td className="px-4 py-3 align-top">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </td>
        <td className="px-4 py-3 align-top text-foreground/85">
          {new Date(row.created_at).toLocaleString()}
        </td>
        <td className="px-4 py-3 align-top">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] ring-1 ${
              SEVERITY_TONE[row.severity] ?? SEVERITY_TONE.info
            }`}
          >
            {row.severity}
          </span>
        </td>
        <td className="px-4 py-3 align-top font-mono text-[11px] text-foreground/80">
          {row.kind}
        </td>
        <td className="px-4 py-3 align-top text-foreground/85">{row.summary}</td>
        <td className="px-4 py-3 align-top">
          {row.acknowledged_at ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-emerald-700 ring-1 ring-emerald-200">
              <Check className="h-3 w-3" /> ack
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-blue-700 ring-1 ring-blue-200">
              open
            </span>
          )}
        </td>
      </tr>
      {open && <DetailRow row={row} />}
    </>
  );
});

function DetailRow({ row }: { row: Anomaly }) {
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  function ack() {
    setError(null);
    const fd = new FormData();
    fd.set('id', row.id);
    fd.set('notes', notes);
    start(async () => {
      const res = await acknowledgeAnomalyAction(fd);
      if (!res.ok) setError(res.error ?? 'Failed.');
    });
  }

  return (
    <tr className="bg-muted/15">
      <td />
      <td colSpan={5} className="px-4 py-5">
        <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3 text-[12.5px] leading-relaxed">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Window
              </div>
              <div className="font-mono text-[11.5px] text-foreground/80">
                {new Date(row.window_start).toLocaleString()}
                {' → '}
                {new Date(row.window_end).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Detail (raw JSON)
              </div>
              <pre className="mt-1 overflow-x-auto rounded bg-muted/40 p-3 font-mono text-[11px]">
                {JSON.stringify(row.detail, null, 2)}
              </pre>
            </div>
            {row.tenant_id && (
              <div className="text-[11.5px] text-muted-foreground">
                Tenant: <span className="font-mono">{row.tenant_id}</span>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Acknowledge
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="What did you find? Link to thread, runbook, ticket…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[12.5px] focus:border-foreground focus:outline-none"
            />
            {error && (
              <p className="text-[11.5px] text-red-700 dark:text-red-300">{error}</p>
            )}
            <button
              type="button"
              onClick={ack}
              disabled={pending || !!row.acknowledged_at}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-foreground px-3 text-[12.5px] font-semibold text-background hover:opacity-90 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {row.acknowledged_at ? 'Already acknowledged' : 'Acknowledge'}
            </button>
            {row.acknowledged_at && (
              <p className="text-[11px] text-muted-foreground">
                Acknowledged {new Date(row.acknowledged_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
