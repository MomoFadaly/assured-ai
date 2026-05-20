import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/natural-lawsuit', { recursive: true });
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

// Slow approach to trigger natural Scene5 dispatch (downstream 0.480 == raw 0.564)
// Pre-position just before, then incrementally scroll across the trigger.
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true }) ?? window.scrollTo(0, y), g.sTop + g.range * 0.555);
await p.waitForTimeout(400);

// Cross the trigger SLOWLY (each frame moves a tiny bit, MotionValue fires change events)
const triggerStart = g.sTop + g.range * 0.560;
const triggerEnd = g.sTop + g.range * 0.580;
const steps = 30;
for (let i = 0; i <= steps; i++) {
  const y = triggerStart + (triggerEnd - triggerStart) * (i / steps);
  await p.evaluate(y => window.scrollTo(0, y), y);
  await p.waitForTimeout(15);
}

// Now we should be past the trigger. Capture the active callback window.
const t0 = Date.now();
for (let i = 0; i < 10; i++) {
  const t = Date.now() - t0;
  await p.screenshot({ path: `/tmp/natural-lawsuit/${String(i).padStart(2, '0')}-t${t}ms.jpg`, type: 'jpeg', quality: 88 });
  console.log(`✓ tick ${i}  t=${t}ms`);
  await p.waitForTimeout(80);
}

await b.close();
