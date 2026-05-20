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
const beats = [
  { p: 0.25, label: 'alex-drafting' },
  { p: 0.378, label: 'alex-about-to-publish-counter-pulse' },
  { p: 0.42, label: 'alex-published' },
  { p: 0.480, label: 'alex-watching-storm' },
  { p: 0.506, label: 'DAVID-SPOTLIGHT' },
  { p: 0.580, label: 'alex-frozen' },
  { p: 0.870, label: 'alex-catch-moment' },
  { p: 0.920, label: 'word-counter-corrected' },
  { p: 0.960, label: 'alex-exhaling' },
  { p: 0.985, label: 'alex-signature-line' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `/tmp/batch2-${beat.label}.jpg`, type: 'jpeg', quality: 92 });
  console.log(`✓ ${beat.label}`);
}
await b.close();
