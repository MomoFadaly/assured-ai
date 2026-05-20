import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/peel-fine', { recursive: true });
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

// Fine-grained beats around the peel start to verify IndustryShowcase
// is pinned (not scrolling) and the cinema lifts cleanly.
const BEATS = [
  { p: 0.935, label: 'a-just-before-peel' },
  { p: 0.945, label: 'b-peel-1pct-into-window' },
  { p: 0.955, label: 'c-peel-25pct' },
  { p: 0.965, label: 'd-peel-40pct' },
  { p: 0.975, label: 'e-peel-60pct' },
  { p: 0.985, label: 'f-peel-75pct' },
];
for (const beat of BEATS) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(500);
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.pause(); if (a.effect?.getTiming) { const d = a.effect.getTiming().duration; if (typeof d === 'number' && d > 0) a.currentTime = d * 0.25; } } catch {} } });
  await p.screenshot({ path: `/tmp/peel-fine/${beat.label}.jpg`, type: 'jpeg', quality: 88, fullPage: false });
  await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.play(); } catch {} } });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}

// Static-anchor check: capture a known IndustryShowcase landmark's
// viewport Y position across the peel — if it doesn't move, the section
// is truly static.
const anchorTrack = [];
for (const pVal of [0.940, 0.960, 0.980, 1.000]) {
  const y = g.sTop + g.range * pVal;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(300);
  const probe = await p.evaluate(() => {
    // Find any landmark inside IndustryShowcase. We look for the
    // industry list (numbered items 01-08) and report the top Y of the
    // first one if visible.
    const item = document.querySelector('section[aria-label*="ndustr"] li, section[data-section="industries"] li, [data-industry], section h2');
    if (!item) return { found: false };
    const r = item.getBoundingClientRect();
    return { found: true, top: r.top, text: (item.textContent || '').trim().slice(0, 40) };
  });
  anchorTrack.push({ p: pVal, ...probe });
}
console.log('ANCHOR TRACK:', JSON.stringify(anchorTrack, null, 2));

await b.close();
