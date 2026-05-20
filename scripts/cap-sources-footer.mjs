import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/sources-footer', { recursive: true });
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
if (btn) { await p.mouse.click(btn.x, btn.y); await p.waitForTimeout(1000); }
await p.waitForSelector('section.cinema-stage');
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

// Sources bar: ds 0.848 → raw ~0.873. Chip cascade ds 0.856-0.880 → raw ~0.879-0.899.
// Capture from before, through, after.
const beats = [
  { p: 0.860, label: '00-sources-bar-fading-in' },
  { p: 0.880, label: '01-FDA-checking' },
  { p: 0.885, label: '02-DailyMed-checking' },
  { p: 0.890, label: '03-NIH-checking' },
  { p: 0.895, label: '04-HC-checking' },
  { p: 0.898, label: '05-WHO-checking' },
  { p: 0.900, label: '06-all-verified' },
  { p: 0.905, label: '07-post-verification' },
  { p: 0.918, label: '08-accept-press-zone' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `/tmp/sources-footer/${beat.label}.jpg`, type: 'jpeg', quality: 92, fullPage: false });
  console.log(`✓ ${beat.label}`);
}
await b.close();
