import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const OUT = '/tmp/slide-capture';
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
  { p: 0.600, label: 'a-kill-shot-hold' },
  { p: 0.610, label: 'b-slide-start-line1' },
  { p: 0.620, label: 'c-slide-mid-anticipate' },
  { p: 0.628, label: 'd-slide-launching' },
  { p: 0.635, label: 'e-slide-line3-still-going' },
  { p: 0.642, label: 'f-stat-gone-undim-starting' },
  { p: 0.650, label: 'g-undim-mid-clock-launching' },
  { p: 0.658, label: 'h-undim-done-clock-flying' },
  { p: 0.680, label: 'i-clock-mid-flight' },
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
