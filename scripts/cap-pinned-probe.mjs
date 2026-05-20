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

for (const probeP of [0.290, 0.330, 0.500]) {
  const y = g.sTop + g.range * probeP;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(500);
  const info = await p.evaluate(() => {
    const stage = document.querySelector('section.cinema-stage');
    const coldOpen = stage?.querySelector('div.z-\\[20\\]');
    if (!coldOpen) return { error: 'no z-20' };
    const csOuter = getComputedStyle(coldOpen);
    const wrapper = coldOpen.querySelector('div.text-center');
    const csWrapper = wrapper ? getComputedStyle(wrapper) : null;
    const wrapperRect = wrapper?.getBoundingClientRect();
    const h2 = wrapper?.querySelector('h2');
    const h2Text = (h2?.textContent || '').slice(0, 80);
    const h2Rect = h2?.getBoundingClientRect();
    return {
      outerOpacity: csOuter.opacity,
      wrapperOpacity: csWrapper?.opacity,
      wrapperTransform: csWrapper?.transform?.slice(0, 70),
      wrapperRect: wrapperRect ? { x: Math.round(wrapperRect.x), y: Math.round(wrapperRect.y), w: Math.round(wrapperRect.width), h: Math.round(wrapperRect.height) } : null,
      h2Text,
      h2Rect: h2Rect ? { x: Math.round(h2Rect.x), y: Math.round(h2Rect.y), w: Math.round(h2Rect.width), h: Math.round(h2Rect.height) } : null,
    };
  });
  console.log(`\n[p=${probeP}]`, JSON.stringify(info, null, 2));
}
await b.close();
