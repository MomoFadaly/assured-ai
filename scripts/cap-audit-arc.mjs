import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/audit-arc', { recursive: true });
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

// Extremely dense capture spanning publish → comments → stats → clock
// Format: raw% — annotated with what should be visible.
const beats = [
  // === PUBLISH SEQUENCE ===
  { p: 0.365, label: '01-pre-activate' },
  { p: 0.372, label: '02-button-activates' },
  { p: 0.376, label: '03-activated-stable' },
  { p: 0.381, label: '04-shimmer' },
  { p: 0.384, label: '05-press-bottom' },
  { p: 0.387, label: '06-press-release' },
  { p: 0.389, label: '07-loading-begins' },
  { p: 0.391, label: '08-loading-mid' },
  { p: 0.393, label: '09-success-published' },
  // === POST-SUCCESS WINDOW ===
  { p: 0.396, label: '10-published-state' },
  { p: 0.400, label: '11-confetti-flying' },
  { p: 0.405, label: '12-confetti-falling' },
  { p: 0.410, label: '13-editor-fading' },
  // === MORPH TO SOCIAL CARD ===
  { p: 0.415, label: '14-editor-half-faded' },
  { p: 0.420, label: '15-corner-pill-arriving' },
  { p: 0.425, label: '16-social-card-appearing' },
  { p: 0.430, label: '17-mid-morph' },
  { p: 0.435, label: '18-social-card-mostly-here' },
  { p: 0.440, label: '19-social-card-landed' },
  // === COMMENTS (Mo says these come too early) ===
  { p: 0.443, label: '20-sarah-arriving' },
  { p: 0.448, label: '21-sarah-here-marcus-arriving' },
  { p: 0.455, label: '22-marcus-mostly-here' },
  { p: 0.460, label: '23-janet-arriving-CRITICAL' },
  { p: 0.466, label: '24-nicole-arriving' },
  { p: 0.474, label: '25-amara-arriving' },
  { p: 0.484, label: '26-james-arriving' },
  { p: 0.496, label: '27-david-CLIMAX' },
  { p: 0.508, label: '28-emma-final-comment' },
  { p: 0.518, label: '29-all-comments-landed' },
  // === FREEZE + STATS ===
  { p: 0.523, label: '30-freeze-dim-activating' },
  { p: 0.532, label: '31-line1-likes-arriving' },
  { p: 0.544, label: '32-line2-replies-arriving' },
  { p: 0.563, label: '33-line3-lawsuit-arriving' },
  { p: 0.572, label: '34-lawsuit-peak-pulse' },
  { p: 0.585, label: '35-lawsuit-settled' },
  { p: 0.610, label: '36-stats-sliding-out' },
  // === CLOCK ARRIVAL ===
  { p: 0.630, label: '37-pre-clock' },
  { p: 0.638, label: '38-checkmark-fading-out' },
  { p: 0.645, label: '39-clock-launching' },
  { p: 0.660, label: '40-clock-mid-flight' },
  { p: 0.685, label: '41-clock-center' },
  { p: 0.715, label: '42-clock-rewinding' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(420);
  await p.screenshot({ path: `/tmp/audit-arc/${beat.label}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}
await b.close();
