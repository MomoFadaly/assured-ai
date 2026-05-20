// Human-eye capture rig. Goal: see the cold-open the way a real
// visitor would — not at synthetic scroll positions, but during the
// ACTUAL render lifecycle. Captures:
//
//   PHASE 1 — Arrival breath:
//     Frames at t=0, 100, 250, 500, 1000, 1800ms after page paint,
//     BEFORE any scroll, so we can see the CinemaBreath animation
//     (scale 1.018→1.000 + opacity 0.92→1.00 over 1.6s) playing out.
//
//   PHASE 2 — Held-still moment:
//     A frame at t=3500ms with the page completely still. This is
//     what a real human sees if they pause to read before scrolling.
//     The blinking cursor is the only motion. Anything off in this
//     frame is what tanks the first impression.
//
//   PHASE 3 — Natural scroll:
//     Smooth-scroll from y=0 to y=200vh over 6 seconds, capturing
//     every 333ms (~3fps). This shows the typing in REAL TIME the
//     way a slow scroller would experience it.
//
//   PHASE 4 — Quick scroll:
//     Jump from y=0 to y=180vh in one frame, capture immediately.
//     This is what happens when someone hits page-down or scroll-
//     wheels aggressively — does the cold-open still land or does
//     it become a smear?

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/human-walk', { recursive: true });
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();

// PHASE 1 — capture during arrival breath. We need to start screenshotting
// IMMEDIATELY after first paint, not after networkidle (which waits ~3s).
const navP = p.goto('http://localhost:3030', { waitUntil: 'domcontentloaded', timeout: 90000 });
await navP;

// Wait for the cinema-stage to mount, then start the breath timeline.
await p.waitForSelector('section.cinema-stage', { timeout: 15000 });

const breathBeats = [
  { t: 50,   label: 'breath-t0050' },
  { t: 200,  label: 'breath-t0200' },
  { t: 500,  label: 'breath-t0500' },
  { t: 900,  label: 'breath-t0900' },
  { t: 1400, label: 'breath-t1400' },
  { t: 1800, label: 'breath-t1800' },
  { t: 2400, label: 'breath-t2400-still' },
  { t: 3500, label: 'breath-t3500-real-arrival' },
];
const t0 = Date.now();
for (const beat of breathBeats) {
  const waitMs = beat.t - (Date.now() - t0);
  if (waitMs > 0) await p.waitForTimeout(waitMs);
  await p.screenshot({ path: `/tmp/human-walk/p1-${beat.label}.jpg`, type: 'jpeg', quality: 90, fullPage: false });
  console.log(`✓ p1 ${beat.label} (actual t=${Date.now() - t0}ms)`);
}

// PHASE 3 — smooth scroll with Lenis to see typing in real time
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

// Scroll smoothly from 0 to 0.18 of the cinema range (covers cold-open
// + start of post stage). Capture every 333ms.
console.log('--- PHASE 3: smooth scroll typing ---');
const scrollFrames = 18;
const scrollEndP = 0.18;
const startTime = Date.now();
for (let i = 0; i < scrollFrames; i++) {
  const progress = (i / (scrollFrames - 1)) * scrollEndP;
  const y = g.sTop + g.range * progress;
  // Use Lenis's smooth scroll if available, else direct scroll
  await p.evaluate((y) => {
    if (window.__lenis) {
      window.__lenis.scrollTo(y, { duration: 0.3, immediate: false });
    } else {
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, y);
  await p.waitForTimeout(330);
  await p.screenshot({
    path: `/tmp/human-walk/p3-${String(i).padStart(2, '0')}-p${(progress * 1000).toFixed(0).padStart(3, '0')}.jpg`,
    type: 'jpeg',
    quality: 88,
  });
}
console.log(`✓ phase 3 done in ${Date.now() - startTime}ms`);

// PHASE 4 — quick scroll
console.log('--- PHASE 4: quick jump ---');
await p.evaluate(y => window.__lenis?.scrollTo(0, { immediate: true }) ?? window.scrollTo(0, 0), 0);
await p.waitForTimeout(500);
await p.evaluate(y => {
  // Jump directly without smooth animation — simulates page-down hit
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
}, g.sTop + g.range * 0.16);
await p.waitForTimeout(60);
await p.screenshot({ path: '/tmp/human-walk/p4-quick-jump.jpg', type: 'jpeg', quality: 90 });
await p.waitForTimeout(300);
await p.screenshot({ path: '/tmp/human-walk/p4-quick-settle.jpg', type: 'jpeg', quality: 90 });

await b.close();
console.log('done');
