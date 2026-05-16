'use client';

import { useState, useTransition } from 'react';
import { Loader2, Play } from 'lucide-react';
import { runAnomalyScanAction } from './actions';
import type { ScanReport } from '@/lib/anomaly';

export function AnomalyManualScan() {
  const [pending, start] = useTransition();
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  function trigger() {
    setError(null);
    start(async () => {
      const r = await runAnomalyScanAction();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setReport(r.data ?? null);
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={trigger}
        disabled={pending}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background hover:opacity-90 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Run anomaly scan now
      </button>
      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/[0.06] px-3 py-2 text-[12.5px] text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {report && (
        <div className="rounded-md border border-border bg-card p-4 text-[12.5px] leading-relaxed">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Scan report · {new Date(report.scanned_at).toLocaleString()}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Detected" value={report.detected} />
            <Stat label="Inserted" value={report.inserted} />
            <Stat label="Skipped dup." value={report.skipped_duplicate} />
            <Stat label="Notified" value={report.notified} />
          </div>
          {report.anomalies.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {report.anomalies.map((a, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ring-1 ${
                      a.severity === 'critical'
                        ? 'bg-red-50 text-red-700 ring-red-200'
                        : a.severity === 'warning'
                          ? 'bg-amber-50 text-amber-800 ring-amber-200'
                          : 'bg-slate-50 text-slate-700 ring-slate-200'
                    }`}
                  >
                    {a.severity}
                  </span>
                  <span className="font-mono text-[11px] text-foreground/65">{a.kind}</span>
                  <span className="text-foreground/85">{a.summary}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/30 px-3 py-2">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-[20px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}
