/**
 * Editorial Design Tokens — /business strategic brief
 * ────────────────────────────────────────────────────────────
 * Single source of truth for type, color, spacing, radius.
 *
 * Rules of engagement:
 *   1. Components consume tokens. They do NOT hand-pick `text-[Npx]`.
 *   2. Eight type tokens, total. Page-wide. If a new size is needed,
 *      either re-use an existing token or argue for adding a 9th — but
 *      never inline `text-[Npx]` outside this file.
 *   3. Three brand colors. Foreground (near-black), Accent (emerald),
 *      Indigo (one contrast color for model-layer / future-state copy).
 *   4. Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128.
 *
 * Reference register: Stripe Press · Atlantic Brief · FT Weekend.
 * NOT Bloomberg Terminal · NOT trading-floor density.
 */

// ─────────────────────────────────────────────────────────────────────────
// Type scale — 8 tokens, 1.25 modular ratio, locked to Geist Sans + Geist
// Mono + Fraunces (font-display) families declared in tailwind.config.ts.
// ─────────────────────────────────────────────────────────────────────────

export const type = {
  /** Tiny mono caps — for footnote labels only. Use sparingly. 11px. */
  eyebrowSm:
    'font-mono text-[11px] uppercase tracking-[0.16em] leading-none tabular-nums',

  /** Standard eyebrow / section label. 12px mono caps. ONE tracking
   *  value (0.16em) is sanctioned. Inconsistent tracking is junk. */
  eyebrow:
    'font-mono text-[12px] uppercase tracking-[0.16em] leading-[1.4] tabular-nums',

  /** Photo captions, table sub-text, source-note strips. 14px Fraunces
   *  italic — Atlantic Brief / FT Weekend convention. */
  caption:
    'font-display italic text-[14px] leading-[1.5] tracking-[0.005em] font-normal',

  /** Sidebar text, dense table rows, supporting paragraphs. 15px sans. */
  bodySm: 'text-[15px] leading-[1.55]',

  /**
   * Primary body. Every paragraph of editorial prose lives here.
   * 17px / 1.6 — Stripe Press, Atlantic Brief, FT Weekend register.
   * text-wrap: pretty fixes widow lines in long paragraphs.
   */
  body: 'text-[17px] leading-[1.6] [text-wrap:pretty]',

  /**
   * Ledes, opening paragraphs, pull-quotes inside body, callout copy.
   * ITALIC Fraunces, opsz 24 for editorial register. 20px / 1.5.
   * "First paragraph after a section header" style. Used to set the
   * tone change from headline → reading.
   */
  lede:
    'font-display italic text-[20px] leading-[1.5] tracking-[-0.005em] font-normal [text-wrap:pretty]',

  /** Card titles, sub-section titles, table headers. 22px display. */
  h3: 'font-display text-[22px] font-medium leading-[1.25] tracking-[-0.01em] [text-wrap:balance]',

  /** Section titles ("02 · The stakes"). Fluid clamp.
   *  text-wrap:balance prevents lonely orphan word on second line. */
  h2: 'font-display text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1.05] tracking-[-0.025em] [text-wrap:balance]',

  /** Hero headline only. One per page. Fluid clamp. */
  h1: 'font-display text-[clamp(4rem,9vw,7.5rem)] font-medium leading-[0.95] tracking-[-0.03em] [text-wrap:balance]',
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Color — 3 brand colors + grayscale. Tailwind utility strings.
// All "color" usages in components MUST come through these tokens.
// ─────────────────────────────────────────────────────────────────────────

export const color = {
  /** Body type, headlines on light backgrounds. */
  ink: 'text-foreground',
  inkMuted: 'text-foreground/70',
  inkSoft: 'text-foreground/60',
  inkFaint: 'text-muted-foreground',

  /** Inverted (dark canvas) ink. */
  inkOnDark: 'text-white',
  inkOnDarkMuted: 'text-white/75',
  inkOnDarkSoft: 'text-white/60',

  /** Primary brand accent — emerald 700. */
  accent: 'text-emerald-700',
  accentMuted: 'text-emerald-700/75',
  accentBg: 'bg-emerald-700',
  accentBgSoft: 'bg-emerald-700/10',
  accentRing: 'ring-emerald-700/30',

  /** Future-state / model-layer contrast — deep indigo (more editorial
   *  than Tailwind's bright purple). Used for §09, LLM-provider copy,
   *  and the "10-year horizon" tile. */
  future: 'text-indigo-800',
  futureMuted: 'text-indigo-800/75',
  futureBg: 'bg-indigo-800',
  futureBgSoft: 'bg-indigo-800/10',
  futureRing: 'ring-indigo-800/25',
} as const;

// Hex equivalents for inline-style usages (gradients, SVG fills, charts).
export const palette = {
  ink: '#0a0e1a',
  inkSoft: '#5b6470',
  accent: '#047857', // emerald-700
  accentSoft: '#10b981', // emerald-500
  accentTint: '#d1fae5', // emerald-100
  future: '#3730a3', // indigo-800
  futureSoft: '#6366f1', // indigo-500
  futureTint: '#e0e7ff', // indigo-100
  warn: '#b45309', // amber-700 — use ONLY for warning chips
  paper: '#fafaf9',
  paperDark: '#0a0e1a',
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Spacing — used for section padding, card padding, gutter math.
// All paddings in components MUST come from this scale.
// ─────────────────────────────────────────────────────────────────────────

export const space = {
  xs: 'p-2', // 8
  sm: 'p-3', // 12
  md: 'p-4', // 16
  lg: 'p-6', // 24
  xl: 'p-8', // 32
  '2xl': 'p-12', // 48
  '3xl': 'p-16', // 64
  '4xl': 'p-24', // 96
} as const;

// Section vertical rhythm — applied to <section> elements directly.
export const section = {
  /** Compact rhythm — 96px top/bottom — for short sections. */
  compact: 'py-24',
  /** Standard rhythm — 128px top/bottom — for most sections. */
  standard: 'py-28 lg:py-32',
  /** Generous rhythm — 160px+ — for hero / decade / cinematic moments. */
  generous: 'py-32 lg:py-40',
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Radius — kept minimal.
// ─────────────────────────────────────────────────────────────────────────

export const radius = {
  none: 'rounded-none',
  sm: 'rounded-sm', // 2
  md: 'rounded-md', // 6
  lg: 'rounded-lg', // 8
  pill: 'rounded-full',
} as const;
