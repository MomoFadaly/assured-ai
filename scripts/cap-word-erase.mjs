import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/word-erase', { recursive: true });
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);

// Dismiss the intro by clicking Begin
const btn = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label="Begin the experience"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (btn) {
  await p.mouse.click(btn.x, btn.y);
  await p.waitForTimeout(900);
}
await p.waitForSelector('section.cinema-stage');

const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

// Capture beats throughout the deletion window (0.150 → 0.162)
const beats = [
  { p: 0.148, label: 'a-just-before' },
  { p: 0.151, label: 'b-1st-word-selected' },
  { p: 0.153, label: 'c-2-3-words' },
  { p: 0.155, label: 'd-mid-line2' },
  { p: 0.157, label: 'e-line2-mostly-gone' },
  { p: 0.159, label: 'f-line1-mid' },
  { p: 0.161, label: 'g-almost-done' },
  { p: 0.163, label: 'h-erased' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `/tmp/word-erase/${beat.label}.jpg`, type: 'jpeg', quality: 90 });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}
await b.close();
