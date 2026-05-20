import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/post-publish-arc', { recursive: true });
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
if (btn) { await p.mouse.click(btn.x, btn.y); await p.waitForTimeout(900); }
await p.waitForSelector('section.cinema-stage');
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

// Post-publish arc: raw scroll positions targeting the comment storm,
// lawsuit climax, and checkmark-witness moments.
//   0.380 → 0.395  publish + confetti
//   0.420 → 0.450  comments arrive (witness flashes, ring snaps)
//   0.460 → 0.480  storm peak, photo desaturating
//   0.480 → 0.510  lawsuit climax — checkmark climax + bad-word callback
//   0.520 → 0.580  freeze frame
const beats = [
  { p: 0.390, label: '00-publish-button' },
  { p: 0.405, label: '01-confetti' },
  { p: 0.420, label: '02-first-friendly' },
  { p: 0.435, label: '03-second-friendly' },
  { p: 0.445, label: '04-first-critical' },
  { p: 0.452, label: '05-pharmd-credentialed' },
  { p: 0.458, label: '06-amara-who-approved' },
  { p: 0.466, label: '07-james-legal' },
  { p: 0.476, label: '08-climax-hospital' },
  { p: 0.486, label: '09-post-climax' },
  { p: 0.494, label: '10-pre-lawsuit' },
  { p: 0.504, label: '11-lawsuit-climax' },
  { p: 0.515, label: '12-after-lawsuit' },
  { p: 0.535, label: '13-freeze-frame' },
  { p: 0.560, label: '14-deep-freeze' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(550);
  await p.screenshot({ path: `/tmp/post-publish-arc/${beat.label}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}
await b.close();
