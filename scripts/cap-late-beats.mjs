import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/opening-cap', { recursive: true });
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
  { p: 0.140, label: '04-prequel-hold' },
  { p: 0.155, label: '05-erase-mid' },
  { p: 0.165, label: '06-erase-end' },
  { p: 0.180, label: '07-headline-fade-in' },
  { p: 0.200, label: '08-headline-retyping' },
  { p: 0.225, label: '09-headline-complete' },
];
for (const beat of BEATS) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `/tmp/opening-cap/${beat.label}.jpg`, type: 'jpeg', quality: 90, fullPage: false });
  console.log(`✓ ${beat.label}  p=${beat.p}`);
}
await b.close();
