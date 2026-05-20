import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(1500);
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

// Probe IndustryShowcase's headline H2 ("Eight regulated verticals.")
// across the peel. If sticky-pinned, its viewport top should stay
// constant. If it moves, the section is scrolling (bad).
const track = [];
for (const pVal of [0.940, 0.950, 0.960, 0.970, 0.980, 0.990, 1.000]) {
  const y = g.sTop + g.range * pVal;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(300);
  const probe = await p.evaluate(() => {
    const sec = document.querySelector('section#industries');
    if (!sec) return { found: false, why: 'no section#industries' };
    const r = sec.getBoundingClientRect();
    // Also probe an inner landmark (the "Eight regulated verticals."
    // text) — robust to internal layout changes.
    const headlines = sec.querySelectorAll('h2, h3, p, span');
    let headlineTop = null;
    for (const h of headlines) {
      const t = (h.textContent || '').trim();
      if (t.startsWith('Eight regulated verticals') || t === 'verticals.' || t.includes('Eight regulated')) {
        headlineTop = h.getBoundingClientRect().top;
        break;
      }
    }
    return { found: true, sectionTop: r.top, sectionBottom: r.bottom, sectionHeight: r.height, headlineTop };
  });
  track.push({ p: pVal, ...probe });
}
console.log('INDUSTRY SHOWCASE STATIC CHECK:');
console.log(JSON.stringify(track, null, 2));
await b.close();
