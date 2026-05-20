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
await p.waitForSelector('section.cinema-stage');

const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

// Scroll to first-friendly comment moment
const y = g.sTop + g.range * 0.452;
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true }) ?? window.scrollTo(0, y), y);
await p.waitForTimeout(800);

const measurements = await p.evaluate(() => {
  // Find pinned thesis - it's an h2 containing "One bad sentence"
  const allH2 = Array.from(document.querySelectorAll('h2'));
  const thesis = allH2.find(h => h.textContent?.includes('One bad sentence') && h.textContent?.includes('takes'));
  // Find first FeedComment card (any element containing "Sarah Liang")
  const allEls = Array.from(document.querySelectorAll('*'));
  const sarah = allEls.find(el => el.textContent === 'Sarah Liang');
  const sarahCard = sarah?.closest('.rounded-xl');
  return {
    thesis: thesis ? thesis.getBoundingClientRect() : null,
    sarahCard: sarahCard ? sarahCard.getBoundingClientRect() : null,
    paddingTop: document.querySelector('.absolute.inset-0.z-\\[22\\]')?.style.paddingTop,
  };
});
console.log(JSON.stringify(measurements, null, 2));
await b.close();
