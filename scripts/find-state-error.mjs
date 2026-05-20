import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
p.on('pageerror', e => {
  console.log('=== PAGEERROR ===');
  console.log(e.message);
  console.log(e.stack?.slice(0, 1500));
});
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForTimeout(2000);
await b.close();
