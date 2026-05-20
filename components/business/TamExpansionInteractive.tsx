'use client';

/**
 * TamExpansionInteractive — §03's growth chart, made into an
 * interactive exhibit that absorbs the "AI flood inside each
 * regulated vertical" section formerly in §07b.
 *
 * Today bar (left) + 2030 stacked bar (right). Each segment of the
 * 2030 stack is hoverable:
 *
 *   • Hover any segment → segment lifts to full opacity, others dim,
 *     the right-side details panel populates with that segment's
 *     name, added SAM, the AI-shift narrative, and a grid of named-
 *     player logos already operating in that space.
 *   • Click pins the active state (mobile / careful-reader friendly).
 *
 * Designed to live on §03's dark canvas.
 */

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { AI_STARTUPS, MODEL_PROVIDERS } from './logoData';

// ─────────────────────────────────────────────────────────────────────────
// Motion / timing tokens — match MarketMap so the two exhibits feel like
// one designed system.
// ─────────────────────────────────────────────────────────────────────────
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const T_SEGMENT = '260ms';
const T_PANEL = '320ms';

// ─────────────────────────────────────────────────────────────────────────
// Data — each entry in TAM_SEGMENTS is one stripe of the 2030 stacked
// bar. The ordering below is bottom-to-top in the stack (Today base,
// then per-vertical AI flood, then platform / international layers).
//
// `examples` is a curated set of named players already operating in
// that segment, drawn from AI_STARTUPS and MODEL_PROVIDERS so the
// logos can resolve without new asset work.
// ─────────────────────────────────────────────────────────────────────────
type Logo = { src: string; alt: string; href?: string };

type Segment = {
  key: string;
  label: string;
  shortLabel: string;
  category: 'baseline' | 'vertical' | 'platform' | 'international';
  categoryLabel: string;
  value: number; // $M added in 2030
  color: string;
  shift: string; // narrative
  examples: Logo[];
};

const SEGMENTS: Segment[] = [
  {
    key: 'baseline',
    label: 'Today · 8 publisher verticals',
    shortLabel: 'Today',
    category: 'baseline',
    categoryLabel: 'The base',
    value: 1470,
    color: '#047857',
    shift:
      'Today’s $1.47B SAM. The eight regulated publishing verticals mapped above — the addressable base that every expansion vector layers on top of.',
    examples: [],
  },
  {
    key: 'healthcare-ai',
    label: 'Healthcare AI startups',
    shortLabel: 'Healthcare AI',
    category: 'vertical',
    categoryLabel: 'Per-vertical AI flood',
    value: 800,
    color: '#10b981',
    shift:
      'AI medical scribes capturing every clinical conversation. AI patient triage. AI drug discovery. AI care coordination. AI utilization management. Every Abridge or Hippocratic deployment is a new publishing surface that needs the same compliance primitives.',
    examples: [
      AI_STARTUPS.abridge,
      AI_STARTUPS.daxCopilot,
      AI_STARTUPS.suki,
      AI_STARTUPS.augmedix,
      AI_STARTUPS.hippocraticAi,
      AI_STARTUPS.insitro,
      AI_STARTUPS.recursion,
    ],
  },
  {
    key: 'finance-ai',
    label: 'Finance AI',
    shortLabel: 'Finance AI',
    category: 'vertical',
    categoryLabel: 'Per-vertical AI flood',
    value: 500,
    color: '#34d399',
    shift:
      'AI financial advisors. AI underwriting. AI fraud detection. AI customer service. AI agentic trading. AI ESG analysis. Each one carrying the same SEC Marketing Rule and FINRA exposure as the human-written client letter it replaces.',
    examples: [
      AI_STARTUPS.bloombergGpt,
      AI_STARTUPS.alphaSense,
      AI_STARTUPS.wealthfront,
      AI_STARTUPS.numerai,
      AI_STARTUPS.brex,
    ],
  },
  {
    key: 'insurance-ai',
    label: 'Insurance AI',
    shortLabel: 'Insurance AI',
    category: 'vertical',
    categoryLabel: 'Per-vertical AI flood',
    value: 200,
    color: '#0d9488',
    shift:
      'AI underwriting. AI claims handling. AI fraud detection. AI customer-service chatbots. AI policy comparison. AI risk pricing. Every quote letter, every claim denial, every chatbot response now reviewable.',
    examples: [
      AI_STARTUPS.lemonade,
      AI_STARTUPS.tractable,
      AI_STARTUPS.sproutAi,
      AI_STARTUPS.capeAnalytics,
      AI_STARTUPS.ladder,
    ],
  },
  {
    key: 'pharma-ai',
    label: 'Pharma research AI',
    shortLabel: 'Pharma AI',
    category: 'vertical',
    categoryLabel: 'Per-vertical AI flood',
    value: 200,
    color: '#0f766e',
    shift:
      'AI drug discovery. AI clinical-trial design. AI medical writing. AI regulatory submission drafting. AI pharmacovigilance signal-detection. Distinct from Veeva’s promotional lane — research, trials, and med-tech publishing.',
    examples: [
      AI_STARTUPS.insitro,
      AI_STARTUPS.atomwise,
      AI_STARTUPS.benchSci,
      AI_STARTUPS.recursion,
      AI_STARTUPS.owkin,
    ],
  },
  {
    key: 'realestate-ai',
    label: 'Real Estate AI',
    shortLabel: 'Real Estate AI',
    category: 'vertical',
    categoryLabel: 'Per-vertical AI flood',
    value: 100,
    color: '#6ee7b7',
    shift:
      'AI property valuation. AI mortgage origination. AI title search. AI buyer-agent chatbots. AI mortgage compliance. CFPB UDAAP enforcement extends to every AI-emitted consumer disclosure.',
    examples: [
      AI_STARTUPS.houseCanary,
      AI_STARTUPS.compass,
      AI_STARTUPS.rocketMortgage,
      AI_STARTUPS.betterMortgage,
      AI_STARTUPS.doma,
    ],
  },
  {
    key: 'highered-ai',
    label: 'Higher Ed AI',
    shortLabel: 'Higher Ed AI',
    category: 'vertical',
    categoryLabel: 'Per-vertical AI flood',
    value: 100,
    color: '#a7f3d0',
    shift:
      'AI tutors at scale. AI admissions screening. AI student-services chatbots. AI grading. AI personalized curriculum. Title IX and Title IV reach every AI-generated communication to a student.',
    examples: [
      AI_STARTUPS.khanmigo,
      AI_STARTUPS.squirrelAi,
      AI_STARTUPS.carnegieLearning,
      AI_STARTUPS.courseHero,
    ],
  },
  {
    key: 'government-ai',
    label: 'Government AI',
    shortLabel: 'Government AI',
    category: 'vertical',
    categoryLabel: 'Per-vertical AI flood',
    value: 150,
    color: '#059669',
    shift:
      'AI citizen services in every state DMV / IRS / 311. AI policy drafting. AI public-health surveillance. AI document processing at scale. Section 508 and Plain Writing Act compliance baked into every AI-emitted public-facing artifact.',
    examples: [AI_STARTUPS.palantir, AI_STARTUPS.anduril],
  },
  {
    key: 'legal-ai',
    label: 'Legal AI',
    shortLabel: 'Legal AI',
    category: 'vertical',
    categoryLabel: 'Per-vertical AI flood',
    value: 75,
    color: '#15803d',
    shift:
      'AI contract drafting. AI legal research. AI client intake. AI eDiscovery. AI brief generation. AI compliance monitoring. Every AI-emitted client communication subject to bar-association unauthorized-practice rules.',
    examples: [
      AI_STARTUPS.harvey,
      AI_STARTUPS.evenUp,
      AI_STARTUPS.spellbook,
      AI_STARTUPS.ironclad,
      AI_STARTUPS.lexisAi,
      AI_STARTUPS.casetext,
    ],
  },
  {
    key: 'agent-layer',
    label: 'Enterprise AI agent layer',
    shortLabel: 'Enterprise agents',
    category: 'platform',
    categoryLabel: 'Platform expansion',
    value: 500,
    color: '#22c55e',
    shift:
      'Copilot, Workspace, Einstein, OpenAI Enterprise, and the next-generation autonomous-agent fabric deployed into regulated environments. Every agent action is an artifact that ships under the deploying brand’s name — and inherits its regulatory exposure.',
    examples: [
      MODEL_PROVIDERS.openai,
      MODEL_PROVIDERS.azure,
      MODEL_PROVIDERS.google,
      MODEL_PROVIDERS.aws,
    ],
  },
  {
    key: 'frontier-llm',
    label: 'Frontier LLM provider partnerships',
    shortLabel: 'Frontier LLM partnerships',
    category: 'platform',
    categoryLabel: 'Platform expansion',
    value: 600,
    color: '#16a34a',
    shift:
      'OpenAI, Anthropic, Google Gemini, xAI, Mistral, Cohere — each integrating AssuredAI as the compliance API for their Enterprise tier. The model providers don’t want regulatory liability on every customer’s output. We hold it for them.',
    examples: [
      MODEL_PROVIDERS.openai,
      MODEL_PROVIDERS.azure,
      MODEL_PROVIDERS.google,
      MODEL_PROVIDERS.xai,
      MODEL_PROVIDERS.aws,
      MODEL_PROVIDERS.ollama,
    ],
  },
  {
    key: 'multimodal',
    label: 'Multimodal / voice (usage)',
    shortLabel: 'Multimodal & voice',
    category: 'platform',
    categoryLabel: 'Platform expansion',
    value: 300,
    color: '#84cc16',
    shift:
      'AI scribes, voice agents, video summarization, automated meeting capture — usage-based pricing per artifact. Every audio or video frame that becomes a transcript becomes a regulated publishing surface.',
    examples: [
      AI_STARTUPS.abridge,
      AI_STARTUPS.daxCopilot,
      AI_STARTUPS.suki,
      AI_STARTUPS.augmedix,
    ],
  },
  {
    key: 'international',
    label: 'International / EU AI Act',
    shortLabel: 'International / EU AI Act',
    category: 'international',
    categoryLabel: 'International layer',
    value: 1500,
    color: '#65a30d',
    shift:
      'EU AI Act Article 12 (high-risk AI event logging) goes live August 2, 2026. Every high-risk system deployed in or for EU customers needs automatic compliance evidence — a market that did not exist in the US-only base above.',
    examples: [],
  },
];

const TODAY_SAM = SEGMENTS[0].value; // $1.47B
const TOTAL_2030 = SEGMENTS.reduce((s, v) => s + v.value, 0); // ~$5.9B

// ─────────────────────────────────────────────────────────────────────────
// Chart geometry — fixed viewBox so layout math is pixel-stable.
// ─────────────────────────────────────────────────────────────────────────
const W = 800;
const H = 580;
const PAD = 64;
const INNER_W = W - PAD * 2;
const INNER_H = H - PAD * 2;
const BAR_W = INNER_W / 3.6;
const TODAY_X = PAD + INNER_W * 0.12;
const FUTURE_X = PAD + INNER_W * 0.55;

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────
export default function TamExpansionInteractive() {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  // Ambient default — when no user interaction yet, the side panel
  // shows the largest expansion vector (International / EU AI Act,
  // $1.5B) so the panel never sits empty. The dimming-other-segments
  // behaviour only kicks in once the user actually hovers / clicks.
  const DEFAULT_KEY = 'international';
  const activeKey = hoveredKey ?? pinnedKey ?? DEFAULT_KEY;
  const active = useMemo(
    () => SEGMENTS.find((s) => s.key === activeKey) ?? null,
    [activeKey],
  );
  const isUserDriven = hoveredKey !== null || pinnedKey !== null;

  // Pre-compute segment Y positions (top-to-bottom layout: largest at
  // top, "Today" baseline at the bottom).
  // Render order in the chart: baseline first (bottom), then verticals,
  // then platform, then international (top). We reverse for layout.
  const layout = useMemo(() => {
    const order = [...SEGMENTS].reverse(); // top-to-bottom of the bar
    let cumY = PAD;
    return order.map((seg) => {
      const h = (seg.value / TOTAL_2030) * INNER_H;
      const node = { ...seg, y: cumY, h };
      cumY += h;
      return node;
    });
  }, []);

  const todayBarH = (TODAY_SAM / TOTAL_2030) * INNER_H;
  const todayBarY = PAD + INNER_H - todayBarH;

  return (
    // The mouseLeave handler lives on this wrapper so the user can move
    // the cursor from the chart into the details panel (with the gap
    // between them) without the panel disappearing. Only when the
    // cursor leaves the entire grid does the hover state clear.
    <div
      data-tam-container
      className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]"
      onMouseLeave={() => setHoveredKey(null)}
    >
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          CHART (left)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="relative w-full overflow-hidden rounded-md bg-background/[0.04]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`TAM expansion from $${(TODAY_SAM / 1000).toFixed(2)}B today to ~$${(TOTAL_2030 / 1000).toFixed(1)}B by 2030, broken into ${SEGMENTS.length} contributing segments.`}
        >
          {/* X-axis labels */}
          <text
            x={TODAY_X + BAR_W / 2}
            y={H - 22}
            textAnchor="middle"
            fill="rgba(255,255,255,0.55)"
            fontFamily="var(--font-geist-mono), monospace"
            fontSize={11}
            letterSpacing="0.22em"
          >
            TODAY · 2026
          </text>
          <text
            x={FUTURE_X + BAR_W / 2}
            y={H - 22}
            textAnchor="middle"
            fill="rgba(255,255,255,0.55)"
            fontFamily="var(--font-geist-mono), monospace"
            fontSize={11}
            letterSpacing="0.22em"
          >
            BY 2030
          </text>

          {/* Today bar */}
          <motion.g
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <rect
              x={TODAY_X}
              y={todayBarY}
              width={BAR_W}
              height={todayBarH}
              fill="#047857"
              fillOpacity={0.25}
              stroke="#6ee7b7"
              strokeWidth={1.5}
              rx={2}
            />
            <text
              x={TODAY_X + BAR_W / 2}
              y={todayBarY - 16}
              textAnchor="middle"
              fill="#ffffff"
              fontFamily="var(--font-display), serif"
              fontSize={26}
              fontWeight={500}
              letterSpacing="-0.025em"
            >
              $1.47B
            </text>
            <text
              x={TODAY_X + BAR_W / 2}
              y={todayBarY + todayBarH / 2 + 6}
              textAnchor="middle"
              fill="rgba(255,255,255,0.75)"
              fontFamily="var(--font-display), serif"
              fontSize={12}
              fontStyle="italic"
            >
              today
            </text>
          </motion.g>

          {/* 2030 stacked bar — each segment is a hoverable rect.
              `isDimmed` only kicks in once the user actually interacts
              (hover or click) — the ambient default state keeps all
              segments at their normal opacity so the chart reads as a
              single composed exhibit on first sight. */}
          {layout.map((seg, i) => {
            const isActive = isUserDriven && active?.key === seg.key;
            const isDimmed = isUserDriven && active !== null && !isActive;
            return (
              <motion.g
                key={seg.key}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.4, delay: 0.18 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Outer glow on active segment */}
                {isActive ? (
                  <rect
                    x={FUTURE_X - 4}
                    y={seg.y - 2}
                    width={BAR_W + 8}
                    height={Math.max(2, seg.h + 4)}
                    fill={seg.color}
                    fillOpacity={0.18}
                    rx={3}
                    style={{ transition: `opacity ${T_SEGMENT} ${EASE}` }}
                  />
                ) : null}

                <rect
                  x={FUTURE_X}
                  y={seg.y}
                  width={BAR_W}
                  height={Math.max(2, seg.h - 1)}
                  fill={seg.color}
                  fillOpacity={isActive ? 0.92 : isDimmed ? 0.18 : 0.65}
                  stroke={isActive ? seg.color : 'rgba(0,0,0,0)'}
                  strokeWidth={1.5}
                  rx={1}
                  style={{
                    cursor: 'pointer',
                    transition: `fill-opacity ${T_SEGMENT} ${EASE}, stroke ${T_SEGMENT} ${EASE}`,
                  }}
                  onMouseEnter={() => setHoveredKey(seg.key)}
                  onFocus={() => setHoveredKey(seg.key)}
                  onBlur={(e) => {
                    // Only clear if focus is leaving the entire
                    // interaction container (chart + panel). Keeps
                    // the panel alive when the user tabs from a
                    // segment into a logo link inside the panel.
                    const container = (e.currentTarget as SVGElement).closest(
                      '[data-tam-container]',
                    );
                    if (
                      !container ||
                      !container.contains(e.relatedTarget as Node)
                    ) {
                      setHoveredKey(null);
                    }
                  }}
                  onClick={() =>
                    setPinnedKey((k) => (k === seg.key ? null : seg.key))
                  }
                  tabIndex={0}
                  role="button"
                  aria-label={`${seg.label}: +$${seg.value}M added SAM by 2030`}
                  aria-pressed={pinnedKey === seg.key}
                />
              </motion.g>
            );
          })}

          {/* 2030 total label */}
          <motion.text
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.6, delay: 1.2 }}
            x={FUTURE_X + BAR_W / 2}
            y={PAD - 16}
            textAnchor="middle"
            fill="#ffffff"
            fontFamily="var(--font-display), serif"
            fontSize={38}
            fontWeight={500}
            letterSpacing="-0.025em"
          >
            ~${(TOTAL_2030 / 1000).toFixed(1)}B
          </motion.text>
          <motion.text
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.6, delay: 1.3 }}
            x={FUTURE_X + BAR_W / 2}
            y={PAD + 4}
            textAnchor="middle"
            fill="rgba(255,255,255,0.55)"
            fontFamily="var(--font-geist-mono), monospace"
            fontSize={10}
            letterSpacing="0.22em"
          >
            BY 2030 · 13 SEGMENTS
          </motion.text>

          {/* Growth multiplier callout */}
          <motion.g
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.6, delay: 1.5, type: 'spring' }}
          >
            <line
              x1={TODAY_X + BAR_W + 12}
              y1={todayBarY}
              x2={FUTURE_X - 12}
              y2={PAD + 20}
              stroke="#6ee7b7"
              strokeWidth={1.4}
              strokeDasharray="5 5"
              opacity={0.55}
            />
            <text
              x={(TODAY_X + BAR_W + FUTURE_X) / 2}
              y={(todayBarY + PAD) / 2 - 24}
              textAnchor="middle"
              fill="#6ee7b7"
              fontFamily="var(--font-display), serif"
              fontSize={44}
              fontWeight={600}
              letterSpacing="-0.025em"
            >
              ~4&times;
            </text>
            <text
              x={(TODAY_X + BAR_W + FUTURE_X) / 2}
              y={(todayBarY + PAD) / 2}
              textAnchor="middle"
              fill="#6ee7b7"
              fontFamily="var(--font-geist-mono), monospace"
              fontSize={10}
              letterSpacing="0.22em"
            >
              GROWTH BY 2030
            </text>
          </motion.g>
        </svg>

        {/* Helper line — only appears in the ambient default state.
            Once a user actually hovers or clicks a segment, the panel
            on the right is the source of truth and this nudge would
            be noise. */}
        {!isUserDriven ? (
          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[11px] uppercase tracking-[0.22em] text-background/40">
            Hover any 2030 segment for the AI flood inside it
          </p>
        ) : null}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          DETAILS PANEL (right) — always shows a segment. Defaults to
          the International / EU AI Act layer (the largest 2030
          contributor) as the ambient state; switches to whatever the
          user hovers or clicks. minHeight removed so the panel hugs
          its content instead of leaving dead vertical space.
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="relative overflow-hidden rounded-md border border-background/10 bg-background/[0.04] p-5 lg:p-6">
        {active ? (
          <ActivePanel segment={active} isAmbient={!isUserDriven} />
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Active panel — full detail for the active segment. When the panel is
// showing the ambient default (no user hover/pin yet), `isAmbient`
// surfaces a small bottom hint inviting interaction.
// ─────────────────────────────────────────────────────────────────────────
function ActivePanel({
  segment,
  isAmbient = false,
}: {
  segment: Segment;
  isAmbient?: boolean;
}) {
  const sharePct = (segment.value / TOTAL_2030) * 100;
  return (
    <div
      key={segment.key}
      className="flex h-full flex-col"
      style={{ animation: `tam-fade-in ${T_PANEL} ${EASE} both` }}
    >
      <style>{`
        @keyframes tam-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Eyebrow row */}
      <div className="flex items-start justify-between gap-3">
        <p
          className="font-mono text-[11px] font-medium uppercase tracking-[0.22em]"
          style={{ color: segment.color }}
        >
          {segment.categoryLabel}
        </p>
        <div
          aria-hidden="true"
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ background: segment.color }}
        />
      </div>

      {/* Segment name */}
      <h4
        className="mt-2 font-display text-[clamp(1.3rem,1.85vw,1.6rem)] font-normal leading-[1.12] text-background"
        style={{ fontVariationSettings: '"opsz" 72, "SOFT" 40' }}
      >
        {segment.label}
      </h4>

      {/* Headline numbers */}
      <div className="mt-4 flex items-baseline gap-5">
        <div>
          <p
            className="font-display font-normal leading-none tabular-nums text-background"
            style={{
              fontSize: 'clamp(2.2rem, 3.3vw, 2.7rem)',
              fontVariationSettings: '"opsz" 144, "SOFT" 30',
            }}
          >
            +${segment.value}M
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-background/55">
            added SAM by 2030
          </p>
        </div>
        <div>
          <p
            className="font-display font-normal leading-none tabular-nums text-background/82"
            style={{
              fontSize: 'clamp(1.25rem, 1.9vw, 1.55rem)',
              fontVariationSettings: '"opsz" 96',
            }}
          >
            {sharePct.toFixed(1)}%
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-background/55">
            of 2030 total
          </p>
        </div>
      </div>

      {/* Narrative */}
      <p className="mt-5 text-[13.5px] leading-[1.6] text-background/72">
        {segment.shift}
      </p>

      {/* Logo grid — named players already in this space */}
      {segment.examples.length > 0 ? (
        <div className="mt-5 border-t border-background/10 pt-4">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-background/55">
            Named players already in this space
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2">
            {segment.examples.map((logo) => (
              <LogoTile key={logo.alt} logo={logo} />
            ))}
          </div>
        </div>
      ) : segment.category === 'international' ? (
        <div className="mt-5 border-t border-background/10 pt-4">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-background/55">
            Regulatory anchor
          </p>
          <p className="mt-2.5 text-[12.5px] leading-[1.55] text-background/72">
            EU AI Act Article 12 (high-risk AI event logging) — effective
            August 2, 2026. Applies to every high-risk AI system
            deployed in or for EU customers, regardless of provider HQ.
          </p>
        </div>
      ) : segment.category === 'baseline' ? (
        <div className="mt-5 border-t border-background/10 pt-4">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-background/55">
            The map above
          </p>
          <p className="mt-2.5 text-[12.5px] leading-[1.55] text-background/72">
            See the eight verticals broken down in the treemap above.
            Today&rsquo;s $1.47B is the base every layer below stacks on
            top of.
          </p>
        </div>
      ) : null}

      {/* Ambient-state nudge — only when this panel is showing the
          default segment (no user hover/pin yet). Tells the reader
          the chart is interactive without competing with content. */}
      {isAmbient ? (
        <p className="mt-5 border-t border-background/10 pt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-background/40">
          &larr; Hover any 2030 segment to explore another layer
        </p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Small logo tile — favicon-sized image with title on hover so the
// reader can identify each named player.
// ─────────────────────────────────────────────────────────────────────────
function LogoTile({ logo }: { logo: Logo }) {
  const inner = (
    <div
      className="flex h-9 items-center gap-2 rounded-md border border-background/10 bg-background/[0.06] px-2.5 py-1.5 transition hover:border-background/30 hover:bg-background/[0.1]"
      title={logo.alt}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo.src}
        alt={logo.alt}
        className="h-4 w-4 flex-shrink-0 object-contain"
        loading="lazy"
      />
      <span className="font-mono text-[11px] font-medium tracking-tight text-background/82">
        {/* Strip parenthetical from alt text for the tile label */}
        {logo.alt.replace(/\s*\([^)]*\)\s*/g, '').trim()}
      </span>
    </div>
  );
  if (logo.href) {
    return (
      <a
        href={logo.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block no-underline"
        aria-label={`${logo.alt} (opens in new tab)`}
      >
        {inner}
      </a>
    );
  }
  return inner;
}
