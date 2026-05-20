import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/alex-labels', { recursive: true });
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

// Sample at the MIDPOINT of each new label window
const beats = [
  { p: 0.220, label: '01_at-her-desk' },
  { p: 0.330, label: '02_drafting' },
  { p: 0.387, label: '03_about-to-publish' },
  { p: 0.428, label: '04_published' },
  { p: 0.480, label: '05_first-reactions' },
  { p: 0.526, label: '06_davids-message' },
  { p: 0.590, label: '07_lawsuit-lands' },
  { p: 0.645, label: '08_frozen' },
  { p: 0.720, label: '09_time-rewinding' },
  { p: 0.825, label: '10_scanning' },
  { p: 0.890, label: '11_caught' },
  { p: 0.928, label: '12_exhaling' },
  { p: 0.970, label: '13_still-has-job' },
];
for (let i = 0; i < beats.length; i++) {
  const beat = beats[i];
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  // First capture needs spring+dwell settle through critical beats.
  // Forward jumps that cross a NEW critical beat need extra time.
  // Conservative: 10s on first, 1.6s on small steps, 4s for big forward jumps that may cross dwell beats.
  const isFirst = i === 0;
  const prev = i > 0 ? beats[i - 1].p : 0;
  const crossesCritical = (prev < 0.501 && beat.p > 0.501) || (prev < 0.560 && beat.p > 0.560) || (prev < 0.665 && beat.p > 0.665) || (prev < 0.870 && beat.p > 0.870) || (prev < 0.948 && beat.p > 0.948);
  const wait = isFirst ? 10000 : (crossesCritical ? 3500 : 1600);
  await p.waitForTimeout(wait);
  await p.screenshot({ path: `/tmp/alex-labels/${beat.label}.jpg`, type: 'jpeg', quality: 92 });
  console.log(`✓ ${beat.label}`);
}
await b.close();
