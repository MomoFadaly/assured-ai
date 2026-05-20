import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
const btn = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label="Begin the experience"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (btn) { await p.mouse.click(btn.x, btn.y); }
await p.waitForTimeout(3000);

// Look for the nudge in the DOM
const nudgeInfo = await p.evaluate(() => {
  const elements = Array.from(document.querySelectorAll('*'));
  for (const el of elements) {
    const t = el.textContent?.trim();
    if (t === 'Scroll to begin' || t === 'Keep scrolling') {
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return {
        found: true,
        text: t,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        opacity: s.opacity,
        display: s.display,
        visibility: s.visibility,
        zIndex: s.zIndex,
        position: s.position,
      };
    }
  }
  return { found: false };
});
console.log(JSON.stringify(nudgeInfo, null, 2));
await b.close();
