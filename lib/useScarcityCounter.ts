'use client';

import { useEffect, useState } from 'react';

/**
 * useScarcityCounter — real-time decrementing cohort counter (T11).
 *
 * Audit identified: "47 of 100 spots remaining" was static decoration.
 * A real scarcity device DECREMENTS — the user feels time pressure
 * because the number is moving toward zero in real time.
 *
 * This hook returns a live remaining-count + a flash flag that fires
 * briefly when the counter ticks down. The flash is what makes the
 * scarcity feel real — the user catches a decrement and registers
 * "this is actually happening."
 *
 * Implementation (client-side simulation):
 *   - Counter starts at 100 spots at launch date
 *   - Decrements based on time-since-launch (1.5 spots/day average)
 *   - Min floor of 3 spots (always near-empty to maintain urgency)
 *   - localStorage tracks the "last seen" count per user — if the
 *     count changed between page loads, flash the indicator
 *   - On the page, schedule a synthetic decrement every 90-180s
 *     of dwell time so users actively scrolling see real-time ticks
 *
 * The full version would have a server-side counter backed by real
 * signups. This is a client-side simulation that LOOKS real — but
 * is consistent across page loads via deterministic math + a small
 * stochastic-feeling drift.
 */

const LAUNCH_DATE = new Date('2026-08-01T00:00:00Z');
const STARTING_COUNT = 100;
const FLOOR_COUNT = 3;
const DECREMENT_PER_DAY = 1.5;
const STORAGE_KEY = 'assuredai_cohort_seen_count';

function computeBaseCount(): number {
  const now = Date.now();
  const daysSinceLaunch = (now - LAUNCH_DATE.getTime()) / 86400000;
  // Faster early decrement, slower as cohort fills
  const baseDecrement = Math.max(0, daysSinceLaunch * DECREMENT_PER_DAY);
  // Add small deterministic variation based on day-of-year so the
  // number feels "alive" but is consistent per visit
  const dayOfYear = Math.floor((now / 86400000) % 365);
  const seedVariation = ((dayOfYear * 7919) % 13) / 10; // 0.0-1.2
  const raw = STARTING_COUNT - baseDecrement - seedVariation;
  return Math.max(FLOOR_COUNT, Math.floor(raw));
}

export function useScarcityCounter(): { count: number; flashed: boolean } {
  const [count, setCount] = useState<number>(() => {
    // SSR-safe: return base count without localStorage access
    if (typeof window === 'undefined') return STARTING_COUNT - 53; // 47 default
    return computeBaseCount();
  });
  const [flashed, setFlashed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // On mount: check if count changed since last visit — if so, flash
    const lastSeenStr = localStorage.getItem(STORAGE_KEY);
    const currentCount = computeBaseCount();
    setCount(currentCount);
    if (lastSeenStr !== null) {
      const lastSeen = parseInt(lastSeenStr, 10);
      if (!Number.isNaN(lastSeen) && lastSeen > currentCount) {
        // Count decreased since last visit — flash the indicator
        setFlashed(true);
        const t = setTimeout(() => setFlashed(false), 2000);
        return () => clearTimeout(t);
      }
    }
    localStorage.setItem(STORAGE_KEY, String(currentCount));

    // Schedule synthetic decrements during dwell — every 90-180s a
    // random visitor "claims" a spot. Makes the scarcity feel live.
    let decTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleDecrement = () => {
      const delayMs = 90000 + Math.random() * 90000; // 90-180s
      decTimer = setTimeout(() => {
        setCount((prev) => {
          const next = Math.max(FLOOR_COUNT, prev - 1);
          if (next !== prev) {
            setFlashed(true);
            setTimeout(() => setFlashed(false), 2000);
            try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* no-op */ }
          }
          return next;
        });
        scheduleDecrement();
      }, delayMs);
    };
    scheduleDecrement();

    return () => {
      if (decTimer) clearTimeout(decTimer);
    };
  }, []);

  return { count, flashed };
}
