'use client';

/**
 * StoryCinema — 10-scene pinned scroll cinema for the AssuredAI landing page.
 *
 *   Strategic arc:
 *     incident unfolding → freeze frame → rewind → AssuredAI prevents it.
 *
 *   Aesthetic: deep black / off-white / red-only-for-risk.
 *   Bloomberg Terminal meets enterprise compliance command center.
 *
 *   The cinema is a sticky-pinned section. Inside, ten scenes play out
 *   driven by the user's scroll progress through the section (0 → 1).
 *   Each scene is a layered absolute-positioned subtree whose visibility
 *   is gated on the scroll progress range it owns.
 *
 *   Scene timeline (progress 0 → 1):
 *     0.000 → 0.060   Scene 1: Cold open — huge serif headline, blinking cursor
 *     0.060 → 0.100   Headline shrinks to chapter chip at top
 *     0.100 → 0.220   Scene 2: Draft editor types the article
 *     0.220 → 0.270   Scene 3: Publish moment — button click + flash
 *     0.270 → 0.420   Scene 4: Comment storm on the live social post
 *     0.420 → 0.470   Scene 5: Freeze frame — everything stops
 *     0.470 → 0.560   Scene 6: Rewind — sequence reverses to draft
 *     0.560 → 0.740   Scene 7: AssuredAI scan + evidence panel
 *     0.740 → 0.880   Scene 8: Safe publish (correction + verified state)
 *     0.880 → 1.000   Scene 9: Product reveal — three pillars + CTA
 */

import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useScarcityCounter } from '@/lib/useScarcityCounter';
import { BrandMark } from '@/components/verify/Brand';
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
  cubicBezier,
  type MotionValue,
} from 'framer-motion';

// Cubic-bezier easing functions — passed to useTransform options so the
// interpolation between range stops feels cinematic rather than mechanical.
const easeOut = cubicBezier(0.16, 1, 0.3, 1);          // expo-out: snaps in, settles
const easeIn = cubicBezier(0.65, 0, 0.84, 0);          // expo-in:  slow start, fast exit
const easeInOut = cubicBezier(0.65, 0, 0.35, 1);       // expo-in-out: smooth both ends
const linear = (v: number) => v;

/* ════════════════════════════════════════════════════════════════════════
   COLOR PALETTE — restraint is the point, but every value is OWNED.
   Audit revealed the original palette was genre-default compliance-tech.
   Replaced with specific, distinctive values that test in 200ms recognition:
     • risk (#C62B2B)        — editorial-correction red, the ink a copy
                                editor uses to mark a draft
     • riskDeep (#9E1717)    — deeper blood-undertone red, reserved for
                                the lawsuit moment (NOT for edits)
     • watch (#FFB347)       — single amber accent for non-critical flags
     • safe (#2EA672)        — verified-by-FDA-seal green specifically
     • trust (#1D9BF0)       — credentialed-mark blue (Twitter-verified
                                hue) for brand-verification only
     • void (#0A0A0C)        — warm black with film-grain undertone
                                (was #050507 pure-cold void)
   The brand's red is the editorial-mark red — connecting product
   gesture (AI catches it = red underline) with brand identity (logo
   bleed-through = same red). One color, one meaning.
   ════════════════════════════════════════════════════════════════════ */

const C = {
  void: '#0A0A0C',
  surface: '#0E0E12',
  panel: '#13131C',
  panelLift: '#181822',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.14)',
  text: '#F4F4F6',
  textMuted: 'rgba(255,255,255,0.62)',
  textFaint: 'rgba(255,255,255,0.38)',
  /* Editorial-mark red — the ink a copy editor uses. Reserved for
     "we caught something dangerous." Used by: scanner lock-on,
     underline, dose-box, strikethrough, ink-bleed gesture. */
  risk: '#C62B2B',
  riskSoft: 'rgba(198,43,43,0.16)',
  riskGlow: 'rgba(198,43,43,0.42)',
  /* Deeper consequence red — reserved EXCLUSIVELY for the lawsuit
     moment. Distinguishes "editorial flag" from "this just cost
     you everything." Eye reads them as related but not identical. */
  riskDeep: '#9E1717',
  riskDeepGlow: 'rgba(158,23,23,0.55)',
  /* Single amber for watch/warn states (NON-critical flags) */
  watch: '#FFB347',
  watchSoft: 'rgba(255,179,71,0.18)',
  /* Verified-seal green — specifically the FDA-trusted-mark hue */
  safe: '#2EA672',
  safeSoft: 'rgba(46,166,114,0.14)',
  /* Trust blue — Twitter/X verified-blue specifically, for brand
     accounts and credentialed authority marks. */
  trust: '#1D9BF0',
  trustSoft: 'rgba(29,155,240,0.16)',
  /* Editor paper (the only "light" surface in the cinema) */
  paper: '#FBFAF7',
  paperLine: '#E8E5DE',
  paperText: '#16161A',
  paperTextMuted: 'rgba(22,22,26,0.55)',
  paperTextFaint: 'rgba(22,22,26,0.38)',
};

/* ────────────────────────────────────────────────────────────────────────
   ARTICLE CONTENT — the post that the AssuredAI customer is about to
   publish. The dangerous sentence reads as normal advice on first read,
   which is the point: misinformation hides inside fluent prose.
   ──────────────────────────────────────────────────────────────────── */

const ARTICLE_TITLE = 'Pain Relief Education Post';

const ARTICLE_PARAS = [
  'Ibuprofen is a common over-the-counter pain reliever used to reduce pain, fever, and inflammation.',
  'It can be helpful for headaches, muscle aches, menstrual cramps, toothaches, and other mild to moderate pain.',
  'Always follow the directions on the product label and talk to your healthcare provider if you have any questions.',
];

const RISKY_SENTENCE =
  'Adults may safely take up to 4,000 mg of ibuprofen per day for everyday pain relief.';

const CORRECTED_SENTENCE =
  'Follow the product label. Do not exceed 1,200 mg (OTC maximum) in a 24-hour period for adults unless directed by a physician.';

const RISKY_HIGHLIGHT = '4,000 mg of ibuprofen';

/* Relative post timestamp — uses today's date so the social card never goes
   stale. Earlier the card hard-coded "May 15, 2026", which read as a fixed
   point in the past once the calendar rolled forward. We keep the 10:42 AM
   time (the narrative is about a specific morning) but compute the date at
   render so it always says "today" to whoever is scrolling. */
function getPostTimestamp(): string {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'short' });
  return `10:42 AM · ${month} ${now.getDate()}, ${now.getFullYear()}`;
}

/* ────────────────────────────────────────────────────────────────────────
   COMMENT STORM — escalating pile-on. Avatars are deterministic, illustrated
   (DiceBear) — no real or AI-fabricated faces. Comment positions are
   roughly mapped to the floating grid in the published scene.
   ──────────────────────────────────────────────────────────────────── */

type Comment = {
  name: string;       // display name as a real person ("Sarah Liang")
  handle: string;     // @-handle as it would appear on a social platform
  photo: string;      // filename in /public/avatars/ (portrait photo)
  initials: string;   // 2-char fallback while the photo loads
  avatarHue: number;  // 0–360, used for the initials fallback background
  timestamp: string;
  text: string;
  highlight?: string; // substring rendered in red
  replies: number;
  reposts: number;
  likes: number;
  highImpact?: boolean; // adds red ring + glow
  verified?: boolean;   // shows a verified checkmark
  /** Distinguishes the mark style. 'brand' = corporate blue (Twitter/X
   *  style, e.g. an org account). 'credential' = green-teal medical
   *  badge — used for credentialed professionals (PharmD, MD). The two
   *  must read as different categories of trust at a glance. */
  verifiedKind?: 'brand' | 'credential';
  climax?: boolean;     // the dramatic "in the hospital" beat — extra entry emphasis
  tone: 'friendly' | 'critical';
};

const COMMENTS: Comment[] = [
  // Two friendly comments arrive first — the post looks like it's doing well.
  // This makes the turn that follows hit harder.
  {
    name: 'Sarah Liang',
    handle: '@sarahliang',
    photo: 'sarah-liang.jpg',
    initials: 'SL',
    avatarHue: 210,
    timestamp: 'just now',
    text: 'Great breakdown! Saved this one.',
    replies: 0,
    reposts: 3,
    likes: 24,
    tone: 'friendly',
  },
  {
    name: 'Marcus Webb',
    handle: '@marcus_webb',
    photo: 'marcus-webb.jpg',
    initials: 'MW',
    avatarHue: 28,
    timestamp: '1m',
    text: 'Helpful summary — appreciate the simple breakdown 🙏',
    replies: 1,
    reposts: 6,
    likes: 47,
    tone: 'friendly',
  },
  // The turn — first concerned voice. Tone shifts.
  {
    name: 'Janet Pham',
    handle: '@janetpham',
    photo: 'janet-pham.jpg',
    initials: 'JP',
    avatarHue: 280,
    timestamp: '2m',
    text: 'This dosage is not safe.',
    highlight: 'not safe.',
    replies: 12,
    reposts: 8,
    likes: 96,
    tone: 'critical',
  },
  // The credentialed voice — verified pharmacist. Legitimizes the alarm.
  {
    name: 'Dr. Nicole Park, PharmD',
    handle: '@drnicolepark',
    photo: 'nicole-park.jpg',
    initials: 'NP',
    avatarHue: 168,
    timestamp: '3m',
    text: 'As a pharmacist, this is incorrect and dangerous.',
    highlight: 'incorrect and dangerous.',
    replies: 23,
    reposts: 18,
    likes: 112,
    highImpact: true,
    verified: true,
    verifiedKind: 'credential',
    tone: 'critical',
  },
  {
    name: 'Amara Johnson',
    handle: '@amarajohnson',
    photo: 'amara-johnson.jpg',
    initials: 'AJ',
    avatarHue: 348,
    timestamp: '4m',
    text: 'Who approved this?',
    replies: 18,
    reposts: 9,
    likes: 87,
    tone: 'critical',
  },
  {
    name: 'James R. Hill',
    handle: '@jameshill_esq',
    photo: 'james-hill.jpg',
    initials: 'JH',
    avatarHue: 8,
    timestamp: '5m',
    text: 'This needs legal review immediately.',
    highlight: 'legal review',
    replies: 9,
    reposts: 4,
    likes: 51,
    tone: 'critical',
  },
  // The climax comment — gets a slight scale-up + ring pulse on entry.
  {
    name: 'David Chen',
    handle: '@davidchen',
    photo: 'david-chen.jpg',
    initials: 'DC',
    avatarHue: 198,
    timestamp: '6m',
    text: "My dad just followed this advice. He's in the hospital.",
    highlight: 'in the hospital.',
    replies: 36,
    reposts: 27,
    likes: 164,
    highImpact: true,
    climax: true,
    tone: 'critical',
  },
  {
    name: 'Emma Reyes',
    handle: '@emma.reyes',
    photo: 'emma-reyes.jpg',
    initials: 'ER',
    avatarHue: 320,
    timestamp: '7m',
    text: 'Screenshotted. This is going everywhere.',
    highlight: 'going everywhere.',
    replies: 40,
    reposts: 32,
    likes: 288,
    tone: 'critical',
  },
];

/* ────────────────────────────────────────────────────────────────────────
   TRUSTED SOURCES — referenced in the scan + safe-publish scenes.
   Wordmark treatments only, not direct copies of government logos.
   ──────────────────────────────────────────────────────────────────── */

type Source = {
  id: string;
  short: string;
  full: string;
  reference: string;
};

const SOURCES: Source[] = [
  { id: 'fda', short: 'FDA', full: 'U.S. Food & Drug Administration', reference: 'OTC Analgesics — Ibuprofen Labeling' },
  { id: 'dailymed', short: 'DailyMed', full: 'NIH Official Labeling Database', reference: 'Ibuprofen Tablets USP, 200 mg' },
  { id: 'nih', short: 'NIH', full: 'National Library of Medicine', reference: 'Ibuprofen — Drug Information' },
  { id: 'hc', short: 'Health Canada', full: 'Drug Product Database', reference: 'Ibuprofen — Consumer Information' },
  { id: 'who', short: 'WHO', full: 'World Health Organization', reference: 'Pharmacovigilance — Analgesics' },
];

/* ────────────────────────────────────────────────────────────────────────
   SCROLL PROGRESS HOOK — RAF + Lenis-friendly. Returns a MotionValue 0→1
   representing how far the user has scrolled through the cinema section.
   ──────────────────────────────────────────────────────────────────── */

function useSectionProgress(ref: RefObject<HTMLElement | null>): MotionValue<number> {
  const progress = useMotionValue(0);
  useEffect(() => {
    let rafId = 0;
    const compute = () => {
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const range = r.height - vh;
        const scrolled = -r.top;
        const p = Math.max(0, Math.min(1, range > 0 ? scrolled / range : 0));
        progress.set(p);
      }
      rafId = requestAnimationFrame(compute);
    };
    rafId = requestAnimationFrame(compute);
    const onScroll = () => compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
  }, [ref, progress]);
  return progress;
}

/* ════════════════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
   ════════════════════════════════════════════════════════════════════ */

/* Format a raw count to a compact display ("1,234" up to 999, then "1.2K",
   "12.4K"). Counts that climb past the K boundary use the K suffix; the
   transition is sharp because we never display fractional ones <1K. */
function formatCount(n: number): string {
  const v = Math.max(0, n);
  if (v < 1000) return String(Math.round(v));
  return `${(v / 1000).toFixed(v < 10000 ? 1 : 0)}K`;
}

/* AnimatedCount — scroll-driven tween from `start` to `end` over the
   `[scrollIn, scrollOut]` window. Emits formatted text into a span and
   fires a brief pulse animation each time the displayed string changes
   to a new K-milestone (1K, 10K, etc.) — the eye notices the climb
   without it feeling like a slot machine. */
function AnimatedCount({
  scrollYProgress,
  scrollIn,
  scrollOut,
  end,
  start = 0,
  rewindStart,
  rewindEnd,
  className,
  style,
  onTick,
}: {
  scrollYProgress: MotionValue<number>;
  scrollIn: number;
  scrollOut: number;
  end: number;
  start?: number;
  /** Optional reverse-tween: when provided, the count holds at `end`
   *  from `scrollOut` through `rewindStart`, then tweens back to
   *  `start` between `rewindStart` and `rewindEnd`. Used during the
   *  clock-rewind sequence so engagement numbers visibly UN-COUNT
   *  toward zero as time runs backward. */
  rewindStart?: number;
  rewindEnd?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Fires every time the displayed text changes (throttled to ~140ms
   *  so rapid sub-1K ticks don't spam the parent with re-renders). The
   *  parent uses this to pulse the adjacent icon, simulating each tick
   *  as a real social-media event. */
  onTick?: () => void;
}) {
  // Build the keyframe sequence: either a simple 0→end tween, or a
  // four-stop tween 0 → end → hold → 0 when a rewind range is provided.
  const counter = useTransform(
    scrollYProgress,
    rewindStart !== undefined && rewindEnd !== undefined
      ? [scrollIn, scrollOut, rewindStart, rewindEnd]
      : [scrollIn, scrollOut],
    rewindStart !== undefined && rewindEnd !== undefined
      ? [start, end, end, start]
      : [start, end],
    { clamp: true, ease: easeOut },
  );
  const [text, setText] = useState(() => formatCount(start));
  const textRef = useRef<string>(formatCount(start));
  const lastTickRef = useRef<number>(0);
  // Stash onTick in a ref so re-renders of the parent (which create a
  // fresh function reference) don't churn the subscription — otherwise
  // every tick remounts the listener and the counter state resets.
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  useEffect(() => {
    const apply = (v: number) => {
      const next = formatCount(v);
      if (next !== textRef.current) {
        textRef.current = next;
        setText(next);
        // Throttle so the icon pulse rhythm reads as "events landing"
        // rather than a continuous shimmer (which would happen sub-1K
        // where every integer change fires).
        const now = performance.now();
        if (now - lastTickRef.current > 140) {
          lastTickRef.current = now;
          onTickRef.current?.();
        }
      }
    };
    apply(counter.get());
    return counter.on('change', apply);
  }, [counter]);
  return (
    <span className={className} style={style}>
      {text}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   TickingMetric — one cell of the social-post engagement bar (icon +
   count). Pulses on every count tick: icon scales + color-flashes to
   its native social tint (reply blue, repost green, like coral, share
   white), simulating real-time social events landing. The pulse is
   subtle (scale 1.0 → 1.14) so the rhythm reads as activity, not as
   distraction.
   ──────────────────────────────────────────────────────────────────── */

const TICK_FLASH: Record<'reply' | 'repost' | 'like' | 'share', string> = {
  reply: '#5BA3F5',  // Twitter-style cyan/blue
  repost: '#3DDC97', // brand mint (matches "safe" green)
  like: '#FF4A6E',   // coral red (heart pump)
  share: '#FFFFFF',  // clean pop, no chromatic flair
};

function TickingMetric({
  scrollYProgress,
  scrollIn,
  scrollOut,
  end,
  rewindStart,
  rewindEnd,
  kind,
  mutedColor,
}: {
  scrollYProgress: MotionValue<number>;
  scrollIn: number;
  scrollOut: number;
  end: number;
  rewindStart?: number;
  rewindEnd?: number;
  kind: 'reply' | 'repost' | 'like' | 'share';
  mutedColor: string;
}) {
  const [tick, setTick] = useState(0);
  const flash = TICK_FLASH[kind];
  return (
    <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: mutedColor }}>
      <motion.span
        key={`tick-${tick}`}
        style={{ display: 'inline-flex' }}
        initial={{ scale: 1, color: mutedColor }}
        animate={
          tick > 0
            ? {
                scale: [1, 1.14, 1],
                color: [mutedColor, flash, mutedColor],
              }
            : { scale: 1, color: mutedColor }
        }
        transition={{ duration: 0.28, ease: 'easeOut', times: [0, 0.35, 1] }}
      >
        <SocialIcon kind={kind} size={14} color="currentColor" />
      </motion.span>
      {/* AnimatedCount is OUTSIDE the keyed motion.span — wrapping it
          would remount it on every tick and reset its internal state.
          The icon pulse alone sells the "event landed" moment. */}
      <AnimatedCount
        scrollYProgress={scrollYProgress}
        scrollIn={scrollIn}
        scrollOut={scrollOut}
        end={end}
        rewindStart={rewindStart}
        rewindEnd={rewindEnd}
        onTick={() => setTick((t) => t + 1)}
        style={{ color: mutedColor }}
      />
    </div>
  );
}

/* The blinking cursor that follows the cold-open headline.
 *
 * Upgraded 2026-05-19 for cinematic presence — Awwwards-grade cold open:
 *   • `glow` prop adds a soft halo around the caret so it has presence
 *     against the void instead of reading like a hairline.
 *   • Default color is the warm cream `C.text` (off-white). Red was
 *     overloaded — it later means *risk / strikethrough / the dangerous
 *     claim AssuredAI catches*, and that semantic payoff is undermined
 *     when the very first caret is already red. Off-white at first;
 *     scenes can opt into red for the moments where red actually means
 *     something.
 *   • Width default bumped 3 → 5 so the caret reads even at the
 *     prequel's reduced scale (0.45) during the empty-stage beat.
 *   • Breath cadence slowed to 1.4s and the off-state held at 0.15
 *     opacity (not 0) so the caret never fully disappears — it
 *     pulses like a held breath instead of chopping like a code editor.
 */
function BlinkingCursor({
  color = C.text,
  height = '1.05em',
  width = 5,
  glow = true,
  pulse = false,
}: {
  color?: string;
  height?: string;
  width?: number;
  glow?: boolean;
  pulse?: boolean;
}) {
  return (
    <motion.span
      aria-hidden="true"
      className={pulse && glow ? 'cold-open-caret-pulse' : undefined}
      style={{
        display: 'inline-block',
        width: `${width}px`,
        height,
        backgroundColor: color,
        marginLeft: '0.08em',
        verticalAlign: 'baseline',
        transform: 'translateY(0.1em)',
        borderRadius: 1,
        boxShadow: pulse
          ? undefined /* glow handled by .cold-open-caret-pulse keyframe */
          : glow
            ? `0 0 14px ${color === C.risk ? 'rgba(255,74,74,0.65)' : 'rgba(244,239,229,0.70)'}, 0 0 28px ${color === C.risk ? 'rgba(255,74,74,0.35)' : 'rgba(244,239,229,0.32)'}`
            : undefined,
      }}
      // Blink cadence: 1.0s loop with proper easing — the cursor
      // *breathes* instead of *chops*. The previous 0.85s linear
      // hard-cut read as a clock tick (Windows text-editor cadence);
      // this version reads as a heartbeat (cinematic title-card
      // cadence). Hold 300ms full-on → 200ms easeIn fade-out →
      // 300ms full-off → 200ms easeOut fade-in. The viewer doesn't
      // consciously notice the difference but feels the cursor
      // come alive.
      animate={{ opacity: [1, 1, 0, 0, 1] }}
      transition={{
        duration: 1.0,
        repeat: Infinity,
        times: [0, 0.30, 0.50, 0.80, 1.0],
        ease: ['linear', 'easeIn', 'linear', 'easeOut'],
      }}
    />
  );
}

/* Crosshair corner markers — frame the cold-open headline like a target */
function CrosshairCorner({
  position,
  size = 24,
  color = C.textFaint,
}: {
  position: 'tl' | 'tr' | 'bl' | 'br';
  size?: number;
  color?: string;
}) {
  const half = size / 2;
  const isLeft = position === 'tl' || position === 'bl';
  const isTop = position === 'tl' || position === 'tr';
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <line
        x1={isLeft ? 0 : size}
        y1={half}
        x2={isLeft ? half + 6 : half - 6}
        y2={half}
        stroke={color}
        strokeWidth="1"
      />
      <line
        x1={half}
        y1={isTop ? 0 : size}
        x2={half}
        y2={isTop ? half + 6 : half - 6}
        stroke={color}
        strokeWidth="1"
      />
    </svg>
  );
}

/* The AssuredAI shield wordmark — top-left nav element */
/* AssuredAIWordmark — the brand mark IS the gesture. Replaces the
   former shield-with-check (indistinguishable from every Series A
   compliance startup) with a custom typographic mark: lowercase
   italic "a" in editorial serif with a red ink-underline beneath it.
   The underline IS the AI's signature mark — the same red gesture
   the product draws beneath dangerous sentences. Brand = product
   gesture, one move. The underline ends in a small ink-bleed dot
   (the signature "drop of red ink" that becomes the brand's
   200ms-recognition image — see InkBleed component). */
function AssuredAIWordmark({ size = 18 }: { size?: number }) {
  // Mark dimensions tuned for nav-bar use at size=18px. The mark
  // glyph itself is 22×22 (slightly larger than label height for
  // optical balance) with the ink-bleed extending 2px below the
  // baseline so the underline reads as wet ink, not pixel-perfect
  // geometry.
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={Math.round(size * 1.25)}
        height={Math.round(size * 1.45)}
        viewBox="0 0 28 32"
        aria-hidden="true"
        style={{ overflow: 'visible' }}
      >
        {/* The italicized "a" — drawn with editorial serif weight
            (Playfair / Bodoni hybrid feel) rather than rendered text
            because we need PRECISE control over the underline anchor
            and the bleed-shape. SVG path approximates a lowercase
            italic "a" in display-serif at 22pt. */}
        <path
          d="M6.5 21.4
             c0-2.8 2.0-5.2 5.0-5.2
             c1.8 0 3.3 0.9 4.2 2.3
             v-2.0
             c0-2.8-1.4-4.0-3.6-4.0
             c-1.8 0-3.0 0.7-4.4 1.8
             l-0.4-1.2
             c1.6-1.3 3.4-2.0 5.4-2.0
             c3.6 0 5.8 2.0 5.8 5.4
             v9.5
             h-1.8
             l-0.6-1.8
             c-0.9 1.3-2.4 2.2-4.6 2.2
             c-3.0 0-5.0-2.0-5.0-5.0z
             M11.8 25.0
             c2.0 0 3.8-1.4 3.8-4.2
             v-0.5
             c0-0.8-1.4-1.7-3.2-1.7
             c-2.4 0-3.8 1.3-3.8 3.3
             c0 1.9 1.3 3.1 3.2 3.1z"
          fill={C.text}
          fillRule="evenodd"
        />
        {/* The red ink-underline — the brand's signature gesture.
            Stroke not fill so the line ENDS in a small accumulating
            ink-pool (the bleed-dot) that gives the mark its
            ownership. Slight irregularity (path has tiny vertical
            wobble) so it reads as hand-drawn ink, not a CSS border. */}
        <path
          d="M3.5 28.2
             c4.5 -0.4 9.2 -0.4 13.6 -0.2
             c2.8 0.1 5.4 0.3 7.2 0.5"
          fill="none"
          stroke={C.risk}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Ink-bleed terminator — the wet-ink dot at the right end
            of the underline. THIS is the brand's 200ms image — an
            organic red shape that bleeds slightly. Unique. Ownable. */}
        <path
          d="M24.0 28.4
             c0.3 -0.1 0.6 -0.0 0.9 0.2
             c0.4 0.4 0.5 1.0 0.2 1.4
             c-0.2 0.3 -0.5 0.5 -0.9 0.4
             c-0.5 -0.1 -0.9 -0.5 -0.9 -1.0
             c0 -0.5 0.3 -0.9 0.7 -1.0z"
          fill={C.risk}
        />
      </svg>
      <span
        className="text-[13px] font-semibold tracking-[0.02em]"
        style={{ color: C.text, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
      >
        Assured AI
      </span>
    </div>
  );
}

/* Profile-photo avatar — renders a real portrait photo from /public/avatars/
   with a colored-initials fallback layered beneath. The fallback is only
   visible until the image paints (or if the file 404s), so the avatar
   never reads as the default-account "empty circle" pattern; the image
   loads and you see a real-looking face the same way a live Twitter/X
   thread does. */
function CommenterAvatar({
  photo,
  initials,
  hue,
  size = 36,
}: {
  photo: string;
  initials: string;
  hue: number;
  size?: number;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: `linear-gradient(135deg, hsl(${hue},32%,38%), hsl(${(hue + 18) % 360},36%,26%))`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        fontWeight: 600,
        fontSize: size * 0.42,
        letterSpacing: '0.02em',
        color: 'rgba(255,255,255,0.88)',
      }}
    >
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {initials}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/avatars/${photo}`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  );
}

// Legacy DiceBear-static avatar — preserved for the (currently unused)
// SocialPostCard component. Real-looking avatars now use CommenterAvatar
// above with initials + a hue per person.
function _LegacyDiceBearAvatar({ seed, size = 36 }: { seed: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        backgroundColor: C.panelLift,
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/avatars/${seed}.svg`}
        alt=""
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', display: 'block' }}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

/* Trust-source wordmark — uniform text-wordmark across ALL sources.
   SOURCES-FIX (2026-05-19): the previous design embedded decorative
   icons inside source badges (HC's red star, WHO's compass). At the
   small footer size, those red/green icons COLLIDED with the state
   indicators (spinner ring, verified check) — the eye couldn't tell
   if a badge was checking, verified, or just decorated. Standardized
   to clean monospace wordmarks so the STATE is the only signal. */
function SourceMark({ source, size = 'sm' }: { source: Source; size?: 'sm' | 'md' }) {
  const px = size === 'sm' ? { h: 26, font: 11, padX: 10 } : { h: 32, font: 12.5, padX: 12 };
  return (
    <div
      style={{
        height: px.h,
        paddingLeft: px.padX,
        paddingRight: px.padX,
        borderRadius: 5,
        border: `1px solid ${C.hairlineStrong}`,
        backgroundColor: 'rgba(255,255,255,0.04)',
        color: C.text,
        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        fontWeight: 600,
        fontSize: px.font,
        letterSpacing: '0.04em',
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {source.short}
    </div>
  );
}

/* Heart / repost / reply / share icons for the social post */
function SocialIcon({ kind, size = 14, color = C.textMuted }: { kind: 'reply' | 'repost' | 'like' | 'share'; size?: number; color?: string }) {
  const paths: Record<string, string> = {
    reply: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
    repost: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
    like: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[kind]} />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   InkBleed — THE SIGNATURE GESTURE
   ════════════════════════════════════════════════════════════════════
   When AssuredAI catches something dangerous, the mark doesn't just
   underline — red INK BLEEDS UP THROUGH THE PAPER from underneath, as
   if the document itself is rejecting the falsehood. This is the
   visual move that lives nowhere else. Brand = product = gesture.

   The component renders an organic, irregular red shape that
   APPEARS TO SOAK INTO the paper from below. Three layers:
     1. base bleed — wide irregular stain, low opacity, blurred (the
        ink soaking through fiber)
     2. mid bleed — sharper irregular outline, medium opacity
     3. surface mark — crisp ink stroke on top (the actual line)

   The `progress` prop (0→1) drives the bleed UPWARD over time:
     progress 0    → completely below the line, invisible
     progress 0.3  → first wisps of red appear at the bottom edge
     progress 0.6  → ink spreads sideways and rises ~50%
     progress 1.0  → full bleed, the line is now bordered by red
                     stain that radiates 3-4mm above and below

   Used by:
     • Scene 5 freeze (pencil-circle replacement)
     • Scene 7 dangerous-sentence underline
     • Scene 8 strikethrough
     • All "the AI caught it" moments — same gesture, every time

   Why it works: most landing pages signal "warning" with red
   rectangles or red text. The bleed is organic, physical, ALIVE —
   it suggests the document itself is reacting. That's a Sagmeister
   gesture in a category that defaults to Bootstrap alerts. */
function InkBleed({
  width,
  height = 22,
  progress = 1,
  variant = 'underline',
}: {
  /** Horizontal extent of the bleed (px) — typically the width of
   *  the sentence being marked. */
  width: number;
  /** Vertical extent above + below the bleed midline (px). 22px
   *  default = 11px up + 11px down. */
  height?: number;
  /** Animation progress 0→1. Driven by scrollYProgress in cinema
   *  contexts. The bleed grows from invisible to full as progress
   *  ramps. */
  progress?: number;
  /** Visual mode:
   *   underline → bleed lives at the bottom of a text line (Scene 7)
   *   strike    → bleed crosses through a text line (correction)
   *   circle    → bleed pools around a specific word (Scene 5 freeze) */
  variant?: 'underline' | 'strike' | 'circle';
}) {
  // Bleed radius scales with progress — the longer the AI looks, the
  // more the ink soaks in.
  const bleedScale = Math.max(0, Math.min(1, progress));
  const baseRadius = height * 0.85 * bleedScale;
  const midRadius = height * 0.45 * bleedScale;

  // Generate 6 irregular control points along the width for the
  // organic-stain path. Same seed every render so it doesn't shimmer.
  const points = useMemo(() => {
    const stops = 7;
    return Array.from({ length: stops }, (_, i) => {
      const t = i / (stops - 1);
      // Pseudo-random irregularity seeded by i+width
      const seed = Math.sin(i * 12.9898 + width * 0.0001) * 43758.5453;
      const jitter = (seed - Math.floor(seed)) * 0.4 - 0.2;
      return { t, jitter };
    });
  }, [width]);

  const buildBleedPath = (radiusFactor: number): string => {
    const r = baseRadius * radiusFactor;
    const midY = height / 2;
    // Top edge (above the line — bleed rising up)
    const topPoints = points.map((p) => ({
      x: p.t * width,
      y: midY - r * (0.7 + p.jitter),
    }));
    // Bottom edge (below the line — bleed pooling down)
    const bottomPoints = points
      .slice()
      .reverse()
      .map((p) => ({
        x: p.t * width,
        y: midY + r * (0.55 + p.jitter * 0.7),
      }));
    const all = [...topPoints, ...bottomPoints];
    if (all.length === 0) return '';
    let path = `M ${all[0].x} ${all[0].y}`;
    for (let i = 1; i < all.length; i++) {
      // Smooth curve between points
      const prev = all[i - 1];
      const curr = all[i];
      const cx = (prev.x + curr.x) / 2;
      path += ` Q ${cx} ${prev.y} ${curr.x} ${curr.y}`;
    }
    path += ' Z';
    return path;
  };

  // Surface mark — the crisp line on top of the bleed
  const surfaceMarkPath = (() => {
    const midY = height / 2;
    if (variant === 'underline') {
      // Wavy line approximating a wet-ink underline
      return `M 1 ${midY + 2} Q ${width * 0.25} ${midY + 1.6}, ${width * 0.5} ${midY + 2.2} T ${width - 1} ${midY + 1.8}`;
    }
    if (variant === 'strike') {
      // Strikethrough — line across the middle
      return `M 1 ${midY} Q ${width * 0.33} ${midY - 0.5}, ${width * 0.66} ${midY + 0.5} T ${width - 1} ${midY}`;
    }
    // Circle — wraps around the bleed cloud (handled by parent SVG dims)
    return '';
  })();

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ overflow: 'visible', pointerEvents: 'none' }}
    >
      <defs>
        <filter id={`ink-bleed-blur-${width}-${height}`} x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <filter id={`ink-bleed-blur-soft-${width}-${height}`} x="-10%" y="-80%" width="120%" height="260%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>
      {/* ── T10 — THREE-STAGE INK-BLEED CASCADE ──────────────────
          Audit found the three layers (base/mid/surface) faded in
          lockstep, reading as a CSS opacity ramp rather than ink
          soaking through paper. Now each layer has its OWN progress
          curve with different start point and different easing —
          physical materials have different inertias:
            • base bleed starts at progress 0.00, slow ease       (the stain)
            • mid bleed starts at progress 0.15, medium spring    (the front)
            • surface mark starts at progress 0.40, sharp expo    (the line)
          The eye perceives THREE separate physical events: stain
          spreads → ink front catches up → mark is deposited.
          Looks like real ink soaking through paper. */}
      {(() => {
        // Per-layer progress with stagger + custom curves
        const layer1Progress = Math.max(0, Math.min(1, bleedScale / 0.85)); // slow curve, starts first
        const layer2Progress = Math.max(0, Math.min(1, (bleedScale - 0.15) / 0.55));
        const layer3Progress = Math.max(0, Math.min(1, (bleedScale - 0.40) / 0.45));
        // Apply easing curves (approximate cubic-bezier in pure JS)
        const ease1 = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out
        const ease2 = (t: number) => 1 - Math.pow(1 - t, 3); // medium ease-out (spring-like)
        const ease3 = (t: number) => 1 - Math.pow(1 - t, 5); // sharp expo-out
        const p1 = ease1(layer1Progress);
        const p2 = ease2(layer2Progress);
        const p3 = ease3(layer3Progress);
        return (
          <>
            {/* Layer 1 — base bleed. Soaks through paper fiber.
                Low opacity, heavy blur, wide radius. Starts FIRST
                with slow ease — the stain spreading. */}
            <path
              d={buildBleedPath(1.0)}
              fill={C.risk}
              opacity={0.22 * p1}
              filter={`url(#ink-bleed-blur-soft-${width}-${height})`}
            />
            {/* Layer 2 — mid bleed. Active ink front. Starts
                +0.15 progress later, medium spring easing — the
                concentrated ink catching up. */}
            <path
              d={buildBleedPath(0.55)}
              fill={C.risk}
              opacity={0.42 * p2}
              filter={`url(#ink-bleed-blur-${width}-${height})`}
            />
            {/* Layer 3 — surface mark. Crisp deposited line.
                Starts +0.40 progress later, sharp expo-out — the
                final stroke being laid down crisply. */}
            {variant !== 'circle' && (
              <path
                d={surfaceMarkPath}
                fill="none"
                stroke={C.risk}
                strokeWidth={variant === 'strike' ? 1.6 : 2.0}
                strokeLinecap="round"
                opacity={p3}
              />
            )}
            {/* Ink-pool terminator at line end. Same stagger as
                surface mark — appears with the line. */}
            {variant !== 'circle' && p3 > 0.3 && (
              <circle
                cx={width - 2}
                cy={variant === 'underline' ? height / 2 + 1.8 : height / 2}
                r={1.3 + 0.6 * p3}
                fill={C.risk}
                opacity={0.85 * p3}
              />
            )}
          </>
        );
      })()}
    </svg>
  );
}

/* InkBleedMark — bridge component that lets MotionValue-driven
   contexts use InkBleed without re-rendering its parent every tick.
   Subscribes to the progress MotionValue and translates ticks into
   React state so InkBleed (which takes a plain number) updates
   smoothly on scroll. Auto-measures its container's box so the
   bleed scales to fit. */
function InkBleedMark({
  progress,
  variant = 'circle',
}: {
  progress: MotionValue<number>;
  variant?: 'underline' | 'strike' | 'circle';
}) {
  // Uses <span> (NOT <div>) because this component is rendered
  // inside a <p> for the TypedLine. HTML disallows <div> inside
  // <p>; using span with display:block keeps it valid + same
  // visual layout.
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 100, h: 30 });
  const [p, setP] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setBox({ w: r.width, h: r.height });
      }
    };
    update();
    const u = progress.on('change', setP);
    setP(progress.get());
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { u(); ro.disconnect(); };
  }, [progress]);

  return (
    <span ref={containerRef} style={{ position: 'absolute', inset: 0, display: 'block' }}>
      <InkBleed
        width={box.w}
        height={box.h}
        progress={p}
        variant={variant}
      />
    </span>
  );
}

/* VerifiedMark — distinguishes two categories of trust at a glance.
   'brand'      → Twitter/X-style blue starburst (#1D9BF0). Corporate
                  account, the org saying "this is us." This is the mark
                  the publisher (WellLife Health) wears.
   'credential' → Green-teal starburst (#2EA672) with a small "Rx"-style
                  badge tick. Worn by credentialed individuals (PharmD,
                  MD) — reads as "a domain expert is on the record."
   Why two: the storm features Dr. Nicole Park, PharmD. If her mark
   looked identical to a corporate account's, the credentialed voice
   would lose its narrative weight. Different mark = different category
   of authority = the alarm she raises lands with more force. */
function VerifiedMark({ kind = 'brand', size = 13 }: { kind?: 'brand' | 'credential'; size?: number }) {
  const isCredential = kind === 'credential';
  const fill = isCredential ? '#2EA672' : '#1D9BF0';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
      data-verified-kind={kind}
    >
      <path
        d="M12 2l3 3 4-1 1 4 3 3-3 3-1 4-4-1-3 3-3-3-4 1-1-4-3-3 3-3 1-4 4 1 3-3z"
        fill={fill}
      />
      {isCredential ? (
        // Credential tick — slightly thicker mark + tiny inner ring read
        // as "approved by an authority body" rather than "this account
        // is who it claims to be."
        <>
          <path
            d="M9 12l2 2 4-5"
            stroke="white"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <path
          d="M9 12l2 2 4-5"
          stroke="white"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PERSISTENT NAV — top bar, visible the entire cinema. Sits OVER all
   scenes so it never gets obscured.
   ════════════════════════════════════════════════════════════════════ */

function CinemaNav() {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 top-0 z-[60] flex items-center justify-between px-8 py-6"
    >
      <AssuredAIWordmark />
      <div
        className="flex items-center gap-8 text-[10.5px] uppercase tracking-[0.22em]"
        style={{
          color: C.textMuted,
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        }}
      >
        <span>Content safety for regulated brands</span>
      </div>
    </div>
  );
}

/* Chapter chip — fades in only AFTER the cold-open headline is fully gone,
   so they never overlap. Slight slide-down + soft scale to feel arrived. */
function ChapterChip({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const opacity = useTransform(
    scrollYProgress,
    [0.088, 0.118, 0.42, 0.46, 0.88, 0.92],
    [0, 1, 1, 0, 0, 0],
    { clamp: true, ease: [easeOut, linear, easeIn, linear, linear] },
  );
  const y = useTransform(scrollYProgress, [0.088, 0.118], [-10, 0], {
    clamp: true,
    ease: easeOut,
  });
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-[60px] z-[50] -translate-x-1/2 whitespace-nowrap"
      style={{ opacity, y }}
    >
      <div
        className="flex items-center gap-3.5 text-[14px] font-bold uppercase tracking-[0.18em]"
        style={{
          color: C.text,
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        }}
      >
        <span>ONE</span>
        <span style={{ color: C.risk }}>BAD SENTENCE</span>
        <span>IS ALL IT TAKES.</span>
      </div>
    </motion.div>
  );
}

/* Chapter beat counter — "3 / 10 | The draft looks fine." */
/* ChapterBeat removed — was the "01 / 10 — Introduction" counter that the
   user asked to take out. ChapterChip was removed in the same pass. */

/* ════════════════════════════════════════════════════════════════════════
   SCENE 1 — Cold Open
   Huge serif headline with blinking cursor. Crosshair corners frame the
   stage. Subtle side labels suggest the theme.
   ════════════════════════════════════════════════════════════════════ */

/* The cold-open headline text, split into the two visual lines. The caret
   anchor for line 1 is the index where "bad" starts so it can be styled
   while the user is still typing it in. */
const COLD_LINE_1 = 'One bad sentence';
const COLD_LINE_2 = 'is all it takes.';
const COLD_TOTAL = COLD_LINE_1.length + COLD_LINE_2.length;
const COLD_BAD_START = COLD_LINE_1.indexOf('bad'); // 4
const COLD_BAD_END = COLD_BAD_START + 3;           // 7

/* Prequel — the context line that lands BEFORE the headline. Establishes
   the scale ("millions of words") so the punchline ("One bad sentence")
   feels like the inevitable consequence rather than an isolated claim.
   The prequel TYPES IN as ONE LINE at a smaller scale, then transforms
   INTO the two-line headline via a Millions Echo + morph.
   ────────────────────────────────────────────────────────────────────
   PREQUEL_FULL is what the user reads during typing — one continuous
   line. During the morph, the line splits into two halves aligned with
   the headline's L1/L2 structure (16 chars each on L1; the L2 chars
   beyond 16 lock to empty so the line collapses to the shorter punchline). */
const PREQUEL_FULL = 'Every year, your brand sends millions of words into the world.';
const PREQUEL_TYPED_TOTAL = PREQUEL_FULL.length; // 62 (incl. the joining space)
// Morph-time split — the space at index 16 becomes the line break.
const PREQUEL_MORPH_L1 = 'Every year, your';                                  // 16
const PREQUEL_MORPH_L2 = 'brand sends millions of words into the world.';     // 45
// Display-time split — for the typing beat the prequel renders as two
// lines so it doesn't overflow the viewport at the prequel's effective
// ~66px size. The break point is intentional: ending line 1 on "sends"
// creates the cinematic beat where the SUBJECT (your brand + verb) is
// established before the SCALE reveal ("millions of words") on line 2.
// The space at index 28 ("sends millions") is consumed by the break,
// so neither line carries leading or trailing whitespace.
const PREQUEL_DISPLAY_L1 = 'Every year, your brand sends';                    // 28
const PREQUEL_DISPLAY_L2 = 'millions of words into the world.';               // 33
const PREQUEL_BREAK_INDEX = PREQUEL_DISPLAY_L1.length;                        // 28
// PREQUEL_FULL[28] is the joining space. Char index 29 onwards is line 2.

// Word-by-word arrays for the deletion mechanic. The user "selects"
// (highlight) and "deletes" (vanish) each word in sequence, right-to-
// left, as if hitting Ctrl+Backspace repeatedly with continuous scroll.
// Order: line 2 rightmost word first ("world."), then leftward across
// line 2, then line 1 rightmost ("sends"), leftward across line 1.
const PREQUEL_L1_WORDS = PREQUEL_DISPLAY_L1.split(' '); // ['Every','year,','your','brand','sends']
const PREQUEL_L2_WORDS = PREQUEL_DISPLAY_L2.split(' '); // ['millions','of','words','into','the','world.']
const PREQUEL_TOTAL_WORDS = PREQUEL_L1_WORDS.length + PREQUEL_L2_WORDS.length; // 11
// For a word at L1 array index i, its deletion order index is:
//   L2_count + (L1_count - 1 - i)
// For a word at L2 array index i, its deletion order index is:
//   L2_count - 1 - i
// (deletion-order 0 = first to delete = rightmost word on line 2)
const wordDeletionIndexL1 = (i: number) =>
  PREQUEL_L2_WORDS.length + (PREQUEL_L1_WORDS.length - 1 - i);
const wordDeletionIndexL2 = (i: number) =>
  PREQUEL_L2_WORDS.length - 1 - i;

/* Latin alphabet for the scramble effect — mixed-case keeps the visual
   busy without introducing punctuation that would read as "code". */
const SCRAMBLE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* Deterministic pseudo-random — keeps ghost-echo positions stable across
   renders (no flicker from re-randomizing on every state change). */
function seededRand(seed: number): number {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}

/* Renders the typed prefix of line 1, applying italic red styling to
   whatever portion of "bad" has been typed so far. */
/* Render each character of a string as an animated `.cold-open-char`
 * span — the CSS keyframe `coldOpenCharIn` fades + lifts each character
 * into place over 110ms. Spaces are rendered as `.cold-open-char-space`
 * (no animation — animating a blank reads as a stutter).
 *
 * The `key={index}` ensures characters keep stable identity across
 * re-renders: when prequelTyped goes from 5 → 6, characters 0-4 don't
 * re-animate (their elements persist), only character 5 mounts fresh
 * and runs its animation. That's the trick that gives us a "real
 * typewriter" feel without re-animating the whole line every frame. */
function renderTypingChars(text: string) {
  return text.split('').map((char, i) => {
    if (char === ' ') {
      return <span key={i} className="cold-open-char-space" aria-hidden="true">{' '}</span>;
    }
    return (
      <span key={i} className="cold-open-char">{char}</span>
    );
  });
}

/* COLD_LINE_2 ("is all it takes.") renderer — same per-char animation
 * as renderTypingChars, but the closing period gets an additional
 * scale-pulse animation (.cold-open-period). The viewer sees the
 * period LAND with emphasis, like a writer slapping down the
 * punctuation. This is the moment the punchline crystallizes. */
function renderColdL2(typed: string) {
  if (typed.length === 0) return null;
  if (typed.length < COLD_LINE_2.length) {
    return renderTypingChars(typed);
  }
  // Full line typed — the period gets emphasis. Render everything
  // before the period as normal animated chars, then the period itself
  // as a .cold-open-period span which adds the scale-pulse keyframe.
  const beforePeriod = typed.slice(0, -1);
  const period = typed.slice(-1);
  return (
    <>
      {renderTypingChars(beforePeriod)}
      <span key="period" className="cold-open-period">
        {period}
      </span>
    </>
  );
}

function renderColdL1(typed: string) {
  if (typed.length <= COLD_BAD_START) {
    return renderTypingChars(typed); // haven't reached "bad" yet
  }
  const before = typed.slice(0, COLD_BAD_START);
  const badPart = typed.slice(COLD_BAD_START, Math.min(typed.length, COLD_BAD_END));
  const after = typed.slice(COLD_BAD_END);
  // Word-level "settled" trigger. The bad-ink color transition only
  // makes sense once ALL THREE characters of "bad" are typed — that's
  // the moment the word becomes recognizable as a noun. Triggering
  // per-character (the prior approach) meant each char animated its
  // own white→red transition starting 80ms after mount; in practice
  // the eye perceives only the final red state because each char's
  // animation completes before the next char arrives. By gating the
  // recolor on the FULL word being present, we get one observable
  // event: the viewer reads "bad" in neutral, then watches it ignite.
  const wordSettled = badPart.length === COLD_BAD_END - COLD_BAD_START;
  return (
    <>
      {renderTypingChars(before)}
      {/* The "bad" word — each char animates in via coldOpenCharIn at
          the neutral text color. The wrapper carries `.cold-open-bad-word`
          which holds the white color, and gains `.cold-open-bad-word-settled`
          the instant the full word is present — that triggers a 460ms
          color transition (after a 140ms hold) to the editorial red.
          Color inherits down to every child .cold-open-char, so all
          three letters reveal together as ONE recognition moment. */}
      <span
        className={
          wordSettled
            ? 'cold-open-bad-word cold-open-bad-word-settled'
            : 'cold-open-bad-word'
        }
        style={{ fontStyle: 'italic', fontWeight: 600 }}
      >
        {badPart.split('').map((char, i) => (
          <span key={`bad-${i}`} className="cold-open-char">
            {char}
          </span>
        ))}
      </span>
      {/* Spaces/chars after "bad" — note the leading space after the
          "d" is rendered as part of `after`, so we keep using
          renderTypingChars which handles spaces. */}
      {renderTypingChars(after)}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   VanishingChar — ONE character of the prequel during the caret-as-vacuum
   delete. Each char has its OWN evaporation window timed to when the
   caret (traveling right-to-left) passes over its position. When the
   caret crosses, the char briefly lifts upward and fades to nothing —
   the difference between "deleted" and "released." Chars to the right
   of the caret evaporate first; chars to the left wait their turn.
   ──────────────────────────────────────────────────────────────────── */
function VanishingChar({
  scrollYProgress,
  char,
  index,
  totalChars,
  eraseStart,
  eraseEnd,
}: {
  scrollYProgress: MotionValue<number>;
  char: string;
  index: number;
  totalChars: number;
  eraseStart: number;
  eraseEnd: number;
}) {
  // The caret moves LEFT through the line. It reaches char[i] when
  // (totalChars - 1 - i) chars have been passed, i.e. when the caret
  // has traveled (totalChars - 1 - i) / (totalChars - 1) of its journey.
  // Use totalChars (not -1) for the denominator so the LAST char to
  // evaporate (i=0) finishes BEFORE the eraseEnd, leaving a clean
  // empty beat at the end of the delete window.
  // Center-outward implosion: edge chars evap FIRST, center chars LAST.
  // Mirrors how the prequel was TYPED (chars expanded outward from h2
  // center via text-align: center) — the line now COLLAPSES back to
  // that same center. By the end of the window, the caret has arrived
  // at h2 center exactly as the last center chars finish dissolving,
  // ready to start typing the new sentence from that same position.
  const center = (totalChars - 1) / 2;
  const maxDistance = center;
  const myDistance = Math.abs(index - center);
  const normalizedT = 1 - myDistance / maxDistance; // 0 for edges, ~1 for center
  // Per-char deterministic jitter via integer hash — adds organic
  // variance to duration and lift so the erase reads as chemical,
  // not algorithmic. ±18% on duration, ±3.5px on lift, ±0.0006 progress
  // on start time. Same index always produces the same jitter, so
  // animations are stable across renders.
  const hash = (index * 2654435761) % 2147483647; // Knuth's multiplicative hash
  const jitter01 = ((hash / 2147483647) + 1) / 2; // normalize to 0..1
  const jitter11 = jitter01 * 2 - 1; // -1..1
  const evapDurationBase = (eraseEnd - eraseStart) * 0.18;
  const evapDuration = evapDurationBase * (1 + jitter11 * 0.18);
  const startJitter = jitter11 * 0.0006;
  const liftPx = -16 + jitter11 * 3.5;
  const reachT = eraseStart + normalizedT * (eraseEnd - eraseStart - evapDuration) + startJitter;
  const evapEnd = reachT + evapDuration;
  // Pure opacity + smooth lift. No rotation — rotation read as jitter,
  // not release. The lift carries the "letting go" feel on its own.
  const opacity = useTransform(scrollYProgress, [reachT, evapEnd], [1, 0], { clamp: true });
  const y = useTransform(scrollYProgress, [reachT, evapEnd], [0, liftPx], { clamp: true });
  return (
    <motion.span style={{ opacity, y, display: 'inline-block' }}>
      {char === ' ' ? ' ' : char}
    </motion.span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   VacuumCaret — the red caret that "walks" right-to-left across the
   prequel during the delete, vacuuming chars in its wake. Positioned
   absolutely as a fraction of the parent (the inline-block holding all
   chars), so its X coordinate animates from 100% to 0% even as the
   underlying chars maintain their layout (evaporating in opacity, not
   width, so the caret's percent-position stays aligned with the
   original char positions).
   ──────────────────────────────────────────────────────────────────── */
function VacuumCaret({
  scrollYProgress,
  eraseStart,
  eraseEnd,
}: {
  scrollYProgress: MotionValue<number>;
  eraseStart: number;
  eraseEnd: number;
}) {
  // Single-phase: caret travels from right edge (100%) to center (50%)
  // as the line implodes inward beneath it. Arrives at h2 center
  // exactly as the last center chars finish dissolving — exactly
  // where the new sentence will start typing. No "slide back to
  // center" step needed because the deletion itself ends at center.
  const leftPct = useTransform(
    scrollYProgress,
    [eraseStart, eraseEnd],
    [100, 50],
    { clamp: true, ease: easeInOut },
  );
  const left = useTransform(leftPct, (v) => `${v}%`);
  return (
    <motion.span
      style={{
        position: 'absolute',
        top: 0,
        left,
        display: 'inline-block',
        // Pull the caret slightly left so it visually CENTERS over the
        // char it's currently passing, instead of sitting just to the
        // right of it.
        translateX: '-50%',
      }}
    >
      {/* Vacuum caret stays red — red here means "the erasing motion of
          the prequel". This is one of the few places red has earned
          semantic weight: it marks the line being undone before the
          punchline lands. */}
      <BlinkingCursor color={C.risk} />
    </motion.span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SelectionWord — ONE word of the prequel during the word-by-word
   deletion mechanic. Replaces the previous "vacuum caret + per-char
   evaporation" mechanic with something that feels like the user is
   selecting & deleting word-at-a-time (Ctrl+Backspace × N) under
   continuous scroll.

   Two-phase animation per word:
     Phase 1 (0–55% of word's allotted slot)  — SELECT:
       The red highlight background fades from transparent to opaque,
       like the word is being shift-selected.
     Phase 2 (55–100% of word's allotted slot) — DELETE:
       The word fades to 0 and lifts upward 8px, like the selection
       was just deleted. Background stays at full opacity through the
       lift so the eye sees "selected red box → empty space."

   At the start of phase 2 the component dispatches a 'cinema:word-erase'
   event. CinemaSound listens for this and synthesizes a backspace-class
   sound (heavier thock + low-frequency noise sweep, distinct from the
   typing keystroke). Per-word audio = per-word selection rhythm.

   Slot allocation: each word gets (eraseEnd − eraseStart) / N of the
   erase window, where N = total words across both lines. Deletion order
   is right-to-left through line 2, then right-to-left through line 1
   — exactly the order Ctrl+Backspace would delete words in a real
   text editor.
   ──────────────────────────────────────────────────────────────────── */
function SelectionWord({
  scrollYProgress,
  word,
  index,
  totalWords,
  eraseStart,
  eraseEnd,
}: {
  scrollYProgress: MotionValue<number>;
  word: string;
  index: number;
  totalWords: number;
  eraseStart: number;
  eraseEnd: number;
}) {
  const slotDuration = (eraseEnd - eraseStart) / totalWords;
  const slotStart = eraseStart + index * slotDuration;
  // 55% select / 45% delete split — the select phase gets slightly
  // more time so the eye can register the highlight before the word
  // vanishes. Too-fast selection reads as a glitch; too-slow makes
  // the deletion drag.
  const selectEnd = slotStart + slotDuration * 0.55;
  const slotEnd = slotStart + slotDuration;

  // SELECT — red background fills 0 → 1
  const bgOpacity = useTransform(
    scrollYProgress,
    [slotStart, selectEnd],
    [0, 1],
    { clamp: true },
  );
  // DELETE — word fades + lifts
  const wordOpacity = useTransform(
    scrollYProgress,
    [selectEnd, slotEnd],
    [1, 0],
    { clamp: true },
  );
  const wordLift = useTransform(
    scrollYProgress,
    [selectEnd, slotEnd],
    [0, -8],
    { clamp: true },
  );
  // The background fades out alongside the word during delete phase
  // (otherwise an empty red rectangle hangs around briefly).
  const bgFinalOpacity = useTransform(
    scrollYProgress,
    [selectEnd, slotEnd],
    [1, 0],
    { clamp: true },
  );

  // Audio tick: fire 'cinema:word-erase' the moment we cross from
  // select phase into delete phase. Uses a ref so the event fires
  // exactly once per scroll-cross (and re-fires if user scrolls
  // back past the threshold and forward again).
  const firedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const apply = (p: number) => {
      if (p >= selectEnd && !firedRef.current) {
        firedRef.current = true;
        try {
          window.dispatchEvent(new CustomEvent('cinema:word-erase'));
        } catch {
          /* ignore */
        }
      } else if (p < selectEnd && firedRef.current) {
        firedRef.current = false;
      }
    };
    apply(scrollYProgress.get());
    return scrollYProgress.on('change', apply);
  }, [scrollYProgress, selectEnd]);

  return (
    <motion.span
      style={{
        display: 'inline-block',
        position: 'relative',
        opacity: wordOpacity,
        y: wordLift,
      }}
    >
      {/* Selection highlight — absolute-positioned so it can extend
          slightly beyond the glyph bbox (the small inset pulls it out
          to feel like a real text selection rectangle, not a tight
          background-color on the letterforms). */}
      <motion.span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-0.05em',
          bottom: '-0.02em',
          left: '-0.08em',
          right: '-0.08em',
          background: C.risk,
          borderRadius: 4,
          opacity: useTransform(
            [bgOpacity, bgFinalOpacity] as unknown as MotionValue<number>[],
            (vals: number[]) => Math.min(vals[0], vals[1]),
          ),
          zIndex: -1,
        }}
      />
      {word}
    </motion.span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   FadingWord — ONE word of the retype, faded in with a small upward
   drift. Different reveal LANGUAGE from the prequel's char-by-char
   typewriter: words arrive as complete units, staggered left-to-right,
   like a thought being assembled rather than written out. Apple-style
   typography reveal.
   ──────────────────────────────────────────────────────────────────── */
function FadingWord({
  scrollYProgress,
  word,
  startT,
  endT,
  style,
}: {
  scrollYProgress: MotionValue<number>;
  word: string;
  startT: number;
  endT: number;
  style?: React.CSSProperties;
}) {
  const opacity = useTransform(scrollYProgress, [startT, endT], [0, 1], { clamp: true, ease: easeOut });
  const y = useTransform(scrollYProgress, [startT, endT], [4, 0], { clamp: true, ease: easeOut });
  return (
    <motion.span style={{ opacity, y, display: 'inline-block', ...style }}>
      {word}
    </motion.span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MillionsEcho — phantom copies of the prequel appear at symmetric
   offsets above and below the original (a vertical cascade), then SLIDE
   off-screen — each pair drifting in opposite directions. The result:
   the cascade builds, holds for a beat, and then the duplicates blow
   apart, fading as they exit. Literal "millions of words" scattering
   into the void.
   ──────────────────────────────────────────────────────────────────── */
function MillionsEcho({
  scrollYProgress,
  text,
}: {
  scrollYProgress: MotionValue<number>;
  text: string;
}) {
  // Six pairs. startY = where the ghost appears in the cascade. endY =
  // where it lands off-screen at the end of the echo. The deltas are
  // tuned so closer pairs travel FARTHER (they have more momentum) and
  // outer pairs need less travel to clear the viewport.
  // Innermost pair starts at ±110 to give the main prequel a clean
  // reading island — at ±70 the first ghost row touched the main
  // line's bounding box at peak opacity, creating visual collision.
  const pairs = useMemo(
    () => [
      { startY: 110, endY: 800,  op: 0.42, fadeIn: 0.130 },
      { startY: 170, endY: 850,  op: 0.30, fadeIn: 0.131 },
      { startY: 230, endY: 900,  op: 0.21, fadeIn: 0.132 },
      { startY: 290, endY: 950,  op: 0.14, fadeIn: 0.133 },
      { startY: 350, endY: 1000, op: 0.09, fadeIn: 0.134 },
      { startY: 410, endY: 1050, op: 0.05, fadeIn: 0.135 },
    ],
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {pairs.map((p, i) => (
        <Fragment key={i}>
          <GhostCopy
            scrollYProgress={scrollYProgress}
            text={text}
            startY={-p.startY}
            endY={-p.endY}
            maxOp={p.op}
            fadeIn={p.fadeIn}
            fadeOut={0.152}
          />
          <GhostCopy
            scrollYProgress={scrollYProgress}
            text={text}
            startY={p.startY}
            endY={p.endY}
            maxOp={p.op}
            fadeIn={p.fadeIn}
            fadeOut={0.152}
          />
        </Fragment>
      ))}
    </div>
  );
}

function GhostCopy({
  scrollYProgress,
  text,
  startY,
  endY,
  maxOp,
  fadeIn,
  fadeOut,
}: {
  scrollYProgress: MotionValue<number>;
  text: string;
  startY: number;
  endY: number;
  maxOp: number;
  fadeIn: number;
  fadeOut: number;
}) {
  // Opacity: quick fade in to peak, brief hold, fade out over the slide.
  const opacity = useTransform(
    scrollYProgress,
    [fadeIn - 0.003, fadeIn + 0.002, fadeOut - 0.010, fadeOut],
    [0, maxOp, maxOp, 0],
    { clamp: true },
  );
  // Y: holds at startY through the fade-in, then accelerates outward to
  // endY (off-screen) with easeIn so it feels like the duplicates pick
  // up speed as they leave.
  const y = useTransform(
    scrollYProgress,
    [fadeIn + 0.002, fadeOut],
    [startY, endY],
    { clamp: true, ease: easeIn },
  );
  return (
    <motion.div
      style={{
        opacity,
        position: 'absolute',
        left: '50%',
        top: '50%',
        y,
        translateX: '-50%',
        translateY: '-50%',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-serif), Georgia, serif',
        fontSize: 'clamp(20px, 3vw, 44px)',
        color: 'rgba(255, 255, 255, 0.78)',
        letterSpacing: '-0.02em',
        fontWeight: 400,
      }}
    >
      {text}
    </motion.div>
  );
}
/* ════════════════════════════════════════════════════════════════════════
   ColdOpenGrain — a slow-drifting paper/film grain overlay that lives
   over the entire cinema canvas. At rest the cinema is a CSS-flat
   #050507 fill, which Awwwards juries clock as "another dark dev-tool
   site" in under a second. A real grain texture — even at 4% opacity —
   shifts the canvas from a flat color to a *surface*.

   Implementation note: we use an SVG fractal-noise filter rendered to
   a data-URL background. Animating the SVG would re-rasterize each
   frame on the CPU, so instead we animate a `transform: translate3d`
   on the host div — same visual effect (drifting grain), zero CPU.
   ──────────────────────────────────────────────────────────────────── */
function ColdOpenGrain({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // The grain is at full presence from p=0 (it has to be there in the
  // very first frame the visitor sees — that's the whole point) and
  // fades down as the story content arrives. We don't want grain
  // competing with the social-post screenshot in Act II.
  const opacity = useTransform(
    scrollYProgress,
    [0.000, 0.240, 0.380],
    [1, 1, 0.25],
    { clamp: true },
  );
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[2]"
      style={{
        opacity,
        // A small SVG with fractal-noise filter, tiled. The base
        // frequency (0.9) gives sharp paper-grain texture; lower
        // values would give cloud-like noise we don't want here.
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" seed="3"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.78 0"/></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>',
        )}")`,
        backgroundSize: '240px 240px',
        // `screen` blend mode lifts the bright grain particles up out
        // of the void so they actually read as a surface texture.
        // `overlay` (the previous setting) effectively zeroed the grain
        // against #050507 because overlay multiplies dark pixels with
        // dark pixels.
        mixBlendMode: 'screen',
        // Slow drift — 60s cycle, barely perceptible but enough to
        // distinguish from a JPEG compression artifact (which is
        // exactly what static noise would read as).
        animation: 'cinemaGrainDrift 60s linear infinite',
      }}
    />
  );
}

/* ════════════════════════════════════════════════════════════════════════
   CinemaBreath — on first mount only, animate the entire cinema canvas
   from scale(1.018) → scale(1.0) and opacity(0.92) → opacity(1.0) over
   1.6s with a single easeOut curve. This is the *camera arriving* —
   it sells "this is a film, not a website" in the first frame the
   visitor sees. After the initial breath, the wrapper passes its
   children through untouched (scale never animates again, scroll-
   driven transforms on inner nodes are unaffected).
   ──────────────────────────────────────────────────────────────────── */
/* ════════════════════════════════════════════════════════════════════════
   SettledPauseGlow — atmospheric pre-arrival cue.

   The window raw 0.275 → 0.281 is the "settled pause": the thesis
   has shrunk + risen to its pinned position at the top, and the
   editor hasn't started its slide-up yet. Without atmosphere, this
   beat is just thesis-at-top + dark void below — functionally a
   freeze frame.

   This component draws a soft warm horizontal glow at the bottom
   edge of the viewport during that beat (and slightly into the
   editor's entry). Reads as: something is about to surface from
   below. Foreshadows the panel rise. The glow fades out as the
   editor actually arrives so it doesn't compete with the editor's
   own depth/shadow.

   Visual design: a 28vh tall band at the viewport bottom with a
   linear gradient from a warm amber-ish #f4cfa0 at 6% opacity at
   the bottom to fully transparent at the top. Soft, ambient, not
   a hard line.
   ──────────────────────────────────────────────────────────────────── */
/* ════════════════════════════════════════════════════════════════════════
   FocusVignette — spotlight deepening during the cold-open headline's
   full-scale hold beat.

   The static base vignette gives the canvas a constant edge darkening.
   This component adds a SECOND, scroll-driven layer that intensifies
   during raw 0.214 → 0.250 (the moment the headline is at full scale
   and the eye should be on the punchline). At peak it adds another
   ~24% darkening at the edges, focusing the eye on the headline like
   stage lights pinching down on a lead actor.

   Fades out as the headline begins to shrink (0.250+) so the editor
   scene below isn't drowned in extra darkening.
   ──────────────────────────────────────────────────────────────────── */
function FocusVignette({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const focusOp = useTransform(
    scrollYProgress,
    [0.205, 0.224, 0.244, 0.252],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[3]"
      style={{
        background:
          'radial-gradient(ellipse 55% 38% at 50% 50%, transparent 0%, transparent 40%, rgba(0,0,0,0.32) 90%, rgba(0,0,0,0.48) 100%)',
        opacity: focusOp,
      }}
    />
  );
}

function SettledPauseGlow({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Visible during raw 0.262 → 0.298 — fade-in starts 6 units earlier
  // (was 0.268) so the anticipation builds gradually rather than
  // arriving abruptly at pin. Peak intensity raised to 0.11 (was
  // 0.085) so the glow is actually perceivable against the dark void.
  const glowOp = useTransform(
    scrollYProgress,
    [0.262, 0.275, 0.281, 0.298],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[6]"
      style={{
        height: '28vh',
        background:
          'linear-gradient(to top, rgba(244,207,160,0.11) 0%, rgba(244,207,160,0.052) 35%, rgba(244,207,160,0.018) 65%, rgba(244,207,160,0) 100%)',
        opacity: glowOp,
      }}
    />
  );
}

function CinemaBreath({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Trigger the breath on next paint (not synchronously, so the
    // initial mounted=false frame has a chance to render).
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
        transform: mounted ? 'scale(1)' : 'scale(1.018)',
        opacity: mounted ? 1 : 0.92,
        transformOrigin: 'center',
        transition:
          'transform 1.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Continuous breath layer — sibling transform that adds a slow
          0.006 scale oscillation on a 6.4s cycle. Imperceptible per
          frame but the viewer feels the canvas is alive instead of
          dead-still after the arrival animation finishes. Award-grade
          cold-opens always have continuous camera motion at this level
          — Stripe, Linear, Apple keynote opens all do this. */}
      <div
        className="cinema-canvas-breath"
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      >
        {children}
      </div>
    </div>
  );
}

function Scene1ColdOpen({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // ─── Timeline (Mo's spec: pure typewriter cold open, no chrome) ─
  //   0.000 → 0.020   caret blink, empty stage (anticipation)
  //   0.020 → 0.110   PREQUEL types ONE line at 0.48 scale
  //   0.110 → 0.150   LONG HOLD — prequel sits, caret blinks. The
  //                   reader actually reads what was typed.
  //   0.150 → 0.180   WORD-BY-WORD DELETE — selection sweeps right→
  //                   left, each word highlights briefly then vanishes.
  //                   Slowed 2.5× from earlier draft so the gesture
  //                   feels deliberate, not panicked. 11 word-slots,
  //                   ~410ms each at natural scroll speed.
  //   0.180 → 0.205   POST-ERASE BREATH — wrapper is empty. A
  //                   standalone caret returns to the exact center
  //                   position / scale / color / glow it had at frame
  //                   zero, before any typing began. ~25 units of
  //                   scroll = ~3s blink at natural cadence.
  //   0.205 → 0.214   scale animates 0.48 → 1.0 as the first chars
  //                   of the headline start landing. The wrapper
  //                   grows from where the prequel sat to full
  //                   display scale.
  //   0.205 → 0.233   RETYPE — punchline types char-by-char at full
  //                   headline scale. "bad" stays neutral until the
  //                   full word is present, then the WHOLE word
  //                   transitions to editorial red as one perceivable
  //                   event (recognition moment).
  //   0.233 → 0.250   FULL-SCALE HOLD — the headline sits, complete,
  //                   at full display scale. Punctuation gets a beat
  //                   to land before anything moves. Cursor begins
  //                   its fade-out across this window.
  //   0.250 → 0.275   SHRINK + RISE — the headline travels up and
  //                   shrinks to its pinned-subtitle scale (0.36) at
  //                   y=-310. Coordinated motion: the thesis transforms
  //                   from full-stage hero to persistent chapter-title.
  //   0.275 → 0.730   PINNED-THESIS — the thesis lives at the top of
  //                   the viewport throughout the editor → publish →
  //                   comment-storm → freeze-dim sequence. Three things
  //                   make this work where it failed before:
  //                     (a) smaller pinned scale (0.36 not 0.48) so
  //                         it has gutter below the nav AND above the
  //                         downward-shifted editor frame.
  //                     (b) the editor frame itself is pushed down
  //                         ~80px and narrowed ~12% (PostStage entryY
  //                         + frameWidth changes) so there's room.
  //                     (c) the nav chrome dims to ~50% during the
  //                         pinned-thesis body so the brand mark and
  //                         the thesis stop competing for the top band.
  //                   At ~raw 0.50 (the brand-damage climax — comment
  //                   storm at peak, freeze-dim about to land) the
  //                   thesis does a subtle 1.04× scale breath: the
  //                   thesis re-engaging as the consequence it warned
  //                   about materializes. Earns its real estate.
  //   0.730 → 0.875   thesis fades; the product reveal owns the stage.
  //
  // Architecture note: I previously wrapped this in a full editor
  // metaphor (DRAFT pill, SAVED ticker, word counter, placeholder
  // text, Untitled-draft title). Mo cut that — the cold open is
  // attention capture, not category positioning. The compliance
  // language lives later in the cinema where it actually pays off.
  // What stays from the rebuild: bigger off-white cursor with glow,
  // cleaner blink cadence, audio tick on each keystroke, camera
  // breath on arrival, grain + grid texture, nav hidden in the
  // empty-stage beat. No editor chrome.
  // Opacity: full visibility through retype + full-scale hold + the
  // shrink-and-rise into pinned position + the entire pinned-thesis
  // body of the cinema. Fades 0.755 → 0.815 — the thesis dissolves
  // BEFORE Scene 7's "Assured AI catches it here" headline lands at
  // raw 0.829. Audit found the old 0.730→0.875 fade was too lazy:
  // at raw 0.829 the thesis was still ~32% visible, competing with
  // the new headline for the top band of the viewport. Tightening
  // the fade window so the thesis is fully gone (opacity 0) by the
  // time Scene 7's text begins reading. The thesis has earned its
  // departure — it carried the demonstration through publish → storm
  // → lawsuit → rewind. Now it gracefully exits and lets the
  // resolution own the frame.
  const opacity = useTransform(
    scrollYProgress,
    [0.0, 0.755, 0.815],
    [1, 1, 0],
    { clamp: true, ease: [linear, easeIn] },
  );
  // Scale: 0.48 throughout prequel, deletion, and the post-erase
  // breath (the standalone post-erase caret is rendered OUTSIDE this
  // wrapper, so the wrapper's scale during the pause is irrelevant
  // to what the viewer sees). Grows 0.48 → 1.0 as the retype begins,
  // HOLDS at 1.0 through both the typewriter AND a deliberate full-
  // scale hold (0.233 → 0.250) — the punchline gets a beat to land
  // before anything moves — then shrinks 1.0 → 0.36 over 0.250 →
  // 0.275 as the headline rises into its pinned subtitle position.
  // The pinned scale 0.36 is deliberately small: pairs with the
  // shifted-down + narrowed editor frame to give clean gutter on
  // top (from nav) and bottom (from editor).
  // POST-RETYPE SETTLE BOUNCE — when the headline completes typing
  // at raw 0.233, it briefly overshoots scale 1.0 to 1.012 then
  // settles back to 1.0 over the next 6 units. Adds a "landing"
  // beat to the headline arrival — the eye registers the slight
  // overshoot as the punctuation having weight that ripples through
  // the whole line. Subtle (1.2% scale shift) but perceivable.
  // RE-ENGAGEMENT BEAT — at raw 0.495 → 0.505 the pinned thesis
  // does a subtle 1.05× scale breath, then settles back (was 1.04×
  // — bumped for slightly more perceivable pulse). This is the
  // brand-damage climax (comment storm at peak, freeze-dim landing)
  // — the thesis breathes in solidarity, the demonstration
  // acknowledging its origin statement.
  // PROGRESSIVE SHRINK — the thesis earns its quietness. Audit found
  // it sat at scale 0.36 from raw 0.275 onward (75% of the cinema),
  // becoming wallpaper. Now it steps DOWN as the cinema progresses:
  //   raw 0.275 → 0.36  pinned in full (intro through storm setup)
  //   raw 0.420 → 0.32  shrinks slightly during the storm (post is
  //                     the focus, thesis recedes)
  //   raw 0.495 → 0.30  RE-ENGAGEMENT BREATH at lawsuit (pulses
  //                     UP momentarily then settles smaller)
  //   raw 0.600 → 0.24  shrinks again post-lawsuit (Scene 7 needs
  //                     more visual real estate)
  //   raw 0.720 → 0.18  smallest size during Scene 7 catch
  //                     (the AI is the story now)
  //
  // ── SPRING PHYSICS (T9) ───────────────────────────────────────
  // Audit found the discrete-keyframe shrink jumped between
  // scales visibly. Now we wrap the target scale in useSpring —
  // gives the thesis WEIGHT. Stiffness 60 + damping 22 + mass
  // 1.4 = the thesis RESISTS shrinking momentarily, then catches
  // up. Reads as recession with inertia, not animation keyframes.
  // The mass:1.4 is the elite touch — the thesis has heft, the
  // storm has to PUSH it back.
  const scaleTarget = useTransform(
    scrollYProgress,
    [0.0, 0.205, 0.214, 0.233, 0.239, 0.250, 0.275, 0.420, 0.495, 0.500, 0.505, 0.600, 0.720, 0.815],
    [0.48, 0.48, 1.0, 1.012, 1.0, 1.0, 0.36, 0.32, 0.30, 0.34, 0.30, 0.24, 0.18, 0.18],
    {
      clamp: true,
      ease: [linear, easeOut, easeOut, easeInOut, linear, easeInOut, easeInOut, easeInOut, easeOut, easeInOut, easeInOut, easeInOut, linear],
    },
  );
  // Motion-audit tuned: damping increased from 22→28, mass reduced
  // from 1.4→1.0. The thesis still has "weight" but no longer
  // overshoots/wobbles. Reads as recession with inertia, NOT as
  // animation overshoot.
  const scale = useSpring(scaleTarget, { stiffness: 55, damping: 28, mass: 1.0 });
  // Pin Y trajectory: rises 310px upward over the shrink window so
  // the headline lands at y_viewport ≈ 140 (center 140, top 85 at
  // pinned scale 0.36). That's 21px below the nav band (nav ends at
  // ~64px) — clean gutter. Holds through the pinned body. Has no
  // additional motion beyond the climax breath handled by `scale`.
  const y = useTransform(scrollYProgress, [0.250, 0.275], [0, -310], {
    clamp: true,
    ease: easeInOut,
  });
  // Inline caret visibility — on during typing+hold, off through
  // the deletion AND the post-erase breath (a standalone overlay
  // caret owns the visual during the breath, so the inline one stays
  // dark to avoid double-caret artifacts), returns the instant the
  // retype begins, holds through the punctuation-land hold, then
  // fades out across 0.245 → 0.250 BEFORE the headline starts to
  // shrink. A deliberate exit — the cursor doesn't just blink off,
  // it dissolves over ~600ms so the eye registers "the writing is
  // finished" before the camera moves.
  const caretOp = useTransform(
    scrollYProgress,
    [0.000, 0.148, 0.150, 0.205, 0.209, 0.245, 0.250],
    [1, 1, 0, 0, 1, 1, 0],
    { clamp: true },
  );
  // ─── Eye-direction cue (REMOVED) ────────────────────────────────
  // An earlier draft added a thin vertical guide line and a halo
  // dot under the pinned headline pointing down to the rising editor
  // frame — a quiet "look here next" gesture for the moment the
  // thesis was sharing the stage with the demo. With the new exit
  // design (the headline rises + fades + shrinks as a coherent
  // retreat instead of pinning at the top), the rising editor IS
  // the eye-direction cue: motion attracts attention, the headline's
  // graceful departure cleans the upper band, the editor naturally
  // owns the lower stage. Adding a static guide line on top of two
  // already-moving elements would have been visual noise. Removed.

  // ─── Prequel typing counter ─────────────────────────────────────
  const [prequelTyped, setPrequelTyped] = useState(0);
  useEffect(() => {
    const apply = (p: number) => {
      const t = Math.max(0, Math.min(1, (p - 0.020) / 0.090));
      const count = Math.round(t * PREQUEL_TYPED_TOTAL);
      setPrequelTyped((prev) => (prev !== count ? count : prev));
    };
    apply(scrollYProgress.get());
    return scrollYProgress.on('change', apply);
  }, [scrollYProgress]);

  // Audio tick on each NEW typed character. Real typing makes noise;
  // the cinema sound system (gated by user opt-in) listens for
  // 'cinema:type-tick' and synthesizes a mechanical keystroke. We
  // skip spaces so the tick rhythm matches keystrokes, not chars.
  const lastTypedRef = useRef(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prequelTyped > lastTypedRef.current) {
      const lastChar = PREQUEL_FULL[prequelTyped - 1];
      if (lastChar && lastChar !== ' ') {
        window.dispatchEvent(new CustomEvent('cinema:type-tick'));
      }
    }
    lastTypedRef.current = prequelTyped;
  }, [prequelTyped]);

  // ─── Retype counter (headline char-by-char typewriter) ──────────
  // Shifted 0.016 later than the previous draft to make room for the
  // 0.180 → 0.205 post-erase breath. Same 0.028 duration — characters
  // still land at the same cadence, the punchline just begins later.
  const [retypedCount, setRetypedCount] = useState(0);
  useEffect(() => {
    const apply = (p: number) => {
      const t = Math.max(0, Math.min(1, (p - 0.205) / 0.028));
      const count = Math.round(t * COLD_TOTAL);
      setRetypedCount((prev) => (prev !== count ? count : prev));
    };
    apply(scrollYProgress.get());
    return scrollYProgress.on('change', apply);
  }, [scrollYProgress]);

  // Tick on each retyped character. The PERIOD that closes the
  // sentence gets a dedicated heavier strike event instead of the
  // standard keystroke — the punchline's terminal punctuation is
  // the most dramatic glyph in the entire cold open and it deserves
  // its own sound. Everything else fires `cinema:type-tick` like
  // the rest of the typewriter.
  // Also fires `cinema:bad-ink-reveal` exactly once when the third
  // char of "bad" lands — the moment the word becomes recognizable
  // and the CSS color transition kicks in. The audio "ink soak" runs
  // in parallel with the visual color bloom for one perceptible
  // recognition moment.
  const lastRetypedRef = useRef(0);
  const badInkFiredRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (retypedCount > lastRetypedRef.current) {
      const fullHeadline = COLD_LINE_1 + COLD_LINE_2;
      const lastChar = fullHeadline[retypedCount - 1];
      const isFinalPeriod =
        retypedCount === fullHeadline.length && lastChar === '.';
      if (isFinalPeriod) {
        window.dispatchEvent(new CustomEvent('cinema:period-strike'));
      } else if (lastChar && lastChar !== ' ') {
        window.dispatchEvent(new CustomEvent('cinema:type-tick'));
      }
      // "bad" reveal — fires when retypedCount reaches the position
      // immediately after the third char of "bad" (COLD_BAD_END = 7).
      if (
        !badInkFiredRef.current &&
        retypedCount >= COLD_BAD_END &&
        lastRetypedRef.current < COLD_BAD_END
      ) {
        badInkFiredRef.current = true;
        window.dispatchEvent(new CustomEvent('cinema:bad-ink-reveal'));
      }
    }
    lastRetypedRef.current = retypedCount;
    // Reset if user scrolls fully back so the reveal can fire again
    // on a re-watch.
    if (retypedCount < COLD_BAD_START && badInkFiredRef.current) {
      badInkFiredRef.current = false;
    }
  }, [retypedCount]);

  // ─── Render mode ────────────────────────────────────────────────
  // 'post-erase' is a deliberate dead-air beat between deletion and
  // retype. The scaled wrapper is empty during this mode — a separate
  // overlay caret (rendered outside the wrapper, identical to the
  // empty-stage caret at frame zero) carries the visual.
  // 'retyping' extends through the full-scale hold (0.205 → 0.250):
  // while retypedCount stabilises at COLD_TOTAL by 0.233, the same
  // render path (L1 + L2 + inline caret) holds the screen for another
  // 17 units of scroll so the punctuation has a beat to land. We
  // don't need a separate 'hold' mode — the retyping markup IS the
  // completed headline at that point.
  type ColdMode = 'typing' | 'deleting' | 'post-erase' | 'retyping' | 'final';
  const [mode, setMode] = useState<ColdMode>('typing');
  useEffect(() => {
    const apply = (p: number) => {
      const m: ColdMode =
        p < 0.150 ? 'typing' :
        p < 0.180 ? 'deleting' :
        p < 0.205 ? 'post-erase' :
        p < 0.250 ? 'retyping' :
        'final';
      setMode((prev) => (prev !== m ? m : prev));
    };
    apply(scrollYProgress.get());
    return scrollYProgress.on('change', apply);
  }, [scrollYProgress]);

  const typedFull = PREQUEL_FULL.slice(0, prequelTyped);
  const typedL1Re = COLD_LINE_1.slice(0, Math.min(retypedCount, COLD_LINE_1.length));
  const typedL2Re = COLD_LINE_2.slice(0, Math.max(0, retypedCount - COLD_LINE_1.length));
  const caretOnL1Re = retypedCount < COLD_LINE_1.length;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[20] flex items-center justify-center"
      style={{ opacity }}
    >
      {/* Empty-stage cursor — rendered OUTSIDE the scaled wrapper so
          it appears at full scale (not at 0.48 like the prequel). This
          is the cursor the viewer sees at frame zero, before any text
          exists. It needs presence — the prequel's scaled-down cursor
          read as a hairline at this moment. Hidden the instant the
          first character types. */}
      {mode === 'typing' && prequelTyped === 0 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: caretOp }}
        >
          <BlinkingCursor width={6} height="clamp(60px, 7.5vw, 110px)" pulse />
        </motion.div>
      )}
      {/* Post-erase caret — Mo's spec: after the deletion finishes,
          the caret should be back at the EXACT center of the screen,
          at the EXACT scale / color / glow it had at frame zero, before
          the new headline begins typing. This is a deliberate breath
          beat — the stage is reset, the cursor is the only thing
          alive, the punchline is loaded but not yet fired. Identical
          styling to the empty-stage cursor above (width 6, same height
          clamp, same default color + glow) so the visual continuity
          is unbroken: the cinema appears to rewind to its starting
          state for an instant before the new sentence begins. */}
      {mode === 'post-erase' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <BlinkingCursor width={6} height="clamp(60px, 7.5vw, 110px)" pulse />
        </div>
      )}
      <motion.div
        className="text-center"
        style={{ scale, y, transformOrigin: 'center' }}
      >
        <h2
          className="text-center leading-[0.98] tracking-[-0.025em]"
          style={{
            color: C.text,
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontWeight: 400,
            fontSize: 'clamp(54px, 9.5vw, 156px)',
            // OpenType features for display-scale serif. At 137px the
            // default rendering shows perceptible kerning issues on
            // pairs like "Ev" / "br" / "te" / "ak"; turning on kern
            // tightens them. Ligatures resolve "fi" / "fl" / "ff"
            // pairs cleanly (relevant for "sufficient" / "office"
            // etc — also future-proofs the headline for variant
            // copy). Contextual alternates ("calt") let the font
            // pick the more typographically correct glyph when
            // available. At display scale these features make the
            // headline read as set by a typographer, not auto-laid.
            fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1, "onum" 1',
            fontKerning: 'normal',
            // Subtle text-shadow gives the headline a hairline of
            // depth against the dark canvas — reads as ink with
            // weight, not as a flat fill. 0.6px-tall double-shadow
            // (offset down 1px + 2px blur on a near-black) and a
            // very faint warm rim from above. Sits at all times, not
            // scroll-driven — atmospheric constant.
            textShadow: '0 1px 2px rgba(0,0,0,0.42), 0 -1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {mode === 'typing' && (() => {
            // Two-line prequel layout — the single-line version
            // overflowed the viewport at the prequel's effective ~66px
            // size. Now line 1 ends on "sends" (setup beat), line 2
            // reveals "millions of words into the world." (scale beat).
            // The cursor follows the typing across the line break.
            //
            // Looser letter-spacing here than the h2 default (-0.025em)
            // because the prequel renders smaller than the headline —
            // tight tracking that works for 137px display weight reads
            // cramped at 66px.
            const typedL1 = typedFull.slice(0, PREQUEL_BREAK_INDEX);
            // Line 2 starts at index 29 (skipping the joining space
            // at index 28). So if prequelTyped is 28, line 2 is empty.
            // If prequelTyped is 29 (the space typed), line 2 is still
            // empty visually (we don't render the space). If 30+, line
            // 2 has visible content.
            const typedL2 = prequelTyped > PREQUEL_BREAK_INDEX
              ? typedFull.slice(PREQUEL_BREAK_INDEX + 1)
              : '';
            // Cursor lives on whichever line is actively being typed.
            // It transitions from end-of-L1 to end-of-L2 when prequelTyped
            // crosses the break + 1 (after the space is "typed").
            const cursorOnL1 = prequelTyped <= PREQUEL_BREAK_INDEX;
            // L1-only displacement — see retyping mode below for the
            // full rationale. While L2 has no rendered glyphs, the
            // browser still reserves its 1.05em height (we need that
            // reservation to avoid a layout pop when L2 starts), so the
            // wrapper centers a two-line box and L1 sits in the upper
            // half. Pushing the whole stack down by half a line-height
            // makes L1 sit at viewport center — matching where the
            // empty-stage caret was just blinking. When L2 actually
            // has glyphs, the displacement animates back to 0 and the
            // two lines share the center naturally.
            const l2HasContent = typedL2.length > 0;
            return (
              <motion.div
                initial={false}
                animate={{ y: l2HasContent ? '0em' : '0.525em' }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Line 1: "Every year, your brand sends"
                    whiteSpace: nowrap prevents natural word-wrap inside
                    the line — without it, the inline-block char spans
                    confuse the browser's word-break logic and the line
                    breaks mid-word. The ONLY line break in the prequel
                    is the explicit one between this L1 span and the
                    L2 span below. */}
                <span
                  className="block"
                  style={{ letterSpacing: '0em', whiteSpace: 'nowrap' }}
                >
                  {renderTypingChars(typedL1)}
                  {cursorOnL1 && prequelTyped > 0 && (
                    <motion.span style={{ display: 'inline-block', opacity: caretOp }}>
                      <BlinkingCursor width={6} pulse />
                    </motion.span>
                  )}
                </span>
                {/* Line 2: "millions of words into the world."
                    minHeight reserves space so the L1+L2 box has stable
                    geometry — the wrapping motion.div handles the
                    visual "L1 at center" illusion via translateY. */}
                <span
                  className="block"
                  style={{ letterSpacing: '0em', whiteSpace: 'nowrap', minHeight: '1.05em' }}
                >
                  {renderTypingChars(typedL2)}
                  {!cursorOnL1 && (
                    <motion.span style={{ display: 'inline-block', opacity: caretOp }}>
                      <BlinkingCursor width={6} pulse />
                    </motion.span>
                  )}
                </span>
              </motion.div>
            );
          })()}
          {mode === 'deleting' && (
            /* Word-by-word selection + deletion, right-to-left across
               both lines. Each SelectionWord owns its own phase timing
               and audio dispatch. The two lines maintain the same
               layout as the typing beat so deletion happens IN PLACE —
               words disappear from the exact positions they occupied. */
            <>
              <span
                className="block"
                style={{ letterSpacing: '0em', whiteSpace: 'nowrap' }}
              >
                {PREQUEL_L1_WORDS.map((w, i) => (
                  <Fragment key={`l1-${i}`}>
                    <SelectionWord
                      scrollYProgress={scrollYProgress}
                      word={w}
                      index={wordDeletionIndexL1(i)}
                      totalWords={PREQUEL_TOTAL_WORDS}
                      eraseStart={0.150}
                      eraseEnd={0.180}
                    />
                    {i < PREQUEL_L1_WORDS.length - 1 && ' '}
                  </Fragment>
                ))}
              </span>
              <span
                className="block"
                style={{
                  letterSpacing: '0em',
                  whiteSpace: 'nowrap',
                  minHeight: '1.05em',
                }}
              >
                {PREQUEL_L2_WORDS.map((w, i) => (
                  <Fragment key={`l2-${i}`}>
                    <SelectionWord
                      scrollYProgress={scrollYProgress}
                      word={w}
                      index={wordDeletionIndexL2(i)}
                      totalWords={PREQUEL_TOTAL_WORDS}
                      eraseStart={0.150}
                      eraseEnd={0.180}
                    />
                    {i < PREQUEL_L2_WORDS.length - 1 && ' '}
                  </Fragment>
                ))}
              </span>
            </>
          )}
          {mode === 'retyping' && (() => {
            // ─── L1-at-center displacement ─────────────────────────
            // The h2 contains an L1 span AND an L2 span. L2's span
            // reserves `minHeight: 1.05em` so when L2 first gets a
            // glyph the layout doesn't suddenly grow taller and the
            // headline doesn't pop. That reservation is correct.
            //
            // But it has a side effect: while L2 is empty, the outer
            // flex centers a TWO-line-tall box at viewport center, so
            // L1 (the only thing visible) sits in the upper half. The
            // typing line floats ~70px above the empty-stage / post-
            // erase caret that was just at exact center — a visible
            // jump at the handoff.
            //
            // Fix: wrap the L1+L2 spans in a motion.div whose Y is
            // 0.525em while L2 has no glyphs (pushes L1 down so its
            // center sits at viewport center) and animates to 0 once
            // L2 gets its first character. The em unit means the
            // shift is in font-size-relative units, so it tracks
            // perfectly through the 0.48 → 1.0 scale ramp. 220ms
            // ease-out matches the perceived speed of L2 entering
            // — fast enough that there's no visible "settling" gap,
            // slow enough that L1's downward motion reads as
            // *layout reflowing for L2*, not a glitch.
            const l2HasContent = typedL2Re.length > 0;
            return (
              <motion.div
                initial={false}
                animate={{ y: l2HasContent ? '0em' : '0.525em' }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="block">
                  {renderColdL1(typedL1Re)}
                  {caretOnL1Re && (
                    <motion.span style={{ display: 'inline-block', opacity: caretOp }}>
                      <BlinkingCursor width={6} pulse />
                    </motion.span>
                  )}
                </span>
                <span className="block" style={{ minHeight: '1.05em' }}>
                  {renderColdL2(typedL2Re)}
                  {!caretOnL1Re && (
                    <motion.span style={{ display: 'inline-block', opacity: caretOp }}>
                      <BlinkingCursor width={6} pulse />
                    </motion.span>
                  )}
                </span>
              </motion.div>
            );
          })()}
          {mode === 'final' && (
            // Final mode: L2 always has content (full headline), so
            // no L1-only displacement needed — natural layout centers
            // the two-line box correctly.
            <>
              <span className="block">{renderColdL1(COLD_LINE_1)}</span>
              <span className="block" style={{ minHeight: '1.05em' }}>
                {renderColdL2(COLD_LINE_2)}
                <motion.span style={{ display: 'inline-block', opacity: caretOp }}>
                  <BlinkingCursor width={6} pulse />
                </motion.span>
              </span>
            </>
          )}
        </h2>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 2 — Draft Editor
   Notion-style CMS frame. Body paragraphs type in (typewriter). Dangerous
   sentence appears NORMAL — softly highlighted but not flagged as risk yet.
   ════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════════
   PostStage — the persistent frame that the dangerous content lives in.
   Same body throughout. Chrome around it morphs from CMS editor to
   social-media post. Frame also shrinks horizontally and slides left to
   make room for the comment storm that arrives in scene 4.
   ════════════════════════════════════════════════════════════════════ */

/* InlinePublishPill — the publish/published pill rendered as a CHILD
   of the editor's title bar. Because it's in normal flow, it
   automatically tracks the title bar's position no matter how the
   editor's height changes (sidebar swap, pipeline footer, body
   reflow at different widths). The "fly to corner" effect during
   publish is handled by a separate CORNER wrapper component that
   cross-fades with this inline pill at publish/unpublish moments. */
function InlinePublishPill({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // State machine — same as the corner button's state opacities,
  // crossfading through Inactive (gray) → Live (red) → Success (green)
  // for forward publish, then reversed for unpublish.
  // Publish-pill state machine — calibrated to feel like a realistic
  // ~1.2-second publish action: press, brief loading, success. The
  // press fires the publish-press audio (whoosh outward); the success
  // fires the publish-success chime + confetti. Twitter/Facebook-style
  // pacing — the click feels acknowledged before the confirmation.
  //   raw 0.370 → 0.376  ACTIVATE (gray → red, pill becomes clickable)
  //   raw 0.381 → 0.383  PRESS (button compresses to 0.92 then back)
  //   raw 0.383 → 0.389  LOADING (red pill with spinner where text was)
  //   raw 0.389 → 0.393  SUCCESS (fade to green ✓ PUBLISHED + confetti)
  // Net duration from press to PUBLISHED: 12 raw units (~1.45s).
  const activateOp = useTransform(
    scrollYProgress,
    [0.370, 0.376, 0.810, 0.820],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const inactiveOp = useTransform(activateOp, (v) => 1 - v);
  const shimmerX = useTransform(
    scrollYProgress,
    [0.371, 0.381, 0.795, 0.810],
    [-120, 220, 220, -120],
    { clamp: true, ease: [easeInOut, linear, easeInOut] },
  );
  const pressScale = useTransform(
    scrollYProgress,
    [0.381, 0.383, 0.388],
    [1, 0.92, 1],
    { clamp: true, ease: [easeIn, easeOut] },
  );
  // Loading state — visible between press release (raw 0.384) and
  // success appearance (raw 0.389). The pill remains red, but the
  // "Publish" text is replaced with a small spinner. Gives the user
  // a perceivable "submitting..." moment.
  const loadingOp = useTransform(
    scrollYProgress,
    [0.382, 0.384, 0.389, 0.391],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const successOp = useTransform(
    scrollYProgress,
    [0.389, 0.393, 0.785, 0.800],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  // Live-state "Publish" text — visible when active but hidden during
  // loading and success so the spinner / checkmark aren't overlapped
  // by static text. Computed as `activateOp - loadingOp - successOp`
  // clamped to [0, 1].
  const liveTextOp = useTransform(
    [activateOp, loadingOp, successOp] as MotionValue<number>[],
    (vals: number[]) =>
      Math.max(0, Math.min(1, vals[0] - vals[1] - vals[2])),
  );
  const liveOp = useTransform(successOp, (v) => 1 - v);
  // Wrapper opacity — inline pill visible from editor entry (raw 0.245)
  // through draft + publish + success (until raw 0.408 → 0.418 when
  // the corner PublishButton takes over). Then back during unpublish
  // (raw 0.773 → 0.781) and fade out at scene end (raw 0.895 → 0.915).
  // The hand-off to the corner pill is timed exactly to its fade-in,
  // so the two visually cross. (Re-entry + scene-end exit shifted
  // +0.025 raw to align with delayed clock arrival.)
  const inlineOpacity = useTransform(
    scrollYProgress,
    [0.245, 0.275, 0.420, 0.430, 0.773, 0.781, 0.895, 0.915],
    [0, 1, 1, 0, 0, 1, 1, 0],
    {
      clamp: true,
      ease: [easeOut, linear, easeIn, linear, easeOut, linear, easeIn],
    },
  );
  const buttonClockOp = useTransform(
    scrollYProgress,
    [0.660, 0.670],
    [1, 0],
    { clamp: true },
  );
  // PUBLISH ready-state breath — fires AFTER body typewriter completes
  // (raw 0.366) and BEFORE the publish activates to red (raw 0.370).
  // 4-unit (~480ms) window where the inactive pill subtly breathes —
  // "draft done, ready when you are."
  const breathState = useTransform(scrollYProgress, (v) =>
    v >= 0.366 && v < 0.370 ? 'running' : 'paused',
  );
  // ─── Publish audio cues ─────────────────────────────────────────
  // Two events fire across the publish action so the audio stays
  // synchronized to the visual regardless of scroll speed:
  //   PRESS (raw 0.381)   — outward whoosh, "submitting"
  //   SUCCESS (raw 0.391) — bright chime, "PUBLISHED"
  // Single-fire refs guard against re-fire when scrolling forward
  // through the threshold multiple times; resets only when the user
  // scrolls fully back past the press window for a re-watch.
  const publishPressFiredRef = useRef(false);
  const publishSuccessFiredRef = useRef(false);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (typeof window === 'undefined') return;
    if (!publishPressFiredRef.current && v >= 0.381 && v < 0.385) {
      publishPressFiredRef.current = true;
      try {
        window.dispatchEvent(new CustomEvent('cinema:publish-press'));
      } catch { /* audio failure non-fatal */ }
    }
    if (!publishSuccessFiredRef.current && v >= 0.391 && v < 0.395) {
      publishSuccessFiredRef.current = true;
      try {
        window.dispatchEvent(new CustomEvent('cinema:publish-success'));
      } catch { /* audio failure non-fatal */ }
    }
    if (publishPressFiredRef.current && v < 0.370) {
      publishPressFiredRef.current = false;
      publishSuccessFiredRef.current = false;
    }
  });
  return (
    <motion.div
      className="relative overflow-hidden rounded-md"
      style={{ scale: pressScale, opacity: inlineOpacity }}
      aria-hidden="true"
    >
      <motion.div
        className="editor-publish-ready-breath absolute inset-0"
        style={{ animationPlayState: breathState, backgroundColor: 'rgba(22,22,26,0.08)' }}
      />
      <motion.div className="absolute inset-0" style={{ opacity: activateOp, backgroundColor: C.risk }} />
      <motion.div
        className="pointer-events-none absolute inset-y-0"
        style={{
          x: shimmerX,
          opacity: liveOp,
          width: '70%',
          backgroundImage:
            'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: successOp,
          background: 'linear-gradient(180deg, #14583A 0%, #0B3C25 100%)',
        }}
      />
      <span
        className="relative block px-3.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em]"
        style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', color: C.paperTextMuted }}
      >
        <span className="invisible inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="4,12 9,17 19,7" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Published
        </span>
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: C.paperTextMuted, opacity: inactiveOp }}
        >
          Publish
        </motion.span>
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: '#FFFFFF', opacity: liveTextOp }}
        >
          Publish
        </motion.span>
        {/* LOADING — spinner that appears between press and success.
            Sits on top of the red pill, replacing the "Publish" text
            with a 14px ring + spinning arc. Twitter/Facebook pattern:
            the click is acknowledged before the confirmation. */}
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: loadingOp }}
          aria-hidden="true"
        >
          <span
            className="publish-spinner inline-block"
            style={{ width: 14, height: 14 }}
          />
        </motion.span>
        <motion.span
          className="absolute inset-0 flex items-center justify-center gap-1.5"
          style={{ color: '#FFFFFF', opacity: successOp }}
        >
          <motion.span style={{ opacity: buttonClockOp, display: 'inline-flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" data-publish-clock>
              <polyline points="4,12 9,17 19,7" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
          Published
        </motion.span>
      </span>
    </motion.div>
  );
}

/* WordCounterNarrative — gives the editor's word count narrative
   work instead of being decorative chrome. Three states driven by
   scroll position (raw):
     1. neutral (default): "Words: {n}" in muted gray
     2. tense (raw 0.376 → 0.388): pulses ONCE as Alex hovers Publish
     3. corrected (raw 0.910+): strikes itself through, then rewrites
        beneath as "Words: 73 (corrected)"
   The strike-then-rewrite happens AFTER the Accept Fix self-press
   (ds 0.901 = raw 0.917) so the counter participates in the
   correction story. */
function WordCounterNarrative({
  liveWords,
  scrollYProgress,
}: {
  liveWords: number;
  scrollYProgress: MotionValue<number>;
}) {
  const [phase, setPhase] = useState<'neutral' | 'tense' | 'corrected'>('neutral');
  useEffect(() => {
    const apply = (v: number) => {
      if (v >= 0.917) setPhase('corrected');
      else if (v >= 0.376 && v < 0.388) setPhase('tense');
      else setPhase('neutral');
    };
    apply(scrollYProgress.get());
    return scrollYProgress.on('change', apply);
  }, [scrollYProgress]);

  // Corrected count = original (78) minus the dangerous sentence
  // length (5 words removed in the rewrite), reflecting the
  // actual character-count economy of the correction.
  const correctedWords = 73;

  if (phase === 'corrected') {
    return (
      <div
        className="text-[10.5px] tabular-nums"
        style={{ fontFamily: 'var(--font-geist-sans)' }}
      >
        <span
          style={{
            color: C.paperTextFaint,
            textDecoration: 'line-through',
            textDecorationColor: C.risk,
            textDecorationThickness: '1.6px',
            marginRight: 8,
          }}
        >
          Words: 78
        </span>
        <span style={{ color: C.safe, fontWeight: 600 }}>
          Words: {correctedWords} (corrected)
        </span>
      </div>
    );
  }

  return (
    <div
      className="text-[10.5px] tabular-nums"
      style={{
        color: C.paperTextFaint,
        fontFamily: 'var(--font-geist-sans)',
        animation: phase === 'tense' ? 'wordCounterPulse 480ms cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
        display: 'inline-block',
      }}
    >
      Words: {liveWords}
    </div>
  );
}

function PostStage({
  scrollYProgress,
  rawScrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
  rawScrollYProgress: MotionValue<number>;
}) {
  // Frame visibility — DELAYED entry, OPACITY SYNCED WITH POSITION.
  // Previously the opacity ramp finished at ds 0.165 while the position
  // animation kept going until 0.190 — meaning the editor was fully
  // opaque at ~50% travel, and the last half of the slide happened
  // with no perceivable motion (the editor was already solid). Now
  // opacity AND position both run ds 0.143 → 0.190, so the user
  // watches the editor fade in WHILE it travels up: a single
  // coordinated arrival gesture, not two staggered ones.
  // PostStage outer opacity — visible from entry (ds 0.143-0.190)
  // through the climax, exits BEFORE Scene 9 enters.
  // CLOSING-POLISH (2026-05-19): pulled the fade-out earlier so the
  // article disappears UNDER the decision-pause overlay, leaving a
  // clean dark stage when the overlay exits. No more visual mush
  // where article + Scene 9 brand mark were both partially visible.
  // Sequence:
  //   ds 0.948 → 0.956  PostStage fades OUT (under decision overlay)
  //   ds 0.956 → 0.961  DARK PAUSE — clean dark stage
  //   ds 0.961 → 0.966  Scene 9 envelope fades IN
  //   ds 0.984 → 0.995  HOLD — fully landed, nothing moves
  //   raw 0.995 → 1.000 Cinema lifts -100vh (easeInOut smooth)
  const opacity = useTransform(
    scrollYProgress,
    [0.143, 0.190, 0.948, 0.956],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  // ─── Sidebar crossfade — SEQUENTIAL, NO OVERLAP ─────────────────────
  // Three sidebars share the same DOM slot. Original implementation
  // crossfaded them with overlapping opacity windows, which made the
  // text from BOTH sidebars visible at ~50% during the swap — a
  // messy double-render where "Draft" + "RISK LEVEL" + "AUDIENCE" +
  // "Critical" all stacked on top of each other.
  //
  // Fix: sequential fades with a 1ms gap between them. Old sidebar
  // fades out over ~8ms, then new sidebar fades in over ~8ms. At any
  // given scroll position only ONE sidebar is visible, eliminating
  // the text-overlap mess.
  //   ds 0.778 → 0.786   draft fades out (8ms)
  //   ds 0.787 → 0.795   scan fades in (8ms, after draft is gone)
  //   ds 0.901 → 0.909   scan fades out (8ms) — TRIGGERED BY ACCEPT-PRESS
  //   ds 0.910 → 0.918   safe fades in (8ms, after scan is gone)
  // Audit found these were timed to the OLD accept-press at ds 0.862
  // so the sidebar showed "VERIFIED SOURCES" BEFORE the user
  // pressed Accept — narratively backward. Now the scan → safe
  // crossfade fires AT the accept-press moment (ds 0.901), so the
  // sidebar transformation reads as the CONSEQUENCE of the press,
  // not a preview of what's about to happen.
  const draftSidebarOp = useTransform(
    scrollYProgress,
    [0.778, 0.786],
    [1, 0],
    { clamp: true, ease: easeIn },
  );
  const scanSidebarOp = useTransform(
    scrollYProgress,
    [0.787, 0.795, 0.901, 0.909],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const safeSidebarOp = useTransform(
    scrollYProgress,
    [0.910, 0.918],
    [0, 1],
    { clamp: true, ease: easeOut },
  );
  // ─── Pipeline footer (inside the editor) ────────────────────────────
  // The pipeline rail appears at the bottom of the editor when Scene 7
  // (scan) takes over. Sequential swap to safe variant — no overlap.
  // Same +0.030 ds shift as the sidebar crossfade to align with the
  // accept-press at ds 0.901.
  const pipelineFooterOp = useTransform(
    scrollYProgress,
    [0.787, 0.795],
    [0, 1],
    { clamp: true, ease: easeOut },
  );
  const scanPipelineOp = useTransform(
    scrollYProgress,
    [0.901, 0.909],
    [1, 0],
    { clamp: true, ease: easeIn },
  );
  const safePipelineOp = useTransform(
    scrollYProgress,
    [0.910, 0.918],
    [0, 1],
    { clamp: true, ease: easeOut },
  );
  // Entry — the editor slides UP from below the fold (off-screen, ~280px
  // down) into its centered resting position, scaling up slightly. Stronger
  // motion than the old 36px nudge so it feels like the writer's workspace
  // is rising into the cinema, not just fading in.
  // Editor enters from BELOW THE FOLD and lands 80px below center.
  // Two intent-driven changes:
  //   1. Start position: entryY 720 (was 280). The wrapper's centered
  //      anchor (top:50% / translateY:-50%) puts its top edge at ~y=460
  //      with entryY=0. Setting entryY=720 places the wrapper's top at
  //      ~y=460+720=1180 — well below the 900px viewport bottom. The
  //      editor genuinely begins off-screen. Previously the editor
  //      started already half-visible at y=460, so the "slide up from
  //      below" gesture was only a 219px nudge over 24% of viewport.
  //      Now it travels 640px — 71% of viewport height — and the user
  //      sees a real panel rising from the bottom of the page.
  //   2. Entry window: ds 0.143 → 0.190 (raw 0.281 → 0.320). Starts
  //      AFTER the thesis pin (raw 0.275) is fully settled — a clean
  //      ~6-unit pause, then the editor begins its rise. Opacity is
  //      synced to this same window above (was 0.143 → 0.165) so the
  //      fade-in tracks the slide instead of finishing at 50% travel.
  //   Easing: easeOut (cubic 0.16, 1, 0.3, 1) — accelerates fast at
  //   start, decelerates into the landing. Reads as "panel pushed up
  //   by something heavy, settling into its frame."
  const entryY = useTransform(scrollYProgress, [0.143, 0.190], [720, 80], {
    clamp: true,
    ease: easeOut,
  });
  // Scale starts at 0.88 (was 0.92) for more sense of weight rising —
  // the larger range between start and end makes the perspective shift
  // more cinematic. Reads as "panel growing into the room" rather than
  // "panel barely changing size while sliding."
  const entryScale = useTransform(scrollYProgress, [0.143, 0.190], [0.88, 1], {
    clamp: true,
    ease: easeOut,
  });
  // Specular highlight sweep — a thin diagonal white glint that travels
  // across the editor's surface from top-left to bottom-right during
  // the entry. Reads as light catching on the coated paper as it
  // rises. Position is a percentage of the editor's diagonal — at -50
  // it's invisible past the top-left corner, at 150 it's past the
  // bottom-right. Visible window: ds 0.158 → 0.188 (mid-slide through
  // landing). Outside the window the highlight is parked off-screen.
  const specularX = useTransform(
    scrollYProgress,
    [0.158, 0.188],
    [-40, 140],
    { clamp: true, ease: linear },
  );
  const specularOp = useTransform(
    scrollYProgress,
    [0.155, 0.165, 0.185, 0.192],
    [0, 0.85, 0.85, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  // Convert specularX (% scalar) to a CSS string for the highlight band's
  // left position. Declared at the top of the component so the inline
  // motion.div doesn't violate Rules of Hooks.
  const specularLeft = useTransform(specularX, (v) => `${v}%`);
  // ─── Editor-arrive audio cue (cinematic panel-slide) ───────────────
  // Single-fire sound effect dispatched the moment the editor begins
  // its entry (ds 0.143 forward). The synth (in CinemaChrome's
  // CinemaSound) is a three-layer cinematic panel-slide: an air-
  // displacement whoosh, a deep wood-settle thunk at the landing
  // moment, and a brief paper-rustle texture as the editor's
  // workspace materializes. Fires exactly once per cinema; a ref
  // guards against re-fire if the user scrolls backward and forward
  // across the threshold multiple times.
  const arriveFiredRef = useRef(false);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (typeof window === 'undefined') return;
    if (!arriveFiredRef.current && v >= 0.143 && v < 0.180) {
      arriveFiredRef.current = true;
      try {
        window.dispatchEvent(new CustomEvent('cinema:editor-arrive'));
      } catch {
        /* audio failure should not block visuals */
      }
    }
    // Reset if the user scrolls fully back past the entry — lets the
    // sound replay on a re-watch. Only resets BEFORE the entry zone
    // (not inside it) so we never fire twice during a single forward
    // sweep due to floating-point edge cases.
    if (arriveFiredRef.current && v < 0.130) {
      arriveFiredRef.current = false;
    }
  });
  // Featured image — placeholder (empty drop zone) until the writer "adds"
  // the hero image mid-typing. Fade-in lands while paragraph 2 is being
  // typed, simulating the natural workflow of writing first, then dropping
  // the image in. Window shifted to ds 0.225 → 0.240 — aligns with the
  // mid-body typewriter beat (the writer has typed ~2 paragraphs when
  // they reach for the image). The fade drives a blur-dissolve on the
  // placeholder text + a reciprocal scale on the photo so the swap
  // reads as a soft focus-pull transition.
  const imageAddedOp = useTransform(scrollYProgress, [0.225, 0.240], [0, 1], {
    clamp: true,
    ease: easeInOut,
  });
  // Strict cause-and-effect sequencing: the clock spin causes the
  // effects (stats + comments) to unwind FIRST. Only AFTER all effects
  // have been undone does the post itself revert to the editor state.
  //   ds 0.633 → 0.715  clock spin (the visual cause)
  //   ds 0.633 → 0.680  stats tick to zero + comments retract LIFO
  //   ds 0.680 → 0.770  post morphs back to editor (the effect of
  //                     time having been reset). Mirrors the forward
  //                     morph (ds 0.235→0.325) — same durations and
  //                     lag pattern, just in reverse.
  // Morph timing — shifted to start AFTER the publish success at raw
  // 0.391 (ds 0.275). Editor chrome fades ds 0.282 → 0.307 (raw
  // 0.398 → 0.419), well after the press+loading+success sequence
  // has completed. Without this, the morph began BEFORE the user
  // had registered the publish action — confetti + chrome-fade
  // happening simultaneously was visually noisy.
  const editorOp = useTransform(
    scrollYProgress,
    [0.282, 0.307, 0.710, 0.735],
    [1, 0, 0, 1],
    { clamp: true, ease: [easeIn, linear, easeOut] },
  );
  const socialOp = useTransform(
    scrollYProgress,
    [0.302, 0.332, 0.730, 0.760],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  // Frame width — draft state at 940px (was 1080), narrowed 13% so
  // the pinned thesis at the top of the viewport has horizontal
  // gutter without competing with the editor's edges. Shrinks to
  // 540 for the social-post phase (unchanged), then back to 940 for
  // the scan/rewind state, then narrows again to 884 for Scene 7's
  // grid alignment (proportionally scaled from the original 984).
  // All morph windows shifted to start AFTER publish success — the
  // editor stays in its draft posture through the entire press →
  // loading → success sequence, then begins the social-post morph.
  const frameWidth = useTransform(
    scrollYProgress,
    [0.282, 0.342, 0.710, 0.770, 0.800],
    [940, 540, 540, 940, 884],
    { clamp: true, ease: [easeInOut, linear, easeInOut, easeInOut] },
  );
  const sidebarWidth = useTransform(
    scrollYProgress,
    [0.282, 0.327, 0.715, 0.755],
    [220, 0, 0, 220],
    { clamp: true, ease: [easeInOut, linear, easeInOut] },
  );
  const x = useTransform(
    scrollYProgress,
    [0.312, 0.372, 0.720, 0.780, 0.800],
    [0, -370, -370, 0, 168],
    { clamp: true, ease: [easeInOut, linear, easeInOut, easeInOut] },
  );
  // Writing sequence — STRICTLY GATED behind the editor's full landing.
  // Mo's rule: nothing writes itself into the editor until the panel
  // has completed its slide-up AND a brief settle beat has passed.
  // The editor's entry is its own coherent gesture; typing during the
  // slide muddies it. The order is now:
  //   ds 0.143 → 0.190  EDITOR SLIDES UP (no writing inside)
  //   ds 0.190 → 0.196  STABLE BEAT — editor is landed, blank paper,
  //                     no caret. The writer is "about to start."
  //   ds 0.196 → 0.205  TITLE types in (9 ds units, 47 chars)
  //   ds 0.205 → 0.211  BYLINE materializes (6 ds units, fade + lift)
  //   ds 0.211 → 0.245  BODY typewriter (34 ds units, 408 chars)
  //   ds 0.245 → 0.257  PUBLISH-READY beat (typing done, button waits)
  //   ds 0.257 → 0.282  Editor → social chrome morph
  // All downstream morph timing shifted +0.022 ds units to make room
  // for the body window. Approvals + publish-pill activation shift
  // by the matching +0.018 raw units. Net effect: same composition,
  // every typing event lands AFTER the panel is at rest.
  const titleProgress = useTransform(scrollYProgress, [0.196, 0.205], [0, 1], {
    clamp: true,
  });
  const bylineOp = useTransform(
    scrollYProgress,
    [0.205, 0.211],
    [0, 1],
    { clamp: true, ease: easeOut },
  );
  const typeProgress = useTransform(scrollYProgress, [0.211, 0.245], [0, 1], {
    clamp: true,
  });
  // Words counter — animates from 0 to the actual word total (78 across
  // title + 4 body paragraphs/sentences) as typing progresses. Previously
  // hardcoded as a static "Words: 126" decoration; now ticks up live
  // synced to the typewriter. Title contributes 9 words; body contributes
  // 69. Compute proportionally so the counter increments with each new
  // word that lands instead of jumping by paragraph chunks.
  const wordsLive = useTransform(scrollYProgress, (v) => {
    // Title progress: 9 words type across ds [0.196, 0.205]
    const titleP = Math.max(0, Math.min(1, (v - 0.196) / 0.009));
    // Body progress: 69 words type across ds [0.211, 0.245]
    const bodyP = Math.max(0, Math.min(1, (v - 0.211) / 0.034));
    return Math.round(titleP * 9 + bodyP * 69);
  });
  const [wordsDisplay, setWordsDisplay] = useState(0);
  useEffect(() => {
    const apply = (v: number) => {
      setWordsDisplay((prev) => (prev !== v ? v : prev));
    };
    apply(wordsLive.get());
    return wordsLive.on('change', apply);
  }, [wordsLive]);
  // Inline body caret visibility — shifted to fade in just before the
  // body typewriter begins at ds 0.211, and fade out as typing
  // completes at ds 0.245.
  const bodyCaretOp = useTransform(
    scrollYProgress,
    [0.208, 0.211, 0.245, 0.250],
    [0, 1, 1, 0],
    { clamp: true },
  );
  // The Publish button's MotionValues all live in the top-level
  // PublishButton component now (rendered alongside PostStage at the
  // StoryCinema level), because that's the only place it can be a single
  // element that physically moves out of the editor without being trapped
  // inside the chrome's opacity-fading wrapper.
  // Freeze dim — applied to the whole frame during scene 5
  // (Shifted +0.030 ds to align with new post-publish breath beats.)
  const freezeDim = useTransform(
    scrollYProgress,
    [0.458, 0.462, 0.525, 0.540],
    [0, 0.88, 0.88, 0],
    { clamp: true, ease: [linear, linear, easeOut] },
  );
  // Pencil-circle around the dose during the freeze frame. Computed here
  // because PostStage owns the post + already takes downstreamProgress.
  // PathLength animates 0 → 1 over a tight window so it reads as a hand
  // sketching the circle rather than a CSS fade. Visibility lingers slightly
  // longer so the marked-up dose is still readable as the freeze releases.
  //   downstream(raw 0.480) = 0.375
  //   downstream(raw 0.510) = 0.406
  //   downstream(raw 0.540) = 0.446
  // (Shifted +0.030 ds to align with new comments timing.)
  const pencilLength = useTransform(
    scrollYProgress,
    [0.375, 0.406],
    [0, 1],
    { clamp: true, ease: easeOut },
  );
  const pencilOpacity = useTransform(
    scrollYProgress,
    [0.373, 0.377, 0.518, 0.540],
    [0, 1, 1, 0],
    { clamp: true },
  );
  // Danger glow on the post — kicks in once critical comments start landing
  // (third comment, downstream 0.347 ≈ raw 0.452) and grows until the freeze
  // frame. Visualizes brand-damage in real time without any explicit text.
  //
  // STEPPED, not smooth: previous implementation was a single eased ramp
  // 0.345 → 0.420. Reads as "background is gradually getting redder,"
  // which loses the cause/effect relationship between each critical
  // comment and the brand damage it inflicts. Now the glow steps UP at
  // each critical comment's landing window (a fast 0.003 ramp), then
  // holds level until the next critical voice arrives. Six discrete
  // damage events, each visibly attributable to a specific comment.
  //   t0 (Janet critical)     0.382 → 0.388   step to 0.18
  //   t0 (Nicole critical)    0.391 → 0.397   step to 0.38
  //   t0 (Amara critical)     0.400 → 0.406   step to 0.55
  //   t0 (James critical)     0.411 → 0.417   step to 0.72
  //   t0 (David climax)       0.425 → 0.431   step to 0.92
  //   t0 (Emma critical)      0.434 → 0.440   step to 1.00
  // (Shifted +0.030 ds to align with new comments timing.)
  const dangerGlow = useTransform(
    scrollYProgress,
    [
      0.375, 0.382,
      0.388, 0.391,
      0.397, 0.400,
      0.406, 0.411,
      0.417, 0.425,
      0.431, 0.434,
      0.440, 0.450,
    ],
    [
      0,    0,
      0.18, 0.18,
      0.38, 0.38,
      0.55, 0.55,
      0.72, 0.72,
      0.92, 0.92,
      1,    1,
    ],
    { clamp: true, ease: easeOut },
  );
  const dangerBoxShadow = useTransform(
    dangerGlow,
    (v) =>
      // Layered depth: a long ambient drop, a tight contact shadow, a
      // faint inner highlight that gives the paper a subtle bevel, and
      // the dangerGlow-driven red bleed on the left edge that activates
      // during the brand-damage climax. The first three are constant —
      // they give the editor its grounded "physical document on a dark
      // stage" presence from the moment it enters. Without them the
      // editor read as a sticker pasted on the void.
      `0 64px 120px -32px rgba(0,0,0,0.70), 0 28px 56px -16px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.045), inset 0 1px 0 rgba(255,255,255,0.85), -16px 0 32px -8px rgba(255,74,74,${0.42 * v})`,
  );
  const dangerRailOp = useTransform(dangerGlow, (v) => 0.65 * v);

  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 z-[20]"
      style={{
        opacity,
        x,
        y: entryY,
        scale: entryScale,
        translateX: '-50%',
        translateY: '-50%',
      }}
    >
      <motion.div style={{ width: frameWidth }}>
        <motion.div
          className="relative overflow-hidden"
          style={{
            backgroundColor: C.paper,
            // Refined from 12 to 10 — matches the convention used by
            // Notion / Linear / Webflow's editor surfaces. The smaller
            // radius reads as more professional, less app-y.
            borderRadius: 10,
            border: `1px solid ${C.paperLine}`,
            boxShadow: dangerBoxShadow,
          }}
        >
          {/* Paper grain overlay — a 1.5% noise texture that gives the
              editor's white paper a subtle tactile surface. Matches the
              cinema's stage grain so the editor doesn't read as a flat
              sticker pasted on the textured void. Sits BELOW the danger
              rail and ABOVE the paper fill via z-index. */}
          <div className="editor-paper-grain" aria-hidden="true" />
          {/* Top-left → bottom-right specular highlight sweep that travels
              across the editor surface as it rises into place. A 22%-wide
              soft-edged white diagonal band, parked off-screen most of the
              cinema (clamped past the visible window). Reads as a glint of
              light catching the coated paper as the panel lands. Adds a
              physical-material feel that pure CSS rectangles lack. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2] overflow-hidden"
            style={{ borderRadius: 10 }}
          >
            <motion.div
              style={{
                position: 'absolute',
                top: '-30%',
                bottom: '-30%',
                // Narrower (16% was 22%) for a tighter sliver of light.
                // Gradient stops tightened (peak 0.74 was 0.58, sharper
                // falloff) so the glint reads as a sharp light line
                // rather than a soft cloud. Skew increased -12° → -16°
                // for a stronger sense of light direction. Blend mode
                // changed screen → soft-light so the highlight lifts
                // the paper's tones naturally instead of blowing them
                // out to pure white.
                width: '16%',
                left: specularLeft,
                background:
                  'linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.32) 40%, rgba(255,255,255,0.74) 50%, rgba(255,255,255,0.32) 60%, transparent 100%)',
                opacity: specularOp,
                transform: 'skewX(-16deg)',
                mixBlendMode: 'soft-light',
              }}
            />
          </motion.div>
          {/* Paper lighting — a faint inner gradient that gives the
              paper a sense of being lit from above-left. Constant (not
              scroll-driven). Reads as "this is a physical document
              under stage lights" not "this is a #FBF8F3 fill." */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              borderRadius: 10,
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0) 35%, rgba(0,0,0,0.025) 100%)',
            }}
          />
          {/* Left-edge danger rail — grows in opacity as critical comments
              accumulate. Sits flush against the inside of the post's left
              edge so it reads as "brand damage", not a decorative accent. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 bottom-0 z-[1]"
            style={{ width: 3, backgroundColor: C.risk, opacity: dangerRailOp }}
          />
          {/* ── EDITOR CHROME (top) — title bar + toolbar fade together ── */}
          <motion.div style={{ opacity: editorOp }}>
            {/* Title bar separator — adds a 1px highlight just below the
                border so the title bar reads as slightly elevated above
                the body. Pairs with the bottom border to create a hairline
                "step" between chrome and content. Subtle but key for
                that "this is a multi-layered surface" feel. */}
            <div
              className="flex items-center justify-between border-b px-5 py-3"
              style={{
                borderColor: C.paperLine,
                boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.6)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.paperText} strokeWidth="1.6" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                <span
                  className="text-[13.5px] font-semibold"
                  style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
                >
                  {ARTICLE_TITLE}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]"
                  style={{
                    backgroundColor: 'rgba(22,22,26,0.06)',
                    color: C.paperTextMuted,
                    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  Draft
                </span>
              </div>
              {/* The Publish button lives INLINE inside the title bar
                  now — that's its true home, and rendering it here
                  guarantees it tracks the title bar's position no
                  matter how the editor's height changes when the
                  sidebar/footer evolve through scan/safe states. The
                  "fly to corner" effect during publish is handled by a
                  separate CORNER wrapper (PublishButton component) that
                  cross-fades with this inline pill at publish/unpublish
                  moments. */}
              <div className="flex items-center gap-3">
                <InlinePublishPill scrollYProgress={rawScrollYProgress} />
                {/* Author avatar — initials "AB" for Alex Brennan, the
                    fictional writer drafting this Hartwell Health piece.
                    The tooltip surfaces the identity so the avatar reads
                    as a person rather than UI furniture. Subtle ring
                    gives it depth on the editor's paper surface. Pops
                    in with an overshoot scale animation (CSS keyframe
                    editorAvatarPop on .editor-avatar-pop) when the
                    editor lands — feels like a hand placing a sticker
                    rather than a UI element fading in. */}
                <div
                  className="editor-avatar-pop flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold"
                  style={{
                    backgroundColor: '#E9DDC9',
                    color: '#6B5A38',
                    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                    boxShadow: 'inset 0 0 0 1px rgba(107,90,56,0.18), 0 1px 2px rgba(22,22,26,0.06)',
                    animationDelay: '120ms',
                  }}
                  title="Alex Brennan · Editor at Hartwell Health"
                  aria-label="Author Alex Brennan"
                >
                  AB
                </div>
              </div>
            </div>
            <div
              className="flex items-center justify-between border-b px-5 py-2"
              style={{ borderColor: C.paperLine }}
            >
              <div className="flex items-center gap-3" style={{ color: C.paperTextMuted }}>
                <span
                  className="flex items-center gap-1 text-[11.5px]"
                  style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
                >
                  Normal
                  <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </span>
                <span style={{ color: C.paperLine }}>|</span>
                <span className="text-[12px] font-semibold" style={{ fontFamily: 'var(--font-geist-sans)' }}>B</span>
                <span className="text-[12px] italic" style={{ fontFamily: 'var(--font-serif), Georgia, serif' }}>I</span>
                <span className="text-[12px] underline" style={{ fontFamily: 'var(--font-geist-sans)' }}>U</span>
              </div>
              {/* Word counter — narrative-driven, not decorative.
                  Audit found this never did story work; now it pulses
                  briefly when Alex hovers Publish (raw ~0.378), then
                  STRIKES ITSELF and rewrites to the corrected count
                  ("Words: 73 (corrected)") when the Accept Fix
                  self-presses at ds 0.901. The counter participates
                  in the story instead of just being chrome. */}
              <WordCounterNarrative
                liveWords={wordsDisplay}
                scrollYProgress={rawScrollYProgress}
              />
            </div>
          </motion.div>

          {/* ── SOCIAL HEADER — absolute over editor chrome, fades in ── */}
          <motion.div
            className="absolute left-0 right-0 top-0"
            style={{ opacity: socialOp }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-2.5">
                {/* Brand logo — the Hartwell Health medical cross mark,
                    loaded as an actual asset from /public/avatars/ so it
                    reads as a real brand's social profile picture. Sized
                    larger than the inline default (48px) so the medical
                    cross is unmistakable at thread-card scale. */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/avatars/hartwell-health.svg"
                    alt=""
                    width={48}
                    height={48}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                  />
                </div>
                <div>
                  <div
                    className="flex items-center gap-1 text-[14px] font-bold"
                    style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
                  >
                    Hartwell Health
                    <VerifiedMark kind="brand" size={14} />

                  </div>
                  <div
                    className="text-[12px]"
                    style={{ color: C.paperTextMuted, fontFamily: 'var(--font-geist-sans)' }}
                  >
                    @hartwellhealth
                  </div>
                </div>
              </div>
              <span style={{ color: C.paperTextMuted }}>···</span>
            </div>
          </motion.div>

          {/* ── BODY ROW — body always renders; sidebar collapses on morph ── */}
          <div className="flex">
            <div className="min-w-0 flex-1 px-5 py-4">
              <EditorBody
                typeProgress={typeProgress}
                titleProgress={titleProgress}
                bylineOp={bylineOp}
                bodyCaretOp={bodyCaretOp}
                imageAddedOp={imageAddedOp}
                pencilLength={pencilLength}
                pencilOpacity={pencilOpacity}
                damageLevel={dangerGlow}
                variant="draft"
              />
            </div>
            <motion.div
              className="overflow-hidden editor-sidebar-fadeout"
              style={{ width: sidebarWidth, opacity: editorOp }}
            >
              <div
                className="relative w-[220px] border-l px-5 py-6"
                style={{ borderColor: C.paperLine }}
              >
                {/* DraftMeta — in normal flow, defines the sidebar's
                    height. Fades out as Scene 7 (scan) takes over. */}
                <motion.div style={{ opacity: draftSidebarOp }}>
                  <EditorSidebarDraftMeta scrollYProgress={rawScrollYProgress} />
                </motion.div>
                {/* AssuredReview — absolutely positioned over the same
                    area, fades IN for Scene 7 (scan state). */}
                <motion.div
                  className="absolute inset-0 px-5 py-6"
                  style={{ opacity: scanSidebarOp }}
                >
                  <EditorSidebarAssuredReview scrollYProgress={scrollYProgress} />
                </motion.div>
                {/* VerifiedSources — fades in for Scene 8 (safe state). */}
                <motion.div
                  className="absolute inset-0 px-5 py-6"
                  style={{ opacity: safeSidebarOp }}
                >
                  <EditorSidebarVerifiedSources />
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* ── SOCIAL POST FOOTER — timestamp + engagement stats ── */}
          <motion.div style={{ opacity: socialOp }}>
            <div
              className="px-5 py-2 text-[11.5px]"
              style={{ color: C.paperTextFaint, fontFamily: 'var(--font-geist-sans)' }}
            >
              {getPostTimestamp()}
            </div>
            <div
              className="flex items-center justify-between border-t px-5 py-2.5"
              style={{ borderColor: C.paperLine, color: C.paperTextMuted, fontFamily: 'var(--font-geist-sans)' }}
            >
              {/* Engagement counters — scroll-driven, count from 0 to final
                  as the comment storm unfolds. Replies and likes climb
                  alongside the comments arriving; reposts keep climbing
                  PAST the comment storm peak (post is being shared as a
                  "look at this dangerous post" warning), so its end value
                  is higher and its window extends further. */}
              {/* Rewind range 0.657 → 0.704 (downstream) — engagement
                  numbers tick back DOWN to zero during the FIRST HALF of
                  the clock spin. Stats reach zero BEFORE the post starts
                  morphing back (ds 0.704+), so the cause-and-effect chain
                  is: spin starts → effects unwind → post reverts.

                  COUNTER MICRO-VARIATION — earlier draft synced all four
                  counters to the same start beat (0.325). Reads as "a
                  computer is tallying" rather than "real humans are
                  reacting." Tuned so each metric expresses its real-life
                  behaviour:
                    • LIKES start FIRST (0.350) and climb FASTEST — likes
                      are reflexive, a thumb tap on the way past. They
                      hit final by 0.438.
                    • REPLIES start LATER (0.360) — typing requires
                      intent. They finish at 0.462.
                    • REPOSTS start ~0.358 and keep climbing PAST the
                      comment storm peak (the post is being shared as a
                      "look at this dangerous post" warning). Out 0.508.
                    • SHARES start 0.358, finish at 0.482.
                  The 12-point window stagger reads as four overlapping
                  human waves, not one synchronized graph.
                  (Shifted +0.030 ds and rewind +0.024 ds to align with
                  the post-publish breath rewrite.) */}
              <TickingMetric scrollYProgress={scrollYProgress} scrollIn={0.360} scrollOut={0.462} end={1340} rewindStart={0.657} rewindEnd={0.704} kind="reply" mutedColor={C.paperTextMuted} />
              <TickingMetric scrollYProgress={scrollYProgress} scrollIn={0.358} scrollOut={0.508} end={4820} rewindStart={0.657} rewindEnd={0.704} kind="repost" mutedColor={C.paperTextMuted} />
              <TickingMetric scrollYProgress={scrollYProgress} scrollIn={0.350} scrollOut={0.438} end={3210} rewindStart={0.657} rewindEnd={0.704} kind="like" mutedColor={C.paperTextMuted} />
              <TickingMetric scrollYProgress={scrollYProgress} scrollIn={0.358} scrollOut={0.482} end={1100} rewindStart={0.657} rewindEnd={0.704} kind="share" mutedColor={C.paperTextMuted} />
            </div>
          </motion.div>

          {/* Pipeline footer removed — it was a third parallel
              checklist competing with the chip rail (left) and the
              sources rail (below). Three visualizations of "the AI
              is working" overcrowded the frame. The chip rail tells
              the FINDING narrative; the sources rail tells the
              AUTHORITY narrative. The pipeline was redundant. */}
          {/* The freeze-dim overlay used to live here, dimming the post.
              It's now localized to the comments column (see Scene5FreezeOverlay)
              so during the freeze moment the post stays fully visible while
              the red pencil-circle is drawn around the dangerous dose. */}
        </motion.div>

      </motion.div>
    </motion.div>
  );
}

/* The editor frame — used by Scene 2 (draft) and Scene 7 (scan) and
   Scene 8 (safe publish). The variant controls which decorations layer in. */
function EditorFrame({
  variant,
  typeProgress,
  riskTintOp,
  scanProgress,
  showAssuredPanel,
  showCorrection,
  publishHover,
}: {
  variant: 'draft' | 'scan' | 'safe';
  typeProgress?: MotionValue<number>;
  riskTintOp?: MotionValue<number>;
  scanProgress?: MotionValue<number>;
  showAssuredPanel?: boolean;
  showCorrection?: boolean;
  publishHover?: MotionValue<number>;
}) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        backgroundColor: C.paper,
        borderRadius: 10,
        border: `1px solid ${C.paperLine}`,
        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between border-b px-5 py-3"
        style={{ borderColor: C.paperLine }}
      >
        <div className="flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.paperText} strokeWidth="1.6" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          <span
            className="text-[13.5px] font-semibold"
            style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
          >
            {ARTICLE_TITLE}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]"
            style={{
              backgroundColor: 'rgba(22,22,26,0.06)',
              color: C.paperTextMuted,
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              fontWeight: 600,
            }}
          >
            Draft
          </span>
        </div>
        <div className="flex items-center gap-3">
          {variant === 'safe' && (
            <span
              className="text-[10.5px]"
              style={{
                color: C.paperTextFaint,
                fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              }}
            >
              ✓ Saved
            </span>
          )}
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold"
            style={{
              backgroundColor: C.paperLine,
              color: C.paperText,
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            }}
          >
            AB
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center justify-between border-b px-5 py-2"
        style={{ borderColor: C.paperLine }}
      >
        <div className="flex items-center gap-3" style={{ color: C.paperTextMuted }}>
          <span
            className="flex items-center gap-1 text-[11.5px]"
            style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
          >
            Normal
            <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
          <span style={{ color: C.paperLine }}>|</span>
          <span className="text-[12px] font-semibold" style={{ fontFamily: 'var(--font-geist-sans)' }}>B</span>
          <span className="text-[12px] italic" style={{ fontFamily: 'var(--font-serif), Georgia, serif' }}>I</span>
          <span className="text-[12px] underline" style={{ fontFamily: 'var(--font-geist-sans)' }}>U</span>
        </div>
        <div
          className="text-[10.5px]"
          style={{ color: C.paperTextFaint, fontFamily: 'var(--font-geist-sans)' }}
        >
          Words: 126
        </div>
      </div>

      {/* Body — flex with sidebar */}
      <div className="flex">
        <div className="flex-1 px-7 py-6">
          <EditorBody
            typeProgress={typeProgress}
            riskTintOp={riskTintOp}
            showCorrection={showCorrection}
            scanProgress={scanProgress}
            variant={variant}
          />

          {variant === 'safe' && (
            <div className="mt-5 flex items-center justify-between">
              <button
                className="rounded-md border px-3 py-1.5 text-[11.5px] font-medium"
                style={{
                  borderColor: C.paperLine,
                  color: C.paperTextMuted,
                  backgroundColor: 'transparent',
                  fontFamily: 'var(--font-geist-sans)',
                }}
              >
                Request Medical Review
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold text-white"
                style={{ backgroundColor: C.safe, fontFamily: 'var(--font-geist-sans)' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Approved to Publish
              </button>
            </div>
          )}
        </div>

        {/* Sidebar — meta in draft mode, AssuredAI review in scan mode, sources in safe mode */}
        <div
          className="w-[220px] shrink-0 border-l px-5 py-6"
          style={{ borderColor: C.paperLine }}
        >
          {variant === 'draft' && <EditorSidebarDraftMeta />}
          {/* EditorFrame is no longer rendered anywhere — PostStage
              owns the sidebar/footer evolution directly. Keeping the
              definitions for now but the scan/safe variants here are
              dead branches. Stubbed out so the component compiles
              without requiring scrollYProgress here. */}
          {variant === 'safe' && <EditorSidebarVerifiedSources />}
        </div>
      </div>

      {/* Bottom verification rail — ALWAYS rendered so all three editor
          variants have the SAME height. In draft mode the row is empty
          but reserves the same vertical space, so when PostStage's draft
          editor crossfades with Scene 7's scan editor (and Scene 7 with
          Scene 8's safe), they sit at IDENTICAL bounds. Without this
          spacer, Scene 7's pipeline footer would extend below PostStage's
          bottom edge and the user would see two editors overlapping at
          different vertical positions. */}
      <div
        className="flex items-center border-t px-5 py-3"
        style={{
          borderColor: variant === 'draft' ? 'transparent' : C.paperLine,
          backgroundColor: variant === 'draft' ? 'transparent' : 'rgba(22,22,26,0.025)',
          minHeight: 74,
        }}
      >
        {(variant === 'scan' || variant === 'safe') && <VerificationPipeline variant={variant} />}
      </div>
    </div>
  );
}

function EditorBody({
  typeProgress,
  titleProgress,
  bylineOp,
  bodyCaretOp,
  imageAddedOp,
  riskTintOp,
  showCorrection,
  scanProgress,
  pencilLength,
  pencilOpacity,
  damageLevel,
  variant,
}: {
  typeProgress?: MotionValue<number>;
  titleProgress?: MotionValue<number>;
  bylineOp?: MotionValue<number>;
  bodyCaretOp?: MotionValue<number>;
  imageAddedOp?: MotionValue<number>;
  riskTintOp?: MotionValue<number>;
  showCorrection?: boolean;
  scanProgress?: MotionValue<number>;
  pencilLength?: MotionValue<number>;
  pencilOpacity?: MotionValue<number>;
  /** 0 → 1 brand-damage signal driven by critical comments. Subtracts
   *  saturation from the featured photo as the storm escalates — by
   *  the lawsuit moment the photo reads slightly bleached, as if the
   *  brand's confidence has drained out of it. Optional; when omitted
   *  the photo stays at full saturation. */
  damageLevel?: MotionValue<number>;
  variant: 'draft' | 'scan' | 'safe';
}) {
  // When no imageAddedOp is provided (scan/safe variants), the image is
  // shown immediately. Compute the placeholder opacity (inverse of "image
  // added") at the top of the component so it satisfies Rules of Hooks.
  const fallbackImageAdded = useMotionValue(1);
  const placeholderOp = useTransform(
    imageAddedOp ?? fallbackImageAdded,
    (v) => 1 - v,
  );
  // Featured image blur-dissolve — instead of a hard opacity cut from
  // placeholder to photo, the placeholder also picks up a CSS blur that
  // grows as the photo fades in. Reads as a soft transition where the
  // empty drop-zone "out-of-focuses" and the photo "comes into focus."
  const placeholderBlur = useTransform(
    imageAddedOp ?? fallbackImageAdded,
    (v) => `blur(${v * 6}px)`,
  );
  // Photo focus-pull blur — peak blur bumped 8px → 11px so the
  // initial out-of-focus state is more pronounced. The transition
  // from heavy blur to sharp is what makes the focus-pull cinematic.
  //
  // Now ALSO ties in damageLevel: as critical comments accumulate,
  // saturation drains from the photo (1 → 0.82 at full damage). The
  // photo doesn't go monochrome — that would read as a stylistic
  // grade. Instead it loses ~18% saturation, which the eye registers
  // as "the brand's confidence is bleeding out" without ever calling
  // attention to itself. The combined filter string applies blur and
  // saturate in one pass so they animate together cleanly.
  const fallbackDamage = useMotionValue(0);
  const photoBlur = useTransform(
    [imageAddedOp ?? fallbackImageAdded, damageLevel ?? fallbackDamage],
    (vals) => {
      const added = vals[0] as number;
      const dmg = vals[1] as number;
      const blurPx = (1 - added) * 11;
      const sat = 1 - 0.18 * dmg;
      return `blur(${blurPx}px) saturate(${sat})`;
    },
  );
  // Byline arrival — translateY lift (14px → 0) coupled to bylineOp.
  // Bumped from 4px to 14px so the arrival motion is actually
  // perceivable. The byline now visibly drops into place under the
  // title rather than just fading.
  // When no bylineOp provided (scan/safe), defaults to 1 (no shift).
  const fallbackBylineOp = useMotionValue(1);
  const bylineY = useTransform(
    bylineOp ?? fallbackBylineOp,
    (v) => (1 - v) * 14,
  );
  // Featured image arrival — scale 1.04 → 1.0 paired with the blur
  // clear and opacity fade-in. Gives the photo a sense of "settling
  // into focus" rather than just appearing. Reciprocal placeholder
  // scale (0.98 → 1.0) reduces opposing motion so the swap feels
  // coordinated rather than two competing motions.
  const photoScale = useTransform(
    imageAddedOp ?? fallbackImageAdded,
    (v) => 1 + (1 - v) * 0.04,
  );
  const placeholderScale = useTransform(
    imageAddedOp ?? fallbackImageAdded,
    (v) => 0.98 + v * 0.02,
  );
  // ─── Article title typewriter ─────────────────────────────────
  // Title types in DURING the editor's slide-up (ds 0.143 → 0.155),
  // so by the time the editor lands the writer has authored the
  // headline. Falls back to fully-typed when no titleProgress (i.e.
  // in scan/safe states where the title should already be present).
  const ARTICLE_HEADLINE = 'How to Use Ibuprofen Safely for Everyday Pain';
  const [titleCount, setTitleCount] = useState(
    titleProgress ? 0 : ARTICLE_HEADLINE.length,
  );
  useEffect(() => {
    if (!titleProgress) {
      setTitleCount(ARTICLE_HEADLINE.length);
      return;
    }
    const apply = (p: number) => {
      const c = Math.round(
        Math.max(0, Math.min(1, p)) * ARTICLE_HEADLINE.length,
      );
      setTitleCount((prev) => (prev !== c ? c : prev));
    };
    apply(titleProgress.get());
    return titleProgress.on('change', apply);
  }, [titleProgress]);
  // Title-tick audio — fires on each new non-space char of the title.
  // Pitched UP 4% via the 'title' context detail so the title strokes
  // read as "lighter / higher in hierarchy" than the body's strokes.
  // When the title COMPLETES, fires a single soft "tap" event — the
  // writer's Tab/Enter to advance past the title into the body.
  const lastTitleRef = useRef(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (titleCount > lastTitleRef.current) {
      const lastChar = ARTICLE_HEADLINE[titleCount - 1];
      if (lastChar && lastChar !== ' ') {
        window.dispatchEvent(
          new CustomEvent('cinema:type-tick', { detail: { context: 'title' } }),
        );
      }
      // Title just completed — fire the soft acknowledgment tap.
      if (
        titleCount === ARTICLE_HEADLINE.length &&
        lastTitleRef.current < ARTICLE_HEADLINE.length
      ) {
        window.dispatchEvent(new CustomEvent('cinema:title-complete'));
      }
    }
    lastTitleRef.current = titleCount;
  }, [titleCount]);

  // Single-count typing model with PARAGRAPH-BREAK PAUSES — distribute
  // the typed-char total proportionally across all lines so characters
  // appear at a steady rate body-wide, AND insert 9-"char-equivalent"
  // pauses between paragraphs. The pauses are invisible (no glyph
  // rendered) but they consume typeProgress, so when the typewriter
  // is mid-pause the cursor sits at the end of the just-finished
  // paragraph blinking for ~700ms at natural scroll speed before the
  // next paragraph begins. That's the humanizing micro-beat real
  // writers take between thoughts. Without it, paragraphs roll out
  // at machine speed.
  const allLines = [...ARTICLE_PARAS, RISKY_SENTENCE];
  const PARAGRAPH_PAUSE = 9; // "char-equivalent" pause units between paragraphs
  const sumChars = allLines.reduce((s, l) => s + l.length, 0);
  const TOTAL = sumChars + (allLines.length - 1) * PARAGRAPH_PAUSE;
  const [paddedCount, setPaddedCount] = useState(typeProgress ? 0 : TOTAL);
  useEffect(() => {
    if (!typeProgress) {
      setPaddedCount(TOTAL);
      return;
    }
    const apply = (p: number) => {
      const c = Math.round(Math.max(0, Math.min(1, p)) * TOTAL);
      setPaddedCount((prev) => (prev !== c ? c : prev));
    };
    apply(typeProgress.get());
    return typeProgress.on('change', apply);
  }, [typeProgress, TOTAL]);
  // Convert padded count back to actual visible-char count by walking
  // through lines and consuming pause padding between them. The
  // resulting `count` is the number of body characters that should be
  // visible — equivalent to the previous flat model but with the
  // pauses naturally embedded.
  let _remainingPadded = paddedCount;
  let count = 0;
  for (let li = 0; li < allLines.length; li++) {
    const line = allLines[li];
    const visibleHere = Math.min(_remainingPadded, line.length);
    count += visibleHere;
    _remainingPadded -= visibleHere;
    if (li < allLines.length - 1) {
      // Consume the inter-paragraph pause (no visible chars added).
      _remainingPadded = Math.max(0, _remainingPadded - PARAGRAPH_PAUSE);
    }
  }
  // ─── Body typewriter audio ───────────────────────────────────────
  // For every new non-space character that lands in the body, fire a
  // cinema:type-tick event. The CinemaSound system listens for this
  // and synthesizes a mechanical keystroke. Without this hook the
  // body draft scene was silent — the most important content moment
  // in the cinema played in dead silence while the cold open had
  // full audio. Build the flattened body string once so we can read
  // the last typed character by absolute index.
  const flatBody = useMemo(() => allLines.join(''), [allLines]);
  // Pre-compute the absolute index of the FIRST CHAR of each line
  // (paragraph). These indices get the newLine: true detail flag on
  // their type-tick, giving them an 8% volume bump — the natural
  // emphasis a typist puts on the first character of a new thought.
  const lineStartIndices = useMemo(() => {
    const indices = new Set<number>();
    let cursor = 0;
    for (const line of allLines) {
      indices.add(cursor);
      cursor += line.length;
    }
    return indices;
  }, [allLines]);
  const lastBodyCountRef = useRef(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (count > lastBodyCountRef.current) {
      const lastChar = flatBody[count - 1];
      if (lastChar && lastChar !== ' ') {
        // Body strokes use the 'body' context (pitched DOWN 4%) so they
        // feel grounded relative to the title's lighter strokes.
        // First-char-of-paragraph gets the newLine accent for emphasis.
        const isNewLine = lineStartIndices.has(count - 1);
        window.dispatchEvent(
          new CustomEvent('cinema:type-tick', {
            detail: { context: 'body', newLine: isNewLine },
          }),
        );
      }
    }
    lastBodyCountRef.current = count;
  }, [count, flatBody, lineStartIndices]);
  // How many chars typed in each line — fills line-by-line in order.
  const lineStates: number[] = [];
  let remaining = count;
  for (const l of allLines) {
    const typed = Math.min(remaining, l.length);
    lineStates.push(typed);
    remaining = Math.max(0, remaining - l.length);
  }
  // The caret renders inline in the line that's currently being typed
  // (typed > 0 and < length). If we're at a clean break between lines,
  // anchor to the last line that has any text — the next character is about
  // to land at the START of the next line, but until then the caret stays
  // at the end of the line just finished. When nothing is typed yet, sit
  // in line 0 (which will receive the first character).
  let caretLineIdx = lineStates.findIndex((t, i) => t > 0 && t < allLines[i].length);
  if (caretLineIdx === -1) {
    for (let i = lineStates.length - 1; i >= 0; i--) {
      if (lineStates[i] > 0) { caretLineIdx = i; break; }
    }
  }
  if (caretLineIdx === -1) caretLineIdx = 0;
  return (
    <div
      className="text-[14.5px] leading-[1.55]"
      style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
      data-cinema-body={variant}
    >
      {/* Featured image — starts as an empty drop-zone placeholder (the
          state every CMS shows when you haven't picked a hero yet), then
          the photo fades in mid-typing as the writer "adds the image" to
          the article. Both layers occupy the same box so the layout
          doesn't shift when the photo lands. */}
      <div
        className="editor-photo-vignette relative mb-3 overflow-hidden rounded-md"
        style={{ height: 116, border: `1px dashed ${C.paperLine}` }}
      >
        {/* Empty placeholder — soft fill + image-icon + helper text.
            Picks up a CSS blur as the real photo fades in, so the
            placeholder "out-of-focuses" rather than just disappearing.
            Coupled with the photo's reciprocal blur (sharp by 1.0)
            this reads as a soft focus-pull transition — much more
            cinematic than the prior hard opacity cut. */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
          style={{
            backgroundColor: 'rgba(22,22,26,0.03)',
            opacity: placeholderOp,
            filter: placeholderBlur,
            scale: placeholderScale,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.paperTextMuted} strokeWidth="1.5" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span
            className="text-[10.5px] uppercase tracking-[0.14em]"
            style={{ color: C.paperTextMuted, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontWeight: 600 }}
          >
            Add featured image
          </span>
        </motion.div>
        {/* Real hero image — fades in on top of the placeholder while
            its own blur(8→0) clears to sharpness. The combined effect
            is "focus pulls from empty drop-zone onto the photograph"
            — a transition that respects the photographic context. */}
        <motion.img
          src="/marketing/article-hero.jpg"
          alt=""
          className="absolute inset-0 photo-ken-burns"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imageAddedOp ?? 1,
            filter: photoBlur,
            scale: photoScale,
          }}
        />
      </div>

      {/* Inline article H1 — TYPES IN char-by-char during the editor's
          slide-up. By the time the editor lands the title is fully
          present. A persistent blinking caret follows the last char
          (until the title completes and the body caret takes over).
          The previous draft rendered the title pre-formed which made
          the editor read as "someone else's draft being delivered"
          instead of the writer composing live. */}
      <h1
        className="leading-[1.15]"
        style={{
          color: C.paperText,
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: '22px',
          fontWeight: 600,
          letterSpacing: '-0.015em',
          minHeight: '1.15em',
          // OpenType features — kerning + standard ligatures + oldstyle
          // figures. The default rendering crowds the "Ib" pair in
          // "Ibuprofen" at this size; kerning ON tightens it. Ligatures
          // resolve "fi" / "fl" cases that appear in well-set serif
          // text. Worth it for headline polish.
          fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1',
          fontKerning: 'normal',
        }}
      >
        {/* Each typed char animates in via .cold-open-char (the same
            110ms translateY+opacity keyframe that the cold open uses).
            Without this, title chars just appeared flat — inconsistent
            with the cinema's typing language. Now the title types in
            with the same character-by-character lift as the cold-open
            prequel and retype. Spaces use .cold-open-char-space which
            renders a fixed-width gap without animation (animating a
            blank reads as a stutter). */}
        {ARTICLE_HEADLINE.slice(0, titleCount).split('').map((char, i) => (
          char === ' '
            ? <span key={i} className="cold-open-char-space editor-title-space" aria-hidden="true">{' '}</span>
            : <span key={i} className="cold-open-char">{char}</span>
        ))}
        {titleProgress != null &&
          titleCount > 0 &&
          titleCount < ARTICLE_HEADLINE.length && (
            <span className="editor-title-caret" aria-hidden="true" />
          )}
      </h1>

      {/* Byline + meta row — fades in as a single beat AFTER the title
          completes typing. Real CMSes populate this from the author's
          profile the moment a draft is saved with a title; the cinema
          mimics that "metadata snaps into place" moment with a soft
          fade. translateY slight lift adds a sense of arrival.
          When no bylineOp provided (scan/safe variants) it's just
          fully visible. */}
      <motion.div
        className="mt-1.5 mb-3.5 flex items-center gap-2"
        style={{
          opacity: bylineOp ?? 1,
          y: bylineY,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/avatars/hartwell-health.svg"
            alt=""
            width={20}
            height={20}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
        <span
          className="text-[11px]"
          style={{ color: C.paperTextMuted, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
        >
          <span style={{ color: C.paperText, fontWeight: 500 }}>Hartwell Health Editorial</span>
          {' · '}3 min read{' · '}Pain Management
        </span>
      </motion.div>

      <div className="space-y-4">
        {ARTICLE_PARAS.map((p, i) => (
          <TypedLine
            key={i}
            text={p}
            typed={lineStates[i]}
            // The inline caret only renders during the draft typing pass —
            // the scan/safe variants don't pass typeProgress (text is fully
            // visible at mount) and shouldn't sprout a caret at the end.
            showCaret={typeProgress != null && i === caretLineIdx}
            caretOp={bodyCaretOp}
          />
        ))}

      {/* Risky sentence + correction. The sentence is ONLY highlighted in
          the scan variant (red lens) — in the draft it reads as completely
          normal prose, which is the point: misinformation hides in plain
          sight until the AI scan exposes it. */}
      <div className="relative">
        {!showCorrection ? (
          <TypedLine
            text={RISKY_SENTENCE}
            typed={lineStates[ARTICLE_PARAS.length]}
            showCaret={typeProgress != null && ARTICLE_PARAS.length === caretLineIdx}
            caretOp={bodyCaretOp}
            // Always pass the highlight substring — HighlightedSpan wraps the
            // dose with a marker span (data-risky-dose) regardless of variant,
            // and the draft variant renders a hand-drawn red pencil circle
            // inside that span during the freeze frame (pencilLength/Opacity
            // are scroll-driven from PostStage).
            highlight={RISKY_HIGHLIGHT}
            scanProgress={scanProgress}
            variant={variant}
            pencilLength={pencilLength}
            pencilOpacity={pencilOpacity}
          />
        ) : (
          <CorrectionBlock />
        )}
      </div>
      </div>
    </div>
  );
}

/* TypedLine — renders `typed` characters of `text` as visible prose plus
   the remaining characters in a `visibility: hidden` span so the line's
   layout (and therefore its word wrap) stays put as text appears. When
   `showCaret` is true, an inline blinking caret is rendered right at the
   typing position — exactly like a native text input cursor. No DOM
   measurement, no positional simulation: the caret IS where the next
   character lands because it sits between the typed and untyped text in
   the DOM. */
function TypedLine({
  text,
  typed,
  showCaret,
  caretOp,
  highlight,
  highlightOp,
  scanProgress,
  variant,
  pencilLength,
  pencilOpacity,
}: {
  text: string;
  typed: number;
  showCaret: boolean;
  caretOp?: MotionValue<number>;
  highlight?: string;
  highlightOp?: MotionValue<number>;
  scanProgress?: MotionValue<number>;
  variant?: 'draft' | 'scan' | 'safe';
  pencilLength?: MotionValue<number>;
  pencilOpacity?: MotionValue<number>;
}) {
  const visibleText = text.slice(0, typed);
  const hiddenText = text.slice(typed);
  // If the highlight substring is referenced AND the line is fully typed,
  // split the visible text around it so the highlight span renders. During
  // partial typing (draft variant) we just render plain prose — the
  // highlight only matters once the risky sentence is fully visible.
  const renderVisible = () => {
    if (!highlight || typed < text.length) {
      // Plain visible prose (partial typing or no highlight)
      return visibleText;
    }
    if (!visibleText.includes(highlight)) return visibleText;
    const idx = visibleText.indexOf(highlight);
    return (
      <>
        {idx > 0 && visibleText.slice(0, idx)}
        <HighlightedSpan
          variant={variant}
          scanProgress={scanProgress}
          highlightOp={highlightOp}
          pencilLength={pencilLength}
          pencilOpacity={pencilOpacity}
        >
          {highlight}
        </HighlightedSpan>
        {idx + highlight.length < visibleText.length && visibleText.slice(idx + highlight.length)}
      </>
    );
  };
  return (
    <p className="relative">
      {renderVisible()}
      {showCaret && (
        <motion.span style={{ display: 'inline-block', opacity: caretOp ?? 1 }}>
          {/* Editor-body caret writes on the light paper surface, so it
              has to be DARK (not the cinematic off-white default) to be
              visible at all. Glow is disabled — a glow halo only reads
              against the void; on paper it would just blur the cursor. */}
          <BlinkingCursor color={C.paperText} glow={false} width={2} />
        </motion.span>
      )}
      {hiddenText.length > 0 && (
        <span style={{ visibility: 'hidden' }}>{hiddenText}</span>
      )}
    </p>
  );
}

/* Renders the risky-sentence highlight span. Owns its own useTransform
   calls so the hooks stay at component-top-level (Rules of Hooks). */
function HighlightedSpan({
  variant,
  scanProgress,
  highlightOp,
  pencilLength,
  pencilOpacity,
  children,
}: {
  variant?: 'draft' | 'scan' | 'safe';
  scanProgress?: MotionValue<number>;
  highlightOp?: MotionValue<number>;
  pencilLength?: MotionValue<number>;
  pencilOpacity?: MotionValue<number>;
  children: React.ReactNode;
}) {
  // Always declared; if no scanProgress, we just won't read it.
  const fallback = useMotionValue(1);
  const lensOpacity = useTransform(scanProgress ?? fallback, [0, 0.3], [0, 1]);
  const isLens = variant === 'scan';
  const isDraft = variant === 'draft' || !variant;
  // The pencil-circle SVG is rendered INSIDE the highlighted span (anchored
  // to the dose text itself) rather than positioned with separate x/y
  // Scene 5 freeze mark — UNIFIED with the InkBleed brand gesture.
  // Was a hand-drawn pencil ellipse (different visual language from
  // Scene 7's catch). Audit found two metaphors for "we caught
  // something" was inconsistent. Now the SAME ink-bleed gesture
  // signs every editorial mark in the cinema — Scene 5 (forensic
  // mark on published evidence), Scene 7 (AI's pre-publish catch),
  // Scene 8 (correction strikethrough). One gesture = one brand.
  //
  // Implementation: an InkBleedMark wrapper that subscribes to
  // pencilLength (a MotionValue) and feeds its current value as
  // the progress prop to InkBleed in 'circle' variant. The bleed
  // pools around the dangerous dose like ink soaking into paper.
  const pencil = pencilLength != null && (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none"
      style={{
        position: 'absolute',
        top: '50%',
        left: '-10px',
        width: 'calc(100% + 20px)',
        height: 'calc(100% + 14px)',
        display: 'block',
        translateY: '-50%',
        overflow: 'visible',
        opacity: pencilOpacity ?? 1,
      }}
    >
      <InkBleedMark progress={pencilLength} />
    </motion.span>
  );
  if (isDraft) {
    return (
      <span
        className="relative inline-block"
        data-risky-dose
      >
        {pencil}
        <span style={{ position: 'relative' }}>{children}</span>
      </span>
    );
  }
  return (
    <span
      className="relative inline-block"
      data-risky-dose
      style={{ padding: '0 4px', borderRadius: 3 }}
    >
      {isLens ? (
        <motion.span
          style={{
            position: 'absolute',
            inset: '-4px -4px',
            borderRadius: 3,
            border: `1.5px solid ${C.risk}`,
            boxShadow: `0 0 18px ${C.riskGlow}`,
            opacity: lensOpacity,
          }}
          aria-hidden="true"
        />
      ) : (
        <motion.span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 3,
            backgroundColor: C.riskSoft,
            opacity: highlightOp ?? 1,
          }}
        />
      )}
      {isLens && <CrosshairBracket />}
      <span style={{ position: 'relative' }}>{children}</span>
    </span>
  );
}

/* Red crosshair bracket overlay around the risky sentence in scan mode */
function CrosshairBracket() {
  const corner = (pos: 'tl' | 'tr' | 'bl' | 'br', i: number) => {
    const styles: Record<string, React.CSSProperties> = {
      tl: { top: -6, left: -6 },
      tr: { top: -6, right: -6 },
      bl: { bottom: -6, left: -6 },
      br: { bottom: -6, right: -6 },
    };
    const isTop = pos === 'tl' || pos === 'tr';
    const isLeft = pos === 'tl' || pos === 'bl';
    return (
      <span
        key={i}
        aria-hidden="true"
        style={{
          ...styles[pos],
          position: 'absolute',
          width: 10,
          height: 10,
          borderTop: isTop ? `1.5px solid ${C.risk}` : 'none',
          borderBottom: !isTop ? `1.5px solid ${C.risk}` : 'none',
          borderLeft: isLeft ? `1.5px solid ${C.risk}` : 'none',
          borderRight: !isLeft ? `1.5px solid ${C.risk}` : 'none',
        }}
      />
    );
  };
  return (
    <>
      {(['tl', 'tr', 'bl', 'br'] as const).map((p, i) => corner(p, i))}
    </>
  );
}

/* Strike + corrected sentence block (scene 8) */
function CorrectionBlock() {
  return (
    <div className="space-y-3">
      <div
        className="flex items-start gap-2.5 rounded-md px-3 py-2"
        style={{
          border: `1.5px solid ${C.risk}`,
          backgroundColor: 'rgba(255,74,74,0.06)',
        }}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ backgroundColor: C.risk }}
        >
          −
        </span>
        <p
          className="text-[14.5px] leading-[1.5]"
          style={{
            color: C.risk,
            textDecoration: 'line-through',
            textDecorationColor: C.risk,
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          }}
        >
          {RISKY_SENTENCE}
        </p>
      </div>
      <div
        className="rounded-md px-3 py-2"
        style={{
          border: `1.5px solid ${C.safe}`,
          backgroundColor: 'rgba(61,220,151,0.06)',
        }}
      >
        <div
          className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: C.safe, fontFamily: 'var(--font-geist-sans)' }}
        >
          ✓ Use this instead
        </div>
        <p
          className="text-[14.5px] leading-[1.5]"
          style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans)' }}
        >
          Follow the product label. Do not exceed{' '}
          <span style={{ color: C.safe, fontWeight: 700 }}>1,200 mg</span>{' '}
          (OTC maximum) in a 24-hour period for adults unless directed by a physician.
        </p>
      </div>
    </div>
  );
}

/* Sidebar in draft variant — content metadata */
/* The draft-state sidebar — the "publish settings" rail you'd see in a
   real enterprise marketing CMS (Contentful / Sanity / Webflow with a
   compliance workflow on top). Every field is one that a regulated brand
   would actually fill out before publishing a health article. The narrative
   weight: all these governance fields, none of which catch the dangerous
   dosage claim. */
function EditorSidebarDraftMeta({
  scrollYProgress,
}: {
  scrollYProgress?: MotionValue<number>;
} = {}) {
  // Approvals transition from PENDING (yellow) to APPROVED (green) at
  // the moment the writer presses publish. Previously the rows were
  // hard-coded "approved" which broke the narrative — the article
  // was a DRAFT but the approvals were already done. The fix: drive
  // the state from raw scroll progress. Before raw 0.348 (the
  // publish-press moment) → pending; after → approved. Stagger the
  // Editor and Medical flips by 30ms so they don't fire in lockstep
  // (Editor first because it's the gate the writer interacts with;
  // Medical follows as the auto-routed sign-off). Legal stays
  // "skipped" throughout — that's the carelessness this whole
  // cinema is demonstrating.
  const [approvals, setApprovals] = useState<{ editor: boolean; medical: boolean }>(
    { editor: !scrollYProgress, medical: !scrollYProgress }
  );
  // Track previous approval state so we can fire a soft chime the
  // moment Pending → Approved. Two chimes total per cinema (Editor
  // first, then Medical) — each fires once on the false → true edge.
  // Without the chime the flip was visually marked but acoustically
  // silent; the chime makes the gate completion read as an *event*
  // rather than a layout change.
  const lastApprovalsRef = useRef({ editor: false, medical: false });
  useEffect(() => {
    if (!scrollYProgress) return;
    const apply = (v: number) => {
      // Approval flip thresholds fire DURING the loading state so the
      // chimes ring as the approvals "process." Editor approves at
      // raw 0.385 (mid-loading), Medical at raw 0.388 (late-loading)
      // — the two soft chimes resolve just before the green ✓
      // PUBLISHED success appears at raw 0.389. Reads as: "press →
      // editor signed off → medical signed off → published."
      const editor = v >= 0.385;
      const medical = v >= 0.388;
      setApprovals((prev) =>
        prev.editor === editor && prev.medical === medical
          ? prev
          : { editor, medical },
      );
      // Edge detection — only fire chime on the false → true transition.
      if (typeof window !== 'undefined') {
        if (editor && !lastApprovalsRef.current.editor) {
          window.dispatchEvent(new CustomEvent('cinema:approval-chime'));
        }
        if (medical && !lastApprovalsRef.current.medical) {
          window.dispatchEvent(new CustomEvent('cinema:approval-chime'));
        }
      }
      lastApprovalsRef.current = { editor, medical };
    };
    apply(scrollYProgress.get());
    return scrollYProgress.on('change', apply);
  }, [scrollYProgress]);
  // Relative "scheduled" date — uses the current date so the cinema
  // doesn't go stale. Previously hard-coded "May 15, 10:42 AM" which
  // read as a fixed point in the past as soon as the calendar rolled
  // over. Now computed at render: "Today, 10:42 AM" if the schedule
  // is the same day, otherwise "M MMM, h:mm AM/PM". We use a fixed
  // 10:42 AM time-of-day because the cinema's narrative is about a
  // specific morning — but we keep the date relative.
  const scheduledDate = useMemo(() => {
    const now = new Date();
    const fmtMonth = now.toLocaleString('en-US', { month: 'short' });
    return `Today, ${fmtMonth} ${now.getDate()}, 10:42 AM`;
  }, []);
  return (
    <div className="space-y-3">
      {/* Status + schedule */}
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: '#E0A516' }}
        />
        <span
          className="text-[12px] font-medium"
          style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans)' }}
        >
          Draft
        </span>
        <span
          className="text-[10.5px]"
          style={{ color: C.paperTextMuted, fontFamily: 'var(--font-geist-sans)' }}
        >
          · Scheduled {scheduledDate}
        </span>
      </div>

      <SidebarRow label="Audience" value="Consumers" />
      <SidebarRow label="Category" value="Pain Management" />
      <SidebarRow label="Channels" value="Website · Twitter · LinkedIn" />

      {/* SEO meter — the Yoast-style score every WordPress/marketing CMS shows */}
      <div>
        <SidebarLabel>SEO score</SidebarLabel>
        <div className="mt-1 flex items-center gap-2">
          <div
            className="relative h-1.5 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: 'rgba(22,22,26,0.10)' }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: '78%', backgroundColor: '#3DDC97' }}
            />
          </div>
          <span
            className="text-[11px] font-semibold"
            style={{ color: '#1F8A5B', fontFamily: 'var(--font-geist-sans)' }}
          >
            78
          </span>
        </div>
      </div>

      {/* Approval workflow — three gates. Editor and Medical begin
          as PENDING (yellow dot) while the article is a draft, then
          flip to APPROVED (green) at the publish moment. Legal stays
          SKIPPED throughout — that's the moment of carelessness this
          whole cinema is demonstrating. The Legal dot subtly pulses
          (CSS animation .editor-legal-skip-dot) so the eye picks it
          up as unresolved without it shouting. */}
      <div>
        <SidebarLabel>Approvals</SidebarLabel>
        <div className="mt-1.5 space-y-1">
          <ApprovalRow
            name="Editor"
            approver="J. Reeves"
            state={approvals.editor ? 'approved' : 'pending'}
          />
          <ApprovalRow
            name="Medical"
            approver="Dr. M. Hall"
            state={approvals.medical ? 'approved' : 'pending'}
          />
          <ApprovalRow name="Legal" approver="—" state="skipped" />
        </div>
      </div>
    </div>
  );
}

/* Small subcomponents used by the draft sidebar — kept local so the
   sidebar block above reads as a single hand-laid-out form. */
function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[9.5px] uppercase tracking-[0.16em]"
      style={{ color: C.paperTextFaint, fontFamily: 'var(--font-geist-sans)', fontWeight: 600 }}
    >
      {children}
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <SidebarLabel>{label}</SidebarLabel>
      <div
        className="mt-0.5 text-[12px]"
        style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans)' }}
      >
        {value}
      </div>
    </div>
  );
}

function ApprovalRow({
  name,
  approver,
  state,
}: {
  name: string;
  approver: string;
  state: 'approved' | 'pending' | 'skipped';
}) {
  // Status indicator now uses a small ICON instead of a color-only dot
  // — accessibility win (state is readable without color) + clearer
  // visual semantic. Approved = checkmark, Pending = clock, Skipped =
  // dash. The container retains the colored fill so the at-a-glance
  // color signaling is still present.
  //
  // On the false → true (Pending → Approved) flip, the container
  // briefly pops (scale 1.0 → 1.4 → 1.0 over 220ms) via a key-driven
  // animation. Reads as a stamp landing on a page.
  const dotColor = state === 'approved' ? '#3DDC97' : '#E0A516';
  const stateLabel = state === 'approved' ? 'Approved' : state === 'pending' ? 'Pending' : 'Skipped';
  const Icon =
    state === 'approved'
      ? (
        <svg width="7" height="7" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6.2l2.4 2.4L9.5 3.6" stroke="#0E5A36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
      : state === 'pending'
        ? (
          <svg width="7" height="7" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" stroke="#4D3902" strokeWidth="1.5" />
            <path d="M6 3.4v2.8L7.6 7.4" stroke="#4D3902" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )
        : (
          <svg width="7" height="7" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 6h6" stroke="#4D3902" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        );
  return (
    <div className="flex items-center justify-between gap-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          key={state /* re-key on state change triggers the stamp animation */}
          className={
            state === 'skipped'
              ? 'editor-legal-skip-dot editor-approval-dot inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full'
              : 'editor-approval-dot editor-approval-dot-flip inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full'
          }
          style={{
            backgroundColor: dotColor,
            transition: 'background-color 320ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {Icon}
        </span>
        <span
          className="truncate text-[11.5px]"
          style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans)' }}
        >
          {name}
        </span>
      </div>
      <span
        className="text-[10.5px]"
        style={{
          color: state === 'approved' ? '#1F8A5B' : C.paperTextMuted,
          fontFamily: 'var(--font-geist-sans)',
          transition: 'color 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {stateLabel}{state === 'approved' ? ' · ' + approver : ''}
      </span>
    </div>
  );
}

/* Sidebar in scan variant — AssuredAI Review card */
function EditorSidebarAssuredReview({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // The sidebar EVOLVES as the scanner finds things on the left.
  // Each row fades in just AFTER its corresponding chip fires — so
  // the user reads the discovery on the left as the CAUSE, and the
  // sidebar populating as the EFFECT. Previously the sidebar was
  // pre-baked with all rows visible from Scene 7's first frame —
  // the verdict was delivered before the investigation, breaking
  // the whodunit narrative. Now the sidebar is an empty review
  // pane that populates row-by-row as evidence arrives.
  //
  // Row reveal timings — re-tuned to the held-silence rhythm:
  //   ds 0.787    Header (the only thing visible at scene start)
  //   ds 0.828    Risk Level     (2ms after chip 1: "Medical dosage")
  //   ds 0.826-0.830  HELD SILENCE — no new rows during the climax beat
  //   ds 0.830    Flag PUNCHES (Scene7Flag handles this)
  //   ds 0.838    Category       (2ms after chip 2)
  //   ds 0.843    Issue          (2ms after chip 3)
  //   ds 0.848    Confidence     (2ms after chip 4)
  //   ds 0.853    Status         (after sources verify, just before fix)
  //   ds 0.858 → 0.862   Status pill swap: "Needs Review" → "Fix Applied"
  const headerOp = useTransform(scrollYProgress, [0.787, 0.795], [0, 1], { clamp: true, ease: easeOut });
  const r1Op = useTransform(scrollYProgress, [0.828, 0.832], [0, 1], { clamp: true, ease: easeOut });
  const r1Y = useTransform(scrollYProgress, [0.828, 0.832], [6, 0], { clamp: true, ease: easeOut });
  const r2Op = useTransform(scrollYProgress, [0.838, 0.842], [0, 1], { clamp: true, ease: easeOut });
  const r2Y = useTransform(scrollYProgress, [0.838, 0.842], [6, 0], { clamp: true, ease: easeOut });
  const r3Op = useTransform(scrollYProgress, [0.843, 0.847], [0, 1], { clamp: true, ease: easeOut });
  const r3Y = useTransform(scrollYProgress, [0.843, 0.847], [6, 0], { clamp: true, ease: easeOut });
  const r4Op = useTransform(scrollYProgress, [0.848, 0.852], [0, 1], { clamp: true, ease: easeOut });
  const r4Y = useTransform(scrollYProgress, [0.848, 0.852], [6, 0], { clamp: true, ease: easeOut });
  const r5Op = useTransform(scrollYProgress, [0.853, 0.857], [0, 1], { clamp: true, ease: easeOut });
  const r5Y = useTransform(scrollYProgress, [0.853, 0.857], [6, 0], { clamp: true, ease: easeOut });
  // Status row swap — "Needs Review" fades out, "Fix Applied" fades
  // in at the Accept Fix self-press moment.
  const needsReviewOp = useTransform(scrollYProgress, [0.860, 0.864], [1, 0], { clamp: true, ease: easeIn });
  const fixAppliedOp = useTransform(scrollYProgress, [0.862, 0.866], [0, 1], { clamp: true, ease: easeOut });

  return (
    <div className="space-y-3.5">
      <motion.div
        className="flex items-center gap-2 text-[12px] font-semibold"
        style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans)', opacity: headerOp }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2L4 5v6.5c0 4.5 3.2 8.7 8 10.5 4.8-1.8 8-6 8-10.5V5l-8-3z"
            fill="none"
            stroke={C.risk}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        Assured AI Review
      </motion.div>
      <motion.div style={{ opacity: r1Op, y: r1Y }}>
        <Row label="Risk Level" value="Critical" valueColor={C.risk} valueWeight={700} dot={C.risk} />
      </motion.div>
      <motion.div style={{ opacity: r2Op, y: r2Y }}>
        <Row label="Category" value="Medical Dosage / Safety" />
      </motion.div>
      <motion.div style={{ opacity: r3Op, y: r3Y }}>
        <Row label="Issue" value="Dosage recommendation exceeds OTC guidance and may cause harm." multiline />
      </motion.div>
      <motion.div style={{ opacity: r4Op, y: r4Y }}>
        <Row label="Confidence" value="98%" valueWeight={600} />
      </motion.div>
      {/* Status row — swaps mid-animation when Accept Fix self-presses */}
      <motion.div style={{ opacity: r5Op, y: r5Y }} className="relative">
        <motion.div style={{ opacity: needsReviewOp }}>
          <Row label="Status" value="Needs Review" pill />
        </motion.div>
        <motion.div
          className="absolute inset-0"
          style={{ opacity: fixAppliedOp }}
        >
          <Row label="Status" value="Fix Applied" pill pillColor={C.safe} />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* Sidebar in safe variant — Verified Against list */
function EditorSidebarVerifiedSources() {
  return (
    <div className="space-y-2.5">
      <div
        className="text-[10px] uppercase tracking-[0.16em]"
        style={{ color: C.paperTextFaint, fontFamily: 'var(--font-geist-sans)', fontWeight: 600 }}
      >
        Verified Against
      </div>
      {SOURCES.slice(0, 4).map((s) => (
        <div key={s.id} className="flex items-start gap-2">
          <SourceMarkLight source={s} />
          <div className="flex-1 min-w-0">
            <div
              className="text-[11px] font-semibold"
              style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans)' }}
            >
              {s.full}
            </div>
            <div
              className="text-[10px]"
              style={{ color: C.paperTextMuted, fontFamily: 'var(--font-geist-sans)' }}
            >
              {s.reference}
            </div>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="none" stroke={C.safe} strokeWidth="1.6" />
            <path d="M8 12l3 3 5-6" fill="none" stroke={C.safe} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ))}
      <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${C.paperLine}` }}>
        <div
          className="text-[9.5px] uppercase tracking-[0.18em]"
          style={{ color: C.paperTextFaint, fontFamily: 'var(--font-geist-sans)' }}
        >
          Match Confidence
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className="text-[11.5px] font-semibold"
            style={{ color: C.safe, fontFamily: 'var(--font-geist-sans)' }}
          >
            High
          </span>
          <div className="flex h-1.5 w-20 gap-0.5">
            {[1, 1, 1, 1, 0].map((on, i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  borderRadius: 1,
                  backgroundColor: on ? C.safe : 'rgba(22,22,26,0.12)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Source mark used in the LIGHT editor sidebar (paper bg) */
function SourceMarkLight({ source }: { source: Source }) {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 4,
        backgroundColor: '#15151A',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        fontWeight: 700,
        fontSize: 9,
        flexShrink: 0,
      }}
    >
      {source.short}
    </div>
  );
}

function Row({
  label,
  value,
  valueColor,
  valueWeight,
  multiline,
  dot,
  pill,
  pillColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
  valueWeight?: number;
  multiline?: boolean;
  dot?: string;
  pill?: boolean;
  pillColor?: string;
}) {
  return (
    <div>
      <div
        className="text-[9.5px] uppercase tracking-[0.16em]"
        style={{ color: C.paperTextFaint, fontFamily: 'var(--font-geist-sans)', fontWeight: 600 }}
      >
        {label}
      </div>
      {pill ? (
        <span
          className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px]"
          style={{
            border: `1px solid ${pillColor ?? C.paperLine}`,
            backgroundColor: pillColor ? `${pillColor}1a` : 'transparent',
            color: pillColor ?? C.paperText,
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 600,
          }}
        >
          {value}
        </span>
      ) : (
        <div
          className={`mt-0.5 text-[${multiline ? '11.5' : '12.5'}px] ${multiline ? 'leading-[1.45]' : ''}`}
          style={{
            color: valueColor ?? C.paperText,
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: valueWeight ?? 400,
            display: 'flex',
            alignItems: 'center',
            gap: dot ? 6 : 0,
          }}
        >
          {dot && (
            <span
              aria-hidden="true"
              style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dot, display: 'inline-block' }}
            />
          )}
          <span>{value}</span>
        </div>
      )}
    </div>
  );
}

/* Verification pipeline rail at the bottom of the editor (scan + safe) */
function VerificationPipeline({ variant }: { variant: 'scan' | 'safe' }) {
  const stepsScan = ['Claim extracted', 'Classified', 'Sources matched', 'Risk assessed', 'Recommendation'];
  const stepsSafe = ['Claim extracted', 'Risk assessed', 'Sources matched', 'Correction suggested', 'Ready for review', 'Safe to publish'];
  const steps = variant === 'safe' ? stepsSafe : stepsScan;
  const activeIdx = variant === 'safe' ? steps.length - 1 : 2; // scan: active at "Sources matched"
  return (
    <div className="flex items-center gap-1">
      {variant === 'scan' && (
        <div className="mr-3 flex items-center gap-2">
          <SpinnerRing size={14} color={C.risk} />
          <span
            className="text-[11px]"
            style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans)', fontWeight: 600 }}
          >
            Scanning claim…
          </span>
        </div>
      )}
      {steps.map((step, i) => {
        const done = variant === 'safe' || i < activeIdx;
        const active = variant !== 'safe' && i === activeIdx;
        const color = variant === 'safe' ? C.safe : active ? C.risk : done ? C.safe : C.paperLine;
        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="1.6" />
                {done && (
                  <path d="M8 12l3 3 5-6" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
              <span
                className="text-[10.5px]"
                style={{
                  color: active || done ? C.paperText : C.paperTextMuted,
                  fontFamily: 'var(--font-geist-sans)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                style={{
                  display: 'inline-block',
                  width: 16,
                  height: 1,
                  backgroundColor: variant === 'safe' ? C.safe : C.paperLine,
                  marginLeft: 6,
                  marginRight: 4,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SpinnerRing({ size = 14, color = C.risk }: { size?: number; color?: string }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="2" />
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </motion.svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 3 — Publish Moment
   The Publish button highlights, the cursor crosses to it, click flash,
   then the big "PUBLISHED to 1.8M followers" reveal.
   ════════════════════════════════════════════════════════════════════ */

function Scene3PublishMoment(_props: { scrollYProgress: MotionValue<number> }) {
  // The white flash + giant "PUBLISHED" stamp used to live here. They were
  // replaced with an inline transformation: the Publish button itself turns
  // green with a checkmark and the label "Published" (see PostStage). The
  // editor chrome then morphs to the social-post chrome (also in PostStage),
  // so the "post is published" beat reads from the editor without any
  // full-viewport flash. This component is intentionally a no-op now —
  // kept as a stub so the main StoryCinema layout doesn't need editing.
  return null;
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 4 — Comment Storm
   The editor frame morphs into a social post (left). A grid of dark
   comment cards floods in around it (right). Risk badges at the bottom.
   ════════════════════════════════════════════════════════════════════ */

function Scene4CommentStorm({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // The post itself is in PostStage. This scene adds the vertical comment
  // feed that sits to the right of the slid post — like a real social-media
  // reply thread. Comments arrive one at a time on scroll; the first two
  // are friendly, then the tone turns and red comments interleave.
  // Scene4 stays visible THROUGH the freeze-frame stat hold AND the
  // entire rewind window (so the user watches the engagement counts
  // tick down to 0 while the clock spins backward). Fade only when
  // the AssuredAI scan UI takes over (~0.72 downstream).
  const opacity = useTransform(
    scrollYProgress,
    [0.348, 0.362, 0.750, 0.770],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  // Dim ramps in for the kill-shot stat (ds 0.458→0.462) then HOLDS
  // through the lawsuit-line hold. Once the stat has faded (ds 0.590),
  // the dim drops back to 0 BEFORE the morph-back begins. This is
  // important: the dim overlay covers the right half of the viewport,
  // and the morph-back editor expands BACK to 1080px wide which
  // crosses into that right half. If the dim is still on, the right
  // side of the morphing editor reads visibly darker than the left
  // half — a vertical seam down the middle of the editor.
  // Both dim layers drop the moment the stat slide-out completes —
  // the stat exits OFF the right edge and immediately the comments
  // under it brighten back to full visibility. The sequence is:
  //   ds 0.560 → 0.598  three stat lines spring-slide off the right
  //   ds 0.600 → 0.620  comments un-dim (overlay + per-comment dim)
  //   ds 0.595 →        clock starts flying onto the screen
  // freezeDim is applied INSIDE each FeedComment (1 - freezeDim as
  // the comment's own opacity). commentsDimOp is the column-wide
  // black wash that previously bled onto the morph-back editor —
  // dropping it BEFORE the morph-back begins keeps the editor
  // uniformly bright.
  // (Shifted +0.030 ds to align with new comments timing.)
  const freezeDim = useTransform(
    scrollYProgress,
    [0.458, 0.462, 0.600, 0.620],
    [0, 0.88, 0.88, 0],
    { clamp: true, ease: [linear, linear, easeOut] },
  );
  const commentsDimOp = useTransform(
    scrollYProgress,
    [0.458, 0.462, 0.600, 0.620],
    [0, 0.65, 0.65, 0],
    { clamp: true, ease: [linear, linear, easeOut] },
  );
  return (
    <motion.div
      className="absolute inset-0 z-[22] flex items-start px-6"
      style={{
        opacity,
        // Vertical gutter under the pinned thesis. Earlier this was a
        // fixed pt-[180px], which worked at the design viewport
        // (~1440×900) but collided with the thesis at other aspect
        // ratios. The pinned thesis lives at scale 0.36 of a clamp
        // font that itself responds to viewport width — so the
        // breathing room below it must scale with viewport height,
        // not be a static pixel constant. clamp(220px, 26vh, 300px)
        // gives ~234px @ 900h, 286px @ 1100h, and keeps the first
        // comment's top edge cleanly below the thesis bottom on every
        // common laptop / desktop size we tested.
        paddingTop: 'clamp(220px, 26vh, 300px)',
      }}
    >
      {/* Grid that mirrors the post's final position. The post (in PostStage)
          slid LEFT to roughly -370 from viewport center; the right column
          here holds the vertical comment feed. */}
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-12 gap-6">
        <div className="col-span-6" />
        <div className="relative col-span-6">
          {/* Top fade mask — a slim 22px gradient at the top of the
              comment column. The pt-clamp above gives the cards a
              clean gutter under the thesis at every common viewport,
              but at unusual aspect ratios a card's rounded top edge
              can still brush close to the thesis baseline. The fade
              softens only the very top pixel-edge of the card so the
              avatar + name + handle stay fully visible. Kept narrow
              (22px) so it doesn't read as "loading" — it reads as the
              card's top edge bleeding into the dark stage. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-[3]"
            style={{
              height: 22,
              background: `linear-gradient(to bottom, ${C.void} 0%, rgba(5,5,7,0) 100%)`,
            }}
          />
          <CommentFeed scrollYProgress={scrollYProgress} freezeDim={freezeDim} />
          {/* Freeze-frame dim — covers the comments column exactly. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2]"
            style={{ opacity: commentsDimOp, backgroundColor: C.void }}
          />
        </div>
      </div>

      <Scene5FreezeOverlay scrollYProgress={scrollYProgress} />
    </motion.div>
  );
}

function SocialPostCard({ freezeDim }: { freezeDim: MotionValue<number> }) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-xl"
      style={{
        backgroundColor: C.paper,
        border: `1px solid ${C.paperLine}`,
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: '#0B7CE3',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M19 8H5l1.5-3h11L19 8zm-1 1H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9zM11 12h2v6h-2v-6z"
                fill="white"
              />
            </svg>
          </div>
          <div>
            <div
              className="flex items-center gap-1 text-[14px] font-bold"
              style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
            >
              Hartwell Health
              <VerifiedMark kind="brand" size={14} />

            </div>
            <div
              className="text-[12px]"
              style={{ color: C.paperTextMuted, fontFamily: 'var(--font-geist-sans)' }}
            >
              @hartwellhealth
            </div>
          </div>
        </div>
        <span style={{ color: C.paperTextMuted }}>···</span>
      </div>

      {/* Body */}
      <div
        className="space-y-3 px-5 pb-3 pt-3 text-[14.5px] leading-[1.5]"
        style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
      >
        {ARTICLE_PARAS.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <p>Adults may safely take up to {RISKY_HIGHLIGHT} per day for everyday pain relief.</p>
      </div>

      <div
        className="px-5 py-2 text-[11.5px]"
        style={{ color: C.paperTextFaint, fontFamily: 'var(--font-geist-sans)' }}
      >
        {getPostTimestamp()}
      </div>

      {/* Engagement stats */}
      <div
        className="flex items-center justify-between border-t px-5 py-2.5"
        style={{ borderColor: C.paperLine, color: C.paperTextMuted, fontFamily: 'var(--font-geist-sans)' }}
      >
        {[
          { kind: 'reply' as const, count: '1.3K' },
          { kind: 'repost' as const, count: '2.7K' },
          { kind: 'like' as const, count: '3.2K' },
          { kind: 'share' as const, count: '1.1K' },
        ].map((e) => (
          <div key={e.kind} className="flex items-center gap-1.5 text-[11.5px]">
            <SocialIcon kind={e.kind} size={14} color={C.paperTextMuted} />
            {e.count}
          </div>
        ))}
      </div>

      {/* Freeze dim overlay */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: freezeDim,
          backgroundColor: '#000',
        }}
      />
    </motion.div>
  );
}

function RiskBadgeIcon({ kind }: { kind: 'user' | 'gavel' | 'shield' }) {
  const paths = {
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
    gavel: 'M14 2l8 8-4 4-8-8 4-4zM12 6l4 4M2 22h12M5 18l4-4',
    shield: 'M12 2L4 5v6.5c0 4.5 3.2 8.7 8 10.5 4.8-1.8 8-6 8-10.5V5l-8-3z',
  };
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: `1px solid ${C.risk}`,
        backgroundColor: 'rgba(255,74,74,0.08)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.risk} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={paths[kind]} />
      </svg>
    </div>
  );
}

/* CommentFeed — vertical thread of reply cards stacked under the post.
   First two comments are friendly white text; then critical comments
   interleave with red-highlighted phrases. Tone shift creates dread. */
function CommentFeed({
  scrollYProgress,
  freezeDim,
}: {
  scrollYProgress: MotionValue<number>;
  freezeDim: MotionValue<number>;
}) {
  return (
    <div className="relative max-h-[640px] overflow-hidden">
      <div className="flex flex-col gap-2.5">
        {COMMENTS.map((c, i) => (
          <FeedComment
            key={c.handle}
            comment={c}
            index={i}
            scrollYProgress={scrollYProgress}
            freezeDim={freezeDim}
          />
        ))}
      </div>
    </div>
  );
}

/* FeedComment — single comment card. Arrival is scroll-driven:
     - Cards stagger one after another (10ms apart in scroll-space).
     - Each fades in + slides up from below.
     - The CLIMAX comment ("in the hospital") gets an extra scale pulse
       and a brief red-ring flash on entry so it lands with weight.
   Stats inside each card use AnimatedCount so reply/repost/like values
   tick up from zero alongside the comment's arrival — feels like real
   engagement landing, not pre-baked numbers. */
function FeedComment({
  comment,
  index,
  scrollYProgress,
  freezeDim,
}: {
  comment: Comment;
  index: number;
  scrollYProgress: MotionValue<number>;
  freezeDim: MotionValue<number>;
}) {
  // Cadence variation — friendly comments arrive slow (the audience is
  // still warm), then critical comments accelerate (the pile-on
  // builds), with a deliberate pause before the climax comment. Total
  // stagger window stays roughly the same so downstream timing
  // (engagement counters, stat lines) isn't affected. Per-index offset:
  //   0 friendly Sarah    : t0 = 0.360              (anchor)
  //   1 friendly Marcus   : +0.012 (slow)
  //   2 critical Janet    : +0.010 (slight quicken)
  //   3 critical Nicole   : +0.009 (faster, urgent)
  //   4 critical Amara    : +0.009 (sustained pile-on)
  //   5 critical James    : +0.011 (slight breath)
  //   6 CLIMAX David      : +0.014 (deliberate pause then lands hard)
  //   7 critical Emma     : +0.009 (the aftershock)
  //
  // ── BASE T0 SHIFT (+0.030 ds, ≈+0.025 raw) ──────────────────────────
  // Original anchor was 0.330 — but the audit showed Sarah's card was
  // starting to fade in (raw 0.438) BEFORE the social card had even
  // finished appearing (raw 0.439) and WHILE the post was still
  // sliding left. The user got hit with three simultaneous changes:
  // chrome morph + slide + comment arrival. No moment to register
  // "this is now a published social post."
  //
  // Shifting the base to 0.360 inserts a clean "social card hold"
  // beat: ds 0.332 → 0.360 = ~28 ds units (~33 raw, ~3.5s of scroll)
  // where the post sits as a fully-formed social card with 0 stats
  // before the first organic comment arrives. The whole downstream
  // cascade (counters, stats, freeze-dim, lawsuit, clock) shifts in
  // lockstep so the lawsuit→clock handoff stays adjacent.
  const STAGGER_OFFSETS = [0, 0.012, 0.022, 0.031, 0.040, 0.051, 0.065, 0.074];
  const t0 = 0.360 + (STAGGER_OFFSETS[index] ?? index * 0.010);
  const t1 = t0 + 0.020;
  // Audio dispatch — fires once when the comment crosses its arrival
  // threshold. tone + climax detail drives the synth pitch and weight.
  const audioFiredRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsub = scrollYProgress.on('change', (v) => {
      if (!audioFiredRef.current && v >= t0 && v < t0 + 0.020) {
        audioFiredRef.current = true;
        try {
          window.dispatchEvent(
            new CustomEvent('cinema:comment-arrive', {
              detail: { tone: comment.tone, climax: !!comment.climax },
            }),
          );
        } catch { /* silently no-op */ }
      }
      if (audioFiredRef.current && v < t0 - 0.010) {
        audioFiredRef.current = false;
      }
    });
    return unsub;
  }, [scrollYProgress, t0, comment.tone, comment.climax]);
  // ── REWIND RETRACT ────────────────────────────────────────────────
  // Comments retract LIFO (last arrived = first to leave) during the
  // FIRST HALF of the clock spin (ds 0.657 → 0.704). All comments must
  // be gone BEFORE the post starts morphing back at ds 0.704 — the
  // cause-and-effect chain demands that the effects (comments, stats)
  // are undone before the cause (the post itself) reverts.
  // With 8 comments, the 0.047 window is sliced into 8 stagger slots
  // of 0.005 each with a 0.012 fade duration per comment.
  //   commentRetractStart = 0.657 + (7 - index) * 0.005
  //   commentRetractEnd = retractStart + 0.012
  // (Shifted +0.024 ds = +0.020 raw to align with the clock arrival
  // which also shifted to give post-publish breath room.)
  const retractStart = 0.657 + (7 - index) * 0.005;
  const retractEnd = retractStart + 0.012;
  const op = useTransform(
    scrollYProgress,
    [t0, t1, retractStart, retractEnd],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  // ── PERSONALITY-MATCHED ENTRIES — 8 distinct comment arrivals ────
  // Audit found all 8 comments arrived with the SAME fade+slide+y
  // motion. Eight identical entries was a missed cinematic
  // opportunity. Each commenter now has motion that matches their
  // personality:
  //   index 0 Sarah Liang (warm friendly)      — floats up from below softly
  //   index 1 Marcus Webb (casual friendly)    — tilted slide-in with bounce
  //   index 2 Janet Pham (concerned critical)  — SNAPS up from below with hard stop
  //   index 3 Nicole Park, PharmD (authority)  — materializes with clinical scan
  //   index 4 Amara Johnson (angry)            — SLAMS down from above
  //   index 5 James Hill (legal)               — draws in like a signature
  //   index 6 David Chen (devastating climax)  — emerges through fog, alone
  //   index 7 Emma Reyes (viral aftershock)    — explodes with screenshot flash
  // Net effect: the storm has visual variety, the eye registers
  // each commenter as a distinct character, and the climax (David)
  // gets the most cinematic entry as a payoff.
  const isCritical = comment.tone === 'critical';
  const isFriendly = !isCritical;

  // Per-personality entry vectors (yFrom, xFrom, rotateFrom, scaleFrom)
  const entryVectors: { yFrom: number; xFrom: number; rotateFrom: number; scaleFrom: number }[] = [
    { yFrom: 22,  xFrom: 0,   rotateFrom: 0,    scaleFrom: 1.00 },  // Sarah — gentle float
    { yFrom: 14,  xFrom: 12,  rotateFrom: -2.5, scaleFrom: 0.96 },  // Marcus — tilted bounce
    { yFrom: 28,  xFrom: 0,   rotateFrom: 0,    scaleFrom: 1.00 },  // Janet — hard SNAP up
    { yFrom: 0,   xFrom: 18,  rotateFrom: 0,    scaleFrom: 0.94 },  // Nicole — clinical materialize
    { yFrom: -28, xFrom: 0,   rotateFrom: 1.5,  scaleFrom: 1.04 },  // Amara — SLAM from above
    { yFrom: 0,   xFrom: -20, rotateFrom: 0,    scaleFrom: 1.00 },  // James — drawn signature
    { yFrom: 36,  xFrom: 0,   rotateFrom: 0,    scaleFrom: 0.92 },  // David — emerges through fog
    { yFrom: 8,   xFrom: 0,   rotateFrom: 0,    scaleFrom: 1.18 },  // Emma — screenshot-flash explosion
  ];
  const vec = entryVectors[index] ?? { yFrom: 18, xFrom: 0, rotateFrom: 0, scaleFrom: 1 };

  // Per-personality easing — Janet/Amara get hard ease-out for the
  // snap, Marcus gets a slight overshoot, Sarah gets a soft float
  const easeForIndex: ReturnType<typeof cubicBezier> = (() => {
    if (index === 2 || index === 4) return cubicBezier(0.34, 1.4, 0.5, 1); // Janet/Amara: snap with overshoot
    if (index === 1) return cubicBezier(0.34, 1.56, 0.64, 1);              // Marcus: spring bounce
    if (index === 3) return cubicBezier(0.16, 1, 0.3, 1);                  // Nicole: clean expo-out
    if (index === 5) return cubicBezier(0.65, 0, 0.35, 1);                 // James: smooth ease-in-out
    if (index === 7) return cubicBezier(0.22, 1, 0.36, 1);                 // Emma: fast attack then settle
    return easeOut;
  })();

  const y = useTransform(scrollYProgress, [t0, t1], [vec.yFrom, 0], {
    clamp: true,
    ease: easeForIndex,
  });
  const x = useTransform(scrollYProgress, [t0, t1], [vec.xFrom, 0], {
    clamp: true,
    ease: easeForIndex,
  });
  const entryRotate = useTransform(scrollYProgress, [t0, t1], [vec.rotateFrom, 0], {
    clamp: true,
    ease: easeForIndex,
  });
  const entryScale = useTransform(scrollYProgress, [t0, t1], [vec.scaleFrom, 1], {
    clamp: true,
    ease: easeForIndex,
  });
  // James "signature draw" — clip-path that reveals from left to right
  const signatureClip = useTransform(scrollYProgress, index === 5 ? [t0, t1] : [0, 1], index === 5 ? [0, 100] : [100, 100], { clamp: true, ease: easeOut });
  // Nicole "clinical scan" — a horizontal scanner line that sweeps
  // across the card as it materializes
  const clinicalScanX = useTransform(scrollYProgress, index === 3 ? [t0, t0 + 0.015] : [0, 1], index === 3 ? [-100, 100] : [200, 200], { clamp: true, ease: easeOut });
  const clinicalScanLeft = useTransform(clinicalScanX, (v) => `${v}%`);
  // Emma "screenshot flash" — a white flash on entry
  const flashOp = useTransform(scrollYProgress, index === 7 ? [t0, t0 + 0.003, t0 + 0.012] : [0, 1], index === 7 ? [0, 1, 0] : [0, 0], { clamp: true, ease: easeOut });
  // Climax pulse — slight scale-up + back to rest. Brief enough to read
  // as emphasis, not a wobble.
  const climaxScale = useTransform(
    scrollYProgress,
    comment.climax ? [t0, t0 + 0.008, t1, t1 + 0.012] : [0, 1],
    comment.climax ? [1, 1.06, 1.06, 1] : [1, 1],
    { clamp: true, ease: easeOut },
  );
  // Brief red ring flash on the climax comment.
  const climaxRingOp = useTransform(
    scrollYProgress,
    comment.climax ? [t0, t0 + 0.012, t1 + 0.020] : [0, 1],
    comment.climax ? [0, 1, 0] : [0, 0],
    { clamp: true },
  );
  // ── Ring snap on every critical (non-climax) comment ──────────────
  // Instead of only the climax getting a red ring, every critical
  // comment gets a faster, more contained ring outline that snaps on
  // entry and fades over 250ms (in progress units, ~0.008). This is
  // the visual heartbeat that maps to the "noise scrape" the audio
  // engine fires for each critical comment — eye and ear arrive at
  // the same beat.
  const criticalSnapOp = useTransform(
    scrollYProgress,
    isCritical && !comment.climax ? [t0, t0 + 0.004, t0 + 0.012] : [0, 1],
    isCritical && !comment.climax ? [0, 0.85, 0] : [0, 0],
    { clamp: true },
  );
  const dimOp = useTransform(freezeDim, (v) => 1 - v);
  // ── Tone tint — friendly cards warmer, critical cards cooler ──────
  // Tiny but compounding: friendly cards take a barely-perceptible
  // warm tone (a 4% wash of muted amber on the card background) while
  // critical cards take a cool wash (4% slate). Reads subconsciously
  // as "these voices are different temperatures." Climax stays neutral
  // dark panel — already loud enough.
  const tintedBg = comment.climax
    ? C.panel
    : isFriendly
      ? 'color-mix(in srgb, rgba(255,204,128,0.045), var(--cinema-panel, #18181B))'
      : 'color-mix(in srgb, rgba(168,193,224,0.045), var(--cinema-panel, #18181B))';
  // Combine personality entryScale with climaxScale for index 6
  const combinedScale = useTransform([entryScale, climaxScale] as MotionValue<number>[], (vals: number[]) => vals[0] * vals[1]);
  return (
    <motion.div
      className="relative"
      style={{
        opacity: op,
        y,
        x,
        rotate: entryRotate,
        scale: combinedScale,
        transformOrigin: index === 5 ? 'left center' : 'center',
      }}
    >
      {/* Climax ring overlay — pulses once on entry of the hospital comment */}
      {comment.climax && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            opacity: climaxRingOp,
            boxShadow: `0 0 0 1px ${C.risk}, 0 0 24px 4px rgba(255,74,74,0.45)`,
          }}
        />
      )}
      {/* Per-personality entry overlays */}
      {/* Nicole — clinical scanner sweep across the card on entry */}
      {index === 3 && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
          style={{ opacity: criticalSnapOp }}
        >
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '40%',
              left: clinicalScanLeft,
              background: `linear-gradient(90deg, transparent, ${C.trustSoft} 50%, transparent)`,
              filter: 'blur(2px)',
            }}
          />
        </motion.div>
      )}
      {/* Emma — screenshot-flash white burst on entry */}
      {index === 7 && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            opacity: flashOp,
            backgroundColor: '#FFFFFF',
            mixBlendMode: 'screen',
          }}
        />
      )}
      {/* Critical-comment snap ring — faster, contained outline that maps
          to the audio "noise scrape" beat. Non-climax critical voices
          only — climax already has its own ring. */}
      {isCritical && !comment.climax && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            opacity: criticalSnapOp,
            boxShadow: `0 0 0 1px ${C.risk}, 0 0 14px 2px rgba(255,74,74,0.28)`,
          }}
        />
      )}
      <motion.div
        className="rounded-xl px-3.5 py-2.5"
        style={{
          backgroundColor: tintedBg,
          border: `1px solid ${comment.highImpact ? C.riskSoft : C.hairline}`,
          boxShadow: comment.highImpact
            ? '0 10px 24px -10px rgba(255,74,74,0.18), 0 0 0 1px rgba(255,74,74,0.10)'
            : '0 10px 24px -12px rgba(0,0,0,0.45)',
          opacity: dimOp,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <CommenterAvatar photo={comment.photo} initials={comment.initials} hue={comment.avatarHue} size={32} />
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1">
                <span
                  className="truncate text-[12.5px] font-semibold"
                  style={{ color: C.text, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
                >
                  {comment.name}
                </span>
                {comment.verified && (
                  <VerifiedMark kind={comment.verifiedKind ?? 'brand'} size={13} />
                )}
              </div>
              <span
                className="block truncate text-[11px]"
                style={{ color: C.textMuted, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
              >
                {comment.handle}
              </span>
            </div>
          </div>
          <span
            className="text-[10.5px] shrink-0 pt-0.5"
            style={{ color: C.textFaint, fontFamily: 'var(--font-geist-sans)' }}
          >
            {comment.timestamp}
          </span>
        </div>
        <p
          className="mt-1.5 text-[13px] leading-[1.45]"
          style={{
            color: isFriendly ? C.text : C.text,
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          }}
        >
          {comment.highlight ? (
            <>
              {comment.text.split(comment.highlight)[0]}
              <span style={{ color: C.risk, fontWeight: 600 }}>{comment.highlight}</span>
              {comment.text.split(comment.highlight)[1] ?? ''}
            </>
          ) : (
            comment.text
          )}
        </p>
        <div
          className="mt-2 flex items-center gap-4 text-[10.5px]"
          style={{ color: C.textFaint, fontFamily: 'var(--font-geist-sans)' }}
        >
          <span className="inline-flex items-center gap-1">
            <SocialIcon kind="reply" size={10} />
            <AnimatedCount
              scrollYProgress={scrollYProgress}
              scrollIn={t0}
              scrollOut={t0 + 0.025}
              end={comment.replies}
            />
          </span>
          <span className="inline-flex items-center gap-1">
            <SocialIcon kind="repost" size={10} />
            <AnimatedCount
              scrollYProgress={scrollYProgress}
              scrollIn={t0}
              scrollOut={t0 + 0.025}
              end={comment.reposts}
            />
          </span>
          <span className="inline-flex items-center gap-1">
            <SocialIcon kind="like" size={10} />
            <AnimatedCount
              scrollYProgress={scrollYProgress}
              scrollIn={t0}
              scrollOut={t0 + 0.025}
              end={comment.likes}
            />
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 5 — Freeze Frame
   When the storm is at its loudest, time stops. The screen darkens except
   for the dangerous sentence. Two lines of copy land: the discovery moment
   and the AssuredAI promise.
   ════════════════════════════════════════════════════════════════════ */

function Scene5FreezeOverlay({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // ── C-then-A: brutal stat lands, then DISSOLVES together ───────────
  // Three lines stagger in, drum-roll style:
  //   "3,210 likes."   — neutral engagement metric, sets cadence
  //   "1,340 replies." — neutral engagement metric, reinforces pattern
  //   "1 lawsuit."     — kill shot. Red italic. Bigger. Extra gap above
  //                      so the user has a microbeat to anticipate it.
  // ── FILM-DIRECTOR REVISION ─────────────────────────────────────────
  // Previously the three lines staggered OUT in reverse narrative order
  // and the block translated down-right to "make room" for the clock.
  // That fought for attention with the clock. Now they SYNC-DISSOLVE
  // together at downstream 0.620 → 0.645 — a single ego-less fade that
  // hands the frame to the hero clock. No translate. The block doesn't
  // step aside; it just stops existing.
  // ── Slide-out timing ───────────────────────────────────────────────
  // Stat doesn't fade in place. Each line winds up (small leftward
  // pull-back, the spring "anticipation") then shoots OFF the right
  // edge of the screen. Stagger top-down so the lines exit in a wave:
  //   line 1 ("3,210 likes")    ds 0.560 → 0.590
  //   line 2 ("1,340 replies")  ds 0.564 → 0.594
  //   line 3 ("1 lawsuit")      ds 0.568 → 0.598
  // Opacity stays at 1 throughout the slide — the lines exit by
  // POSITION, not by fade. They drop to 0 just after they're already
  // off-screen so the DOM doesn't keep them around invisibly.
  // After the slide ends (ds 0.598), the comments under them un-dim
  // (commentsDimOp + freezeDim drop to 0) — and immediately after
  // that the clock launches from the publish button (raw 0.665 ≈ ds
  // 0.601). Sequence: stat slides → comments brighten → clock arrives.
  // (All timings shifted +0.030 ds to align with post-publish breath
  // rewrite. The line3 entry now sits at ds 0.506→0.522 which equals
  // raw 0.585→0.599 — a clean buffer after the last comment.)
  const line1Op = useTransform(
    scrollYProgress,
    [0.468, 0.482, 0.590, 0.605],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const line1Y = useTransform(scrollYProgress, [0.468, 0.486], [14, 0], { clamp: true, ease: easeOut });
  // x slide-out — simplified to a single ease-in slide (0 → 1500).
  // Original two-stage wind-up read as jitter; clean slide feels
  // deliberate and gives the lawsuit moment the focus it deserves.
  const line1X = useTransform(
    scrollYProgress,
    [0.560, 0.590],
    [0, 1500],
    { clamp: true, ease: easeIn },
  );
  const line2Op = useTransform(
    scrollYProgress,
    [0.482, 0.496, 0.594, 0.609],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const line2Y = useTransform(scrollYProgress, [0.482, 0.500], [14, 0], { clamp: true, ease: easeOut });
  const line2X = useTransform(
    scrollYProgress,
    [0.564, 0.594],
    [0, 1500],
    { clamp: true, ease: easeIn },
  );
  const line3Op = useTransform(
    scrollYProgress,
    [0.506, 0.522, 0.598, 0.613],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const line3Y = useTransform(scrollYProgress, [0.506, 0.526], [16, 0], { clamp: true, ease: easeOut });
  // Stat slide-out — simplified from spring wind-up (0 → -50 → 1500
  // over 3 keyframes with easeOut+easeIn) to a clean single ease-in
  // slide (0 → 1500). The wind-up was reading as jitter rather than
  // anticipation; the cleaner motion feels more deliberate.
  const line3X = useTransform(
    scrollYProgress,
    [0.568, 0.598],
    [0, 1500],
    { clamp: true, ease: easeIn },
  );
  // ─── Lawsuit-line entry pulse ─────────────────────────────────────
  // Beyond the existing opacity + y-lift entry, give the "1 lawsuit."
  // line a brief scale punch (1 → 1.085 → 1.00) the moment it lands.
  // The pulse window matches the audio gavel impact (raw ~0.509 ≈
  // downstream 0.510, where the impact event fires). Reads as the
  // sentence "landing with weight" — the words don't drift in, they
  // arrive like a verdict.
  // Sharper pulse — was 1.085 spike, now 1.12 (audit said the
  // lawsuit was too polite). The line slams in with violence.
  const line3Scale = useTransform(
    scrollYProgress,
    [0.506, 0.514, 0.520, 0.528],
    [1, 1.12, 1.03, 1],
    { clamp: true, ease: [easeOut, easeOut, easeOut] },
  );
  // Lawsuit-impact audio fires the moment line 3 "1 lawsuit." lands.
  // Single-fire ref guarded; resets if user scrolls fully back so the
  // moment can play again on a re-watch.
  // (Trigger range shifted +0.030 ds to align with new lawsuit timing.)
  const lawsuitFiredRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsub = scrollYProgress.on('change', (v) => {
      if (!lawsuitFiredRef.current && v >= 0.510 && v < 0.530) {
        lawsuitFiredRef.current = true;
        try {
          window.dispatchEvent(new CustomEvent('cinema:lawsuit-impact'));
        } catch { /* silently no-op */ }
      }
      if (lawsuitFiredRef.current && v < 0.500) {
        lawsuitFiredRef.current = false;
      }
    });
    return unsub;
  }, [scrollYProgress]);
  return (
    <motion.div
      className="pointer-events-none absolute right-0 top-0 bottom-0 z-[34] flex items-center"
      style={{ width: '50%' }}
    >
      <div className="px-10 lg:px-14">
        {/* Likes + replies are SUPPORTING lines — small, muted serif
            in mid-gray. They establish a cadence ("here are some
            numbers...") so the lawsuit punchline lands as the
            BREAK in the pattern. Previously they were 28-48px in
            full white — same hierarchy as the lawsuit, which
            flattened the climax. Now they're ~60% the size and
            mid-gray, framing the kill shot rather than competing
            with it. */}
        <motion.p
          className="leading-[1.18]"
          style={{
            color: C.textMuted,
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(20px, 2.4vw, 32px)',
            fontWeight: 400,
            opacity: line1Op,
            y: line1Y,
            x: line1X,
          }}
        >
          3,210 likes.
        </motion.p>
        <motion.p
          className="mt-1.5 leading-[1.18]"
          style={{
            color: C.textMuted,
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(20px, 2.4vw, 32px)',
            fontWeight: 400,
            opacity: line2Op,
            y: line2Y,
            x: line2X,
          }}
        >
          1,340 replies.
        </motion.p>
        {/* THE KILL SHOT — "1 lawsuit." with full cinematic violence.
            Was a polite slide-in with soft pulse. Now:
              • text BLEEDS in (per-letter delay simulating ink soaking)
              • uses #9E1717 (deeper blood-red) NOT the editorial red
              • viewport SHAKES via CSS animation triggered on entry
              • heavier text-shadow + blur on impact for physical weight
              • pulse is sharper (1.12× spike instead of 1.085×) */}
        <motion.p
          className="mt-8 leading-[1.06] lawsuit-line-violence"
          data-lawsuit-text
          style={{
            color: C.riskDeep,
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(48px, 6vw, 88px)',
            fontStyle: 'italic',
            fontWeight: 500,
            letterSpacing: '-0.015em',
            textShadow: '0 0 48px rgba(158,23,23,0.55), 0 0 18px rgba(158,23,23,0.35), 0 4px 0 rgba(0,0,0,0.4)',
            opacity: line3Op,
            y: line3Y,
            x: line3X,
            scale: line3Scale,
            transformOrigin: 'left center',
          }}
        >
          1 lawsuit.
        </motion.p>
        {/* REAL SETTLEMENTS — three citable pharma settlements flash
            beneath "1 lawsuit." so the user knows this isn't
            hypothetical. The cinema's fictional Hartwell Health
            stands on top of REAL precedent. Audit found the
            hypothetical lawsuit weak — the stakes are now
            inescapable. */}
        <SettlementsReveal scrollYProgress={scrollYProgress} />
      </div>
    </motion.div>
  );
}

/* SettlementsReveal — the three real precedents that ground the
   cinema. Each settlement card appears briefly after "1 lawsuit."
   lands, then they all fade together. Footnote anchors the
   fictional setup: "Hartwell Health is fictional. The lawsuits
   aren't." */
function SettlementsReveal({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Settlements appear AFTER the lawsuit line settles (ds ~0.530)
  // and fade with the rest of Scene 5 stat block (ds ~0.598).
  const opacity = useTransform(scrollYProgress, [0.530, 0.545, 0.580, 0.598], [0, 1, 1, 0], { clamp: true, ease: [easeOut, linear, easeIn] });
  // Each row cascades in over a 4ms stagger
  const SETTLEMENTS = [
    { company: 'Purdue Pharma', amount: '$8.3B', context: 'DOJ settlement · OxyContin', from: 0.532 },
    { company: 'Endo Health', amount: '$1.6B', context: 'Opioid marketing claims', from: 0.538 },
    { company: 'Allergan', amount: '$750M', context: 'Class action · false dosage', from: 0.544 },
  ];
  return (
    <motion.div
      className="mt-6 space-y-2"
      style={{ opacity, maxWidth: 460 }}
    >
      <div
        style={{
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 9,
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Real precedent
      </div>
      {SETTLEMENTS.map((s) => (
        <SettlementRow key={s.company} settlement={s} scrollYProgress={scrollYProgress} />
      ))}
      <div
        style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 11.5,
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.42)',
          marginTop: 12,
          letterSpacing: '0.01em',
        }}
      >
        Hartwell Health is fictional.{' '}
        <span style={{ color: C.risk }}>The lawsuits aren&rsquo;t.</span>
      </div>
    </motion.div>
  );
}

function SettlementRow({
  settlement,
  scrollYProgress,
}: {
  settlement: { company: string; amount: string; context: string; from: number };
  scrollYProgress: MotionValue<number>;
}) {
  const op = useTransform(scrollYProgress, [settlement.from, settlement.from + 0.004], [0, 1], { clamp: true, ease: easeOut });
  const x = useTransform(scrollYProgress, [settlement.from, settlement.from + 0.006], [-6, 0], { clamp: true, ease: easeOut });
  return (
    <motion.div
      style={{
        opacity: op,
        x,
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
      }}
    >
      <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>
        {settlement.company}
      </span>
      <span style={{ color: C.riskDeep, fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {settlement.amount}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11.5 }}>
        {settlement.context}
      </span>
    </motion.div>
  );
}

/* Hand-drawn red pencil circle around the dangerous dose in the post. The
   path is intentionally imperfect (slight asymmetries on each cubic
   segment) so it reads as a human marking up the article, not a generated
   outline. Drawing is animated via framer-motion's `pathLength` prop. */
function RedPencilCircle({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // DOM measurement of the dose's bounding rect — re-measures on every
  // scroll tick so the circle tracks the post as it morphs / slides into
  // its social-mode position.
  const [bounds, setBounds] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  useEffect(() => {
    const update = () => {
      const dose = document.querySelector('[data-cinema-body="draft"] [data-risky-dose]') as HTMLElement | null;
      if (!dose) {
        setBounds(null);
        return;
      }
      const r = dose.getBoundingClientRect();
      setBounds((prev) => {
        if (
          prev &&
          Math.abs(prev.left - r.left) < 0.5 &&
          Math.abs(prev.top - r.top) < 0.5 &&
          Math.abs(prev.width - r.width) < 0.5 &&
          Math.abs(prev.height - r.height) < 0.5
        ) {
          return prev;
        }
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      });
    };
    update();
    return scrollYProgress.on('change', update);
  }, [scrollYProgress]);
  // Drawing — starts AFTER the freeze headline has landed (raw 0.452+).
  // Stroke draws over ~0.020 of scroll which feels like a deliberate
  // hand gesture rather than a snap. The pencil RE-DRAWS during
  // Scene 7's lock-on (raw 0.819 → 0.826) so the brand pencil-circle
  // gesture from Scene 5 returns as the "AI catches it" mark — same
  // asset, second appearance, reinforcing the AssuredAI signature
  // style. Better than a generic red underline that reads as
  // strikethrough.
  const drawn = useTransform(
    scrollYProgress,
    [0.452, 0.476, 0.495, 0.819, 0.826],
    [0, 1, 1, 0, 1],
    { clamp: true, ease: [easeOut, linear, linear, easeOut] },
  );
  const opacity = useTransform(
    scrollYProgress,
    [0.450, 0.454, 0.495, 0.510, 0.819, 0.823, 0.862, 0.866],
    [0, 1, 1, 0, 0, 1, 1, 0],
    { clamp: true },
  );
  if (!bounds) return null;
  const PAD_X = 18;
  const PAD_Y = 12;
  const W = bounds.width + 2 * PAD_X;
  const H = bounds.height + 2 * PAD_Y;
  // Hand-drawn ellipse — four cubic Bezier curves with deliberate
  // asymmetries on each control point so the result has the slightly-off
  // proportions of a real pen stroke.
  const path =
    `M ${PAD_X * 0.5} ${H * 0.55} ` +
    `C ${PAD_X * 0.6} ${PAD_Y * 0.55}, ${W * 0.32} ${PAD_Y * 0.25}, ${W * 0.55} ${PAD_Y * 0.7} ` +
    `C ${W * 0.78} ${PAD_Y * 0.4}, ${W - PAD_X * 0.4} ${PAD_Y * 0.85}, ${W - PAD_X * 0.45} ${H * 0.5} ` +
    `C ${W - PAD_X * 0.5} ${H - PAD_Y * 0.6}, ${W * 0.7} ${H - PAD_Y * 0.3}, ${W * 0.5} ${H - PAD_Y * 0.75} ` +
    `C ${W * 0.28} ${H - PAD_Y * 0.4}, ${PAD_X * 0.4} ${H - PAD_Y * 0.55}, ${PAD_X * 0.5} ${H * 0.55} Z`;
  return (
    <motion.svg
      aria-hidden="true"
      className="pointer-events-none absolute z-[36]"
      style={{
        left: bounds.left - PAD_X,
        top: bounds.top - PAD_Y,
        width: W,
        height: H,
        opacity,
        overflow: 'visible',
      }}
      viewBox={`0 0 ${W} ${H}`}
    >
      <motion.path
        d={path}
        fill="none"
        stroke={C.risk}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pathLength: drawn }}
      />
    </motion.svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 6 — Rewind
   We've already shown comments fading out via opacity in the storm scene.
   Here we add a thin "REWINDING" rail with backward-ticking timestamps to
   sell the reverse motion, then transition into the scan scene.
   ════════════════════════════════════════════════════════════════════ */

function Scene6Rewind({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Shifted +0.080 downstream from original so the rewind scene
  // doesn't appear until AFTER the freeze-frame stat ("3,210 likes /
  // 1,340 replies / 1 lawsuit") has had time to sink in. The stat
  // holds visible from downstream 0.486 through 0.555 and fades by
  // 0.570; the rewind ticker + headline now start at 0.575.
  const opacity = useTransform(
    scrollYProgress,
    [0.575, 0.595, 0.645, 0.660],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const tickerX = useTransform(scrollYProgress, [0.580, 0.660], [0, -2400], {
    clamp: true,
    ease: easeInOut,
  });
  // Headline + subtitle each slide in with their own settle
  const titleOp = useTransform(scrollYProgress, [0.580, 0.605], [0, 1], {
    clamp: true,
    ease: easeOut,
  });
  const titleY = useTransform(scrollYProgress, [0.580, 0.615], [14, 0], {
    clamp: true,
    ease: easeOut,
  });
  const subOp = useTransform(scrollYProgress, [0.595, 0.620], [0, 1], {
    clamp: true,
    ease: easeOut,
  });
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-[30] flex items-center justify-center"
      style={{ opacity }}
    >
      {/* Vertical rewinding ticker */}
      <div className="absolute left-0 right-0 top-[44%] overflow-hidden">
        <motion.div
          className="flex items-center gap-8 whitespace-nowrap text-[11px] uppercase tracking-[0.22em]"
          style={{
            color: C.textFaint,
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            x: tickerX,
          }}
        >
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} className="inline-flex items-center gap-6">
              <span>← REWIND</span>
              <span style={{ color: C.risk }}>{`00:${String(34 - (i % 30)).padStart(2, '0')}`}</span>
              <span>· UNPUBLISH ·</span>
              <span>RETRACTING POST</span>
              <span>·</span>
            </span>
          ))}
        </motion.div>
      </div>

      <div className="text-center">
        <p
          className="text-[11px] uppercase tracking-[0.32em]"
          style={{ color: C.risk, fontFamily: 'var(--font-geist-mono)', fontWeight: 700 }}
        >
          Rewind · 00:34 → 00:00
        </p>
        <motion.p
          className="mt-3 leading-[1.15]"
          style={{
            color: C.text,
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(32px, 4.8vw, 64px)',
            fontWeight: 400,
            opacity: titleOp,
            y: titleY,
          }}
        >
          Before it left the room.
        </motion.p>
        <motion.p
          className="mt-2 leading-[1.4]"
          style={{
            color: C.textMuted,
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontSize: 'clamp(13px, 1.2vw, 16px)',
            opacity: subOp,
          }}
        >
          Rewinding to the draft. Assured AI inspects every claim before publish.
        </motion.p>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 7 — AssuredAI Scan + Evidence Panel
   The same editor appears, but now AssuredAI is running. A scan line
   sweeps the body. Detection chips list on the left. Right sidebar swaps
   to the AssuredAI Review card. Bottom rail shows trust sources + pipeline.
   ════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════════
   SCENE 7 — AssuredAI Catches It Here
   A 4-act narrative played out as the user scrolls:
     1. Headline arrives (eyebrow → typewriter → sub-line → ExpertAI credit)
     2. Scanner sweeps the editor body, then LOCKS ON the dangerous sentence
     3. Detection chips fire in causality order as the scanner finds issues
     4. Verification rail populates with real trusted-source logos
     5. A red flag materializes over the dangerous sentence
     6. The fix panel unfurls with an auto-correct suggestion (powered
        by ExpertAI™), and the Accept Fix button presses itself —
        the bridge into Scene 8 (the safe publish state).
   ════════════════════════════════════════════════════════════════════ */

const SCENE7_WORDS = ['Assured', 'AI', 'catches', 'it', 'here.'];

function Scene7Scan({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Scene 7 envelope — holds through the Accept Fix self-press AND
  // the body correction's char-by-char typewriter so the climax
  // moment is fully readable before Scene 8 takes over.
  //   ds 0.787 → 0.795  fade in
  //   ds 0.795 → 0.940  hold (full narrative: scan → lock-on →
  //                     underline + dose-box → held silence → flag
  //                     punch → chips cascade → sources verify →
  //                     fix panel unfurl → rows type in → Accept Fix
  //                     pulse → self-press → strikethrough → dim →
  //                     correction container slides in → text TYPES
  //                     IN char by char readable)
  //   ds 0.940 → 0.948  fade out (Scene 8 enters at 0.942)
  // Audit found the old 0.870 fade-out cut off the entire climax —
  // user saw barely a flicker of the Accept Fix self-press before
  // the panel was already fading. Extending the hold by 70 ds units
  // (~ 5.5s at natural scroll) gives every beat real screen time.
  const opacity = useTransform(
    scrollYProgress,
    [0.787, 0.795, 0.940, 0.948],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  // Eyebrow "THE MOMENT OF RISK"
  const eyebrowOp = useTransform(scrollYProgress, [0.794, 0.800], [0, 1], { clamp: true, ease: easeOut });
  // Headline cascade — 5 words appear over ds 0.798 → 0.812 (~3ms each)
  // Sub-line types in after the headline lands
  const subLineOp = useTransform(scrollYProgress, [0.812, 0.819], [0, 1], { clamp: true, ease: easeOut });
  const subLineY = useTransform(scrollYProgress, [0.812, 0.819], [8, 0], { clamp: true, ease: easeOut });
  // (ExpertAI P1 removed — saying the brand name three times in one
  // frame was marketing overkill. The credit now lives ONLY in the
  // fix panel footer (P3), at the moment of peak trust when the AI
  // has just caught something and is suggesting the fix.)

  return (
    <motion.div
      className="absolute inset-0 z-[22] flex items-center justify-center px-6"
      style={{ opacity }}
    >
      <div className="mx-auto grid w-full max-w-[1320px] grid-cols-12 gap-6">
        {/* Left rail: headline + ExpertAI credit (P1) + detection chips */}
        <div className="col-span-3">
          <motion.p
            className="text-[11px] uppercase tracking-[0.26em]"
            style={{
              color: C.risk,
              fontFamily: 'var(--font-geist-sans)',
              fontWeight: 700,
              opacity: eyebrowOp,
            }}
          >
            The moment of risk
          </motion.p>
          {/* Headline — words appear sequentially, 'here.' is red */}
          <h3
            className="mt-3 leading-[1.05]"
            style={{
              color: C.text,
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(32px, 3.2vw, 48px)',
              letterSpacing: '-0.02em',
            }}
          >
            {SCENE7_WORDS.map((w, i) => (
              <Scene7Word
                key={i}
                word={w}
                index={i}
                scrollYProgress={scrollYProgress}
                isRed={i === 4}
              />
            ))}
          </h3>
          <motion.p
            className="mt-2 text-[14px] leading-[1.5]"
            style={{
              color: C.textMuted,
              fontFamily: 'var(--font-geist-sans)',
              opacity: subLineOp,
              y: subLineY,
            }}
          >
            Before it becomes a public problem.
          </motion.p>
          {/* Chip rail — fires sequentially as scanner finds each issue */}
          <Scene7Chips scrollYProgress={scrollYProgress} />
        </div>

        {/* Right column — PostStage owns the editor. This column just
            reserves layout space so the chip rail stays positioned,
            and the verification rail sits below the editor. */}
        <div className="relative col-span-9">
          <div aria-hidden="true" className="pointer-events-none" style={{ minHeight: 480 }} />
          <SourcesBar scrollYProgress={scrollYProgress} />
        </div>
      </div>

      {/* Overlays positioned via DOM lookup on PostStage's body.
          The Scene7DangerHighlight draws the AI's clinical mark on
          the document: red underline across the dangerous sentence +
          a tight box around "4,000 mg of ibuprofen". Audit found
          this was DEAD CODE for months — defined but never rendered.
          Now wired up so the scanner's lock-on moment has a visible
          on-page mark, not just a flag in the margin. RedPencilCircle
          stays a Scene 5 element (hand-drawn editor mark during the
          freeze); Scene 7's mark reads as system/UI (clinical box +
          underline), distinguishing the two semantically. */}
      <Scene7Scanner scrollYProgress={scrollYProgress} />
      <Scene7DangerHighlight scrollYProgress={scrollYProgress} />
      <Scene7Flag scrollYProgress={scrollYProgress} />
      <Scene7FixPanel scrollYProgress={scrollYProgress} />
      {/* Scene8BodyCorrection moved OUT of Scene7Scan — it needs to
          persist through Scene 8 (ds 0.871-0.905), well past Scene 7's
          envelope fade-out at ds 0.870. Rendered at the StoryCinema
          root level instead. */}
    </motion.div>
  );
}

/* Scene7Word — a single word in the headline that fades in at its
   assigned scroll position. Inline-block so it preserves spacing. */
function Scene7Word({
  word,
  index,
  scrollYProgress,
  isRed,
}: {
  word: string;
  index: number;
  scrollYProgress: MotionValue<number>;
  isRed?: boolean;
}) {
  // 5 words land across ds 0.798 → 0.812. Each at 3ms with slight overlap.
  const start = 0.798 + index * 0.0028;
  const end = start + 0.006;
  const op = useTransform(scrollYProgress, [start, end], [0, 1], { clamp: true, ease: easeOut });
  const y = useTransform(scrollYProgress, [start, end], [8, 0], { clamp: true, ease: easeOut });
  return (
    <motion.span
      style={{ opacity: op, y, color: isRed ? C.risk : undefined, display: 'inline-block', marginRight: '0.22em' }}
    >
      {word}
    </motion.span>
  );
}

/* Scene7Chips — detection chips fire as the AI's findings.
   The LEAD chip (medical dose claim) fires alone first, triggering
   the climax beat where the flag PUNCHES in. Then a held silence.
   Then chips 2-4 cascade as supporting evidence after the flag pulse. */
function Scene7Chips({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Chip 1 — the LEAD finding. Fires the moment the scanner locks on.
  // This is what the flag is FLAGGING. Causally the most important.
  //   ds 0.832  Chip 1 fires (the LEAD)
  //   ds 0.832-0.838  HELD SILENCE — nothing else moves (extended
  //                   from 4 ds to 6 ds so the user has time to
  //                   READ the chip before the flag punches in)
  //   ds 0.838  Flag PUNCHES in (handled in Scene7Flag)
  //   ds 0.842  Chip 2 — supporting evidence (gap 10 ds from chip 1)
  //   ds 0.848  Chip 3 — supporting evidence (gap 6 ds)
  //   ds 0.854  Chip 4 — bridges to sources verification (gap 6 ds)
  // Each chip's individual reveal window (op + glow) widens too —
  // see DetectionChip; entry was 5 ds (0.005), now 7 ds (0.007) so
  // each chip feels deliberate, not strobed.
  const chips: { label: string; sub: string; kind?: 'risk'; start: number }[] = [
    { label: 'Medical dosage claim detected', sub: '4,000 mg exceeds OTC daily maximum', kind: 'risk', start: 0.832 },
    { label: 'High-risk instruction detected', sub: 'Action verb ("may safely take") amplifies risk', start: 0.842 },
    { label: 'Consumer health advice detected', sub: 'Intended for general public, no clinician review', start: 0.848 },
    { label: 'Source verification required', sub: 'Cross-checking against trusted authorities', start: 0.854 },
  ];
  return (
    <div className="mt-6 space-y-2.5">
      {chips.map((chip, idx) => (
        <DetectionChip
          key={chip.label}
          chip={chip}
          index={idx}
          scrollYProgress={scrollYProgress}
          scrollStart={chip.start}
        />
      ))}
    </div>
  );
}

/* Scene7Scanner — a thin red beam that sweeps top-to-bottom through
   PostStage's editor body, then PAUSES on the dangerous sentence as
   the "lock-on" moment. Positioned via DOM lookup on the body. */
function Scene7Scanner({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const [bounds, setBounds] = useState<{ left: number; top: number; width: number; height: number; dangerTop: number; dangerHeight: number } | null>(null);
  useEffect(() => {
    const update = () => {
      const body = document.querySelector('[data-cinema-body="draft"]') as HTMLElement | null;
      const dose = document.querySelector('[data-cinema-body="draft"] [data-risky-dose]') as HTMLElement | null;
      if (!body || !dose) {
        setBounds(null);
        return;
      }
      const b = body.getBoundingClientRect();
      const d = dose.getBoundingClientRect();
      // Find the paragraph containing the dose (the "dangerous sentence")
      let el: HTMLElement | null = dose;
      while (el && el.tagName !== 'P') el = el.parentElement;
      const par = el ? el.getBoundingClientRect() : d;
      setBounds({
        left: b.left,
        top: b.top,
        width: b.width,
        height: b.height,
        dangerTop: par.top - b.top,
        dangerHeight: par.height,
      });
    };
    update();
    return scrollYProgress.on('change', update);
  }, [scrollYProgress]);

  // Phase A — scanner sweeps from 0 to the dangerous-sentence Y over
  // ds 0.798 → 0.822. Then Phase B — locks at the dangerous sentence
  // through ds 0.822 → 0.842. After that, scanner fades away.
  const sweepProgress = useTransform(scrollYProgress, [0.798, 0.822], [0, 1], { clamp: true, ease: easeInOut });
  const scannerOp = useTransform(scrollYProgress, [0.795, 0.800, 0.842, 0.850], [0, 1, 1, 0], { clamp: true, ease: [easeOut, linear, easeIn] });

  // Audio dispatch — fire scanner-lock once when the sweep completes
  // (ds 0.822) so the user hears the AI's "I see it" beat in lockstep
  // with the visual lock-on.
  const lockFiredRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsub = scrollYProgress.on('change', (v) => {
      if (!lockFiredRef.current && v >= 0.822 && v < 0.830) {
        lockFiredRef.current = true;
        try { window.dispatchEvent(new CustomEvent('cinema:scanner-lock')); } catch { /* no-op */ }
      }
      if (lockFiredRef.current && v < 0.815) {
        lockFiredRef.current = false;
      }
    });
    return unsub;
  }, [scrollYProgress]);
  // Scanner Y MUST be defined unconditionally (rules of hooks). Its
  // function closure reads `bounds` at compute time, so when bounds
  // is null we just return a default value the parent won't render.
  const scannerTop = useTransform(sweepProgress, (p) => {
    if (!bounds) return 0;
    const targetY = bounds.dangerTop + bounds.dangerHeight / 2;
    return bounds.top + p * targetY - 1;
  });

  if (!bounds) return null;
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed z-[36]"
      style={{
        left: bounds.left,
        width: bounds.width,
        top: scannerTop,
        height: 2,
        opacity: scannerOp,
        background: `linear-gradient(90deg, transparent, ${C.risk} 50%, transparent)`,
        boxShadow: `0 0 24px 4px ${C.riskGlow}`,
      }}
    />
  );
}

/* Scene7DangerHighlight — once the scanner locks on, a red underline
   draws left-to-right across the dangerous sentence, and a red box
   surrounds the specific "4,000 mg of ibuprofen" dose. */
function Scene7DangerHighlight({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const [bounds, setBounds] = useState<{ sentenceLeft: number; sentenceTop: number; sentenceWidth: number; sentenceHeight: number; doseLeft: number; doseTop: number; doseWidth: number; doseHeight: number } | null>(null);
  useEffect(() => {
    const update = () => {
      const dose = document.querySelector('[data-cinema-body="draft"] [data-risky-dose]') as HTMLElement | null;
      if (!dose) {
        setBounds(null);
        return;
      }
      let el: HTMLElement | null = dose;
      while (el && el.tagName !== 'P') el = el.parentElement;
      if (!el) {
        setBounds(null);
        return;
      }
      const sR = el.getBoundingClientRect();
      const dR = dose.getBoundingClientRect();
      setBounds({
        sentenceLeft: sR.left,
        sentenceTop: sR.top,
        sentenceWidth: sR.width,
        sentenceHeight: sR.height,
        doseLeft: dR.left,
        doseTop: dR.top,
        doseWidth: dR.width,
        doseHeight: dR.height,
      });
    };
    update();
    return scrollYProgress.on('change', update);
  }, [scrollYProgress]);

  // ─── THE SIGNATURE GESTURE — INK BLEEDS UP THROUGH THE PAPER ─────
  // Was: a thin solid red line + rectangle. Generic alert UI.
  // Now: red ink BLEEDS UPWARD from beneath the sentence, irregular
  // organic stain that radiates above and below. The document
  // itself appears to REJECT the falsehood. This is AssuredAI's
  // 200ms-recognition gesture — see InkBleed component.
  //
  // Two progress curves drive different parts of the bleed:
  //   bleedProgress  → ds 0.822 → 0.832 — the bleed soaks in from
  //                    bottom to full coverage over 10 ds
  //   doseProgress   → ds 0.826 → 0.832 — the dose-cloud pools
  //                    around the specific phrase 4ms after the
  //                    underline starts (sequential not parallel)
  const bleedProgress = useTransform(scrollYProgress, [0.822, 0.832], [0, 1], { clamp: true, ease: easeOut });
  const doseProgress = useTransform(scrollYProgress, [0.826, 0.834], [0, 1], { clamp: true, ease: easeOut });
  // All highlights stay visible through Scene 7 then fade with the
  // strikethrough takeover (Scene8BodyCorrection draws its own
  // strikethrough OVER this at ds 0.918+; we keep this until 0.916
  // so there's no flicker gap).
  const overallOp = useTransform(scrollYProgress, [0.820, 0.825, 0.916, 0.924], [0, 1, 1, 0], { clamp: true, ease: [easeOut, linear, easeIn] });

  // We need the LIVE progress values for the InkBleed component
  // (which takes a number prop, not a MotionValue). Subscribe with
  // state so React re-renders the SVG on scroll tick.
  const [bleedNow, setBleedNow] = useState(0);
  const [doseNow, setDoseNow] = useState(0);
  useEffect(() => {
    const u1 = bleedProgress.on('change', setBleedNow);
    const u2 = doseProgress.on('change', setDoseNow);
    setBleedNow(bleedProgress.get());
    setDoseNow(doseProgress.get());
    return () => { u1(); u2(); };
  }, [bleedProgress, doseProgress]);

  if (!bounds) return null;

  const BLEED_HEIGHT = 26; // 13px above + 13px below the sentence baseline
  const DOSE_HEIGHT = bounds.doseHeight + 18; // padding for the bleed-cloud

  return (
    <motion.div aria-hidden="true" className="pointer-events-none fixed z-[35]" style={{ opacity: overallOp, top: 0, left: 0 }}>
      {/* INK BLEED across the dangerous sentence — the brand's
          signature gesture. The bleed appears to soak UP through
          the paper from underneath. */}
      <div
        style={{
          position: 'absolute',
          left: bounds.sentenceLeft,
          top: bounds.sentenceTop + bounds.sentenceHeight - BLEED_HEIGHT / 2 - 1,
          width: bounds.sentenceWidth,
          height: BLEED_HEIGHT,
        }}
      >
        <InkBleed
          width={bounds.sentenceWidth}
          height={BLEED_HEIGHT}
          progress={bleedNow}
          variant="underline"
        />
      </div>
      {/* DOSE BLEED — tighter pool around the specific dangerous
          phrase ("4,000 mg of ibuprofen"). The AI zeros in from
          the whole sentence to the lethal claim. */}
      <div
        style={{
          position: 'absolute',
          left: bounds.doseLeft - 8,
          top: bounds.doseTop - 9,
          width: bounds.doseWidth + 16,
          height: DOSE_HEIGHT,
        }}
      >
        <InkBleed
          width={bounds.doseWidth + 16}
          height={DOSE_HEIGHT}
          progress={doseNow}
          variant="circle"
        />
      </div>
    </motion.div>
  );
}

/* Scene7Flag — a red exclamation marker materializes next to the
   dangerous dose after the highlight lands. Anchors the fix panel. */
function Scene7Flag({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const [bounds, setBounds] = useState<{ left: number; top: number; height: number } | null>(null);
  useEffect(() => {
    const update = () => {
      const dose = document.querySelector('[data-cinema-body="draft"] [data-risky-dose]') as HTMLElement | null;
      if (!dose) {
        setBounds(null);
        return;
      }
      const r = dose.getBoundingClientRect();
      setBounds({ left: r.right + 6, top: r.top + r.height / 2 - 12, height: r.height });
    };
    update();
    return scrollYProgress.on('change', update);
  }, [scrollYProgress]);

  // ─── The PUNCH ──────────────────────────────────────────────────────
  // The flag is the cinema's climax beat. After chip 1 fires (ds 0.832),
  // there's a HELD SILENCE (ds 0.832-0.838) where nothing else happens —
  // a deliberate pause. Then the flag PUNCHES in hard:
  //   ds 0.838 → 0.839   instant appearance (1ms snap)
  //   ds 0.838 → 0.842   bright white halo flash (peak attention burst)
  //   ds 0.842 → 0.854   settle into pulse rhythm (the "we caught it" beacon)
  //   ds 0.918 → 0.924   fade out as Scene 7 wraps (was 0.862-0.866 —
  //                      extended to align with the longer climax window)
  const op = useTransform(scrollYProgress, [0.838, 0.839, 0.918, 0.924], [0, 1, 1, 0], { clamp: true, ease: [easeOut, linear, easeIn] });
  // Punch scale — overshoots past 1.0 then settles for the "snap-in" feel
  const punchScale = useTransform(scrollYProgress, [0.838, 0.839, 0.842], [0, 1.4, 1], { clamp: true, ease: [easeOut, easeIn] });
  // Pulse rhythm — three soft pulses after the punch
  const pulse = useTransform(
    scrollYProgress,
    [0.844, 0.846, 0.848, 0.850, 0.852, 0.854],
    [1, 1.12, 1, 1.08, 1, 1.04],
    { clamp: true, ease: easeInOut },
  );
  const finalScale = useTransform([punchScale, pulse], (values) => {
    const [s, p] = values as [number, number];
    return s * p;
  });
  // White halo flash — the camera-flash burst at punch moment
  const flashOp = useTransform(scrollYProgress, [0.838, 0.839, 0.842], [0, 1, 0], { clamp: true, ease: [linear, easeOut] });
  const flashScale = useTransform(scrollYProgress, [0.838, 0.842], [0.8, 2.4], { clamp: true, ease: easeOut });

  // Audio dispatch — fire flag-punch at the EXACT moment of the snap
  // (ds 0.839). Synchronized with the halo flash + scale punch so
  // visuals and audio land on the same beat.
  const punchFiredRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsub = scrollYProgress.on('change', (v) => {
      if (!punchFiredRef.current && v >= 0.839 && v < 0.845) {
        punchFiredRef.current = true;
        try { window.dispatchEvent(new CustomEvent('cinema:flag-punch')); } catch { /* no-op */ }
      }
      if (punchFiredRef.current && v < 0.833) {
        punchFiredRef.current = false;
      }
    });
    return unsub;
  }, [scrollYProgress]);

  if (!bounds) return null;
  return (
    <>
      {/* Camera-flash white halo — peaks at punch moment, dissolves outward */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed z-[36]"
        style={{
          left: bounds.left - 14,
          top: bounds.top - 14,
          width: 52,
          height: 52,
          borderRadius: 999,
          backgroundColor: '#FFFFFF',
          opacity: flashOp,
          scale: flashScale,
          filter: 'blur(8px)',
        }}
      />
      {/* The flag itself — red disc with `!` */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed z-[37] flex items-center justify-center"
        style={{
          left: bounds.left,
          top: bounds.top,
          width: 24,
          height: 24,
          borderRadius: 999,
          backgroundColor: C.risk,
          boxShadow: `0 0 0 4px rgba(255,74,74,0.22), 0 4px 14px -2px rgba(255,74,74,0.45)`,
          opacity: op,
          scale: finalScale,
        }}
      >
        <span style={{ color: '#FFFFFF', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontWeight: 800, fontSize: 14, lineHeight: 1 }}>!</span>
      </motion.div>
    </>
  );
}

/* Scene7FixPanel — unfurls from near the dangerous sentence with the
   auto-correct suggestion. Includes the issue, what the source says,
   the AI's suggested replacement, an Accept Fix button that pulses
   then "presses itself" as the cinema transitions to Scene 8, AND
   the ExpertAI credit (P3) as the footer attribution. */
function Scene7FixPanel({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    const update = () => {
      const dose = document.querySelector('[data-cinema-body="draft"] [data-risky-dose]') as HTMLElement | null;
      if (!dose) {
        setAnchor(null);
        return;
      }
      const r = dose.getBoundingClientRect();
      // Anchor: just below the dangerous sentence, slightly indented
      setAnchor({ left: r.left - 8, top: r.bottom + 12 });
    };
    update();
    return scrollYProgress.on('change', update);
  }, [scrollYProgress]);

  // Panel unfurls ds 0.872 → 0.880 (after the sources cascade
  // settles — sources finish verifying around ds 0.886). The panel
  // is the cinema's RESOLUTION moment: "we caught it AND we know
  // what to do." Earlier draft squeezed this entire climax into
  // ds 0.852-0.870 (18 ds total) which was too fast for the user
  // to read the rows before the Accept Fix self-pressed. Now the
  // panel unfurl gets 8 ds, the rows type in over 12 ds, and the
  // Accept Fix gets a real 8-ds anticipation pulse before pressing
  // itself. Total climax window: ds 0.872-0.916 = 44 ds (was 18 ds).
  const panelOp = useTransform(scrollYProgress, [0.872, 0.880, 0.916, 0.924], [0, 1, 1, 0], { clamp: true, ease: [easeOut, linear, easeIn] });
  const panelScale = useTransform(scrollYProgress, [0.872, 0.880], [0.92, 1], { clamp: true, ease: easeOut });
  const panelY = useTransform(scrollYProgress, [0.872, 0.880], [-8, 0], { clamp: true, ease: easeOut });
  // Row reveal — each row fades in 4ms after the previous one
  // (was 2ms each, way too fast to perceive). 12 ds total for the
  // three rows reads as the AI "writing the report" in real time
  // — the user can ACTUALLY READ each row as it appears.
  const row1Op = useTransform(scrollYProgress, [0.881, 0.885], [0, 1], { clamp: true, ease: easeOut });
  const row1Y = useTransform(scrollYProgress, [0.881, 0.885], [4, 0], { clamp: true, ease: easeOut });
  const row2Op = useTransform(scrollYProgress, [0.885, 0.889], [0, 1], { clamp: true, ease: easeOut });
  const row2Y = useTransform(scrollYProgress, [0.885, 0.889], [4, 0], { clamp: true, ease: easeOut });
  const row3Op = useTransform(scrollYProgress, [0.889, 0.893], [0, 1], { clamp: true, ease: easeOut });
  const row3Y = useTransform(scrollYProgress, [0.889, 0.893], [4, 0], { clamp: true, ease: easeOut });
  // Accept Fix button reveals after rows finish typing, pulses for
  // a REAL anticipation beat (8 ds, was 2 ds = 1 frame), then
  // "presses itself" at ds 0.901 — the bridge into Scene 8. The
  // pulse → press is the cinematic peak: the resolution everyone
  // saw coming, finally happening. Audit found the old 2-ds pulse
  // was invisible at natural scroll speed.
  const acceptOp = useTransform(scrollYProgress, [0.893, 0.897], [0, 1], { clamp: true, ease: easeOut });
  const acceptPress = useTransform(scrollYProgress, [0.901, 0.904, 0.908], [1, 0.94, 1], { clamp: true, ease: [easeIn, easeOut] });
  const acceptPulse = useTransform(scrollYProgress, [0.897, 0.901], [1.05, 1], { clamp: true, ease: easeInOut });
  const acceptScale = useTransform([acceptPress, acceptPulse], (values) => {
    const [p, q] = values as [number, number];
    return p * q;
  });
  // P3 credit fades in last, AFTER the accept-press, so the brand
  // attribution lands at peak trust (the resolution moment).
  const creditOp = useTransform(scrollYProgress, [0.908, 0.912], [0, 1], { clamp: true, ease: easeOut });

  // Audio dispatch — fire accept-press at the EXACT moment the
  // button starts compressing (ds 0.901). The click + affirming
  // low note land in lockstep with the visual press.
  const acceptFiredRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsub = scrollYProgress.on('change', (v) => {
      if (!acceptFiredRef.current && v >= 0.901 && v < 0.910) {
        acceptFiredRef.current = true;
        try { window.dispatchEvent(new CustomEvent('cinema:accept-press')); } catch { /* no-op */ }
      }
      if (acceptFiredRef.current && v < 0.895) {
        acceptFiredRef.current = false;
      }
    });
    return unsub;
  }, [scrollYProgress]);

  if (!anchor) return null;
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed z-[38]"
      style={{
        left: anchor.left,
        top: anchor.top,
        width: 380,
        opacity: panelOp,
        scale: panelScale,
        y: panelY,
        transformOrigin: 'top left',
      }}
    >
      <div
        className="overflow-hidden rounded-lg"
        style={{
          backgroundColor: C.paper,
          border: `1px solid ${C.paperLine}`,
          boxShadow: '0 24px 48px -12px rgba(0,0,0,0.45), 0 4px 12px -4px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Header — red strip with the flag identity */}
        <div
          className="flex items-center gap-2 border-b px-3.5 py-2"
          style={{ borderColor: C.paperLine, backgroundColor: 'rgba(255,74,74,0.06)' }}
        >
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: C.risk, lineHeight: 1 }}
          >
            !
          </span>
          <span
            className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: C.risk, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
          >
            Critical · Medical dosage
          </span>
        </div>
        {/* Body rows — type in sequentially, like the AI is writing
            the report in real time. Each row appears 2ms after the
            previous one. */}
        <div className="px-3.5 py-3 space-y-2.5">
          <motion.div style={{ opacity: row1Op, y: row1Y }}>
            <FixPanelRow label="Issue" value="Exceeds OTC daily maximum" />
          </motion.div>
          <motion.div style={{ opacity: row2Op, y: row2Y }}>
            <FixPanelRow
              label="What FDA says"
              value="Maximum OTC daily dose for ibuprofen: 1,200 mg"
            />
          </motion.div>
          <motion.div style={{ opacity: row3Op, y: row3Y }}>
            <FixPanelRow
              label="AI suggestion"
              value={(
                <span>
                  Replace with: <span style={{ color: C.safe, fontWeight: 600 }}>&ldquo;Up to 1,200 mg/day&rdquo;</span>
                </span>
              )}
            />
          </motion.div>
        </div>
        {/* Accept Fix button — appears after rows finish, pulses, then presses itself */}
        <motion.div
          className="border-t px-3.5 py-2.5"
          style={{ borderColor: C.paperLine, opacity: acceptOp }}
        >
          <motion.div
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold text-white"
            style={{
              backgroundColor: C.safe,
              fontFamily: 'var(--font-geist-sans)',
              scale: acceptScale,
              transformOrigin: 'left center',
              boxShadow: '0 4px 12px -4px rgba(20,88,58,0.5)',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Accept Fix
          </motion.div>
        </motion.div>
        {/* ExpertAI credit (P3) — attribution footer, fades in last */}
        <motion.div
          className="border-t px-3.5 py-2"
          style={{ borderColor: C.paperLine, backgroundColor: 'rgba(22,22,26,0.025)', opacity: creditOp }}
        >
          <div
            className="text-[9px] uppercase tracking-[0.18em]"
            style={{ color: C.paperTextMuted, fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', fontWeight: 600 }}
          >
            Suggestion generated by ExpertAI™
          </div>
          <div
            className="mt-0.5 text-[9.5px]"
            style={{ color: C.paperTextFaint, fontFamily: 'var(--font-geist-sans)' }}
          >
            Hallucination-proof · Fail-proof · Audit-grade
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function FixPanelRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-[9px] uppercase tracking-[0.18em]"
        style={{ color: C.paperTextFaint, fontFamily: 'var(--font-geist-sans)', fontWeight: 600 }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 text-[12px] leading-[1.45]"
        style={{ color: C.paperText, fontFamily: 'var(--font-geist-sans)' }}
      >
        {value}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Scene8BodyCorrection — the article EDITS ITSELF.
   When the Accept Fix button self-presses, the dangerous sentence in
   the body strikes through, dims to gray, and the corrected text fades
   in directly below it in a green inline-suggestion style. This is the
   track-changes language a writer uses in Google Docs / Notion / a PR
   review — familiar, trustworthy, surgical. The user SEES the edit
   happen on the page they've been reading.

   Timing (the climax bridge from Scene 7 → Scene 8) — REVISED to
   give every beat readable screen time (was crammed into 12 ds):
     ds 0.901 → 0.906   strikethrough line draws left-to-right across
                        the dangerous sentence (after Accept Fix's
                        self-press at ds 0.901 — clean cause-and-effect)
     ds 0.903 → 0.910   original sentence dims to gray
     ds 0.905 → 0.912   inline ✓ check materializes, container slides in
     ds 0.908 → 0.940   corrected text types in char-by-char (~32 ds
                        for 123 chars — readable typewriter pace)
     ds 0.940 → 0.978   correction stays visible through all of Scene 8
     ds 0.978 → 0.988   fades out with PostStage as Scene 9 takes over
   ════════════════════════════════════════════════════════════════════ */

const SCENE8_CORRECTED_TEXT =
  'Follow the product label. Do not exceed 1,200 mg (OTC maximum) in a 24-hour period for adults unless directed by a physician.';

/* Scene8InkStrikethrough — wraps the InkBleed component in a
   motion.div that reads MotionValues. The InkBleed itself needs a
   plain number progress, so we subscribe with state inside this
   bridge component. */
function Scene8InkStrikethrough({
  bounds,
  progress,
  opacity,
}: {
  bounds: { left: number; top: number; width: number; height: number };
  progress: MotionValue<number>;
  opacity: MotionValue<number>;
}) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const u = progress.on('change', setP);
    setP(progress.get());
    return u;
  }, [progress]);
  const STRIKE_HEIGHT = 22;
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed z-[36]"
      style={{
        left: bounds.left,
        top: bounds.top + bounds.height / 2 - STRIKE_HEIGHT / 2,
        width: bounds.width,
        height: STRIKE_HEIGHT,
        opacity,
      }}
    >
      <InkBleed
        width={bounds.width}
        height={STRIKE_HEIGHT}
        progress={p}
        variant="strike"
      />
    </motion.div>
  );
}

function Scene8BodyCorrection({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Track the dangerous sentence's bounding box via DOM lookup, same
  // pattern as RedPencilCircle and Scene7FixPanel. Re-measures on
  // every scroll tick so the overlay tracks the editor as PostStage
  // morphs/slides.
  const [bounds, setBounds] = useState<{ left: number; top: number; width: number; height: number; bottom: number } | null>(null);
  useEffect(() => {
    const update = () => {
      const dose = document.querySelector('[data-cinema-body="draft"] [data-risky-dose]') as HTMLElement | null;
      if (!dose) {
        setBounds(null);
        return;
      }
      let el: HTMLElement | null = dose;
      while (el && el.tagName !== 'P') el = el.parentElement;
      if (!el) {
        setBounds(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setBounds({ left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom });
    };
    update();
    return scrollYProgress.on('change', update);
  }, [scrollYProgress]);

  // Strikethrough line draws across the dangerous sentence —
  // triggered by Accept Fix self-press at ds 0.901. Stretched from
  // 4 ds to 5 ds so the draw is perceivable as a deliberate gesture.
  const strikeScale = useTransform(scrollYProgress, [0.901, 0.906], [0, 1], { clamp: true, ease: easeOut });
  // CLOSING-POLISH: strike/dim/correction fade out at ds 0.946-0.954
  // alongside PostStage so the article surface goes dark cleanly.
  const strikeOp = useTransform(scrollYProgress, [0.901, 0.903, 0.946, 0.954], [0, 1, 1, 0], { clamp: true, ease: [easeOut, linear, easeIn] });
  // Gray dimmer overlay fades in over the original sentence —
  // slight stagger after strikethrough so the eye registers them
  // as two distinct events (mark, then dim) not one mush. Fade-out
  // starts BEFORE PostStage so the dim doesn't linger as a ghost
  // rectangle when the editor itself fades away.
  const dimOp = useTransform(scrollYProgress, [0.903, 0.910, 0.946, 0.954], [0, 0.65, 0.65, 0], { clamp: true, ease: [easeOut, linear, easeIn] });
  // Corrected text container fades in from below the original —
  // a beat after the dim so the user reads "deleted" before "here's
  // what should be here."
  const correctionOp = useTransform(scrollYProgress, [0.905, 0.912, 0.946, 0.954], [0, 1, 1, 0], { clamp: true, ease: [easeOut, linear, easeIn] });
  const correctionY = useTransform(scrollYProgress, [0.905, 0.912], [4, 0], { clamp: true, ease: easeOut });
  // Character-by-character reveal of the corrected text — types in
  // over ds 0.908 → 0.940 like the AI is writing the replacement.
  // This is THE moment of resolution: the user watches the fix
  // appear word by word. Was 12 ds (way too fast for 123 chars =
  // 100 chars/sec, unreadable strobe); now 32 ds (~38 chars/sec at
  // natural scroll, which reads as deliberate AI-writing pace).
  const charCount = useTransform(scrollYProgress, [0.908, 0.940], [0, SCENE8_CORRECTED_TEXT.length], { clamp: true, ease: linear });
  const [typedChars, setTypedChars] = useState(0);
  const lastTypedRef = useRef(0);
  useEffect(() => {
    const sync = (v: number) => {
      const next = Math.max(0, Math.min(SCENE8_CORRECTED_TEXT.length, Math.round(v)));
      setTypedChars(next);
      // Audio: type-tick for each NEW character (matches cold-open
      // typewriter behavior). Skip spaces so the rhythm reads as
      // keystrokes not random clicks.
      if (next > lastTypedRef.current && typeof window !== 'undefined') {
        const lastChar = SCENE8_CORRECTED_TEXT[next - 1];
        if (lastChar && lastChar !== ' ') {
          try { window.dispatchEvent(new CustomEvent('cinema:type-tick')); } catch { /* no-op */ }
        }
      }
      lastTypedRef.current = next;
    };
    sync(charCount.get());
    return charCount.on('change', sync);
  }, [charCount]);

  if (!bounds) return null;
  // Position the correction directly below the dangerous sentence,
  // indented slightly to read as a sub-element / suggested edit.
  const correctionLeft = bounds.left;
  const correctionTop = bounds.bottom + 8;
  const correctionWidth = bounds.width;

  return (
    <>
      {/* Gray dimmer over the original sentence — desaturates the
          dangerous text so the eye reads it as "deleted / no longer
          authoritative". */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed z-[35]"
        style={{
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
          backgroundColor: C.paper,
          opacity: dimOp,
        }}
      />
      {/* Strikethrough — uses the SAME InkBleed gesture as the
          Scene 7 underline. Same brand mark, different placement
          (mid-line instead of underline). The deletion is the same
          act of editorial correction, signed with the same ink. */}
      <Scene8InkStrikethrough
        bounds={bounds}
        progress={strikeScale}
        opacity={strikeOp}
      />
      {/* Corrected sentence — appears directly below the original.
          Green ✓ inline indicator (the "AI suggestion accepted" mark),
          followed by the corrected text typing in char-by-char. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed z-[37] flex items-start gap-2 rounded-md"
        style={{
          left: correctionLeft,
          top: correctionTop,
          width: correctionWidth,
          opacity: correctionOp,
          y: correctionY,
          padding: '6px 10px',
          backgroundColor: 'rgba(61,220,151,0.08)',
          borderLeft: `2px solid ${C.safe}`,
        }}
      >
        {/* Inline accepted-suggestion check */}
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 14,
            height: 14,
            backgroundColor: C.safe,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        {/* Typed-in corrected text */}
        <span
          className="text-[14.5px] leading-[1.55]"
          style={{
            color: C.paperText,
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            flex: 1,
          }}
        >
          {SCENE8_CORRECTED_TEXT.slice(0, typedChars)}
          {/* Mint accent on the corrected dose */}
          <span style={{ color: 'transparent' }}>
            {SCENE8_CORRECTED_TEXT.slice(typedChars)}
          </span>
        </span>
      </motion.div>
    </>
  );
}

function SourcesBar({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // SOURCES-FIX (2026-05-19): full rebuild of the trusted-sources
  // footer. Previous version had three problems Mo flagged:
  //   1. Translucent background bled article text through the bar
  //   2. Decorative icons inside source badges (HC star, WHO compass)
  //      collided with state indicators at small size
  //   3. Label text was 10.5px — below readable threshold
  // New design: opaque dark surface, uniform monospace wordmarks,
  // standardized state indicators (pending / spinner / verified
  // check) at a CONSISTENT corner position for every source.
  const barOp = useTransform(scrollYProgress, [0.848, 0.854], [0, 1], {
    clamp: true,
    ease: easeOut,
  });
  return (
    <motion.div
      className="mt-5 flex items-center gap-7 rounded-xl"
      style={{
        // Opaque dark surface — no bleed-through. Was C.panel
        // (translucent over light editor); now near-black with a
        // clear hairline border to read as a distinct surface.
        backgroundColor: 'rgba(12,12,14,0.96)',
        border: `1px solid ${C.hairlineStrong}`,
        boxShadow: '0 18px 36px -16px rgba(0,0,0,0.6)',
        opacity: barOp,
        padding: '14px 20px',
      }}
    >
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.62)',
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          flexShrink: 0,
        }}
      >
        Verifying against trusted sources
      </span>
      <div className="flex items-center" style={{ gap: 18 }}>
        {SOURCES.map((s, i) => (
          <SourceCheck
            key={s.id}
            source={s}
            index={i}
            scrollYProgress={scrollYProgress}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* SourceCheck — each source goes through THREE visible states:
     1. Pending (gray, no check)
     2. Checking (spinner ring rotates briefly)
     3. Verified (green check appears, source pill brightens)
   Each source's window is offset so they tick on in sequence, reading
   as live verification rather than a static list.
*/
function SourceCheck({
  source,
  index,
  scrollYProgress,
}: {
  source: Source;
  index: number;
  scrollYProgress: MotionValue<number>;
}) {
  // 5 sources, sequential ticks across ds 0.856 → 0.880. ~6ms each
  // (was 5ms). The slightly slower cadence gives the eye time to
  // register each source's verification mark land instead of
  // strobing through them too fast. Starts AFTER the SourcesBar
  // chrome has finished fading in (was 0.828 → now 0.856 to clear
  // the new bar entry at 0.848-0.854 + a 2-unit settling beat).
  const t0 = 0.856 + index * 0.006;
  // Pill brightens as it enters checking state, then full brightness when verified.
  const pillOp = useTransform(scrollYProgress, [t0, t0 + 0.003, t0 + 0.006], [0.35, 0.7, 1], {
    clamp: true,
    ease: easeOut,
  });
  // Spinner shows during the checking phase (~2ms), then fades away.
  const spinnerOp = useTransform(scrollYProgress, [t0, t0 + 0.001, t0 + 0.004, t0 + 0.006], [0, 1, 1, 0], {
    clamp: true,
    ease: [easeOut, linear, easeIn],
  });
  // Check appears at the end (verified state).
  const checkOp = useTransform(scrollYProgress, [t0 + 0.004, t0 + 0.006], [0, 1], {
    clamp: true,
    ease: easeOut,
  });
  const checkScale = useTransform(scrollYProgress, [t0 + 0.004, t0 + 0.008], [0.4, 1], {
    clamp: true,
    ease: easeOut,
  });
  // Audio dispatch — fire source-verify the moment the green check
  // first appears (ds t0+0.005) so the ping syncs to the visible tick.
  const verifyFiredRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fireAt = t0 + 0.005;
    const unsub = scrollYProgress.on('change', (v) => {
      if (!verifyFiredRef.current && v >= fireAt && v < fireAt + 0.010) {
        verifyFiredRef.current = true;
        try { window.dispatchEvent(new CustomEvent('cinema:source-verify')); } catch { /* no-op */ }
      }
      if (verifyFiredRef.current && v < fireAt - 0.010) {
        verifyFiredRef.current = false;
      }
    });
    return unsub;
  }, [scrollYProgress, t0]);
  return (
    // SOURCES-FIX: relative container so state indicator can pin to
    // the TOP-RIGHT corner of the source wordmark. Was inline-flex
    // gap-1.5 which put the check NEXT TO the badge (creating
    // alignment inconsistencies and competing with the spinner that
    // was at -right-1 -top-1 — two indicators in two places).
    // Single consistent state-badge position now.
    <div className="relative inline-block">
      <motion.div style={{ opacity: pillOp }}>
        <SourceMark source={source} />
      </motion.div>
      {/* Spinner ring — visible while "checking". Centered over the
          state-badge slot at top-right corner of the wordmark. */}
      <motion.svg
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: -6,
          top: -6,
          width: 16,
          height: 16,
          opacity: spinnerOp,
          pointerEvents: 'none',
        }}
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="9" fill="rgba(12,12,14,1)" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
        <motion.path
          d="M12 3 A9 9 0 0 1 21 12"
          fill="none"
          stroke={C.risk}
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: 'center' }}
        />
      </motion.svg>
      {/* Green check — pinned to the SAME corner the spinner was in,
          so the eye sees a single state-slot transitioning from
          checking → verified rather than two icons jumping around. */}
      <motion.div
        aria-hidden="true"
        className="flex items-center justify-center rounded-full"
        style={{
          position: 'absolute',
          right: -6,
          top: -6,
          width: 16,
          height: 16,
          backgroundColor: C.safe,
          boxShadow: '0 0 0 2px rgba(12,12,14,1)',
          opacity: checkOp,
          scale: checkScale,
          pointerEvents: 'none',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </motion.div>
    </div>
  );
}

function DetectionChip({
  chip,
  index,
  scrollYProgress,
  scrollStart,
}: {
  chip: { label: string; sub: string; kind?: 'risk' };
  index: number;
  scrollYProgress: MotionValue<number>;
  scrollStart: number;
}) {
  const isRisk = chip.kind === 'risk';
  // Each chip fires at its assigned scrollStart with a snap entry + glow.
  const t0 = scrollStart;
  const op = useTransform(scrollYProgress, [t0, t0 + 0.005], [0, 1], {
    clamp: true,
    ease: easeOut,
  });
  // Each chip slides in from the LEFT with a punch.
  const x = useTransform(scrollYProgress, [t0, t0 + 0.008], [-18, 0], {
    clamp: true,
    ease: easeOut,
  });
  // Brief glow pulse on arrival (extra visual weight for the first chip).
  const glowOp = useTransform(scrollYProgress, [t0, t0 + 0.002, t0 + 0.012], [0, 1, 0], {
    clamp: true,
    ease: easeInOut,
  });
  // Audio dispatch — fire chip-arrive when the chip first appears.
  // Each chip gets a descending pitch (chip 0 = highest, chip 3 =
  // lowest) so the cascade reads as an arpeggio. Lead chip (the
  // risk one, kind === 'risk') also gets a low body in the synth.
  const chipFiredRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsub = scrollYProgress.on('change', (v) => {
      if (!chipFiredRef.current && v >= t0 && v < t0 + 0.012) {
        chipFiredRef.current = true;
        try {
          window.dispatchEvent(new CustomEvent('cinema:chip-arrive', {
            detail: { index, isLead: isRisk },
          }));
        } catch { /* no-op */ }
      }
      if (chipFiredRef.current && v < t0 - 0.010) {
        chipFiredRef.current = false;
      }
    });
    return unsub;
  }, [scrollYProgress, t0, index, isRisk]);
  return (
    <motion.div
      className="relative flex items-start gap-3 rounded-xl p-3"
      style={{
        backgroundColor: isRisk ? 'rgba(255,74,74,0.06)' : C.panel,
        border: `1px solid ${isRisk ? C.risk : C.hairline}`,
        opacity: op,
        x,
      }}
    >
      {/* Brief arrival glow */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          opacity: glowOp,
          boxShadow: isRisk
            ? '0 0 0 1.5px rgba(255,74,74,0.45), 0 0 16px 4px rgba(255,74,74,0.25)'
            : '0 0 0 1.5px rgba(255,255,255,0.18), 0 0 16px 4px rgba(255,255,255,0.08)',
        }}
      />
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{
          border: `1.5px solid ${isRisk ? C.risk : C.hairlineStrong}`,
          backgroundColor: isRisk ? 'rgba(255,74,74,0.08)' : 'transparent',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            fill="none"
            stroke={isRisk ? C.risk : C.textMuted}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="12" y1="9" x2="12" y2="13" stroke={isRisk ? C.risk : C.textMuted} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="17" r="1" fill={isRisk ? C.risk : C.textMuted} />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-[12.5px] font-semibold leading-tight"
          style={{ color: isRisk ? C.risk : C.text, fontFamily: 'var(--font-geist-sans)' }}
        >
          {chip.label}
        </div>
        <div
          className="mt-0.5 text-[11px] leading-[1.4]"
          style={{ color: C.textMuted, fontFamily: 'var(--font-geist-sans)' }}
        >
          {chip.sub}
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 8 — Safe Publish
   Same editor frame, but the risky sentence is struck through (red box)
   and the corrected version appears (green box). Sidebar swaps to
   "Verified Against" with green checkmarks. Pipeline at bottom shows all
   green steps including "Safe to publish."
   ════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════════
   Scene8DiffStrip — replaces Scene 8's verbose left column.
   Previously the left column repeated the fix-panel content from Scene 7
   (the 1,200 mg recommendation, the brand-virtue bullets). After the
   user has watched the AI catch + fix the dangerous claim in Scene 7,
   re-explaining it in Scene 8 reads as a lecture, not a payoff.
   This strip shows the TRANSFORMATION the cinema just delivered:
   four BEFORE → AFTER rows that animate in sequentially with a tight
   eyebrow and headline. New information, not a repeat.
   ════════════════════════════════════════════════════════════════════ */

function Scene8DiffStrip({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Scene 8 fades in ds 0.942 → 0.950 (after Scene 7's body correction
  // typewriter finishes at ds 0.940). The strip content starts AFTER
  // the fade-in completes so the diff lands as a discrete reveal.
  //   ds 0.950 → 0.955   Eyebrow "BEFORE → AFTER" appears
  //   ds 0.953 → 0.960   Headline "Ready to publish." lands
  //   ds 0.960 → 0.980   Four rows cascade (5ms per row, was 4ms)
  //   ds 0.980 → 0.985   ALL ROWS HOLD — user sees complete matrix
  // Audit found the old timing (0.879→0.901) was so compressed the
  // user never registered the complete "Before → After" matrix
  // before Scene 8 was already fading. Now there's a real settle
  // beat where the resolution is FULLY readable.
  const eyebrowOp = useTransform(scrollYProgress, [0.950, 0.955], [0, 1], { clamp: true, ease: easeOut });
  const headlineOp = useTransform(scrollYProgress, [0.953, 0.960], [0, 1], { clamp: true, ease: easeOut });
  const headlineY = useTransform(scrollYProgress, [0.953, 0.960], [8, 0], { clamp: true, ease: easeOut });

  const rows: { label: string; before: string; after: string }[] = [
    { label: 'Risk', before: 'Critical', after: 'No risk identified' },
    { label: 'Status', before: 'Needs review', after: 'Approved to publish' },
    { label: 'Dose claim', before: '4,000 mg', after: '1,200 mg' },
    { label: 'Sources', before: '0 verified', after: '5 verified' },
  ];

  return (
    <div>
      <motion.p
        className="text-[11px] uppercase tracking-[0.26em]"
        style={{ color: C.safe, fontFamily: 'var(--font-geist-sans)', fontWeight: 700, opacity: eyebrowOp }}
      >
        Before → After
      </motion.p>
      <motion.h3
        className="mt-3 leading-[1.05]"
        style={{
          color: C.text,
          fontFamily: 'var(--font-geist-sans)',
          fontWeight: 700,
          fontSize: 'clamp(28px, 2.9vw, 44px)',
          letterSpacing: '-0.02em',
          opacity: headlineOp,
          y: headlineY,
        }}
      >
        Ready to publish.
      </motion.h3>
      <motion.p
        className="mt-2 text-[13px] leading-[1.5]"
        style={{ color: C.textMuted, fontFamily: 'var(--font-geist-sans)', opacity: headlineOp }}
      >
        The article in one second — neutralized.
      </motion.p>
      <div className="mt-6 space-y-3">
        {rows.map((row, i) => (
          <DiffRow
            key={row.label}
            label={row.label}
            before={row.before}
            after={row.after}
            scrollYProgress={scrollYProgress}
            scrollStart={0.960 + i * 0.005}
          />
        ))}
      </div>
    </div>
  );
}

function DiffRow({
  label,
  before,
  after,
  scrollYProgress,
  scrollStart,
}: {
  label: string;
  before: string;
  after: string;
  scrollYProgress: MotionValue<number>;
  scrollStart: number;
}) {
  // Each row: BEFORE chip → arrow draws → AFTER chip
  //   0 → 1ms   BEFORE chip fades in (left side, red)
  //   1 → 2ms   Arrow draws left to right
  //   2 → 3ms   AFTER chip fades in (right side, green)
  const beforeOp = useTransform(scrollYProgress, [scrollStart, scrollStart + 0.001], [0, 1], { clamp: true, ease: easeOut });
  const beforeX = useTransform(scrollYProgress, [scrollStart, scrollStart + 0.002], [-6, 0], { clamp: true, ease: easeOut });
  const arrowProgress = useTransform(scrollYProgress, [scrollStart + 0.001, scrollStart + 0.002], [0, 1], { clamp: true, ease: easeOut });
  const afterOp = useTransform(scrollYProgress, [scrollStart + 0.002, scrollStart + 0.003], [0, 1], { clamp: true, ease: easeOut });
  const afterX = useTransform(scrollYProgress, [scrollStart + 0.002, scrollStart + 0.004], [6, 0], { clamp: true, ease: easeOut });

  return (
    <div className="space-y-1">
      {/* Label */}
      <div
        className="text-[9.5px] uppercase tracking-[0.18em]"
        style={{ color: C.textFaint, fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', fontWeight: 600 }}
      >
        {label}
      </div>
      {/* Before → After row */}
      <div className="flex items-center gap-2.5">
        {/* BEFORE chip */}
        <motion.div
          className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-[11.5px] font-semibold"
          style={{
            backgroundColor: 'rgba(255,74,74,0.07)',
            border: `1px solid rgba(255,74,74,0.25)`,
            color: C.risk,
            fontFamily: 'var(--font-geist-sans)',
            opacity: beforeOp,
            x: beforeX,
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: C.risk, flexShrink: 0 }}
          />
          <span className="truncate">{before}</span>
        </motion.div>
        {/* Arrow — line draws left-to-right then arrowhead pops in */}
        <div className="relative flex h-px items-center" style={{ width: 28, flexShrink: 0 }}>
          <motion.div
            className="h-px origin-left"
            style={{
              width: '100%',
              backgroundColor: C.textMuted,
              scaleX: arrowProgress,
            }}
          />
          <motion.svg
            className="absolute -right-px"
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.textMuted}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: afterOp }}
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </motion.svg>
        </div>
        {/* AFTER chip */}
        <motion.div
          className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-[11.5px] font-semibold"
          style={{
            backgroundColor: 'rgba(61,220,151,0.10)',
            border: `1px solid rgba(61,220,151,0.32)`,
            color: C.safe,
            fontFamily: 'var(--font-geist-sans)',
            opacity: afterOp,
            x: afterX,
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: C.safe, flexShrink: 0 }}
          />
          <span className="truncate">{after}</span>
        </motion.div>
      </div>
    </div>
  );
}

function Scene8SafePublish({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // CLOSING-POLISH (2026-05-19): Scene 8 fade-in pulled earlier and
  // fade-out aligned with PostStage so both exit together UNDER the
  // decision-pause overlay. Sequence:
  //   ds 0.935 → 0.942  Scene 8 fades in (right after correction)
  //   ds 0.942 → 0.948  Brief hold while DecisionPause begins
  //   ds 0.948 → 0.956  Scene 8 fades OUT under decision overlay
  // Together with PostStage exit, the dark stage is clean by 0.957.
  const opacity = useTransform(
    scrollYProgress,
    [0.935, 0.942, 0.948, 0.956],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const slideY = useTransform(scrollYProgress, [0.942, 0.962], [22, 0], {
    clamp: true,
    ease: easeOut,
  });
  return (
    <motion.div
      className="absolute inset-0 z-[22] flex items-center justify-center px-6"
      style={{ opacity }}
    >
      <motion.div
        className="mx-auto grid w-full max-w-[1320px] grid-cols-12 gap-6"
        style={{ y: slideY }}
      >
        <div className="col-span-3">
          <Scene8DiffStrip scrollYProgress={scrollYProgress} />
        </div>

        {/* No editor here — PostStage owns the editor through every
            scene. Scene 8's safe state appears INSIDE PostStage (sidebar
            crossfades to VerifiedSources, pipeline footer morphs to the
            safe variant). This column reserves the layout space so the
            left copy stays at the right position. */}
        <div
          aria-hidden="true"
          className="col-span-9 pointer-events-none"
          style={{ minHeight: 480 }}
        />
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 9 — Product Reveal
   Closing pitch — big tagline + three product pillars. This is where the
   buyer thinks "I need this."
   ════════════════════════════════════════════════════════════════════ */

/* Scene9UrgencyDevice — live decrementing cohort counter (T11).
   The audit identified the static "47 of 100" as decoration; this
   version uses useScarcityCounter to surface a real-time count that
   decrements over dwell time + flashes when it ticks. */
function Scene9UrgencyDevice({ ctaOp }: { ctaOp: MotionValue<number> }) {
  const { count, flashed } = useScarcityCounter();
  return (
    <motion.div
      className="mt-7 flex items-center justify-center gap-2.5"
      style={{
        opacity: ctaOp,
        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: C.risk,
          boxShadow: flashed ? `0 0 18px ${C.risk}` : `0 0 8px ${C.risk}`,
          display: 'inline-block',
          animation: 'urgencyPulse 1400ms ease-in-out infinite',
          transition: 'box-shadow 400ms ease-out',
        }}
        aria-hidden="true"
      />
      <span
        style={{
          fontSize: 10.5,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.62)',
          fontWeight: 600,
        }}
      >
        Q3 2026 cohort ·{' '}
        <span style={{ color: C.text, transition: 'color 400ms ease-out' }}>
          {count} of 100 spots remaining
        </span>
        {flashed && (
          <span
            style={{
              color: C.risk,
              marginLeft: 8,
              animation: 'urgencyPulse 700ms ease-out',
              fontWeight: 700,
            }}
            aria-live="polite"
          >
            ↓
          </span>
        )}
      </span>
    </motion.div>
  );
}

function Scene9Reveal({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // CLOSING-FIX-1 — Closing pitch now lands EARLY and HOLDS still.
  // Audit (2026-05-19): with the previous timing, the closing slide
  // never stopped moving. The cinema lift (raw 0.988→1.0) started
  // at the same time the closing pitch was still revealing (raw
  // 0.985-0.994), and Lenis momentum continued to interpolate
  // both — reading as "auto-scrolling up." There was zero hold
  // zone where the user could actually READ the closing pitch.
  //
  // New timing (ds, fed via downstreamProgress) — Scene 9 fully
  // CLOSING-POLISH v2 (2026-05-19) — Mo: "the last slide... shows
  // very awkwardly." Rewrite of the IN sequence so the closing
  // slide lands as a deliberate brand statement:
  //
  // 1. PostStage + Scene 8 + correction overlays fade OUT under the
  //    DecisionPause overlay (ds 0.946-0.956). The article disappears
  //    from view while the dim covers everything → no visual mush.
  // 2. DecisionPause exits at raw ~0.964 (ds ~0.957), revealing a
  //    CLEAN DARK STAGE.
  // 3. ds 0.957-0.961: 4-ds-unit DARK PAUSE (~60vh of scroll, ~1s).
  //    The cinema "breathes" before the brand statement begins.
  // 4. Scene 9 elements land in sequence with proper weighting:
  //      Brand mark: opacity + Y + subtle scale-in (confident arrival)
  //      Wordmark: opacity + Y drop (lands beneath the mark)
  //      Hairline: draws horizontally (scaleX)
  //      Four taglines: cascade in 2-ds offsets
  // 5. HOLD ZONE (ds 0.988-0.995) — every value clamped.
  // 6. Cinema lifts at raw 0.995-1.0 with easeInOut + content scale-
  //    down so it reads as graceful recession instead of a yank.
  //
  // ds 0.961 → 0.966   Envelope opacity (fades in the whole block)
  // ds 0.962 → 0.970   Brand mark: opacity + Y + scale-in
  // ds 0.968 → 0.974   "AssuredAI" wordmark settles
  // ds 0.974 → 0.979   Hairline draws horizontally
  // ds 0.977 → 0.982   Tagline 1: "Protect your clients."
  // ds 0.979 → 0.984   Tagline 2: "Protect your team."
  // ds 0.981 → 0.986   Tagline 3: "Protect your brand."
  // ds 0.984 → 0.989   Tagline 4: "Publish with confidence."
  // ds 0.989 → 0.995   HOLD — all clamped, motionless
  // raw 0.995 → 1.000  Cinema lifts -100vh (easeInOut)
  const opacity = useTransform(scrollYProgress, [0.961, 0.966], [0, 1], {
    clamp: true,
    ease: easeOut,
  });
  // Brand mark — opacity + Y + subtle scale-in for confident arrival.
  // Scale 0.92 → 1.0 reads as the mark "settling into focus" rather
  // than appearing flat. The Y drop is larger (24 → 0) for weight.
  const titleOp = useTransform(scrollYProgress, [0.962, 0.970], [0, 1], {
    clamp: true,
    ease: easeOut,
  });
  const titleY = useTransform(scrollYProgress, [0.962, 0.970], [24, 0], {
    clamp: true,
    ease: easeOut,
  });
  const titleScale = useTransform(scrollYProgress, [0.962, 0.974], [0.92, 1], {
    clamp: true,
    ease: easeOut,
  });
  // Wordmark — slight independent Y drop so it lands AFTER the
  // mark, not exactly with it. Reads as two-part arrival.
  const wordmarkOp = useTransform(scrollYProgress, [0.968, 0.974], [0, 1], {
    clamp: true,
    ease: easeOut,
  });
  const wordmarkY = useTransform(scrollYProgress, [0.968, 0.974], [12, 0], {
    clamp: true,
    ease: easeOut,
  });
  // Hairline divider — draws horizontally (scaleX 0 → 1)
  const dividerOp = useTransform(scrollYProgress, [0.974, 0.979], [0, 1], {
    clamp: true,
    ease: easeOut,
  });
  const dividerScaleX = useTransform(scrollYProgress, [0.974, 0.980], [0, 1], {
    clamp: true,
    ease: easeOut,
  });
  // Four tagline reveals — each 5 ds units wide, offset 2 ds between
  const tag1Op = useTransform(scrollYProgress, [0.977, 0.982], [0, 1], { clamp: true, ease: easeOut });
  const tag1Y  = useTransform(scrollYProgress, [0.977, 0.982], [10, 0], { clamp: true, ease: easeOut });
  const tag2Op = useTransform(scrollYProgress, [0.979, 0.984], [0, 1], { clamp: true, ease: easeOut });
  const tag2Y  = useTransform(scrollYProgress, [0.979, 0.984], [10, 0], { clamp: true, ease: easeOut });
  const tag3Op = useTransform(scrollYProgress, [0.981, 0.986], [0, 1], { clamp: true, ease: easeOut });
  const tag3Y  = useTransform(scrollYProgress, [0.981, 0.986], [10, 0], { clamp: true, ease: easeOut });
  // Tag 4 is the climax — slightly longer reveal window, larger Y drop
  const tag4Op = useTransform(scrollYProgress, [0.984, 0.989], [0, 1], { clamp: true, ease: easeOut });
  const tag4Y  = useTransform(scrollYProgress, [0.984, 0.989], [14, 0], { clamp: true, ease: easeOut });
  // ctaOp / ctaY retained for downstream component compatibility.
  // After endscreen redesign the CTA + scarcity were removed; these
  // motion values now drive only the (no-op) trailing region — kept
  // declared to keep the prop API stable for any future re-add.
  const ctaOp = useTransform(scrollYProgress, [0.984, 0.989], [0, 1], {
    clamp: true,
    ease: easeOut,
  });
  const ctaY = useTransform(scrollYProgress, [0.984, 0.989], [12, 0], {
    clamp: true,
    ease: easeOut,
  });

  return (
    <motion.div
      className="absolute inset-0 z-[24] flex items-center justify-center px-6"
      style={{ opacity }}
    >
      {/* ENDSCREEN-FIX (2026-05-19) — Mo's directive: lead with the
          AssuredAI brand mark prominently, with three brand promises
          underneath. The $750M headline + 3 pillar cards have been
          retired. The brand mark IS the promise: italic "a" + red
          ink-bleed terminator (same gesture the product draws under
          dangerous sentences). Three taglines underneath read as a
          progressive promise: PEOPLE → BUSINESS → THE RELEASE. */}
      <div className="mx-auto w-full max-w-[760px] text-center">
        {/* LOGO BLOCK — BrandMark + wordmark stacked. The mark and
            wordmark arrive independently: the mark drops + scales in
            first (confident "settling into focus"), then the wordmark
            lands beneath it. Reads as two-part arrival, not one
            flat fade. */}
        <motion.div
          className="flex flex-col items-center"
          style={{
            opacity: titleOp,
            y: titleY,
            scale: titleScale,
            color: C.text,
          }}
        >
          <BrandMark size={120} className="text-white" />
        </motion.div>
        <motion.h3
          className="mt-4"
          style={{
            opacity: wordmarkOp,
            y: wordmarkY,
            color: C.text,
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontWeight: 600,
            fontSize: 'clamp(36px, 4.4vw, 56px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
          }}
        >
          AssuredAI
        </motion.h3>

        {/* HAIRLINE DIVIDER — draws horizontally between the brand
            block and the four promises. Mint accent (C.safe) — same
            color as the resolution emphasis below, so the divider
            reads as the "verified-state line." */}
        <motion.div
          aria-hidden="true"
          className="mx-auto mt-8"
          style={{
            width: 56,
            height: 2,
            backgroundColor: C.safe,
            opacity: dividerOp,
            scaleX: dividerScaleX,
            transformOrigin: '50% 50%',
            borderRadius: 1,
          }}
        />

        {/* FOUR PROGRESSIVE TAGLINES — each reveals on its own
            scroll window so the brand promise builds in front of
            the user, one statement at a time. Final state has all
            four visible together as a unified declaration.
            Typography: editorial serif, equal weight & size — they
            are peers, not headlines + subheads. */}
        <div
          className="mx-auto mt-7 flex flex-col items-center"
          style={{
            gap: 'clamp(10px, 1.0vw, 16px)',
            color: C.text,
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontWeight: 400,
            fontSize: 'clamp(22px, 2.3vw, 32px)',
            letterSpacing: '-0.012em',
            lineHeight: 1.16,
          }}
        >
          <motion.p style={{ opacity: tag1Op, y: tag1Y }}>
            Protect your clients.
          </motion.p>
          <motion.p style={{ opacity: tag2Op, y: tag2Y }}>
            Protect your team.
          </motion.p>
          <motion.p style={{ opacity: tag3Op, y: tag3Y }}>
            Protect your brand.
          </motion.p>
          {/* Climax line — slightly larger, mint italic accent on
              "confidence" so it reads as the resolution of the
              promise sequence. Same color as the divider above. */}
          <motion.p
            style={{
              opacity: tag4Op,
              y: tag4Y,
              fontSize: 'clamp(26px, 2.7vw, 38px)',
              marginTop: 'clamp(4px, 0.6vw, 10px)',
              lineHeight: 1.1,
            }}
          >
            Publish with{' '}
            <span style={{ color: C.safe, fontStyle: 'italic' }}>
              confidence
            </span>
            .
          </motion.p>
        </div>

        {/* Scarcity counter + CTA both removed (2026-05-19) —
            Mo: "remove the cohort and spots remaining stuff... yes
            remove those too, including scan your draft." The
            closing slide is now pure brand statement, no buttons,
            no urgency, no anchor targets. The brand mark + 4
            promises are the destination. */}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MoodShiftAtmosphere — the TURN of the cinema as a visual event
   ════════════════════════════════════════════════════════════════════
   Audit found the friendly→critical turn (when Janet's first
   concerned comment arrives) was textual only — the chip count
   escalated but the world didn't change. Now the cinema undergoes
   an atmospheric MOOD SHIFT at that moment:
     • A subtle cool color-grade (5% blue-cyan tint) washes over
       the entire viewport via screen blend mode
     • The grid background dims by ~12%
     • A subtle desaturate filter lowers chromatic intensity
   The user FEELS the temperature drop without registering why.
   Timing window: raw 0.486 → 0.498 (Janet's t0 + a beat) and holds
   through the lawsuit. Releases as the clock arrives (raw 0.665+)
   when the AI's catch begins — the cinema warms back up because the
   resolution is on its way. */
/* ════════════════════════════════════════════════════════════════════════
   MoodLightBloom — atmospheric light emanating from focal images
   ════════════════════════════════════════════════════════════════════
   Replaces the flat cool-tint MoodShiftAtmosphere. The audit found
   that a uniform color wash reads as Instagram-filter. Real cinema
   has LIGHT WITH A SOURCE — light bleeds from the screen onto the
   viewer's face. The color you feel comes FROM something.

   This component renders four radial-gradient bloom layers, each
   anchored to a focal element in the cinema and driven by a
   narrative MotionValue:

   1. STORM BLOOM (right side) — red light blooms from where the
      critical comments appear. Intensity tracks `consequenceLoad`.
      Position-anchored to the right ~30% of the viewport.
      Color: editorial red (#C62B2B) at low alpha.

   2. LAWSUIT BLOOM (center-bottom) — deep red sub-bass-feeling
      bloom under "1 lawsuit." Pulses with the gavel impact.
      Driven by `tension` peaking >0.95.

   3. CATCH BLOOM (center) — mint green relief glow emanates from
      the corrected sentence as the AI saves Alex. Driven by
      `acceptance` rising above 0.6.

   4. SHIMMER — a subtle animated noise-like flicker over all blooms,
      makes the light feel ALIVE (analog projector hum, not LED).

   The blooms have animated GRAINY shimmer via filter:url() with
   feTurbulence — physical irregularity, not flat gradients.
   ════════════════════════════════════════════════════════════════════ */
function MoodLightBloom() {
  const { tension, acceptance, consequenceLoad } = useNarrative();

  // Motion-audit tuned: all bloom opacities wrapped in useSpring
  // for natural damping. The light blooms now ramp in/out smoothly
  // instead of tracking scroll directly. The user's eye no longer
  // catches sudden opacity jolts when scrolling between beats.
  const stormBloomTarget = useTransform(consequenceLoad, [0, 1], [0, 0.55]);
  const stormBloomOp = useSpring(stormBloomTarget, { stiffness: 70, damping: 26 });

  // Lawsuit bloom — peak amplitude reduced from 0.85 to 0.55 (motion-
  // audit: was too aggressive a peak that flashed the screen)
  const lawsuitBloomTarget = useTransform(
    tension,
    [0.8, 0.95, 1.0, 0.95, 0.7, 0.55],
    [0, 0.25, 0.55, 0.45, 0.15, 0],
  );
  const lawsuitBloomOp = useSpring(lawsuitBloomTarget, { stiffness: 70, damping: 26 });

  // Catch bloom — mint glow, also smoothed
  const catchBloomTarget = useTransform(acceptance, [0.4, 0.7, 1.0], [0, 0.30, 0.45]);
  const catchBloomOp = useSpring(catchBloomTarget, { stiffness: 70, damping: 26 });

  return (
    <>
      {/* SVG filter for animated grain — gives the bloom physical
          irregularity. Looks like analog projector light spill, not
          a CSS radial-gradient. */}
      <svg
        aria-hidden="true"
        style={{ position: 'fixed', width: 0, height: 0, pointerEvents: 'none' }}
      >
        <filter id="bloom-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feColorMatrix
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0.18 0"
          />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </svg>

      {/* STORM BLOOM — red light from the comment column (right side).
          Position: right 0%, vertical center. Gradient extends inward
          ~50vw at peak. Uses screen blend mode so light ADDS to the
          underlying scene rather than dimming it. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '60vw',
          height: '100vh',
          backgroundImage: 'radial-gradient(ellipse 80% 60% at 80% 50%, rgba(198,43,43,0.75) 0%, rgba(198,43,43,0.35) 30%, rgba(198,43,43,0.08) 60%, transparent 85%)',
          mixBlendMode: 'screen',
          opacity: stormBloomOp,
          zIndex: 28,
          willChange: 'opacity',
        }}
      />

      {/* LAWSUIT BLOOM — deep blood-red from center-bottom. Heavy,
          weighted. Reads as "the verdict crashing through the floor."
          Larger gradient extent (90vw) so it dominates the frame
          briefly. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'radial-gradient(ellipse 90% 70% at 50% 80%, rgba(158,23,23,0.85) 0%, rgba(158,23,23,0.45) 25%, rgba(158,23,23,0.12) 55%, transparent 80%)',
          mixBlendMode: 'screen',
          opacity: lawsuitBloomOp,
          zIndex: 30,
          willChange: 'opacity',
        }}
      />

      {/* CATCH BLOOM — mint relief glow from center. Soft, breathing,
          warm-cool mix that reads as "the world rights itself." */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'radial-gradient(ellipse 75% 55% at 50% 50%, rgba(46,166,114,0.55) 0%, rgba(46,166,114,0.25) 30%, rgba(46,166,114,0.06) 60%, transparent 85%)',
          mixBlendMode: 'screen',
          opacity: catchBloomOp,
          zIndex: 29,
          willChange: 'opacity',
        }}
      />

      {/* SHIMMER LAYER — animated grain overlay on top of all blooms.
          Uses a CSS keyframe animation for subtle flicker (~6 fps
          effective via slow easing). Reads as analog imperfection. */}
      <div
        aria-hidden="true"
        className="mood-bloom-shimmer"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
          opacity: 0.4,
          zIndex: 31,
        }}
      />
    </>
  );
}

function MoodShiftAtmosphere({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Cool tint comes in at Janet's arrival, holds through the storm
  // and lawsuit, releases as the clock arrives.
  const coolTint = useTransform(scrollYProgress, [0.486, 0.498, 0.660, 0.685], [0, 1, 1, 0], { clamp: true, ease: [easeIn, linear, easeOut] });
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(60,90,140,0.06)',
        mixBlendMode: 'multiply',
        opacity: coolTint,
        zIndex: 38,
      }}
    />
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PROTAGONIST — Alex Brennan
   ════════════════════════════════════════════════════════════════════
   The audit identified the cinema's biggest narrative gap: no human
   protagonist. The cinema saves a system, not a person. Alex Brennan
   (already established as "Editor at Hartwell Health" in the editor
   sidebar) becomes the recurring face through every act.

   AlexReactionFrame is a small portrait card that lives in the lower-
   right of the viewport throughout the cinema. Alex's expression and
   the caption beneath her shift with each beat:

     Pre-publish (raw 0.20 → 0.39)
       "Alex, drafting." — neutral expression

     Hover-publish (raw 0.36 → 0.39)
       "Alex, about to publish." — slight tension

     Published (raw 0.39 → 0.45)
       "Alex, published." — satisfied

     Storm (raw 0.46 → 0.55)
       "Alex, watching." — concerned (subtitle dims with storm)

     Lawsuit (raw 0.56 → 0.66)
       "Alex, frozen." — desaturated, no caption (the moment)

     Catch (raw 0.85 → 0.95)
       "Alex, exhaling." — relieved

     End (raw 0.95+)
       "Alex still has a job tomorrow." — the cinema's signature line

   The frame is small (140px) so it never competes with the main
   action — it's a witness, not the show. But the user is never alone:
   there's always a person whose life is being changed by what
   happens on screen. */
// ALEX-LABELS-RETIME (2026-05-19) — Mo: "the actions on top of her
// image are not matching what's happening on the screen. They are
// completely timed off or plain inaccurate." Old labels covered
// huge swaths of scroll (e.g., "The AI catches it." spanned raw
// 0.665-0.853 which actually contained rewind + scan, not the catch).
// New windows align tightly to the actual narrative beats:
//   raw 0.165-0.275   PostStage editor arrives, empty             → "Alex, at her desk."
//   raw 0.275-0.380   Body fills, typewriter                       → "Alex, drafting."
//   raw 0.380-0.395   Publish button hover-state                   → "Alex, about to publish."
//   raw 0.395-0.460   Post-publish quiet, "Published" check        → "Alex, published."
//   raw 0.460-0.498   Storm begins, first comments cascade         → "First reactions."
//   raw 0.498-0.555   David Chen spotlight ("He's in the hospital") → "David's message."
//   raw 0.555-0.625   Lawsuit lands (gavel + storm bloom + freeze)  → "The lawsuit lands."
//   raw 0.625-0.665   Aftermath, Alex frozen                       → "Alex, frozen."
//   raw 0.665-0.780   Clock spins counter-clockwise (rewind)       → "Time, rewinding."
//   raw 0.780-0.870   AssuredAI scanner active                     → "AssuredAI scanning."
//   raw 0.870-0.910   Flag punch + Accept Fix self-press           → "AssuredAI caught it."
//   raw 0.910-0.948   Correction typewriter fills in safe text     → "Alex, exhaling."
//   raw 0.948-1.001   Celebration + closing slide                  → "Alex still has a job tomorrow."
const ALEX_STATES: { from: number; to: number; label: string; mood: 'neutral' | 'tense' | 'satisfied' | 'concerned' | 'frozen' | 'relieved' | 'signature' }[] = [
  { from: 0.165, to: 0.275, label: 'Alex, at her desk.',            mood: 'neutral'   },
  { from: 0.275, to: 0.380, label: 'Alex, drafting.',               mood: 'neutral'   },
  { from: 0.380, to: 0.395, label: 'Alex, about to publish.',       mood: 'tense'     },
  { from: 0.395, to: 0.460, label: 'Alex, published.',              mood: 'satisfied' },
  { from: 0.460, to: 0.498, label: 'First reactions.',              mood: 'concerned' },
  { from: 0.498, to: 0.578, label: 'David’s message.',              mood: 'concerned' },
  // ALEX-LABELS-TIGHTEN: lawsuit caption start pushed 0.555 → 0.578.
  // The "1 lawsuit." red serif visual peaks around raw 0.585-0.610;
  // caption now lands within 7 raw units of the visual instead of
  // 30 units ahead of it. Mo: "tighten up where it says lawsuit
  // landed, the timing is off a little bit."
  { from: 0.578, to: 0.628, label: 'The lawsuit lands.',            mood: 'frozen'    },
  { from: 0.628, to: 0.665, label: 'Alex, frozen.',                 mood: 'frozen'    },
  { from: 0.665, to: 0.780, label: 'Time, rewinding.',              mood: 'concerned' },
  { from: 0.780, to: 0.870, label: 'AssuredAI scanning.',           mood: 'concerned' },
  { from: 0.870, to: 0.910, label: 'AssuredAI caught it.',          mood: 'relieved'  },
  { from: 0.910, to: 0.948, label: 'Alex, exhaling.',               mood: 'relieved'  },
  { from: 0.948, to: 1.001, label: 'The article went live. The crisis did not.', mood: 'signature' },
];

function AlexReactionFrame({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Subscribe to narrative context for CONTINUOUS mood blending.
  // The old version snapped between 8 discrete mood filters at
  // hard scroll thresholds. Now the filter values are useTransform
  // of the SHARED tension + acceptance MotionValues — Alex's
  // portrait breathes continuously through the cinema.
  const { tension, acceptance } = useNarrative();
  const [active, setActive] = useState(ALEX_STATES[0]);

  // Frame fades in after the editor enters (raw 0.18) and stays
  // visible through the entire cinema, fading out only during the
  // cinema lift (raw 0.995+). CLOSING-POLISH aligned: the frame
  // exit is now synced with the cinema's eased lift so they vacate
  // together. Alex is the proof point of the promise; she stays
  // until the very end.
  const opacity = useTransform(scrollYProgress, [0.170, 0.190, 0.995, 1.0], [0, 1, 1, 0], { clamp: true, ease: [easeOut, linear, easeIn] });
  // During the David Chen spotlight (raw 0.501-0.519), Alex's frame
  // SHRINKS to step out of the way — David is the moment.
  const spotlightDimmer = useTransform(scrollYProgress, [0.498, 0.501, 0.517, 0.521], [1, 0.25, 0.25, 1], { clamp: true });

  // ── CONTINUOUS MOOD FILTER ─────────────────────────────────────
  // Alex's CSS filter is now driven by the SHARED tension and
  // acceptance MotionValues. Audit found the old discrete-state
  // approach snapped between filters at hard thresholds — she
  // appeared to "react instantly" instead of "react gradually."
  //
  // Formula:
  //   saturate     1 + (acceptance - tension) * 0.4
  //                  High at relief, low at stress
  //   brightness   1 - tension * 0.22
  //                  Dims as stakes rise
  //   contrast     1 + tension * 0.15
  //                  Sharpens during crisis (high-contrast crisis)
  // ALEX-CRISIS-WINDOW (2026-05-19) — Mo's directive:
  //   "Starting from David's message, all the way to when time
  //   starts rewinding, Alex has to be a red outline and monochrome
  //   picture. And then when time starts rewinding, her picture
  //   starts gradually moving back to full color, and the red
  //   outline or halo starts to move back to become green/normal."
  //
  // The "crisis factor" is a scroll-driven 0→1 value that:
  //   • Holds at 1.0 from raw 0.498 (David's message arrives) to
  //     raw 0.665 (clock begins rewinding)
  //   • Smoothly drops from 1.0 → 0 over raw 0.665-0.780 (the
  //     rewind window) — Alex regains color as time unwinds
  //   • Is 0 everywhere else
  // Three render properties (portrait filter, frame border accent,
  // aura halo) all read this single value so they shift together.
  const crisisFactor = useTransform(scrollYProgress, (v: number) => {
    if (v < 0.498) return 0;
    if (v < 0.665) return 1;
    if (v < 0.780) return Math.max(0, 1 - (v - 0.665) / (0.780 - 0.665));
    return 0;
  });

  // PORTRAIT FILTER — saturation collapses to 0 during crisis, plus
  // the original tension-driven desaturation as a baseline. Crisis
  // dominates whenever active; outside the window the tension-based
  // tweak handles smaller mood shifts.
  const portraitFilter = useTransform([tension, acceptance, crisisFactor] as MotionValue<number>[], (vals: number[]) => {
    const t = vals[0];
    const a = vals[1];
    const c = vals[2]; // crisis factor 0→1
    const baseSat = 1 + (a - t) * 0.4;
    // Saturation killed by crisisFactor; baseline desaturation
    // still applies for non-crisis moments (e.g., the storm).
    const sat = Math.max(0, baseSat * (1 - c));
    const bright = 1 - t * 0.22 - c * 0.12;
    const contrast = 1 + t * 0.15 + c * 0.18;
    return `saturate(${sat.toFixed(3)}) brightness(${bright.toFixed(3)}) contrast(${contrast.toFixed(3)})`;
  });

  // CAPTION still changes at narrative milestones (the labels are
  // discrete, but the visual mood is continuous). 8 narrative
  // moments stay the same; her PORTRAIT breathes between them.
  useEffect(() => {
    const apply = (v: number) => {
      const state = ALEX_STATES.find((s) => v >= s.from && v < s.to) ?? ALEX_STATES[0];
      setActive((prev) => (prev.label !== state.label ? state : prev));
    };
    apply(scrollYProgress.get());
    return scrollYProgress.on('change', apply);
  }, [scrollYProgress]);

  // ── ACCENT COLOR — continuous, driven by tension + acceptance ──
  // Was a discrete switch based on mood category. Now derived from
  // the same MotionValues so it transitions smoothly:
  //   high acceptance + low tension → mint (signature/relief)
  //   high tension + low acceptance → blood-red (frozen)
  //   mid tension                   → editorial red (concerned)
  //   baseline                      → faint white (neutral)
  const accentColor = useTransform([tension, acceptance, crisisFactor] as MotionValue<number>[], (vals: number[]) => {
    const t = vals[0];
    const a = vals[1];
    const c = vals[2];
    // CRISIS — interpolate from baseline → solid red → back to
    // baseline. The frame border is RED through the lawsuit beats
    // (c=1), then transitions to a "recovery" green as c → 0
    // during time-rewinding.
    if (c >= 0.999) return 'rgb(198,43,43)';           // full crisis red
    if (c > 0) {
      // Recovery: red → mint as c drops 1 → 0
      const r = Math.round(198 + (59 - 198) * (1 - c));
      const g = Math.round(43 + (201 - 43) * (1 - c));
      const b = Math.round(43 + (151 - 43) * (1 - c));
      return `rgb(${r},${g},${b})`;
    }
    if (a > 0.85 && t < 0.2) return C.safe; // signature — relief
    if (t > 0.85) return C.riskDeep;        // frozen — lawsuit
    if (t > 0.45) return C.risk;            // concerned — storm
    return 'rgba(255,255,255,0.32)';        // baseline
  });
  // Lawsuit-aware desaturation overlay — driven by tension peaking
  const lawsuitDesaturate = useTransform(tension, [0.7, 0.85, 1.0], [0, 0.6, 1]);
  // ── AURA — mood-spectrum glow + crisis-window override ──
  // Crisis window forces a deep red halo through the lawsuit beats,
  // then interpolates back to mint during time-rewind. Outside the
  // crisis window, the original tension/acceptance logic shapes
  // the glow color naturally.
  const auraColor = useTransform([tension, acceptance, crisisFactor] as MotionValue<number>[], (vals: number[]) => {
    const t = vals[0];
    const a = vals[1];
    const c = vals[2];
    if (c >= 0.999) return 'rgba(198,43,43,0.72)';     // full crisis: deep red halo
    if (c > 0) {
      // Recovery: red halo → mint halo
      const r = Math.round(198 + (80 - 198) * (1 - c));
      const g = Math.round(43 + (220 - 43) * (1 - c));
      const b = Math.round(43 + (180 - 43) * (1 - c));
      const alpha = (0.72 + (0.55 - 0.72) * (1 - c)).toFixed(2);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    if (a > 0.85 && t < 0.2) return 'rgba(59,201,151,0.78)';  // signature
    if (t > 0.92) return 'rgba(80,80,90,0.55)';                // frozen residual
    if (t > 0.72) return 'rgba(198,43,43,0.60)';               // crisis
    if (t > 0.50) return 'rgba(255,140,60,0.55)';              // orange concern
    if (t > 0.28) return 'rgba(255,200,80,0.48)';              // yellow worry
    if (a > 0.6)  return 'rgba(80,220,180,0.55)';              // mint relief
    if (a > 0.3)  return 'rgba(110,200,220,0.45)';             // calm blue-mint
    return 'rgba(110,180,240,0.42)';                            // baseline cool blue
  });
  // BoxShadow string assembled from the aura color so glow extends
  // beyond the frame edges. Crisis window adds a dramatic inner
  // RING (8px solid red) PLUS a deeper outer halo, so the portrait
  // reads as "alarmed" even when other UI is bright.
  const auraBoxShadow = useTransform([auraColor, crisisFactor] as MotionValue<unknown>[], (vals: unknown[]) => {
    const c = vals[0] as string;
    const cf = vals[1] as number;
    // Crisis inner ring grows + intensifies with crisisFactor
    const ringOpacity = (cf * 0.75).toFixed(2);
    const ringRing = cf > 0.05
      ? `, 0 0 0 ${(2 + cf * 3).toFixed(1)}px rgba(198,43,43,${ringOpacity})`
      : '';
    const haloRadius = 60 + cf * 30;
    return `0 24px 48px -14px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.05)${ringRing}, 0 0 ${haloRadius}px -6px ${c}, 0 0 14px -2px ${c}`;
  });
  // Frame border thickens to 2.5px during crisis — pairs with the
  // solid-red accentColor for an unmistakable "danger" outline.
  const frameBorderWidth = useTransform(crisisFactor, (cf: number) => {
    return 1 + cf * 1.5; // 1px → 2.5px during full crisis
  });
  // (portraitFilter above now handles the monochrome collapse.)

  // ALEX-FRAME-REDESIGN (2026-05-19) — Mo's directive:
  //   • Caption ("Alex, drafting" etc.) lives OUTSIDE the thumbnail
  //   • Title block (Senior Editor · Hartwell Health + logo) BELOW
  //     the portrait, bigger + more readable than mono caps
  //   • Aura glow around the frame runs a full mood spectrum:
  //     blue/mint happy → yellow/orange panic → red crisis →
  //     monochrome frozen → mint celebration
  const isSignature = active.mood === 'signature';
  // Frame width holds steady through the cinema; signature beat
  // expands modestly so the celebration reads as the climax without
  // dominating the viewport.
  const frameWidth = isSignature ? 232 : 188;
  const bottomOffset = isSignature ? 96 : 80;
  return (
    <motion.div
      aria-hidden="false"
      className="pointer-events-none fixed z-[44]"
      style={{
        right: 28,
        bottom: bottomOffset,
        width: frameWidth,
        opacity,
        scale: spotlightDimmer,
        transition: 'width 720ms cubic-bezier(0.16, 1, 0.3, 1), bottom 720ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ── ABOVE-FRAME STATUS CAPTION ──
          Was inside the frame as small mono caps. Mo: "the actions
          she does like drafting, reviewing, frozen, etc they need
          to be outside of her thumbnail somehow." Now floats above
          the portrait in larger editorial typography. Right-aligned
          so the eye reads caption → portrait. */}
      <motion.div
        key={active.label}
        style={{
          textAlign: 'right',
          paddingRight: 2,
          marginBottom: 10,
          fontFamily: isSignature
            ? 'var(--font-serif), Georgia, serif'
            : 'var(--font-geist-sans), system-ui, sans-serif',
          fontSize: isSignature ? 22 : 15,
          fontWeight: isSignature ? 500 : 600,
          // Signature beat handles its own per-sentence styling below
          // (first sentence white setup, second sentence mint italic).
          fontStyle: 'normal',
          letterSpacing: '-0.005em',
          color: 'rgba(255,255,255,0.94)',
          lineHeight: 1.2,
          textShadow: '0 1px 10px rgba(0,0,0,0.6)',
          animation: 'alexCaptionIn 420ms cubic-bezier(0.16, 1, 0.3, 1)',
          transition: 'font-size 720ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {isSignature ? (
          <>
            {/* SETUP — neutral white, what happened. */}
            <span style={{ display: 'block' }}>
              The article went live.
            </span>
            {/* RESOLUTION — mint italic, what was averted. The
                celebrated negation. */}
            <span
              style={{
                display: 'block',
                color: C.safe,
                fontStyle: 'italic',
                marginTop: 2,
              }}
            >
              The crisis did not.
            </span>
          </>
        ) : (
          active.label
        )}
      </motion.div>

      {/* ── PORTRAIT FRAME with mood-driven AURA glow ──
          The aura box-shadow extends 60px beyond the frame and
          color-shifts continuously with tension/acceptance. */}
      <motion.div
        className="overflow-hidden rounded-md"
        style={{
          backgroundColor: 'rgba(10,10,12,0.92)',
          borderWidth: isSignature ? 1.5 : frameBorderWidth,
          borderStyle: 'solid',
          borderColor: accentColor,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: auraBoxShadow,
        }}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            src="/marketing/alex-brennan.png"
            alt="Alex Brennan, Senior Editor at Hartwell Health"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 28%',
              filter: portraitFilter,
            }}
          />
          {/* Lawsuit desaturation overlay — kept as a SECONDARY
              kill switch on top of the filter-based saturation
              collapse. Belt + suspenders for the monochrome beat. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundColor: 'rgba(10,10,12,0.42)',
              mixBlendMode: 'saturation',
              opacity: lawsuitDesaturate,
            }}
          />
          {/* Top accent line — mood-driven color indicator */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 right-0"
            style={{
              height: 2,
              backgroundColor: accentColor,
            }}
          />
        </div>
      </motion.div>

      {/* ── BELOW-FRAME TITLE BLOCK ──
          Hartwell Health logo + "Senior Editor · Hartwell Health".
          Replaces the previous mono-caps "Hartwell Health" line
          inside the frame. Reads as a proper photo-credit caption
          on a magazine page. */}
      <div
        style={{
          marginTop: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/avatars/hartwell-health.svg"
          alt=""
          width={26}
          height={26}
          style={{
            flexShrink: 0,
            borderRadius: '50%',
            opacity: 0.95,
            backgroundColor: 'rgba(255,255,255,0.96)',
          }}
        />
        <div style={{ minWidth: 0, lineHeight: 1.15 }}>
          <div
            style={{
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              fontSize: 12,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.94)',
              letterSpacing: '-0.005em',
            }}
          >
            Alex Brennan
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              fontSize: 11,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.66)',
              letterSpacing: '0.005em',
              marginTop: 1,
            }}
          >
            Senior Editor · Hartwell Health
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   DavidChenSpotlight — STOP THE CINEMA
   ════════════════════════════════════════════════════════════════════
   The single most devastating line in the cinema — "My dad just
   followed this advice. He's in the hospital." — used to land as
   one of 8 staggered comments. The audit found this was the cinema's
   emotional climax wasted: a Bergman close-up moment delivered as a
   feed-card stagger.

   DavidChenSpotlight HALTS the storm at David's arrival:
     • All other comments fade to 20%
     • David's card scales to 1.4× and centers in the right column
     • David's portrait appears beside the card (left of the text)
     • Audio mutes everything except a slow heartbeat (handled by
       the cinema:david-spotlight event)
     • Text types in char-by-char on the existing card's animation
     • 3 seconds of dead silence at full presence
     • Then storm resumes

   This is the moment the user STOPS skimming and STARTS feeling. */

/* ════════════════════════════════════════════════════════════════════════
   DecisionPause → CELEBRATION beat (2026-05-19 — Mo's redesign)
   ════════════════════════════════════════════════════════════════════
   Original mode was a persuasion hinge: "Don't let this be you." —
   ominous, cautionary, framed Alex as a cautionary tale. Mo's note:
   "instead of making a bad example of her and saying don't be like
    her, we instead should celebrate that she is safe, and wink joke
    about she still has a job tomorrow." HAPPY ENDING vibe.
   The beat keeps the same scroll window + same dim overlay, but
   the line becomes a relief-toned wink. Editorial serif, mint
   italic on the punchline, no exclamation — confident exhale. */
function DecisionPause({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // CLOSING-FIX-1 — Decision pause now lands BEFORE Scene 9 reveal,
  // not overlapping it. Was raw 0.970-0.992 (which collided with
  // Scene 9's reveal at raw 0.985-0.994). Now sits cleanly at
  // raw 0.946-0.964, exits, then Scene 9 enters cleanly at raw
  // ~0.972. Total 18 raw units = ~270vh of scroll for the held
  // "Don't let this be you" line — plenty of dwell.
  const dimOp = useTransform(
    scrollYProgress,
    [0.946, 0.952, 0.962, 0.964],
    [0, 0.78, 0.78, 0],
    { clamp: true, ease: [easeIn, linear, easeOut] },
  );
  const lineOp = useTransform(
    scrollYProgress,
    [0.948, 0.954, 0.962, 0.964],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const lineY = useTransform(
    scrollYProgress,
    [0.948, 0.956],
    [12, 0],
    { clamp: true, ease: easeOut },
  );
  // Audio dispatch — silence drop + single piano A4 note (leitmotif root)
  const firedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsub = scrollYProgress.on('change', (v) => {
      if (!firedRef.current && v >= 0.952 && v < 0.962) {
        firedRef.current = true;
        try { window.dispatchEvent(new CustomEvent('cinema:decision-pause', { detail: { action: 'enter' } })); } catch { /* no-op */ }
      }
      if (firedRef.current && (v < 0.946 || v >= 0.964)) {
        firedRef.current = false;
        try { window.dispatchEvent(new CustomEvent('cinema:decision-pause', { detail: { action: 'leave' } })); } catch { /* no-op */ }
      }
    });
    return unsub;
  }, [scrollYProgress]);

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          // CELEBRATION: warmer dim than the previous cautionary black.
          // A subtle mint-tinted dark instead of pure void — reads as
          // "calm exhale," not "cautionary stare."
          backgroundColor: 'rgba(6,18,14,0.94)',
          opacity: dimOp,
          zIndex: 46,
        }}
      />
      <motion.div
        aria-hidden="false"
        className="pointer-events-none"
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: lineOp,
          y: lineY,
          zIndex: 47,
          width: 'min(820px, 92vw)',
          textAlign: 'center',
        }}
      >
        {/* TINY KICKER — "and" sets the mood as a continuation, an
            exhale after the storm, not a fresh statement. */}
        <p
          style={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.34em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 22,
          }}
        >
          And the next day —
        </p>
        <p
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(38px, 4.6vw, 64px)',
            lineHeight: 1.08,
            color: C.text,
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
        >
          Alex still has a job{' '}
          <span style={{ color: C.safe, fontStyle: 'italic' }}>tomorrow</span>.
        </p>
      </motion.div>
    </>
  );
}

function DavidChenSpotlight({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Spotlight active raw 0.498 → 0.521 (when David's comment arrives
  // and holds for ~3 raw units = ~3s at natural scroll)
  const opacity = useTransform(scrollYProgress, [0.495, 0.501, 0.519, 0.525], [0, 1, 1, 0], { clamp: true, ease: [easeOut, linear, easeIn] });
  const portraitOp = useTransform(scrollYProgress, [0.501, 0.506, 0.519, 0.523], [0, 1, 1, 0], { clamp: true });
  const portraitScale = useTransform(scrollYProgress, [0.501, 0.508], [0.88, 1], { clamp: true, ease: easeOut });
  // Full-viewport dim overlay — when David's spotlight is active,
  // everything else in the cinema dims to ~10% visibility so the
  // user has nothing to look at except David. This is the moment.
  // Audit found the original spotlight competed with the storm
  // visibility — the line "He's in the hospital" landed alongside
  // 7 other visible comments. Now it lands ALONE.
  const dimOp = useTransform(scrollYProgress, [0.495, 0.501, 0.519, 0.525], [0, 0.86, 0.86, 0], { clamp: true, ease: [easeIn, linear, easeOut] });
  // T4 — Audio-clock-synced visual pulse. When the audio engine
  // fires a heartbeat tick (cinema:david-pulse), this state ticks
  // up and the data-pulse attribute toggles. The CSS animation
  // restarts each beat, in sync with AudioContext.currentTime.
  const [pulseTick, setPulseTick] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPulse = () => {
      // Toggle between 1 and 2 so the same animation can restart on
      // each beat (CSS re-fires when the attribute value changes).
      setPulseTick((prev) => (prev === 1 ? 2 : 1));
    };
    window.addEventListener('cinema:david-pulse', onPulse);
    return () => window.removeEventListener('cinema:david-pulse', onPulse);
  }, []);

  // Heartbeat dispatcher — fires once when David's spotlight begins
  // (raw 0.501). Audio engine plays a slow 60bpm heartbeat under
  // the entire spotlight window.
  //
  // S2 RESPONSIVE HEARTBEAT: tempo is dispatched dynamically based
  // on scroll position WITHIN the spotlight window. As the line
  // types in (raw 0.506-0.514), tempo accelerates 60→90bpm. Holds
  // at 90bpm as the line lands. Decelerates back to 60bpm as
  // spotlight fades.
  const heartbeatFiredRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsub = scrollYProgress.on('change', (v) => {
      if (!heartbeatFiredRef.current && v >= 0.501 && v < 0.519) {
        heartbeatFiredRef.current = true;
        try { window.dispatchEvent(new CustomEvent('cinema:david-spotlight', { detail: { action: 'start' } })); } catch { /* no-op */ }
      }
      if (heartbeatFiredRef.current && (v < 0.495 || v >= 0.525)) {
        heartbeatFiredRef.current = false;
        try { window.dispatchEvent(new CustomEvent('cinema:david-spotlight', { detail: { action: 'stop' } })); } catch { /* no-op */ }
      }
      // Dynamic tempo when spotlight is active
      if (heartbeatFiredRef.current) {
        // Compute tempo + gain based on scroll position
        // 0.501-0.506: stay at 60bpm (entering)
        // 0.506-0.514: accelerate 60 → 90bpm (line types in)
        // 0.514-0.519: hold at 90bpm (line lands)
        // 0.519-0.525: decelerate 90 → 60bpm (release)
        let bpm = 60;
        let gain = 0.14;
        if (v >= 0.506 && v < 0.514) {
          const p = (v - 0.506) / 0.008;
          bpm = 60 + p * 30;
          gain = 0.14 + p * 0.05;
        } else if (v >= 0.514 && v < 0.519) {
          bpm = 90;
          gain = 0.19;
        } else if (v >= 0.519 && v < 0.525) {
          const p = (v - 0.519) / 0.006;
          bpm = 90 - p * 30;
          gain = 0.19 - p * 0.05;
        }
        try { window.dispatchEvent(new CustomEvent('cinema:heartbeat-tempo', { detail: { bpm, gain } })); } catch { /* no-op */ }
      }
    });
    return unsub;
  }, [scrollYProgress]);

  return (
    <>
      {/* Full-viewport dim — everything else in the cinema fades to
          near-black so David is the only thing visible. Uses
          absolute positioning (covers the cinema section) because
          the section's transform creates a stacking context that
          contains fixed positioning. z-index 49 beats all scene
          layers (max z-38) and Alex frame (z-44). */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#050505',
          opacity: dimOp,
          zIndex: 49,
        }}
      />
      {/* The spotlight itself — portrait + words, centered. zIndex
          50 to sit above the dim at 49. */}
      <motion.div
        aria-hidden="false"
        className="pointer-events-none fixed"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity,
          width: 'min(640px, 92vw)',
          zIndex: 50,
        }}
      >
        <div className="flex items-center gap-7">
          {/* David's portrait — appears beside his words. The red
              border + heartbeat shadow makes the portrait itself
              breathe with the audio cue. */}
          <motion.div
            className="overflow-hidden rounded-md flex-shrink-0 david-heartbeat-frame"
            data-pulse={pulseTick}
            style={{
              width: 124,
              height: 156,
              border: `1px solid ${C.risk}`,
              opacity: portraitOp,
              scale: portraitScale,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marketing/david-chen-portrait.png"
              alt="David Chen"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 32%',
                filter: 'saturate(0.78) contrast(1.05)',
              }}
            />
          </motion.div>
          {/* Words — held in a quiet card so they read as testimony,
              not as a feed comment. Same red border treatment as
              David's portrait — a single visual unit. */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 10,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              David Chen · 6 minutes after publish
            </div>
            <p
              style={{
                fontFamily: 'var(--font-serif), Georgia, serif',
                fontSize: 'clamp(24px, 2.6vw, 36px)',
                lineHeight: 1.22,
                color: C.text,
                fontWeight: 400,
                letterSpacing: '-0.01em',
              }}
            >
              &ldquo;My dad just followed this advice.<br />
              <span style={{ color: C.risk, fontStyle: 'italic' }}>He&rsquo;s in the hospital.</span>&rdquo;
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function PillarCard({
  title,
  body,
  icon,
  index,
  scrollYProgress,
}: {
  title: string;
  body: string;
  icon: string;
  index: number;
  scrollYProgress: MotionValue<number>;
}) {
  // CLOSING-FIX-1 (2026-05-19): pillars stagger in 0.969 → 0.977
  // (each 0.002 apart), landing BEFORE the hold zone at ds 0.977.
  // The pillars must finish their entry inside the reveal window
  // so the hold zone is genuinely motionless.
  const t0 = 0.969 + index * 0.002;
  const op = useTransform(scrollYProgress, [t0, t0 + 0.004], [0, 1], {
    clamp: true,
    ease: easeOut,
  });
  const y = useTransform(scrollYProgress, [t0, t0 + 0.006], [16, 0], {
    clamp: true,
    ease: easeOut,
  });
  const iconPath: Record<string, React.ReactNode> = {
    detect: (
      <>
        <circle cx="11" cy="11" r="7" fill="none" stroke={C.text} strokeWidth="1.6" />
        <line x1="16" y1="16" x2="21" y2="21" stroke={C.text} strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
    verify: (
      <>
        <path
          d="M12 2L4 5v6.5c0 4.5 3.2 8.7 8 10.5 4.8-1.8 8-6 8-10.5V5l-8-3z"
          fill="none"
          stroke={C.text}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M8 12l3 3 5-6" fill="none" stroke={C.text} strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
    prevent: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" fill="none" stroke={C.text} strokeWidth="1.6" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke={C.text} strokeWidth="1.6" />
      </>
    ),
  };
  return (
    <motion.div
      className="rounded-xl p-6 text-left"
      style={{ backgroundColor: C.panel, border: `1px solid ${C.hairline}`, opacity: op, y }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        {iconPath[icon]}
      </svg>
      <div
        className="mt-4 text-[15px] font-semibold"
        style={{ color: C.text, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
      >
        {title}
      </div>
      <p
        className="mt-1.5 text-[12.5px] leading-[1.5]"
        style={{ color: C.textMuted, fontFamily: 'var(--font-geist-sans)' }}
      >
        {body}
      </p>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   TravelingCaret — the SAME caret that types the headline picks up at the
   moment the headline settles at top, then physically slides across the
   viewport into the editor body. It's a real position animation, not a
   crossfade. The inline headline caret hard-cuts to invisible at raw 0.245
   while this one appears at the exact same pixel position — the eye reads
   it as one continuous element that then moves.
   ════════════════════════════════════════════════════════════════════ */

function TravelingCaret({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // The TravelingCaret only owns the MOVE from headline to editor body.
  // Once the caret arrives at body-start, an inline caret inside the
  // editor's typed text takes over (see EditorBody → TypedLine →
  // BlinkingCursor with bodyCaretOp). The inline caret naturally tracks
  // each character because it sits between the typed and untyped text in
  // the DOM — no positional simulation, no DOM measurement.
  //
  // Visibility:
  //   raw 0.244 → 0.245: hard appear at headline-end position
  //   raw 0.245 → 0.275: travel into editor body
  //   raw 0.275 → 0.277: fade out (inline body caret has appeared at the
  //                       same pixel position — looks like one continuous
  //                       element)
  // Hard-cut to 0 at raw 0.275 — the inline body caret takes over the same
  // frame (its bodyCaretOp finishes its fade-in at raw 0.275). Any overlap
  // would show two carets stacked; any gap would blink the caret off.
  const opacity = useTransform(
    scrollYProgress,
    [0.244, 0.245, 0.2749, 0.275],
    [0, 1, 1, 0],
    { clamp: true },
  );
  // Travel path — viewport-center-relative pixels. Start matches the post-
  // morph position of the inline headline caret; end matches where the
  // inline body caret naturally renders (body line 0, character 0, after
  // accounting for the editor's entry slide). These offsets were measured
  // empirically from the rendered layout at the handoff frame.
  // Start (raw 0.245) tracks the inline-caret position after the headline
  // morphs to its 0.30-scale tagline at y=-360 — the end-of-line of "is
  // all it takes." Both X and Y bumped from the previous 0.22 scale to
  // match the wider, lower-sitting tagline.
  const x = useTransform(
    scrollYProgress,
    [0.245, 0.275],
    [42, -520],
    { clamp: true, ease: easeInOut },
  );
  const y = useTransform(
    scrollYProgress,
    [0.245, 0.275],
    [-338, -152],
    { clamp: true, ease: easeInOut },
  );
  // Caret size — at handoff matches the post-morph headline caret (tiny),
  // grows to a normal text caret over the travel window.
  const caretH = useTransform(scrollYProgress, [0.245, 0.275], [30, 22], {
    clamp: true,
    ease: easeInOut,
  });
  const caretW = useTransform(scrollYProgress, [0.245, 0.275], [1, 2.5], {
    clamp: true,
    ease: easeInOut,
  });
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 z-[30]"
      style={{
        opacity,
        x,
        y,
        translateX: '-50%',
        translateY: '-50%',
      }}
    >
      <motion.span
        style={{
          display: 'block',
          width: caretW,
          height: caretH,
          backgroundColor: C.risk,
        }}
        animate={{ opacity: [1, 1, 0, 0, 1] }}
        transition={{
          duration: 1.0,
          repeat: Infinity,
          times: [0, 0.49, 0.5, 0.99, 1],
          ease: 'linear',
        }}
      />
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PublishButton — ONE element that lives the entire publish arc:
     - Appears at raw 0.245 (when the editor fades in), positioned at the
       editor's title-bar right side so it reads as "in" the editor.
     - DRAFT (inert grey) through typing.
     - LIVE (red + shimmer) once the article is done.
     - PRESS (scales down) at the click moment.
     - DONE (green + checkmark + "Published") right after.
     - MOVES from the title-bar position out to the viewport's top-right
       and grows 1.5× as the editor chrome morphs into a social post.
   It lives at the StoryCinema level so it can physically translate out of
   the editor's transform context — the editor chrome can fade behind it
   without taking the button with it.
   ════════════════════════════════════════════════════════════════════ */

function PublishButton({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // TWO-WRAPPER ARCHITECTURE — the button exists at TWO positions and
  // cross-fades between them, rather than flying through a path. This
  // solves the "doesn't track correctly" problem: a single element
  // flying from corner (+580) to editor-attached creates a U-shape
  // because the editor's attached position swings LEFT to -200ish
  // before swinging right to 435. The cross-fade approach instead
  // shows the button at its CORRECT position throughout, with the
  // attached version literally pinned to the editor's title bar via
  // a derived motion value.
  //
  //   CORNER wrapper:   fixed at viewport +580/-355, scale 1.5.
  //                     Visible during the published period
  //                     (raw 0.400 → 0.740). Shows the "PUBLISHED"
  //                     green indicator floating top-right.
  //
  //   ATTACHED wrapper: x = editor.x + editor.width/2 − 105, y = -237,
  //                     scale 1. Visible during draft AND during the
  //                     unpublish morph-back. ALWAYS pinned to the
  //                     editor's title-bar right — no flight needed,
  //                     just a state crossfade in place as the editor
  //                     reverts. Tracks the editor through morph-back
  //                     AND Scene 7 slide because it's literally a
  //                     function of the editor's current x and width.
  //
  // Both wrappers render the SAME inner button content (same SVG,
  // same state fills, same press animation). They share scroll-
  // driven state values, so opacity transitions in lockstep.
  const buttonClockOp = useTransform(
    scrollYProgress,
    [0.660, 0.670],
    [1, 0],
    { clamp: true },
  );
  // ─── Checkmark-as-character ────────────────────────────────────────
  // The ✓ in this pill is the storytelling seed — same element that
  // confirms "this was published" later lifts out and becomes the
  // clock that rewinds time. Through the comment storm it WITNESSES
  // the damage:
  //   - Each CRITICAL comment lands → brief red flash + 1.10 scale
  //     tremor (≈280ms, CSS animation `checkmark-witness-flash`).
  //   - "1 lawsuit." lands → sustained 800ms red glow + 1.14 scale
  //     (CSS animation `checkmark-witness-climax`).
  // Pill chrome (green bg + "PUBLISHED" word) recedes to ~35% opacity
  // across raw 0.420 → 0.500 so the checkmark stays the prominent
  // element. By the climax the corner reads as: a bright ✓ inside
  // a quiet ghost of a pill — perfect setup for the lift-out
  // moment, when the ✓ escapes a faded shell.
  // The "witness key" is bumped via React state every time a critical
  // comment / lawsuit event fires. Re-keying the SVG wrapper restarts
  // the CSS animation. Three counters track different animation types.
  const [witnessKey, setWitnessKey] = useState(0);
  const [climaxKey, setClimaxKey] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onComment = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tone?: 'friendly' | 'critical' } | undefined;
      if (detail?.tone === 'critical') {
        setWitnessKey((k) => k + 1);
      }
    };
    const onLawsuit = () => setClimaxKey((k) => k + 1);
    window.addEventListener('cinema:comment-arrive', onComment);
    window.addEventListener('cinema:lawsuit-impact', onLawsuit);
    return () => {
      window.removeEventListener('cinema:comment-arrive', onComment);
      window.removeEventListener('cinema:lawsuit-impact', onLawsuit);
    };
  }, []);
  // Pill chrome recede — across raw 0.445 → 0.525 the bg + text drop
  // to 0.35 / 0.25 so the checkmark stands alone visually.
  // (Shifted +0.025 raw to align with the new comment-storm window —
  // chrome recedes WHILE the storm unfolds, not before it begins.)
  const chromeOp = useTransform(
    scrollYProgress,
    [0.445, 0.525],
    [1, 0.35],
    { clamp: true, ease: easeOut },
  );
  const chromeTextOp = useTransform(
    scrollYProgress,
    [0.445, 0.525],
    [1, 0.25],
    { clamp: true, ease: easeOut },
  );
  // CORNER PublishButton fades in after the inline pill has shown
  // its full press → loading → success sequence and the chrome morph
  // begins. Window start raw 0.420 — clean handoff so the user
  // doesn't see two pills active at once. Exit shifted +0.025 raw to
  // align with the delayed clock arrival (raw 0.665).
  const cornerOpacity = useTransform(
    scrollYProgress,
    [0.420, 0.430, 0.773, 0.781],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const cornerScale = useTransform(
    scrollYProgress,
    [0.420, 0.430, 0.773, 0.781],
    [0, 1.5, 1.5, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  // ─── State opacities (shared by both wrappers) ───────────────────────
  // These transitions happen in lockstep regardless of which wrapper is
  // visible. Reverse sequence shifted to align with new cross-fade
  // window (attached wrapper visible from raw 0.745 onward during
  // unpublish):
  //   raw 0.760 → 0.775   success fades (Published green → Live red)
  //   raw 0.785 → 0.795   activate fades (Live red → Inactive gray)
  // CORNER PublishButton state machine — exactly mirrors the
  // InlinePublishPill (activate, press, loading, success). The
  // cross-fade between the inline pill (in the editor title bar) and
  // the corner pill (top-right of viewport) happens after the
  // success, so the loading + success states must read the same on
  // both pills.
  const activateOp = useTransform(
    scrollYProgress,
    [0.370, 0.376, 0.810, 0.820],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const inactiveOp = useTransform(activateOp, (v) => 1 - v);
  const shimmerX = useTransform(
    scrollYProgress,
    [0.371, 0.381, 0.795, 0.810],
    [-120, 220, 220, -120],
    { clamp: true, ease: [easeInOut, linear, easeInOut] },
  );
  const pressScale = useTransform(
    scrollYProgress,
    [0.381, 0.383, 0.388],
    [1, 0.92, 1],
    { clamp: true, ease: [easeIn, easeOut] },
  );
  const loadingOp = useTransform(
    scrollYProgress,
    [0.382, 0.384, 0.389, 0.391],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const successOp = useTransform(
    scrollYProgress,
    [0.389, 0.393, 0.785, 0.800],
    [0, 1, 1, 0],
    { clamp: true, ease: [easeOut, linear, easeIn] },
  );
  const liveOp = useTransform(successOp, (v) => 1 - v);
  // Live-state "Publish" text — same subtractive logic as the
  // InlinePublishPill so spinner / checkmark aren't overlapped by
  // static text during the loading + success states.
  const liveTextOp = useTransform(
    [activateOp, loadingOp, successOp] as MotionValue<number>[],
    (vals: number[]) =>
      Math.max(0, Math.min(1, vals[0] - vals[1] - vals[2])),
  );
  // Chrome-tied opacities — multiply chromeOp / chromeTextOp into the
  // bg fills and text so they recede while the checkmark stays full.
  const activateChromeOp = useTransform(
    [activateOp, chromeOp] as MotionValue<number>[],
    (vals: number[]) => vals[0] * vals[1],
  );
  const successChromeOp = useTransform(
    [successOp, chromeOp] as MotionValue<number>[],
    (vals: number[]) => vals[0] * vals[1],
  );
  const liveTextChromeOp = useTransform(
    [liveTextOp, chromeTextOp] as MotionValue<number>[],
    (vals: number[]) => vals[0] * vals[1],
  );
  const successTextChromeOp = useTransform(
    [successOp, chromeTextOp] as MotionValue<number>[],
    (vals: number[]) => vals[0] * vals[1],
  );
  // Shadow only fully blooms once the button is the floating Done state.
  // Quietly suppressed during the draft phase so it doesn't look "lifted"
  // while still in the title bar.
  //
  // Outline-based pill, world-class dark-mode treatment:
  //   1. INSET hairline mint outline — the "outline-based" character,
  //      uses brand mint (61,220,151) at low alpha so it reads as a
  //      defined edge without screaming
  //   2. INSET top highlight — subtle "lit from above" sheen
  //   3. Grounded drop shadow — anchors the pill against the dark page
  //   4. Soft mint ambient — quiet brand glow, much subtler than before
  // Shadow — full bloom on the floating corner pill so it reads as
  // lifted off the page.
  const cornerBoxShadow =
    'inset 0 0 0 1px rgba(61,220,151,0.32), inset 0 1px 0 rgba(255,255,255,0.08), 0 5px 14px -5px rgba(0,0,0,0.55), 0 8px 28px -10px rgba(61,220,151,0.22)';

  // Shared inner pill — both wrappers render this exact tree. The
  // state opacities (activate/success/live/inactive) are scroll-
  // driven, so both copies show the same state at any given moment.
  // Only the wrappers differ in position, scale, and opacity.
  const renderPill = (boxShadow: string) => (
    <motion.div
      className="relative overflow-hidden rounded-md"
      style={{ boxShadow, scale: pressScale }}
    >
      {/* Gray inactive bg — multiplied by chromeOp so the chrome
          recedes through the storm while the checkmark stays full. */}
      <motion.div className="absolute inset-0" style={{ opacity: chromeOp, backgroundColor: 'rgba(22,22,26,0.08)' }} />
      <motion.div className="absolute inset-0" style={{ opacity: activateChromeOp, backgroundColor: C.risk }} />
      <motion.div
        className="pointer-events-none absolute inset-y-0"
        style={{
          x: shimmerX,
          opacity: liveOp,
          width: '70%',
          backgroundImage:
            'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: successChromeOp,
          background: 'linear-gradient(180deg, #14583A 0%, #0B3C25 100%)',
        }}
      />
      <span
        className="relative block px-3.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em]"
        style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', color: C.paperTextMuted }}
      >
        <span className="invisible inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="4,12 9,17 19,7" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Published
        </span>
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: C.paperTextMuted, opacity: inactiveOp }}
        >
          Publish
        </motion.span>
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: '#FFFFFF', opacity: liveTextChromeOp }}
        >
          Publish
        </motion.span>
        {/* LOADING state — mirrors the InlinePublishPill's spinner so
            both pills stay visually in sync if both are visible during
            the press-to-success window. */}
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: loadingOp }}
          aria-hidden="true"
        >
          <span
            className="publish-spinner inline-block"
            style={{ width: 14, height: 14 }}
          />
        </motion.span>
        {/* Success state — checkmark stays full opacity (it's the
            storytelling thread for the rewind), but the "Published"
            word and the green-gradient background recede with chromeOp.
            The checkmark wrapper carries the witness-flash / witness-
            climax animation classes — each critical comment landing
            triggers `checkmark-witness-flash`, the lawsuit moment
            triggers `checkmark-witness-climax`. Re-keying with
            witnessKey / climaxKey restarts the CSS animation. */}
        <motion.span
          className="absolute inset-0 flex items-center justify-center gap-1.5"
          style={{ opacity: successOp }}
        >
          <motion.span
            key={`witness-${witnessKey}-climax-${climaxKey}`}
            className={
              climaxKey > 0
                ? 'checkmark-witness-climax'
                : witnessKey > 0
                  ? 'checkmark-witness-flash'
                  : undefined
            }
            style={{ opacity: buttonClockOp, display: 'inline-flex' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" data-publish-clock>
              <polyline points="4,12 9,17 19,7" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
          <motion.span style={{ color: '#FFFFFF', opacity: successTextChromeOp }}>
            Published
          </motion.span>
        </motion.span>
      </span>
    </motion.div>
  );

  return (
    /* CORNER wrapper ONLY — the inline attached pill now lives INSIDE
       PostStage's title bar (see InlinePublishPill), so it tracks the
       title bar's actual position no matter how the editor's height
       changes. This component now only handles the floating
       "PUBLISHED" indicator at viewport top-right during the
       published period, cross-fading with the inline pill at the
       publish and unpublish moments. */
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 z-[34]"
      style={{
        opacity: cornerOpacity,
        x: 580,
        y: -355,
        scale: cornerScale,
        translateX: '-50%',
        translateY: '-50%',
      }}
    >
      {renderPill(cornerBoxShadow)}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PoppedClock — the checkmark/circle from the PublishButton "lifts out" of
   the button as the story transitions to the rewind scene. It flies from
   the button's position to the center of the viewport, scaling up to a
   large clock face, then begins rotating counter-clockwise — the literal
   visual metaphor for time rewinding. The button's own clock fades to 0
   in lockstep so the user reads it as ONE clock leaving the button.
   ════════════════════════════════════════════════════════════════════ */

function PoppedClock({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Shifted +0.105 raw from the original timings so the clock doesn't
  // pop out of the button until AFTER the freeze-frame stat ("1 lawsuit.")
  // has had its hold time. Original opacity was [0.560 → 0.685]; now
  // [0.665 → 0.790]. (Initial +0.080 shift for stat hold; additional
  // +0.025 shift for post-publish breath beats so the lawsuit
  // slide-out completes before the clock arrives.)
  const opacity = useTransform(
    scrollYProgress,
    [0.665, 0.671, 0.775, 0.790],
    [0, 1, 1, 0],
    { clamp: true },
  );
  // Position — flies from the PublishButton (top-right) to VIEWPORT
  // CENTER. The clock is the HERO of the rewind — it owns the frame
  // through the entire spin. Everything else dims around it via a
  // global rewind-dim overlay during this beat.
  const x = useTransform(
    scrollYProgress,
    [0.665, 0.715],
    [521, 0],
    { clamp: true, ease: easeInOut },
  );
  const y = useTransform(
    scrollYProgress,
    [0.665, 0.715],
    [-355, 0],
    { clamp: true, ease: easeInOut },
  );
  // Scale — grows from button-clock size to a LARGE clock face at
  // viewport center (14×). The clock's authority comes from size and
  // centrality, not from being delicate above other content.
  const scale = useTransform(
    scrollYProgress,
    [0.665, 0.715],
    [1.5, 14],
    { clamp: true, ease: easeInOut },
  );
  // ─── THE TRICK ──────────────────────────────────────────────────────
  // At rest inside the button it's a NORMAL checkmark — vertex deep at
  // (9, 17) below-left of center, short arm coming in steep from
  // (4, 12), long arm rising shallower to (19, 7). Classic 1:2 arm-length
  // proportions with two distinctly different angles (Lucide-style).
  // As the clock lifts out of the button and flies to center, the two
  // line segments ORGANICALLY MORPH: their shared vertex slides up to
  // (12, 12) and each line's outer endpoint stays anchored in place.
  // By the time the clock lands at center, both lines share the (12, 12)
  // pivot. Then they rotate independently as hour + minute hands — the
  // viewer sees the tick they trusted decompose into clock hands while
  // time runs backwards.
  // ────────────────────────────────────────────────────────────────────
  // Morph progress: 0 = normal checkmark, 1 = clock-hand geometry.
  // Runs during the fly-to-center phase so the transformation happens
  // while the clock is also growing in scale.
  //
  // Each line keeps its OUTER tip anchored and only its INNER endpoint
  // (the checkmark vertex) slides up to the clock center (12, 12).
  // Linear interpolation works cleanly here because only ONE endpoint
  // per line is moving — the line just rotates and shortens slightly
  // around its fixed outer tip, instead of warping through ugly
  // intermediate shapes.
  const morphP = useTransform(scrollYProgress, [0.671, 0.710], [0, 1], {
    clamp: true,
    ease: easeInOut,
  });
  // SHORT stroke (becomes hour hand). Outer tip locked at (4, 12) — the
  // "9 o'clock" position. Inner endpoint slides from vertex (9, 17) up
  // to the pivot (12, 12).
  const shortX2 = useTransform(morphP, [0, 1], [9, 12]);
  const shortY2 = useTransform(morphP, [0, 1], [17, 12]);
  // LONG stroke (becomes minute hand). Outer tip locked at (19, 7) — near
  // the "2 o'clock" position. Inner endpoint slides from vertex (9, 17)
  // up to the pivot (12, 12).
  const longX1 = useTransform(morphP, [0, 1], [9, 12]);
  const longY1 = useTransform(morphP, [0, 1], [17, 12]);
  // ─── Color inversion DURING the morph ──────────────────────────────
  // In the button rest state there's NO visible dial — just a white
  // check sitting directly on the dark-green pill. So the PoppedClock
  // starts with a dial that's the SAME dark green as the pill (zero
  // visual difference, just a check). As it flies out, the dial
  // materializes — fill transitions from the pill green to paper white,
  // and the strokes deepen from white to forest. The viewer reads it
  // as a clock face BIRTHING ITSELF around the check, then the geometry
  // morphs the lines into clock hands. Shape and color animate on the
  // same timeline so it feels like one continuous metamorphosis.
  const dialFill = useTransform(morphP, [0, 1], ['#0B3C25', '#FBFAF7']);
  const handStroke = useTransform(morphP, [0, 1], ['#FFFFFF', '#0E3C25']);
  // Spin window — shifted +0.025 raw to align with delayed clock
  // arrival so the rewind animation runs while the clock is at center
  // and visible.
  const hourRot = useTransform(scrollYProgress, [0.717, 0.785], [0, -540], {
    clamp: true,
    ease: linear,
  });
  const minuteRot = useTransform(scrollYProgress, [0.717, 0.785], [0, -6480], {
    clamp: true,
    ease: linear,
  });
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 z-[40]"
      style={{
        opacity,
        x,
        y,
        scale,
        translateX: '-50%',
        translateY: '-50%',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" data-popped-clock>
        {/* Dial — color inverts during the morph (see dialFill above) */}
        <motion.circle cx="12" cy="12" r="11" fill={dialFill} />
        {/* SHORT stroke — checkmark's lower-left arm, becomes hour hand.
            Outer tip anchored at (4, 12). Inner endpoint slides from
            (9, 17) to (12, 12) during morph. After morph, the line is
            (4, 12) → (12, 12) — a hand at 9 o'clock with pivot at center.
            `transformBox: view-box` ensures the rotation pivot is read in
            the SVG's viewBox coordinate space, not the line's own bounding
            box — otherwise some browsers pivot around the line's centroid. */}
        <motion.line
          x1="4" y1="12" x2={shortX2} y2={shortY2}
          stroke={handStroke}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            rotate: hourRot,
            transformOrigin: '12px 12px',
            transformBox: 'view-box',
          }}
        />
        {/* LONG stroke — checkmark's upper-right arm, becomes minute hand.
            Outer tip anchored at (19, 7). Inner endpoint slides from
            (9, 17) to (12, 12) during morph. After morph, the line is
            (12, 12) → (19, 7) — a hand near 2 o'clock with pivot at center.
            Spins 12× faster than the hour hand once at center. */}
        <motion.line
          x1={longX1} y1={longY1} x2="19" y2="7"
          stroke={handStroke}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            rotate: minuteRot,
            transformOrigin: '12px 12px',
            transformBox: 'view-box',
          }}
        />
      </svg>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   RewindDim — global black wash that covers everything in the cinema
   stage during the clock-rewind sequence EXCEPT the PoppedClock itself.
   The clock sits at z-[40]; this overlay at z-[37] covers PostStage
   (z-[20]), Scene4 comments (z-[22]), Scene5 stat (z-[34]), PublishButton
   (z-[34]), but leaves the brand chrome above (z-[50/60]) untouched.
   Effect: time stops, the world dims, the clock IS the world.
   ════════════════════════════════════════════════════════════════════ */

function RewindDim({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Light wash — 35% peak so the social post (and the morph-back
  // happening underneath) stays CLEARLY visible through the dim. The
  // clock is the hero, but the dim is only there to push everything
  // else slightly back, not to hide it. The whole point of the rewind
  // beat is showing the world un-doing itself; if the dim is too heavy
  // the viewer can't see the morph and the spin feels disconnected.
  // (Shifted +0.025 raw to align with delayed clock arrival.)
  const opacity = useTransform(
    scrollYProgress,
    [0.665, 0.715, 0.775, 0.790],
    [0, 0.35, 0.35, 0],
    { clamp: true, ease: [easeIn, linear, easeOut] },
  );
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[37]"
      style={{ opacity, backgroundColor: C.void }}
    />
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ConfettiBurst — small particles in brand colors radiate out from the
   publish button at the moment of the press, fall with a touch of gravity,
   and fade. Pre-generated with a deterministic seed so it's stable across
   re-renders and matches between SSR and client. Tasteful, not festive —
   subtle enough to fit the serious aesthetic.
   ════════════════════════════════════════════════════════════════════ */

// Beefed up from 26 to 42 — at the publish moment the eye expects a
// noticeable burst, not a few stray flecks. With particle pruning down
// to 26 the celebration read as "small splash"; 42 gives it weight.
const CONFETTI_COUNT = 42;
type ConfettiParticleConfig = {
  i: number;
  angle: number;
  speed: number;
  color: string;
  size: number;
  rotSpeed: number;
  shape: 'rect' | 'circle';
};

function ConfettiBurst({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // INK-PARTICLE CELEBRATION — replaces the publish-time confetti.
  // Audit found: publish itself shouldn't be celebrated (Alex is
  // about to suffer for it). Save the celebration for after the
  // catch+correction — THAT's the actual win. The particles are
  // now RED INK DROPS that radiate from the corrected sentence,
  // echoing the ink-bleed gesture. The editor's-mark celebration.
  //
  // Particles fire at the CORRECTION moment (ds 0.940 = raw 0.950)
  // when the corrected text completes its char-by-char typewriter.
  // They emerge from the sentence center, scatter outward like
  // splashed ink, and fade as they fall under gravity.
  const particles = useMemo<ConfettiParticleConfig[]>(() => {
    // Ink-palette: deep editorial red + lighter splash variants.
    // No green, no white — this is an editor's celebration of a
    // catch, not a party.
    const COLORS = [
      C.risk,          // editorial-correction red
      '#9E1717',       // deeper crimson splash
      '#E04A4A',       // lighter splash highlight
      'rgba(198,43,43,0.78)',
      'rgba(158,23,23,0.62)',
    ];
    const arr: ConfettiParticleConfig[] = [];
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const angle = -Math.PI / 2 + ((i / CONFETTI_COUNT) - 0.5) * Math.PI * 1.6
        + Math.sin(i * 12.9898) * 0.34;
      const speed = 60 + ((i * 17) % 140);
      arr.push({
        i,
        angle,
        speed,
        color: COLORS[i % COLORS.length],
        // Smaller and more varied — ink drops, not paper confetti.
        size: 2 + (i % 4) * 1.5,
        rotSpeed: ((i * 41) % 600) - 300,
        // ALL CIRCLES — ink drops are organic, not rectangular flecks
        shape: 'circle',
      });
    }
    return arr;
  }, []);
  // Scroll-driven "time" — now fires when the CORRECTION lands
  // (raw 0.946 → 0.970). The corrected text has just finished
  // typing in; the user has been given the answer; the ink-drops
  // are the editor's release.
  const t = useTransform(scrollYProgress, [0.946, 0.970], [0, 1], { clamp: true });
  const opacity = useTransform(
    scrollYProgress,
    [0.944, 0.948, 0.966, 0.976],
    [0, 1, 1, 0],
    { clamp: true },
  );
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 z-[33]"
      style={{
        opacity,
        // Origin: roughly where the corrected-sentence "Follow the
        // product label..." green box sits in the editor body.
        // The post has slid left by then so origin is offset to
        // viewport-center +0 (post centered for Scene 7/8).
        x: 0,
        y: 80,
        translateX: '-50%',
        translateY: '-50%',
      }}
    >
      {particles.map((p) => (
        <ConfettiParticle key={p.i} p={p} t={t} />
      ))}
    </motion.div>
  );
}

function ConfettiParticle({
  p,
  t,
}: {
  p: ConfettiParticleConfig;
  t: MotionValue<number>;
}) {
  // Position = initial velocity * t + gravity arc. Hand-rolled so each
  // particle has the same physics in scroll-space as it would in real time.
  const x = useTransform(t, (v) => Math.cos(p.angle) * p.speed * v);
  const y = useTransform(
    t,
    (v) => Math.sin(p.angle) * p.speed * v + 120 * v * v,
  );
  const rotate = useTransform(t, (v) => p.rotSpeed * v);
  const opacity = useTransform(t, (v) => (v < 0.7 ? 1 : 1 - (v - 0.7) / 0.3));
  return (
    <motion.div
      className="absolute"
      style={{
        x,
        y,
        rotate,
        opacity,
        width: p.size,
        height: p.size * (p.shape === 'rect' ? 0.5 : 1),
        backgroundColor: p.color,
        borderRadius: p.shape === 'circle' ? '50%' : 1,
      }}
    />
  );
}

/* ════════════════════════════════════════════════════════════════════════
   REDUCED MOTION fallback — a static framing of the central message.
   ════════════════════════════════════════════════════════════════════ */

function StoryCinemaStatic() {
  return (
    <section
      aria-labelledby="story-cinema-static"
      className="relative isolate"
      style={{ backgroundColor: C.void, minHeight: '100vh' }}
    >
      <div className="mx-auto flex min-h-[80vh] max-w-[820px] flex-col items-center justify-center px-6 text-center">
        <h2
          id="story-cinema-static"
          className="leading-[0.98]"
          style={{
            color: C.text,
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(40px, 6vw, 96px)',
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
        >
          One bad sentence is all it takes.
        </h2>
        <p
          className="mt-5 max-w-[600px] text-[15px] leading-[1.6]"
          style={{ color: C.textMuted, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
        >
          Assured AI reviews high-risk content before it reaches customers, regulators, or the internet — the safety
          layer between content creation and public exposure.
        </p>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN — sticky pin, 10 scenes layered.
   ════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════════
   NARRATIVE CONTEXT — shared emotional MotionValues across the cinema
   ════════════════════════════════════════════════════════════════════
   Audit identified: components were duplicating scroll-derived state.
   Alex's mood, the mood-light bloom, the thesis recession, and the
   heartbeat all need to know "where are we in the emotional arc?" —
   but each was computing it independently from scrollYProgress.

   This context centralizes THREE narrative MotionValues that flow
   from the cinema's emotional architecture:

   1. tension     0 → 1
      The escalation toward catastrophe. Climbs during storm,
      peaks at lawsuit (1.0), drops sharply at clock rewind,
      rises again during Scene 7 catch tension, releases at
      accept-fix press.

   2. acceptance  0 → 1
      The resolution arc. Starts at 0.5 (neutral),
      drops to 0 at lawsuit (catastrophe absorbed), climbs
      back through catch, peaks at signature line (1.0).
      Lives independent of tension — both can be high.

   3. consequenceLoad  0 → 1
      Discrete accumulation of critical comments. Each critical
      voice adds 1/6 to the load. Used by mood-light bloom
      intensity, thesis recession, and atmosphere-shift dim.
      Springy because real systems have inertia.

   These three MotionValues are the FOUNDATION for: T3 Alex mood,
   T8 mood-light bloom, T9 thesis spring, S2 responsive heartbeat,
   T4 heartbeat-synced visual.
   ════════════════════════════════════════════════════════════════════ */

interface NarrativeContextValue {
  tension: MotionValue<number>;
  acceptance: MotionValue<number>;
  consequenceLoad: MotionValue<number>;
}

const NarrativeContext = createContext<NarrativeContextValue | null>(null);

function useNarrative(): NarrativeContextValue {
  const ctx = useContext(NarrativeContext);
  if (!ctx) {
    throw new Error('useNarrative must be used inside a NarrativeProvider');
  }
  return ctx;
}

function NarrativeProvider({
  rawScrollYProgress,
  children,
}: {
  rawScrollYProgress: MotionValue<number>;
  children: React.ReactNode;
}) {
  // ── TENSION CURVE ────────────────────────────────────────────────
  // Maps raw scroll position to a tension value 0→1.
  // Key inflection points (raw):
  //   0.000 - 0.350  baseline 0 (cold open, editor entry, draft)
  //   0.350 - 0.392  small rise to 0.15 (publish anticipation)
  //   0.392 - 0.456  drop to 0.10 (post-publish glow, before storm)
  //   0.456 - 0.500  rapid climb to 0.55 (critical comments arrive)
  //   0.500 - 0.521  peak to 0.95 (David Chen spotlight)
  //   0.521 - 0.585  climb to 1.00 (storm to lawsuit)
  //   0.585 - 0.620  HOLD at 1.00 (lawsuit lands)
  //   0.620 - 0.700  drop to 0.60 (clock rewind begins, hope arrives)
  //   0.700 - 0.870  decline to 0.35 (Scene 7 catch tension)
  //   0.870 - 0.918  small spike to 0.45 (accept-fix anticipation)
  //   0.918 - 0.940  drop to 0.10 (correction lands, relief)
  //   0.940 - 1.000  settle to 0 (resolution + closing)
  const tension = useTransform(
    rawScrollYProgress,
    [0.00, 0.35, 0.392, 0.456, 0.50, 0.521, 0.585, 0.62, 0.70, 0.87, 0.918, 0.94, 1.00],
    [0.00, 0.00, 0.15,  0.10,  0.55, 0.95,  1.00,  0.60, 0.35, 0.45, 0.10,  0.05, 0.00],
    { clamp: true, ease: [easeOut, easeIn, easeOut, easeInOut, easeOut, linear, easeIn, easeOut, easeOut, easeOut, easeOut, easeOut] },
  );

  // ── ACCEPTANCE CURVE ─────────────────────────────────────────────
  // Starts neutral, drops at lawsuit, recovers through catch,
  // peaks at the signature line.
  //   0.000 - 0.392  steady at 0.50 (neutral baseline)
  //   0.392 - 0.456  rise to 0.65 (post-publish satisfaction)
  //   0.456 - 0.521  drop to 0.30 (critical voices land)
  //   0.521 - 0.620  drop to 0.10 (David + lawsuit)
  //   0.620 - 0.700  climb to 0.40 (clock rewind: hope)
  //   0.700 - 0.918  climb to 0.85 (catch + fix panel)
  //   0.918 - 0.985  climb to 0.95 (correction lands)
  //   0.985 - 0.995  PEAK at 1.00 (decision pause)
  //   0.995 - 1.000  settle to 0.95 (closing)
  const acceptance = useTransform(
    rawScrollYProgress,
    [0.00, 0.392, 0.456, 0.521, 0.620, 0.700, 0.918, 0.985, 0.995, 1.00],
    [0.50, 0.50,  0.65,  0.30,  0.10,  0.40,  0.85,  0.95,  1.00,  0.95],
    { clamp: true, ease: [linear, easeOut, easeInOut, easeIn, easeOut, easeOut, easeOut, easeOut, easeOut] },
  );

  // ── CONSEQUENCE LOAD ─────────────────────────────────────────────
  // Each critical comment arrival adds to the load. Sums discretely
  // but a spring smooths the steps. Used for atmosphere bloom and
  // thesis recession — both want to escalate WITH the storm.
  // Comments arrive at (raw): 0.456 Janet, 0.464 Nicole, 0.471 Amara,
  // 0.481 James, 0.500 David, 0.517 Emma.
  const consequenceLoadRaw = useTransform(rawScrollYProgress, (v) => {
    let load = 0;
    if (v >= 0.456) load += 0.18; // Janet — the turn
    if (v >= 0.464) load += 0.18; // Nicole, PharmD — credentialed
    if (v >= 0.471) load += 0.15; // Amara — anger
    if (v >= 0.481) load += 0.16; // James — legal
    if (v >= 0.500) load += 0.20; // David — devastating, weighted heavier
    if (v >= 0.517) load += 0.13; // Emma — aftershock
    return Math.min(1, load);
  });
  // Spring smooths the discrete steps into a continuous build.
  // stiffness:60 + damping:22 + mass:1.4 gives "weight" — the storm
  // has inertia, doesn't snap. Reads as physical accumulation.
  const consequenceLoad = useSpring(consequenceLoadRaw, {
    stiffness: 60,
    damping: 22,
    mass: 1.4,
  });

  const ctx = useMemo<NarrativeContextValue>(() => ({
    tension,
    acceptance,
    consequenceLoad,
  }), [tension, acceptance, consequenceLoad]);

  return <NarrativeContext.Provider value={ctx}>{children}</NarrativeContext.Provider>;
}

/* ════════════════════════════════════════════════════════════════════════
   VIRTUAL CAMERA — Z-axis depth choreography (T2) — TUNED FOR STILLNESS
   ════════════════════════════════════════════════════════════════════
   Motion audit identified that the original camera keyframes (17 scale
   stops ranging 0.85-1.10 = 25% range + Dutch angle ±1.5° + Y offset
   ±20px) caused motion sickness even in users with no prior sensitivity.
   The principle being violated: cinema cinematography uses ONE primary
   motion at a time. I had 6+.

   Tuned-for-stillness rules applied:
     • Scale range reduced to 0.96-1.04 (8% total vs 25%) — perceivable
       but not jarring
     • Dutch angle REMOVED entirely (web ≠ film; rotation feels wrong)
     • Y offset REMOVED (-20px → 0)
     • Keyframe count reduced from 17 to 8 (only major beats)
     • All transforms wrapped in useSpring for natural physics damping
       — no sudden value jumps even at edge cases

   Camera keyframes (raw scroll, post-audit):
     0.000  scale 1.000  — wide static stage
     0.250  scale 1.020  — gentle push to editor (intimacy)
     0.500  scale 1.040  — David push-in (Bergman close-up, SUBTLER)
     0.560  scale 1.020  — slight push on lawsuit (no rotation)
     0.665  scale 0.960  — clock pull-back (world shrinks SLIGHTLY)
     0.870  scale 1.020  — push in to catch
     0.940  scale 1.040  — closer on correction
     1.000  scale 1.000  — release
   ════════════════════════════════════════════════════════════════════ */
function VirtualCamera({
  rawScrollYProgress,
  children,
}: {
  rawScrollYProgress: MotionValue<number>;
  children: React.ReactNode;
}) {
  // Raw scale target with reduced keyframes (8 vs 17) and tighter range
  const scaleTarget = useTransform(
    rawScrollYProgress,
    [0.000, 0.250, 0.500, 0.560, 0.665, 0.870, 0.940, 1.000],
    [1.000, 1.020, 1.040, 1.020, 0.960, 1.020, 1.040, 1.000],
    { clamp: true, ease: easeInOut },
  );
  // Spring-wrapped for natural damping — no sudden value jumps
  const scale = useSpring(scaleTarget, { stiffness: 50, damping: 28, mass: 1.0 });
  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        scale,
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
    >
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   VISCOUS SCROLL CLAMP (T1)
   ════════════════════════════════════════════════════════════════════
   Audit identified: user can blast through the David Chen spotlight
   (and other critical beats) in <0.5s. The cinema's emotional peaks
   are unprotected.

   This component watches scrollYProgress and dynamically reduces
   Lenis's lerp value at protected zones, making scroll FEEL VISCOUS —
   the user's gesture is dampened ~5× so they can't blast through.

   Protected zones (raw):
     0.498-0.521   David Chen spotlight     — Bergman close-up
     0.585-0.610   Lawsuit lands            — verdict
     0.918-0.928   Accept-fix self-press    — climax
     0.978-0.992   "Don't let this be you"  — decision pause

   Outside protected zones: Lenis runs at default lerp 0.10.
   Inside protected zones: lerp drops to 0.02 (5× slower interpolation).

   The user CAN'T skip these moments. The cinema PROTECTS them.
   ════════════════════════════════════════════════════════════════════ */
const VISCOUS_ZONES: { from: number; to: number; reason: string }[] = [
  { from: 0.498, to: 0.521, reason: 'David Chen spotlight' },
  { from: 0.585, to: 0.610, reason: 'Lawsuit lands' },
  { from: 0.918, to: 0.928, reason: 'Accept-fix self-press' },
  // SCROLL-PACE: decision-pause moved earlier in closing fix; zone aligned.
  { from: 0.946, to: 0.964, reason: 'Decision pause' },
];

/* ═══════════════════════════════════════════════════════════════════
   ADAPTIVE CINEMA TIMELINE (2026-05-19)
   ════════════════════════════════════════════════════════════════════
   Mo: "if someone's scrolling too fast and the thing just flies by,
   or if they scroll in bursts and they totally miss out on the
   presentation..."

   Root cause: the cinema's scroll progress was 1:1 locked to the
   user's scroll position. Slam scroll = 90 seconds of narrative
   blurred into 200ms. Burst scroll = teleported between snapshots.

   Solution: DECOUPLE cinema timeline from scroll input. The user's
   scroll becomes a TARGET; the cinema's playback springs toward it
   over ~800ms with critical-beat minimum-dwell locks.

   Four layers:
   1. Spring follower (this hook)        — smooth catch-up
   2. Critical-beat minimum dwell        — can't skip emotional peaks
   3. ViscousScrollController (existing) — input-level scroll resistance
   4. IdleScrollNudge component          — gentle hint when user stops

   Critical beats hold for minDwellMs on FIRST forward-crossing only.
   If the user rewinds past raw 0.4, beats reset so a revisit replays.
   ─────────────────────────────────────────────────────────────────── */
const CRITICAL_BEATS: ReadonlyArray<{ start: number; minDwellMs: number; name: string }> = [
  { start: 0.501, minDwellMs: 1400, name: 'David Chen spotlight' },
  { start: 0.560, minDwellMs: 1100, name: 'Lawsuit lands' },
  { start: 0.665, minDwellMs: 700,  name: 'Clock rewind' },
  { start: 0.870, minDwellMs: 900,  name: 'AI catches it' },
  { start: 0.948, minDwellMs: 1100, name: 'Decision pause' },
];

function useCinemaTimeline(raw: MotionValue<number>): MotionValue<number> {
  const out = useMotionValue<number>(raw.get());
  // Mutable physics state lives in a ref so the RAF loop doesn't
  // re-create on every render. We never set state from this hook
  // (it would cause re-renders 60×/sec); we only mutate the
  // returned MotionValue, which is React-free.
  const stateRef = useRef({
    velocity: 0,
    dwellUntil: 0,
    lastTime: typeof performance !== 'undefined' ? performance.now() : 0,
    visited: new Set<number>(),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf = 0;
    // Spring tuned for ~800ms catch-up on a 0→1 jump (Mo's
    // "watchable lag" preference). Mass adds inertia so the
    // motion reads as cinematic dolly, not jittery follow.
    const STIFFNESS = 28;
    const DAMPING = 14;
    const MASS = 1.4;

    const tick = (t: number) => {
      const s = stateRef.current;
      const dt = Math.min(0.064, (t - s.lastTime) / 1000);
      s.lastTime = t;

      const target = raw.get();
      const current = out.get();
      const now = performance.now();

      // Allow critical beats to re-fire if user rewinds to the top
      if (target < 0.4 && s.visited.size > 0) {
        s.visited.clear();
      }

      // Dwell hold — cinema timeline is frozen; bleed velocity.
      if (now < s.dwellUntil) {
        s.velocity *= 0.86;
        raf = requestAnimationFrame(tick);
        return;
      }

      // Spring physics: F = -k*x - c*v, a = F/m
      const dx = target - current;
      const accel = (STIFFNESS * dx - DAMPING * s.velocity) / MASS;
      s.velocity += accel * dt;
      let next = current + s.velocity * dt;

      // Forward-only critical-beat crossing check. If the new
      // value would carry the cinema past a beat's start point
      // for the FIRST time, clamp at the beat + begin dwell.
      for (let i = 0; i < CRITICAL_BEATS.length; i++) {
        if (s.visited.has(i)) continue;
        const beat = CRITICAL_BEATS[i];
        if (current < beat.start && next >= beat.start) {
          next = beat.start;
          s.velocity = 0;
          s.dwellUntil = now + beat.minDwellMs;
          s.visited.add(i);
          break;
        }
      }

      out.set(Math.max(0, Math.min(1, next)));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [raw, out]);

  return out;
}

/* IdleScrollNudge — gentle scroll cue with two modes:
   • START mode (raw < 0.04): fires 1.5s after mount with prominent
     "Scroll to begin" copy. Solves Mo's complaint: "no indication
     for the user that they need to scroll once they are on the
     page... when the cursor is blinking or when they stall." User
     sees the cold-open blinking cursor with no scroll affordance;
     this nudge tells them what to do.
   • MID mode (raw 0.04-0.95): fires 8s after each scroll event
     ends. Subtle "Keep scrolling" reminder for mid-cinema stalls.
   Both modes fade out instantly on any scroll event. */
function IdleScrollNudge({ rawScrollYProgress }: { rawScrollYProgress: MotionValue<number> }) {
  // SCROLL-CUE-FIX-v2 (2026-05-20): nudge renders TRUE from first
  // paint. The cold-open is always at scroll position 0 when the
  // page loads — showing "Scroll to begin" immediately is the
  // honest behavior. Mode is decided synchronously from the current
  // scroll value in the useState initializer (works without waiting
  // for useEffect, eliminates the brief 'start'→'mid' flash for
  // visitors who refresh mid-cinema).
  const [show, setShow] = useState<boolean>(() => {
    const v = rawScrollYProgress.get();
    return v < 0.95;
  });
  const [mode, setMode] = useState<'start' | 'mid'>(() => {
    const v = rawScrollYProgress.get();
    return v < 0.04 ? 'start' : 'mid';
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the user has actually scrolled. useSectionProgress
  // runs a RAF loop that may set the MotionValue many times during
  // initial mount + measurement settling — those tiny updates fire
  // 'change' events even before the user has touched the wheel.
  // Without this guard, the initial 1.5s timer kept getting reset
  // to 8s before it could ever fire.
  const hasScrolledRef = useRef(false);
  const lastVRef = useRef(0);
  // Pre-decide whether the first render shows the start nudge.
  // Because the cold-open is statically at scroll position 0 when
  // the page loads, we can synchronously render the 'start' nudge
  // — no need to wait for a setTimeout that gets reset by RAF noise.
  // After mount, the existing schedule/change logic takes over.

  const schedule = (delayMs: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const v = rawScrollYProgress.get();
      if (v < 0.04) {
        setMode('start');
        setShow(true);
      } else if (v < 0.95) {
        setMode('mid');
        setShow(true);
      }
    }, delayMs);
  };

  // Sync starting mode based on actual scroll position. For first-
  // time visitors at scroll 0 this is a no-op (default is 'start');
  // for users refreshing mid-page this corrects to 'mid'.
  useEffect(() => {
    lastVRef.current = rawScrollYProgress.get();
    const v = rawScrollYProgress.get();
    if (v >= 0.04 && v < 0.95) setMode('mid');
    if (v >= 0.95) setShow(false);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent nudges — fire 8s after each genuine scroll change.
  useMotionValueEvent(rawScrollYProgress, 'change', (v) => {
    const delta = Math.abs(v - lastVRef.current);
    lastVRef.current = v;
    if (!hasScrolledRef.current) {
      if (delta > 0.002) hasScrolledRef.current = true;
      else return;
    }
    setShow(false);
    schedule(8000);
  });

  const isStart = mode === 'start';
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-1/2 z-[200]"
      style={{
        bottom: 56,
        transform: 'translateX(-50%)',
        opacity: show ? 1 : 0,
        transition: 'opacity 720ms ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          // Start mode is more prominent: brighter + slightly larger
          // text. Reads as instruction, not a reminder.
          color: isStart ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.62)',
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: isStart ? 12 : 10,
          fontWeight: 600,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}
      >
        <span>{isStart ? 'Scroll to begin' : 'Keep scrolling'}</span>
        <span
          style={{
            fontSize: isStart ? 22 : 18,
            animation: 'idleNudgeBounce 1.6s ease-in-out infinite',
          }}
        >
          ↓
        </span>
      </div>
    </div>
  );
}

function ViscousScrollController({ rawScrollYProgress }: { rawScrollYProgress: MotionValue<number> }) {
  // Watch scroll position and toggle Lenis lerp value when entering
  // or leaving a protected zone. Lenis exposes .options.lerp at
  // runtime — we can mutate it directly without re-creating the
  // instance.
  const wasInZoneRef = useRef(false);
  useMotionValueEvent(rawScrollYProgress, 'change', (v) => {
    if (typeof window === 'undefined') return;
    const lenis = (window as unknown as { __lenis?: { options: { lerp: number } } }).__lenis;
    if (!lenis) return;
    const inZone = VISCOUS_ZONES.some((z) => v >= z.from && v <= z.to);
    if (inZone && !wasInZoneRef.current) {
      // Entering viscous zone — drop lerp 5×
      lenis.options.lerp = 0.02;
      wasInZoneRef.current = true;
    } else if (!inZone && wasInZoneRef.current) {
      // Leaving viscous zone — restore default
      lenis.options.lerp = 0.10;
      wasInZoneRef.current = false;
    }
  });
  return null;
}

export function StoryCinema() {
  const sectionRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // ─── Thesis "bad" callback at the lawsuit moment ──────────────────
  // When cinema:lawsuit-impact fires, the persistent thesis's "bad"
  // word briefly intensifies its red glow. The narrative arc gets a
  // closing brace: the thesis WARNED that one bad sentence is all it
  // takes; the lawsuit moment is the EVIDENCE the warning was right.
  // Tying the two visually (the warning word reacts to the consequence
  // it predicted) gives the moment its full dramatic weight without
  // any extra copy. Implementation: toggle a class on the cinema
  // SECTION element (NOT body — Next.js layout re-renders body and
  // would wipe any class we added there) for the duration of the
  // 880ms climax. CSS uses a descendant selector scoped to the
  // section.cinema-lawsuit-callback ancestor.
  // SCROLL-PACE (2026-05-19): two MotionValues now feed the cinema:
  //   rawScrollYProgress   — 1:1 lock to user's scroll position.
  //                          Used by ViscousScrollController + the
  //                          IdleScrollNudge to detect actual scroll
  //                          input. Anything that needs real-time
  //                          scroll velocity uses this.
  //   scrollYProgress      — spring follower + critical-beat dwell.
  //                          THIS is what every scene consumes (so
  //                          all existing scene code works unchanged).
  //                          Fast/burst scrolls smooth into watchable
  //                          playback. Critical beats hold for their
  //                          minDwellMs on first forward crossing.
  const rawScrollYProgress = useSectionProgress(sectionRef);
  const scrollYProgress = useCinemaTimeline(rawScrollYProgress);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let shakeTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const onLawsuit = () => {
      const el = sectionRef.current;
      if (!el) return;
      el.classList.remove('cinema-lawsuit-callback');
      void el.offsetWidth;
      el.classList.add('cinema-lawsuit-callback');
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        el.classList.remove('cinema-lawsuit-callback');
      }, 900);
      // VIEWPORT SHAKE — the cinema physically lurches as the
      // verdict lands. Adds body-level violence to the moment.
      const body = document.body;
      body.classList.remove('cinema-lawsuit-shake');
      void body.offsetWidth;
      body.classList.add('cinema-lawsuit-shake');
      if (shakeTimeoutId) clearTimeout(shakeTimeoutId);
      shakeTimeoutId = setTimeout(() => {
        body.classList.remove('cinema-lawsuit-shake');
      }, 220); // matches 200ms animation + small buffer
    };
    window.addEventListener('cinema:lawsuit-impact', onLawsuit);
    return () => {
      window.removeEventListener('cinema:lawsuit-impact', onLawsuit);
      if (timeoutId) clearTimeout(timeoutId);
      // Intentionally do NOT remove the class on cleanup. In dev,
      // React Strict Mode + HMR re-run effect cleanup whenever the
      // component re-renders for hot-reload, which would yank the
      // class mid-animation and leave the user with a half-played
      // flash. The 900ms timer above is sufficient — letting it run
      // ensures the visual gesture completes regardless of whether
      // React's commit phase intervenes.
    };
  }, []);

  // Downstream scenes get a remapped progress timed so the editor fades in
  // at the EXACT moment the headline settles at the top (raw 0.245). The
  // editor's existing opacity range starts at downstream 0.10, so we set
  // the remap origin to 0.161 — math:
  //     downstream(raw 0.245) = (0.245 - 0.161) / (1 - 0.161) = 0.10
  // During the morph (raw 0.205 → 0.245), downstream stays below 0.10 so
  // the editor stays invisible. The moment the headline lands at the top,
  // the editor opacity starts ramping. No gap, no waiting.
  const downstreamProgress = useTransform(scrollYProgress, (p) => {
    const ORIGIN = 0.161;
    if (p <= ORIGIN) return 0;
    return (p - ORIGIN) / (1 - ORIGIN);
  });

  // ─── Card-peel reveal (clip-path from the TOP) ────────────────────
  // During the LAST 6% of the cinema's scroll range, the cinema is
  // CLIPPED from the top progressively. The cinema's top edge appears
  // to "peel away" from the top of viewport, revealing the static
  // Mo's spec: "the top one just slides up across from it" — cinema
  // physically lifts off the screen via translateY while
  // IndustryShowcase stays sticky-pinned underneath (truly static, not
  // scrolling). The reveal happens from the BOTTOM of the viewport
  // upward as cinema vacates space.
  // Cinema lift — slides the entire cinema upward to reveal
  // IndustryShowcase below. CLOSING-POLISH (2026-05-19): Mo flagged
  // "the last slide which peels upward from the industries page
  //  slides off very awkwardly." Two fixes:
  //   1. Eased motion — easeInOut instead of linear so the lift
  //      starts slow, accelerates, then decelerates as it exits.
  //      No more mechanical yank. Reads as cinematic camera move.
  //   2. Slight scale-down (1.0 → 0.96) during the lift so the
  //      content reads as RECEDING into the distance, not just
  //      sliding off-axis. Combined with the upward translate,
  //      the whole slide feels like a confident exit, not a teleport.
  const cinemaLiftY = useTransform(scrollYProgress, [0.995, 1.0], ['0vh', '-100vh'], {
    ease: easeInOut,
  });
  const cinemaLiftScale = useTransform(scrollYProgress, [0.992, 1.0], [1.0, 0.96], {
    clamp: true,
    ease: easeInOut,
  });
  const cinemaLiftOpacity = useTransform(scrollYProgress, [0.992, 0.998, 1.0], [1, 1, 0.6], {
    clamp: true,
    ease: easeInOut,
  });
  // Pointer-events hand-off: once the peel begins (progress >= 0.985),
  // the cinema is "leaving" — kill its pointer-events so hover/click
  // pass through to IndustryShowcase below. This also disables the
  // `cursor: none` CSS rule (cursor only applies to elements that
  // receive pointer events), restoring the native cursor inside the
  // verticals section. We set this imperatively via ref because
  // framer-motion only writes a fixed set of CSS properties (transform,
  // opacity, etc.) from MotionValue to the DOM — pointerEvents isn't
  // in that set, so a MotionValue in `style` is silently ignored. The
  // listener fires on every scroll tick; updating an inline style is
  // O(1) and React-free, so no re-render churn. (Threshold shifted
  // from 0.94 to 0.988 to match the delayed cinema lift.)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const el = sectionRef.current;
    if (!el) return;
    // CLOSING-POLISH: pointer-events handoff aligned with new lift
    // threshold (0.995). Below the threshold = cinema is the active
    // surface; at/above = cinema is leaving, hand off to next section.
    const next = v >= 0.995 ? 'none' : 'auto';
    if (el.style.pointerEvents !== next) {
      el.style.pointerEvents = next;
    }
  });

  // Cold-open chrome gate — strip CinemaTopBar (logo + Login + Get
  // Started) during the first ~3% of the cinema's scroll so the empty-
  // stage beat is genuinely empty. Awwwards critique 2026-05-19: any
  // chrome competing with the lone caret in the cold-open frame
  // tanks the Creativity subscore. The body[data-cinema-cold-open]
  // attribute is keyed by CSS in globals.css.
  //
  // Important: useMotionValueEvent only fires on `change`. On a fresh
  // page load scrollYProgress starts at 0 and never "changes" until
  // the user scrolls — so without an explicit on-mount sync the
  // attribute would never be set and the chrome would never hide.
  // We pair the event listener with a useEffect to set the initial
  // state on mount.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const v = scrollYProgress.get();
    if (v < 0.030) {
      document.body.setAttribute('data-cinema-cold-open', 'true');
    }
    if (v >= 0.275 && v < 0.730) {
      document.body.setAttribute('data-cinema-thesis-pinned', 'true');
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.removeAttribute('data-cinema-cold-open');
        document.body.removeAttribute('data-cinema-thesis-pinned');
      }
    };
  }, [scrollYProgress]);
  // Two boolean phase signals derived from scroll:
  //   data-cinema-cold-open   — before the prequel types (very top of
  //                             the page, raw < 0.030). Hides the
  //                             regular marketing chrome so the empty
  //                             stage stays empty.
  //   data-cinema-thesis-pinned — during the pinned-thesis body
  //                             (raw 0.275 → 0.730). Mutes the cinema
  //                             top-bar to ~55% opacity so the
  //                             pinned headline + nav stop competing
  //                             for the top band. Restored to full
  //                             opacity once the pinned phase ends
  //                             and the product reveal begins.
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (typeof document === 'undefined') return;
    const isColdOpen = v < 0.030;
    const hasCold = document.body.hasAttribute('data-cinema-cold-open');
    if (isColdOpen && !hasCold) {
      document.body.setAttribute('data-cinema-cold-open', 'true');
    } else if (!isColdOpen && hasCold) {
      document.body.removeAttribute('data-cinema-cold-open');
    }
    const isThesisPinned = v >= 0.275 && v < 0.730;
    const hasPinned = document.body.hasAttribute('data-cinema-thesis-pinned');
    if (isThesisPinned && !hasPinned) {
      document.body.setAttribute('data-cinema-thesis-pinned', 'true');
      // Fire the pin-land thump audio cue on the forward edge — the
      // thesis "locking into" its anchor position at the top of the
      // viewport. Single fire per cinema (the attribute-add condition
      // is only true on the false → true transition).
      try {
        window.dispatchEvent(new CustomEvent('cinema:pin-land'));
      } catch {
        /* audio failure should not block visuals */
      }
    } else if (!isThesisPinned && hasPinned) {
      document.body.removeAttribute('data-cinema-thesis-pinned');
    }
  });

  if (mounted && reduceMotion) {
    return <StoryCinemaStatic />;
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="story-cinema"
      className="cinema-stage relative isolate"
      style={{ height: '1500vh', zIndex: 1 }}
    >
      <h2 id="story-cinema" className="sr-only">
        How AssuredAI prevents a single bad sentence from going public.
      </h2>
      <motion.div
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{
          backgroundColor: C.void,
          y: cinemaLiftY,
          scale: cinemaLiftScale,
          opacity: cinemaLiftOpacity,
          willChange: 'transform, opacity',
          transformOrigin: '50% 60%',
        }}
      >
        {/* CinemaBreath: on first mount, the entire stage scales from
            1.018 → 1.000 and opacity 0.92 → 1.00 over 1.6s. This sells
            "the camera arrived" instead of "the page loaded" — the
            single most impactful change to the cold-open's first
            frame. Wraps the whole stage so every layer (grid, grain,
            scenes) inherits the breath without per-scene plumbing. */}
        <NarrativeProvider rawScrollYProgress={scrollYProgress}>
        {/* VISCOUS SCROLL CONTROLLER — protects emotional peaks by
            clamping Lenis lerp value during critical zones. The
            user can't blast through David's spotlight, the lawsuit,
            the accept-press, or the decision pause. SCROLL-PACE:
            now consumes RAW scroll (not spring-followed) so the
            Lenis lerp toggles when the user's actual input enters
            a zone, not when the cinema timeline does. */}
        <ViscousScrollController rawScrollYProgress={rawScrollYProgress} />
        <CinemaBreath>
        {/* Architectural grid — bumped 0.025 → 0.055 so it reads as
            deliberate graph-paper texture instead of JPEG compression
            noise. The cold-open critique was right: at the previous
            opacity the grid was in the dead zone where it failed to
            either read or disappear. Now it gives the void a sense
            of plotted-out space without competing for attention. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            backgroundPosition: 'center',
            maskImage: 'radial-gradient(ellipse 80% 60% at center, black 30%, transparent 90%)',
          }}
        />
        {/* Paper-grain noise overlay — gives the void a *surface*.
            Subtle texture so the canvas doesn't read as a flat fill. */}
        <ColdOpenGrain scrollYProgress={scrollYProgress} />
        {/* Static base vignette — always-present darkening at the
            edges, keeping the eye centered on the action. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 50%, transparent 0%, transparent 60%, rgba(0,0,0,0.6) 100%)',
          }}
        />
        {/* Focus vignette — deepens during the full-scale hold of
            the cold-open headline (raw 0.214 → 0.250) so the
            viewer's eye is funneled toward the punchline. Fades back
            once the headline starts to shrink. Subtle but key — it's
            the difference between "headline on a stage" and "headline
            with a spotlight on it." */}
        <FocusVignette scrollYProgress={scrollYProgress} />

        {/* VIRTUAL CAMERA — scale + rotate + Y-offset transforms applied
            to all SCENE content (not chrome, not Alex frame, not David
            spotlight). The cinema gains depth choreography: push in
            for intimate beats, pull back for storm overview, Dutch
            angle for lawsuit violence. */}
        <VirtualCamera rawScrollYProgress={scrollYProgress}>
        <Scene1ColdOpen scrollYProgress={scrollYProgress} />
        {/* Settled-pause atmospheric cue — a faint warm horizontal
            glow at the viewport bottom that appears during the beat
            AFTER the thesis pins and BEFORE the editor begins to rise.
            Foreshadows the panel that's about to surface from below.
            Without this, the settled pause was just dark void; with
            it, the canvas is *expecting* the editor. */}
        <SettledPauseGlow scrollYProgress={scrollYProgress} />
        <PostStage scrollYProgress={downstreamProgress} rawScrollYProgress={scrollYProgress} />
        {/* TravelingCaret removed (was firing as an unwanted red dot at
            top-center during the headline hold under the new timeline).
            Originally bridged the headline-caret → body-caret handoff
            when both lived near viewport center. The current architecture
            has a deliberate caret-silence between headline-fade-out
            (raw 0.250) and body-caret-fade-in (raw ~0.289). */}
        {/* ConfettiBurst — small brand-colored particles radiate from the
            publish button at the press moment. */}
        <ConfettiBurst scrollYProgress={scrollYProgress} />
        {/* PublishButton — single element through the entire publish arc.
            Sits in the editor title bar through draft + publish, then
            physically translates out to the viewport top-right at 1.5× as
            the editor morphs into a social post. Not "in" the editor in the
            DOM — it just looks like it is. */}
        <PublishButton scrollYProgress={scrollYProgress} />
        <Scene3PublishMoment scrollYProgress={downstreamProgress} />
        <Scene4CommentStorm scrollYProgress={downstreamProgress} />
        {/* RewindDim — covers everything ABOVE this point in the JSX tree
            (PostStage, Scene4 comments, Scene5 stat, PublishButton) with a
            heavy black wash during the clock-rewind beat. The PoppedClock
            renders AFTER this so it shines through, owning the frame.
            This is what makes the rewind feel cinematic: the world fades,
            the clock IS the consequence transforming back into a tool. */}
        <RewindDim scrollYProgress={scrollYProgress} />
        {/* PoppedClock — checkmark/clock lifts out of the PublishButton and
            flies to viewport center as the story transitions to the rewind
            scene. Starts spinning counter-clockwise once landed — the
            visual conductor for the time-rewind sequence. Renders LAST so
            its z-[40] sits above the RewindDim at z-[37]. */}
        <PoppedClock scrollYProgress={scrollYProgress} />
        {/* Scene6Rewind intentionally NOT rendered — the rewind beat now
            relies solely on the hero PoppedClock + RewindDim. The old
            scrolling "REWIND" ticker + "Before it left the room" headline
            were competing with the clock and breaking the silence. */}
        <Scene7Scan scrollYProgress={downstreamProgress} />
        {/* Scene 8 body correction — lives at root level so it
            persists through Scene 8's full window (past Scene 7's
            fade-out at ds 0.870). The strikethrough + corrected
            inline-suggestion appears in the editor body. */}
        <Scene8BodyCorrection scrollYProgress={downstreamProgress} />
        <Scene8SafePublish scrollYProgress={downstreamProgress} />
        <Scene9Reveal scrollYProgress={downstreamProgress} />
        </VirtualCamera>
        {/* MOOD-LIGHT BLOOM — colored light shimmering from focal
            images (NEW, replaces flat cool-tint MoodShiftAtmosphere).
            Sits OUTSIDE VirtualCamera because it's a viewport-level
            atmosphere, not part of the scene depth. */}
        <MoodLightBloom />
        {/* PROTAGONIST FRAMES — Alex Brennan (recurring corner
            portrait, the cinema's hero) and David Chen (the spotlight
            moment for the devastating line). Mounted at the StoryCinema
            root so they sit above scene layers but below the RewindDim.
            Both fade with the cinema lift at the end. */}
        <AlexReactionFrame scrollYProgress={scrollYProgress} />
        <DavidChenSpotlight scrollYProgress={scrollYProgress} />
        {/* DECISION PAUSE — the persuasion hinge between catch and
            CTA. "Don't let this be you." in editorial serif, held
            in silence, asks the user to identify with Alex. */}
        <DecisionPause scrollYProgress={scrollYProgress} />
        </CinemaBreath>
        </NarrativeProvider>
      </motion.div>
      {/* SCROLL-PACE: idle nudge — fades in after 8s of no scroll
          input while user is mid-cinema. Driven by RAW scroll
          (input-level), not the spring-followed timeline. */}
      <IdleScrollNudge rawScrollYProgress={rawScrollYProgress} />
    </section>
  );
}
