import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/alex-arc', { recursive: true });
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

// Walk Alex's emotional arc — each beat captures the aura + caption + title state
const beats = [
  { p: 0.250, label: '01-drafting-happy-blue-mint' },
  { p: 0.380, label: '02-about-to-publish-yellow' },
  { p: 0.420, label: '03-published-confident' },
  { p: 0.500, label: '04-watching-storm-orange' },
  { p: 0.580, label: '05-FROZEN-monochrome' },
  { p: 0.680, label: '06-catch-yellow-relief' },
  { p: 0.880, label: '07-exhaling-mint' },
  { p: 0.955, label: '08-CELEBRATION-still-has-a-job' },
  { p: 0.985, label: '09-signature-end-frame-large' },
];
for (let i = 0; i < beats.length; i++) {
  const beat = beats[i];
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  // First capture waits long enough for spring to settle pre-dwells.
  // Beats that cross critical dwell points need extra time. Otherwise
  // short wait — cinema springs continuously through small jumps.
  const isFirstOrFar = i === 0 || beat.p > 0.94;
  await p.waitForTimeout(isFirstOrFar ? 9000 : 1500);
  await p.screenshot({ path: `/tmp/alex-arc/${beat.label}.jpg`, type: 'jpeg', quality: 92 });
  console.log(`✓ ${beat.label}`);
}
await b.close();
