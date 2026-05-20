'use client';
// touch: 1763496720
import { useEffect, useRef, useState } from 'react';

/**
 * Inverted-gate model: chrome is hidden by DEFAULT via CSS. The body only
 * gets `data-chrome-visible` when the user actively scrolls UP. Hiding by
 * default eliminates the flash that used to happen at the hero → cinema
 * boundary, because there's no transient "no attribute is hiding it" window
 * to expose the chrome.
 *
 *   - Page load: hidden.
 *   - Scrolling DOWN: stays hidden.
 *   - Scrolling UP >28px: reveal.
 *   - Scrolling DOWN >28px again: re-hide.
 *   - At the very top (within hero): always hidden, regardless of direction.
 */
export function HeroChromeGate({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const lastY = useRef(0);
  const accum = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const apply = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      lastY.current = y;

      // Hero owns the top of the page — chrome never shows here.
      if (y < 80) {
        accum.current = 0;
        setVisible(false);
        return;
      }

      // Direction change → reset accumulator
      if ((delta < 0 && accum.current > 0) || (delta > 0 && accum.current < 0)) {
        accum.current = 0;
      }
      accum.current += delta;

      // Sustained upward gesture → reveal
      if (accum.current <= -28) {
        accum.current = 0;
        setVisible(true);
      }
      // Sustained downward scroll → hide
      else if (accum.current >= 28) {
        accum.current = 0;
        setVisible(false);
      }
    };
    apply();
    window.addEventListener('scroll', apply, { passive: true });
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
    };
  }, []);

  useEffect(() => {
    if (visible) document.body.setAttribute('data-chrome-visible', 'true');
    else document.body.removeAttribute('data-chrome-visible');
    return () => document.body.removeAttribute('data-chrome-visible');
  }, [visible]);

  // CSS lives in globals.css to avoid React `<style>` HMR weirdness — see
  // the `data-chrome-visible` block there for the actual rules.
  return <>{children}</>;
}
