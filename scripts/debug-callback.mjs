import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();

p.on('console', msg => console.log(`[browser ${msg.type()}]`, msg.text()));

await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);

// Install listener BEFORE any user gesture
await p.evaluate(() => {
  window.addEventListener('cinema:lawsuit-impact', () => {
    console.log('!! lawsuit event fired in window');
    setTimeout(() => {
      console.log('   body classes (sync after fire):', document.body.className);
    }, 0);
    setTimeout(() => {
      console.log('   body classes @ 50ms:', document.body.className);
    }, 50);
    setTimeout(() => {
      console.log('   body classes @ 300ms:', document.body.className);
    }, 300);
  });
  console.log('listener installed');
});

const btn = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label="Begin the experience"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (btn) { await p.mouse.click(btn.x, btn.y); await p.waitForTimeout(900); }
await p.waitForSelector('section.cinema-stage');
console.log('cinema mounted');

const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

// Slow forward sweep
for (let pct = 0.50; pct <= 0.62; pct += 0.005) {
  const y = g.sTop + g.range * pct;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(80);
}

await p.waitForTimeout(1000);
await b.close();
