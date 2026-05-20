import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
const errs = [];
p.on('console', m => {
  const t = m.text();
  if (m.type() === 'error') errs.push(`[err] ${t.slice(0, 250)}`);
});
p.on('pageerror', e => errs.push(`[pageerror] ${e.message.slice(0, 250)}`));
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
// Click pill
const r = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, onclick: typeof b.onclick };
});
console.log('Pill rect + onclick handler:', r);
await p.mouse.click(r.x, r.y);
await p.waitForTimeout(500);

// Also check if the button has any onClick handler attached
const handlerInfo = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  return {
    hasReactProps: Object.keys(b).filter(k => k.startsWith('__reactProps')).length,
    tagName: b.tagName,
    aria: b.getAttribute('aria-label'),
  };
});
console.log('Handler info:', handlerInfo);

errs.slice(0, 10).forEach(e => console.log(e));
await b.close();
