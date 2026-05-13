'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { BrandLockup } from '@/components/verify/Brand';

type Segment = 'publisher' | 'hospital' | 'pharma' | 'gov' | 'other';
type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function ContactPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [role, setRole] = useState('');
  const [segment, setSegment] = useState<Segment>('publisher');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg(null);
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, org, role, segment, message }),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Server returned ${r.status}`);
      }
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Sticky header with brand */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-5">
          <BrandLockup />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-5 py-16 sm:py-24">
        <div className="mb-6 flex items-center gap-4">
          <span className="font-mono text-[12px] font-semibold tabular-nums text-foreground/45">
            Contact
          </span>
          <span className="h-px w-12 bg-foreground/25" />
          <span className="text-[12px] font-semibold uppercase tracking-[0.22em] text-foreground">
            Start a conversation
          </span>
        </div>

        <h1 className="font-semibold tracking-[-0.025em] leading-[1.02] text-[40px] sm:text-[52px] md:text-[60px]">
          Tell us what you publish.
        </h1>
        <p className="mt-5 max-w-[560px] text-[16px] leading-[1.6] text-muted-foreground sm:text-[17.5px]">
          The fastest path to a pricing quote is a 30-minute call where you tell us
          where your content lives, who reviews it, and what your CISO is anxious about.
          We&apos;ll bring an architecture sketch tailored to your stack.
        </p>

        {status === 'sent' ? (
          <div className="mt-12 rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.06] p-8">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-4 w-4" strokeWidth={3} />
              </div>
              <h2 className="text-[20px] font-semibold tracking-tight">Got it.</h2>
            </div>
            <p className="mt-3 text-[15px] leading-[1.55] text-muted-foreground">
              We&apos;ll be in touch within one business day. In the meantime, the live
              verifier is at{' '}
              <Link href="/chat" className="text-foreground underline underline-offset-2 hover:opacity-80">
                /chat
              </Link>{' '}
              — paste any health-content article and watch the pipeline run.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-12 space-y-5">
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
                  className="input-field"
                  placeholder="e.g., CISO · Editorial Lead"
                  autoComplete="organization-title"
                />
              </Field>
            </div>

            <Field label="Who you publish for">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {(
                  [
                    { v: 'publisher', l: 'Publisher' },
                    { v: 'hospital', l: 'Hospital' },
                    { v: 'pharma', l: 'Pharma' },
                    { v: 'gov', l: 'Government' },
                    { v: 'other', l: 'Other' },
                  ] as { v: Segment; l: string }[]
                ).map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSegment(v)}
                    className={`rounded-md border px-3 py-2 text-[13px] font-medium transition-all ${
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

            <Field label="What you're trying to solve">
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="input-field resize-y"
                placeholder="e.g., We publish 40 patient-education articles a month, our legal team blocks every AI-assisted draft. We need a way to ship faster without inviting an OCR letter."
                maxLength={2000}
              />
              <div className="mt-1 text-right text-[10.5px] text-muted-foreground">
                {message.length} / 2,000
              </div>
            </Field>

            {errorMsg && (
              <div className="rounded-md border border-red-500/40 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-700 dark:text-red-300">
                Couldn&apos;t send: {errorMsg}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={status === 'sending'}
                className="inline-flex h-12 items-center gap-2 rounded-md bg-foreground px-6 text-[14.5px] font-medium text-background shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>Request a conversation</>
                )}
              </button>
              <p className="text-[11.5px] text-muted-foreground">
                Replies within one business day.
              </p>
            </div>
          </form>
        )}

        <p className="mt-16 border-t border-border pt-6 text-[11.5px] text-muted-foreground">
          Prefer to test before talking? The verifier is at{' '}
          <Link href="/chat" className="text-foreground underline underline-offset-2">
            /chat
          </Link>{' '}
          — no signup required for a single demo run.
        </p>
      </main>

      <style jsx>{`
        :global(.input-field) {
          display: block;
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          color: hsl(var(--foreground));
          font-size: 14.5px;
          line-height: 1.4;
          transition: border-color 200ms, box-shadow 200ms;
        }
        :global(.input-field:focus) {
          outline: none;
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.18);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}
