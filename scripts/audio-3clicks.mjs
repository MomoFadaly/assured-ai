import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.addInitScript(() => {
  const O = window.AudioContext;
  window.AudioContext = function(...a) {
    const ctx = new O(...a);
    window.__lastCtx = ctx;
    return ctx;
  };
  Object.setPrototypeOf(window.AudioContext, O);
  Object.assign(window.AudioContext, O);
});
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
const pillRect = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
const probe = async (label) => {
  const r = await p.evaluate(() => ({
    ctx: window.__lastCtx?.state,
    text: document.querySelector('button[aria-label*="cinema sound"]')?.textContent.trim(),
  }));
  console.log(`${label}: ctx=${r.ctx} pill="${r.text}"`);
};
await probe('initial         ');
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(500);
await probe('after click #1  ');
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(500);
await probe('after click #2  ');
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(500);
await probe('after click #3  ');
await b.close();
