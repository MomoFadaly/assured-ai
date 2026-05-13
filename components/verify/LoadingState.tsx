'use client';

import * as React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  key: string;
  label: string;
  detail: string;
}

const PASTE_STEPS: Step[] = [
  { key: 'redact-in', label: 'Redacting input', detail: 'Scanning for PII / PHI' },
  { key: 'red-flag', label: 'Scanning for medical red flags', detail: 'Cardiac, mental-health, overdose…' },
  { key: 'fact-check', label: 'Fact-checking each paragraph', detail: 'Matching claims to the library' },
  { key: 'disclaimer', label: 'Checking disclaimer', detail: 'Detecting or injecting required language' },
  { key: 'redact-out', label: 'Output PII pass', detail: 'Final scrub before publish' },
  { key: 'audit', label: 'Writing audit entry', detail: 'Hash-chained, append-only' },
];

const DRAFT_STEPS: Step[] = [
  { key: 'draft', label: 'Drafting article', detail: 'Claude writing from your brief' },
  ...PASTE_STEPS,
];

export function LoadingState({ mode }: { mode: 'paste' | 'draft' }) {
  const steps = mode === 'draft' ? DRAFT_STEPS : PASTE_STEPS;
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    setCurrent(0);
    // Pace the visual progress so the user sees movement without claiming
    // truthful per-step completion. The actual lifecycle is sequential
    // anyway; this is honest UX, not a fake.
    const tick = () => {
      setCurrent((c) => (c < steps.length - 1 ? c + 1 : c));
    };
    const id = setInterval(tick, 1100);
    return () => clearInterval(id);
  }, [steps.length, mode]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 px-8 py-10">
        <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
          <Loader2 className="h-3 w-3 animate-spin" /> In progress
        </div>
        <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
          {mode === 'draft' ? 'Drafting and verifying…' : 'Verifying your article…'}
        </h2>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Each check runs in order. Average run takes 8–18 seconds.
        </p>

        <ol className="mt-7 space-y-1">
          {steps.map((step, i) => {
            const state: 'done' | 'active' | 'pending' =
              i < current ? 'done' : i === current ? 'active' : 'pending';
            return (
              <li
                key={step.key}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all',
                  state === 'active' && 'bg-primary/5',
                )}
              >
                <div className="mt-0.5">
                  {state === 'done' ? (
                    <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  ) : state === 'active' ? (
                    <div className="flex size-5 items-center justify-center rounded-full border-2 border-primary">
                      <div className="size-2 animate-pulse rounded-full bg-primary" />
                    </div>
                  ) : (
                    <div className="size-5 rounded-full border-2 border-border" />
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className={cn(
                      'text-[13.5px] font-medium leading-tight',
                      state === 'pending' ? 'text-muted-foreground' : 'text-foreground',
                    )}
                  >
                    {step.label}
                  </div>
                  <div
                    className={cn(
                      'mt-0.5 text-[12px] leading-tight',
                      state === 'pending' ? 'text-muted-foreground/60' : 'text-muted-foreground',
                    )}
                  >
                    {step.detail}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
