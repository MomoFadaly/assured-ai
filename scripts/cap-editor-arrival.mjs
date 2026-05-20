import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/editor-arrival', { recursive: true });
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

// Dense walk through pin → settled-pause → editor slide → typewriter
const beats = [
  // Pin landing
  { p: 0.272, label: '01-pre-pin' },
  { p: 0.275, label: '02-pin-land' },
  { p: 0.277, label: '03-settled-A' },
  { p: 0.279, label: '04-settled-B' },
  { p: 0.281, label: '05-entry-begins' },
  // Editor slide-in (very dense — this is the dramatic beat)
  { p: 0.283, label: '06-entry-2pct' },
  { p: 0.286, label: '07-entry-7pct' },
  { p: 0.289, label: '08-entry-14pct' },
  { p: 0.292, label: '09-entry-23pct' },
  { p: 0.295, label: '10-entry-42pct' },
  { p: 0.298, label: '11-entry-67pct' },
  { p: 0.302, label: '12-entry-87pct' },
  { p: 0.305, label: '13-entry-95pct' },
  { p: 0.310, label: '14-entry-near-settle' },
  { p: 0.315, label: '15-entry-settled' },
  { p: 0.320, label: '16-fully-landed' },
  // Typewriter unfolding (paragraph 1 then 2)
  { p: 0.295, label: 't00-mid-entry-text' },
  { p: 0.310, label: 't01-para1-start' },
  { p: 0.325, label: 't02-para1-mid' },
  { p: 0.339, label: 't03-typewriter-done' },
  { p: 0.350, label: 't04-after-typing' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(550);
  await p.screenshot({ path: `/tmp/editor-arrival/${beat.label}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}
await b.close();
