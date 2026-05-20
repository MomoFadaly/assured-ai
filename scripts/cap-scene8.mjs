import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/scene8-cap', { recursive: true });
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
const dsToRaw = (ds) => ds * 0.839 + 0.161;
const BEATS = [
  { ds: 0.879, label: 'a-scene8-entry' },
  { ds: 0.883, label: 'b-headline' },
  { ds: 0.887, label: 'c-row1-risk' },
  { ds: 0.891, label: 'd-row2-status' },
  { ds: 0.895, label: 'e-row3-dose' },
  { ds: 0.900, label: 'f-all-rows-visible' },
];
for (const beat of BEATS) {
  const raw = dsToRaw(beat.ds);
  const y = g.sTop + g.range * raw;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(500);
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); if (a.effect?.getTiming) { const d = a.effect.getTiming().duration; if (typeof d === 'number' && d > 0) a.currentTime = d * 0.25; } } catch {} } });
  await p.screenshot({ path: `/tmp/scene8-cap/${beat.label}.jpg`, type: 'jpeg', quality: 88, fullPage: false });
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.play(); } catch {} } });
  console.log(`✓ ${beat.label}  ds=${beat.ds}  raw=${raw.toFixed(3)}`);
}
await b.close();
