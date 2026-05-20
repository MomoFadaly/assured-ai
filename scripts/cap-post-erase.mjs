import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

// Captures the new cold-open timeline:
//   0.150 → 0.180 deletion (slower, 2.5×)
//   0.180 → 0.205 post-erase breath — standalone center caret
//   0.205 → 0.233 retype headline
//
// Walks through every key beat so we can validate the deletion
// pacing AND the post-erase pause look right.

await mkdir('/tmp/post-erase', { recursive: true });
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

const beats = [
  // Establish the new "before deletion" baseline
  { p: 0.148, label: '01-before-delete' },
  // Deletion span: 0.150 → 0.180 (was 0.150 → 0.162)
  { p: 0.153, label: '02-delete-1st-word' },
  { p: 0.158, label: '03-delete-mid' },
  { p: 0.163, label: '04-delete-late-mid' },
  { p: 0.170, label: '05-delete-late' },
  { p: 0.178, label: '06-delete-final' },
  // Post-erase breath: 0.180 → 0.205
  { p: 0.182, label: '07-post-erase-entry' },
  { p: 0.190, label: '08-post-erase-center' },
  { p: 0.200, label: '09-post-erase-still' },
  // Retype begins
  { p: 0.207, label: '10-retype-begin' },
  { p: 0.215, label: '11-retype-mid' },
  { p: 0.225, label: '12-retype-late' },
  { p: 0.234, label: '13-retype-done' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(450);
  await p.screenshot({ path: `/tmp/post-erase/${beat.label}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}
await b.close();
