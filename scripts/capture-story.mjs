#!/usr/bin/env node
/**
 * capture-story.mjs — Capture beats across the 10-scene rebuilt StoryCinema.
 * Each beat lands at a specific progress point so we can verify each scene
 * looks right at its peak moment.
 */

import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = '/tmp/story-capture';
const URL = 'http://localhost:3030';
const VIEWPORT = { width: 1440, height: 900 };

const BEATS = [
  { p: 0.000, label: '00a-anticipation-caret' },
  { p: 0.015, label: '00b-caret-pre-typing' },
  { p: 0.040, label: '00c-prequel-typing-early' },
  { p: 0.070, label: '00d-prequel-typing-mid' },
  { p: 0.105, label: '00e-prequel-typing-near-done' },
  { p: 0.120, label: '00f-prequel-settled' },
  { p: 0.135, label: '00g-prequel-long-hold' },
  { p: 0.148, label: '00h-prequel-final-read' },
  { p: 0.155, label: '00i-vacuum-early' },
  { p: 0.159, label: '00j-vacuum-mid' },
  { p: 0.165, label: '00k-caret-traveling-to-center' },
  { p: 0.172, label: '00l-pause-start' },
  { p: 0.180, label: '00m-pause-mid' },
  { p: 0.187, label: '00n-pause-end' },
  { p: 0.195, label: '00o-retype-first-words' },
  { p: 0.205, label: '00p-retype-mid' },
  { p: 0.215, label: '00q-retype-final' },
  { p: 0.220, label: '00r-headline-settled' },
  { p: 0.244, label: '02a-headline-just-settled' },
  { p: 0.250, label: '02a2-caret-handoff' },
  { p: 0.255, label: '02b-editor-fading-in' },
  { p: 0.260, label: '02b2-caret-mid-travel' },
  { p: 0.267, label: '02b3-caret-near-editor' },
  { p: 0.275, label: '02c-editor-visible' },
  { p: 0.290, label: '02c2-caret-in-body-blink' },
  { p: 0.310, label: '02d-typing-progresses' },
  // Downstream beats — raw mapped through [0.161, 1] → [0, 1] downstream remap.
  // ORIGIN = 0.161 so editor fades in at the exact moment headline settles (raw 0.245).
  { p: 0.337, label: '02e-draft-complete' },
  { p: 0.342, label: '02f-button-activating' },
  { p: 0.348, label: '02g-button-shimmer' },
  { p: 0.353, label: '02h-button-pressed' },
  { p: 0.358, label: '02i-confetti-early' },
  { p: 0.365, label: '02j-confetti-peak' },
  { p: 0.367, label: '03-publish-flash' },
  { p: 0.375, label: '02k-confetti-falling' },
  { p: 0.387, label: '03b-publish-stamp' },
  { p: 0.438, label: '04a-comments-wave1' },
  { p: 0.480, label: '04b-comments-wave2' },
  { p: 0.513, label: '04c-comments-full' },
  { p: 0.547, label: '05a-stat-line1' },
  { p: 0.560, label: '05b-stat-line2' },
  { p: 0.572, label: '05c-stat-killshot' },
  { p: 0.618, label: '05d-killshot-hold' },
  { p: 0.638, label: '05e-stat-moves-down' },
  { p: 0.665, label: '05f-rewind-mid' },
  { p: 0.700, label: '05g-stats-near-zero' },
  { p: 0.725, label: '05h-stats-zero' },
  { p: 0.575, label: '06a-clock-pop-start' },
  { p: 0.595, label: '06b-clock-flying' },
  { p: 0.612, label: '06c-clock-at-center' },
  { p: 0.680, label: '06d-clock-rewinding' },
  { p: 0.606, label: '06-rewind' },
  { p: 0.681, label: '07a-scan-early' },
  { p: 0.715, label: '07b-scan-chips-arriving' },
  { p: 0.765, label: '07c-scan-sources-ticking' },
  { p: 0.849, label: '08-safe-publish' },
  { p: 0.950, label: '09a-reveal-pillars' },
  { p: 0.983, label: '09b-reveal-cta' },
];

async function main() {
  if (existsSync(OUT)) await rm(OUT, { recursive: true });
  await mkdir(`${OUT}/frames`, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=CalculateNativeWinOcclusion',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Surface console errors in the capture log so we catch React errors fast.
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[console.error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`));

  console.log(`→ Navigating to ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForSelector('section.cinema-stage', { timeout: 10_000 });
  await page.waitForTimeout(1400);

  const geom = await page.evaluate(() => {
    const sec = document.querySelector('section.cinema-stage');
    if (!sec) return null;
    return {
      sTop: sec.getBoundingClientRect().top + window.scrollY,
      sHeight: sec.offsetHeight,
      vh: window.innerHeight,
    };
  });
  if (!geom) {
    console.error('Could not find cinema-stage');
    process.exit(1);
  }
  const range = geom.sHeight - geom.vh;
  console.log(`→ Story section: top=${geom.sTop} height=${geom.sHeight} range=${range}`);

  for (const beat of BEATS) {
    const targetY = geom.sTop + range * beat.p;
    await page.evaluate(
      (y) => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y),
      targetY,
    );
    await page.waitForTimeout(750);
    // Pause running animations so blinking carets/cursors don't randomly
    // freeze in their off-phase, then advance them to a deterministic point
    // so we capture the on-phase. The animations resume after screenshot.
    await page.evaluate(() => {
      for (const a of document.getAnimations()) {
        try {
          a.pause();
          // Pick a time inside the "on" portion of the blink keyframes
          // (we set up the cursor to be opacity=1 around the 25% mark).
          if (a.effect && typeof a.effect.getTiming === 'function') {
            const d = a.effect.getTiming().duration;
            if (typeof d === 'number' && d > 0) a.currentTime = d * 0.25;
          }
        } catch {}
      }
    });
    // For the publish-button beats, also log positions so we can tune y.
    if (beat.label.startsWith('05')) {
      const dosePos = await page.evaluate(() => {
        const bodies = document.querySelectorAll('[data-cinema-body]');
        const out = [];
        bodies.forEach((b) => {
          const dose = b.querySelector('[data-risky-dose]');
          if (dose) {
            const r = dose.getBoundingClientRect();
            out.push({
              variant: b.getAttribute('data-cinema-body'),
              text: dose.textContent,
              left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
            });
          }
        });
        // Also find the risky sentence paragraph
        const draft = document.querySelector('[data-cinema-body="draft"]');
        const ps = draft?.querySelectorAll('p') ?? [];
        const riskyP = ps[3];
        const riskyR = riskyP?.getBoundingClientRect();
        return { doses: out, riskyP: riskyR ? { top: Math.round(riskyR.top), height: Math.round(riskyR.height) } : null };
      });
      console.log(`    dose: ${JSON.stringify(dosePos)}`);
    }
    if (beat.label.startsWith('02g') || beat.label.startsWith('02e') || beat.label.startsWith('02h')) {
      const positions = await page.evaluate(() => {
        const out = {};
        const btn = document.querySelector('div.absolute.left-1\\/2.top-1\\/2.z-\\[34\\]');
        if (btn) {
          const r = btn.getBoundingClientRect();
          out.publish = { cx: Math.round(r.left + r.width/2), cy: Math.round(r.top + r.height/2) };
        }
        // Find Pain Relief Education Post text - this is in the title bar
        const allSpans = document.querySelectorAll('span');
        for (const sp of allSpans) {
          if (sp.textContent === 'Pain Relief Education Post') {
            const r = sp.getBoundingClientRect();
            const cs = window.getComputedStyle(sp);
            if (parseFloat(cs.opacity) > 0.5) {
              out.title = { cx: Math.round(r.left + r.width/2), cy: Math.round(r.top + r.height/2) };
              // Walk up to find title bar
              let el = sp.parentElement?.parentElement;
              if (el) {
                const tr = el.getBoundingClientRect();
                out.titlebar = { cy: Math.round(tr.top + tr.height/2), top: Math.round(tr.top), bottom: Math.round(tr.bottom) };
              }
              break;
            }
          }
        }
        return out;
      });
      console.log(`    positions: ${JSON.stringify(positions)}`);
    }
    const file = `${OUT}/frames/${beat.label}.jpg`;
    await page.screenshot({ path: file, type: 'jpeg', quality: 88, fullPage: false });
    await page.evaluate(() => {
      for (const a of document.getAnimations()) { try { a.play(); } catch {} }
    });
    const ap = await page.evaluate(() => {
      const sec = document.querySelector('section.cinema-stage');
      const r = sec.getBoundingClientRect();
      return -r.top / (sec.offsetHeight - window.innerHeight);
    });
    console.log(`✓ ${beat.label}  target=${beat.p}  actual=${ap.toFixed(3)}`);
  }

  await page.close();
  await context.close();
  await browser.close();
  console.log(`\nDone. Frames in ${OUT}/frames`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
