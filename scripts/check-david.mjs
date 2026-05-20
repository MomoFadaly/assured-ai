import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
const btn = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label="Begin the experience"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (btn) { await p.mouse.click(btn.x, btn.y); await p.waitForTimeout(1500); }
await p.waitForSelector('section.cinema-stage');
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});
const y = g.sTop + g.range * 0.508;
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
await p.waitForTimeout(1200);
// Check what's actually in the DOM at this scroll position
const info = await p.evaluate(() => {
  const all = Array.from(document.querySelectorAll('*'));
  const davidPortrait = document.querySelector('img[alt="David Chen"]');
  const dimDivs = all.filter(el => {
    const s = window.getComputedStyle(el);
    return s.position === 'fixed' && s.inset === '0px' && parseInt(s.zIndex || '0') >= 40;
  });
  return {
    davidVisible: !!davidPortrait,
    davidStyle: davidPortrait ? window.getComputedStyle(davidPortrait.parentElement.parentElement).opacity : null,
    fixedFullscreenDivs: dimDivs.length,
    dimInfo: dimDivs.map(d => ({
      zIndex: window.getComputedStyle(d).zIndex,
      opacity: window.getComputedStyle(d).opacity,
      backgroundColor: window.getComputedStyle(d).backgroundColor,
    })),
  };
});
console.log(JSON.stringify(info, null, 2));
await p.screenshot({ path: '/tmp/david-debug.jpg', type: 'jpeg', quality: 92 });
await b.close();
