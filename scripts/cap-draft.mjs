import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/draft-cap', { recursive: true });
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(1200);
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});
for (const pos of [0.300, 0.350]) {
  const y = g.sTop + g.range * pos;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(500);
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); if (a.effect?.getTiming) { const d = a.effect.getTiming().duration; if (typeof d === 'number' && d > 0) a.currentTime = d * 0.25; } } catch {} } });
  await p.screenshot({ path: `/tmp/draft-cap/draft-${pos}.jpg`, type: 'jpeg', quality: 88, fullPage: false });
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.play(); } catch {} } });
}
await b.close();
