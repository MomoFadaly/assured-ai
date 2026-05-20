'use client';

import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValueEvent,
  type MotionValue,
} from 'framer-motion';
import { Fragment, useRef } from 'react';

/**
 * OneBadSentence — Coda.co-style sticky-pin stakes moment.
 *
 *   Behavior (matches coda.co):
 *   - The section is TALL (~350vh). Inside it, a sticky inner container
 *     pins the eyebrow + dashed connector + huge centered headline in the
 *     viewport while the user scrolls through the section's height.
 *   - The paragraph is broken into chunks. Each chunk rises from below the
 *     headline, holds at center, then fades + rises out as scroll continues
 *     and the next chunk takes its place.
 *   - Headline word-by-word reveal triggers when the section first enters
 *     the viewport (only fires once).
 *
 *   Typography:
 *   - Headline: Inter @ 900 + uppercase + tight tracking — closest free
 *     match to Coda's ABC Monument Grotesk Heavy.
 *   - Chunks: Inter regular, 22–28px depending on viewport.
 */

const EYEBROW = 'The stakes';

const HEADLINE_LINES = [
  ['One', 'bad', 'sentence'],
  ['is', 'all', 'it', 'takes.'],
];

// Mo's exact paragraph broken into ladder chunks for staged reveal
const CHUNKS = [
  'A lawsuit.',
  'A regulator letter.',
  'A CNN headline that follows your brand for ten years.',
  'AssuredAI catches the sentence before it ships — verified, redacted, disclaimer-injected, hash-chained.',
  'Public proof URL on every piece your team publishes.',
];

const WORD_REVEAL = {
  hidden: { y: 36, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      delay: 0.18 + i * 0.045,
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

function Chunk({
  text,
  index,
  total,
  scrollProgress,
}: {
  text: string;
  index: number;
  total: number;
  scrollProgress: MotionValue<number>;
}) {
  // Carve up the scroll progress into one window per chunk. Each chunk
  // does a triangular reveal across its window: rises in from below, peaks
  // at center, fades out as it continues rising upward.
  const head = 0.18;
  const tail = 0.08;
  const windowSize = (1 - head - tail) / total;
  const windowStart = head + index * windowSize;
  const windowMid = windowStart + windowSize / 2;
  const windowEnd = windowStart + windowSize;

  const opacity = useTransform(
    scrollProgress,
    [windowStart, windowMid, windowEnd],
    [0, 1, 0],
  );
  const y = useTransform(scrollProgress, [windowStart, windowEnd], [120, -120]);

  // Direct DOM mutation — bypass any motion-element style propagation quirks
  // by writing opacity + transform to the element on every scroll tick.
  const pRef = useRef<HTMLParagraphElement>(null);
  useMotionValueEvent(opacity, 'change', (latest) => {
    if (pRef.current) pRef.current.style.opacity = String(latest);
  });
  useMotionValueEvent(y, 'change', (latest) => {
    if (pRef.current) pRef.current.style.transform = `translateY(${latest}px)`;
  });

  return (
    <p
      ref={pRef}
      style={{ opacity: 0, transform: 'translateY(120px)', willChange: 'opacity, transform' }}
      className="absolute inset-x-0 mx-auto max-w-[760px] text-center text-[20px] leading-[1.55] text-[#F4EFE5]/85 sm:text-[24px] sm:leading-[1.5]"
    >
      {text}
    </p>
  );
}

export function OneBadSentence() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineTriggerRef = useRef<HTMLDivElement>(null);

  // Drives the chunk reveals across the section's full scroll height
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // Drives the one-time headline word-by-word reveal as the section enters
  const headlineInView = useInView(headlineTriggerRef, {
    once: true,
    margin: '-30% 0px -30% 0px',
  });

  let wordIdx = 0;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="stakes-headline"
      className="relative isolate bg-[#050912] text-[#F4EFE5]"
      // Tall outer height so the sticky inner container has room to scroll
      // through. ~55vh per chunk + 30vh head + 20vh tail ≈ 325vh for 5 chunks
      style={{ height: `${30 + CHUNKS.length * 55 + 20}vh` }}
    >
      {/* Subtle radial glow centered behind the headline for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(34,211,238,0.05)_0%,transparent_70%)]"
      />

      {/* Sticky inner — pins headline in the viewport as user scrolls */}
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden px-5">
        {/* Eyebrow pill + dashed connector + headline cluster */}
        <div ref={headlineTriggerRef} className="flex flex-col items-center">
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: -8 }}
            animate={headlineInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center rounded-full border border-dashed border-[#F4EFE5]/40 px-4 py-1.5">
              <span
                className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#F4EFE5]/80"
                style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
              >
                {EYEBROW}
              </span>
            </div>
            <div
              aria-hidden="true"
              className="mt-3 h-10 border-l border-dashed border-[#F4EFE5]/30"
            />
          </motion.div>

          {/* Huge headline, 2 lines, word-by-word reveal */}
          <h2
            id="stakes-headline"
            className="mt-6 text-center font-black uppercase leading-[0.95] tracking-[-0.02em] text-[#F4EFE5] text-[40px] sm:text-[60px] md:text-[80px] lg:text-[100px] xl:text-[116px]"
            style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
          >
            {HEADLINE_LINES.map((line, lineIdx) => (
              <span key={lineIdx} className="block whitespace-nowrap">
                {line.map((word, idx) => {
                  const i = wordIdx++;
                  const isLast = idx === line.length - 1;
                  return (
                    <Fragment key={`${lineIdx}-${i}`}>
                      <motion.span
                        className="inline-block"
                        custom={i}
                        variants={WORD_REVEAL}
                        initial="hidden"
                        animate={headlineInView ? 'visible' : 'hidden'}
                      >
                        {word}
                      </motion.span>
                      {!isLast && ' '}
                    </Fragment>
                  );
                })}
              </span>
            ))}
          </h2>
        </div>

        {/* Chunk stack — absolute positioning, each chunk independently
            scroll-driven. They share one centered slot below the headline. */}
        <div className="relative mt-16 h-[120px] w-full max-w-[1200px] sm:mt-20 sm:h-[140px]">
          {CHUNKS.map((chunk, i) => (
            <Chunk
              key={i}
              text={chunk}
              index={i}
              total={CHUNKS.length}
              scrollProgress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
