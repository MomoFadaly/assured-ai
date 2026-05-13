'use client';

import { ShieldAlert, Heart, BookCheck, Stamp, Sparkles } from 'lucide-react';

const PILLARS = [
  {
    icon: ShieldAlert,
    title: 'PII / PHI redaction',
    desc: "Patient names, MRNs, emails, phone numbers, IPs — replaced with typed tokens before anything leaves your editor.",
    accent: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20',
  },
  {
    icon: Heart,
    title: 'Medical red flags',
    desc: 'Cardiac, suicidal ideation, overdose, stroke, severe bleeding, anaphylaxis — auto-blocked with the right hotline.',
    accent: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20',
  },
  {
    icon: BookCheck,
    title: 'Claim-by-claim sourcing',
    desc: 'Every paragraph matched against your vetted library. Unsupported claims flagged for editor review — never auto-rejected.',
    accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20',
  },
  {
    icon: Stamp,
    title: 'Disclaimer enforcement',
    desc: 'The required healthcare or government disclaimer is detected, or auto-injected if missing.',
    accent: 'text-primary bg-primary/10',
  },
];

export function EmptyState() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 px-8 py-10">
        <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> What AssuredAI checks
        </div>
        <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
          Four checks, every time. Before anything publishes.
        </h2>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
          Paste a draft or describe what you want written. The same compliance
          pipeline runs end-to-end with a hash-chained audit trail you can
          show a regulator.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/15"
            >
              <div className={`mb-2.5 inline-flex size-8 items-center justify-center rounded-lg ${p.accent}`}>
                <p.icon className="h-4 w-4" />
              </div>
              <div className="text-[13.5px] font-semibold">{p.title}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {p.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Tip:</span> Try pasting the
          first article you wrote this week. Then switch to <em>Write an article</em>{' '}
          and ask for a 500-word patient handout on the same topic. Compare the
          two — both get the same scrutiny.
        </div>
      </div>
    </div>
  );
}
