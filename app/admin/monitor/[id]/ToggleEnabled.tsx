'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Power } from 'lucide-react';

export function ToggleEnabled({
  siteId,
  enabled,
}: {
  siteId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    start(async () => {
      try {
        const r = await fetch(`/api/admin/monitor/sites/${siteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: !enabled }),
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
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-[12.5px] font-medium text-foreground hover:bg-accent disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
        {enabled ? 'Pause' : 'Enable'}
      </button>
      {error && (
        <div className="max-w-xs rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
