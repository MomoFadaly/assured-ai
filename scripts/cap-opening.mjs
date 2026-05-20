// Captures the opening cold-open: the very first seconds of scroll
// where the blinking cursor lives on a black screen. Includes pre-
// interaction (page just loaded, viewport at top, no scroll) and a
// few micro-progress beats to see the cursor in different states.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/opening-cap', { recursive: true });
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(1200);

// Beat 1: page loaded, no scroll, cursor blinking in resting state
await p.screenshot({ path: '/tmp/opening-cap/01-arrival.jpg', type: 'jpeg', quality: 92, fullPage: false });
console.log('✓ 01-arrival (page just loaded)');

// Capture a couple of frames mid-blink to see the cursor pulse
for (let i = 0; i < 4; i++) {
  await p.waitForTimeout(280); // typical caret blink cadence
  await p.screenshot({ path: `/tmp/opening-cap/02-blink-${i + 1}.jpg`, type: 'jpeg', quality: 92, fullPage: false });
  console.log(`✓ 02-blink-${i + 1}`);
}

// Beat 3: very small scroll — cursor still on black but maybe typing started
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});
for (const pVal of [0.005, 0.015, 0.030, 0.050, 0.080, 0.110]) {
  const y = g.sTop + g.range * pVal;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(450);
  const label = `03-progress-${String(Math.round(pVal * 1000)).padStart(3, '0')}`;
  await p.screenshot({ path: `/tmp/opening-cap/${label}.jpg`, type: 'jpeg', quality: 92, fullPage: false });
  console.log(`✓ ${label}  p=${pVal}`);
}

await b.close();
