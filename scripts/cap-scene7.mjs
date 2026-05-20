import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/scene7-cap', { recursive: true });
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

// Convert ds → raw: raw = ds * 0.839 + 0.161
const dsToRaw = (ds) => ds * 0.839 + 0.161;
const BEATS = [
  { ds: 0.795, label: 'a-empty-stage' },
  { ds: 0.815, label: 'b-headline-landed' },
  { ds: 0.825, label: 'c-lock-on-pencil' },
  { ds: 0.828, label: 'd-chip1-row1-fired' },
  { ds: 0.830, label: 'e-flag-punch-flash' },
  { ds: 0.834, label: 'f-flag-pulse-rhythm' },
  { ds: 0.844, label: 'g-supporting-chips' },
  { ds: 0.853, label: 'h-status-row-lands' },
  { ds: 0.858, label: 'i-fix-panel-typing' },
  { ds: 0.862, label: 'j-accept-fix-press' },
  { ds: 0.866, label: 'k-fix-applied-pill' },
];
for (const beat of BEATS) {
  const raw = dsToRaw(beat.ds);
  const y = g.sTop + g.range * raw;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(500);
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); if (a.effect?.getTiming) { const d = a.effect.getTiming().duration; if (typeof d === 'number' && d > 0) a.currentTime = d * 0.25; } } catch {} } });
  await p.screenshot({ path: `/tmp/scene7-cap/${beat.label}.jpg`, type: 'jpeg', quality: 88, fullPage: false });
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.play(); } catch {} } });
  console.log(`✓ ${beat.label}  ds=${beat.ds}  raw=${raw.toFixed(3)}`);
}
await b.close();
