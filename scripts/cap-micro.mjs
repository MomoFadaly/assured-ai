// Sub-beat capture. Standard cap-opening.mjs steps at 0.005 → 0.110.
// This script captures the IN-BETWEEN moments where craft hides:
//  - The exact frame the first character lands
//  - The mid-blink half-opacity state
//  - The moment scale begins growing during erase end
//  - The space between headline char N and char N+1
//  - The shrink + rise transition (where the headline "becomes a title")
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/cap-micro', { recursive: true });
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(1500);
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

const BEATS = [
  // First-character moment
  { p: 0.018, label: 'a-cursor-alone-final' },
  { p: 0.022, label: 'b-first-char-E' },
  { p: 0.024, label: 'c-Ev' },
  { p: 0.027, label: 'd-Eve' },
  // Mid-typing breath
  { p: 0.070, label: 'e-midtyping' },
  // The hold + last word
  { p: 0.108, label: 'f-prequel-just-complete' },
  { p: 0.130, label: 'g-prequel-hold' },
  // Erase scale-grow moment
  { p: 0.163, label: 'h-erase-just-completed' },
  { p: 0.167, label: 'i-scale-growing' },
  { p: 0.172, label: 'j-scale-landed' },
  // Headline reveal
  { p: 0.183, label: 'k-pause-just-after' },
  { p: 0.192, label: 'l-first-char-headline' },
  { p: 0.205, label: 'm-headline-mid-type' },
  { p: 0.215, label: 'n-headline-almost-done' },
  // Shrink + rise
  { p: 0.225, label: 'o-headline-settled' },
  { p: 0.232, label: 'p-shrinking' },
  { p: 0.240, label: 'q-rise-mid' },
  { p: 0.250, label: 'r-pinned-subtitle' },
];

for (const beat of BEATS) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `/tmp/cap-micro/${beat.label}.jpg`, type: 'jpeg', quality: 92 });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}
await b.close();
