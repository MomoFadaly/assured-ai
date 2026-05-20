import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
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

// Find PasteAndScan's actual offsetTop in the page
const targetY = await p.evaluate(() => {
  const el = document.querySelector('#paste-and-scan');
  if (!el) return null;
  // Get full document scroll position by walking up offset parents
  let y = 0;
  let cur = el;
  while (cur) {
    y += cur.offsetTop || 0;
    cur = cur.offsetParent;
  }
  // Subtract a small offset to show the headline at the top
  return y - 40;
});
console.log('Scrolling to:', targetY);
if (targetY) {
  await p.evaluate((y) => {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, targetY);
  await p.waitForTimeout(1500);
}
await p.screenshot({ path: '/tmp/batch5-paste-idle.jpg', type: 'jpeg', quality: 92 });
console.log('✓ paste-idle');

// Click "try a risky example"
const exampleBtn = await p.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const b = btns.find(b => b.textContent?.includes('try a risky example'));
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, found: true };
});
if (exampleBtn) {
  await p.mouse.click(exampleBtn.x, exampleBtn.y);
  await p.waitForTimeout(900);
  await p.screenshot({ path: '/tmp/batch5-paste-scanning.jpg', type: 'jpeg', quality: 92 });
  console.log('✓ paste-scanning');
  await p.waitForTimeout(2500);
  await p.screenshot({ path: '/tmp/batch5-paste-results.jpg', type: 'jpeg', quality: 92 });
  console.log('✓ paste-results');
} else {
  console.log('Example button not found');
}
await b.close();
