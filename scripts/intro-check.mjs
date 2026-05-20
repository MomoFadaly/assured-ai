import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
const errs = [];
p.on('pageerror', e => errs.push(`[pageerror] ${e.message.slice(0, 200)}`));
p.on('console', m => { if (m.type() === 'error') errs.push(`[err] ${m.text().slice(0, 200)}`); });
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForTimeout(800);
// Should see intro overlay
const intro = await p.evaluate(() => {
  const overlays = Array.from(document.querySelectorAll('div')).filter(d => {
    const cs = window.getComputedStyle(d);
    return cs.position === 'fixed' && cs.zIndex === '9999';
  });
  return overlays.map(o => ({
    rect: o.getBoundingClientRect(),
    text: o.innerText?.slice(0, 200),
  }));
});
console.log('Intro overlays found:', intro.length);
intro.forEach((i, k) => console.log(`  [${k}] text: ${i.text?.replace(/\s+/g, ' ').slice(0, 100)}`));

// Take a screenshot of the initial state
await p.screenshot({ path: '/tmp/intro-initial.jpg', quality: 90, type: 'jpeg' });

// Wait for the loader to complete + Begin button to appear
await p.waitForTimeout(2000);
await p.screenshot({ path: '/tmp/intro-loaded.jpg', quality: 90, type: 'jpeg' });
const hasBeginButton = await p.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Begin the experience"]');
  return btn ? { rect: btn.getBoundingClientRect(), text: btn.textContent.trim() } : null;
});
console.log('Begin button:', JSON.stringify(hasBeginButton));

console.log('\nErrors:', errs.slice(0, 5));
await b.close();
