import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/callback-active', { recursive: true });
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);

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

// Scroll directly INTO the trigger zone (no slow sweep — keep ref unfired)
// downstream 0.480 == raw 0.564
const triggerY = g.sTop + g.range * 0.565;
await p.evaluate(async y => {
  // Jump immediately to a position JUST BEFORE the trigger
  const startY = y - 80;
  window.scrollTo(0, startY);
  await new Promise(r => setTimeout(r, 100));
  // Then incrementally cross the trigger
  for (let dy = 0; dy <= 200; dy += 12) {
    window.scrollTo(0, startY + dy);
    await new Promise(r => setTimeout(r, 30));
  }
}, triggerY);

// Now capture every 80ms during the 880ms callback animation
for (let i = 0; i < 14; i++) {
  await p.waitForTimeout(70);
  const info = await p.evaluate(() => ({
    hasClass: document.body.classList.contains('cinema-lawsuit-callback'),
    bodyClasses: document.body.className,
  }));
  await p.screenshot({ path: `/tmp/callback-active/${String(i).padStart(2, '0')}-${info.hasClass ? 'ACTIVE' : 'idle'}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`✓ tick ${i}: hasClass=${info.hasClass} body="${info.bodyClasses.slice(0,80)}"`);
}

await b.close();
