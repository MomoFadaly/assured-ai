'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';

const SCHEDULES = ['manual', 'hourly', 'daily', 'weekly'] as const;

interface PackSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  compliance_framework: string | null;
}

export function AddSiteForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [packs, setPacks] = useState<PackSummary[] | null>(null);

  useEffect(() => {
    fetch('/api/packs', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { packs: PackSummary[] }) => setPacks(data.packs))
      .catch(() => setPacks([]));
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const form = new FormData(e.currentTarget);
        const body = {
          name: String(form.get('name') ?? '').trim(),
          url: String(form.get('url') ?? '').trim(),
          vertical_pack_id: String(form.get('vertical_pack_id') ?? '').trim() || undefined,
          schedule: String(form.get('schedule') ?? 'manual'),
          sitemap_url: emptyToNull(String(form.get('sitemap_url') ?? '').trim()),
          max_pages: Number(form.get('max_pages') ?? 100),
          include_paths: splitLines(String(form.get('include_paths') ?? '')),
          exclude_paths: splitLines(String(form.get('exclude_paths') ?? '')),
          enabled: true,
        };
        start(async () => {
          try {
            const r = await fetch('/api/admin/monitor/sites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            if (!r.ok) {
              const t = await r.text();
              throw new Error(t || `HTTP ${r.status}`);
            }
            const created = (await r.json()) as { id: string };
            router.push(`/admin/monitor/${created.id}`);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed.');
          }
        });
      }}
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
    >
      <Field label="Display name" required>
        <input
          name="name"
          required
          placeholder="Acme Health — public site"
          className="form-input"
        />
      </Field>
      <Field label="Site root URL" required>
        <input
          name="url"
          type="url"
          required
          placeholder="https://example.com"
          className="form-input"
        />
      </Field>
      <Field label="Vertical pack" required hint={packs === null ? 'Loading…' : `${packs.length} active`}>
        <select name="vertical_pack_id" required className="form-input">
          {packs === null && <option value="">Loading…</option>}
          {packs && packs.length === 0 && <option value="">No packs available</option>}
          {packs &&
            packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.compliance_framework ? ` · ${p.compliance_framework}` : ''}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Schedule">
        <select name="schedule" defaultValue="manual" className="form-input">
          {SCHEDULES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Sitemap URL (optional)"
        hint="Defaults to /sitemap.xml at the site root."
      >
        <input
          name="sitemap_url"
          type="url"
          placeholder="https://example.com/sitemap.xml"
          className="form-input"
        />
      </Field>
      <Field label="Max pages" hint="Cap on URLs discovered per scan.">
        <input
          name="max_pages"
          type="number"
          min={1}
          max={5000}
          defaultValue={100}
          className="form-input"
        />
      </Field>
      <Field
        label="Include patterns (one regex per line, optional)"
        hint="When set, only URLs matching at least one pattern are scanned."
        className="md:col-span-1"
      >
        <textarea
          name="include_paths"
          rows={3}
          placeholder={'/blog/\n/articles/'}
          className="form-input"
        />
      </Field>
      <Field
        label="Exclude patterns (one regex per line, optional)"
        hint="URLs matching any pattern are skipped."
        className="md:col-span-1"
      >
        <textarea
          name="exclude_paths"
          rows={3}
          placeholder={'/admin/\n\\?print=1'}
          className="form-input"
        />
      </Field>

      {error && (
        <div className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-[12.5px] text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="md:col-span-2 flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={pending || packs === null || (packs?.length ?? 0) === 0}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background hover:opacity-90 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add site & open
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
  required,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="[&_.form-input]:h-10 [&_.form-input]:w-full [&_.form-input]:rounded-md [&_.form-input]:border [&_.form-input]:border-border [&_.form-input]:bg-background [&_.form-input]:px-3 [&_.form-input]:text-[13px] [&_.form-input]:focus:border-foreground [&_.form-input]:focus:outline-none [&_textarea.form-input]:h-auto [&_textarea.form-input]:py-2 [&_textarea.form-input]:font-mono [&_textarea.form-input]:text-[12px]">
        {children}
      </div>
    </label>
  );
}

function splitLines(s: string): string[] | null {
  const arr = s
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return arr.length === 0 ? null : arr;
}

function emptyToNull(s: string): string | null {
  return s.length === 0 ? null : s;
}
