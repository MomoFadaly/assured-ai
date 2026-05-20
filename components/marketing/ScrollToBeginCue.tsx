'use client';

import { useEffect, useState } from 'react';

/**
 * ScrollToBeginCue — the cold-open scroll affordance.
 *
 * Mo: "no indication for the user that they need to scroll once
 * they are on the page... when the cursor is blinking or when
 * they stall."
 *
 * Renders a fixed-position "↓ SCROLL TO BEGIN" nudge at the
 * bottom-center of the viewport when window.scrollY === 0. Fades
 * out instantly once the user scrolls. Pure window scroll —
 * deliberately no motion-value plumbing so HMR can't break it.
 *
 * Placed as a sibling to <StoryCinema /> in app/page.tsx, OUTSIDE
 * any transformed container so position:fixed reliably anchors
 * to the viewport.
 */
export function ScrollToBeginCue() {
  const [visible, setVisible] = useState(true);
  const [armed, setArmed] = useState(false);

  // Wait briefly before showing so the page settles and the user
  // sees the cold-open frame first. 700ms gives enough time for
  // the CinemaIntro overlay to start fading.
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 700);
    return () => clearTimeout(t);
  }, []);

  // Hide as soon as the user scrolls past a small threshold.
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 80) setVisible(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 56,
        transform: 'translateX(-50%)',
        zIndex: 60,
        opacity: armed && visible ? 1 : 0,
        transition: 'opacity 720ms ease-out',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        color: 'rgba(255,255,255,0.9)',
        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        textShadow: '0 1px 8px rgba(0,0,0,0.7)',
      }}
    >
      <span>Scroll to begin</span>
      <span
        style={{
          fontSize: 22,
          animation: 'idleNudgeBounce 1.6s ease-in-out infinite',
        }}
      >
        ↓
      </span>
    </div>
  );
}
