'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, Loader2, Plus, KeyRound } from 'lucide-react';

const SCOPES = [
  { id: 'verify', label: 'verify — POST /api/verify + /api/suggest-fix' },
  { id: 'monitor:read', label: 'monitor:read — read scan + finding state' },
  { id: 'monitor:trigger', label: 'monitor:trigger — trigger site scans' },
] as const;

export function CreateKeyForm({ packs }: { packs: Array<{ slug: string; name: string }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ plaintext: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setIssued(null);
    setError(null);
    setCopied(false);
  }

  if (issued) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900">
          <div className="font-semibold">Key issued.</div>
          <div className="mt-0.5 text-[12px] text-emerald-900/80">
            Copy it now — for security, AssuredAI never shows it again. Store it in your
            secret manager.
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 font-mono text-[12.5px]">
          <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 break-all">{issued.plaintext}</span>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(issued.plaintext);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11.5px] font-medium hover:bg-accent"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12.5px] font-medium hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          Issue another key
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const form = new FormData(e.currentTarget);
        const scopes = SCOPES.map((s) => s.id).filter((s) => form.get(`scope:${s}`) === 'on');
        const allowed_pack_slugs = packs
          .map((p) => p.slug)
          .filter((slug) => form.get(`pack:${slug}`) === 'on');
        const body = {
          name: String(form.get('name') ?? '').trim(),
          description: String(form.get('description') ?? '').trim() || undefined,
          scopes: scopes.length > 0 ? scopes : ['verify'],
          allowed_pack_slugs,
        };
        start(async () => {
          try {
            const r = await fetch('/api/admin/api-keys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            if (!r.ok) {
              const t = await r.text();
              throw new Error(t || `HTTP ${r.status}`);
            }
            const data = (await r.json()) as { plaintext: string; prefix: string };
            setIssued(data);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed.');
          }
        });
      }}
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
    >
      <Field label="Display name" required hint="e.g. 'WordPress production' or 'Editorial Slack bot'">
        <input
          name="name"
          required
          placeholder="WordPress production"
          className="form-input"
        />
      </Field>
      <Field label="Description (optional)">
        <input
          name="description"
          placeholder="Internal note for ops"
          className="form-input"
        />
      </Field>
      <Field label="Scopes" className="md:col-span-1" hint="At least one required.">
        <div className="space-y-1.5">
          {SCOPES.map((s) => (
            <label key={s.id} className="flex items-start gap-2 text-[12.5px]">
              <input
                type="checkbox"
                name={`scope:${s.id}`}
                defaultChecked={s.id === 'verify'}
                className="mt-0.5"
              />
              <span>{s.label}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Pack restrictions" className="md:col-span-1" hint="Leave all unchecked = no restriction.">
        <div className="space-y-1.5">
          {packs.map((p) => (
            <label key={p.slug} className="flex items-center gap-2 text-[12.5px]">
              <input type="checkbox" name={`pack:${p.slug}`} />
              <span>{p.name}</span>
              <code className="ml-1 text-[10.5px] text-muted-foreground">{p.slug}</code>
            </label>
          ))}
        </div>
      </Field>
      {error && (
        <div className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-[12.5px] text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
      <div className="md:col-span-2 flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Issue key
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
