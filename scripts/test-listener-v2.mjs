import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
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
  const section = document.querySelector('section.cinema-stage');
  return {
    syncCheck: section?.classList.contains('cinema-lawsuit-callback'),
    sectionClasses: section?.className,
  };
});
console.log('After manual dispatch:', JSON.stringify(result));
await p.waitForTimeout(100);
const r2 = await p.evaluate(() => {
  return document.querySelector('section.cinema-stage')?.classList.contains('cinema-lawsuit-callback');
});
console.log('100ms after dispatch:', r2);
await p.waitForTimeout(1000);
const r3 = await p.evaluate(() => {
  return document.querySelector('section.cinema-stage')?.classList.contains('cinema-lawsuit-callback');
});
console.log('1100ms after dispatch (should be false):', r3);
await b.close();
