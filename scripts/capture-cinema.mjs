#!/usr/bin/env node
/**
 * capture-cinema.mjs — Render the stakes-cinema section in a real Chromium
 * with RAF un-throttled, then capture screenshots at each beat plus a
 * full-scroll video. Lets Claude actually SEE the section the way a user
 * would, not just inspect its DOM/style cascade.
 */

import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = '/tmp/cinema-capture';
const URL = 'http://localhost:3030';
const VIEWPORT = { width: 1440, height: 900 };

// Beats to capture as still frames. Names map to expected timeline state.
const BEATS = [
  { p: 0.00, label: '00-section-enters' },
  { p: 0.08, label: '01-typing-mid' },
  { p: 0.18, label: '02-typing-end' },
  { p: 0.25, label: '03-pause' },
  { p: 0.32, label: '04-redact-start' },
  { p: 0.40, label: '05-redact-full' },
  { p: 0.48, label: '06-wipe' },
  { p: 0.55, label: '07-headline-fade-in' },
  { p: 0.62, label: '08-headline-land' },
  { p: 0.68, label: '09-headline-hold' },
  { p: 0.78, label: '10-evidence-start' },
  { p: 0.86, label: '11-evidence-full' },
  { p: 0.94, label: '12-chyron-running' },
  { p: 1.00, label: '13-unpin' },
];

async function main() {
  if (existsSync(OUT)) await rm(OUT, { recursive: true });
  await mkdir(OUT, { recursive: true });
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
    recordVideo: {
      dir: OUT,
      size: VIEWPORT,
    },
  });
  const page = await context.newPage();

  console.log(`→ Navigating to ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle' });
  console.log('→ Page loaded, waiting for cinema-stage');
  await page.waitForSelector('section.cinema-stage', { timeout: 10_000 });
  // Give Lenis + framer-motion a beat to settle.
  await page.waitForTimeout(800);

  // Pull section geometry so we can compute exact scroll positions per beat.
  const geom = await page.evaluate(() => {
    const sec = document.querySelector('section.cinema-stage');
    return {
      sTop: sec.getBoundingClientRect().top + window.scrollY,
      sHeight: sec.offsetHeight,
      vh: window.innerHeight,
    };
  });
  const range = geom.sHeight - geom.vh;
  console.log(`→ Section: top=${geom.sTop} height=${geom.sHeight} vh=${geom.vh} range=${range}`);

  // First, capture the hero (scrollY 0) as a baseline.
  await page.evaluate(() => window.__lenis?.scrollTo(0, { immediate: true }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/frames/hero.jpg`, type: 'jpeg', quality: 85, fullPage: false });
  console.log(`✓ hero`);

  // Then capture each beat by scrolling to its target.
  for (const beat of BEATS) {
    const targetY = geom.sTop + range * beat.p;
    await page.evaluate(
      (y) => window.__lenis?.scrollTo(y, { immediate: true, force: true }),
      targetY,
    );
    // Wait long enough for RAF to flush motion writes + CSS transitions.
    await page.waitForTimeout(550);
    const file = `${OUT}/frames/${beat.label}.jpg`;
    await page.screenshot({ path: file, type: 'jpeg', quality: 88, fullPage: false });
    const ap = await page.evaluate(() => {
      const sec = document.querySelector('section.cinema-stage');
      const r = sec.getBoundingClientRect();
      return -r.top / (sec.offsetHeight - window.innerHeight);
    });
    console.log(`✓ ${beat.label}  target=${beat.p}  actual=${ap.toFixed(3)}`);
  }

  // Now do a continuous scroll for the video record.
  console.log('→ Recording full-scroll video');
  await page.evaluate(() => window.__lenis?.scrollTo(0, { immediate: true }));
  await page.waitForTimeout(500);
  // Scroll from scrollY 0 to end of section over 6s.
  const startY = 0;
  const endY = geom.sTop + range;
  const duration = 6000;
  const steps = 120;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // ease-in-out cubic for natural scroll cadence
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const y = startY + (endY - startY) * eased;
    await page.evaluate((y) => window.__lenis?.scrollTo(y, { immediate: true }), y);
    await page.waitForTimeout(duration / steps);
  }

  await page.close();
  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();

  console.log(`\nDone. Frames + video in ${OUT}`);
  console.log(`Video: ${videoPath ?? '(not captured)'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
