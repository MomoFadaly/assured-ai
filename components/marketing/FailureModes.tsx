import { SectionEyebrow, SectionHeadline, SectionLede } from './Pipeline';
import { RevealOnScroll } from './Parallax';
import { SectionBackdrop } from './SectionBackdrop';
import { Pill, FileWarning, UserX, Stethoscope, AlertTriangle } from 'lucide-react';

interface Failure {
  index: string;
  icon: React.ReactNode;
  category: string;
  title: string;
  example: React.ReactNode;
  consequence: string;
}

const FAILURES: Failure[] = [
  {
    index: '01',
    icon: <Pill className="h-5 w-5" strokeWidth={1.5} />,
    category: 'Hallucinated dosage',
    title: 'The AI invents a number that sounds clinical.',
    example: (
      <span>
        &ldquo;Adults can safely take{' '}
        <Mark>up to 4,000 mg of ibuprofen</Mark> per day for chronic pain
        management.&rdquo;
      </span>
    ),
    consequence:
      'The actual OTC ceiling is 1,200 mg. The published article becomes Exhibit A in a malpractice filing.',
  },
  {
    index: '02',
    icon: <FileWarning className="h-5 w-5" strokeWidth={1.5} />,
    category: 'Fabricated citation',
    title: 'The AI references a study that does not exist.',
    example: (
      <span>
        &ldquo;A 2024 JAMA meta-analysis (<Mark>Chen et al., n=12,847</Mark>)
        demonstrated a 47% reduction in cardiovascular events.&rdquo;
      </span>
    ),
    consequence:
      'A reader checks the source. The study is invented. The brand is publicly accused of inventing medical evidence.',
  },
  {
    index: '03',
    icon: <UserX className="h-5 w-5" strokeWidth={1.5} />,
    category: 'PHI leaked into output',
    title: 'A patient name from a prompt ends up in the article.',
    example: (
      <span>
        &ldquo;Patients like{' '}
        <Mark>Margaret Hutchinson (MRN 8842-91)</Mark> often respond well to
        the DASH protocol.&rdquo;
      </span>
    ),
    consequence:
      'A single PHI exposure is a HIPAA-reportable breach. $50K minimum fine per violation. OCR audit follows.',
  },
  {
    index: '04',
    icon: <Stethoscope className="h-5 w-5" strokeWidth={1.5} />,
    category: 'Missed medical disclaimer',
    title: 'Symptom-prompting content publishes without a 911 routing line.',
    example: (
      <span>
        &ldquo;If you are experiencing crushing chest pain, try lying down and
        taking <Mark>deep, slow breaths</Mark> until it passes.&rdquo;
      </span>
    ),
    consequence:
      'No 911 routing. A reader follows the advice during a real cardiac event. A wrongful-death suit follows.',
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
        <SectionHeadline>This is what your AI gets wrong.</SectionHeadline>
        <SectionLede>
          Generic LLMs were trained on the open web — not on your formulary, your style guide,
          or your compliance posture. Four failure modes show up over and over in real
          healthcare publishing. Each one is a small editorial error, and a large legal one.
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
