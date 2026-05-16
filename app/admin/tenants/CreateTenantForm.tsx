'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';

export function CreateTenantForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const form = new FormData(e.currentTarget);
        const body = {
          slug: String(form.get('slug') ?? '').toLowerCase().trim(),
          name: String(form.get('name') ?? '').trim(),
          description: String(form.get('description') ?? '').trim() || undefined,
          deployment_kind: String(form.get('deployment_kind') ?? 'cloud') as 'cloud' | 'self-host',
        };
        start(async () => {
          try {
            const r = await fetch('/api/admin/tenants', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            if (!r.ok) {
              const t = await r.text();
              throw new Error(t || `HTTP ${r.status}`);
            }
            (e.target as HTMLFormElement).reset();
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed.');
          }
        });
      }}
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
    >
      <Field label="Slug" required hint="Lowercase, digits, hyphens only.">
        <input
          name="slug"
          required
          pattern="[a-z0-9-]+"
          placeholder="vida-health"
          className="form-input"
        />
      </Field>
      <Field label="Display name" required>
        <input name="name" required placeholder="Vida Health" className="form-input" />
      </Field>
      <Field label="Description (optional)" className="md:col-span-2">
        <input
          name="description"
          placeholder="Cloud-managed AssuredAI workspace for Vida Health."
          className="form-input"
        />
      </Field>
      <Field label="Deployment kind">
        <select name="deployment_kind" defaultValue="cloud" className="form-input">
          <option value="cloud">Cloud (shared infra)</option>
          <option value="self-host">Self-host (client VPC)</option>
        </select>
      </Field>
      {error && (
        <div className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-[12.5px] text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
      <div className="md:col-span-2 flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add tenant
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
      <div className="[&_.form-input]:h-10 [&_.form-input]:w-full [&_.form-input]:rounded-md [&_.form-input]:border [&_.form-input]:border-border [&_.form-input]:bg-background [&_.form-input]:px-3 [&_.form-input]:text-[13px] [&_.form-input]:focus:border-foreground [&_.form-input]:focus:outline-none">
        {children}
      </div>
    </label>
  );
}
