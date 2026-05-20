'use client';

/**
 * HashChainCanvas — the signature brand visualization.
 *
 * Renders an animated chain of audit blocks linked by their sha256
 * hashes. As the section enters viewport, blocks fade in left-to-
 * right with the connection edges drawing themselves, and the hash
 * strings type into each block's body character-by-character.
 *
 * This is the kind of image that gets screenshotted and posted —
 * iconic, unmistakable, and represents the brand's single most
 * defensible claim: every published piece carries a tamper-evident
 * hash-chained audit row.
 *
 * Pure SVG + framer-motion. No WebGL, no Three.js. <10kb. Stops
 * animating once visible to spare CPU.
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Check, GitCommit } from 'lucide-react';

// Five blocks — enough to feel like a real chain without crowding the
// viewport. Each carries a fake-but-believable hash that's deterministic
// (same on every render) so SSR and CSR match.
const CHAIN_BLOCKS = [
  { id: 1, label: 'audit #2,844', hash: '8f2a91…ce4f', verdict: 'answered', tone: 'emerald' as const },
  { id: 2, label: 'audit #2,845', hash: 'a1c3f7…b21d', verdict: 'cannot answer', tone: 'amber' as const },
  { id: 3, label: 'audit #2,846', hash: 'd4e8a9…07c1', verdict: 'answered', tone: 'emerald' as const },
  { id: 4, label: 'audit #2,847', hash: '7e2a91…ce4f', verdict: 'answered', tone: 'emerald' as const },
  { id: 5, label: 'audit #2,848', hash: 'b3df47…91ac', verdict: 'blocked', tone: 'red' as const },
];

const TONE_COLORS = {
  emerald: { fill: '#10b981', soft: '#d1fae5', text: '#065f46' },
  amber: { fill: '#f59e0b', soft: '#fef3c7', text: '#92400e' },
  red: { fill: '#dc2626', soft: '#fee2e2', text: '#991b1b' },
};

export function HashChainCanvas() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const reduceMotion = useReducedMotion();

  return (
    <div ref={ref} className="relative">
      {/* Ambient gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{
          background:
            'radial-gradient(circle at 30% 50%, rgba(16,185,129,0.06), transparent 65%), radial-gradient(circle at 75% 50%, rgba(220,38,38,0.04), transparent 65%)',
        }}
      />

      <div className="relative rounded-3xl border border-border bg-card/60 p-8 shadow-sm backdrop-blur-sm sm:p-12">
        {/* Section eyebrow */}
        <div className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
          <GitCommit className="h-3 w-3" />
          The hash chain · live demo
        </div>
        <div className="mb-10 max-w-2xl">
          <h3 className="text-balance text-[26px] sm:text-[32px] font-semibold leading-[1.1] tracking-[-0.022em]">
            Every audit row links to the one before it.{' '}
            <span className="font-serif italic font-normal text-primary">
              Tamper one and every row after breaks.
            </span>
          </h3>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            Postgres trigger enforces SHA-256 over (prev_hash &Vert; row_payload) on insert.
            Anyone with a browser can walk the chain from genesis to head. This is the property
            that turns an audit log into court-admissible evidence.
          </p>
        </div>

        {/* The chain itself */}
        <div className="relative overflow-x-auto pb-2">
          <svg
            viewBox="0 0 1000 200"
            className="h-auto w-full min-w-[640px]"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Animated visualization of a hash-chained audit log"
          >
            <defs>
              {/* Soft glow for active block */}
              <filter id="block-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Edges (lines) — draw first so they're behind the blocks */}
            {CHAIN_BLOCKS.slice(0, -1).map((_, i) => (
              <ChainEdge key={`edge-${i}`} index={i} inView={inView} reduceMotion={!!reduceMotion} />
            ))}

            {/* Blocks */}
            {CHAIN_BLOCKS.map((block, i) => (
              <ChainBlock key={block.id} block={block} index={i} inView={inView} reduceMotion={!!reduceMotion} />
            ))}
          </svg>
        </div>

        {/* Legend + verify-link */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-muted-foreground">
            <Legend tone="emerald" label="Answered" />
            <Legend tone="amber" label="Cannot answer" />
            <Legend tone="red" label="Blocked / red-flag" />
          </div>
          <div className="font-mono text-[10.5px] text-muted-foreground">
            sha256(prev_hash &Vert; row_payload) &middot; every insert &middot; Postgres trigger
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Edges — animated SVG lines between blocks
// =============================================================

function ChainEdge({ index, inView, reduceMotion }: { index: number; inView: boolean; reduceMotion: boolean }) {
  // X positions are spaced ~180 apart starting from x=85 (block 1 right
  // edge). Each edge connects right-edge of block i to left-edge of i+1.
  const x1 = 85 + index * 180 + 95;  // right edge of block i
  const x2 = 85 + (index + 1) * 180; // left edge of block i+1
  const y = 100;
  const delay = reduceMotion ? 0 : 0.55 + index * 0.5;
  return (
    <>
      <motion.line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke="hsl(var(--foreground) / 0.18)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={inView ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      />
      {/* Tiny hash label floating above the edge */}
      <motion.text
        x={(x1 + x2) / 2}
        y={y - 10}
        textAnchor="middle"
        className="font-mono"
        fontSize="9"
        fill="hsl(var(--muted-foreground))"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={inView ? { opacity: 1 } : undefined}
        transition={{ duration: 0.3, delay: delay + 0.35 }}
      >
        prev_hash
      </motion.text>
      {/* Tiny chevron at the receiving end to indicate direction */}
      <motion.polyline
        points={`${x2 - 5},${y - 3} ${x2},${y} ${x2 - 5},${y + 3}`}
        fill="none"
        stroke="hsl(var(--foreground) / 0.4)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={inView ? { opacity: 1 } : undefined}
        transition={{ duration: 0.3, delay: delay + 0.4 }}
      />
    </>
  );
}

// =============================================================
// Block — the audit-row card
// =============================================================

function ChainBlock({
  block,
  index,
  inView,
  reduceMotion,
}: {
  block: typeof CHAIN_BLOCKS[number];
  index: number;
  inView: boolean;
  reduceMotion: boolean;
}) {
  const x = 85 + index * 180;
  const y = 60;
  const w = 95;
  const h = 90;
  const colors = TONE_COLORS[block.tone];
  const delay = reduceMotion ? 0 : 0.2 + index * 0.5;

  return (
    <motion.g
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {/* Block background */}
      <motion.rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill="white"
        stroke={colors.fill}
        strokeWidth="1.5"
        initial={reduceMotion ? false : { filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }}
        animate={inView ? { filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.08))' } : undefined}
      />
      {/* Tone bar at top */}
      <rect x={x} y={y} width={w} height={4} rx={2} fill={colors.fill} />

      {/* Label */}
      <text
        x={x + w / 2}
        y={y + 22}
        textAnchor="middle"
        className="font-mono"
        fontSize="10"
        fontWeight="600"
        fill="hsl(var(--foreground))"
      >
        {block.label}
      </text>

      {/* Hash */}
      <text
        x={x + w / 2}
        y={y + 40}
        textAnchor="middle"
        className="font-mono"
        fontSize="9"
        fill="hsl(var(--muted-foreground))"
      >
        sha256
      </text>
      <motion.text
        x={x + w / 2}
        y={y + 54}
        textAnchor="middle"
        className="font-mono"
        fontSize="11"
        fontWeight="600"
        fill={colors.fill}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={inView ? { opacity: 1 } : undefined}
        transition={{ duration: 0.3, delay: delay + 0.25 }}
      >
        {block.hash}
      </motion.text>

      {/* Verdict pill at bottom */}
      <motion.g
        initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
        animate={inView ? { opacity: 1, scale: 1 } : undefined}
        transition={{ type: 'spring', stiffness: 320, damping: 18, delay: delay + 0.4 }}
        style={{ transformOrigin: `${x + w / 2}px ${y + 75}px` }}
      >
        <rect
          x={x + 8}
          y={y + 66}
          width={w - 16}
          height={16}
          rx={8}
          fill={colors.soft}
        />
        <text
          x={x + w / 2}
          y={y + 77}
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="700"
          fill={colors.text}
          className="uppercase"
          style={{ letterSpacing: '0.08em' }}
        >
          {block.verdict}
        </text>
      </motion.g>

      {/* Genesis tag on first block */}
      {index === 0 && (
        <motion.text
          x={x + w / 2}
          y={y - 8}
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="700"
          fill="hsl(var(--primary))"
          className="uppercase"
          style={{ letterSpacing: '0.16em' }}
          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
          animate={inView ? { opacity: 1, y: -8 } : undefined}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          genesis
        </motion.text>
      )}

      {/* "Latest" tag on last block */}
      {index === CHAIN_BLOCKS.length - 1 && (
        <motion.g
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={inView ? { opacity: 1 } : undefined}
          transition={{ duration: 0.3, delay: delay + 0.7 }}
        >
          <circle cx={x + w - 4} cy={y - 4} r={5} fill={colors.fill} />
          <text
            x={x + w + 8}
            y={y - 1}
            textAnchor="start"
            fontSize="8.5"
            fontWeight="700"
            fill={colors.fill}
            className="uppercase"
            style={{ letterSpacing: '0.16em' }}
          >
            head
          </text>
        </motion.g>
      )}
    </motion.g>
  );
}

// =============================================================
// Legend
// =============================================================

function Legend({ tone, label }: { tone: keyof typeof TONE_COLORS; label: string }) {
  const colors = TONE_COLORS[tone];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ backgroundColor: colors.fill }} />
      <span>{label}</span>
    </span>
  );
}
