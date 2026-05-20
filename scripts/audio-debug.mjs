import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
p.on('console', m => {
  if (m.text().includes('TICK') || m.text().includes('AudioContext')) {
    console.log(`[browser]`, m.text());
  }
});
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(1500);

// Install a tick counter in the page
await p.evaluate(() => {
  window.__tickCount = 0;
  window.addEventListener('cinema:type-tick', () => {
    window.__tickCount++;
    console.log(`TICK #${window.__tickCount}`);
  });
  console.log('Tick listener installed');
});

// Get cinema scroll geometry
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

// Smoothly scroll through the typing window (0.020 → 0.110)
const steps = 25;
for (let i = 0; i <= steps; i++) {
  const progress = (i / steps) * 0.12;
  const y = g.sTop + g.range * progress;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(120);
}

const total = await p.evaluate(() => window.__tickCount);
console.log(`\nFinal tick count: ${total}`);
console.log(`(Expected: ~52 — the prequel has 62 chars, ~10 are spaces which don't tick)`);

await b.close();
