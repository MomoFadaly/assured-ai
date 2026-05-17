import Link from 'next/link';
import { ArrowRight, Lock, Shield, FileLock2, Scale, FileCheck2, Landmark } from 'lucide-react';
import { LiveHashChainHero } from './LiveHashChainHero';

/**
 * Hero — option B layout, the redesigned home-page hero.
 *
 *   The hero contains the headline, the sub-line, and the two CTAs.
 *   Nothing else. No verifier card, no chips, no chrome — those move
 *   to their own dedicated section (HomeVerifierSection) below.
 *
 *   Headline + sub were workshopped through several rounds against
 *   Halbert / Sugarman / Ogilvy / Schwartz principles. The chosen
 *   copy is the stakes-ladder voice — Halbert-pure curiosity gap
 *   in the headline, Sugarman three-beat slippery slide in the sub.
 *
 *   Background is the LiveHashChainHero — pastel mesh gradient PLUS
 *   the interactive safety-net canvas (rebuilt to actually feel like
 *   a net: parabolic drape, cursor catches/dips not pushes, woven
 *   fiber treatment). Performance optimized via 30fps throttle,
 *   intersection-observer pause, devicePixelRatio cap.
 *
 *   The trust strip moves OUT of the hero into its own white-on-dark
 *   section below — so the hero is just type on light, and the
 *   trust strip becomes its own dramatic dark moment.
 */

export function Hero({ proofExampleId }: { proofExampleId: number | null }) {
  return (
    <>
      <section
        id="hero"
        className="relative isolate overflow-hidden"
      >
        {/* Pastel mesh + safety-net canvas. No verifier card on top. */}
        <LiveHashChainHero />

        <div className="relative mx-auto max-w-[1100px] px-5 pt-24 pb-28 sm:pt-32 sm:pb-36">
          {/* The headline lives by itself. No kicker, no superhead, no
              eyebrow. The point IS the headline.
              "One bad sentence is all it takes." */}
          <h1 className="reveal-up text-balance font-semibold leading-[0.94] tracking-[-0.038em] text-[56px] sm:text-[80px] md:text-[100px] lg:text-[116px]">
            One bad sentence is all it takes.
          </h1>

          {/* Sub uses Halbert's stakes ladder: three short beats
              (asyndeton) building dread, then the solution arrives
              with mechanism. The em-dash + verb list at the end is
              the Sugarman slippery-slide rhythm. */}
          <p
            className="reveal-up mt-8 max-w-[820px] text-[19px] leading-[1.55] tracking-tight text-foreground/75 sm:text-[22px] sm:leading-[1.5]"
            style={{ animationDelay: '80ms' }}
          >
            A lawsuit. A regulator letter. A CNN headline that follows your brand for ten years.
            AssuredAI catches the sentence before it ships — verified, redacted,
            disclaimer-injected, hash-chained. Public proof URL on every piece your team
            publishes.
          </p>

          <div
            className="reveal-up mt-12 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '160ms' }}
          >
            <Link
              href="/get-started"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-7 text-[14.5px] font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Verify your content
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            {proofExampleId !== null ? (
              <Link
                href={`/v/${proofExampleId}`}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-foreground/15 bg-background/60 px-6 text-[14.5px] font-medium backdrop-blur transition-colors hover:bg-background"
              >
                <Lock className="h-4 w-4" />
                See a live proof
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* Trust strip — white-on-dark with serif accent, full-bleed.
          Lives outside the hero <section> so the hero's pastel
          background ends cleanly before this dark strip begins. */}
      <section
        aria-label="Compliance frameworks"
        className="relative border-y border-foreground/10 bg-[#06101c] py-10 text-white"
      >
        <div className="mx-auto max-w-[1320px] px-5">
          <div className="mb-6 flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="text-[14px] font-semibold uppercase tracking-[0.22em] text-white/55">
              Designed for the frameworks your auditor cares about.
            </h2>
            <p className="font-serif text-[15px] italic text-white/75">
              Same pipeline. Every vertical.
            </p>
          </div>
          <TrustStrip />
        </div>
      </section>

      {/* Marquee */}
      <div className="relative border-b border-foreground/10 bg-foreground py-6 text-background overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee gap-12 will-change-transform">
          {Array.from({ length: 2 }).map((_, k) => (
            <div
              key={k}
              className="flex shrink-0 items-center gap-12 pr-12 text-[40px] font-medium tracking-[-0.02em] sm:text-[64px]"
            >
              <span>No fabricated claims.</span>
              <span className="text-primary/70">/</span>
              <span>No PII leaks.</span>
              <span className="text-primary/70">/</span>
              <span>No missing disclaimers.</span>
              <span className="text-primary/70">/</span>
              <span className="italic">No surprises.</span>
              <span className="text-primary/70">/</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TrustStrip() {
  const badges = [
    { label: 'HIPAA', sub: 'aware', icon: <Shield className="h-4 w-4" strokeWidth={1.5} /> },
    { label: 'SOC 2', sub: 'architected', icon: <FileLock2 className="h-4 w-4" strokeWidth={1.5} /> },
    { label: 'BAA', sub: 'friendly', icon: <Scale className="h-4 w-4" strokeWidth={1.5} /> },
    { label: 'FedRAMP', sub: 'ready', icon: <FileCheck2 className="h-4 w-4" strokeWidth={1.5} /> },
    { label: 'FINRA', sub: 'aware', icon: <Landmark className="h-4 w-4" strokeWidth={1.5} /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3 lg:grid-cols-5">
      {badges.map((b) => (
        <div
          key={b.label}
          className="group flex items-center gap-3 bg-[#06101c] px-5 py-4 transition-colors hover:bg-white/5"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-white/75 ring-1 ring-white/10 transition-colors group-hover:bg-primary/10 group-hover:text-primary group-hover:ring-primary/30">
            {b.icon}
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold tracking-tight text-white">{b.label}</div>
            <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/45">
              {b.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
