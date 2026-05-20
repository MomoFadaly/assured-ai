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

// Scroll first (like cap-callback-v2 does) — this might trigger the bug
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});
const y = g.sTop + g.range * 0.572;
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true }) ?? window.scrollTo(0, y), y);
await p.waitForTimeout(500);

await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  window.__mutations = [];
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        window.__mutations.push({
          t: performance.now(),
          has: s.classList.contains('cinema-lawsuit-callback'),
          full: s.className,
        });
      }
    }
  });
  obs.observe(s, { attributes: true });
});

await p.evaluate(() => window.dispatchEvent(new CustomEvent('cinema:lawsuit-impact')));
await p.waitForTimeout(1000);

const mutations = await p.evaluate(() => window.__mutations);
console.log('Mutations after dispatch (with scroll first):');
const t0 = mutations[0]?.t ?? 0;
mutations.forEach(m => console.log(`  t+${(m.t - t0).toFixed(0)}ms  has=${m.has}  classes="${m.full.slice(0,80)}"`));
await b.close();
