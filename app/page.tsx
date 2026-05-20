import { query } from '@/lib/db/client';
import { MarketingHeader } from '@/components/marketing/Header';
import { HeaderAuthChip } from '@/components/marketing/HeaderAuth';
import { ScrollProgress } from '@/components/marketing/Parallax';
import { SectionNav } from '@/components/marketing/SectionNav';
import { Hero, HeroComplianceStrip, HeroPromiseMarquee } from '@/components/marketing/Hero';
import { HeroChromeGate } from '@/components/marketing/HeroChromeGate';
import { CinemaChrome } from '@/components/marketing/CinemaChrome';
import { CinemaIntro } from '@/components/marketing/CinemaIntro';
import { CinemaTopBar } from '@/components/marketing/CinemaTopBar';
import { StoryCinema } from '@/components/marketing/StoryCinema';
import { ScrollToBeginCue } from '@/components/marketing/ScrollToBeginCue';
import { IndustryShowcase, SourcesOfTruth } from '@/components/marketing/SourcesOfTruth';
// PasteAndScan removed from page composition (2026-05-19). Import
// kept commented for traceability.
// import { PasteAndScan } from '@/components/marketing/PasteAndScan';
import { PrototypeDisclaimer } from '@/components/marketing/PrototypeDisclaimer';
import { Audience } from '@/components/marketing/Audience';
import { TrustStrip } from '@/components/marketing/TrustStrip';
import { FailureModes } from '@/components/marketing/FailureModes';
import { PullQuote } from '@/components/marketing/PullQuote';
import { Stakes } from '@/components/marketing/Stakes';
import { Pipeline } from '@/components/marketing/Pipeline';
import { FeaturedArtifacts } from '@/components/marketing/FeaturedArtifacts';
import { ShowcaseStrip } from '@/components/marketing/ShowcaseStrip';
import { OutcomesStrip } from '@/components/marketing/OutcomesStrip';
import dynamic from 'next/dynamic';

// Below-fold heavy client components — keep SSR'd (so the HTML still
// streams) but split the JS bundles so initial hydration only loads what
// the user can see (hero + cinema). framer-motion SVG sections especially.
const Architecture = dynamic(() => import('@/components/marketing/Architecture').then((m) => m.Architecture));
const HashChainCanvas = dynamic(() => import('@/components/marketing/HashChainCanvas').then((m) => m.HashChainCanvas));
const FAQDynamic = dynamic(() => import('@/components/marketing/FAQ').then((m) => m.FAQ));
import { SectorTrust } from '@/components/marketing/SectorTrust';
import { HomeVerifierSection } from '@/components/marketing/HomeVerifierSection';
import { getGlobalMetrics } from '@/lib/marketing/global-metrics';
import { WhitePaperQuote } from '@/components/marketing/Quote';
import { VoiceSection, WordPressDiagram } from '@/components/marketing/VoiceSection';
import { Comparison } from '@/components/marketing/Comparison';
import { Origin } from '@/components/marketing/Origin';
import { Pricing } from '@/components/marketing/Pricing';
import { CTAFooter } from '@/components/marketing/CTAFooter';
import { BackToTop } from '@/components/marketing/BackToTop';
import { getHeroShowcase } from '@/lib/demo/queries';
import { unstable_cache } from 'next/cache';

// ISR — regenerate the static landing page once a minute. Eliminates the
// per-request DB roundtrips that were making every refresh feel slow.
// `force-dynamic` was the wrong default for a public marketing page that
// only depends on infrequently-changing showcase/metrics data.
export const revalidate = 60;

/**
 * Race a query against a short timeout — when Postgres is unreachable
 * (local DB not running, network blip), pg-pool blocks for 8+ seconds at
 * the OS TCP timeout. The marketing page works fine with null fallbacks,
 * so don't make the user wait. 1.2s is plenty for any healthy local DB.
 */
function withTimeout<T>(promise: Promise<T>, ms = 1200, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise.then((v) => {
    clearTimeout(timeoutId);
    return v;
  }), timeout]);
}

/**
 * Returns the latest verified-answer audit ID, or null when no rows exist.
 * Cached for 60s so back-to-back page loads don't all hit Postgres.
 */
const getLatestAuditId = unstable_cache(
  async (): Promise<number | null> => {
    try {
      const r = await query<{ latest_audit: number | null }>(
        `SELECT id AS latest_audit FROM audit_log WHERE outcome = 'answered' ORDER BY id DESC LIMIT 1`,
      );
      return r.rows[0]?.latest_audit ?? null;
    } catch {
      return null;
    }
  },
  ['marketing:latest-audit-id'],
  { revalidate: 60, tags: ['marketing'] },
);

const getHeroShowcaseCached = unstable_cache(
  () => getHeroShowcase(),
  ['marketing:hero-showcase'],
  { revalidate: 60, tags: ['marketing'] },
);

const getGlobalMetricsCached = unstable_cache(
  () => getGlobalMetrics(),
  ['marketing:global-metrics'],
  { revalidate: 60, tags: ['marketing'] },
);

export default async function LandingPage() {
  // Hero CTA: prefer a curated showcase ("PHI caught", "fraud blocked",
  // etc.) over the latest raw audit row, since the showcase is engineered
  // to be visually compelling. Falls back to the latest audit when the
  // showcase table is empty (e.g. first deploy after the migration).
  // All three queries race against a 1.2s timeout. If the DB is unreachable
  // (local dev with Postgres down), the page renders in < 1.5s with sensible
  // fallbacks instead of blocking 8+ seconds on the pg-pool TCP timeout.
  const METRICS_FALLBACK = {
    total_verifications: 65,
    verifications_24h: 12,
    total_citations: 184,
    chain_integrity_pct: 100,
    latest_audit_id: 65,
    median_latency_ms: 5_800,
  };
  const [hero, latestId, metrics] = await Promise.all([
    withTimeout(getHeroShowcaseCached(), 1200, null),
    withTimeout(getLatestAuditId(), 1200, null),
    withTimeout(getGlobalMetricsCached(), 1200, METRICS_FALLBACK),
  ]);
  const proofExampleId = hero?.audit_log_id ?? latestId;
  return (
    <div className="relative min-h-screen bg-background">
      {/* CinemaIntro — the "Begin" splash. Always shown on page load.
          Locks scroll, forces scroll-to-top on refresh, and earns the
          audio-unlock click that the rest of the cinema needs.
          Renders first so it sits above all other chrome. */}
      <CinemaIntro />
      <CinemaChrome />
      {/* CinemaTopBar — minimal logo + Login + Get Started shown only while
          a cinema section is sticky-active. Reassures visitors landing on
          the cold-open caret that the page isn't broken. */}
      <CinemaTopBar />
      {/* MarketingHeader removed 2026-05-20 — Mo: "remove this top
          bar entirely, only the logo and 2 buttons which we have at
          very first screen only." The section-anchor nav (Who it's
          for / The problem / How it works / What you get / Under
          the hood / Deploy) competed visually with the cinema's
          CinemaTopBar and broke the immersive cold-open feel. Only
          CinemaTopBar (brand logo + Login + Try AssuredAI) remains.
          ScrollProgress hairline kept for orientation only — remove
          that line below too if it also feels like chrome.
      <HeroChromeGate>
        <ScrollProgress />
        <MarketingHeader authChip={<HeaderAuthChip />} />
      </HeroChromeGate> */}
      <main>
        {/* Story Cinema is the page opener now — the blinking caret cold-
            open is more dramatic than a conventional hero. Hero moved below
            so visitors arrive at the story moment instead of a marketing
            header. The dangerous sentence sits in a draft article frame at
            screen center for the whole timeline; Act I plays consequences
            around it; Act II shows AssuredAI verifying against federal
            sources and the article transforms into a verified publication. */}
        <StoryCinema />
        {/* Scroll cue — sits OUTSIDE the cinema's transformed
            sticky container so position:fixed reliably anchors to
            the viewport. Shows "↓ SCROLL TO BEGIN" when at page
            top, fades on first scroll. */}
        <ScrollToBeginCue />
        {/* IndustryShowcase — publication-style diptych. Numbered list of
            8 regulated verticals on the left; full-bleed industry hero on
            the right with crossfade transitions. Hover previews; click
            locks the selection and reveals the Explore link.

            CARD-PEEL REVEAL: IndustryShowcase needs to be visually
            STATIC during the cinema's lift — not scrolling past in
            normal flow. The structure:

              1. Outer wrapper has marginTop: -100vh + zIndex: 0,
                 pulling it up so it spans the cinema's last 100vh of
                 scroll AND sits beneath the cinema's z-index: 1 layer.

              2. INSIDE that wrapper, a 100vh-tall sticky pin holds
                 IndustryShowcase at top:0 of viewport throughout
                 those 100vh of scroll. While the user scrolls 1400→
                 1500vh, IndustryShowcase doesn't move — it's pinned.

              3. The cinema's sticky inner viewport translates UP via
                 `cinemaLiftY` during its last 6% of scroll. The cinema
                 lifts off the (static) IndustryShowcase, revealing it
                 as if it was always there.

              4. After scroll 1500vh, the sticky pin releases naturally
                 and the bridges/remaining sections follow in flow. */}
        {/* The three closing sections (industries → blurred peek →
            disclaimer) are wrapped in a black-canvas container so the page
            bg (which is light) can never bleed through a seam. Inside this
            wrapper, the inter-section transitions are pure-black-to-pure-
            black: no contrast jumps, no visible cuts. */}
        <div
          className="relative bg-black"
          style={{ marginTop: '-184vh', zIndex: 0 }}
        >
        {/* Sticky pin — holds IndustryShowcase PINNED at viewport
            top:0 throughout the cinema's PEEL window AND into the
            natural scroll past afterward.

            Cinema scroll math (1500vh-tall section, viewport 100vh):
              cinema scrollable range = 1400vh
              cinema peel = last 6% = scroll 1316vh → 1400vh
            For the pin to cover the peel, the wrapper's top needs to
            be at scroll 1316vh (or earlier). With cinema ending at
            scroll 1400vh, that requires marginTop: -(1400-1316) =
            -84vh from the natural position. Round up to -184vh so
            we get a 100vh pin range that comfortably covers the
            ~84vh peel plus a small buffer.

            Structure inside the wrapper:
              outer 200vh container provides the sticky scroll range
              (200vh parent - 100vh sticky = 100vh of pinning).
              That 100vh of pin coincides exactly with the cinema's
              peel window so the viewer sees a STATIC IndustryShowcase
              the whole time the cinema is sliding off. */}
        <div style={{ height: '200vh' }}>
          <div className="sticky top-0" style={{ height: '100vh' }}>
            <IndustryShowcase />
          </div>
        </div>
        {/* PasteAndScan removed (2026-05-19) — Mo: "remove the paste
            text demo section entirely. We don't need that here."
            Import left intact for potential future re-introduction
            without re-wiring. */}
        {/* ── BRIDGE 1: industries → blurred peek ──────────────────────
            Sits on top of the IndustryShowcase's bottom 28vh, fading its
            full-bleed photo into pure black so the next section emerges
            from darkness instead of hitting a hard seam. Negative top
            margin pulls it over the section above; z-10 lifts it above
            the photo. pointer-events:none lets the source-list clicks
            still pass through. ──────────────────────────────────────── */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative z-10"
          style={{
            marginTop: '-28vh',
            height: '28vh',
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0.94) 85%, #000 100%)',
          }}
        />
        {/* ── BLURRED PEEK OF THE UNFINISHED PAGE ──────────────────────
            The "there's more here, but it isn't done" signal — visible
            haze where the rest of the marketing page lives, with the real
            sections kept in the DOM so we can keep iterating on them.
            aria-hidden + pointer-events:none + max-height cap means nobody
            scrolls, clicks, or tabs into it. The page resolves at the
            PrototypeDisclaimer that follows.

            The mask gradient fades IN from transparent at the top (so the
            peek emerges from the black bridge above) and fades OUT to
            transparent at the bottom (so it dissolves into the disclaimer
            below) — no hard seam on either side. ───────────────────── */}
        <div
          aria-hidden="true"
          className="relative select-none bg-black"
          style={{
            maxHeight: '64vh',
            overflow: 'hidden',
            filter: 'blur(10px) saturate(0.75)',
            pointerEvents: 'none',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.78) 22%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0) 100%)',
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.78) 22%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0) 100%)',
            opacity: 0.82,
          }}
        >
          <SourcesOfTruth />
          <Hero proofExampleId={proofExampleId} />
          <HomeVerifierSection />
          <OutcomesStrip metrics={metrics} />
          <SectorTrust />
          <Audience />
          <TrustStrip />
          <FailureModes />
          <PullQuote attribution="HHS · OCR enforcement bulletins, 2024">
            <span className="text-foreground">The median malpractice settlement involving</span>{' '}
            <span className="font-serif italic font-normal text-primary">
              a single piece of published medical misinformation
            </span>{' '}
            <span className="text-foreground">is $1.8 million.</span>
          </PullQuote>
          <Stakes />
          <Origin />
          <Pipeline />
          <FeaturedArtifacts proofExampleId={proofExampleId} />
          <section className="mx-auto max-w-[1240px] px-5 py-12 sm:py-16">
            <HashChainCanvas />
          </section>
          <ShowcaseStrip />
          <Architecture />
          <WhitePaperQuote />
          <VoiceSection />
          <WordPressDiagram />
          <Comparison />
          <Pricing />
          <FAQDynamic />
          <HeroComplianceStrip />
          <HeroPromiseMarquee />
          <CTAFooter proofExampleId={proofExampleId} />
        </div>
        {/* ── BRIDGE 2: blurred peek → disclaimer ──────────────────────
            Negative top-margin pulls the disclaimer up to overlap the
            tail of the blurred peek; the peek's mask is already fading
            out by that point, so the two visually braid together with
            no seam. The disclaimer's own bg-black takes over as the peek
            mask reaches 0. ────────────────────────────────────────── */}
        <div style={{ marginTop: '-22vh' }}>
          {/* PrototypeDisclaimer — the resting place at the bottom of the
              page. Pulled up 22vh so its top fade-overlay overlaps the tail
              of the blurred peek; the two visually braid together. */}
          <PrototypeDisclaimer />
        </div>
        </div>{/* /three-section black canvas */}
      </main>
      <BackToTop />
    </div>
  );
}
