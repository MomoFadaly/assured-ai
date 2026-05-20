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

// Scroll into view of the persistent thesis
await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  const top = s.getBoundingClientRect().top + window.scrollY;
  const range = s.offsetHeight - window.innerHeight;
  window.scrollTo(0, top + range * 0.500);
});
await p.waitForTimeout(800);

// Inspect the bad-word
const before = await p.evaluate(() => {
  const els = Array.from(document.querySelectorAll('.cold-open-bad-word-settled'));
  return {
    count: els.length,
    rects: els.map(e => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, visible: r.width > 0 };
    }),
    computed: els[0] ? {
      animation: getComputedStyle(els[0]).animationName,
      textShadow: getComputedStyle(els[0]).textShadow,
      transform: getComputedStyle(els[0]).transform,
      filter: getComputedStyle(els[0]).filter,
    } : null,
  };
});
console.log('Before dispatch:', JSON.stringify(before, null, 2));

// Dispatch
await p.evaluate(() => window.dispatchEvent(new CustomEvent('cinema:lawsuit-impact')));

await p.waitForTimeout(50);
const after = await p.evaluate(() => {
  const els = Array.from(document.querySelectorAll('.cold-open-bad-word-settled'));
  const section = document.querySelector('section.cinema-stage');
  return {
    sectionHasClass: section?.classList.contains('cinema-lawsuit-callback'),
    computed: els[0] ? {
      animation: getComputedStyle(els[0]).animationName,
      animationDuration: getComputedStyle(els[0]).animationDuration,
      textShadow: getComputedStyle(els[0]).textShadow,
      transform: getComputedStyle(els[0]).transform,
      filter: getComputedStyle(els[0]).filter,
      display: getComputedStyle(els[0]).display,
    } : null,
  };
});
console.log('After dispatch (50ms):', JSON.stringify(after, null, 2));

await b.close();
