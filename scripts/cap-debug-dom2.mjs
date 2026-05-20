import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', bypassCSP: true });
const p = await c.newPage();
// Disable HTTP cache so Turbopack chunks reload fresh
await p.route('**/*', (route) => {
  const headers = { ...route.request().headers(), 'Cache-Control': 'no-cache' };
  route.continue({ headers });
});
await p.goto('http://localhost:3030?nocache=' + Date.now(), { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
const btn = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label="Begin the experience"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (btn) { await p.mouse.click(btn.x, btn.y); }
await p.waitForTimeout(3000);

// Trace UP from the nudge span to inspect the outer container
const info = await p.evaluate(() => {
  const elements = Array.from(document.querySelectorAll('*'));
  for (const el of elements) {
    if (el.textContent?.trim() === 'Scroll to begin' || el.textContent?.trim() === 'Keep scrolling') {
      // Walk up to find the position:fixed ancestor
      let cur = el;
      const chain = [];
      while (cur) {
        const s = window.getComputedStyle(cur);
        const r = cur.getBoundingClientRect();
        chain.push({
          tag: cur.tagName,
          className: cur.className?.toString().slice(0, 80),
          position: s.position,
          opacity: s.opacity,
          display: s.display,
          visibility: s.visibility,
          zIndex: s.zIndex,
          transform: s.transform?.slice(0, 60),
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
          backgroundColor: s.backgroundColor,
        });
        cur = cur.parentElement;
        if (chain.length > 8) break;
      }
      return chain;
    }
  }
  return null;
});
console.log(JSON.stringify(info, null, 2));
await b.close();
