import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/final-elevation', { recursive: true });
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

// HERO BEATS — the elite moments
const beats = [
  // Brand
  { p: 0.05, label: '01-new-logo-bleed-mark' },
  { p: 0.15, label: '02-cold-open-bad-word' },
  // Alex protagonist
  { p: 0.25, label: '03-alex-drafting' },
  { p: 0.378, label: '04-alex-hovering-publish-counter-pulse' },
  // Publish
  { p: 0.42, label: '05-alex-published' },
  // Storm escalation
  { p: 0.475, label: '06-storm-friendly' },
  { p: 0.494, label: '07-mood-shift-critical-turn' },
  // DAVID SPOTLIGHT
  { p: 0.510, label: '08-DAVID-SPOTLIGHT-ALONE' },
  // Lawsuit violence
  { p: 0.560, label: '09-LAWSUIT-VIOLENCE-SETTLEMENTS' },
  { p: 0.585, label: '10-real-precedents-flash' },
  // Clock + catch
  { p: 0.685, label: '11-clock-rewinding' },
  { p: 0.855, label: '12-INK-BLEED-CATCH' },
  { p: 0.872, label: '13-flag-punch-chips' },
  // Fix
  { p: 0.910, label: '14-accept-fix-press' },
  { p: 0.935, label: '15-correction-typing' },
  // Scene 8
  { p: 0.965, label: '16-ready-to-publish' },
  // Word counter corrected
  { p: 0.950, label: '17-word-counter-corrected' },
  // Closing
  { p: 0.985, label: '18-NEW-CLOSING-PITCH' },
  // Alex signature
  { p: 0.992, label: '19-ALEX-STILL-HAS-A-JOB' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `/tmp/final-elevation/${beat.label}.jpg`, type: 'jpeg', quality: 92 });
  console.log(`✓ ${beat.label}`);
}

// Then PasteAndScan
await p.evaluate(() => {
  const el = document.querySelector('#paste-and-scan');
  if (!el) return;
  let y = 0;
  let cur = el;
  while (cur) {
    y += cur.offsetTop || 0;
    cur = cur.offsetParent;
  }
  if (window.__lenis) window.__lenis.scrollTo(y - 40, { immediate: true, force: true });
  else window.scrollTo(0, y - 40);
});
await p.waitForTimeout(1500);
await p.screenshot({ path: '/tmp/final-elevation/20-paste-and-scan-idle.jpg', type: 'jpeg', quality: 92 });
console.log('✓ 20-paste-and-scan-idle');

await b.close();
