'use client';

/**
 * MeshBackground — cursor-tracking SVG gradient mesh.
 *
 * The "signature interactive element" — a Stripe-tier gradient mesh
 * that morphs subtly under cursor + recolors when the user picks an
 * industry. Pure SVG (no WebGL) so it's <2kb, accessible, and works
 * in every browser. Three orbs, each tracking a different cursor
 * offset with a long ease so the motion feels organic instead of
 * snappy.
 *
 * This is the kind of element you can't unsee — once a visitor's
 * picked an industry, the entire background re-tints around their
 * cursor like the page is breathing in their vertical's colour.
 */

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface MeshBackgroundProps {
  /** Hex colour anchor for the three orbs. Defaults to a neutral blue. */
  accent: string;
  /** Soft companion colour for the second orb. */
  accentSoft: string;
  /** Pause cursor tracking (e.g., when a modal is open). */
  pause?: boolean;
}

export function MeshBackground({ accent, accentSoft, pause = false }: MeshBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  // Long-ease spring so the orbs feel like they're being pulled, not snapping.
  const sx = useSpring(mx, { stiffness: 60, damping: 30 });
  const sy = useSpring(my, { stiffness: 60, damping: 30 });

  // Three orbs at different cursor parallax depths.
  const x1 = useTransform(sx, (v) => `${10 + v * 35}%`);
  const y1 = useTransform(sy, (v) => `${12 + v * 20}%`);
  const x2 = useTransform(sx, (v) => `${50 + v * 30}%`);
  const y2 = useTransform(sy, (v) => `${55 - v * 25}%`);
  const x3 = useTransform(sx, (v) => `${72 - v * 18}%`);
  const y3 = useTransform(sy, (v) => `${78 - v * 30}%`);

  useEffect(() => {
    if (pause) return;
    const el = containerRef.current;
    if (!el) return;

    function onMove(e: PointerEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      mx.set(nx);
      my.set(ny);
    }
    el.addEventListener('pointermove', onMove);
    return () => {
      el.removeEventListener('pointermove', onMove);
    };
  }, [mx, my, pause]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="mesh-orb-1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mesh-orb-2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accentSoft} stopOpacity="0.7" />
            <stop offset="100%" stopColor={accentSoft} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mesh-orb-3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <filter id="mesh-blur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        <g filter="url(#mesh-blur)">
          <motion.ellipse
            cx={x1}
            cy={y1}
            rx="32"
            ry="28"
            fill="url(#mesh-orb-1)"
          />
          <motion.ellipse
            cx={x2}
            cy={y2}
            rx="28"
            ry="24"
            fill="url(#mesh-orb-2)"
          />
          <motion.ellipse
            cx={x3}
            cy={y3}
            rx="24"
            ry="22"
            fill="url(#mesh-orb-3)"
          />
        </g>
      </svg>

      {/* Subtle grain texture on top — adds the cinematic 'film' feel */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
          backgroundSize: '256px 256px',
          opacity: 0.04,
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  );
}
