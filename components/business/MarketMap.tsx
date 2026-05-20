'use client';

/**
 * MarketMap — §03 reimagined as a single interactive exhibit.
 *
 * One unified frame that contains:
 *
 *   • TAM annotation (top-right corner) — orienting context only
 *   • The treemap of 8 verticals sized by SAM, with a hover-driven
 *     details panel on the right side. Hover any tile, the others
 *     dim, the active tile gets a halo, and a rich details card
 *     fills the right panel with the prose, addressable orgs, ARR,
 *     share %, and source citation that used to live in a separate
 *     SAM table beneath.
 *   • The SOM slider beneath the treemap — drag 1 % → 10 % and
 *     watch a synchronized emerald "water-line" rise across every
 *     tile, showing the captured share per vertical. The live total
 *     updates in real time. The three named scenarios
 *     (Conservative / Base / Aggressive) are tick marks the slider
 *     soft-snaps to.
 *   • "About the math" button (bottom-right) opens a panel with the
 *     methodology and per-vertical sources — the credibility tax is
 *     paid on demand, not by everyone scrolling past.
 *
 * The whole exhibit replaces what used to be four stacked blocks
 * (TAM, treemap, SAM table, SOM cards, methodology paragraph). Same
 * content, one focal point.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Citation, type SourceId } from './sources';

// ─────────────────────────────────────────────────────────────────────────
// Motion / timing system — one easing curve and three timing scales
// so the whole exhibit animates as one coordinated motion language.
// ─────────────────────────────────────────────────────────────────────────
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const T_TILE = '320ms';
const T_PANEL = '380ms';
const T_WATER = '180ms';

// ─────────────────────────────────────────────────────────────────────────
// Vertical data — absorbs everything that previously lived in the SAM
// table beneath the treemap. Order is preserved from the prior layout
// (rank-by-SAM, row-balanced).
// ─────────────────────────────────────────────────────────────────────────
type Vertical = {
  key: string;
  name: string;
  shortName: string; // tile-display name; truncated where needed
  sam: number; // millions of USD
  color: string;
  textColor: string;
  // What goes in the right-side details panel on hover
  orgs: string;
  avgArr: string;
  addressableOrgs: string;
  sourceLabel: string;
  citation: SourceId;
  // Treemap layout coordinates (top-left + size, all in %)
  x: number;
  y: number;
  w: number;
  h: number;
  leadTag?: string; // e.g. '★ Year 1'
};

// Tile layout — three rows, hand-tuned for visual balance.
// Total SAMs sum to 1,465 (~$1.47B).
const VERTICALS: Vertical[] = [
  // Top row (60% height) — Finance + Healthcare
  {
    key: 'finance',
    name: 'Finance',
    shortName: 'Finance',
    sam: 400,
    color: '#10b981',
    textColor: '#86efac',
    orgs:
      '~15,000 SEC-registered investment advisers + 3,200 broker-dealers + 4,500 FDIC-insured banks publishing client-facing content under FINRA, SEC Marketing Rule, and state-AG oversight.',
    avgArr: '$40,000',
    addressableOrgs: '~22,700',
    sourceLabel: 'SEC IARD · FINRA · FDIC',
    citation: 'sam-finance-sec-finra-fdic',
    x: 0,
    y: 0,
    w: 57,
    h: 60,
  },
  {
    key: 'healthcare',
    name: 'Healthcare',
    shortName: 'Healthcare',
    sam: 300,
    color: '#047857',
    textColor: '#6ee7b7',
    orgs:
      '~6,100 community hospitals organized into ~400 health systems, plus standalone digital-health platforms and payor publishers shipping HIPAA-bounded content at scale.',
    avgArr: '$50,000',
    addressableOrgs: '~6,500',
    sourceLabel: 'AHA Annual Survey 2024',
    citation: 'sam-healthcare-aha',
    x: 57,
    y: 0,
    w: 43,
    h: 60,
    leadTag: 'Year 1 wedge',
  },
  // Middle row (23% height) — Insurance + Real Estate + Higher Ed
  {
    key: 'insurance',
    name: 'Insurance',
    shortName: 'Insurance',
    sam: 240,
    color: '#0d9488',
    textColor: '#5eead4',
    orgs:
      '~6,000 US insurers (P&C, life, and health carriers, MGAs, brokers) publishing policyholder-facing communications under state-DOI and NAIC rules.',
    avgArr: '$40,000',
    addressableOrgs: '~6,000',
    sourceLabel: 'NAIC Industry Snapshots',
    citation: 'sam-insurance-naic',
    x: 0,
    y: 60,
    w: 42.1,
    h: 23,
  },
  {
    key: 'realestate',
    name: 'Real Estate & Mortgage',
    shortName: 'Real Estate',
    sam: 200,
    color: '#14b8a6',
    textColor: '#5eead4',
    orgs:
      '~10,000 mortgage lenders + ~106,000 real-estate brokerages publishing consumer-facing content under CFPB UDAAP, NMLS, and state real-estate-commission rules.',
    avgArr: '$20,000',
    addressableOrgs: '~116,000',
    sourceLabel: 'NMLS Consumer Access · NAR',
    citation: 'sam-realestate-nmls-nar',
    x: 42.1,
    y: 60,
    w: 35.1,
    h: 23,
  },
  {
    key: 'highered',
    name: 'Higher Education',
    shortName: 'Higher Ed',
    sam: 130,
    color: '#6ee7b7',
    textColor: '#065f46',
    orgs:
      '~5,300 accredited US institutions publishing admissions, financial-aid, and academic content under Title IX, Title IV, and state higher-ed disclosures.',
    avgArr: '$25,000',
    addressableOrgs: '~5,300',
    sourceLabel: 'IPEDS / U.S. Dept. of Education',
    citation: 'sam-highered-ipeds',
    x: 77.2,
    y: 60,
    w: 22.8,
    h: 23,
  },
  // Bottom row (17% height) — Government + Pharma + Legal
  {
    key: 'government',
    name: 'Government',
    shortName: 'Government',
    sam: 120,
    color: '#059669',
    textColor: '#6ee7b7',
    orgs:
      '~430 federal agencies + state agencies + civic-tech and nonprofit-news publishers shipping public-facing content under Section 508, Plain Writing Act, and AP guidance.',
    avgArr: '$100,000',
    addressableOrgs: '~430+',
    sourceLabel: 'USA.gov agency directory',
    citation: 'sam-government-usa-gov',
    x: 0,
    y: 83,
    w: 61.5,
    h: 17,
    leadTag: 'Year 1 wedge',
  },
  {
    key: 'pharma',
    name: 'Pharma & Life Sciences',
    shortName: 'Pharma & Life Sci.',
    sam: 60,
    color: '#0f766e',
    textColor: '#5eead4',
    orgs:
      '~700 pharma & biotech firms + ~1,800 contract research orgs (CROs) + academic research institutes — research, clinical-trial communications, and med-tech publishing (not Veeva-overlapping promotional).',
    avgArr: '$80,000',
    addressableOrgs: '~2,500',
    sourceLabel: 'IQVIA Institute · ACRO',
    citation: 'sam-pharma-iqvia-acro',
    x: 61.5,
    y: 83,
    w: 30.8,
    h: 17,
  },
  {
    key: 'legal',
    name: 'Legal',
    shortName: 'Legal',
    sam: 15,
    color: '#34d399',
    textColor: '#065f46',
    orgs:
      'Am Law 200 + Global 100 + regional firms publishing thought leadership, client alerts, and disclosure content at scale.',
    avgArr: '$30,000',
    addressableOrgs: '~200',
    sourceLabel: 'ALM · Am Law 200 rankings',
    citation: 'sam-legal-amlaw',
    x: 92.3,
    y: 83,
    w: 7.7,
    h: 17,
  },
];

const TOTAL_SAM = VERTICALS.reduce((s, v) => s + v.sam, 0); // 1,465M

// SOM slider — three named scenarios act as soft-snap tick marks.
const SOM_SCENARIOS = [
  { pct: 1, label: 'Conservative' },
  { pct: 3, label: 'Base' },
  { pct: 5, label: 'Aggressive' },
];
const SLIDER_MIN = 1;
const SLIDER_MAX = 10;
const SLIDER_SNAP_WINDOW = 0.4; // snaps if within this % of a tick

// ─────────────────────────────────────────────────────────────────────────
// MarketMap — the exported root.
// ─────────────────────────────────────────────────────────────────────────
export default function MarketMap() {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [capturePct, setCapturePct] = useState(3); // default = Base scenario
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  // Active vertical for the side panel — hover wins, then pinned,
  // then a default "tour-guide" vertical so the side panel never
  // shows an empty/awkward state. Healthcare is the Y1 wedge — best
  // ambient default. We track whether the active state came from a
  // real user interaction (`isUserDriven`) so we can keep the dim-
  // others behaviour only for actual hovers, not for the default.
  const DEFAULT_KEY = 'healthcare';
  const activeKey = hoveredKey ?? pinnedKey ?? DEFAULT_KEY;
  const active = useMemo(
    () => VERTICALS.find((v) => v.key === activeKey) ?? null,
    [activeKey],
  );
  const isUserDriven = hoveredKey !== null || pinnedKey !== null;
  const isAnyActive = isUserDriven;

  // SOM math — total captured and per-vertical capture
  const capturedTotalMM = useMemo(
    () => Math.round(TOTAL_SAM * (capturePct / 100)),
    [capturePct],
  );

  return (
    <div className="rounded-lg border border-background/12 bg-background/[0.03] p-6 lg:p-8">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TAM ANNOTATION + section title row
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-y-4">
        <div className="max-w-[44ch]">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-300">
            US SAM · $1.47B
          </p>
          <h3
            className="mt-2 font-display text-[clamp(1.7rem,2.6vw,2.15rem)] font-normal leading-[1.12] text-background"
            style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40' }}
          >
            Eight regulated verticals,
            sized by addressable&nbsp;revenue.
          </h3>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-background/55">
            ↑ TAM 2030
          </p>
          <p className="mt-1.5 font-display text-[clamp(1.1rem,1.55vw,1.35rem)] font-normal leading-tight text-background">
            $15.8B · 30% CAGR
          </p>
          <p className="mt-1 max-w-[28ch] text-[12px] leading-[1.45] text-background/55">
            AI governance software (Forrester). The map below is the
            addressable subset.
          </p>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MAP + PANEL — the centerpiece. mouseLeave on the grid wrapper
          (not on the treemap alone) so the user can move the cursor
          from a tile into the details panel without the panel
          disappearing.
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        data-marketmap-container
        className="grid grid-cols-1 gap-5 lg:grid-cols-[1.65fr_1fr] lg:gap-6"
        onMouseLeave={() => setHoveredKey(null)}
      >
        {/* Treemap */}
        <div className="relative aspect-[1.55/1] w-full overflow-hidden rounded-md bg-background/[0.04]">
          {VERTICALS.map((v) => {
            const isActive = active?.key === v.key;
            const isDimmed = isAnyActive && !isActive;
            // Captured slice — water rises from the bottom of each tile
            // in proportion to capturePct. The fill is a multiplier on
            // the tile's own height (because SAM ∝ tile area, and we're
            // showing the captured fraction of THAT vertical's SAM).
            const waterFillPct = capturePct; // 0..10
            return (
              <button
                key={v.key}
                type="button"
                onMouseEnter={() => setHoveredKey(v.key)}
                onFocus={() => setHoveredKey(v.key)}
                onBlur={(e) => {
                  // Only clear when focus leaves the entire grid
                  // (chart + panel). Keeps the panel reachable when
                  // a user tabs into it from a tile.
                  const container = e.currentTarget.closest(
                    '[data-marketmap-container]',
                  );
                  if (
                    !container ||
                    !container.contains(e.relatedTarget as Node)
                  ) {
                    setHoveredKey((k) => (k === v.key ? null : k));
                  }
                }}
                onClick={() =>
                  setPinnedKey((k) => (k === v.key ? null : v.key))
                }
                aria-label={`${v.name}: $${v.sam}M SAM. ${((v.sam / TOTAL_SAM) * 100).toFixed(1)}% of US total.`}
                aria-pressed={pinnedKey === v.key}
                className="group absolute m-0 border-0 p-0 text-left"
                style={{
                  left: `${v.x}%`,
                  top: `${v.y}%`,
                  width: `${v.w}%`,
                  height: `${v.h}%`,
                  cursor: 'pointer',
                  background: 'transparent',
                  opacity: isDimmed ? 0.32 : 1,
                  transition: `opacity ${T_TILE} ${EASE}`,
                  zIndex: isActive ? 2 : 1,
                }}
              >
                {/* Tile body — emerald fill + subtle border */}
                <div
                  className="absolute inset-[3px] overflow-hidden rounded-md"
                  style={{
                    background: `${v.color}24`,
                    border: `1px solid ${v.color}66`,
                    boxShadow: isActive
                      ? `0 0 0 1px ${v.color}, 0 8px 28px -10px ${v.color}55`
                      : 'none',
                    transition: `box-shadow ${T_TILE} ${EASE}, border-color ${T_TILE} ${EASE}`,
                  }}
                >
                  {/* Water-line fill — synchronized with SOM slider.
                      Fills from bottom up, proportional to capturePct
                      out of 10 (visual ceiling; real ceiling matches
                      whatever the slider max is). */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: `${waterFillPct * 10}%`,
                      background: `linear-gradient(180deg, ${v.color}44 0%, ${v.color}88 100%)`,
                      borderTop: `1px solid ${v.color}`,
                      transition: `height ${T_WATER} ${EASE}`,
                    }}
                  />

                  {/* Tile content */}
                  <div
                    className="relative flex h-full flex-col justify-between p-3 lg:p-4"
                    style={{ color: v.textColor }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div
                          className="font-display font-normal leading-[1.08]"
                          style={{
                            fontSize:
                              v.h >= 40
                                ? 'clamp(1rem, 1.6vw, 1.45rem)'
                                : v.h >= 20
                                  ? 'clamp(0.85rem, 1.15vw, 1.1rem)'
                                  : 'clamp(0.7rem, 0.85vw, 0.85rem)',
                            fontVariationSettings:
                              '"opsz" 48, "SOFT" 40',
                            color: v.textColor,
                          }}
                        >
                          {v.shortName}
                        </div>
                        {v.leadTag && v.h >= 20 ? (
                          <div
                            className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.18em]"
                            style={{ color: v.textColor }}
                          >
                            ★ {v.leadTag}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <div
                        className="font-display font-normal leading-none tabular-nums"
                        style={{
                          fontSize:
                            v.h >= 40
                              ? 'clamp(1.8rem, 3.4vw, 3rem)'
                              : v.h >= 20
                                ? 'clamp(1.3rem, 2vw, 1.9rem)'
                                : 'clamp(0.95rem, 1.3vw, 1.25rem)',
                          fontVariationSettings:
                            '"opsz" 144, "SOFT" 30',
                          color: '#ffffff',
                        }}
                      >
                        ${v.sam}M
                      </div>
                      {v.h >= 20 ? (
                        <div className="mt-2 flex items-center gap-2">
                          {/* Share-of-SAM bar */}
                          <div
                            className="h-[3px] flex-1 rounded-full"
                            style={{ background: `${v.color}33` }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(v.sam / TOTAL_SAM) * 100}%`,
                                background: v.textColor,
                              }}
                            />
                          </div>
                          <div
                            className="font-mono text-[11px] font-medium tabular-nums"
                            style={{ color: v.textColor }}
                          >
                            {((v.sam / TOTAL_SAM) * 100).toFixed(0)}%
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* DETAILS PANEL — always shows a vertical. Defaults to
            Healthcare (the Y1 wedge) as the ambient state when nothing
            is hovered, so the panel never sits awkwardly empty. */}
        <div className="relative overflow-hidden rounded-md border border-background/10 bg-background/[0.04] p-5 lg:p-6">
          {active ? (
            <ActivePanel
              vertical={active}
              capturePct={capturePct}
              isAmbient={!isUserDriven}
            />
          ) : null}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SOM SLIDER — drag 1% → 10% to model the Year-5 capture.
          Synchronized with the water-line overlay on every tile.
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <SomSlider
        capturePct={capturePct}
        onChange={setCapturePct}
        capturedTotalMM={capturedTotalMM}
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ABOUT-THE-MATH disclosure — methodology + per-vertical sources.
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => setMethodologyOpen((o) => !o)}
          className="group flex items-center gap-2 rounded-full border border-background/15 bg-background/[0.04] px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-background/65 transition hover:border-background/35 hover:text-background/90"
          aria-expanded={methodologyOpen}
        >
          <span
            aria-hidden="true"
            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current font-serif text-[9px] italic"
          >
            i
          </span>
          About the math
        </button>
      </div>
      {methodologyOpen ? <MethodologyPanel /> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Active panel — renders the active vertical's full detail. When the
// active vertical is the ambient default (no user hover/pin yet), the
// `isAmbient` flag surfaces a subtle "tap any tile" hint at the foot.
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
function ActivePanel({
  vertical,
  capturePct,
  isAmbient = false,
}: {
  vertical: Vertical;
  capturePct: number;
  isAmbient?: boolean;
}) {
  const sharePct = (vertical.sam / TOTAL_SAM) * 100;
  const capturedMM = Math.round(vertical.sam * (capturePct / 100));

  return (
    <div
      key={vertical.key}
      className="flex h-full flex-col"
      style={{
        animation: `marketmap-fade-in ${T_PANEL} ${EASE} both`,
      }}
    >
      {/* Style block scoped to this component for the panel transition */}
      <style>{`
        @keyframes marketmap-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Eyebrow + name */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="font-mono text-[11px] font-medium uppercase tracking-[0.22em]"
            style={{ color: vertical.textColor }}
          >
            {vertical.name}
          </p>
          {vertical.leadTag ? (
            <p
              className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.22em]"
              style={{ color: vertical.textColor }}
            >
              ★ {vertical.leadTag}
            </p>
          ) : null}
        </div>
        <div
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ background: vertical.color }}
          aria-hidden="true"
        />
      </div>

      {/* Headline numbers */}
      <div className="mt-4 flex items-baseline gap-5">
        <div>
          <p
            className="font-display font-normal leading-none tabular-nums text-background"
            style={{
              fontSize: 'clamp(2.4rem, 3.6vw, 3rem)',
              fontVariationSettings: '"opsz" 144, "SOFT" 30',
            }}
          >
            ${vertical.sam}M
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-background/55">
            SAM
          </p>
        </div>
        <div>
          <p
            className="font-display font-normal leading-none tabular-nums text-background/82"
            style={{
              fontSize: 'clamp(1.4rem, 2.1vw, 1.75rem)',
              fontVariationSettings: '"opsz" 96',
            }}
          >
            {sharePct.toFixed(1)}%
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-background/55">
            of US total
          </p>
        </div>
      </div>

      {/* Captured-at-current-% line */}
      <div className="mt-4 rounded-md border border-emerald-400/20 bg-emerald-500/10 px-3.5 py-2.5">
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-emerald-300/85">
          At {capturePct}% capture
        </p>
        <p
          className="mt-1 font-display font-normal leading-none tabular-nums text-emerald-100"
          style={{
            fontSize: 'clamp(1.1rem, 1.55vw, 1.3rem)',
            fontVariationSettings: '"opsz" 96, "SOFT" 30',
          }}
        >
          ${capturedMM}M / year
        </p>
      </div>

      {/* Org-count description */}
      <p className="mt-5 text-[13.5px] leading-[1.55] text-background/72">
        {vertical.orgs}
      </p>

      {/* Key-value rows */}
      <div className="mt-5 divide-y divide-background/10 border-y border-background/10">
        <KvRow label="Addressable orgs" value={vertical.addressableOrgs} />
        <KvRow label="Avg ARR / org" value={vertical.avgArr} />
      </div>

      {/* Source + citation */}
      <div className="mt-auto pt-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-background/45">
          Source
        </p>
        <p className="mt-1.5 text-[12.5px] leading-[1.4] text-background/72">
          {vertical.sourceLabel}
          <Citation id={vertical.citation} tone="onDark" />
        </p>

        {/* Ambient-state nudge — only when the panel is showing the
            default tour-guide vertical, not a user-driven selection. */}
        {isAmbient ? (
          <p className="mt-4 border-t border-background/10 pt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-background/40">
            Hover or tap any tile to explore another vertical &rarr;
          </p>
        ) : null}
      </div>
    </div>
  );
}

function KvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-background/55">
        {label}
      </p>
      <p className="font-mono text-[13px] font-medium tabular-nums text-background/90">
        {value}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SOM SLIDER — drag a thumb 1% → 10% to model Year-5 capture. Soft-snaps
// to Conservative (1%) / Base (3%) / Aggressive (5%) tick marks. Reports
// the captured total live. Keyboard-accessible via native range input
// (steps in 0.1% increments).
// ─────────────────────────────────────────────────────────────────────────
function SomSlider({
  capturePct,
  onChange,
  capturedTotalMM,
}: {
  capturePct: number;
  onChange: (n: number) => void;
  capturedTotalMM: number;
}) {
  const rangeRef = useRef<HTMLInputElement>(null);

  // Soft-snap onto named scenarios when within SLIDER_SNAP_WINDOW of one.
  const handleChange = useCallback(
    (raw: number) => {
      const clamped = Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, raw));
      const snapped = SOM_SCENARIOS.find(
        (s) => Math.abs(s.pct - clamped) < SLIDER_SNAP_WINDOW,
      );
      onChange(snapped ? snapped.pct : Number(clamped.toFixed(1)));
    },
    [onChange],
  );

  // Identify the active scenario label
  const activeScenario = SOM_SCENARIOS.find((s) => s.pct === capturePct);

  // Slider thumb position in % across the track
  const thumbPosPct =
    ((capturePct - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

  return (
    <div className="mt-8 rounded-md border border-background/10 bg-background/[0.04] p-5 lg:p-6">
      {/* Header row — eyebrow + headline + captured number */}
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-300">
            SOM · Year-5 capture
          </p>
          <p
            className="mt-1.5 font-display text-[clamp(1.1rem,1.55vw,1.3rem)] font-normal leading-tight text-background"
            style={{ fontVariationSettings: '"opsz" 64, "SOFT" 40' }}
          >
            Drag to model the capture rate.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-background/55 tabular-nums">
            {activeScenario ? activeScenario.label : 'Modeled'} · {capturePct}%
          </p>
          <p
            className="mt-1 font-display font-normal leading-none tabular-nums text-background"
            style={{
              fontSize: 'clamp(2rem, 3.2vw, 2.75rem)',
              fontVariationSettings: '"opsz" 144, "SOFT" 30',
            }}
          >
            ${capturedTotalMM}M
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-background/45">
            / year
          </p>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative pt-3">
        {/* Track background */}
        <div
          className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          aria-hidden="true"
        />
        {/* Filled portion from min to thumb */}
        <div
          className="pointer-events-none absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{
            width: `${thumbPosPct}%`,
            background:
              'linear-gradient(90deg, rgba(16,185,129,0.6) 0%, rgba(16,185,129,1) 100%)',
            transition: `width ${T_WATER} ${EASE}`,
          }}
          aria-hidden="true"
        />
        {/* Scenario tick marks */}
        {SOM_SCENARIOS.map((s) => {
          const tickPos = ((s.pct - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
          const isActive = capturePct === s.pct;
          return (
            <button
              key={s.pct}
              type="button"
              onClick={() => handleChange(s.pct)}
              className="absolute z-10 -translate-x-1/2 cursor-pointer text-center"
              style={{ left: `${tickPos}%`, top: '0px' }}
              aria-label={`Set ${s.label} scenario at ${s.pct}%`}
            >
              <div
                className="mx-auto h-3.5 w-px"
                style={{
                  background: isActive
                    ? 'rgba(16,185,129,1)'
                    : 'rgba(255,255,255,0.3)',
                }}
              />
              <div
                className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.18em]"
                style={{
                  color: isActive
                    ? 'rgba(110,231,183,1)'
                    : 'rgba(255,255,255,0.45)',
                  transition: `color ${T_TILE} ${EASE}`,
                }}
              >
                {s.pct}%
              </div>
              <div
                className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em]"
                style={{
                  color: isActive
                    ? 'rgba(110,231,183,0.85)'
                    : 'rgba(255,255,255,0.35)',
                  transition: `color ${T_TILE} ${EASE}`,
                }}
              >
                {s.label}
              </div>
            </button>
          );
        })}
        {/* Native range input (invisible, overlay) for accessibility */}
        <input
          ref={rangeRef}
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={0.1}
          value={capturePct}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          aria-label={`SOM capture percentage: ${capturePct}%`}
          className="absolute inset-x-0 top-1/2 z-20 h-6 w-full -translate-y-1/2 cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-300 [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(16,185,129,0.2)] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-emerald-300"
        />
      </div>

      {/* Helper line */}
      <p className="mt-12 max-w-[60ch] text-[12.5px] leading-[1.5] text-background/55">
        Capture % applied to total US SAM. Base case (3%) is the
        planning number; Conservative (1%) is the floor we underwrite
        to. Platform-optionality vectors (API for regulated chatbots,
        multimodal verification, EU AI Act compliance) sit on top of
        these and are not included.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// METHODOLOGY PANEL — disclosed on demand. Same content that used to
// live in the bottom-of-section paragraph, plus the per-vertical
// citation list collected in one place.
// ─────────────────────────────────────────────────────────────────────────
function MethodologyPanel() {
  return (
    <div
      className="mt-5 rounded-md border border-background/10 bg-background/[0.04] p-5 lg:p-6"
      style={{ animation: `marketmap-panel-down 280ms ${EASE} both` }}
    >
      <style>{`
        @keyframes marketmap-panel-down {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-300">
            How the math works
          </p>
          <p className="mt-3 text-[13px] leading-[1.6] text-background/75">
            Each vertical&rsquo;s SAM is computed as <em>addressable orgs ×
            avg ARR</em>. Org counts come from public regulator
            registries; per-vertical ARR is blended across customer-size
            tiers and validated against analogous compliance-SaaS
            pricing. The total US SAM is the sum of all eight verticals
            (~$1.47B).
          </p>
          <p className="mt-3 text-[13px] leading-[1.6] text-background/75">
            EN-market expansion (UK / Canada / AU) layers another
            1.5–2×. The EU AI Act layer adds another 1.2–1.5× on top of
            that. Neither is included in the headline number — they sit
            on top as optionality.
          </p>
          <p className="mt-3 text-[12px] leading-[1.55] text-background/55">
            Numbers are decision-framing estimates, not committed
            forecasts. Sources for each vertical are linked at right.
          </p>
        </div>
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-300">
            Per-vertical sources
          </p>
          <ul className="mt-3 space-y-2 text-[12.5px] leading-[1.5]">
            {VERTICALS.map((v) => (
              <li key={v.key} className="flex items-baseline justify-between gap-3">
                <span className="text-background/65">{v.name}</span>
                <span className="text-right text-background/55">
                  {v.sourceLabel}
                  <Citation id={v.citation} tone="onDark" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
