import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/closing-hold', { recursive: true });
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

// Critical beats: BEFORE → DURING → END of closing arc
const beats = [
  { p: 0.940, label: '00-pre-signature-still-relieved' },
  { p: 0.952, label: '01-signature-alex-frame-EXPANDED' },
  { p: 0.958, label: '02-decision-pause-dont-let-this-be-you' },
  { p: 0.968, label: '03-decision-exits-scene9-enters' },
  { p: 0.975, label: '04-scene9-mid-reveal' },
  { p: 0.982, label: '05-HOLD-ZONE-START-fully-landed' },
  { p: 0.987, label: '06-HOLD-ZONE-MID-should-be-IDENTICAL' },
  { p: 0.992, label: '07-HOLD-ZONE-END-still-IDENTICAL' },
  { p: 0.997, label: '08-cinema-lift-starts' },
  { p: 0.999, label: '09-cinema-mostly-lifted' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `/tmp/closing-hold/${beat.label}.jpg`, type: 'jpeg', quality: 92 });
  console.log(`✓ ${beat.label}`);
}
await b.close();
