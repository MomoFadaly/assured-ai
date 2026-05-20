'use client';

import Link from 'next/link';
import { BrandLockup } from '@/components/verify/Brand';

/**
 * CinemaTopBar — the minimal cinematic chrome shown while a cinema section
 * is sticky-pinned in the viewport. Logo (top-left) plus Login + Try
 * AssuredAI (top-right).
 *
 * 2026-05-19: the adaptive 4-state CTA system (T12) was retired. Mo
 * removed the "Scan your draft" anchor target (PasteAndScan) and the
 * "Q3 cohort" messaging entirely, so the cycling labels lost their
 * referents. Reverted to a single consistent CTA. Cleaner read,
 * fewer moving parts, no dead anchors.
 */
const CTA_LABEL = 'Try AssuredAI';
const CTA_HREF = '/get-started';

export function CinemaTopBar() {
  // Active state retained as a single static value so the JSX below
  // doesn't need to change. If the adaptive cycling is ever wanted
  // back, restore CTA_STATES + the scroll listener.
  const active = { label: CTA_LABEL, href: CTA_HREF };

  return (
    <div
      data-cinema-topbar
      aria-hidden="false"
      className="pointer-events-none fixed inset-x-0 top-0 z-40"
    >
      <div className="pointer-events-auto mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4">
        <Link
          href="/"
          aria-label="AssuredAI home"
          className="opacity-70 transition-opacity hover:opacity-100"
        >
          <BrandLockup showBadge={false} className="text-white" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-white/55 transition-colors hover:text-white"
            style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
          >
            Login
          </Link>
          {/* ADAPTIVE CTA — label crossfades as cinema scroll position
              crosses thresholds. Keyed by label so React re-renders
              with a CSS animation on each transition. */}
          <Link
            href={active.href}
            key={active.label}
            className="cinema-cta-adaptive rounded-md border border-white/25 px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-white/75 transition-all hover:border-white/50 hover:bg-white/5 hover:text-white"
            style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
          >
            {active.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
