import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(4000);
const result = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  if (!b) return null;
  // Walk up the DOM, looking at each parent's computed style
  const chain = [];
  let el = b;
  while (el && el.tagName !== 'HTML') {
    const cs = window.getComputedStyle(el);
    chain.push({
      tag: el.tagName,
      classes: (el.className || '').toString().slice(0, 60),
      aria: el.getAttribute('aria-label'),
      opacity: cs.opacity,
      visibility: cs.visibility,
      pointerEvents: cs.pointerEvents,
      display: cs.display,
    });
    el = el.parentElement;
  }
  return chain;
});
console.log(JSON.stringify(result, null, 2));
await b.close();
