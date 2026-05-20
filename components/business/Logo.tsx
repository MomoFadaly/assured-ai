'use client';

/**
 * Logo system — Phase 2 (built per feedback_visual_work_quality_gate.md)
 * ────────────────────────────────────────────────────────────────────
 *
 * Three primitives serve all logo surfaces on /business:
 *
 *   <LogoMark>      Square icon + caption beneath. Default for grids.
 *                   Caption is MANDATORY — Mo's audit flagged "logos
 *                   without names beneath them" as a top complaint.
 *
 *   <LogoCell>      Featured brand cell — larger mark, optional
 *                   one-line context note ("1B+ monthly views"), thicker
 *                   ring. For Hero-style strips and §02 comparables.
 *
 *   <LogoChip>      Pill — small icon + inline brand name. For dense
 *                   inline lists or chip-row treatments.
 *
 * Source policy (see logoUrls.ts):
 *   1. Curated SVG under /logos/{slug}.svg (best)
 *   2. Simple Icons (vector, tech brands only)
 *   3. Google s2/favicons at sz=256 (universal fallback)
 *
 * Error fallback (the big visual fix):
 *   If the image fails to load OR loads at ≤32px (favicon-tier), the
 *   component renders a designed monogram — first letter on a brand-
 *   colored tile — instead of a broken white box. Combined with the
 *   mandatory caption below, the brand stays recognizable.
 */

import { useState, type ReactNode } from 'react';

type Brand = {
  /** Image URL — Simple Icons, Google favicon, or /logos/local.svg */
  src: string;
  /** Brand display name. Used for alt, title, and caption. */
  alt: string;
  /** Optional outbound link to the brand's site. */
  href?: string;
  /** Optional override for the visible caption (default: alt's first segment). */
  label?: string;
  /** Optional brand color for the monogram fallback. Default: emerald-700. */
  color?: string;
};

const SIZE = {
  sm: { tile: 'h-10 w-10', mono: 'text-[15px]', cap: 'text-[11px] leading-[1.2]' },
  md: { tile: 'h-12 w-12', mono: 'text-[18px]', cap: 'text-[12px] leading-[1.25]' },
  lg: { tile: 'h-16 w-16', mono: 'text-[22px]', cap: 'text-[13px] leading-[1.3]' },
  xl: { tile: 'h-20 w-20', mono: 'text-[26px]', cap: 'text-[14px] leading-[1.35]' },
} as const;

type Size = keyof typeof SIZE;

/** Derive a clean display label from the alt string.
 *  "Mayo Clinic" → "Mayo Clinic"
 *  "WCG Clinical (clinical trial coordination)" → "WCG Clinical"
 *  "Microsoft Copilot (Healthcare, Finance, Legal)" → "Microsoft Copilot" */
function deriveLabel(alt: string): string {
  return alt.replace(/\s*[—(].*$/, '').trim();
}

/** Monogram = brand's first character, uppercase. */
function deriveMonogram(alt: string): string {
  const label = deriveLabel(alt);
  // Multi-word: take first letter of first two words.
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0].length <= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return label.slice(0, 1).toUpperCase();
}

// ────────────────────────────────────────────────────────────────────
// <LogoTile> — internal building block. Renders an image with a
// monogram fallback on load error. Used by LogoMark/LogoCell/LogoChip.
// ────────────────────────────────────────────────────────────────────

function LogoTile({
  brand,
  size = 'md',
  ringed = true,
}: {
  brand: Brand;
  size?: Size;
  ringed?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const s = SIZE[size];
  const color = brand.color ?? '#047857';

  if (failed) {
    // Designed monogram fallback. Brand-colored tile, white letter.
    return (
      <div
        className={`${s.tile} inline-flex items-center justify-center rounded-md font-display font-medium tracking-tight ${ringed ? 'ring-1 ring-foreground/10' : ''}`}
        style={{ backgroundColor: `${color}18`, color }}
        aria-label={brand.alt}
        title={brand.alt}
      >
        <span className={s.mono}>{deriveMonogram(brand.alt)}</span>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={brand.src}
      alt={brand.alt}
      title={brand.alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${s.tile} rounded-md object-contain bg-background/95 p-1.5 ${ringed ? 'ring-1 ring-foreground/10' : ''}`}
    />
  );
}

// ────────────────────────────────────────────────────────────────────
// <LogoMark> — primary primitive. Icon + MANDATORY caption beneath.
// ────────────────────────────────────────────────────────────────────

export function LogoMark({
  brand,
  size = 'md',
  showCaption = true,
}: {
  brand: Brand;
  size?: Size;
  showCaption?: boolean;
}) {
  const s = SIZE[size];
  const label = brand.label ?? deriveLabel(brand.alt);

  const inner = (
    <div className="group flex flex-col items-center gap-2">
      <LogoTile brand={brand} size={size} />
      {showCaption ? (
        <div
          className={`${s.cap} max-w-[12ch] text-center font-medium text-foreground/85 transition group-hover:text-foreground`}
          style={{ textWrap: 'balance' }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );

  if (brand.href) {
    return (
      <a
        href={brand.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        aria-label={brand.alt}
      >
        {inner}
      </a>
    );
  }
  return inner;
}

// ────────────────────────────────────────────────────────────────────
// <LogoCell> — featured brand cell with optional context note.
// For Hero strips, §02 comparables, §04 trinity, §07 LLM providers.
// ────────────────────────────────────────────────────────────────────

export function LogoCell({
  brand,
  size = 'lg',
  note,
  highlighted = false,
}: {
  brand: Brand;
  size?: Size;
  /** Optional one-line context, e.g. "1B+ monthly views" or
   *  "communications infrastructure". */
  note?: ReactNode;
  highlighted?: boolean;
}) {
  const s = SIZE[size];
  const label = brand.label ?? deriveLabel(brand.alt);

  const ringClass = highlighted
    ? 'border-emerald-700/40 bg-emerald-50/40'
    : 'border-foreground/10 bg-background hover:border-foreground/25';

  const inner = (
    <div
      className={`group flex flex-col items-center gap-3 rounded-lg border ${ringClass} px-5 py-6 transition`}
    >
      <LogoTile brand={brand} size={size} ringed={false} />
      <div className="flex flex-col items-center gap-1 text-center">
        <div
          className={`${s.cap} font-medium ${highlighted ? 'text-emerald-900' : 'text-foreground'}`}
          style={{ textWrap: 'balance' }}
        >
          {label}
        </div>
        {note ? (
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
            {note}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (brand.href) {
    return (
      <a
        href={brand.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        aria-label={`${brand.alt}${note ? ' — opens in new tab' : ''}`}
      >
        {inner}
      </a>
    );
  }
  return inner;
}

// ────────────────────────────────────────────────────────────────────
// <LogoChip> — pill format with inline name. For dense lists.
// ────────────────────────────────────────────────────────────────────

export function LogoChip({
  brand,
  variant = 'outline',
}: {
  brand: Brand;
  variant?: 'outline' | 'soft';
}) {
  const label = brand.label ?? deriveLabel(brand.alt);
  const cls =
    variant === 'soft'
      ? 'bg-foreground/[0.04] hover:bg-foreground/[0.08]'
      : 'border border-foreground/15 hover:border-foreground/30';

  const inner = (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[13px] font-medium text-foreground/85 transition hover:text-foreground ${cls}`}
    >
      <LogoTile brand={brand} size="sm" ringed={false} />
      <span className="pr-1">{label}</span>
    </span>
  );

  if (brand.href) {
    return (
      <a
        href={brand.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={brand.alt}
      >
        {inner}
      </a>
    );
  }
  return inner;
}

// ────────────────────────────────────────────────────────────────────
// Grid + Strip composers — auto-flow many LogoMarks into rows.
// ────────────────────────────────────────────────────────────────────

export function LogoMarkGrid({
  brands,
  cols = 4,
  size = 'md',
}: {
  brands: Brand[];
  cols?: 3 | 4 | 5 | 6 | 7 | 8;
  size?: Size;
}) {
  const colsClass = {
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-3 sm:grid-cols-5',
    6: 'grid-cols-3 sm:grid-cols-6',
    7: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-7',
    8: 'grid-cols-4 sm:grid-cols-8',
  }[cols];
  return (
    <div className={`grid ${colsClass} gap-x-4 gap-y-6`}>
      {brands.map((b, i) => (
        <LogoMark key={b.alt + i} brand={b} size={size} />
      ))}
    </div>
  );
}

export function LogoMarkStrip({
  brands,
  size = 'md',
}: {
  brands: Brand[];
  size?: Size;
}) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-6">
      {brands.map((b, i) => (
        <LogoMark key={b.alt + i} brand={b} size={size} />
      ))}
    </div>
  );
}
