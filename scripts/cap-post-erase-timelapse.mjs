import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/post-erase-tl', { recursive: true });
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

// Park at post-erase center (p=0.190)
const y = g.sTop + g.range * 0.190;
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
await p.waitForTimeout(500);

// Now capture 10 frames over 1s — the blink cycle is 1s, so we'll
// definitely catch the ON phase
for (let i = 0; i < 10; i++) {
  await p.waitForTimeout(100);
  await p.screenshot({ path: `/tmp/post-erase-tl/frame-${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 88 });
  const op = await p.evaluate(() => {
    const c = document.querySelector('section.cinema-stage div.z-\\[20\\] div.absolute.inset-0.flex span');
    return c ? getComputedStyle(c).opacity : 'no-cursor';
  });
  console.log(`✓ frame-${i}  cursor.opacity=${op}`);
}
await b.close();
