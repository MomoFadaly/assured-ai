/**
 * SectionBackdrop — drop into any section's first child (under `relative overflow-hidden`)
 * to give it an atmospheric, light-mode-and-dark-mode-correct photo backdrop.
 *
 *   <section className="relative overflow-hidden ...">
 *     <SectionBackdrop src="https://images.unsplash.com/..." intensity="subtle" />
 *     <div className="relative ...">…content…</div>
 *   </section>
 *
 * Why a component:
 *   Each photo needs different filter + opacity per theme because:
 *     - Light mode: photos drift toward washed-out; we tint down with low opacity
 *       and let them sit slightly desaturated on the off-white bg.
 *     - Dark mode: photos drift toward muddy; we drop brightness + saturate
 *       and bump opacity slightly so the photo registers without overwhelming.
 *   Two stacked divs with `dark:hidden` / `hidden dark:block` keeps both treatments
 *   pure and avoids one fragile filter that has to work in both modes.
 */
interface BackdropProps {
  src: string;
  /** Optional separate photo for dark mode — defaults to the same src. */
  darkSrc?: string;
  /** Visual weight of the photo. `subtle` ≈ 5–12% opacity; `dramatic` ≈ 45–55%. */
  intensity?: 'subtle' | 'moderate' | 'dramatic';
  /** CSS background-position value (e.g. `center`, `top`, `30% 60%`). */
  position?: string;
  /** Whether to apply a 2px blur to the photo (soft atmospheric look). */
  blur?: boolean;
  /** Add a top/bottom fade so the photo doesn't end harshly against neighbors. */
  fade?: boolean;
}

const PRESETS = {
  subtle: {
    light: { opacity: 0.05, brightness: 1.0, saturate: 50 },
    dark: { opacity: 0.14, brightness: 0.7, saturate: 50 },
  },
  moderate: {
    light: { opacity: 0.12, brightness: 1.0, saturate: 65 },
    dark: { opacity: 0.2, brightness: 0.55, saturate: 55 },
  },
  dramatic: {
    light: { opacity: 0.45, brightness: 0.92, saturate: 75 },
    dark: { opacity: 0.6, brightness: 0.4, saturate: 70 },
  },
} as const;

/**
 * Rewrites a single Unsplash URL into an srcset across 4 widths.
 * Mobile gets ~640px instead of the original 2000-2400px requested by some callers.
 *
 * Replaces the `&w=` query param (or appends one) so the same source URL
 * can serve responsive sizes via `<img srcset>`.
 */
function unsplashSrcset(src: string): string {
  if (!src.includes('unsplash.com')) return src; // no-op for non-Unsplash
  const widths = [640, 960, 1440, 1920];
  return widths
    .map((w) => {
      const u = src.replace(/&w=\d+/g, '').replace(/(\?|&)$/, '');
      const sep = u.includes('?') ? '&' : '?';
      return `${u}${sep}w=${w} ${w}w`;
    })
    .join(', ');
}

/**
 * Pick the smallest reasonable default (mobile-first).
 */
function unsplashDefaultSrc(src: string): string {
  if (!src.includes('unsplash.com')) return src;
  return src.replace(/&w=\d+/g, '').replace(/(\?|&)$/, '') + (src.includes('?') ? '&' : '?') + 'w=960';
}

interface BackdropProps2 extends BackdropProps {
  /** When true, eagerly load (use only above-the-fold). Defaults to lazy. */
  priority?: boolean;
}

export function SectionBackdrop({
  src,
  darkSrc,
  intensity = 'subtle',
  position = 'center',
  blur = true,
  fade = true,
  priority = false,
}: BackdropProps2) {
  const preset = PRESETS[intensity];
  const blurStr = blur ? 'blur(2px) ' : '';
  const sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw';

  // Build src + srcset for both light and dark layers
  const lightSrc = unsplashDefaultSrc(src);
  const lightSrcSet = unsplashSrcset(src);
  const darkSrcUrl = unsplashDefaultSrc(darkSrc ?? src);
  const darkSrcSet = unsplashSrcset(darkSrc ?? src);

  const commonImgClass = 'pointer-events-none absolute inset-0 size-full object-cover photo-cinematic ken-burns';

  return (
    <>
      {/* Light-mode photo layer */}
      <img
        aria-hidden
        alt=""
        src={lightSrc}
        srcSet={lightSrcSet}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'low'}
        className={`${commonImgClass} dark:hidden`}
        style={{
          objectPosition: position,
          filter: `${blurStr}saturate(${preset.light.saturate}%) brightness(${preset.light.brightness})`,
          opacity: preset.light.opacity,
        }}
      />

      {/* Dark-mode photo layer (defaults to same src) */}
      <img
        aria-hidden
        alt=""
        src={darkSrcUrl}
        srcSet={darkSrcSet}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'low'}
        className={`${commonImgClass} hidden dark:block`}
        style={{
          objectPosition: position,
          filter: `${blurStr}saturate(${preset.dark.saturate}%) brightness(${preset.dark.brightness})`,
          opacity: preset.dark.opacity,
        }}
      />

      {/* Top + bottom fade — softens hard edges where section meets neighbors */}
      {fade && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-transparent to-background"
        />
      )}
    </>
  );
}
