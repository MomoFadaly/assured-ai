import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/peel-cap', { recursive: true });
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(1500);
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

// The card-peel happens during the last 6% of the cinema's scroll (0.94-1.0).
const BEATS = [
  { p: 0.92, label: 'a-cinema-pre-lift' },
  { p: 0.95, label: 'b-cinema-starts-lifting' },
  { p: 0.97, label: 'c-cinema-mid-peel' },
  { p: 0.99, label: 'd-cinema-mostly-gone' },
  { p: 1.00, label: 'e-cinema-fully-peeled' },
];
for (const beat of BEATS) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(500);
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); if (a.effect?.getTiming) { const d = a.effect.getTiming().duration; if (typeof d === 'number' && d > 0) a.currentTime = d * 0.25; } } catch {} } });
  await p.screenshot({ path: `/tmp/peel-cap/${beat.label}.jpg`, type: 'jpeg', quality: 88, fullPage: false });
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.play(); } catch {} } });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}
await b.close();
