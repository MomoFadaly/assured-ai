import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/audit-after', { recursive: true });
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

// Updated capture beats — same labels as before so we can compare
const beats = [
  // PUBLISH (unchanged timing)
  { p: 0.393, label: '01-success-published' },
  { p: 0.405, label: '02-confetti-falling' },
  // POST-SUCCESS MORPH (unchanged)
  { p: 0.420, label: '03-morph-mid-corner-arriving' },
  { p: 0.435, label: '04-social-card-appearing' },
  { p: 0.445, label: '05-social-card-landed' },
  // NEW BREATH BEATS — should be visible here
  { p: 0.450, label: '06-NEW-breath-1' },
  { p: 0.455, label: '07-NEW-breath-2' },
  { p: 0.460, label: '08-NEW-breath-3-slide-done' },
  { p: 0.465, label: '09-just-before-comments' },
  // COMMENTS (now delayed)
  { p: 0.471, label: '10-sarah-arriving' },
  { p: 0.480, label: '11-marcus-arriving' },
  { p: 0.490, label: '12-janet-arriving-CRITICAL' },
  { p: 0.496, label: '13-nicole-arriving' },
  { p: 0.503, label: '14-amara-arriving' },
  { p: 0.512, label: '15-james-arriving' },
  { p: 0.523, label: '16-david-CLIMAX' },
  { p: 0.530, label: '17-emma-final' },
  { p: 0.540, label: '18-all-comments-landed' },
  // FREEZE + STATS
  { p: 0.554, label: '19-freeze-dim-activating' },
  { p: 0.562, label: '20-line1-likes' },
  { p: 0.572, label: '21-line2-replies' },
  { p: 0.590, label: '22-line3-lawsuit' },
  { p: 0.598, label: '23-lawsuit-peak-pulse' },
  { p: 0.620, label: '24-lawsuit-held' },
  { p: 0.640, label: '25-stats-sliding-out' },
  // CLOCK ARRIVAL
  { p: 0.655, label: '26-pre-clock' },
  { p: 0.662, label: '27-checkmark-fading' },
  { p: 0.670, label: '28-clock-launching' },
  { p: 0.685, label: '29-clock-mid-flight' },
  { p: 0.715, label: '30-clock-center' },
  { p: 0.745, label: '31-clock-rewinding' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(420);
  await p.screenshot({ path: `/tmp/audit-after/${beat.label}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}
await b.close();
