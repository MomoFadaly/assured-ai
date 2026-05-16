'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Play } from 'lucide-react';

interface ScanResult {
  runId: string;
  status: string;
  pagesDiscovered: number;
  pagesScanned: number;
  pagesSkippedUnchanged: number;
  pagesFailed: number;
  newFindings: number;
  durationMs: number;
}

export function RunScanButton({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => {
          setError(null);
          start(async () => {
            try {
              const r = await fetch(`/api/admin/monitor/sites/${siteId}/scan`, {
                method: 'POST',
              });
              if (!r.ok) {
                const t = await r.text();
                throw new Error(t || `HTTP ${r.status}`);
              }
              const data = (await r.json()) as ScanResult;
              setLastResult(data);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Scan failed.');
            }
          });
        }}
        disabled={pending}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {pending ? 'Scanning…' : 'Run scan'}
      </button>
      {lastResult && !pending && (
        <div className="text-[11px] text-muted-foreground">
          {lastResult.pagesScanned} scanned ·{' '}
          {lastResult.newFindings > 0 ? (
            <span className="font-semibold text-amber-700">
              {lastResult.newFindings} new finding{lastResult.newFindings === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="text-emerald-700">no new findings</span>
          )}{' '}
          · {(lastResult.durationMs / 1000).toFixed(1)}s
        </div>
      )}
      {error && (
        <div className="max-w-xs rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
