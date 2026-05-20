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
 * ResolutionCinema — the inverse of StakesCinema. Same dark frame, same
 * dangerous draft sentence, same craft language — but this time the
 * pipeline catches the sentence before it ships. Consequences un-happen.
 * A cryptographic proof URL is minted. The brand tagline lands.
 *
 *   The page just put the user through a horror story (lawsuit, regulator
 *   letter, CNN headline). This section is the catharsis — it shows the
 *   identical sentence running through AssuredAI's pipeline and getting
 *   caught BEFORE any of that happens. Same fidelity. Opposite outcome.
 *
 *   PIN + SCRUB: ~380vh tall. Sticky 100vh stage timeline:
 *
 *     0.00 — 0.05   ENTRY    eyebrow flips to "◆ THE CATCH"
 *     0.05 — 0.20   TYPE     same dangerous sentence types on
 *     0.20 — 0.34   SCAN     green scan line sweeps across; 4-stage pipeline
 *                            status strip lights up sequentially in upper-right
 *     0.34 — 0.46   CATCH    BLOCKED chip drops, dosage is corrected
 *                            ("4,000 mg" → "1,200 mg") in green, in place
 *     0.46 — 0.60   UNWRITE  the stakes consequences fade in faded then
 *                            un-write themselves — un-events
 *     0.60 — 0.78   PROOF    cryptographic proof URL types on character-by-
 *                            character; SHA-256 hash; 5 chain blocks scale in
 *                            from genesis → head, all green
 *     0.78 — 0.92   HEADLINE "Nothing publishes / under your name /
 *                            without proof." in three lines, italic on "name"
 *     0.92 — 1.00   CHYRON   positive ticker locks at bottom — clean
 *                            compliance attestations, avoided complaints
 *
 *   COLOR INVERSION: where stakes used red (#DC2626) as the alarm, this
 *   section introduces green (#22C55E) as the catch. Cream type stays the
 *   same. Background grades cooler (the analytical scan) then warms with
 *   green undertones (the resolution).
 */

/* ────────────────────────────────────────────────────────────────────────
   Hand-rolled scroll-progress hook (mirrors StakesCinema; kept self-
   contained so the two cinema sections can evolve independently).
   ──────────────────────────────────────────────────────────────────── */

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

    const tick = () => {
      measure();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

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

/* ────────────────────────────────────────────────────────────────────────
   Sentence data — same draft as the stakes section, plus the corrected
   dosage that replaces "4,000 mg" after the catch.
   ──────────────────────────────────────────────────────────────────── */

const DRAFT_SENTENCE =
  'Adults can safely take 4,000 mg of ibuprofen daily for chronic pain.';
const BAD_DOSAGE = '4,000 mg';
const GOOD_DOSAGE = '1,200 mg';
const DOSAGE_START = DRAFT_SENTENCE.indexOf(BAD_DOSAGE);
const DOSAGE_END = DOSAGE_START + BAD_DOSAGE.length;

const HEADLINE_LINES: { word: string; italic?: boolean }[][] = [
  [{ word: 'Nothing' }, { word: 'publishes' }],
  [{ word: 'under' }, { word: 'your' }, { word: 'name', italic: true }],
  [{ word: 'without' }, { word: 'proof.' }],
];

const PIPELINE_STAGES = [
  { id: 'phi', label: 'PHI', threshold: 0.22 },
  { id: 'source', label: 'SOURCE', threshold: 0.25 },
  { id: 'claim', label: 'CLAIM', threshold: 0.28 },
  { id: 'policy', label: 'POLICY', threshold: 0.32 },
] as const;

const POSITIVE_CHYRON_TEXT =
  '✓ AMLAW 100 FIRM AVOIDS BAR COMPLAINT WITH PRE-PUBLISH PRIVILEGE CHECK   ·   HOSPITAL CISO FILES CLEAN COMPLIANCE ATTESTATION FOR Q4   ·   FEDERAL AGENCY PUBLISHES § 508-COMPLIANT GUIDANCE WITH 988 ROUTING   ·   FUND COMPLIANCE OFFICER NOTES ZERO SUITABILITY FLAGS THIS QUARTER';

/* ────────────────────────────────────────────────────────────────────────
   Background grade — five color stops mapping to the resolution beats.
   Cooler than stakes during the scan, then warms into a green-tinted black
   as the catch lands.
   ──────────────────────────────────────────────────────────────────── */

function useBackgroundGrade(scrollYProgress: MotionValue<number>) {
  return useTransform(
    scrollYProgress,
    [0, 0.2, 0.46, 0.78, 1],
    ['#050912', '#040C16', '#03110E', '#020F0C', '#080A12'],
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Beat 1 + 2 — sentence types on; green scan line sweeps; pipeline status
   strip in the upper-right lights up stage-by-stage.
   ──────────────────────────────────────────────────────────────────── */

function DraftScanStage({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  // Type-on across 0.05 → 0.20.
  const typeProgress = useTransform(scrollYProgress, [0.05, 0.20], [0, 1], {
    clamp: true,
  });

  // Scan line sweeps across 0.20 → 0.32.
  const scanX = useTransform(scrollYProgress, [0.20, 0.34], [-0.02, 1.02], {
    clamp: true,
  });
  const scanOpacity = useTransform(
    scrollYProgress,
    [0.18, 0.22, 0.32, 0.36],
    [0, 1, 1, 0],
    { clamp: true },
  );

  // Stage fades out cleanly before the chyron + headline beat begins.
  const stageOpacity = useTransform(
    scrollYProgress,
    [0.05, 0.10, 0.58, 0.66],
    [0, 1, 1, 0],
    { clamp: true },
  );

  const charsRef = useRef<HTMLSpanElement[]>([]);
  const dosageRef = useRef<HTMLSpanElement[]>([]);

  // Type-on the chars (same craft as stakes — character-level opacity +
  // blur + translateY, driven imperatively from the motion value).
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

  // Dosage swap — "4,000 mg" fades out, "1,200 mg" fades in, in place,
  // across 0.36 → 0.44. Green ramp on the new chars.
  const swapOut = useTransform(scrollYProgress, [0.36, 0.42], [1, 0], {
    clamp: true,
  });
  const swapIn = useTransform(scrollYProgress, [0.38, 0.44], [0, 1], {
    clamp: true,
  });

  useEffect(() => {
    const apply = (outVal: number, inVal: number) => {
      // Bad dosage chars (still inside charsRef[DOSAGE_START..DOSAGE_END])
      for (let i = DOSAGE_START; i < DOSAGE_END; i++) {
        const el = charsRef.current[i];
        if (!el) continue;
        // Multiply with whatever the type-on phase wrote.
        const base = parseFloat(el.dataset.typeOpacity || '1');
        el.style.opacity = String(base * outVal);
      }
      // Good dosage chars — fade in green and slide up subtly.
      dosageRef.current.forEach((el) => {
        if (!el) return;
        el.style.opacity = String(inVal);
        el.style.transform = `translateY(${(1 - inVal) * 6}px)`;
      });
    };
    const handler = () => apply(swapOut.get(), swapIn.get());
    handler();
    const unsubOut = swapOut.on('change', handler);
    const unsubIn = swapIn.on('change', handler);
    return () => {
      unsubOut();
      unsubIn();
    };
  }, [swapOut, swapIn]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center px-6"
      style={{ opacity: stageOpacity }}
    >
      <div className="relative w-full max-w-[1280px]">
        {/* The sentence — single line, monospace cream. */}
        <div className="relative" data-cinema-redact>
          <p
            className="relative whitespace-nowrap text-[#F4EFE5] font-normal leading-[1.2] tracking-[-0.01em] text-[16px] sm:text-[22px] md:text-[26px] lg:text-[30px]"
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            }}
          >
            {renderCharsWithDosageSwap(charsRef, dosageRef)}
          </p>

          {/* Pipeline scan line — vertical green sliver that sweeps left → right. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-[140px] w-[3px] -translate-y-1/2"
            style={{
              left: useTransform(scanX, (x) => `${x * 100}%`),
              opacity: scanOpacity,
              background:
                'linear-gradient(180deg, rgba(34,197,94,0) 0%, rgba(34,197,94,0.95) 35%, rgba(34,197,94,0.95) 65%, rgba(34,197,94,0) 100%)',
              boxShadow:
                '0 0 24px 4px rgba(34,197,94,0.55), 0 0 6px 1px rgba(34,197,94,0.9)',
            }}
          />
        </div>

        {/* Pipeline status strip — upper-right, above the sentence area. */}
        <div className="pointer-events-none absolute -top-20 right-0 sm:-top-24">
          <PipelineStatus scrollYProgress={scrollYProgress} />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Render the sentence char-by-char. The dosage range is rendered TWICE in
 * the same physical span: once with the bad chars ("4,000 mg") that fade
 * out, and once with the good chars ("1,200 mg") that fade in. Both
 * occupy the same layout slot via absolute positioning, so the line
 * stays in place during the swap.
 */
function renderCharsWithDosageSwap(
  charsRef: React.MutableRefObject<HTMLSpanElement[]>,
  dosageRef: React.MutableRefObject<HTMLSpanElement[]>,
) {
  const out: React.ReactNode[] = [];
  for (let pos = 0; pos < DRAFT_SENTENCE.length; pos++) {
    if (pos === DOSAGE_START) {
      // Render the dosage swap group — bad chars in place, good chars layered above.
      const badChars: React.ReactNode[] = [];
      for (let j = DOSAGE_START; j < DOSAGE_END; j++) {
        const idx = j;
        const ch = DRAFT_SENTENCE[idx];
        badChars.push(
          <span
            key={`bad-${idx}`}
            ref={(el) => {
              if (el) charsRef.current[idx] = el;
            }}
            data-type-opacity="0"
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
      const goodChars: React.ReactNode[] = [];
      for (let j = 0; j < GOOD_DOSAGE.length; j++) {
        const idx = j;
        const ch = GOOD_DOSAGE[idx];
        goodChars.push(
          <span
            key={`good-${idx}`}
            ref={(el) => {
              if (el) dosageRef.current[idx] = el;
            }}
            style={{
              opacity: 0,
              display: 'inline-block',
              whiteSpace: ch === ' ' ? 'pre' : 'normal',
              color: '#22C55E',
              textShadow: '0 0 12px rgba(34,197,94,0.5)',
              willChange: 'opacity, transform',
            }}
          >
            {ch}
          </span>,
        );
      }
      out.push(
        <span key="dosage-swap" className="relative inline-block">
          {/* Bad chars — in flow, define the box width. */}
          <span aria-hidden={false}>{badChars}</span>
          {/* Good chars — absolutely layered on top of the bad chars. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ display: 'inline-block' }}
          >
            {goodChars}
          </span>
        </span>,
      );
      pos = DOSAGE_END - 1;
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
        data-type-opacity="0"
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

/* ────────────────────────────────────────────────────────────────────────
   Pipeline status strip — 4 stages light up sequentially as the scan
   sweeps across the sentence. Upper-right, monospace, minimal.
   ──────────────────────────────────────────────────────────────────── */

function PipelineStatus({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const stripOpacity = useTransform(
    scrollYProgress,
    [0.16, 0.22, 0.60, 0.66],
    [0, 1, 1, 0],
    { clamp: true },
  );
  return (
    <motion.div
      style={{ opacity: stripOpacity }}
      className="flex items-center gap-3 rounded-full border border-[#22C55E]/25 bg-[#020F0C]/60 px-4 py-2 backdrop-blur-sm"
    >
      {PIPELINE_STAGES.map((stage, i) => (
        <PipelineStage
          key={stage.id}
          scrollYProgress={scrollYProgress}
          threshold={stage.threshold}
          label={stage.label}
          isLast={i === PIPELINE_STAGES.length - 1}
        />
      ))}
    </motion.div>
  );
}

function PipelineStage({
  scrollYProgress,
  threshold,
  label,
  isLast,
}: {
  scrollYProgress: MotionValue<number>;
  threshold: number;
  label: string;
  isLast: boolean;
}) {
  // Dot fills with a snap when scroll crosses the threshold.
  const fill = useTransform(
    scrollYProgress,
    [threshold - 0.005, threshold + 0.005],
    [0, 1],
    { clamp: true },
  );
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <motion.div
          className="relative h-2 w-2 rounded-full"
          style={{
            backgroundColor: useTransform(fill, [0, 1], [
              'rgba(244,239,229,0.18)',
              '#22C55E',
            ]),
            boxShadow: useTransform(fill, [0, 1], [
              '0 0 0 0 rgba(34,197,94,0)',
              '0 0 10px 2px rgba(34,197,94,0.6)',
            ]),
          }}
        />
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F4EFE5]/85"
          style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
        >
          {label}
        </span>
      </div>
      {!isLast && (
        <div className="h-px w-6 bg-[#F4EFE5]/15" />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Beat 3 — BLOCKED chip + un-events. The chip drops in just as the catch
   happens. The "un-events" are the inverse of the stakes consequences —
   trade-press headlines that fade in faded, then fade out further to
   nothing (as if reality is correcting itself).
   ──────────────────────────────────────────────────────────────────── */

function CatchStage({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const chipY = useTransform(scrollYProgress, [0.34, 0.40], [-24, 0], {
    clamp: true,
  });
  const chipOpacity = useTransform(
    scrollYProgress,
    [0.34, 0.38, 0.60, 0.66],
    [0, 1, 1, 0],
    { clamp: true },
  );

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
      <div className="relative w-full max-w-[1280px]">
        {/* BLOCKED chip in upper-right, mirroring the FLAGGED chip in stakes. */}
        <motion.div
          className="absolute -top-32 right-2 sm:-top-36 sm:right-12"
          style={{ y: chipY, opacity: chipOpacity }}
          aria-hidden="true"
        >
          <span
            className="inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{
              backgroundColor: '#22C55E',
              color: '#020F0C',
              boxShadow: '3px 3px 0 rgba(34,197,94,0.25), 0 0 24px rgba(34,197,94,0.35)',
              transform: 'rotate(-1.4deg)',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            }}
          >
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#020F0C]" />
            Blocked · pre-publish
          </span>
        </motion.div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Beat 4 — proof URL types on, SHA-256 hash, chain blocks.
   ──────────────────────────────────────────────────────────────────── */

const PROOF_URL = 'assuredai.online/v/2148';
const SHA256 = '8f2a91c3ec5e4f72d098a614ab729cf3b21d4e6b21d';
const CHAIN_AUDITS = [
  { id: 2144, label: 'audit #2,144' },
  { id: 2145, label: 'audit #2,145' },
  { id: 2146, label: 'audit #2,146' },
  { id: 2147, label: 'audit #2,147' },
  { id: 2148, label: 'audit #2,148' },
];

function ProofStage({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  // Proof stage enters from below the now-settled thesis headline,
  // mirroring the way evidence cards enter the stakes section.
  const stageOpacity = useTransform(
    scrollYProgress,
    [0.78, 0.84, 0.97, 1.0],
    [0, 1, 1, 0],
    { clamp: true },
  );

  // Proof URL types on as the stage rises.
  const urlProgress = useTransform(scrollYProgress, [0.80, 0.90], [0, 1], {
    clamp: true,
  });
  const hashProgress = useTransform(scrollYProgress, [0.84, 0.94], [0, 1], {
    clamp: true,
  });
  // Lift from below — mirrors evidence card entry y in stakes.
  const stageY = useTransform(scrollYProgress, [0.78, 0.88], [120, 0], {
    clamp: true,
  });

  const urlRef = useRef<HTMLSpanElement[]>([]);
  const hashRef = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    const apply = (latest: number, refList: HTMLSpanElement[], total: number) => {
      const revealed = latest * total;
      refList.forEach((el, i) => {
        if (!el) return;
        const t = Math.max(0, Math.min(1, revealed - i));
        el.style.opacity = String(t);
      });
    };
    const handleUrl = (v: number) => apply(v, urlRef.current, PROOF_URL.length);
    const handleHash = (v: number) => apply(v, hashRef.current, SHA256.length);
    handleUrl(urlProgress.get());
    handleHash(hashProgress.get());
    const unsubUrl = urlProgress.on('change', handleUrl);
    const unsubHash = hashProgress.on('change', handleHash);
    return () => {
      unsubUrl();
      unsubHash();
    };
  }, [urlProgress, hashProgress]);

  return (
    <motion.div
      className="absolute inset-x-0 flex flex-col items-center justify-center px-6"
      style={{
        opacity: stageOpacity,
        y: stageY,
        // Sit in the lower half, well below the thesis headline (which lives
        // in the upper third) and well above the chyron strip at the bottom.
        top: '52%',
        bottom: '72px',
      }}
      aria-hidden="true"
    >
      {/* Proof URL — typed-on character-by-character, cream on dark. */}
      <div
        className="text-center text-[20px] sm:text-[28px] md:text-[34px] lg:text-[40px] text-[#F4EFE5] font-medium tracking-[-0.005em]"
        style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
      >
        {PROOF_URL.split('').map((ch, i) => (
          <span
            key={i}
            ref={(el) => {
              if (el) urlRef.current[i] = el;
            }}
            style={{
              opacity: 0,
              display: 'inline-block',
              color: i >= 'assuredai.online/'.length ? '#22C55E' : '#F4EFE5',
              textShadow:
                i >= 'assuredai.online/'.length
                  ? '0 0 14px rgba(34,197,94,0.45)'
                  : 'none',
            }}
          >
            {ch}
          </span>
        ))}
      </div>

      {/* SHA-256 hash — smaller, muted. */}
      <div
        className="mt-4 text-center text-[11px] sm:text-[12px] md:text-[13px] tracking-[0.1em] text-[#F4EFE5]/55"
        style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
      >
        <span className="mr-2 text-[#22C55E]/85">SHA-256</span>
        {SHA256.split('').map((ch, i) => (
          <span
            key={i}
            ref={(el) => {
              if (el) hashRef.current[i] = el;
            }}
            style={{ opacity: 0, display: 'inline-block' }}
          >
            {ch}
          </span>
        ))}
      </div>

      {/* Chain blocks — five green-stroked rounded squares, connected. */}
      <div className="mt-10 hidden items-center gap-3 sm:flex">
        <ChainBlocks scrollYProgress={scrollYProgress} />
      </div>
    </motion.div>
  );
}

function ChainBlocks({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  return (
    <>
      {CHAIN_AUDITS.map((audit, i) => {
        const t = 0.88 + i * 0.012;
        return (
          <ChainBlock
            key={audit.id}
            scrollYProgress={scrollYProgress}
            threshold={t}
            label={audit.label}
            isHead={i === CHAIN_AUDITS.length - 1}
            isLast={i === CHAIN_AUDITS.length - 1}
          />
        );
      })}
    </>
  );
}

function ChainBlock({
  scrollYProgress,
  threshold,
  label,
  isHead,
  isLast,
}: {
  scrollYProgress: MotionValue<number>;
  threshold: number;
  label: string;
  isHead: boolean;
  isLast: boolean;
}) {
  const opacity = useTransform(
    scrollYProgress,
    [threshold - 0.005, threshold + 0.005],
    [0, 1],
    { clamp: true },
  );
  const scale = useTransform(
    scrollYProgress,
    [threshold - 0.005, threshold + 0.02],
    [0.7, 1],
    { clamp: true },
  );
  return (
    <>
      <motion.div
        style={{ opacity, scale }}
        className="relative flex items-center justify-center rounded-md border border-[#22C55E]/70 bg-[#020F0C]/40 px-3 py-2 backdrop-blur-sm"
      >
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#F4EFE5]/85"
          style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
        >
          {label}
        </span>
        {isHead && (
          <span
            className="absolute -top-3 right-0 text-[8px] font-bold uppercase tracking-[0.22em] text-[#22C55E]"
            style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
          >
            head
          </span>
        )}
      </motion.div>
      {!isLast && (
        <motion.div
          style={{ opacity }}
          className="h-px w-6 bg-gradient-to-r from-[#22C55E]/70 to-[#22C55E]/30"
        />
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Beat 5 — the headline rises into the upper third as a permanent thesis,
   same craft as the stakes headline but three lines and italic on "name".
   ──────────────────────────────────────────────────────────────────── */

function HeadlineStage({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  // Headline lifecycle (mirrors the stakes section):
  //   0.55 → 0.65   ENTRY    headline rises full-size at center
  //   0.65 → 0.72   SETTLE   shrinks + translates to upper third (thesis bar)
  //   0.72 → 0.97   HOLD     stays as thesis while proof + chyron accumulate
  //   0.97 → 1.0    EXIT     fades for unpin
  const stageOpacity = useTransform(
    scrollYProgress,
    [0.55, 0.62, 0.97, 1.0],
    [0, 1, 1, 0],
    { clamp: true },
  );
  // Scale: 0.62 (entry) → 1.0 (full landing) → 0.62 (thesis bar settle)
  const scale = useTransform(
    scrollYProgress,
    [0.55, 0.65, 0.72, 0.78],
    [0.62, 1, 1, 0.62],
    { clamp: true },
  );
  const tracking = useTransform(scale, [0.62, 1], [-0.01, -0.04]);
  // y: entry from below → center → rises into upper third
  const y = useTransform(
    scrollYProgress,
    [0.55, 0.65, 0.72, 0.78],
    [40, 0, 0, -240],
    { clamp: true },
  );

  // Trigger chromatic aberration once when crossing 0.57.
  const [aberrant, setAberrant] = useState(false);
  useEffect(() => {
    const onChange = (latest: number) => {
      setAberrant((prev) => {
        if (!prev && latest > 0.57) return true;
        if (prev && latest < 0.54) return false;
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
        className="text-center font-medium leading-[0.96] text-[#F4EFE5]"
        style={{
          fontFamily:
            'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          letterSpacing: tracking,
          fontSize: 'clamp(34px, 8vw, 116px)',
        }}
      >
        {HEADLINE_LINES.map((line, lineIdx) => (
          <span key={lineIdx} className="block whitespace-nowrap">
            {line.map((w, i) => (
              <span key={i}>
                <span
                  className={[
                    'inline-block',
                    w.italic ? 'italic' : '',
                    aberrant ? 'cinema-aberrant' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
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
                </span>
                {i < line.length - 1 ? ' ' : ''}
              </span>
            ))}
          </span>
        ))}
      </motion.h2>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Beat 6 — positive chyron at the bottom. Same scrolling mechanic as the
   stakes chyron, GREEN instead of red, un-events instead of headlines.
   ──────────────────────────────────────────────────────────────────── */

function PositiveChyronStrip() {
  return (
    <div
      className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex h-9 items-center overflow-hidden bg-[#22C55E] text-[#020F0C]"
      aria-hidden="true"
    >
      <div className="cinema-chyron-track flex shrink-0 whitespace-nowrap">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-6 pr-6 text-[11px] font-bold uppercase tracking-[0.22em] sm:text-[12px]"
            style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
          >
            <span>{POSITIVE_CHYRON_TEXT}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Reduced-motion fork — static stacked layout, same content.
   ──────────────────────────────────────────────────────────────────── */

function ResolutionCinemaStatic() {
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const inView1 = useInView(ref1, { once: true, margin: '-25% 0px -25% 0px' });
  const inView2 = useInView(ref2, { once: true, margin: '-25% 0px -25% 0px' });

  return (
    <section
      aria-labelledby="resolution-headline-static"
      className="relative bg-[#050912] text-[#F4EFE5]"
    >
      <div className="mx-auto max-w-[1100px] px-6 py-32">
        <p
          className="text-balance leading-[1.5] text-[20px] sm:text-[28px] md:text-[34px]"
          style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
        >
          Adults can safely take{' '}
          <span style={{ color: '#22C55E', textDecoration: 'line-through', textDecorationColor: 'rgba(244,239,229,0.4)' }}>
            4,000 mg
          </span>{' '}
          <span style={{ color: '#22C55E' }}>1,200 mg</span> of ibuprofen daily for chronic pain.
        </p>
        <p className="mt-6 text-[12px] tracking-[0.1em] text-[#F4EFE5]/60">
          {PROOF_URL} · SHA-256 {SHA256.slice(0, 16)}…
        </p>
      </div>
      <div ref={ref1} className="mx-auto max-w-[1100px] px-6 pb-32">
        <motion.h2
          id="resolution-headline-static"
          initial={{ opacity: 0, y: 24 }}
          animate={inView1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-medium leading-[1.0] tracking-[-0.03em]"
          style={{
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontSize: 'clamp(40px, 9vw, 116px)',
          }}
        >
          Nothing publishes
          <br />
          under your{' '}
          <span style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic' }}>
            name
          </span>
          <br />
          without proof.
        </motion.h2>
      </div>
      <div ref={ref2} className="overflow-hidden bg-[#22C55E] text-[#020F0C]">
        <div
          className="px-6 py-3 text-[12px] font-bold uppercase tracking-[0.22em]"
          style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
        >
          {POSITIVE_CHYRON_TEXT}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Public component — picks cinematic or static fork based on reduce-motion.
   ──────────────────────────────────────────────────────────────────── */

export function ResolutionCinema() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const scrollYProgress = useSectionProgress(sectionRef);
  const backgroundColor = useBackgroundGrade(scrollYProgress);

  if (mounted && reduceMotion) {
    return <ResolutionCinemaStatic />;
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="resolution-headline"
      className="cinema-stage relative isolate"
      style={{ height: '380vh', background: '#050912' }}
    >
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

        {/* Film grain plate — shared with stakes section. */}
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

        {/* Beat 1 + 2 + 3 — sentence types on, scan sweeps, pipeline status,
            dosage swap, BLOCKED chip. */}
        <DraftScanStage scrollYProgress={scrollYProgress} />
        <CatchStage scrollYProgress={scrollYProgress} />

        {/* Beat 4 — proof URL + hash + chain. */}
        <ProofStage scrollYProgress={scrollYProgress} />

        {/* Beat 5 — headline thesis. */}
        <HeadlineStage scrollYProgress={scrollYProgress} />

        {/* Beat 6 — positive chyron, gated. */}
        <BeatGate
          scrollYProgress={scrollYProgress}
          range={[0.88, 0.94, 1.0, 1.0]}
        >
          <PositiveChyronStrip />
        </BeatGate>

        {/* Eyebrow — flips identity from "stakes" to "the catch". */}
        <div className="pointer-events-none absolute left-6 top-6 z-30 sm:left-10 sm:top-10">
          <span
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F4EFE5]/90"
            style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.7)]"
            />
            The catch
          </span>
        </div>
      </motion.div>
    </section>
  );
}

/* Beat gate helper — fades children in/out across a 4-point opacity range. */
function BeatGate({
  scrollYProgress,
  range,
  children,
}: {
  scrollYProgress: MotionValue<number>;
  range: [number, number, number, number];
  children: React.ReactNode;
}) {
  const opacity = useTransform(scrollYProgress, range, [0, 1, 1, 0], {
    clamp: true,
  });
  return (
    <motion.div style={{ opacity }} className="absolute inset-0 z-20 pointer-events-none">
      {children}
    </motion.div>
  );
}
