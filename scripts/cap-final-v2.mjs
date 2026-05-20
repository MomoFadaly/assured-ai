import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/final-v2', { recursive: true });
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

const beats = [
  { p: 0.20, label: '01-editor-push-in' },
  { p: 0.38, label: '02-publish-tilt-up' },
  { p: 0.50, label: '03-DAVID-camera-push-in-1.08x' },
  { p: 0.510, label: '04-DAVID-spotlight-mood-bloom' },
  { p: 0.56, label: '05-LAWSUIT-dutch-angle' },
  { p: 0.585, label: '06-LAWSUIT-storm-bloom-deep-red' },
  { p: 0.665, label: '07-clock-pull-back-0.85x' },
  { p: 0.870, label: '08-catch-push-in' },
  { p: 0.920, label: '09-accept-press-closest' },
  { p: 0.940, label: '10-correction-intimate' },
  { p: 0.978, label: '11-DECISION-PAUSE-dont-let-this-be-you' },
  { p: 0.985, label: '12-closing-pitch' },
  { p: 0.992, label: '13-cta-final' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(600);
  await p.screenshot({ path: `/tmp/final-v2/${beat.label}.jpg`, type: 'jpeg', quality: 92 });
  console.log(`✓ ${beat.label}`);
}
await b.close();
