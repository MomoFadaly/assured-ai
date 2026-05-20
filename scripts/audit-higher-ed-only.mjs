// Targeted Higher Ed debug — verify background image URL is rendered
// and probe for any image-load errors.
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
p.on('console', m => console.log(`[${m.type()}]`, m.text()));
p.on('requestfailed', r => {
  if (r.url().includes('unsplash')) console.log('[FAILED IMG]', r.url(), r.failure()?.errorText);
});
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(1500);
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});
const y = g.sTop + g.range * 1.0;
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
await p.waitForTimeout(1000);

// Find Higher Ed row and click it (not hover)
const higherEd = await p.evaluate(() => {
  const items = Array.from(document.querySelectorAll('#industries li, #industries [role="option"]'));
  const target = items.find(el => (el.textContent || '').includes('Higher Ed'));
  if (!target) return { found: false };
  const r = target.getBoundingClientRect();
  return { found: true, x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
console.log('Higher Ed row:', JSON.stringify(higherEd));

await p.mouse.move(higherEd.x, higherEd.y);
await p.waitForTimeout(1500);
await p.mouse.click(higherEd.x, higherEd.y);
await p.waitForTimeout(2500);

// Inspect what's actually rendered for the hero background
const bgInfo = await p.evaluate(() => {
  // Look for the element with backgroundImage style set in the hero region
  const heroes = Array.from(document.querySelectorAll('#industries [style*="backgroundImage"], #industries [style*="background-image"]'));
  return heroes.map(el => ({
    tag: el.tagName,
    cls: el.className?.slice(0, 80),
    bg: el.style.backgroundImage,
    rect: el.getBoundingClientRect(),
  }));
});
console.log('Hero bg elements:', JSON.stringify(bgInfo, null, 2));

await p.screenshot({ path: '/tmp/v-audit/higher-ed-debug.jpg', type: 'jpeg', quality: 90, fullPage: false });
await b.close();
