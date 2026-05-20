// Captures each of the 8 verticals' full-bleed background by hovering
// over each industry row in IndustryShowcase. Output: /tmp/v-audit/*.jpg
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/v-audit', { recursive: true });
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(1500);

// Scroll to past the peel so IndustryShowcase is fully visible and interactive
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});
const y = g.sTop + g.range * 1.0;
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
await p.waitForTimeout(800);

// Find all 8 industry rows in #industries and hover each
const slugs = await p.evaluate(() => {
  const items = Array.from(document.querySelectorAll('#industries [data-slug], #industries li, #industries [role="option"]'));
  return items.map(el => ({
    slug: el.getAttribute('data-slug') || (el.textContent || '').trim().slice(0, 30),
    rect: el.getBoundingClientRect(),
  })).filter(x => x.rect.height > 8);
});
console.log('Industries found:', slugs.length);
console.log(slugs.map(s => s.slug).join(' | '));

for (let i = 0; i < Math.min(slugs.length, 8); i++) {
  const s = slugs[i];
  await p.mouse.move(s.rect.x + s.rect.width / 2, s.rect.y + s.rect.height / 2);
  await p.waitForTimeout(900);
  const label = `${String(i + 1).padStart(2, '0')}-${(s.slug || 'unknown').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  await p.screenshot({ path: `/tmp/v-audit/${label}.jpg`, type: 'jpeg', quality: 88, fullPage: false });
  console.log(`✓ ${label}`);
}
await b.close();
