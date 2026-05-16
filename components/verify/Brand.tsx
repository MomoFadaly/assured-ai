/**
 * AssuredAI brand mark.
 *
 * The icon is a shield with a check that's drawn from a stroke that doubles as
 * the "A" of AssuredAI when seen at small sizes — a subtle integration of mark
 * and wordmark. Pure SVG, no external assets, scales cleanly from 16px to 64px.
 */

import { cn } from '@/lib/utils';

export function BrandMark({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-primary', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="brand-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Shield silhouette */}
      <path
        d="M12 2.2 4 5.1v6.4c0 4.5 3.4 8.7 8 10.3 4.6-1.6 8-5.8 8-10.3V5.1L12 2.2Z"
        fill="url(#brand-grad)"
      />
      {/* Inner check */}
      <path
        d="m8 12 2.8 2.8L16 9.6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
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
