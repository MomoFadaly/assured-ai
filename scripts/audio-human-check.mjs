// Mimic exactly what a human visitor does:
//   1. Land on the page
//   2. Look for the sound pill
//   3. If found, click it
//   4. Verify the audio context wakes up
//   5. Verify a tick event triggers audio output
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
p.on('console', m => {
  const t = m.text();
  if (t.includes('AudioContext') || t.includes('Sound') || t.includes('tick')) {
    console.log(`[browser ${m.type()}]`, t);
  }
});
p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));

await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(2000);

// Inject a check for any sound-related element
const findings = await p.evaluate(() => {
  // Look by aria-label, common patterns
  const byAria = Array.from(document.querySelectorAll('[aria-label*="ound" i], [aria-label*="ute" i]'));
  // Look by content
  const allButtons = Array.from(document.querySelectorAll('button'));
  const soundButtons = allButtons.filter(b => /sound|mute|enable|audio/i.test(b.textContent || ''));
  return {
    pageWidth: window.innerWidth,
    pageHeight: window.innerHeight,
    scrollY: window.scrollY,
    bodyText: document.body.innerText?.slice(0, 200),
    byAria: byAria.map(el => ({
      tag: el.tagName,
      aria: el.getAttribute('aria-label'),
      text: (el.textContent || '').slice(0, 40),
      rect: el.getBoundingClientRect(),
      computed: {
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        opacity: window.getComputedStyle(el).opacity,
        pointerEvents: window.getComputedStyle(el).pointerEvents,
      },
    })),
    soundButtons: soundButtons.map(el => ({
      text: (el.textContent || '').trim().slice(0, 40),
      aria: el.getAttribute('aria-label'),
      rect: el.getBoundingClientRect(),
      computed: {
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        opacity: window.getComputedStyle(el).opacity,
        zIndex: window.getComputedStyle(el).zIndex,
      },
    })),
  };
});
console.log('SOUND ELEMENT SEARCH:');
console.log(JSON.stringify(findings, null, 2));

await p.screenshot({ path: '/tmp/audio-page.jpg', type: 'jpeg', quality: 90, fullPage: false });
await b.close();
