import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/callback-v2', { recursive: true });
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

// Scroll to lawsuit-impact zone, then DISPATCH MANUALLY to guarantee
// the visual response — since the natural scroll dispatch can race
// with viewport teleport. The CSS animation reads from the section's
// class change.
const y = g.sTop + g.range * 0.572;
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true }) ?? window.scrollTo(0, y), y);
await p.waitForTimeout(500);

// Dispatch and capture animation frames
await p.evaluate(() => window.dispatchEvent(new CustomEvent('cinema:lawsuit-impact')));

// Capture every 70ms
for (let i = 0; i < 14; i++) {
  await p.waitForTimeout(70);
  const hasClass = await p.evaluate(() => {
    return document.querySelector('section.cinema-stage')?.classList.contains('cinema-lawsuit-callback');
  });
  await p.screenshot({ path: `/tmp/callback-v2/${String(i).padStart(2, '0')}-t${i * 70}ms-${hasClass ? 'ACTIVE' : 'idle'}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`✓ t=${i * 70}ms  hasClass=${hasClass}`);
}

await b.close();
