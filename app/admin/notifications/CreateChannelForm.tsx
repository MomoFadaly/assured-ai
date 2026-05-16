'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';

const EVENTS = [
  { id: 'monitor_finding', label: 'monitor_finding (site scan flagged a page)' },
  { id: 'red_flag_escalation', label: 'red_flag_escalation (emergency content detected)' },
  { id: 'kill_switch_engaged', label: 'kill_switch_engaged' },
  { id: 'kill_switch_disengaged', label: 'kill_switch_disengaged' },
  { id: 'scan_failed', label: 'scan_failed (monitor run errored)' },
  { id: 'inbound_lead', label: 'inbound_lead (new demo / sales request from marketing site)' },
] as const;

const SEVERITIES = [
  { id: '', label: 'Any severity' },
  { id: 'low', label: 'Low and above' },
  { id: 'medium', label: 'Medium and above' },
  { id: 'high', label: 'High and above' },
  { id: 'critical', label: 'Critical only' },
] as const;

type Kind = 'slack' | 'email' | 'webhook';

export function CreateChannelForm({ packs }: { packs: Array<{ slug: string; name: string }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>('slack');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const form = new FormData(e.currentTarget);
        const events = EVENTS.map((ev) => ev.id).filter(
          (ev) => form.get(`event:${ev}`) === 'on',
        );
        const pack_slugs = packs
          .map((p) => p.slug)
          .filter((slug) => form.get(`pack:${slug}`) === 'on');
        const sev = String(form.get('min_severity') ?? '');
        const body: Record<string, unknown> = {
          name: String(form.get('name') ?? '').trim(),
          kind,
          subscribed_events: events,
          min_severity: sev === '' ? null : sev,
          pack_slugs,
          enabled: true,
        };
        if (kind === 'slack') body.slack_webhook_url = String(form.get('slack_webhook_url') ?? '').trim();
        if (kind === 'email') body.email_to = String(form.get('email_to') ?? '').trim();
        if (kind === 'webhook') {
          body.webhook_url = String(form.get('webhook_url') ?? '').trim();
          const sec = String(form.get('webhook_secret') ?? '').trim();
          if (sec) body.webhook_secret = sec;
        }
        start(async () => {
          try {
            const r = await fetch('/api/admin/notifications', {
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
      <Field label="Display name" required>
        <input
          name="name"
          required
          placeholder="Editorial Slack — #ai-compliance"
          className="form-input"
        />
      </Field>
      <Field label="Kind">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className="form-input"
        >
          <option value="slack">Slack incoming webhook</option>
          <option value="email">Email</option>
          <option value="webhook">Generic outbound webhook (HMAC)</option>
        </select>
      </Field>

      {kind === 'slack' && (
        <Field
          label="Slack webhook URL"
          required
          className="md:col-span-2"
          hint="From Slack → App → Incoming Webhooks."
        >
          <input
            name="slack_webhook_url"
            required
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            className="form-input"
          />
        </Field>
      )}

      {kind === 'email' && (
        <Field label="Recipient email" required className="md:col-span-2">
          <input
            name="email_to"
            required
            type="email"
            placeholder="ops@example.com"
            className="form-input"
          />
        </Field>
      )}

      {kind === 'webhook' && (
        <>
          <Field label="Webhook URL" required>
            <input
              name="webhook_url"
              required
              type="url"
              placeholder="https://example.com/hooks/assuredai"
              className="form-input"
            />
          </Field>
          <Field
            label="HMAC secret (optional)"
            hint="If set, we sign each request as X-AssuredAI-Signature: sha256=…"
          >
            <input
              name="webhook_secret"
              type="password"
              placeholder="leave blank for unsigned"
              className="form-input"
            />
          </Field>
        </>
      )}

      <Field label="Events" className="md:col-span-1" hint="Empty = all events.">
        <div className="space-y-1.5">
          {EVENTS.map((ev) => (
            <label key={ev.id} className="flex items-start gap-2 text-[12.5px]">
              <input type="checkbox" name={`event:${ev.id}`} className="mt-0.5" />
              <span>{ev.label}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Filters" className="md:col-span-1">
        <select name="min_severity" defaultValue="" className="form-input">
          {SEVERITIES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="mt-3 space-y-1.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
            Pack restriction (empty = all)
          </div>
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

      <div className="md:col-span-2 flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add channel
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
