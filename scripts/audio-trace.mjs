import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
p.on('console', m => {
  if (m.text().startsWith('TRACE')) console.log(`[browser] ${m.text()}`);
});
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

// Wrap the button click to log
await p.evaluate(() => {
  const btn = document.querySelector('button[aria-label*="cinema sound"]');
  if (!btn) return;
  const origClick = btn.click.bind(btn);
  btn.addEventListener('click', () => {
    console.log(`TRACE click — pill text BEFORE handler: "${btn.textContent.trim()}", ctx state: ${window.__lastCtx?.state}`);
  }, true); // capture phase, runs BEFORE React's onClick
  btn.addEventListener('click', () => {
    setTimeout(() => {
      console.log(`TRACE click — pill text AFTER handler (50ms): "${btn.textContent.trim()}", ctx state: ${window.__lastCtx?.state}`);
    }, 50);
  });
});

const pillRect = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});

console.log('--- click 1 ---');
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(500);

console.log('\n--- click 2 ---');
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(500);

console.log('\n--- click 3 ---');
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(500);
await b.close();
