import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.reload({ waitUntil: 'networkidle' });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(2000);
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});
// scroll to mid prequel
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), g.sTop + g.range * 0.11);
await p.waitForTimeout(800);
const inspection = await p.evaluate(() => {
  // Find h2 and its children
  const h2 = document.querySelector('h2[class*="leading"]');
  if (!h2) return { found: false };
  const spans = Array.from(h2.querySelectorAll('span.block'));
  return {
    h2Rect: h2.getBoundingClientRect(),
    h2Style: {
      whiteSpace: window.getComputedStyle(h2).whiteSpace,
      width: window.getComputedStyle(h2).width,
      fontSize: window.getComputedStyle(h2).fontSize,
      maxWidth: window.getComputedStyle(h2).maxWidth,
    },
    lineSpans: spans.map((s, i) => ({
      i,
      rect: s.getBoundingClientRect(),
      text: (s.textContent || '').slice(0, 80),
      whiteSpace: window.getComputedStyle(s).whiteSpace,
      width: window.getComputedStyle(s).width,
      display: window.getComputedStyle(s).display,
      maxWidth: window.getComputedStyle(s).maxWidth,
    })),
  };
});
console.log(JSON.stringify(inspection, null, 2));
await b.close();
