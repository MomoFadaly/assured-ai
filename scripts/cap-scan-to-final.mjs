import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/scan-to-final', { recursive: true });
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

// Dense capture across the Scene 7 → Scene 8 → Scene 9 → cinema lift window
// (downstream conversion: raw = ds*0.839 + 0.161)
// ds 0.787-0.878 Scene 7  → raw 0.821-0.898
// ds 0.871-0.905 Scene 8  → raw 0.892-0.920
// ds 0.915-0.985 Scene 9  → raw 0.929-0.987 (downstreamProgress feed)
// raw 0.94-1.0  cinema lift
const beats = [
  // Pre-scene-7: clock rewind ending, editor morphing back
  { p: 0.785, label: '01-clock-rewind-ending' },
  { p: 0.795, label: '02-post-morph-back' },
  { p: 0.810, label: '03-pre-scene7' },
  // Scene 7 entry
  { p: 0.820, label: '04-scene7-fade-in' },
  { p: 0.826, label: '05-eyebrow-MOMENT-OF-RISK' },
  { p: 0.832, label: '06-headline-word1' },
  { p: 0.838, label: '07-headline-word3' },
  { p: 0.844, label: '08-headline-full' },
  { p: 0.850, label: '09-subline-before-public-problem' },
  // Scanner sweep + chip rail
  { p: 0.855, label: '10-scanner-mid-sweep' },
  { p: 0.860, label: '11-scanner-locking-on' },
  { p: 0.864, label: '12-underline-dose-box' },
  { p: 0.867, label: '13-chip1-medical-dosage' },
  { p: 0.869, label: '14-held-silence' },
  { p: 0.871, label: '15-flag-PUNCH' },
  { p: 0.873, label: '16-flag-pulse-chips-cascade' },
  { p: 0.875, label: '17-chips-2-3-4' },
  { p: 0.878, label: '18-sources-bar-checking' },
  { p: 0.882, label: '19-sources-verifying' },
  { p: 0.886, label: '20-sources-all-green' },
  { p: 0.889, label: '21-fix-panel-unfurls' },
  { p: 0.891, label: '22-fix-panel-rows-typing' },
  { p: 0.893, label: '23-accept-fix-pulsing' },
  { p: 0.895, label: '24-accept-fix-pressing-itself' },
  { p: 0.897, label: '25-body-correction-strikethrough' },
  { p: 0.899, label: '26-corrected-text-typing' },
  // Scene 8
  { p: 0.901, label: '27-scene8-fade-in' },
  { p: 0.903, label: '28-scene8-diff-strip-eyebrow' },
  { p: 0.905, label: '29-scene8-headline-ready-to-publish' },
  { p: 0.910, label: '30-diff-rows-cascading' },
  { p: 0.915, label: '31-diff-rows-all-present' },
  { p: 0.922, label: '32-scene8-settled' },
  // Scene 9 / closing
  { p: 0.935, label: '33-scene9-fade-in' },
  { p: 0.945, label: '34-tagline-safety-layer' },
  { p: 0.955, label: '35-pillars-arriving' },
  { p: 0.970, label: '36-cta-arriving' },
  { p: 0.985, label: '37-final-state' },
  // Cinema lift
  { p: 0.945, label: '38-lift-beginning' },
  { p: 0.970, label: '39-lift-half' },
  { p: 0.990, label: '40-lift-complete' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(420);
  await p.screenshot({ path: `/tmp/scan-to-final/${beat.label}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}
await b.close();
