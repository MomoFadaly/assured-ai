'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Translate a child element on the Y axis as it scrolls through the viewport.
 * `strength` is the multiplier — 0.2 = subtle, 0.6 = strong. Negative values
 * move the layer in the opposite direction (background-style depth).
 */
export function ParallaxLayer({
  children,
  strength = 0.2,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion — skip parallax entirely
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let rafId = 0;
    let inView = false;

    const update = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const elementCenter = rect.top + rect.height / 2;
      const distanceFromCenter = elementCenter - viewportH / 2;
      setOffset(-distanceFromCenter * strength);
    };

    const onScroll = () => {
      if (rafId || !inView) return;
      rafId = window.requestAnimationFrame(() => {
        update();
        rafId = 0;
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
        if (inView) update();
      },
      { rootMargin: '200px 0px 200px 0px' },
    );
    observer.observe(el);

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      observer.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [strength]);

  return (
    <div ref={ref} className={className} style={{ transform: `translate3d(0, ${offset}px, 0)`, willChange: 'transform' }}>
      {children}
    </div>
  );
}

/**
 * Sticky progress bar at the top of the page. Tracks scroll position
 * relative to total document height.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      setProgress(pct);
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        update();
        rafId = 0;
      });
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[60] h-[2px] bg-transparent">
      <div
        className="h-full origin-left bg-gradient-to-r from-primary via-primary to-emerald-400 shadow-[0_0_18px_rgba(59,130,246,0.65)] transition-[width] duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/**
 * Cursor-tracking glow that follows the mouse around a section. Adds Stripe-style
 * depth — most visible on dark backgrounds.
 */
export function CursorSpotlight({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const move = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
    };
    parent.addEventListener('mousemove', move);
    return () => parent.removeEventListener('mousemove', move);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={className}
      style={{
        background:
          'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--primary)/0.18), transparent 55%)',
      }}
    />
  );
}

/**
 * Element that animates in when it enters the viewport. Uses IntersectionObserver.
 * Each child gets a staggered delay if `stagger` is set.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  className,
  direction = 'up',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'left' | 'right' | 'scale';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const hiddenTransform = {
    up: 'translate3d(0,28px,0)',
    left: 'translate3d(-32px,0,0)',
    right: 'translate3d(32px,0,0)',
    scale: 'translate3d(0,0,0) scale(0.96)',
  }[direction];

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate3d(0,0,0) scale(1)' : hiddenTransform,
        transition:
          'opacity 800ms cubic-bezier(0.16,1,0.3,1), transform 1000ms cubic-bezier(0.16,1,0.3,1)',
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
