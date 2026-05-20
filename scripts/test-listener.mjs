import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
p.on('console', msg => console.log(`[b]`, msg.text()));
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

const result = await p.evaluate(() => {
  window.dispatchEvent(new CustomEvent('cinema:lawsuit-impact'));
  const has1 = document.body.classList.contains('cinema-lawsuit-callback');
  return { syncCheck: has1 };
});
console.log('After manual dispatch:', JSON.stringify(result));
await p.waitForTimeout(100);
const r2 = await p.evaluate(() => document.body.classList.contains('cinema-lawsuit-callback'));
console.log('100ms after dispatch:', r2);
await b.close();
