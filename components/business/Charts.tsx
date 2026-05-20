'use client';

/**
 * Custom SVG-based data visualizations for the /business brief.
 * Hand-rolled to match the brand visual language (Fraunces / emerald /
 * editorial spacing) instead of leaning on Recharts default chrome.
 *
 *  - <SAMTreemap>          §03 — $1.47B SAM split across 8 verticals
 *                          (orphaned — superseded by MarketMap)
 *  - <PositioningQuadrant> §02 — 2×2 competitive map (orphaned —
 *                          replaced by the convergence vacuum grid)
 *  - <ARRTrajectory>       §07 — Y0 → Y3 → Y5 → Y10 line chart
 *  - <RevenueDonut>        §06 — Y3 ARR mix donut
 *  - <SeriesABubble>       §06 — capital raised comparison
 *  - <EnforcementTimeline> §01 — 2024 enforcement timeline
 */

import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────
// <SAMTreemap>
// Squarified treemap: ranks verticals by SAM, lays them out in rows.
// Sized for full-width responsive container with aspect ratio.
// ─────────────────────────────────────────────────────────────────────────

const SAM_VERTICALS: Array<{ name: string; sam: number; color: string; tag?: string }> = [
  { name: 'Finance', sam: 400, color: '#10b981' },
  { name: 'Healthcare', sam: 300, color: '#047857', tag: 'Lead Y1' },
  { name: 'Insurance', sam: 240, color: '#0d9488' },
  { name: 'Real Estate', sam: 200, color: '#6ee7b7' },
  { name: 'Higher Ed', sam: 130, color: '#a7f3d0' },
  { name: 'Government', sam: 120, color: '#059669', tag: 'Lead Y1' },
  { name: 'Pharma & Life Sci', sam: 60, color: '#0f766e' },
  { name: 'Legal', sam: 15, color: '#34d399' },
];

interface TreemapNode {
  vertical: typeof SAM_VERTICALS[number];
  x: number;
  y: number;
  w: number;
  h: number;
}

function layoutTreemap(width: number, height: number): TreemapNode[] {
  // Simple squarified treemap layout
  const total = SAM_VERTICALS.reduce((s, v) => s + v.sam, 0);
  const ratio = (width * height) / total;
  const nodes: TreemapNode[] = [];

  // Row 1 (top): Finance (largest) + Healthcare
  // Row 2 (middle): Insurance + Real Estate + Higher Ed
  // Row 3 (bottom): Government + Pharma + Legal

  // Hand-tuned for visual balance.
  // Non-null assertions: SAM_VERTICALS is a static const array with
  // exactly 8 entries — TS treats indexed access as possibly
  // undefined under noUncheckedIndexedAccess, but indices 0-7 are
  // guaranteed populated at compile time.
  const fin = SAM_VERTICALS[0]!;
  const hc = SAM_VERTICALS[1]!;
  const ins = SAM_VERTICALS[2]!;
  const re = SAM_VERTICALS[3]!;
  const he = SAM_VERTICALS[4]!;
  const gov = SAM_VERTICALS[5]!;
  const ph = SAM_VERTICALS[6]!;
  const lg = SAM_VERTICALS[7]!;

  // Top row: 60% height. Finance gets ~57%, Healthcare ~43%
  const topH = height * 0.6;
  const topRowTotal = fin.sam + hc.sam; // 700
  nodes.push({ vertical: fin, x: 0, y: 0, w: width * (fin.sam / topRowTotal), h: topH });
  nodes.push({ vertical: hc, x: width * (fin.sam / topRowTotal), y: 0, w: width * (hc.sam / topRowTotal), h: topH });

  // Middle row: 23% height. Insurance / Real Estate / Higher Ed
  const midH = height * 0.23;
  const midRowTotal = ins.sam + re.sam + he.sam; // 570
  let cx = 0;
  for (const v of [ins, re, he]) {
    const w = width * (v.sam / midRowTotal);
    nodes.push({ vertical: v, x: cx, y: topH, w, h: midH });
    cx += w;
  }

  // Bottom row: 17% height. Government / Pharma / Legal
  const botH = height - topH - midH;
  const botRowTotal = gov.sam + ph.sam + lg.sam; // 195
  cx = 0;
  for (const v of [gov, ph, lg]) {
    const w = width * (v.sam / botRowTotal);
    nodes.push({ vertical: v, x: cx, y: topH + midH, w, h: botH });
    cx += w;
  }

  return nodes;
}

export function SAMTreemap() {
  const W = 1200;
  const H = 600;
  const nodes = layoutTreemap(W, H);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Treemap of $1.47B US SAM across 8 regulated verticals"
      >
        {nodes.map((n, i) => {
          const samStr = `$${n.vertical.sam}M`;
          const isSmall = n.w < 120 || n.h < 80;
          return (
            <motion.g
              key={n.vertical.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.5, delay: 0.05 + i * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <rect
                x={n.x + 4}
                y={n.y + 4}
                width={Math.max(0, n.w - 8)}
                height={Math.max(0, n.h - 8)}
                rx={6}
                fill={n.vertical.color}
                fillOpacity={0.18}
                stroke={n.vertical.color}
                strokeOpacity={0.5}
                strokeWidth={1.5}
              />
              <text
                x={n.x + 22}
                y={n.y + (isSmall ? 28 : 52)}
                fill={n.vertical.color}
                fontFamily="var(--font-display), serif"
                fontSize={isSmall ? 14 : 22}
                fontWeight={500}
                letterSpacing="-0.01em"
              >
                {n.vertical.name}
              </text>
              <text
                x={n.x + 22}
                y={n.y + (isSmall ? 50 : 96)}
                fill="currentColor"
                className="text-foreground"
                fontFamily="var(--font-display), serif"
                fontSize={isSmall ? 26 : 56}
                fontWeight={500}
                letterSpacing="-0.025em"
              >
                {samStr}
              </text>
              {n.vertical.tag && !isSmall ? (
                <text
                  x={n.x + 22}
                  y={n.y + 126}
                  fill={n.vertical.color}
                  fontFamily="var(--font-geist-mono), monospace"
                  fontSize={12}
                  letterSpacing="0.18em"
                >
                  {n.vertical.tag.toUpperCase()}
                </text>
              ) : null}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// <PositioningQuadrant>
// 2×2 competitive map. X-axis: single-vertical → multi-vertical
// Y-axis: backend infra → editorial-UX layer
// AssuredAI lives in the "multi-vertical × editorial-UX" unoccupied quadrant.
// ─────────────────────────────────────────────────────────────────────────

const QUADRANT_COMPANIES: Array<{
  name: string;
  x: number; // 0-100, 0 = single-vertical, 100 = multi-vertical
  y: number; // 0-100, 0 = backend infra, 100 = editorial UX
  color: string;
  highlighted?: boolean;
  description?: string;
}> = [
  { name: 'Lithero', x: 8, y: 80, color: '#6b7280', description: 'Pharma MLR · seed-stage peer' },
  { name: 'Veeva', x: 25, y: 25, color: '#FF7300', description: '$26.9B · life sciences' },
  { name: 'Veeva QC', x: 22, y: 60, color: '#FF7300' },
  { name: 'JSL / Pythia', x: 18, y: 12, color: '#6b7280', description: 'Data scientists, not editors' },
  { name: 'Grammarly', x: 92, y: 88, color: '#15C39A', description: '$13B · default writing layer' },
  { name: 'Writer.com', x: 70, y: 55, color: '#888888', description: 'LLM platform' },
  { name: 'OneTrust', x: 75, y: 18, color: '#2E2E2E', description: '$4.5B · privacy default' },
  { name: 'Vanta', x: 82, y: 22, color: '#0F2D2A', description: '$2.45B · SOC 2 evidence' },
  { name: 'Securiti', x: 78, y: 15, color: '#0EA5B0', description: '$1.725B · acquired Oct 2025' },
  { name: 'AssuredAI', x: 80, y: 78, color: '#047857', highlighted: true, description: '8 verticals · editor-layer · the only complete row' },
];

export function PositioningQuadrant() {
  const W = 800;
  const H = 600;
  const PAD = 80;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const xPos = (x: number) => PAD + (x / 100) * innerW;
  const yPos = (y: number) => H - PAD - (y / 100) * innerH;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="2×2 positioning quadrant of competitive landscape"
      >
        {/* Quadrant background */}
        <rect x={PAD} y={PAD} width={innerW} height={innerH} fill="currentColor" className="text-foreground/[0.015]" />

        {/* Highlight unoccupied quadrant (top-right) — where AssuredAI sits */}
        <rect
          x={PAD + innerW * 0.5}
          y={PAD}
          width={innerW * 0.5}
          height={innerH * 0.5}
          fill="#047857"
          fillOpacity={0.04}
        />

        {/* Center cross axes */}
        <line
          x1={PAD + innerW / 2}
          y1={PAD}
          x2={PAD + innerW / 2}
          y2={H - PAD}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <line
          x1={PAD}
          y1={PAD + innerH / 2}
          x2={W - PAD}
          y2={PAD + innerH / 2}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Outer frame */}
        <rect x={PAD} y={PAD} width={innerW} height={innerH} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5} />

        {/* Axis labels */}
        <text x={W / 2} y={H - 20} textAnchor="middle" fill="currentColor" className="text-foreground/65" fontFamily="var(--font-geist-mono), monospace" fontSize={12} letterSpacing="0.18em">
          SINGLE-VERTICAL  ←     MARKET SCOPE     →  MULTI-VERTICAL
        </text>
        <text
          x={20}
          y={H / 2}
          textAnchor="middle"
          fill="currentColor"
          className="text-foreground/65"
          fontFamily="var(--font-geist-mono), monospace"
          fontSize={12}
          letterSpacing="0.18em"
          transform={`rotate(-90 20 ${H / 2})`}
        >
          BACKEND INFRA  ←     LAYER     →  EDITORIAL UX
        </text>

        {/* Companies */}
        {QUADRANT_COMPANIES.map((c, i) => {
          const cx = xPos(c.x);
          const cy = yPos(c.y);
          const r = c.highlighted ? 12 : 7;
          return (
            <motion.g
              key={c.name}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {c.highlighted ? (
                <circle cx={cx} cy={cy} r={28} fill={c.color} fillOpacity={0.12}>
                  <animate attributeName="r" values="20;36;20" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="fill-opacity" values="0.12;0.04;0.12" dur="3s" repeatCount="indefinite" />
                </circle>
              ) : null}
              <circle cx={cx} cy={cy} r={r} fill={c.color} fillOpacity={c.highlighted ? 1 : 0.85} />
              {c.highlighted ? (
                <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={c.color} strokeWidth={2} strokeOpacity={0.6} />
              ) : null}
              <text
                x={cx}
                y={cy - r - 8}
                textAnchor="middle"
                fill="currentColor"
                className={c.highlighted ? 'text-foreground' : 'text-foreground/85'}
                fontFamily="var(--font-display), serif"
                fontSize={c.highlighted ? 16 : 12}
                fontWeight={c.highlighted ? 600 : 500}
              >
                {c.name}
              </text>
              {c.highlighted && c.description ? (
                <text
                  x={cx}
                  y={cy + r + 18}
                  textAnchor="middle"
                  fill={c.color}
                  fontFamily="var(--font-geist-mono), monospace"
                  fontSize={12}
                  letterSpacing="0.12em"
                >
                  {c.description.toUpperCase()}
                </text>
              ) : null}
            </motion.g>
          );
        })}

        {/* Quadrant labels */}
        <text x={PAD + innerW * 0.25} y={PAD + 24} textAnchor="middle" fill="currentColor" className="text-foreground/40" fontFamily="var(--font-geist-mono), monospace" fontSize={12} letterSpacing="0.2em">
          SINGLE × EDITORIAL
        </text>
        <text x={PAD + innerW * 0.75} y={PAD + 24} textAnchor="middle" fill="#047857" fontFamily="var(--font-geist-mono), monospace" fontSize={12} letterSpacing="0.2em" fontWeight={600}>
          ◆ MULTI × EDITORIAL — UNOCCUPIED
        </text>
        <text x={PAD + innerW * 0.25} y={H - PAD - 12} textAnchor="middle" fill="currentColor" className="text-foreground/40" fontFamily="var(--font-geist-mono), monospace" fontSize={12} letterSpacing="0.2em">
          SINGLE × INFRA
        </text>
        <text x={PAD + innerW * 0.75} y={H - PAD - 12} textAnchor="middle" fill="currentColor" className="text-foreground/40" fontFamily="var(--font-geist-mono), monospace" fontSize={12} letterSpacing="0.2em">
          MULTI × INFRA
        </text>
      </svg>
    </div>
  );
}

// <TAMExpansionChart> — DELETED. The §03 Market section now owns the
// expansion-engine visual via TamExpansionInteractive.tsx, which
// carries the same data interactively (hover any 2030 segment for the
// AI-flood narrative + named players). The static chart was an early
// version that no longer has a call site.

// ─────────────────────────────────────────────────────────────────────────
// <ARRTrajectory>
// Y0 → Y3 → Y5 → Y10 line chart on log-ish scale
// ─────────────────────────────────────────────────────────────────────────

export function ARRTrajectory() {
  const W = 800;
  const H = 360;
  const PAD = 60;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const points = [
    { year: 'Y1', arr: 0.44, label: '$0.4–0.6M' },
    { year: 'Y2', arr: 2.08, label: '$2.08M' },
    { year: 'Y3', arr: 6.59, label: '$6.59M' },
    { year: 'Y5', arr: 32, label: '$25–40M' },
    { year: 'Y10', arr: 300, label: '$200–400M' },
  ];

  const maxArr = 400;
  const xStep = innerW / (points.length - 1);
  const yFor = (arr: number) => H - PAD - Math.pow(arr / maxArr, 0.35) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${PAD + i * xStep} ${yFor(p.arr)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet" role="img">
      {/* Grid lines */}
      {[1, 10, 100].map((v) => (
        <g key={v}>
          <line
            x1={PAD}
            y1={yFor(v)}
            x2={W - PAD}
            y2={yFor(v)}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeDasharray="4 6"
          />
          <text
            x={PAD - 12}
            y={yFor(v) + 4}
            textAnchor="end"
            fill="currentColor"
            className="text-foreground/40"
            fontFamily="var(--font-geist-mono), monospace"
            fontSize={12}
          >
            ${v}M
          </text>
        </g>
      ))}

      {/* Area under curve */}
      <motion.path
        d={`${path} L ${PAD + (points.length - 1) * xStep} ${H - PAD} L ${PAD} ${H - PAD} Z`}
        fill="#047857"
        fillOpacity={0.1}
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ duration: 1.4 }}
      />

      {/* Main line */}
      <motion.path
        d={path}
        fill="none"
        stroke="#047857"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ duration: 1.6, ease: [0.2, 0.8, 0.2, 1] }}
      />

      {/* Points + labels */}
      {points.map((p, i) => (
        <motion.g
          key={p.year}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.4, delay: 0.4 + i * 0.18 }}
        >
          <circle cx={PAD + i * xStep} cy={yFor(p.arr)} r={6} fill="#047857" />
          <circle cx={PAD + i * xStep} cy={yFor(p.arr)} r={11} fill="#047857" fillOpacity={0.2} />
          <text
            x={PAD + i * xStep}
            y={yFor(p.arr) - 22}
            textAnchor="middle"
            fill="currentColor"
            className="text-foreground"
            fontFamily="var(--font-display), serif"
            fontSize={i === points.length - 1 ? 18 : 14}
            fontWeight={i === points.length - 1 ? 600 : 500}
          >
            {p.label}
          </text>
          <text
            x={PAD + i * xStep}
            y={H - PAD + 22}
            textAnchor="middle"
            fill="currentColor"
            className="text-foreground/55"
            fontFamily="var(--font-geist-mono), monospace"
            fontSize={12}
            letterSpacing="0.16em"
          >
            {p.year}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}
