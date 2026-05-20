#!/usr/bin/env node
/**
 * capture-resolution.mjs — Capture the SECOND cinema-stage section
 * (ResolutionCinema) at each beat. Mirrors capture-cinema.mjs but targets
 * the second .cinema-stage on the page.
 */

import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = '/tmp/resolution-capture';
const URL = 'http://localhost:3030';
const VIEWPORT = { width: 1440, height: 900 };

const BEATS = [
  { p: 0.00, label: '00-entry' },
  { p: 0.08, label: '01-typing-mid' },
  { p: 0.18, label: '02-typing-end' },
  { p: 0.28, label: '03-scan-late' },
  { p: 0.40, label: '04-catch-full' },
  { p: 0.50, label: '05-after-catch' },
  { p: 0.60, label: '06-headline-entry' },
  { p: 0.68, label: '07-headline-full' },
  { p: 0.74, label: '08-headline-settling-up' },
  { p: 0.84, label: '09-thesis-bar-with-proof-rising' },
  { p: 0.92, label: '10-proof-full' },
  { p: 0.96, label: '11-final-composition' },
  { p: 1.00, label: '12-unpin' },
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
    recordVideo: { dir: OUT, size: VIEWPORT },
  });
  const page = await context.newPage();

  console.log(`→ Navigating to ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForSelector('section.cinema-stage', { timeout: 10_000 });
  await page.waitForTimeout(800);

  // Find the SECOND cinema-stage (resolution) — geometry.
  const geom = await page.evaluate(() => {
    const stages = document.querySelectorAll('section.cinema-stage');
    if (stages.length < 2) return null;
    const sec = stages[1]; // resolution is second
    return {
      sTop: sec.getBoundingClientRect().top + window.scrollY,
      sHeight: sec.offsetHeight,
      vh: window.innerHeight,
    };
  });
  if (!geom) {
    console.error('Could not find second cinema-stage section');
    process.exit(1);
  }
  const range = geom.sHeight - geom.vh;
  console.log(`→ Resolution section: top=${geom.sTop} height=${geom.sHeight} range=${range}`);

  for (const beat of BEATS) {
    const targetY = geom.sTop + range * beat.p;
    await page.evaluate(
      (y) => window.__lenis?.scrollTo(y, { immediate: true, force: true }),
      targetY,
    );
    await page.waitForTimeout(550);
    const file = `${OUT}/frames/${beat.label}.jpg`;
    await page.screenshot({ path: file, type: 'jpeg', quality: 88, fullPage: false });
    const ap = await page.evaluate(() => {
      const stages = document.querySelectorAll('section.cinema-stage');
      const sec = stages[1];
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
