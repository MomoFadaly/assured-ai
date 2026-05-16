'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Power, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KillSwitchToggle({
  engaged,
  reason,
  engagedAt,
}: {
  engaged: boolean;
  reason: string | null;
  engagedAt: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState('');

  function submit(nextEngaged: boolean) {
    setError(null);
    start(async () => {
      try {
        const r = await fetch('/api/admin/kill-switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engaged: nextEngaged,
            reason: nextEngaged ? reasonDraft || null : null,
          }),
        });
        if (!r.ok) {
          const body = await r.text();
          throw new Error(body || `HTTP ${r.status}`);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed.');
      }
    });
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border px-3 py-2.5 text-[13px] font-medium',
          engaged
            ? 'border-red-200 bg-red-50 text-red-800'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800',
        )}
      >
        <Power className="h-4 w-4" />
        {engaged ? 'Kill switch ENGAGED' : 'System live'}
      </div>

      {engaged ? (
        <div className="space-y-2">
          {reason && (
            <div className="rounded-md bg-muted/30 px-3 py-2 text-[12.5px] text-foreground/80">
              <span className="font-semibold">Reason: </span>
              {reason}
            </div>
          )}
          {engagedAt && (
            <div className="text-[11.5px] text-muted-foreground">
              Engaged at {new Date(engagedAt).toLocaleString()}
            </div>
          )}
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={pending}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-[13px] font-medium text-foreground hover:bg-accent disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Disengage kill switch
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
            Reason (optional but recommended)
          </label>
          <input
            type="text"
            value={reasonDraft}
            onChange={(e) => setReasonDraft(e.target.value)}
            placeholder="e.g. Investigating spike in unsourced answers"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] focus:border-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={pending}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            <AlertTriangle className="h-4 w-4" />
            Engage kill switch
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-[12.5px] text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
