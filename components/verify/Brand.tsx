/**
 * AssuredAI brand mark — the INK-BLEED signature.
 *
 * Audit by world-class creative directors revealed the prior shield-
 * with-check was indistinguishable from every other Series A
 * compliance-tech startup (Vanta, Drata, OneTrust, Persona…). It
 * could be ANY safety-layer product. That's a structural ceiling on
 * brand recall.
 *
 * The new mark is a signature GESTURE, not an icon:
 *   • Lowercase italic "a" (the start of "assured") in editorial
 *     serif — a writer's mark, not a security mark
 *   • Beneath it: a wet red ink-line that ENDS in a small bleed-pool
 *   • The bleed-pool IS the brand's 200ms-recognition image
 *
 * Why this works: the red bleed is the SAME gesture the AssuredAI
 * product draws beneath dangerous sentences (see InkBleed in
 * StoryCinema). Brand = product gesture. One move, one meaning:
 * someone is paying attention to your words.
 *
 * The mark IS the underline. The underline IS the catch. The catch
 * IS AssuredAI.
 */

import { cn } from '@/lib/utils';

const INK_RED = '#C62B2B'; // editorial-correction red — see StoryCinema C.risk

export function BrandMark({ className, size = 24 }: { className?: string; size?: number }) {
  // Mark is wider than tall (28×32 viewBox at scale-1.15) so the
  // underline + ink-bleed terminator can extend past the "a" baseline
  // without clipping. Strokes preserved via overflow:visible.
  const w = Math.round(size * 1.15);
  const h = Math.round(size * 1.33);
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 28 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className ?? 'text-primary')}
      aria-hidden
      style={{ overflow: 'visible' }}
    >
      {/* Italicized lowercase "a" — drawn as a single closed path in
          display-serif weight. Approximates a Bodoni / Didone "a"
          at 22pt with a slight rightward slant. */}
      <path
        d="M6.5 21.4
           c0-2.8 2.0-5.2 5.0-5.2
           c1.8 0 3.3 0.9 4.2 2.3
           v-2.0
           c0-2.8-1.4-4.0-3.6-4.0
           c-1.8 0-3.0 0.7-4.4 1.8
           l-0.4-1.2
           c1.6-1.3 3.4-2.0 5.4-2.0
           c3.6 0 5.8 2.0 5.8 5.4
           v9.5
           h-1.8
           l-0.6-1.8
           c-0.9 1.3-2.4 2.2-4.6 2.2
           c-3.0 0-5.0-2.0-5.0-5.0z
           M11.8 25.0
           c2.0 0 3.8-1.4 3.8-4.2
           v-0.5
           c0-0.8-1.4-1.7-3.2-1.7
           c-2.4 0-3.8 1.3-3.8 3.3
           c0 1.9 1.3 3.1 3.2 3.1z"
        fill="currentColor"
        fillRule="evenodd"
      />
      {/* Red ink underline — the gesture. Slight irregularity
          (the path has gentle wobble across the baseline) so it
          reads as hand-deposited ink, not a CSS border. */}
      <path
        d="M3.5 28.2
           c4.5 -0.4 9.2 -0.4 13.6 -0.2
           c2.8 0.1 5.4 0.3 7.2 0.5"
        fill="none"
        stroke={INK_RED}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Ink-bleed terminator — the wet drop at the end of the line.
          THIS is the brand's 200ms image. Unique. Ownable. */}
      <ellipse
        cx="24.6"
        cy="28.8"
        rx="1.2"
        ry="1.0"
        fill={INK_RED}
      />
      {/* Soft bleed halo around the terminator — the ink soaking
          into the paper. Pushes the brand mark from "logo" to
          "physical gesture". */}
      <ellipse
        cx="24.6"
        cy="28.8"
        rx="2.2"
        ry="1.6"
        fill={INK_RED}
        opacity="0.28"
        style={{ filter: 'blur(1.2px)' }}
      />
    </svg>
  );
}

/**
 * BrandLockup — AssuredAI logo + wordmark.
 *
 * The 'Verifier' sub-badge signals "this is the AssuredAI Verifier
 * product" inside the app surface. On marketing pages (home, /get-
 * started, /pricing) it reads as an admin-role badge and confuses
 * the brand, so those surfaces pass `showBadge={false}` to render
 * just the clean wordmark.
 */
export function BrandLockup({
  className,
  showBadge = true,
}: {
  className?: string;
  showBadge?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <BrandMark size={26} />
      <div className="flex items-baseline gap-1">
        <span className="text-[15px] font-semibold tracking-tight">AssuredAI</span>
        {showBadge && (
          <span className="rounded-md border border-border bg-muted px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Verifier
          </span>
        )}
      </div>
    </div>
  );
}
