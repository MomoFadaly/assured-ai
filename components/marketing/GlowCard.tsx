'use client';

/**
 * GlowCard — wraps a child element with the pen-#4 glowing-edge effect.
 *
 * Listens to pointer movement and writes four CSS custom properties on
 * the wrapping element:
 *
 *   --pointer-x  (0% - 100%, relative position)
 *   --pointer-y  (0% - 100%)
 *   --pointer-°  (angle from center to pointer, 0deg - 360deg)
 *   --pointer-d  (closeness to edge, 0 - 100; 100 = on the edge)
 *
 * The `.glow-card` class (defined in globals.css) consumes those
 * properties to render:
 *   - a mesh-gradient BORDER that brightens as the pointer nears the
 *     edge and is masked to a conic arc from the pointer angle
 *   - an EDGE-GLOW (inner + outer box-shadow at --glow-color) masked
 *     to the same conic arc, brightening near the edge
 *
 * On mount, plays a one-shot intro animation that sweeps the angle
 * 360° around the card so first-time visitors see the glow effect
 * even without moving the cursor. Same intro pattern as the original
 * codepen.
 *
 * The child renders inside the card surface — the glow lives in the
 * pseudo-elements and the .glow-card-edge sibling, all
 * z-index-positioned behind/around the child.
 */

import { useCallback, useEffect, useRef } from 'react';

interface GlowCardProps {
  children: React.ReactNode;
  /** Tailwind / CSS class applied to the wrapping element. Must include
   *  `glow-card` for the effect to apply. */
  className?: string;
  /** HSL color string for the glow (e.g. "220deg 95% 78%"). */
  glowColor?: string;
}

export function GlowCard({
  children,
  className = '',
  glowColor = '220deg 95% 78%',
}: GlowCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const animatingRef = useRef(true);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    // Angle in degrees, 0deg = up, clockwise. Same convention as pen #4.
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    // Closeness to edge: 0 at center, 100 right on the edge of the card.
    const kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
    const ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
    const edge = Math.min(100, Math.max(0, 100 / Math.min(kx, ky)));
    el.style.setProperty('--pointer-x', `${(x / rect.width) * 100}%`);
    el.style.setProperty('--pointer-y', `${(y / rect.height) * 100}%`);
    el.style.setProperty('--pointer-\\°', `${angle.toFixed(1)}deg`);
    el.style.setProperty('--pointer-d', `${edge.toFixed(1)}`);
    if (animatingRef.current) {
      animatingRef.current = false;
      el.classList.remove('glow-card-active');
    }
  }, []);

  // ---- Intro animation: sweep the angle 360° on mount --------------
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('glow-card-active');
    const start = performance.now();
    const startAngle = 110;
    const endAngle = 470;
    const duration = 2200;
    let raf: number;
    const tick = (t: number) => {
      const progress = Math.min(1, (t - start) / duration);
      // Ease-in-out cubic
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const angle = startAngle + (endAngle - startAngle) * eased;
      const d = Math.sin(progress * Math.PI) * 100; // peak in the middle of the sweep
      el.style.setProperty('--pointer-\\°', `${angle.toFixed(1)}deg`);
      el.style.setProperty('--pointer-d', `${d.toFixed(1)}`);
      if (progress < 1 && animatingRef.current) {
        raf = requestAnimationFrame(tick);
      } else if (animatingRef.current) {
        // Settle to fully-faded state. Pointer-move will take over.
        el.style.setProperty('--pointer-d', '0');
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      animatingRef.current = false;
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`glow-card ${className}`}
      style={{ ['--glow-color' as string]: glowColor }}
      onPointerMove={handlePointerMove}
    >
      <span className="glow-card-edge" aria-hidden />
      {children}
    </div>
  );
}
