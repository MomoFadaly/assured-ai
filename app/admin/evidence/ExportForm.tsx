'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2, ShieldCheck } from 'lucide-react';
import { ALL_EVIDENCE_TABLES, type EvidenceTable } from '@/lib/evidence/constants';

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  is_default: boolean;
}

const TABLE_LABELS: Record<EvidenceTable, string> = {
  audit_log: 'Audit log (hash-chained)',
  admin_actions: 'Admin actions',
  notification_deliveries: 'Notification deliveries',
  usage_events: 'Usage / cost events',
  monitor_findings: 'Site monitor findings',
  monitor_scan_runs: 'Monitor scan runs',
  login_history: 'Sign-in history',
  api_keys: 'API key inventory',
  teammate_invites: 'Teammate invites',
  anomaly_events: 'Anomaly events',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function ExportForm({ tenants }: { tenants: TenantSummary[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [windowStart, setWindowStart] = useState(daysAgoStr(30));
  const [windowEnd, setWindowEnd] = useState(today());
  const [tenantId, setTenantId] = useState<string>('all');
  const [tables, setTables] = useState<Set<EvidenceTable>>(() => new Set(ALL_EVIDENCE_TABLES));

  function toggle(t: EvidenceTable) {
    setTables((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function buildAndDownload() {
    setError(null);
    if (tables.size === 0) {
      setError('Pick at least one table.');
      return;
    }
    const body = {
      tenant_id: tenantId === 'all' ? null : tenantId,
      window_start: windowStart,
      window_end: windowEnd,
      include_tables: Array.from(tables),
    };
    start(async () => {
      try {
        const r = await fetch('/api/admin/evidence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        const exportId = r.headers.get('X-AssuredAI-Export-Id') ?? 'evidence';
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assuredai-evidence-${exportId}.bundle.gz`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed.');
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Window start (inclusive)">
          <input
            type="date"
            value={windowStart}
            max={windowEnd}
            onChange={(e) => setWindowStart(e.target.value)}
            className="form-input"
          />
        </Field>
        <Field label="Window end (inclusive)">
          <input
            type="date"
            value={windowEnd}
            min={windowStart}
            max={today()}
            onChange={(e) => setWindowEnd(e.target.value)}
            className="form-input"
          />
        </Field>
        <Field label="Tenant">
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="form-input"
          >
            <option value="all">All tenants (platform-wide)</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.is_default ? ' · default' : ''}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
          Include tables ({tables.size} / {ALL_EVIDENCE_TABLES.length})
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_EVIDENCE_TABLES.map((t) => {
            const on = tables.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggle(t)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-[12.5px] font-medium transition-colors ${
                  on
                    ? 'border-primary bg-primary/[0.06] text-primary'
                    : 'border-border bg-card text-foreground/70 hover:bg-accent/30'
                }`}
              >
                <span
                  className={`flex size-4 items-center justify-center rounded ${
                    on ? 'bg-primary text-primary-foreground' : 'bg-foreground/5'
                  }`}
                  aria-hidden
                >
                  {on ? '✓' : ''}
                </span>
                {TABLE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/[0.06] px-3 py-2 text-[12.5px] text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Bundle is gzip + sha256-signed in headers. Every pull is audit-logged.
        </div>
        <button
          type="button"
          onClick={buildAndDownload}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Build evidence pack
        </button>
      </div>

      <style jsx>{`
        :global(.form-input) {
          display: block;
          width: 100%;
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          font-size: 13px;
        }
        :global(.form-input:focus) {
          outline: none;
          border-color: hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
        {label}
      </div>
      {children}
    </label>
  );
}
