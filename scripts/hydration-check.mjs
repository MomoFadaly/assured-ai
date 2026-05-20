import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
const errs = [];
p.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') {
    const t = m.text();
    if (t.includes('hydrat') || t.includes('SSR') || t.includes('server rendered')) {
      errs.push(`[${m.type()}] ${t.slice(0, 200)}`);
    }
  }
});
p.on('pageerror', e => {
  if (e.message.includes('hydrat')) errs.push(`[pageerror] ${e.message.slice(0, 200)}`);
});
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForTimeout(3000);
console.log('Hydration errors:', errs.length);
errs.forEach(e => console.log(e));
await b.close();
