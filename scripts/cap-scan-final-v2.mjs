import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/scan-final-v2', { recursive: true });
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

// Updated beats matching new timing
const beats = [
  // Pre-Scene 7
  { p: 0.815, label: '01-thesis-fading-out' },
  // Scene 7 entry
  { p: 0.822, label: '02-scene7-fade-in' },
  { p: 0.830, label: '03-headline-cascading' },
  { p: 0.840, label: '04-subline-landed' },
  // Scanner sweep + lock-on
  { p: 0.845, label: '05-scanner-mid-sweep' },
  { p: 0.852, label: '06-scanner-locking' },
  { p: 0.855, label: '07-NEW-underline-drawing' },
  { p: 0.859, label: '08-chip1-medical-firing' },
  { p: 0.862, label: '09-held-silence' },
  { p: 0.866, label: '10-FLAG-PUNCH' },
  { p: 0.869, label: '11-NEW-dose-box-visible' },
  // Chip cascade
  { p: 0.872, label: '12-chip2-high-risk' },
  { p: 0.876, label: '13-chip3-consumer-advice' },
  { p: 0.880, label: '14-chip4-source-verif' },
  // Sources bar + verify
  { p: 0.882, label: '15-sources-bar-arriving' },
  { p: 0.886, label: '16-source-FDA-ticking' },
  { p: 0.892, label: '17-sources-DailyMed-NIH' },
  { p: 0.897, label: '18-sources-HC-WHO' },
  { p: 0.900, label: '19-all-sources-green' },
  // Fix Panel
  { p: 0.895, label: '20-fix-panel-unfurling' },
  { p: 0.902, label: '21-fix-panel-row1' },
  { p: 0.906, label: '22-fix-panel-row2' },
  { p: 0.910, label: '23-fix-panel-row3' },
  { p: 0.913, label: '24-accept-fix-arriving' },
  { p: 0.916, label: '25-accept-fix-pulsing' },
  // Climax: self-press → strikethrough → correction
  { p: 0.919, label: '26-accept-fix-PRESSING' },
  { p: 0.922, label: '27-strikethrough-drawing' },
  { p: 0.926, label: '28-correction-container-appearing' },
  { p: 0.930, label: '29-correction-typing-30pct' },
  { p: 0.938, label: '30-correction-typing-60pct' },
  { p: 0.946, label: '31-correction-typing-90pct' },
  { p: 0.950, label: '32-correction-COMPLETE' },
  // Scene 8
  { p: 0.955, label: '33-scene8-fading-in' },
  { p: 0.962, label: '34-scene8-eyebrow' },
  { p: 0.968, label: '35-scene8-headline-READY-TO-PUBLISH' },
  { p: 0.972, label: '36-diff-rows-cascading' },
  { p: 0.980, label: '37-diff-rows-all-present' },
  // Scene 9 closing
  { p: 0.984, label: '38-scene9-tagline-arriving' },
  { p: 0.989, label: '39-scene9-tagline-PILLARS' },
  { p: 0.993, label: '40-scene9-CTA' },
  // Cinema lift
  { p: 0.990, label: '41-cinema-lift-begins' },
  { p: 0.995, label: '42-cinema-lift-half' },
  { p: 0.999, label: '43-cinema-lift-complete' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(420);
  await p.screenshot({ path: `/tmp/scan-final-v2/${beat.label}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}
await b.close();
