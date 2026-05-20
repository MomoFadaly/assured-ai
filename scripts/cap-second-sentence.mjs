import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/second-sentence', { recursive: true });
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

// Dense walk through the second-sentence arc:
//   0.205 → 0.233  RETYPE (the punchline types char-by-char)
//   0.233 → 0.260  SHRINK + RISE to pinned subtitle
//   0.260 → 0.875  HOLD as pinned subtitle (whatever else takes over)
//   0.875 → 0.915  FADE OUT before the product reveal
const beats = [
  // Pin sequence — sentence moves to top FIRST
  { p: 0.255, label: 'a01-shrink-begins' },
  { p: 0.265, label: 'a02-shrink-mid' },
  { p: 0.275, label: 'a03-pin-lands' },
  { p: 0.278, label: 'a04-settled-pause' },
  // Editor begins entering (was happening earlier, now delayed)
  { p: 0.281, label: 'a05-editor-starts-entering' },
  { p: 0.288, label: 'a06-editor-mid-slide' },
  { p: 0.295, label: 'a07-editor-near-landed' },
  { p: 0.305, label: 'a08-editor-fully-here' },
  { p: 0.320, label: 'a09-editor-settled' },
  // Verify rest still works
  { p: 0.400, label: 'b01-publish-window' },
  { p: 0.500, label: 'b02-breath-climax' },
  { p: 0.700, label: 'b03-pre-fade' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `/tmp/second-sentence/${beat.label}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}
await b.close();
