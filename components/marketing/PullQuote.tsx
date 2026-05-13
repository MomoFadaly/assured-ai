/**
 * PullQuote — a full-bleed, massive-typography interstitial used to break up
 * the rhythm between standard sections. Not a card-grid section. Not a column-layout
 * section. Just one big editorial moment between two longer reads.
 */
export function PullQuote({
  attribution,
  children,
}: {
  attribution?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-background">
      {/* Subtle grain + faint radial wash to give it gentle visual depth */}
      <div className="grain pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 70% at 50% 50%, hsl(var(--primary) / 0.05), transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1100px] px-5 py-24 sm:py-32">
        <div className="mb-8 flex items-center justify-center gap-4">
          <span className="h-px w-12 bg-foreground/25" aria-hidden />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
            What the numbers say
          </span>
          <span className="h-px w-12 bg-foreground/25" aria-hidden />
        </div>

        <blockquote className="text-balance text-center font-semibold leading-[1.05] tracking-[-0.025em] text-[38px] sm:text-[56px] md:text-[72px]">
          {children}
        </blockquote>

        {attribution && (
          <div className="mt-10 text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {attribution}
          </div>
        )}
      </div>
    </section>
  );
}
