import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(4000);
// Full screenshot
await p.screenshot({ path: '/tmp/pill-full.jpg', fullPage: false, quality: 92, type: 'jpeg' });
// Crop just the bottom-right corner where the pill should be
await p.screenshot({ path: '/tmp/pill-corner.jpg', clip: { x: 1180, y: 780, width: 260, height: 120 }, quality: 92, type: 'jpeg' });
await b.close();
