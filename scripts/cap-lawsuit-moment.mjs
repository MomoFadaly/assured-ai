import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/lawsuit-moment', { recursive: true });
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

// LAWSUIT IMPACT: dispatcher fires when DOWNSTREAM scroll crosses 0.480-0.500
// downstream = (raw - 0.161) / 0.839
// downstream 0.480 → raw 0.564
// downstream 0.500 → raw 0.580
// We scroll TO the trigger zone with a small pre-scroll so the event fires.
const beats = [
  { p: 0.555, label: '00-pre-trigger' },
  { p: 0.565, label: '01-trigger-near' },
  { p: 0.570, label: '02-just-fired' },
  { p: 0.572, label: '03-mid-callback' },
  { p: 0.575, label: '04-callback-decay' },
  { p: 0.580, label: '05-post-callback' },
  { p: 0.595, label: '06-settled' },
  { p: 0.620, label: '07-deeper-freeze' },
];

// CRITICAL: don't use immediate scroll, otherwise the event filter won't see
// the value cross the trigger range. We scroll PROGRESSIVELY to ensure the
// motion-value listener detects the cross.
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(async (target) => {
    // Smooth scroll so MotionValue.on('change') gets fired with progressive values
    const lenis = window.__lenis;
    if (lenis) {
      lenis.scrollTo(target, { duration: 0.4 });
    } else {
      window.scrollTo({ top: target, behavior: 'smooth' });
    }
    await new Promise(r => setTimeout(r, 700));
  }, y);
  await p.waitForTimeout(150);
  await p.screenshot({ path: `/tmp/lawsuit-moment/${beat.label}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}

// Also check that body class gets toggled — log it
const hasClass = await p.evaluate(() => document.body.classList.contains('cinema-lawsuit-callback'));
console.log(`body has cinema-lawsuit-callback at end: ${hasClass}`);

await b.close();
