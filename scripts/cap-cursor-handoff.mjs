import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/cursor-handoff', { recursive: true });
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(1500);
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

const beats = [
  { p: 0.50, label: 'a-cinema-mid (should be interactive)' },
  { p: 0.90, label: 'b-cinema-pre-peel (should be interactive)' },
  { p: 0.95, label: 'c-peel-starting (should hand off pointer-events)' },
  { p: 0.97, label: 'd-peel-mid (verticals should be hoverable)' },
  { p: 1.00, label: 'e-peel-done (verticals fully interactive)' },
];

const results = [];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(400);

  // Probe: what's the pointer-events on the cinema section right now?
  // What does hit-testing at the BOTTOM-center of the viewport return?
  const probe = await p.evaluate(() => {
    const sec = document.querySelector('section.cinema-stage');
    const secPE = sec ? window.getComputedStyle(sec).pointerEvents : null;
    // Hit-test at bottom center of viewport — this is where IndustryShowcase appears during peel
    const hitBottom = document.elementFromPoint(window.innerWidth / 2, window.innerHeight * 0.85);
    const hitBottomTag = hitBottom?.tagName || null;
    const hitBottomClasses = hitBottom?.className || null;
    const hitBottomInCinema = !!hitBottom?.closest('.cinema-stage');
    const hitBottomInIndustries = !!hitBottom?.closest('#industries');
    const hitBottomCursor = hitBottom ? window.getComputedStyle(hitBottom).cursor : null;
    // Hit-test at top center too (cinema's territory before peel)
    const hitTop = document.elementFromPoint(window.innerWidth / 2, window.innerHeight * 0.25);
    const hitTopInCinema = !!hitTop?.closest('.cinema-stage');
    const hitTopInIndustries = !!hitTop?.closest('#industries');
    const hitTopCursor = hitTop ? window.getComputedStyle(hitTop).cursor : null;
    return {
      cinemaSectionPointerEvents: secPE,
      bottom: { tag: hitBottomTag, classes: typeof hitBottomClasses === 'string' ? hitBottomClasses.slice(0, 60) : null, inCinema: hitBottomInCinema, inIndustries: hitBottomInIndustries, cursor: hitBottomCursor },
      top: { inCinema: hitTopInCinema, inIndustries: hitTopInIndustries, cursor: hitTopCursor },
    };
  });

  // Move pointer to bottom-center (where IndustryShowcase appears) and screenshot
  await p.mouse.move(720, 765);
  await p.waitForTimeout(150);
  await p.screenshot({ path: `/tmp/cursor-handoff/${beat.label.split(' ')[0]}.jpg`, type: 'jpeg', quality: 85, fullPage: false });

  results.push({ p: beat.p, label: beat.label, ...probe });
}
console.log(JSON.stringify(results, null, 2));
await b.close();
