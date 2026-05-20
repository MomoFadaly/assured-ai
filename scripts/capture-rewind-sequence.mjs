import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const OUT = '/tmp/rewind-sequence';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await context.newPage();
await page.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('section.cinema-stage');
await page.waitForTimeout(1200);

const geom = await page.evaluate(() => {
  const sec = document.querySelector('section.cinema-stage');
  return { sTop: sec.getBoundingClientRect().top + window.scrollY, range: sec.offsetHeight - window.innerHeight };
});

const BEATS = [
  { p: 0.680, label: 'a-clock-arriving' },
  { p: 0.695, label: 'b-spin-begins-stats-full' },
  { p: 0.705, label: 'c-mid-effect-unwind' },
  { p: 0.720, label: 'd-late-effect-unwind' },
  { p: 0.732, label: 'e-stats-zero-comments-mostly-gone' },
  { p: 0.740, label: 'f-effects-done-no-morph-yet' },
  { p: 0.748, label: 'g-morph-back-begins' },
  { p: 0.760, label: 'h-morph-back-mid' },
  { p: 0.775, label: 'i-morph-back-end-slide-begins' },
  { p: 0.790, label: 'j-slide-done-at-scene7-pos' },
  { p: 0.810, label: 'k-scene7-crossfading' },
];

for (const beat of BEATS) {
  const y = geom.sTop + geom.range * beat.p;
  await page.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      try { a.pause(); if (a.effect?.getTiming) { const d = a.effect.getTiming().duration; if (typeof d === 'number' && d > 0) a.currentTime = d * 0.25; } } catch {}
    }
  });
  await page.screenshot({ path: `${OUT}/${beat.label}.jpg`, type: 'jpeg', quality: 88, fullPage: false });
  await page.evaluate(() => { for (const a of document.getAnimations()) { try { a.play(); } catch {} } });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}

await browser.close();
