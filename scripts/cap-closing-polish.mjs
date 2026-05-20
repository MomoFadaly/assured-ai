import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/closing-polish', { recursive: true });
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
const btn = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label="Begin the experience"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (btn) { await p.mouse.click(btn.x, btn.y); await p.waitForTimeout(1000); }
await p.waitForSelector('section.cinema-stage');
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

// Walk through IN sequence + OUT lift. Captures the whole arc:
//   correction → decision pause → dark pause → brand mark scale-in
//   → wordmark → hairline → taglines cascade → hold → lift OUT
const beats = [
  { p: 0.942, label: '01_correction-complete' },
  { p: 0.955, label: '02_decision-pause-overlay' },
  { p: 0.961, label: '03_dark-pause' },
  { p: 0.966, label: '04_brand-mark-arriving' },
  { p: 0.972, label: '05_wordmark-landing' },
  { p: 0.977, label: '06_hairline-drawing' },
  { p: 0.981, label: '07_tag1-clients' },
  { p: 0.985, label: '08_tag-3-brand' },
  { p: 0.989, label: '09_tag4-CLIMAX' },
  { p: 0.993, label: '10_full-HOLD' },
  { p: 0.996, label: '11_lift-starting' },
  { p: 0.998, label: '12_lift-midway-eased' },
  { p: 0.9995, label: '13_lift-near-end' },
];
for (let i = 0; i < beats.length; i++) {
  const beat = beats[i];
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  // First capture must wait through all critical-beat dwells.
  // Subsequent forward jumps in the closing arc are tiny — short waits.
  const wait = i === 0 ? 10000 : 1300;
  await p.waitForTimeout(wait);
  await p.screenshot({ path: `/tmp/closing-polish/${beat.label}.jpg`, type: 'jpeg', quality: 92 });
  console.log(`✓ ${beat.label}`);
}
await b.close();
