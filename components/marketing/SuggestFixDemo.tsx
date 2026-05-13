import { Sparkles, ArrowRight, Check, ExternalLink } from 'lucide-react';
import { SectionEyebrow, SectionHeadline, SectionLede } from './Pipeline';

export function SuggestFixDemo() {
  return (
    <section id="suggest" className="relative border-b border-border/60">
      <div className="relative mx-auto max-w-[1240px] px-5 py-24">
        <SectionEyebrow>From flagger to co-author</SectionEyebrow>
        <SectionHeadline>
          When a sentence isn&apos;t sourced, AssuredAI rewrites it.
        </SectionHeadline>
        <SectionLede>
          The model rewrites the unsourced claim anchored to the closest match in your library —
          with an editor-facing note explaining exactly what changed. One click to apply.
        </SectionLede>

        <div className="mx-auto mt-14 grid max-w-[1080px] items-stretch gap-5 lg:grid-cols-[1fr_auto_1fr]">
          {/* Before */}
          <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/15">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              <Sparkles className="h-2.5 w-2.5" /> Original · unsourced
            </div>
            <p className="text-[14.5px] leading-relaxed">
              Drinking green tea three times per day reduces cholesterol by{' '}
              <span className="rounded bg-amber-200/60 px-1 font-semibold text-amber-900 dark:bg-amber-700/50 dark:text-amber-100">
                47%
              </span>{' '}
              in adults over 50.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
              <span className="inline-block size-1.5 rounded-full bg-amber-500" />
              No matching chunk in source library
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center lg:flex-col">
            <div className="flex size-12 items-center justify-center rounded-full border border-border bg-card shadow-md">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="mx-3 hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground lg:my-2 lg:block lg:rotate-0">
              suggest fix
            </div>
            <ArrowRight className="hidden h-5 w-5 text-muted-foreground lg:block" />
          </div>

          {/* After */}
          <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-card p-5 shadow-sm dark:border-emerald-900 dark:from-emerald-950/30">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
              <Check className="h-2.5 w-2.5" /> Sourced rewrite
            </div>
            <p className="text-[14.5px] leading-relaxed">
              Following a heart-healthy eating plan like DASH, which includes vegetables, fruits,
              whole grains, and limits saturated fats, may help support cardiovascular health in
              adults.
            </p>
            <div className="mt-4 flex items-start gap-1.5 rounded-lg bg-emerald-100/60 p-2 text-[11px] italic leading-relaxed text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                Editor note: removed unsupported specific claim about green tea reducing cholesterol
                by 47%; generalized to heart-healthy eating patterns supported by the DASH plan.
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300">
              <ExternalLink className="h-3 w-3" />
              <span>Anchored to NIH/NHLBI — DASH Eating Plan</span>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-[600px] text-center text-[12.5px] text-muted-foreground">
          Real output from{' '}
          <a href="/chat" className="text-primary hover:underline">
            the live verifier
          </a>
          . The model picked the closest chunk in the library, softened an unsupportable
          statistic, and wrote a one-line editor note explaining the change. Latency: ~4 seconds.
        </p>
      </div>
    </section>
  );
}
