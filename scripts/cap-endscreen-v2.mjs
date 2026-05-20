import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/endscreen-v2', { recursive: true });
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

// Walk through the new progressive reveal. Each tagline gets its own
// capture so we see the staged appearance.
// ds → raw mapping: raw = 0.161 + ds * 0.839
//   ds 0.965 → raw 0.971
//   ds 0.968 → raw 0.973
//   ds 0.971 → raw 0.976
//   ds 0.973 → raw 0.977
//   ds 0.975 → raw 0.979
//   ds 0.977 → raw 0.981
//   ds 0.980 → raw 0.983
//   ds 0.982 → raw 0.985
const beats = [
  { p: 0.969, label: '01-logo-block-arrived' },
  { p: 0.972, label: '02-wordmark-landed' },
  { p: 0.974, label: '03-divider-drawing' },
  { p: 0.976, label: '04-tag1-CLIENTS' },
  { p: 0.978, label: '05-tag2-TEAM' },
  { p: 0.980, label: '06-tag3-BRAND' },
  { p: 0.982, label: '07-tag4-CONFIDENCE-climax' },
  { p: 0.984, label: '08-cta-arrives' },
  { p: 0.988, label: '09-FULL-HOLD-all-four-visible' },
  { p: 0.994, label: '10-still-holding' },
];
for (let i = 0; i < beats.length; i++) {
  const beat = beats[i];
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  // First capture must wait for the spring+dwell controller to play
  // through all 5 critical beats (≈6 seconds). Subsequent captures
  // are small forward steps with no remaining dwells, so a short
  // wait is fine.
  await p.waitForTimeout(i === 0 ? 8000 : 1100);
  await p.screenshot({ path: `/tmp/endscreen-v2/${beat.label}.jpg`, type: 'jpeg', quality: 92 });
  console.log(`✓ ${beat.label}`);
}
await b.close();
