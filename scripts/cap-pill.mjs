import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(4000);
const btn = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const cs = window.getComputedStyle(b);
  return {
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    visible: cs.visibility, opacity: cs.opacity, display: cs.display, pointerEvents: cs.pointerEvents,
    text: b.textContent.trim(),
  };
});
console.log(JSON.stringify(btn, null, 2));
await p.screenshot({ path: '/tmp/cap-pill-full.jpg', fullPage: false });
// Also crop to bottom-right where pill should be
await p.screenshot({ path: '/tmp/cap-pill-corner.jpg', clip: { x: 1200, y: 760, width: 240, height: 140 } });
await b.close();
