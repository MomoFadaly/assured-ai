import { SectionEyebrow, SectionHeadline, SectionLede } from './Pipeline';
import { RevealOnScroll } from './Parallax';
import { SectionBackdrop } from './SectionBackdrop';
import { Pill, TrendingUp, Lock, LifeBuoy, AlertTriangle } from 'lucide-react';

interface Failure {
  index: string;
  vertical: string;
  icon: React.ReactNode;
  category: string;
  title: string;
  example: React.ReactNode;
  consequence: string;
}

const FAILURES: Failure[] = [
  {
    index: '01',
    vertical: 'Healthcare',
    icon: <Pill className="h-5 w-5" strokeWidth={1.5} />,
    category: 'Fabricated dose',
    title: 'The number sounds clinical. The pharmacology says otherwise.',
    example: (
      <span>
        &ldquo;Adults can safely take{' '}
        <Mark>up to 4,000 mg of ibuprofen</Mark> per day for chronic pain
        management.&rdquo;
      </span>
    ),
    consequence:
      'The actual OTC ceiling is 1,200 mg. The published article becomes Exhibit A in a malpractice filing. Doesn’t matter if a nurse, a freelancer, or an LLM wrote it.',
  },
  {
    index: '02',
    vertical: 'Finance',
    icon: <TrendingUp className="h-5 w-5" strokeWidth={1.5} />,
    category: 'Overstated return',
    title: 'A precise number the data does not back up.',
    example: (
      <span>
        &ldquo;Our flagship balanced fund delivered an{' '}
        <Mark>annualized 11.8% over the last decade</Mark>, outperforming the S&amp;P
        in 7 of those 10 years.&rdquo;
      </span>
    ),
    consequence:
      'Six of those ten years underperformed. The post triggers a FINRA suitability flag and the firm pulls every mention from LinkedIn within 48 hours.',
  },
  {
    index: '03',
    vertical: 'Legal',
    icon: <Lock className="h-5 w-5" strokeWidth={1.5} />,
    category: 'Privilege leak',
    title: 'A case study sounds like a win. It breaches privilege.',
    example: (
      <span>
        &ldquo;After{' '}
        <Mark>Pemberton Industries&rsquo; Q3 board meeting</Mark>, our team
        restructured the disputed Daniels Pension settlement for $4.7M favorable to
        the company.&rdquo;
      </span>
    ),
    consequence:
      'The “anonymous” case study is identifiable to anyone who follows the industry. The firm faces a bar complaint under ABA Rule 1.6 — whether it was the associate, the marketing team, or an AI that drafted it.',
  },
  {
    index: '04',
    vertical: 'Government',
    icon: <LifeBuoy className="h-5 w-5" strokeWidth={1.5} />,
    category: 'Missing crisis routing',
    title: 'Symptom-prompting content publishes without the safety line.',
    example: (
      <span>
        &ldquo;If you&rsquo;re feeling overwhelmed and thinking about ending things,
        try{' '}
        <Mark>writing down three things you&rsquo;re grateful for</Mark>.&rdquo;
      </span>
    ),
    consequence:
      'No 988 routing. A reader follows the advice during a real crisis. A wrongful-death suit follows, plus a Section 508 violation, plus federal review of every other piece of guidance the agency has published.',
  },
];

export function FailureModes() {
  return (
    <section id="failure-modes" className="relative overflow-hidden border-b border-border/60 bg-background">
      <SectionBackdrop
        src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=2000&q=75"
        intensity="subtle"
        position="center"
      />
      <div className="relative mx-auto max-w-[1320px] px-5 py-24 sm:py-32">
        <SectionEyebrow n="02">The problem</SectionEyebrow>
        <SectionHeadline>These are the mistakes that ship anyway.</SectionHeadline>
        <SectionLede>
          It doesn&rsquo;t matter whether your editor wrote it, your agency delivered it, or an
          LLM drafted it. Four failure modes show up over and over in regulated publishing &mdash;
          across healthcare, finance, government, and legal. Each one is a small editorial
          error and a large legal one. AssuredAI catches each one before publish.
        </SectionLede>

        {/* Bento grid — one large featured failure on the left, three satellite ones in a column on the right */}
        <div className="mt-20 grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-5">
          {/* Featured: case 01 — gets the largest visual footprint */}
          <RevealOnScroll direction="left">
            <FailureCard {...FAILURES[0]!} featured />
          </RevealOnScroll>

          {/* Three satellite cases stacked on the right */}
          <div className="grid gap-4 lg:gap-5">
            {FAILURES.slice(1).map((f, i) => (
              <RevealOnScroll
                key={f.index}
                delay={(i + 1) * 90}
                direction="right"
              >
                <FailureCard {...f} />
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FailureCard({
  index,
  vertical,
  icon,
  category,
  title,
  example,
  consequence,
  featured,
}: Failure & { featured?: boolean }) {
  return (
    <div className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:bg-accent/20 ${featured ? 'shadow-sm' : ''}`}>
      {/* Stamp band — like a case-file header */}
      <div className={`flex items-center justify-between border-b border-border bg-muted/30 ${featured ? 'px-8 py-4 sm:px-12' : 'px-6 py-3 sm:px-7'}`}>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11.5px] font-semibold tabular-nums text-foreground/45">
            CASE NO. {index}
          </span>
          <span className="h-3 w-px bg-foreground/15" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-foreground/55">
            {vertical}
          </span>
          <span className="h-3 w-px bg-foreground/15" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-red-700 dark:text-red-300">
            {category}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-sm border border-red-500/40 bg-red-500/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-red-700 dark:text-red-300">
            Flagged
          </span>
          <div className={`flex items-center justify-center rounded-md bg-foreground/[0.04] text-foreground/65 ring-1 ring-foreground/10 ${featured ? 'size-8' : 'size-7'}`}>
            {icon}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={`flex flex-1 flex-col ${featured ? 'gap-8 p-8 sm:p-12' : 'gap-4 p-6 sm:p-7'}`}>
        {/* Title — editorial; featured gets a much larger headline */}
        <h3
          className={
            featured
              ? 'font-semibold leading-[1.04] tracking-[-0.022em] text-[28px] sm:text-[38px] md:text-[44px]'
              : 'font-semibold leading-[1.15] tracking-[-0.01em] text-[18px] sm:text-[20px]'
          }
        >
          {title}
        </h3>

        {/* Example — quoted bad output. Featured gets larger text + heavier styling. */}
        <blockquote
          className={
            featured
              ? 'border-l-2 border-red-500/60 bg-muted/30 px-6 py-5 text-[16px] leading-[1.7] text-foreground/85 sm:text-[17.5px]'
              : 'border-l-2 border-red-500/60 bg-muted/30 px-4 py-3 text-[13px] leading-[1.55] text-foreground/85'
          }
        >
          {example}
        </blockquote>

        {/* Consequence — the cost */}
        <div className={`mt-auto flex items-start gap-3 border-t border-border ${featured ? 'pt-6' : 'pt-4'}`}>
          <AlertTriangle
            className={`shrink-0 text-red-600 dark:text-red-400 ${featured ? 'mt-1 h-5 w-5' : 'mt-0.5 h-3.5 w-3.5'}`}
            strokeWidth={1.75}
          />
          <p className={featured ? 'text-[14.5px] leading-[1.6] text-muted-foreground' : 'text-[12.5px] leading-[1.5] text-muted-foreground'}>
            {consequence}
          </p>
        </div>
      </div>
    </div>
  );
}

function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block font-medium text-foreground">
      <span className="relative z-10">{children}</span>
      <span
        className="absolute inset-x-0 -bottom-0 -top-0 -z-0 border-b-2 border-red-500/70 bg-red-500/[0.08]"
        aria-hidden
      />
    </span>
  );
}
