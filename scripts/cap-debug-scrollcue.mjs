import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
const p = await c.newPage();
await p.goto('http://localhost:3030?n=' + Date.now(), { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
const btn = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label="Begin the experience"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (btn) await p.mouse.click(btn.x, btn.y);
await p.waitForTimeout(3000);
const all = await p.evaluate(() => {
  return Array.from(document.querySelectorAll('*'))
    .filter(el => {
      const t = el.textContent?.trim();
      return t === 'Scroll to begin' || t === 'SCROLL TO BEGIN' || t === 'Keep scrolling';
    })
    .map(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        text: el.textContent.trim(),
        tag: el.tagName,
        position: s.position,
        opacity: s.opacity,
        zIndex: s.zIndex,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      };
    });
});
console.log(JSON.stringify(all, null, 2));
await b.close();
