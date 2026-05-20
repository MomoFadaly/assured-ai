import Link from 'next/link';
import { ArrowRight, Shield, FileLock2, Scale, FileCheck2, Landmark } from 'lucide-react';

/**
 * Hero — Legora-pattern: full-bleed cinematic video, single headline at
 * lower-center, one CTA. Light page below.
 *
 *   Layout matches Legora's hero rhythm:
 *     - Big-but-restrained headline sits LOW in the frame (not centered
 *       vertically — pinned ~70% down) so the video reads as the dominant
 *       visual and the type lands as a calm punctuation.
 *     - One CTA only — "Watch it in action" — opens the systems below.
 *     - No eyebrow, no sub, no chain footer. Quiet.
 *
 *   Typography: Inter with weight 500 + tracking -0.02em approximates
 *   Aktiv Grotesk (Legora's headline face) — humanist sans-serif, soft.
 *
 *   Trust strip + marquee live below in their own cream sections (light
 *   theme overall; the hero is the only dark island).
 */

export function Hero({ proofExampleId: _proofExampleId }: { proofExampleId: number | null }) {
  return (
    <>
      <section
        id="hero"
        className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-[#050912] text-white"
      >
        {/* Full-bleed background video */}
        <video
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/hero-poster.jpg"
          className="absolute inset-0 -z-10 h-full w-full object-cover motion-reduce:hidden"
        >
          <source src="/videos/hero-loop.mp4" type="video/mp4" />
        </video>
        <img
          src="/videos/hero-poster.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-10 hidden h-full w-full object-cover motion-reduce:block"
        />

        {/* Bottom vignette — smooth, deep fade. Strong enough at the lower
            third to hold text contrast on any frame, no hard edges. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_0%,rgba(5,9,18,0.10)_28%,rgba(5,9,18,0.42)_46%,rgba(5,9,18,0.75)_58%,rgba(5,9,18,0.90)_70%,rgba(5,9,18,0.96)_82%,rgba(5,9,18,0.98)_100%)]"
        />

        {/* Headline + CTA in lower third — centered, with breathing room
            before the cream section below */}
        <div className="relative w-full px-6 pb-24 sm:pb-28 lg:pb-32">
          <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-7 text-center">
            <h1
              className="reveal-up max-w-[760px] text-balance font-medium leading-[1.06] tracking-[-0.022em] text-white text-[26px] sm:text-[32px] md:text-[40px] lg:text-[44px] [text-shadow:0_0_36px_rgba(5,9,18,0.85),0_2px_12px_rgba(5,9,18,0.7)]"
              style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              The content safety layer for regulated brands.
            </h1>

            <p
              className="reveal-up max-w-[600px] text-balance font-normal leading-[1.45] tracking-[-0.005em] text-white/80 text-[13px] sm:text-[14px] md:text-[15px] [text-shadow:0_0_28px_rgba(5,9,18,0.85),0_2px_10px_rgba(5,9,18,0.7)]"
              style={{ animationDelay: '40ms' }}
            >
              Compliance verification platform for regulated publishing.
            </p>

            <Link
              href="#systems"
              className="reveal-up group inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[12.5px] font-medium text-[#0A1428] shadow-[0_12px_28px_-10px_rgba(255,255,255,0.30)] transition-all hover:bg-white/90 active:scale-[0.98]"
              style={{ animationDelay: '80ms' }}
            >
              Watch it in action
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* The compliance-frameworks cream strip — was directly under the hero,
   but felt oddly placed before the cinema. Temporarily parked at the
   bottom of the page until we find a better home. */
export function HeroComplianceStrip() {
  return (
    <section
      aria-label="Compliance frameworks"
      className="relative bg-[#F4EFE5] py-12 text-[#0A1428]"
    >
      <div className="mx-auto max-w-[1320px] px-5">
        <div className="mb-7 flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.22em] text-[#0A1428]/55">
            Designed for the frameworks your auditor cares about.
          </h2>
          <p className="font-serif text-[15px] italic text-[#0A1428]/70">
            Same pipeline. Every vertical.
          </p>
        </div>
        <TrustStripLight />
      </div>
    </section>
  );
}

/* The dark "No fabricated claims / No PII leaks / …" marquee — also lived
   directly under the hero. Same temporary parking arrangement. */
export function HeroPromiseMarquee() {
  return (
    <div className="relative border-y border-[#0A1428]/10 bg-[#050912] py-7 text-white overflow-hidden">
      <div className="flex whitespace-nowrap animate-marquee gap-12 will-change-transform">
        {Array.from({ length: 2 }).map((_, k) => (
          <div
            key={k}
            className="flex shrink-0 items-center gap-12 pr-12 text-[40px] font-medium tracking-[-0.02em] sm:text-[64px]"
          >
            <span>No fabricated claims.</span>
            <span className="text-[#22D3EE]/70">/</span>
            <span>No PII leaks.</span>
            <span className="text-[#22D3EE]/70">/</span>
            <span>No missing disclaimers.</span>
            <span className="text-[#22D3EE]/70">/</span>
            <span className="italic">No surprises.</span>
            <span className="text-[#22D3EE]/70">/</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustStripLight() {
  const badges = [
    { label: 'HIPAA', sub: 'aware', icon: <Shield className="h-4 w-4" strokeWidth={1.5} /> },
    { label: 'SOC 2', sub: 'architected', icon: <FileLock2 className="h-4 w-4" strokeWidth={1.5} /> },
    { label: 'BAA', sub: 'friendly', icon: <Scale className="h-4 w-4" strokeWidth={1.5} /> },
    { label: 'FedRAMP', sub: 'ready', icon: <FileCheck2 className="h-4 w-4" strokeWidth={1.5} /> },
    { label: 'FINRA', sub: 'aware', icon: <Landmark className="h-4 w-4" strokeWidth={1.5} /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#0A1428]/10 bg-[#0A1428]/5 sm:grid-cols-3 lg:grid-cols-5">
      {badges.map((b) => (
        <div
          key={b.label}
          className="group flex items-center gap-3 bg-[#FFFCF6] px-5 py-4 transition-colors hover:bg-white"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#0E7C9C]/[0.06] text-[#0E7C9C] ring-1 ring-[#0E7C9C]/15 transition-colors group-hover:bg-[#0E7C9C]/10 group-hover:ring-[#0E7C9C]/30">
            {b.icon}
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold tracking-tight text-[#0A1428]">{b.label}</div>
            <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#0A1428]/45">
              {b.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
