'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';

const REGIONS = [
  { v: 'us-east-1', l: 'US East (Virginia)' },
  { v: 'us-west-2', l: 'US West (Oregon)' },
  { v: 'eu-central-1', l: 'EU Central (Frankfurt)' },
  { v: 'ap-southeast-2', l: 'AP Southeast (Sydney)' },
] as const;

type Region = (typeof REGIONS)[number]['v'];

export function TenantSettingsForm({
  tenantId,
  initial,
  isDefault,
}: {
  tenantId: string;
  initial: {
    name: string;
    description: string;
    region: string;
    audit_retention_days: number;
    allowed_regions: string[];
    is_active: boolean;
  };
  isDefault: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [region, setRegion] = useState<Region>(
    (initial.region as Region) ?? 'us-east-1',
  );
  const [retention, setRetention] = useState(initial.audit_retention_days);
  const [allowed, setAllowed] = useState<Set<Region>>(
    () => new Set((initial.allowed_regions as Region[]) ?? ['us-east-1']),
  );
  const [active, setActive] = useState(initial.is_active);

  function toggleAllowed(r: Region) {
    setAllowed((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      // Always retain at least the current region.
      next.add(region);
      return next;
    });
  }

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      try {
        const r = await fetch(`/api/admin/tenants/${tenantId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            region,
            audit_retention_days: retention,
            allowed_regions: Array.from(allowed),
            is_active: active,
          }),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed.');
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Display name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            disabled={isDefault}
          />
        </Field>
        <Field label="Description">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input"
          />
        </Field>
        <Field label="Current region" hint="Where this tenant's data lives today.">
          <select
            value={region}
            onChange={(e) => {
              const v = e.target.value as Region;
              setRegion(v);
              setAllowed((prev) => new Set([...prev, v]));
            }}
            className="form-input"
          >
            {REGIONS.map((r) => (
              <option key={r.v} value={r.v}>
                {r.l}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Hot-storage retention (days)"
          hint="Default 2,555 (7y HIPAA). Older audit rows are archived to cold storage."
        >
          <input
            type="number"
            min={30}
            max={36500}
            value={retention}
            onChange={(e) => setRetention(parseInt(e.target.value, 10) || 0)}
            className="form-input"
          />
        </Field>
      </div>

      <Field label="Allowed regions (for future cross-region moves)">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REGIONS.map((r) => {
            const on = allowed.has(r.v);
            return (
              <button
                key={r.v}
                type="button"
                onClick={() => toggleAllowed(r.v)}
                className={`rounded-md border px-3 py-2 text-left text-[12px] font-medium transition-colors ${
                  on
                    ? 'border-primary bg-primary/[0.06] text-primary'
                    : 'border-border bg-card text-foreground/70 hover:bg-accent/30'
                }`}
              >
                {r.l}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Tenant status">
        <label className="inline-flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={isDefault}
          />
          Active
        </label>
        {isDefault && (
          <span className="ml-2 text-[11px] text-muted-foreground">
            (default tenant cannot be disabled)
          </span>
        )}
      </Field>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/[0.06] px-3 py-2 text-[12.5px] text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {saved && !error && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/[0.06] px-3 py-2 text-[12.5px] text-emerald-800 dark:text-emerald-200">
          Saved.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
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
        :global(.form-input:disabled) {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
          {label}
        </span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
