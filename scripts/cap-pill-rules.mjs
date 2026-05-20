import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(4000);
// Use CDP to find all matched CSS rules for the button
const result = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  if (!b) return { found: false };
  return {
    inlineStyle: b.getAttribute('style'),
    classes: b.className,
    aria: b.getAttribute('aria-label'),
    // Get the full computed style for opacity/visibility/pointer-events
    cs: {
      opacity: window.getComputedStyle(b).opacity,
      visibility: window.getComputedStyle(b).visibility,
      pointerEvents: window.getComputedStyle(b).pointerEvents,
      display: window.getComputedStyle(b).display,
    },
  };
});
console.log(JSON.stringify(result, null, 2));
await b.close();
