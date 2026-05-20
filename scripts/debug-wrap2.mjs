import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.reload({ waitUntil: 'networkidle' });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(2500);
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), g.sTop + g.range * 0.11);
await p.waitForTimeout(1500);
const inspection = await p.evaluate(() => {
  const h2 = document.querySelector('h2[class*="leading"]');
  const lines = Array.from(h2.querySelectorAll(':scope > span.block'));
  return lines.map((s, i) => ({
    i,
    text: (s.textContent || '').slice(0, 60),
    inlineStyleAttr: s.getAttribute('style'),
    inlineStyleWhiteSpace: s.style.whiteSpace,
    computedWhiteSpace: window.getComputedStyle(s).whiteSpace,
    computedDisplay: window.getComputedStyle(s).display,
    rect: { w: s.getBoundingClientRect().width, h: s.getBoundingClientRect().height },
  }));
});
console.log(JSON.stringify(inspection, null, 2));
await b.close();
