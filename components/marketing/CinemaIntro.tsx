'use client';

import { useEffect, useState } from 'react';

/**
 * CinemaIntro — the opening "Begin" splash. Always shown on page load
 * (no session-skip). Has two jobs:
 *
 *   1. Earn the audio unlock. Browsers refuse AudioContext.resume()
 *      without a user gesture; scroll/wheel/mousemove don't qualify
 *      reliably across browsers. A "Begin" button click is a guaranteed
 *      qualifying gesture. The AudioContext is created + resumed here
 *      and stored on window for CinemaSound to share.
 *
 *   2. Reset scroll position to top. Mo's spec: a page refresh
 *      mid-cinema should land the user back at the intro, not partway
 *      through. We disable the browser's automatic scrollRestoration
 *      and force `scrollTo(0, 0)` on mount.
 *
 * Body scroll is locked while the intro is up so the user can't drag
 * past it; unlocked on Begin click.
 *
 * Visual design follows the cinema's aesthetic — dark void, faint
 * graph-paper grid, premium serif wordmark, minimal CTA. The 1.6s
 * loader bar is purely ceremonial (no real loading is happening) but
 * gives the experience a deliberate cadence and lets the brand mark
 * sit for a beat before the CTA reveals.
 */
export function CinemaIntro() {
  const [showButton, setShowButton] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ── Scroll discipline ─────────────────────────────────────────
    // Disable the browser's auto-restore on refresh — without this,
    // a refresh mid-cinema lands the user at their previous scroll
    // position rather than back at the intro.
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    // Force scroll to top. Some browsers fire scrollRestoration
    // BEFORE we can set it to manual, so we belt-and-suspenders with
    // an explicit scrollTo here.
    window.scrollTo(0, 0);

    // Lock body scroll while the intro is up.
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    // 1.6s ceremonial loader → reveal Begin button.
    const timer = setTimeout(() => setShowButton(true), 1600);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  const handleBegin = async () => {
    if (exiting) return;

    // ── Audio unlock — the entire reason this overlay exists ──
    // Click is a guaranteed user gesture. Create + resume the
    // AudioContext here and stash on window so CinemaSound shares
    // the same running context rather than each creating their own.
    if (typeof window !== 'undefined') {
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (Ctx) {
          const w = window as unknown as { __cinemaAudioCtx?: AudioContext };
          if (!w.__cinemaAudioCtx) {
            w.__cinemaAudioCtx = new Ctx();
          }
          if (w.__cinemaAudioCtx.state === 'suspended') {
            await w.__cinemaAudioCtx.resume();
          }
        }
      } catch {
        /* audio failure shouldn't block the user from entering the experience */
      }
    }

    // Fade the overlay out.
    setExiting(true);

    // After the fade, unmount and restore body scroll.
    setTimeout(() => {
      setHidden(true);
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      // Also notify any listeners that the cinema has begun. Lets
      // other components react to "the user is ready" if they want
      // to (e.g. start a music bed, kick off a timeline).
      try {
        window.dispatchEvent(new CustomEvent('cinema:begin'));
      } catch {
        /* ignore */
      }
    }, 620);
  };

  if (hidden) return null;

  return (
    <div
      aria-hidden={exiting}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#050507',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: exiting ? 'none' : 'auto',
        // Graph-paper grid matching the cinema's empty stage — visual
        // continuity so when the intro fades, what's beneath looks
        // like the same canvas, just without the overlay.
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        backgroundPosition: 'center',
        // Soft vignette so the center holds the eye.
        boxShadow: 'inset 0 0 240px rgba(0,0,0,0.75)',
      }}
    >
      {/* Brand wordmark */}
      <div
        style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 'clamp(40px, 5.2vw, 68px)',
          color: '#F4F4F6',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginBottom: 14,
          animation: 'cinemaIntroFadeUp 800ms cubic-bezier(0.22, 1, 0.36, 1) backwards',
        }}
      >
        AssuredAI
      </div>
      {/* Tagline */}
      <div
        style={{
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.42)',
          marginBottom: 56,
          animation:
            'cinemaIntroFadeUp 800ms cubic-bezier(0.22, 1, 0.36, 1) 120ms backwards',
        }}
      >
        The proof layer for regulated publishing
      </div>
      {/* Loader bar — only while the loader is animating */}
      {!showButton && (
        <div
          style={{
            width: 180,
            height: 2,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 1,
            overflow: 'hidden',
            position: 'relative',
            animation: 'cinemaIntroFadeUp 700ms cubic-bezier(0.22, 1, 0.36, 1) 240ms backwards',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '100%',
              background: '#F4F4F6',
              boxShadow: '0 0 14px rgba(244,239,229,0.42)',
              transformOrigin: 'left center',
              animation:
                'cinemaIntroLoad 1.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }}
          />
        </div>
      )}
      {/* Begin CTA — replaces the loader once the loader completes */}
      {showButton && (
        <button
          type="button"
          onClick={handleBegin}
          aria-label="Begin the experience"
          className="cinema-intro-begin-btn"
          style={{
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontSize: 13,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#F4F4F6',
            background: 'transparent',
            border: '1px solid rgba(244,239,229,0.5)',
            borderRadius: 999,
            padding: '14px 32px 14px 26px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            animation:
              'cinemaIntroFadeUp 520ms cubic-bezier(0.22, 1, 0.36, 1) backwards, cinemaIntroBtnPulse 2.6s ease-in-out 520ms infinite',
            transition:
              'background 200ms ease-out, border-color 200ms ease-out, transform 120ms ease-out',
            transform: 'translateZ(0)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontSize: 10,
              lineHeight: 1,
              transform: 'translateY(0.5px)',
            }}
          >
            ▸
          </span>
          Begin
        </button>
      )}
      {/* Helper text — reveals with the button */}
      {showButton && (
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.32)',
            animation:
              'cinemaIntroFadeUp 700ms cubic-bezier(0.22, 1, 0.36, 1) 200ms backwards',
          }}
        >
          Sound + motion · best with audio on
        </div>
      )}
    </div>
  );
}
