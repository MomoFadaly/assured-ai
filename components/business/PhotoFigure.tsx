/**
 * PhotoFigure — editorial photographic figure with consistent treatment.
 *
 * Used as cover art on the /business strategic brief. Reference register:
 * Atlantic Brief cover photo · FT Weekend feature image · Stripe Press
 * chapter break.
 *
 * Conventions:
 *  • Full-bleed image at 21:9 or 16:9 (cinematic) or 4:3 (editorial)
 *  • Italic Fraunces caption beneath in muted color
 *  • Subtle source attribution (CC license + author) in tiny mono
 *  • Optional dark gradient overlay for text-overlay variant
 *  • Lazy loading + width-hint via Next/Image-style sizing
 *
 * Photos sourced from U.S. government public-domain repositories
 * (17 USC §105) or Wikipedia Commons CC-licensed assets.
 */

import type { ReactNode } from 'react';

export type PhotoFigureProps = {
  /** Image URL — Wikipedia Commons direct path or public/ asset. */
  src: string;
  /** Required descriptive alt text for accessibility. */
  alt: string;
  /** Visible caption below the image. Renders in italic Fraunces. */
  caption?: ReactNode;
  /** Source attribution (e.g. "Architect of the Capitol · Public domain"). */
  attribution?: ReactNode;
  /** Aspect ratio. */
  aspect?: '21/9' | '16/9' | '4/3' | '3/2' | '1/1';
  /** Sizing within the page column. */
  width?: 'narrow' | 'wide' | 'full-bleed';
  /** Dark gradient overlay (for text-overlay layouts). */
  dim?: boolean;
  /** Overlay content (text / eyebrow rendered over the image). */
  overlay?: ReactNode;
  /** Tone of the surrounding container — affects caption color. */
  tone?: 'light' | 'dark';
};

export function PhotoFigure({
  src,
  alt,
  caption,
  attribution,
  aspect = '16/9',
  width = 'wide',
  dim = false,
  overlay,
  tone = 'light',
}: PhotoFigureProps) {
  const aspectClass = {
    '21/9': 'aspect-[21/9]',
    '16/9': 'aspect-[16/9]',
    '4/3': 'aspect-[4/3]',
    '3/2': 'aspect-[3/2]',
    '1/1': 'aspect-square',
  }[aspect];

  const widthClass = {
    narrow: 'max-w-[680px]',
    wide: 'max-w-[1080px]',
    'full-bleed': 'max-w-none',
  }[width];

  const captionToneClass =
    tone === 'dark' ? 'text-white/70' : 'text-foreground/60';
  const attrToneClass =
    tone === 'dark' ? 'text-white/40' : 'text-foreground/40';

  return (
    <figure className={`mx-auto ${widthClass}`}>
      <div
        className={`relative overflow-hidden rounded-lg ${aspectClass} bg-foreground/[0.04]`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {dim ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.75) 100%)',
            }}
          />
        ) : null}
        {overlay ? (
          <div className="absolute inset-0 flex items-end p-8 lg:p-12">
            <div className="max-w-[60ch]">{overlay}</div>
          </div>
        ) : null}
      </div>
      {caption || attribution ? (
        <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 px-1">
          {caption ? (
            <div
              className={`font-display italic text-[15px] leading-[1.45] ${captionToneClass}`}
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 80' }}
            >
              {caption}
            </div>
          ) : null}
          {attribution ? (
            <div
              className={`font-mono text-[11px] uppercase tracking-[0.16em] ${attrToneClass}`}
            >
              {attribution}
            </div>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Curated public-domain photography library for the /business brief.
 * All photos sourced from U.S. government archives (17 USC §105) or
 * Wikipedia Commons. Direct upload URLs are used; no local copies.
 */
// No attribution overlays per editorial direction — these public-domain
// images stand on their own without source-line junk under them.
export const EDITORIAL_PHOTOS = {
  capitolDome: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/The_dome_of_the_United_States_Capitol_building.jpg',
    alt: 'The United States Capitol dome',
  },
  ncatsLab: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Research_scientist_works_in_the_NCATS_chemistry_laboratory.jpg',
    alt: 'A research scientist at the NIH NCATS chemistry laboratory',
  },
  senateHearing: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Senate_Banking_Committee_Hearing_-_Senate_Banking_Committee_hearing_on_Capitol_Hill%2C_including_testimony_by_Assistant_Secretary_for_Public_and_Indian_Housing%2C_Orlando_Cabrera_-_DPLA_-_2c4c565de3ee22edd06c274cf36e77c6.JPG',
    alt: 'Senate Banking Committee hearing on Capitol Hill',
  },
  senateFloor: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/d/df/United_States_Senate_Floor.jpg',
    alt: 'The United States Senate floor in session',
  },
} as const;
