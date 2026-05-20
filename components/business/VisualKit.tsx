'use client';

/**
 * VisualKit — shared visual primitives used across the /business brief.
 *
 *  - <Counter>          animated number reveal as element enters viewport
 *  - <LogoTile>         monochrome / colored logo chip (Simple Icons / Google favicon / Wikipedia)
 *  - <LogoStrip>        horizontal logo row with optional kinetic scroll
 *  - <LogoGrid>         responsive grid of logo tiles
 *  - <StatCard>         big-display-type stat with label + delta
 *  - <PullStat>         enormous freestanding number with sub-label
 *  - <SectionIcon>      Lucide-driven icon wrapped in a styled tile
 *  - <TrustSeal>        official-looking trust mark badge
 *  - <Chip>             small label chip with optional color
 *
 *  Logo resolver helpers below let callers reference brands by slug and
 *  get a sensible URL (Simple Icons → Wikipedia → Google favicon fallback).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';

// Logo URL helpers live in ./logoUrls.ts (server-safe).
// Re-exported here for convenience for client-side consumers.
export { simpleIconUrl, googleFaviconUrl, wikiCommonsUrl } from './logoUrls';

// ─────────────────────────────────────────────────────────────────────────
// <Counter>
// ─────────────────────────────────────────────────────────────────────────

export function Counter({
  to,
  prefix = '',
  suffix = '',
  duration = 1.6,
  decimals = 0,
  className = '',
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const startVal = 0;
    let raf: number;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min(1, (ts - start) / (duration * 1000));
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(startVal + (to - startVal) * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// <LogoTile> — Phase 2 redesign
//
// • Optional caption beneath the mark (turned on by LogoStrip / LogoGrid).
// • Monogram-on-brand-color fallback when the image fails to load,
//   so broken sources never render as empty white outlined boxes.
// • Default sz=256 from logoUrls means most marks now arrive at
//   128–256px native (was 16–32px pre-Phase-2).
// ─────────────────────────────────────────────────────────────────────────

function deriveCaption(alt: string): string {
  return alt.replace(/\s*[—–(].*$/, '').trim();
}

function deriveMonogram(alt: string): string {
  const label = deriveCaption(alt);
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0].length <= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return label.slice(0, 1).toUpperCase();
}

export function LogoTile({
  src,
  alt,
  href,
  size = 'md',
  rounded = false,
  inverted = false,
  showCaption = true, // Phase 2 update: captions are the default.
  caption,
  color = '#047857',
  tooltip,
}: {
  src: string;
  alt: string;
  href?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: boolean;
  inverted?: boolean;
  /** Render the brand name caption beneath the mark. DEFAULT TRUE per
   *  Mo's audit — every logo must have its name visible. Pass false
   *  only when the surrounding container already shows the brand name. */
  showCaption?: boolean;
  /** Override the auto-derived caption text. */
  caption?: string;
  /** Brand color used for the monogram fallback tile. */
  color?: string;
  /** Optional destination-page header shown in a hover tooltip. When
   *  provided alongside `href`, hovering the tile (or its caption)
   *  instantly reveals a small card showing this header + the URL
   *  host/path + an ↗ "new-tab" indicator. CSS-only, no JS. */
  tooltip?: string;
}) {
  const [failed, setFailed] = useState(false);
  // Phase 2 sizing: every tier ~1.5x bigger than the original scale.
  // xs (32) sm (48) md (60) lg (80) xl (104).
  const sizeClass = {
    xs: 'h-8 w-8',
    sm: 'h-12 w-12',
    md: 'h-[60px] w-[60px]',
    lg: 'h-20 w-20',
    xl: 'h-[104px] w-[104px]',
  }[size];
  const monoTextClass = {
    xs: 'text-[13px]',
    sm: 'text-[17px]',
    md: 'text-[22px]',
    lg: 'text-[28px]',
    xl: 'text-[36px]',
  }[size];
  const captionTextClass = {
    xs: 'text-[11px] leading-[1.2]',
    sm: 'text-[12px] leading-[1.25]',
    md: 'text-[14px] leading-[1.3]',
    lg: 'text-[15px] leading-[1.35]',
    xl: 'text-[17px] leading-[1.4]',
  }[size];

  const mark = failed ? (
    <div
      className={`${sizeClass} inline-flex items-center justify-center rounded-md font-display font-medium tracking-tight ${monoTextClass}`}
      style={{
        backgroundColor: `${color}1a`,
        color,
        boxShadow: `inset 0 0 0 1px ${color}30`,
      }}
      title={alt}
      aria-label={alt}
    >
      {deriveMonogram(alt)}
    </div>
  ) : (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${sizeClass} object-contain transition opacity-95 group-hover:opacity-100 ${
        rounded ? 'rounded-md' : ''
      }`}
    />
  );

  // Phase 2 fix: inverted mode no longer applies brightness:0 invert:1 (which
  // strips detail from filled logos like KFF, the Presidential Seal, the
  // Florey Institute). Instead render logos in their native colors against
  // a white tile background — preserves brand recognition on dark canvas.
  const wrapClass = `group inline-flex items-center justify-center rounded-md p-2.5 ring-1 transition ${
    inverted
      ? 'bg-white/95 ring-white/20 hover:ring-white/45 hover:bg-white'
      : 'bg-background ring-foreground/10 hover:ring-foreground/30'
  }`;

  const tileNode = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={wrapClass}
      aria-label={alt}
    >
      {mark}
    </a>
  ) : (
    <div className={wrapClass}>{mark}</div>
  );

  // ── Hover tooltip ────────────────────────────────────────────────────
  // CSS-only, instant (no animation delay). Shows destination-page
  // header + url host/path + ↗ new-tab indicator. Positioned above the
  // tile with a small downward-pointing notch. Pointer-events none so
  // it never intercepts the underlying link click.
  // (HMR nudge 2026-05-19)
  // tooltipNode lazy build below
  const tooltipNode = href && tooltip ? (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-50 hidden w-[280px] -translate-x-1/2 rounded-md border border-foreground/15 bg-background/98 px-3.5 py-2.5 text-left shadow-[0_18px_50px_-18px_rgba(0,0,0,0.45)] backdrop-blur group-hover:block"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium leading-[1.35] text-foreground">
            {tooltip}
          </div>
          <div
            className="mt-1 truncate font-mono text-[10.5px] leading-[1.3] text-muted-foreground"
            title={href}
          >
            {(() => {
              try {
                const u = new URL(href);
                const path = u.pathname.length > 32
                  ? u.pathname.slice(0, 30) + '…'
                  : u.pathname;
                return `${u.hostname}${path}`;
              } catch {
                return href;
              }
            })()}
          </div>
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 flex-shrink-0 text-foreground/50 mt-0.5"
        >
          <path
            d="M5 3h8v8M5 11l8-8M5 11v0M13 3v0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {/* Notch pointing down to the tile */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[5px]"
      >
        <div className="h-2.5 w-2.5 rotate-45 border-b border-r border-foreground/15 bg-background/98"></div>
      </div>
    </div>
  ) : null;

  if (!showCaption) {
    // No caption — wrap in a relative span so the tooltip can position
    // against the tile itself, and so `group-hover` works.
    return (
      <span className="group relative inline-flex">
        {tileNode}
        {tooltipNode}
      </span>
    );
  }

  const labelText = caption ?? deriveCaption(alt);
  return (
    <div className="group relative inline-flex flex-col items-center gap-2">
      {tileNode}
      <div
        className={`${captionTextClass} max-w-[14ch] text-center font-medium ${
          inverted ? 'text-white/85 group-hover:text-white' : 'text-foreground/85 group-hover:text-foreground'
        } transition`}
        style={{ textWrap: 'balance' }}
      >
        {labelText}
      </div>
      {tooltipNode}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// <LogoStrip>
// Phase 2: captions ON by default. Pass showCaption={false} to suppress
// for compact decorative strips where text would dilute the composition.
// Tile sizes bumped (sm → md default) to match the new 256px-native marks.
// ─────────────────────────────────────────────────────────────────────────

export function LogoStrip({
  logos,
  inverted = false,
  size = 'md',
  showCaption = true,
}: {
  logos: Array<{ src: string; alt: string; href?: string; caption?: string; color?: string }>;
  inverted?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showCaption?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-6">
      {logos.map((l, i) => (
        <LogoTile
          key={i}
          {...l}
          inverted={inverted}
          size={size}
          showCaption={showCaption}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// <LogoGrid>
// Phase 2: captions ON by default. Wider default gap to give captions
// breathing room. Tile size bumped to md (40px) so the marks anchor
// the grid before captions take over the visual weight.
// ─────────────────────────────────────────────────────────────────────────

export function LogoGrid({
  logos,
  cols = 6,
  inverted = false,
  size = 'md',
  showCaption = true,
}: {
  logos: Array<{ src: string; alt: string; href?: string; caption?: string; color?: string }>;
  cols?: 4 | 5 | 6 | 8;
  inverted?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showCaption?: boolean;
}) {
  const colsClass = {
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-5',
    6: 'grid-cols-3 sm:grid-cols-6',
    8: 'grid-cols-4 sm:grid-cols-8',
  }[cols];
  return (
    <div className={`grid ${colsClass} gap-x-4 gap-y-6`}>
      {logos.map((l, i) => (
        <LogoTile
          key={i}
          {...l}
          inverted={inverted}
          size={size}
          showCaption={showCaption}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// <StatCard>
// ─────────────────────────────────────────────────────────────────────────

export function StatCard({
  eyebrow,
  value,
  suffix,
  caption,
  variant = 'light',
  size = 'md',
}: {
  eyebrow: string;
  value: ReactNode;
  suffix?: string;
  caption?: ReactNode;
  variant?: 'light' | 'dark' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}) {
  const valueSize = {
    sm: 'text-[clamp(1.5rem,2.2vw,1.85rem)]',
    md: 'text-[clamp(2rem,3vw,2.6rem)]',
    lg: 'text-[clamp(2.5rem,4.5vw,3.6rem)]',
  }[size];

  const variantClass = {
    light: 'bg-background border-foreground/10',
    dark: 'bg-[#0a0e1a] border-white/10 text-white',
    accent: 'bg-emerald-50/50 border-emerald-700/25 text-foreground',
  }[variant];

  const eyebrowClass = {
    light: 'text-muted-foreground',
    dark: 'text-emerald-300/85',
    accent: 'text-emerald-700',
  }[variant];

  return (
    <div className={`rounded-lg border ${variantClass} p-6`}>
      <div className={`font-mono text-[12px] uppercase tracking-[0.16em] ${eyebrowClass}`}>
        {eyebrow}
      </div>
      <div
        className={`mt-3 font-display ${valueSize} font-medium leading-[1.05]`}
        style={{ fontVariationSettings: '"SOFT" 30, "opsz" 144' }}
      >
        {value}
        {suffix ? <span className="opacity-70">{suffix}</span> : null}
      </div>
      {caption ? (
        <div className={`mt-2 text-[15px] leading-[1.5] ${variant === 'dark' ? 'text-white/65' : 'text-muted-foreground'}`}>
          {caption}
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// <PullStat> — gigantic centerpiece number
// ─────────────────────────────────────────────────────────────────────────

export function PullStat({
  eyebrow,
  value,
  caption,
  variant = 'light',
}: {
  eyebrow: string;
  value: ReactNode;
  caption?: ReactNode;
  variant?: 'light' | 'dark' | 'accent';
}) {
  const valueClass = variant === 'dark' ? 'text-white' : 'text-foreground';
  const eyebrowClass = variant === 'dark' ? 'text-emerald-300/85' : 'text-emerald-700';
  const captionClass = variant === 'dark' ? 'text-white/65' : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className="text-center"
    >
      <div className={`font-mono text-[12px] uppercase tracking-[0.16em] ${eyebrowClass}`}>
        {eyebrow}
      </div>
      <div
        className={`mt-4 font-display text-[clamp(3.5rem,8vw,7rem)] font-medium leading-[0.95] tracking-[-0.02em] ${valueClass}`}
        style={{ fontVariationSettings: '"SOFT" 30, "opsz" 144' }}
      >
        {value}
      </div>
      {caption ? (
        <div className={`mx-auto mt-4 max-w-[52ch] text-[17px] leading-[1.55] ${captionClass}`}>
          {caption}
        </div>
      ) : null}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// <SectionIcon>
// ─────────────────────────────────────────────────────────────────────────

export function SectionIcon({
  children,
  color = '#047857',
  size = 'md',
}: {
  children: ReactNode;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass = {
    sm: 'h-9 w-9 [&>svg]:h-4 [&>svg]:w-4',
    md: 'h-12 w-12 [&>svg]:h-5 [&>svg]:w-5',
    lg: 'h-16 w-16 [&>svg]:h-7 [&>svg]:w-7',
  }[size];
  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg ${sizeClass}`}
      style={{
        backgroundColor: `${color}15`,
        color,
        boxShadow: `inset 0 0 0 1px ${color}25`,
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// <TrustSeal>
// ─────────────────────────────────────────────────────────────────────────

export function TrustSeal({
  title,
  subtitle,
  icon,
  status = 'planned',
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  status?: 'shipping' | 'planned' | 'roadmap';
}) {
  const statusColor = {
    shipping: '#047857',
    planned: '#b45309',
    roadmap: '#6b7280',
  }[status];

  return (
    <div className="relative inline-flex flex-col items-center justify-center rounded-full border-2 border-foreground/10 bg-background p-4 text-center"
         style={{ width: 120, height: 120 }}>
      <div className="absolute inset-0 rounded-full" style={{
        background: `radial-gradient(circle, transparent 60%, ${statusColor}08 100%)`
      }} />
      <div className="relative" style={{ color: statusColor }}>
        {icon}
      </div>
      <div className="relative mt-1 font-mono text-[12px] uppercase tracking-[0.16em] text-foreground/85 leading-tight">
        {title}
      </div>
      {subtitle ? (
        <div className="relative mt-0.5 text-[12px] text-muted-foreground leading-tight">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// <Chip>
// ─────────────────────────────────────────────────────────────────────────

export function Chip({
  children,
  color,
  variant = 'soft',
}: {
  children: ReactNode;
  color?: string;
  variant?: 'soft' | 'outline' | 'solid';
}) {
  const c = color || '#047857';
  const baseClasses = 'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[12px] uppercase tracking-[0.16em]';
  if (variant === 'solid') {
    return (
      <span className={baseClasses} style={{ backgroundColor: c, color: 'white' }}>
        {children}
      </span>
    );
  }
  if (variant === 'outline') {
    return (
      <span className={baseClasses} style={{ border: `1px solid ${c}40`, color: c }}>
        {children}
      </span>
    );
  }
  return (
    <span className={baseClasses} style={{ backgroundColor: `${c}15`, color: c }}>
      {children}
    </span>
  );
}
