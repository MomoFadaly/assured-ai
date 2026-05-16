import { EyeOff, Heart, BookCheck, Stamp, ArrowRight, AlertTriangle } from 'lucide-react';
import { RevealOnScroll } from './Parallax';
import { SectionBackdrop } from './SectionBackdrop';
import { cn } from '@/lib/utils';

export function Pipeline() {
  return (
    <section id="pipeline" className="relative overflow-hidden border-b border-border/60">
      <SectionBackdrop
        src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=2000&q=75"
        intensity="subtle"
        position="center"
      />
      <div className="pointer-events-none absolute inset-0 grid-subtle opacity-20" aria-hidden />
      <div className="pointer-events-none absolute -inset-x-20 -top-32 h-[420px] aurora-bg opacity-[0.06] dark:opacity-[0.14]" aria-hidden />
      <div className="relative mx-auto max-w-[1240px] px-5 py-24">
        <SectionEyebrow n="05">The solution</SectionEyebrow>
        <SectionHeadline>Four checks. Before anything publishes.</SectionHeadline>
        <SectionLede>
          Whether the article comes from your writers, your existing AI authoring tools, or our
          own draft mode — the same compliance pipeline runs end-to-end, with a hash-chained
          audit trail you can show a regulator.
        </SectionLede>

        {/* SVG connector line — visible only on lg, runs behind the cards */}
        <div className="relative mt-14">
          <svg
            className="pointer-events-none absolute left-0 right-0 top-[60px] -z-0 hidden h-[2px] w-full lg:block"
            preserveAspectRatio="none"
            viewBox="0 0 1000 2"
            aria-hidden
          >
            <line
              x1="0"
              y1="1"
              x2="1000"
              y2="1"
              stroke="hsl(var(--border))"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
          </svg>
        <div className="relative z-10 grid gap-4 lg:grid-cols-4">
          <RevealOnScroll delay={0}>
            <PillarCard
              step={1}
              tone="amber"
              icon={<EyeOff className="h-5 w-5" />}
              title="PHI / PII redaction"
              blurb="Patient initials, account numbers, client names, emails, phones — replaced with typed tokens before anything leaves your editor."
              example={
                <div className="space-y-1.5">
                  <Strike>Client Avery Patel, acct 8842-91</Strike>
                  <div className="flex items-start gap-1.5 font-mono text-[10.5px] text-amber-700 dark:text-amber-300">
                    <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>Client &lt;PERSON_1&gt;, &lt;ACCT_1&gt;</span>
                  </div>
                </div>
              }
            />
          </RevealOnScroll>
          <RevealOnScroll delay={120}>
            <PillarCard
              step={2}
              tone="red"
              icon={<Heart className="h-5 w-5" />}
              title="Vertical red flags"
              blurb="Crisis, suitability, privilege, safety — vertical-specific rulesets auto-route the content out of the LLM path and into the right escalation."
              example={
                <div className="rounded-md border border-red-300 bg-red-50/60 p-2.5 text-[10.5px] text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Crisis · 988 routing</span>
                  </div>
                  <p className="mt-0.5">Bypassed the LLM entirely.</p>
                </div>
              }
            />
          </RevealOnScroll>
          <RevealOnScroll delay={240}>
            <PillarCard
              step={3}
              tone="emerald"
              icon={<BookCheck className="h-5 w-5" />}
              title="Sentence-level sourcing"
              blurb="Every sentence matched against your vetted library. Unsupported sentences flagged for editor review — never auto-rejected."
              example={
                <div className="space-y-1">
                  <SourceHit org="CDC" sim="0.69" />
                  <SourceHit org="NIH/NHLBI" sim="0.62" />
                  <div className="flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-1 text-[10.5px] text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                    <AlertTriangle className="h-3 w-3" />
                    <span>1 unsourced — editor review</span>
                  </div>
                </div>
              }
            />
          </RevealOnScroll>
          <RevealOnScroll delay={360}>
            <PillarCard
              step={4}
              tone="primary"
              icon={<Stamp className="h-5 w-5" />}
              title="Disclaimer enforcement"
              blurb="Required pack disclaimer (HIPAA, FINRA, § 508, ABA) detected, or auto-injected if missing. House style preserved."
              example={
                <div className="flex items-start gap-1.5 rounded-md border-l-2 border-primary bg-primary/5 px-2 py-1.5 text-[10.5px] italic text-muted-foreground">
                  <Stamp className="mt-0.5 h-3 w-3 shrink-0 not-italic text-primary" />
                  <span>Disclaimer auto-injected by AssuredAI</span>
                </div>
              }
            />
          </RevealOnScroll>
        </div>
        </div>

        <div className="mt-12 flex justify-center">
          <a
            href="/chat"
            className="group inline-flex items-center gap-1.5 text-[13.5px] font-medium text-primary hover:opacity-80"
          >
            Run a verification yourself
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function PillarCard({
  step,
  tone,
  icon,
  title,
  blurb,
  example,
}: {
  step: number;
  tone: 'amber' | 'red' | 'emerald' | 'primary';
  icon: React.ReactNode;
  title: string;
  blurb: string;
  example: React.ReactNode;
}) {
  const accent = {
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    primary: 'bg-primary/10 text-primary',
  }[tone];
  return (
    <div className="lift-on-hover group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:border-foreground/20">
      {/* Massive step number — anchors the card visually */}
      <div className="relative flex items-end justify-between px-6 pt-5 pb-2">
        <span
          className="select-none font-semibold leading-[0.85] tracking-[-0.04em] text-foreground/[0.07]"
          style={{ fontSize: '108px' }}
        >
          {String(step).padStart(2, '0')}
        </span>
        <div className={cn('absolute right-5 top-5 inline-flex size-10 items-center justify-center rounded-xl', accent)}>
          {icon}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-6 pb-6">
        <h3 className="text-[18px] font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground">{blurb}</p>
        <div className="mt-5 rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px]">
          {example}
        </div>
      </div>
    </div>
  );
}

function Strike({ children }: { children: React.ReactNode }) {
  return (
    <span className="line-through decoration-amber-400/70 decoration-2 text-foreground/60">
      {children}
    </span>
  );
}

function SourceHit({ org, sim }: { org: string; sim: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded bg-emerald-100/70 px-1.5 py-0.5 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
      <span className="size-1 rounded-full bg-emerald-500" />
      <span className="font-medium">{org}</span>
      <span className="ml-auto font-mono opacity-70">{sim}</span>
    </div>
  );
}

export function SectionEyebrow({ children, n }: { children: React.ReactNode; n?: string }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-4">
      <span className="h-px w-12 bg-foreground/25" aria-hidden />
      {n && (
        <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground/40">
          {n}
        </span>
      )}
      <span className="text-[14px] font-semibold uppercase tracking-[0.22em] text-foreground">
        {children}
      </span>
      <span className="h-px w-12 bg-foreground/25" aria-hidden />
    </div>
  );
}

export function SectionHeadline({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mx-auto max-w-[960px] text-balance text-center font-semibold leading-[1.0] tracking-[-0.025em] text-[40px] sm:text-[56px] md:text-[68px]">
      {children}
    </h2>
  );
}

export function SectionLede({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto mt-6 max-w-[680px] text-balance text-center text-[16px] leading-[1.6] text-muted-foreground sm:text-[18px]">
      {children}
    </p>
  );
}
