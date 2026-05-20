import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
p.on('console', m => {
  if (m.text().startsWith('TOGGLE')) console.log(`  [browser] ${m.text()}`);
});
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
const pillRect = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
const probe = async (label) => {
  const text = await p.evaluate(() => document.querySelector('button[aria-label*="cinema sound"]')?.textContent.trim());
  console.log(`${label}: pill="${text}"`);
};
await probe('initial      ');
console.log('-- click 1 --');
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(600);
await probe('after click 1');
console.log('-- click 2 --');
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(600);
await probe('after click 2');
console.log('-- click 3 --');
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(600);
await probe('after click 3');
await b.close();
