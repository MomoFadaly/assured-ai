'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import type { LeadType } from '@/lib/leads';

type Pack = 'healthcare' | 'finance' | 'government' | 'legal';
type Plan = 'starter' | 'team' | 'enterprise';
type Segment =
  | 'publisher'
  | 'hospital'
  | 'pharma'
  | 'gov'
  | 'agency'
  | 'finance'
  | 'legal'
  | 'other';

export interface LeadCaptureFormProps {
  leadType: LeadType;
  /** Pre-fill from URL query (?pack=healthcare, ?plan=enterprise). */
  initialPack?: Pack | null;
  initialPlan?: Plan | null;
  /** Toggles whether to show the meeting-time + scheduling helper. */
  showMeetingTime: boolean;
  submitLabel: string;
  successHeadline: string;
  successBody: string;
}

const SEGMENT_OPTIONS: { v: Segment; l: string }[] = [
  { v: 'publisher', l: 'Publisher' },
  { v: 'hospital', l: 'Hospital / health system' },
  { v: 'pharma', l: 'Pharma / medical device' },
  { v: 'finance', l: 'Bank / wealth / fintech' },
  { v: 'gov', l: 'Government' },
  { v: 'legal', l: 'Law firm' },
  { v: 'agency', l: 'Agency / consultancy' },
  { v: 'other', l: 'Other' },
];

const PACK_OPTIONS: { v: Pack; l: string }[] = [
  { v: 'healthcare', l: 'Healthcare' },
  { v: 'finance', l: 'Finance' },
  { v: 'government', l: 'Government' },
  { v: 'legal', l: 'Legal' },
];

const PLAN_OPTIONS: { v: Plan; l: string }[] = [
  { v: 'starter', l: 'Starter' },
  { v: 'team', l: 'Team' },
  { v: 'enterprise', l: 'Enterprise' },
];

const VOLUME_OPTIONS = [
  'Under 100 / month',
  '100–500 / month',
  '500–2,000 / month',
  '2,000–10,000 / month',
  '10,000+ / month',
  'Not sure yet',
];

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function LeadCaptureForm({
  leadType,
  initialPack,
  initialPlan,
  showMeetingTime,
  submitLabel,
  successHeadline,
  successBody,
}: LeadCaptureFormProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [role, setRole] = useState('');
  const [segment, setSegment] = useState<Segment>('publisher');
  const [pack, setPack] = useState<Pack | ''>(initialPack ?? '');
  const [plan, setPlan] = useState<Plan | ''>(initialPlan ?? '');
  const [volume, setVolume] = useState<string>('');
  const [meetingTime, setMeetingTime] = useState('');
  const [message, setMessage] = useState('');

  // Capture UTM params once on mount.
  const [utm, setUtm] = useState<{ source?: string; medium?: string; campaign?: string }>({});
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    setUtm({
      source: sp.get('utm_source') || undefined,
      medium: sp.get('utm_medium') || undefined,
      campaign: sp.get('utm_campaign') || undefined,
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg(null);

    const body = {
      lead_type: leadType,
      name: name.trim(),
      email: email.trim(),
      org: org.trim() || null,
      role: role.trim() || null,
      segment,
      pack_interest: pack || null,
      plan_interest: plan || null,
      volume_estimate: volume || null,
      requested_meeting_time: showMeetingTime ? meetingTime.trim() || null : null,
      message: message.trim() || null,
      utm,
    };

    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Server returned ${r.status}`);
      }
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.06] p-7">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="h-4 w-4" strokeWidth={3} />
          </div>
          <h2 className="text-[20px] font-semibold tracking-tight">{successHeadline}</h2>
        </div>
        <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/80">{successBody}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/chat"
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-[13px] font-medium text-foreground hover:bg-accent"
          >
            Try the verifier in the meantime
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/demo"
            className="inline-flex h-11 items-center gap-1.5 rounded-md px-4 text-[13px] font-medium text-foreground/75 hover:text-foreground"
          >
            Browse showcase verifications
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" required>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            autoComplete="name"
          />
        </Field>
        <Field label="Work email" required>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            autoComplete="email"
          />
        </Field>
        <Field label="Organization">
          <input
            type="text"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            className="input-field"
            autoComplete="organization"
          />
        </Field>
        <Field label="Your role">
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g., Editorial Lead · CISO · Compliance Officer"
            className="input-field"
            autoComplete="organization-title"
          />
        </Field>
      </div>

      <Field label="Who you publish for">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SEGMENT_OPTIONS.map(({ v, l }) => (
            <button
              type="button"
              key={v}
              onClick={() => setSegment(v)}
              className={`rounded-md border px-3 py-2 text-[12.5px] font-medium transition-all ${
                segment === v
                  ? 'border-primary bg-primary/[0.06] text-primary ring-1 ring-primary/30'
                  : 'border-border bg-card text-foreground/75 hover:bg-accent/30'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Vertical pack of interest">
          <div className="grid grid-cols-2 gap-2">
            {PACK_OPTIONS.map(({ v, l }) => (
              <button
                type="button"
                key={v}
                onClick={() => setPack(pack === v ? '' : v)}
                className={`rounded-md border px-3 py-2 text-[12.5px] font-medium transition-all ${
                  pack === v
                    ? 'border-primary bg-primary/[0.06] text-primary ring-1 ring-primary/30'
                    : 'border-border bg-card text-foreground/75 hover:bg-accent/30'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Plan you're sizing">
          <div className="grid grid-cols-3 gap-2">
            {PLAN_OPTIONS.map(({ v, l }) => (
              <button
                type="button"
                key={v}
                onClick={() => setPlan(plan === v ? '' : v)}
                className={`rounded-md border px-3 py-2 text-[12.5px] font-medium transition-all ${
                  plan === v
                    ? 'border-primary bg-primary/[0.06] text-primary ring-1 ring-primary/30'
                    : 'border-border bg-card text-foreground/75 hover:bg-accent/30'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <Field label="Monthly verification volume (estimate)">
        <select
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          className="input-field"
        >
          <option value="">No estimate yet</option>
          {VOLUME_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>

      {showMeetingTime && (
        <Field
          label="A time that works for the call"
          hint="Free-text — e.g., 'Tue/Wed 1-4pm ET' — we'll come back with two options."
        >
          <input
            type="text"
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            placeholder="e.g., Tuesday or Wednesday afternoon ET"
            className="input-field"
          />
        </Field>
      )}

      <Field label="What you're trying to solve">
        <textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input-field resize-y"
          placeholder={
            leadType === 'book_a_demo'
              ? 'e.g., We publish 40 patient-education articles a month and legal blocks every AI draft. Want to see what your pipeline catches on our real content.'
              : 'e.g., Sizing a Team subscription for 6 editors + 1 compliance reviewer. Need BAA + a security review with our CISO.'
          }
          maxLength={4000}
        />
        <div className="mt-1 text-right text-[10.5px] text-muted-foreground">
          {message.length} / 4,000
        </div>
      </Field>

      {errorMsg && (
        <div className="rounded-md border border-red-500/40 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-700 dark:text-red-300">
          Couldn&rsquo;t send: {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex h-12 items-center gap-2 rounded-md bg-foreground px-6 text-[14.5px] font-semibold text-background shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {status === 'sending' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              {submitLabel}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        <p className="text-[11.5px] text-muted-foreground">
          Replies within one business day.
        </p>
      </div>

      <style jsx>{`
        :global(.input-field) {
          display: block;
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          color: hsl(var(--foreground));
          font-size: 14px;
          line-height: 1.4;
          transition: border-color 200ms, box-shadow 200ms;
        }
        :global(.input-field:focus) {
          outline: none;
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.18);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
