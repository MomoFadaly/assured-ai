import Link from 'next/link';
import { ArrowRight, Lock, Shield, FileLock2, Scale, FileCheck2, Landmark } from 'lucide-react';
import { LiveHashChainHero } from './LiveHashChainHero';
import { HomeVerifierDemo } from './HomeVerifierDemo';
import { GlowCard } from './GlowCard';

/**
 * Hero — the home-page hero section.
 *
 * Designed as a single composed system:
 *
 *   1. LiveHashChainHero background: animated pastel mesh gradient +
 *      interactive triangular hash-chain canvas + sonar-pulse layer
 *      (fires on `assured:verify-complete` window event).
 *
 *   2. Foreground composition:
 *      - Left:  headline ("Audit-grade content. By default."),
 *               one-line sub, two CTAs.
 *      - Right: HomeVerifierDemo wrapped in GlowCard for the pen-#4
 *               glowing-edge effect — dark glass artifact sitting on
 *               the pastel mesh, Apple Vision Pro / Stripe Atlas energy.
 *
 *   3. Below: white-on-dark trust strip with serif accent, then the
 *      marquee, then the rest of the page in light mode.
 *
 * No editorial "00" line index, no small-caps category labels, no
 * decorative serif italic — those were the tropes that made the prior
 * version read as childish/portfolio-craft. This version is built to
 * read as Stripe/Apple-tier: commanding, professional, clean.
 */

export function Hero({ proofExampleId }: { proofExampleId: number | null }) {
  return (
    <>
      <section
        id="hero"
        className="relative isolate overflow-hidden"
      >
        {/* Background system — three composited layers */}
        <LiveHashChainHero />

        <div className="relative mx-auto max-w-[1320px] px-5 pb-20 pt-20 sm:pt-28">
          <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            {/* LEFT: headline + sub + CTAs */}
            <div>
              <h1
                className="reveal-up text-balance font-semibold tracking-[-0.035em] leading-[0.96] text-[60px] sm:text-[80px] md:text-[92px] lg:text-[104px]"
              >
                Audit-grade content.{' '}
                <span className="text-foreground/55">By default.</span>
              </h1>

              <p
                className="reveal-up mt-7 max-w-[560px] text-[19px] leading-[1.5] tracking-tight text-foreground/75 sm:text-[20px]"
                style={{ animationDelay: '80ms' }}
              >
                Fact-checked. Redacted. Hash-chained. Public proof on every piece your team
                ships.
              </p>

              <div
                className="reveal-up mt-10 flex flex-wrap items-center gap-3"
                style={{ animationDelay: '160ms' }}
              >
                <Link
                  href="/get-started"
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-[14.5px] font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  Verify your content
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                {proofExampleId !== null ? (
                  <Link
                    href={`/v/${proofExampleId}`}
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-foreground/20 bg-background/60 px-6 text-[14.5px] font-medium backdrop-blur hover:bg-background"
                  >
                    <Lock className="h-4 w-4" />
                    See a live proof
                  </Link>
                ) : null}
              </div>
            </div>

            {/* RIGHT: verifier card on the pastel mesh, wrapped with the
                pen-#4 glowing-edge effect. Sits at full opacity on top
                of the background — premium artifact. */}
            <div className="reveal-up" style={{ animationDelay: '220ms' }}>
              <GlowCard
                className="rounded-2xl"
                glowColor="220deg 95% 78%"
              >
                <HomeVerifierDemo />
              </GlowCard>
            </div>
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

      {/* Marquee — kept from the prior version, complements the
          new hero structure. */}
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
