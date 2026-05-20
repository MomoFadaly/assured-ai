import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/alex-crisis', { recursive: true });
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

// Walk through the crisis window: pre-crisis → David's message →
// lawsuit → frozen → rewind-mid → rewind-end → post-recovery.
const beats = [
  { p: 0.470, label: '01_pre-crisis-storm-warm' },
  { p: 0.520, label: '02_DAVIDS-MESSAGE-monochrome-red' },
  { p: 0.595, label: '03_LAWSUIT-monochrome-red' },
  { p: 0.645, label: '04_FROZEN-monochrome-red' },
  { p: 0.700, label: '05_REWIND-MID-red-fading' },
  { p: 0.750, label: '06_REWIND-LATE-mint-emerging' },
  { p: 0.820, label: '07_POST-RECOVERY-mint-aura' },
];
for (let i = 0; i < beats.length; i++) {
  const beat = beats[i];
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  // First capture waits long enough for spring+dwell to settle.
  // Subsequent forward jumps may cross critical dwell points.
  const prev = i > 0 ? beats[i - 1].p : 0;
  const crosses = (prev < 0.501 && beat.p > 0.501) || (prev < 0.560 && beat.p > 0.560) || (prev < 0.665 && beat.p > 0.665) || (prev < 0.870 && beat.p > 0.870);
  const wait = i === 0 ? 10000 : (crosses ? 3500 : 1500);
  await p.waitForTimeout(wait);
  await p.screenshot({ path: `/tmp/alex-crisis/${beat.label}.jpg`, type: 'jpeg', quality: 92 });
  console.log(`✓ ${beat.label}`);
}
await b.close();
