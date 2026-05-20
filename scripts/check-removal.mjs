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

// Install MutationObserver to watch the section element
await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  window.__mutations = [];
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        const has = s.classList.contains('cinema-lawsuit-callback');
        window.__mutations.push({ t: performance.now(), has, classes: s.className });
      }
    }
  });
  obs.observe(s, { attributes: true });
});

await p.evaluate(() => window.dispatchEvent(new CustomEvent('cinema:lawsuit-impact')));
await p.waitForTimeout(1000);

const mutations = await p.evaluate(() => window.__mutations);
console.log('Class mutations after dispatch:');
const t0 = mutations[0]?.t ?? 0;
mutations.forEach(m => console.log(`  t+${(m.t - t0).toFixed(0)}ms  has=${m.has}  className.length=${m.classes.length}`));
await b.close();
