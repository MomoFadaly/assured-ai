/**
 * WhyNowConvergence — the opening hero block of §02 "Why now."
 *
 * Argues the timing case in four typographic beats, spatialized so the
 * page never becomes a wall of text:
 *
 *   1. Three Force Cards (horizontal triptych) — each one idea, each
 *      ~55 words, each tagged with a small SVG glyph that visually
 *      characterizes its kind of force (curve / instability / fan).
 *      Card #3 (AI) renders inside an animated rainbow-border frame
 *      (Apple-Intelligence Siri register) to flag it as the special
 *      force the brief is arguing about.
 *
 *   2. Convergence — three thin SVG arrows drop from the bottom of the
 *      force cards toward a single point. The visual moment where the
 *      three become one inflection.
 *
 *   3. Category Vacuum — four equal-weight cells in the competitive
 *      map. Three carry real-incumbent logos (Veeva, OneTrust,
 *      Grammarly) plus a short "owns:" tagline; the fourth is
 *      intentionally empty with a dashed emerald frame + corner
 *      brackets, labelled "Publishing compliance · For regulated
 *      teams." The reader's eye lands on the vacuum and the brain
 *      does the rest.
 *
 *   4. The Fueled Moment + The Window — a single typographic
 *      pull-quote ("Fueled has.") followed by the load-bearing 24-
 *      month claim as a giant display number. The escalation tops out
 *      here.
 */

import { BrandMark } from '@/components/verify/Brand';
import { COMP_LOGOS } from './logoData';

type ForceCardProps = {
  number: string;
  eyebrow: string;
  title: string;
  body: string;
  glyph: React.ReactNode;
  /**
   * When true, the card draws an animated rainbow-spectrum border +
   * soft halo around its perimeter — the visual register of Apple
   * Intelligence / Siri's "AI is operating" glow. Used on the AI
   * force card (#03) to flag *that one* as the AI-driven force the
   * brief is arguing about. The other two cards stay quiet so the
   * contrast does the signalling work.
   */
  glow?: boolean;
};

function ForceCard({ number, eyebrow, title, body, glyph, glow }: ForceCardProps) {
  const inner = (
    <div className="relative flex h-full flex-col bg-background p-8 lg:p-10">
      {/* Number tag + eyebrow */}
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-700">
            {number}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/55">
            {eyebrow}
          </span>
        </div>
        {/* Glyph — tiny SVG signal, top-right */}
        <div className="text-foreground/40">{glyph}</div>
      </div>

      {/* Title */}
      <h4
        className="mt-6 font-display text-[clamp(1.25rem,1.85vw,1.55rem)] font-normal leading-[1.18] text-foreground"
        style={{ fontVariationSettings: '"opsz" 48, "SOFT" 40' }}
      >
        {title}
      </h4>

      {/* Body */}
      <p className="mt-4 text-[14.5px] leading-[1.6] text-foreground/68">
        {body}
      </p>
    </div>
  );

  // When `glow` is true, wrap the card in a thin gradient frame.
  // Wrapper has 1.5px of padding + the animated rainbow background.
  // Inner card has bg-background which covers the gradient
  // everywhere except the 1.5px ring around the card — the visible
  // rainbow "border only."
  if (glow) {
    return <div className="ai-glow-frame">{inner}</div>;
  }
  return inner;
}

// ─────────────────────────────────────────────────────────────────────────
// Force glyphs — 24×24 viewBox, single-stroke geometric. Each one
// visually characterizes the kind of force in its card so the cards
// feel different at a glance without needing photography or colour.
// ─────────────────────────────────────────────────────────────────────────

function VolumeGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Exponential curve — starts flat, accelerates upward */}
      <path d="M2 21 Q 9 21, 13 15 Q 18 8, 22 3" />
      {/* Terminal dot at the peak */}
      <circle cx="22" cy="3" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function RulesGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* Three stacked rules — two aligned, one displaced (the one that just changed) */}
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="7" y1="18" x2="23" y2="18" />
    </svg>
  );
}

function AIGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* One source point at top */}
      <circle cx="12" cy="3.5" r="1.2" fill="currentColor" stroke="none" />
      {/* Fanning outward */}
      <line x1="12" y1="5" x2="6" y2="12" />
      <line x1="12" y1="5" x2="12" y2="12" />
      <line x1="12" y1="5" x2="18" y2="12" />
      {/* Three middle nodes */}
      <circle cx="6" cy="13" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="18" cy="13" r="0.9" fill="currentColor" stroke="none" />
      {/* Second-generation fans — multiplication */}
      <line x1="6" y1="14" x2="3" y2="21" />
      <line x1="6" y1="14" x2="9" y2="21" />
      <line x1="12" y1="14" x2="10" y2="21" />
      <line x1="12" y1="14" x2="14" y2="21" />
      <line x1="18" y1="14" x2="15" y2="21" />
      <line x1="18" y1="14" x2="21" y2="21" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ConvergenceArrows — three thin downward arrows from the force-card
// row toward a single converging point. Visual punctuation between the
// "three" and the "and the category sits empty" moment.
// ─────────────────────────────────────────────────────────────────────────

function ConvergenceArrows() {
  return (
    <div className="relative mx-auto h-20 max-w-[680px]" aria-hidden="true">
      <svg
        viewBox="0 0 680 80"
        className="h-full w-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Three arrows from spread positions converging toward center-bottom */}
        <g className="text-foreground/30">
          {/* Left arrow */}
          <line x1="110" y1="4" x2="340" y2="72" />
          <polyline points="332,66 340,72 332,74" strokeLinejoin="miter" />
          {/* Middle arrow */}
          <line x1="340" y1="4" x2="340" y2="72" />
          <polyline points="336,66 340,72 344,66" strokeLinejoin="miter" />
          {/* Right arrow */}
          <line x1="570" y1="4" x2="340" y2="72" />
          <polyline points="348,66 340,72 348,74" strokeLinejoin="miter" />
        </g>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CategoryVacuum — four-cell grid. Three competitor cells carry the
// real incumbent's logo + a one-line "owns:" tagline; the fourth is
// intentionally empty (dashed emerald frame, corner brackets,
// "Publishing compliance — For regulated teams"). The reader's eye
// reads three real companies + one labelled-but-empty slot, and the
// brain completes the argument by itself.
// ─────────────────────────────────────────────────────────────────────────

type Incumbent = {
  logo: { src: string; alt: string };
  name: string;
  owns: string;
  brandAccent: string; // emerald-on-light brand accent stripe colour
};

const INCUMBENTS: Incumbent[] = [
  {
    logo: COMP_LOGOS.veeva,
    name: 'Veeva',
    owns: 'Life-sciences workflow.',
    brandAccent: '#FF7300', // Veeva's brand orange
  },
  {
    logo: COMP_LOGOS.onetrust,
    name: 'OneTrust',
    owns: 'Privacy compliance.',
    brandAccent: '#2E2E2E', // OneTrust's brand near-black
  },
  {
    logo: COMP_LOGOS.grammarly,
    name: 'Grammarly',
    owns: 'Grammar.',
    brandAccent: '#15C39A', // Grammarly's brand green
  },
];

function IncumbentCell({ incumbent }: { incumbent: Incumbent }) {
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-md border border-foreground/12 bg-card/30 transition hover:border-foreground/25 hover:bg-card/55"
      style={{ minHeight: '168px' }}
    >
      {/* Brand-color accent stripe — mirrors the comparables grid
          pattern below, so the vacuum grid feels of-a-piece with §02's
          substantiation layer. */}
      <div
        aria-hidden="true"
        className="h-[3px] w-full"
        style={{ background: incumbent.brandAccent, opacity: 0.7 }}
      />
      <div className="flex flex-1 flex-col p-5 lg:p-6">
        {/* Logo row — fixed height so all three logos optically align */}
        <div className="mb-4 flex h-8 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={incumbent.logo.src}
            alt={incumbent.logo.alt}
            className="h-6 w-auto max-w-[120px] object-contain object-left opacity-85 transition group-hover:opacity-100"
            height="24"
            loading="lazy"
          />
        </div>
        {/* Eyebrow — incumbent name in mono-caps */}
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-foreground/55">
          {incumbent.name}
        </div>
        {/* What they own — one-line tagline */}
        <div className="mt-auto text-[clamp(0.95rem,1.2vw,1.1rem)] font-medium leading-[1.3] text-foreground/85">
          {incumbent.owns}
        </div>
      </div>
    </div>
  );
}

function ClaimCell() {
  // Fourth cell — the same shape and rhythm as the incumbent cells,
  // but instead of a current owner, this slot is claimed by AssuredAI.
  // The dashed emerald frame + corner brackets keep the cell visually
  // distinct (it's the bet, not the incumbent), and the brand mark +
  // wordmark live on the logo row in the exact slot the other three
  // logos occupy — so the reader's eye reads four players, one of
  // whom is making a claim on a category the others left empty.
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-md"
      style={{
        border: '1.5px dashed rgba(4, 120, 87, 0.55)',
        background:
          'linear-gradient(135deg, rgba(4,120,87,0.05) 0%, rgba(4,120,87,0.018) 100%)',
        minHeight: '168px',
      }}
    >
      {/* Emerald accent stripe — same rhythm as the brand-color stripes
          on the incumbent cells. AssuredAI's brand emerald. */}
      <div
        aria-hidden="true"
        className="h-[3px] w-full bg-emerald-600"
      />

      {/* Corner brackets — top-left + bottom-right. Frames the claim
          territory; signals "this is the lane we're building toward." */}
      <span
        className="pointer-events-none absolute left-2 top-3 h-3.5 w-3.5 border-l-2 border-t-2 border-emerald-700"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute bottom-2 right-2 h-3.5 w-3.5 border-b-2 border-r-2 border-emerald-700"
        aria-hidden="true"
      />

      <div className="flex flex-1 flex-col p-5 lg:p-6">
        {/* Logo row — AssuredAI brand mark + wordmark, same vertical
            slot as the incumbent logos. */}
        <div className="mb-4 flex h-8 items-center gap-2 text-emerald-700">
          <BrandMark size={22} />
          <span className="font-display text-[15px] font-semibold tracking-tight">
            AssuredAI
          </span>
        </div>
        {/* Eyebrow — the category being claimed. */}
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
          Publishing compliance
        </div>
        {/* Tagline — the lane AssuredAI is building toward. */}
        <div
          className="mt-auto text-[clamp(0.95rem,1.2vw,1.1rem)] font-medium leading-[1.3] text-emerald-700"
        >
          For regulated&nbsp;teams.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────

export default function WhyNowConvergence() {
  return (
    <div className="mb-24">
      {/* AI-glow keyframes + wrapper style. Apple-Intelligence / Siri
          register — a thin animated rainbow ring traced *only* around
          the card's perimeter. No outward halo (deliberate: the
          brief's editorial register doesn't want a glowing room).
          Implementation: a wrapper div paints the gradient and gets
          1.5px of padding; the inner card has bg-background, which
          covers the gradient everywhere except the 1.5px ring. No
          z-index gymnastics required.
          @prefers-reduced-motion: pin the animation at one frame so
          motion-sensitive users see a static rainbow border. */}
      <style>{`
        .ai-glow-frame {
          padding: 1.5px;
          background: linear-gradient(
            45deg,
            #ff0040, #ff8700, #ffd300, #25ff00,
            #00ffe9, #0070ff, #9800ff, #ff00ff,
            #ff0040, #ff8700, #ffd300, #25ff00,
            #00ffe9, #0070ff
          );
          background-size: 400% 100%;
          animation: ai-glow-shift 4s linear infinite;
        }
        @keyframes ai-glow-shift {
          0%   { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-glow-frame {
            animation: none;
            background-position: 30% 50%;
          }
        }
      `}</style>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BEAT 1 — Three Force Cards
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="rounded-lg border border-foreground/12 bg-foreground/[0.04]">
        <div className="grid grid-cols-1 divide-y divide-foreground/10 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <ForceCard
            number="01"
            eyebrow="Volume"
            title="The publishing volume passed human review."
            body="Regulated brands ship more content per day than ever — and the curve is exponential. Product pages, prescribing info, disclosure microsites, emails, chatbot answers. Legal and compliance can review some. Not all."
            glyph={<VolumeGlyph />}
          />
          <ForceCard
            number="02"
            eyebrow="Rules"
            title="The rules stopped sitting still."
            body="FDA OPDP, FTC, FINRA, OCR, state AGs — every one of them has updated its enforcement posture in the last eighteen months and signaled more to come. The posture isn’t “publish carefully.” It’s “the rule changed last quarter.” Static playbooks decay in months, not years."
            glyph={<RulesGlyph />}
          />
          <ForceCard
            number="03"
            eyebrow="AI"
            title="AI took the problem and squared it."
            body="Every regulated brand is shipping AI chatbots, advisors, marketing, disclosure. Each is a new publishing surface — speaking on behalf of the brand without human review. Doubled in size, quadrupled in stakes — in 18 months, not 10 years."
            glyph={<AIGlyph />}
            glow
          />
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BEAT 2 — Convergence Arrows
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ConvergenceArrows />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BEAT 3 — Category Vacuum
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="mx-auto max-w-[1100px] text-center">
        <h3
          className="font-display text-[clamp(1.75rem,3vw,2.4rem)] font-normal leading-[1.1] text-foreground"
          style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40' }}
        >
          Three incumbents. One open lane.
        </h3>
        <p className="mx-auto mt-4 max-w-[60ch] text-[clamp(0.95rem,1.15vw,1.05rem)] leading-[1.55] text-foreground/65">
          Veeva, OneTrust, and Grammarly each own a compliance category
          for their slice of content. The fourth &mdash;{' '}
          <em>publishing compliance for regulated teams</em> &mdash; has
          no incumbent. That&rsquo;s the lane AssuredAI is building.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          {INCUMBENTS.map((inc) => (
            <IncumbentCell key={inc.name} incumbent={inc} />
          ))}
          <ClaimCell />
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BEAT 4 — Fueled Moment
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="mx-auto mt-24 max-w-[760px]">
        {/* Hairline rule above */}
        <div className="h-px w-full bg-foreground/15" />

        <div className="py-12 text-center">
          <p
            className="font-display text-[clamp(3rem,6vw,5rem)] font-medium leading-[0.95] tracking-[-0.02em] text-foreground"
            style={{ fontVariationSettings: '"opsz" 144' }}
          >
            Fueled has.
          </p>
        </div>

        {/* Hairline rule below */}
        <div className="h-px w-full bg-foreground/15" />

        <p className="mx-auto mt-10 max-w-[62ch] text-center text-[clamp(0.95rem,1.15vw,1.05rem)] leading-[1.6] text-foreground/72">
          A decade of shipping digital products for these companies. The
          relationships, the trust, the standing &mdash; already paid
          for. The expensive half is done. What&rsquo;s left is the
          leverage.
        </p>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BEAT 5 — The Window (24 months)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="mx-auto mt-24 max-w-[820px] text-center">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
          The window
        </p>
        <p
          className="mt-5 font-sans font-bold tabular-nums leading-[0.9] tracking-[-0.04em] text-foreground"
          style={{ fontSize: 'clamp(4.5rem, 11vw, 9rem)' }}
        >
          24 months.
        </p>
        <p className="mx-auto mt-8 max-w-[58ch] text-[clamp(1rem,1.25vw,1.15rem)] leading-[1.55] text-foreground/72">
          After that, someone owns the category. Fueled is that company
          &mdash; or a partner to whoever is.
        </p>
      </div>
    </div>
  );
}
