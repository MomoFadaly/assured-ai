'use client';

import {
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  useInView,
  type MotionValue,
} from 'framer-motion';
import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Hand-rolled section-scroll-progress motion value. Framer's `useScroll`
 * doesn't always re-fire under Lenis smooth scroll + Next dev HMR. This
 * runs a continuous RAF loop that reads the section's bounding rect every
 * frame and updates the motion value — bulletproof under any scroll
 * mechanism (native, Lenis, programmatic). One rect read + one motion
 * value set per frame is negligible cost; the motion value internally
 * dedupes no-op writes so listeners only fire on real changes.
 */
function useSectionProgress(ref: RefObject<HTMLElement | null>): MotionValue<number> {
  const progress = useMotionValue(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId = 0;
    let lastT = -1;

    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const range = Math.max(el.offsetHeight - window.innerHeight, 1);
      const t = Math.max(0, Math.min(1, -rect.top / range));
      if (t !== lastT) {
        progress.set(t);
        lastT = t;
      }
    };

    // RAF loop — smooth updates in the foreground.
    const tick = () => {
      measure();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    // Scroll + resize listeners — belt-and-suspenders for throttled
    // environments where RAF is paused (background tabs, headless tests).
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    measure();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [ref, progress]);
  return progress;
}

/**
 * StakesCinema — the four-beat scroll-cinema stakes section.
 *
 *   PIN + SCRUB: section is ~400vh tall. Inside it, a sticky 100vh stage
 *   stays pinned while scrollYProgress drives a single timeline:
 *
 *     0.00 — 0.22   BEAT 1   draft sentence types on character-by-character
 *     0.22 — 0.28   PAUSE    sentence holds — gives the reader a beat
 *     0.28 — 0.45   BEAT 2   red marker strikes through, FLAGGED chip drops,
 *                            dosage gets boxed and pulled to side annotation
 *     0.45 — 0.52   WIPE     sentence + chip + annotation mask-wipe left
 *     0.52 — 0.72   BEAT 3   "One bad sentence is all it takes." lands
 *                            massive — italic substitution on "bad",
 *                            chromatic aberration entry, headline hold
 *     0.72 — 0.95   BEAT 4   three evidence artifacts cascade in from
 *                            different Z-depths and rotations
 *     0.95 — 1.00   UNPIN    section releases, page cuts to cream
 *
 *   FILM STACK (top → bottom):
 *     content · chromatic-aberration on big headline (transient) ·
 *     vignette · film grain (16mm-ish, 8% opacity) · background grade ·
 *     base color #050912.
 *
 *   TYPE DISCIPLINE:
 *     - Geist Mono for the editor sentence (looks like a real CMS field).
 *     - Geist Sans @ medium for the giant headline.
 *     - Instrument Serif italic for "bad" — one italic word in a different
 *       face. That single switch is what gives the headline gravity.
 *
 *   COLOR DISCIPLINE:
 *     - Cream #F4EFE5 for type (matches the rest of the page → continuity).
 *     - ONE red — #DC2626 — for redaction, FLAGGED chip, chyron. Nothing
 *       else on the page uses this red.
 *
 *   REDUCE-MOTION FORK:
 *     - No pin scrub. Each beat lays out in its own 100vh whileInView block.
 *     - All animations collapse to gentle fades. Same content, no scrub.
 */

const DRAFT_SENTENCE =
  'Adults can safely take 4,000 mg of ibuprofen daily for chronic pain.';

// Character index range of "4,000 mg" so we can box + annotate it.
const DOSAGE_START = DRAFT_SENTENCE.indexOf('4,000 mg');
const DOSAGE_END = DOSAGE_START + '4,000 mg'.length;

const HEADLINE_WORDS = [
  { word: 'One', italic: false },
  { word: 'bad', italic: true },
  { word: 'sentence', italic: false },
] as const;

/* ────────────────────────────────────────────────────────────────────────
   Background grade — four base colors lerped through the section.
   ──────────────────────────────────────────────────────────────────── */

function useBackgroundGrade(scrollYProgress: MotionValue<number>) {
  // Hex breakpoints corresponding to the four beats.
  return useTransform(
    scrollYProgress,
    [0, 0.22, 0.5, 0.72, 1],
    ['#0A0F1A', '#0A0F1A', '#0D0608', '#050912', '#0F0810'],
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Beat 1+2 — the editor sentence (typing + redaction + annotation).
   ──────────────────────────────────────────────────────────────────── */

function DraftSentenceStage({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  // BEAT 1 — character reveal across 0.00 → 0.22.
  const typeProgress = useTransform(scrollYProgress, [0.0, 0.22], [0, 1], {
    clamp: true,
  });

  // BEAT 2 — redaction stroke width grows 0 → 100% across 0.28 → 0.42.
  const strokeReveal = useTransform(scrollYProgress, [0.28, 0.42], [0, 1], {
    clamp: true,
  });

  // FLAGGED chip drops in at 0.34 → 0.40.
  const chipY = useTransform(scrollYProgress, [0.34, 0.40], [-20, 0], {
    clamp: true,
  });
  const chipOpacity = useTransform(scrollYProgress, [0.34, 0.38], [0, 1], {
    clamp: true,
  });

  // Dosage box appears as the redaction reaches the dosage word (~0.34 → 0.38),
  // annotation slides in right after (~0.38 → 0.44).
  const dosageBoxOpacity = useTransform(scrollYProgress, [0.34, 0.38], [0, 1], {
    clamp: true,
  });
  const annotationOpacity = useTransform(scrollYProgress, [0.38, 0.44], [0, 1], {
    clamp: true,
  });

  // WIPE 0.45 → 0.52 — whole sentence stage fades out.
  const stageOpacity = useTransform(scrollYProgress, [0.46, 0.52], [1, 0], {
    clamp: true,
  });
  const stageX = useTransform(scrollYProgress, [0.46, 0.52], [0, -30], {
    clamp: true,
  });

  // Render each character with its own opacity driven by typeProgress.
  // Direct DOM mutation pattern — bypasses framer-motion style-propagation
  // quirks when many tiny motion values are bound to many DOM nodes.
  const charsRef = useRef<HTMLSpanElement[]>([]);
  useEffect(() => {
    const applyChars = (latest: number) => {
      const total = DRAFT_SENTENCE.length;
      const revealed = latest * total;
      charsRef.current.forEach((el, i) => {
        if (!el) return;
        const t = Math.max(0, Math.min(1, revealed - i));
        el.style.opacity = String(t);
        el.style.filter = t < 1 ? `blur(${(1 - t) * 3}px)` : 'none';
        el.style.transform = t < 1 ? `translateY(${(1 - t) * 6}px)` : 'translateY(0)';
      });
    };
    applyChars(typeProgress.get());
    return typeProgress.on('change', applyChars);
  }, [typeProgress]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center px-6"
      style={{ opacity: stageOpacity, x: stageX }}
    >
      <div className="relative w-full max-w-[1100px]">
        {/* Editor-style sentence — monospace, cream-on-black. */}
        <div className="relative" data-cinema-redact>
          <p
            className="relative whitespace-nowrap text-[#F4EFE5] font-normal leading-[1.2] tracking-[-0.01em] text-[16px] sm:text-[22px] md:text-[26px] lg:text-[30px]"
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            }}
          >
            {renderCharsWithDosageGroup(charsRef, dosageBoxOpacity)}
          </p>

          {/* Redaction stroke — CSS scaleX driven by motion value. */}
          <RedactionStroke progress={strokeReveal} />

          {/* Side annotation — "OTC ceiling: 1,200 mg" with connector line. */}
          <DosageAnnotation opacity={annotationOpacity} />
        </div>

        {/* FLAGGED chip — drops in from above the sentence, top-right. */}
        <motion.div
          className="absolute -top-12 right-2 sm:-top-14 sm:right-8"
          style={{ y: chipY, opacity: chipOpacity }}
          aria-hidden="true"
        >
          <span className="cinema-flagged-chip">
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#050912]" />
            Flagged
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

function RedactionStroke({ progress }: { progress: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apply = (t: number) => {
      if (ref.current) ref.current.style.transform = `scaleX(${t})`;
    };
    apply(progress.get());
    return progress.on('change', apply);
  }, [progress]);

  // Two-element nest: outer carries the marker-jitter animation (animates
  // `top`, not transform — so it can't clobber the inner scaleX). Inner
  // carries the scaleX progress driven by the motion value.
  return (
    <div
      aria-hidden="true"
      className="cinema-stroke-wrapper pointer-events-none absolute inset-x-0 h-[7px]"
      style={{ top: 'calc(50% - 3.5px)' }}
    >
      <div
        ref={ref}
        className="h-full w-full origin-left bg-[#DC2626]"
        style={{ transform: 'scaleX(0)', willChange: 'transform' }}
      />
    </div>
  );
}

/**
 * Render the draft sentence char-by-char, with the dosage substring wrapped
 * in a `<span class="dosage-group">` that carries an absolutely-positioned
 * bordered overlay. The chars stay individual <span>s for the type-on
 * effect; the dosage group is just a relative wrapper around them.
 */
function renderCharsWithDosageGroup(
  charsRef: React.MutableRefObject<HTMLSpanElement[]>,
  boxOpacity: MotionValue<number>,
) {
  const out: React.ReactNode[] = [];
  for (let pos = 0; pos < DRAFT_SENTENCE.length; pos++) {
    if (pos === DOSAGE_START) {
      const dosageChars: React.ReactNode[] = [];
      for (let j = DOSAGE_START; j < DOSAGE_END; j++) {
        const idx = j;
        const ch = DRAFT_SENTENCE[idx];
        dosageChars.push(
          <span
            key={idx}
            ref={(el) => {
              if (el) charsRef.current[idx] = el;
            }}
            style={{
              opacity: 0,
              display: 'inline-block',
              whiteSpace: ch === ' ' ? 'pre' : 'normal',
              willChange: 'opacity, transform, filter',
            }}
          >
            {ch}
          </span>,
        );
      }
      out.push(
        <span key="dosage-group" className="relative inline-block">
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute border border-[#DC2626]"
            style={{
              inset: '-4px -3px',
              opacity: boxOpacity,
              boxShadow: '0 0 12px rgba(220, 38, 38, 0.18)',
            }}
          />
          {dosageChars}
        </span>,
      );
      pos = DOSAGE_END - 1; // -1 because the for loop will increment
      continue;
    }
    const idx = pos;
    const ch = DRAFT_SENTENCE[idx];
    out.push(
      <span
        key={idx}
        ref={(el) => {
          if (el) charsRef.current[idx] = el;
        }}
        style={{
          opacity: 0,
          display: 'inline-block',
          whiteSpace: ch === ' ' ? 'pre' : 'normal',
          willChange: 'opacity, transform, filter',
        }}
      >
        {ch}
      </span>,
    );
  }
  return out;
}

function DosageAnnotation({ opacity }: { opacity: MotionValue<number> }) {
  return (
    <motion.div
      className="pointer-events-none absolute -bottom-20 right-0 flex items-start gap-3 sm:right-8 md:right-16"
      style={{ opacity }}
      aria-hidden="true"
    >
      <div className="h-px w-12 translate-y-3 bg-[#DC2626]" />
      <div className="text-left">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#DC2626]"
          style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
        >
          OTC ceiling
        </div>
        <div
          className="text-[15px] font-semibold text-[#F4EFE5] sm:text-[17px]"
          style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
        >
          1,200 mg
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Beat 3 — the giant headline. Italic substitution on "bad".
   ──────────────────────────────────────────────────────────────────── */

function HeadlineStage({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Headline never fades — it lands big, holds, then SETTLES UPWARD into a
  // smaller "thesis bar" while the evidence accumulates beneath it. The
  // sentence is the verdict; the cards are the exhibits.
  const stageOpacity = useTransform(scrollYProgress, [0.52, 0.58, 0.98, 1.0], [0, 1, 1, 0], {
    clamp: true,
  });

  // Scale lifecycle: 0.62 (entry) → 1.0 (full landing) → hold → 0.62 (thesis bar)
  const scale = useTransform(
    scrollYProgress,
    [0.52, 0.62, 0.72, 0.78],
    [0.62, 1, 1, 0.62],
    { clamp: true },
  );

  // Letter-spacing inverse-coupling — tightens as it grows, opens as it shrinks.
  const tracking = useTransform(scale, [0.62, 1], [-0.01, -0.045]);

  // y lifecycle: settles up from below into center, then RISES into upper third
  // as the thesis bar (negative y) while cards take over the lower half.
  const y = useTransform(
    scrollYProgress,
    [0.52, 0.62, 0.72, 0.78],
    [40, 0, 0, -260],
    { clamp: true },
  );

  // Trigger chromatic aberration class once when we cross 0.54.
  const [aberrant, setAberrant] = useState(false);
  useEffect(() => {
    const onChange = (latest: number) => {
      setAberrant((prev) => {
        if (!prev && latest > 0.54) return true;
        if (prev && latest < 0.50) return false;
        return prev;
      });
    };
    onChange(scrollYProgress.get());
    return scrollYProgress.on('change', onChange);
  }, [scrollYProgress]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center px-6"
      style={{ opacity: stageOpacity, scale, y }}
      aria-hidden="true"
    >
      <motion.h2
        id="stakes-headline"
        className="text-center font-medium leading-[0.96] text-[#F4EFE5]"
        style={{
          fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          letterSpacing: tracking,
          fontSize: 'clamp(40px, 9.5vw, 140px)',
        }}
      >
        <span className="block whitespace-nowrap">
          {HEADLINE_WORDS.map((w, i) => (
            <span
              key={i}
              className={[
                'inline-block',
                w.italic ? 'italic' : '',
                aberrant ? 'cinema-aberrant' : '',
              ].filter(Boolean).join(' ')}
              data-text={w.word}
              style={
                w.italic
                  ? {
                      fontFamily: 'var(--font-serif), Georgia, serif',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                    }
                  : undefined
              }
            >
              {w.word}
              {i < HEADLINE_WORDS.length - 1 ? ' ' : ''}
            </span>
          ))}
        </span>
        <span
          className="mt-2 block whitespace-nowrap"
          style={{ fontWeight: 500 }}
        >
          is all it takes.
        </span>
      </motion.h2>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Beat 4 — three evidence artifacts cascade in.
   ──────────────────────────────────────────────────────────────────── */

const CHYRON_TEXT =
  '⚠ MAJOR HEALTH SYSTEM FACES $1.8M SETTLEMENT OVER PUBLISHED MISINFORMATION   ·   FINRA OPENS REVIEW OF FUND FACTSHEET LANGUAGE   ·   AMLAW 100 FIRM CITED FOR PRIVILEGE BREACH IN PUBLISHED CASE STUDY   ·   FEDERAL AGENCY PULLS GUIDANCE AFTER MISSING 988 ROUTING';

function EvidenceStage({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  // Cards enter starting at 0.78 (right as the headline settles up into the
  // thesis bar), and stay visible until the section unpins.
  const stageOpacity = useTransform(scrollYProgress, [0.78, 0.86, 0.98, 1.0], [0, 1, 1, 0], {
    clamp: true,
  });

  // Cards rise from below the viewport (y: +180 → 0), staggered.
  const card1Y = useTransform(scrollYProgress, [0.78, 0.88], [180, 0], { clamp: true });
  const card1Op = useTransform(scrollYProgress, [0.78, 0.86], [0, 1], { clamp: true });
  const card1Blur = useTransform(scrollYProgress, [0.78, 0.84], [10, 0], { clamp: true });

  const card2Y = useTransform(scrollYProgress, [0.82, 0.92], [220, 0], { clamp: true });
  const card2Op = useTransform(scrollYProgress, [0.82, 0.88], [0, 1], { clamp: true });
  const card2Blur = useTransform(scrollYProgress, [0.82, 0.86], [10, 0], { clamp: true });

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center px-6"
      style={{ opacity: stageOpacity }}
      aria-hidden="true"
    >
      <div className="relative w-full max-w-[1280px]">
        {/* Card 1 — subpoena fragment in the lower-left zone, rotated -2.4°.
            The headline lives in the upper third; cards occupy the lower half. */}
        <motion.div
          className="absolute left-[8%] top-[62%] hidden -translate-y-1/2 sm:block lg:left-[12%]"
          style={{
            y: card1Y,
            opacity: card1Op,
            filter: useTransform(card1Blur, (b) => `blur(${b}px)`),
            rotate: -2.4,
            zIndex: 2,
          }}
        >
          <SubpoenaCard />
        </motion.div>

        {/* Card 2 — OCR letter in the lower-right zone, rotated +3.2°. */}
        <motion.div
          className="absolute right-[8%] top-[62%] hidden -translate-y-[55%] sm:block lg:right-[12%]"
          style={{
            y: card2Y,
            opacity: card2Op,
            filter: useTransform(card2Blur, (b) => `blur(${b}px)`),
            rotate: 3.2,
            zIndex: 1,
          }}
        >
          <OCRLetterCard />
        </motion.div>

        {/* Mobile-only stacked layout — cards present without rotation. */}
        <div className="flex flex-col items-center gap-6 sm:hidden">
          <motion.div style={{ y: card1Y, opacity: card1Op }}>
            <SubpoenaCard />
          </motion.div>
          <motion.div style={{ y: card2Y, opacity: card2Op }}>
            <OCRLetterCard />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function SubpoenaCard() {
  return (
    <div
      className="relative w-[280px] bg-[#F4EFE5] p-6 text-[#0A1428] shadow-[0_28px_60px_-18px_rgba(0,0,0,0.75)] sm:w-[340px] md:w-[400px] lg:w-[420px]"
      style={{
        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 1px, transparent 1px, transparent 4px)',
      }}
    >
      <div className="border-b border-[#0A1428]/40 pb-2">
        <div className="text-[9px] font-bold uppercase tracking-[0.22em]">United States District Court</div>
        <div className="text-[8px] uppercase tracking-[0.18em] text-[#0A1428]/70">Northern District</div>
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[#0A1428]/70">In the matter of</div>
      <div className="mt-1 text-[14px] font-semibold leading-tight sm:text-[16px]">
        Estate of <span className="underline decoration-[#DC2626] decoration-2 underline-offset-2">[plaintiff]</span>
        <br />
        v. <span className="text-[#DC2626]">[redacted hospital system]</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] uppercase tracking-[0.18em] text-[#0A1428]/70">
        <div>
          <div>Case No.</div>
          <div className="text-[11px] text-[#0A1428]">3:26-cv-04891</div>
        </div>
        <div>
          <div>Filed</div>
          <div className="text-[11px] text-[#0A1428]">2026-04-08</div>
        </div>
      </div>
      <div className="mt-4 border-t border-dashed border-[#0A1428]/30 pt-2 text-[9px] uppercase tracking-[0.2em] text-[#0A1428]/60">
        Subpoena · Production of Documents
      </div>
    </div>
  );
}

function OCRLetterCard() {
  return (
    <div
      className="relative w-[280px] bg-[#F4EFE5] p-6 text-[#0A1428] shadow-[0_28px_60px_-18px_rgba(0,0,0,0.75)] sm:w-[340px] md:w-[400px] lg:w-[420px]"
      style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-[#0A1428]/40 pb-3">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.18em]">U.S. Department of Health</div>
          <div className="text-[8px] uppercase tracking-[0.18em] text-[#0A1428]/70">Office for Civil Rights</div>
        </div>
        <div className="text-[9px] font-mono text-[#0A1428]/60">OCR-2026-04482</div>
      </div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#DC2626]">
        Notice of Investigation
      </div>
      <div className="mt-2 text-[12px] leading-[1.5] text-[#0A1428]/80 sm:text-[13px]">
        This Office has received a complaint regarding published clinical guidance materials
        that may contain <span className="underline decoration-[#DC2626] decoration-2">misstated dosage information</span>{' '}
        in violation of <span className="font-semibold">45 CFR § 164.514</span>.
      </div>
      <div className="mt-3 border-t border-dashed border-[#0A1428]/30 pt-2 text-[9px] uppercase tracking-[0.18em] text-[#0A1428]/60">
        Response required · 30 days
      </div>
    </div>
  );
}

function ChyronStrip() {
  // Bottom ticker — decoupled from scroll, always alive (CSS animation).
  return (
    <div
      className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex h-9 items-center overflow-hidden bg-[#DC2626] text-[#050912]"
      aria-hidden="true"
    >
      <div className="cinema-chyron-track flex shrink-0 whitespace-nowrap">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-6 pr-6 text-[11px] font-bold uppercase tracking-[0.22em] sm:text-[12px]"
            style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
          >
            <span>{CHYRON_TEXT}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Reduced-motion fork — same content, no scrub. Three stacked blocks.
   ──────────────────────────────────────────────────────────────────── */

function StakesCinemaStatic() {
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const inView1 = useInView(ref1, { once: true, margin: '-25% 0px -25% 0px' });
  const inView2 = useInView(ref2, { once: true, margin: '-25% 0px -25% 0px' });

  return (
    <section
      aria-labelledby="stakes-headline-static"
      className="relative bg-[#050912] text-[#F4EFE5]"
    >
      <div className="mx-auto max-w-[1100px] px-6 py-32">
        <p
          className="text-balance leading-[1.5] text-[20px] sm:text-[28px] md:text-[34px]"
          style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
        >
          {DRAFT_SENTENCE}
        </p>
      </div>
      <div ref={ref1} className="mx-auto max-w-[1100px] px-6 pb-32">
        <motion.h2
          id="stakes-headline-static"
          initial={{ opacity: 0, y: 24 }}
          animate={inView1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-medium leading-[0.98] tracking-[-0.03em]"
          style={{
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontSize: 'clamp(48px, 10vw, 140px)',
          }}
        >
          One{' '}
          <span style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic' }}>
            bad
          </span>{' '}
          sentence
          <br />
          is all it takes.
        </motion.h2>
      </div>
      <div ref={ref2} className="mx-auto grid max-w-[1280px] gap-8 px-6 pb-32 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <SubpoenaCard />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          <OCRLetterCard />
        </motion.div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Public component — picks the right fork based on reduce-motion + viewport.
   ──────────────────────────────────────────────────────────────────── */

export function StakesCinema() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const scrollYProgress = useSectionProgress(sectionRef);

  const backgroundColor = useBackgroundGrade(scrollYProgress);

  // Sound thump fires exactly once when the headline lands (~0.58).
  const thumpedRef = useRef(false);
  useEffect(() => {
    const onChange = (latest: number) => {
      if (!thumpedRef.current && latest > 0.58 && latest < 0.7) {
        thumpedRef.current = true;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cinema:thump'));
        }
      }
      if (thumpedRef.current && latest < 0.5) {
        thumpedRef.current = false;
      }
    };
    onChange(scrollYProgress.get());
    return scrollYProgress.on('change', onChange);
  }, [scrollYProgress]);

  if (mounted && reduceMotion) {
    return <StakesCinemaStatic />;
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="stakes-headline"
      className="cinema-stage relative isolate"
      style={{ height: '480vh', background: '#050912' }}
    >
      {/* Sticky cinema stage — pinned for the whole section's scroll. */}
      <motion.div
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ backgroundColor }}
      >
        {/* Vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 50% 50%, transparent 0%, transparent 55%, rgba(0,0,0,0.55) 100%)',
          }}
        />
        {/* Film grain plate — real 16mm-style loop, 2.5s VP9 WebM. */}
        <video
          className="cinema-grain-video pointer-events-none absolute inset-0 z-[15]"
          aria-hidden="true"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src="/cinema/grain.webm" type="video/webm" />
        </video>

        {/* Beat 1 + 2 — draft sentence stage */}
        <DraftSentenceStage scrollYProgress={scrollYProgress} />

        {/* Beat 3 — giant headline */}
        <HeadlineStage scrollYProgress={scrollYProgress} />

        {/* Beat 4 — evidence cards */}
        <EvidenceStage scrollYProgress={scrollYProgress} />

        {/* Chyron — always-alive ticker, only visible during beat 4 */}
        <BeatGate
          scrollYProgress={scrollYProgress}
          range={[0.82, 0.88, 0.97, 1.0]}
        >
          <ChyronStrip />
        </BeatGate>

        {/* Eyebrow — top-left tag, always present, signals "you are here". */}
        <div className="pointer-events-none absolute left-6 top-6 z-30 sm:left-10 sm:top-10">
          <span
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F4EFE5]/90"
            style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
          >
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#DC2626] shadow-[0_0_6px_rgba(220,38,38,0.6)]" />
            The stakes
          </span>
        </div>
      </motion.div>
    </section>
  );
}

/* Helper — gates a child by scroll range (fades it in/out). */
function BeatGate({
  scrollYProgress,
  range,
  children,
}: {
  scrollYProgress: MotionValue<number>;
  range: [number, number, number, number];
  children: React.ReactNode;
}) {
  const opacity = useTransform(scrollYProgress, range, [0, 1, 1, 0], { clamp: true });
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 z-20 pointer-events-none">
      {children}
    </motion.div>
  );
}
