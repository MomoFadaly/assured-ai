import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
// Force a hard reload to bypass any HMR cache
await p.reload({ waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(2000);
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

// At full peel, inspect the section element's style attribute directly
const y = g.sTop + g.range * 1.0;
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
await p.waitForTimeout(500);

const inspection = await p.evaluate(() => {
  const sec = document.querySelector('section.cinema-stage');
  if (!sec) return { found: false };
  const cs = window.getComputedStyle(sec);
  return {
    found: true,
    inlineStyle: sec.getAttribute('style'),
    computedPointerEvents: cs.pointerEvents,
    computedCursor: cs.cursor,
    rect: sec.getBoundingClientRect(),
  };
});
console.log('SECTION INSPECTION AT p=1.0:');
console.log(JSON.stringify(inspection, null, 2));

// Also check at p=0.5 (cinema active)
const y2 = g.sTop + g.range * 0.5;
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y2);
await p.waitForTimeout(500);
const inspection2 = await p.evaluate(() => {
  const sec = document.querySelector('section.cinema-stage');
  return { inlineStyle: sec.getAttribute('style'), computedPointerEvents: window.getComputedStyle(sec).pointerEvents };
});
console.log('SECTION INSPECTION AT p=0.5:');
console.log(JSON.stringify(inspection2, null, 2));

await b.close();
