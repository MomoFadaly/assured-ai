// Real-user flow: open page, mousemove around like a human, scroll into typing
// without ever clicking the pill. Verify audio context becomes running.
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(2500);

// Probe the audio context state at various points in the flow
const probe = async (label) => {
  const state = await p.evaluate(() => {
    // No direct way to access the ref — but check if any oscillators
    // were created via our previous hooks. Better: enumerate the page's
    // audio contexts via a side-channel.
    return {
      // We can't easily get the ref, so just report what we know
      hasAudioContext: typeof window.AudioContext !== 'undefined',
    };
  });
  console.log(`[${label}]`, JSON.stringify(state));
};

await probe('after-load');

// Simulate human: move mouse around
await p.mouse.move(720, 450);
await p.waitForTimeout(150);
await p.mouse.move(800, 500);
await p.waitForTimeout(150);
await probe('after-mousemove');

// Click to simulate the unlock — pill click
const pillRect = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: b.textContent.trim() };
});
console.log('Pill before any click:', JSON.stringify(pillRect));

// Don't click the pill — click somewhere ELSE first (page body)
await p.mouse.click(720, 100); // top center
await p.waitForTimeout(500);
await probe('after-body-click');

// Now scroll into the cold-open typing window
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});
for (let i = 0; i <= 10; i++) {
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), g.sTop + g.range * (i / 100));
  await p.waitForTimeout(100);
}
await probe('mid-typing-scroll');

// Now use script eval to inspect the context state via a hack: count audio nodes
const ctxState = await p.evaluate(() => {
  // Find all audio contexts by intercepting the constructor
  // Look at navigator timing
  // Best bet: read off the React fiber tree (too hacky)
  // Simpler: tap into the global window for any audio nodes
  // Actually we can intercept AudioContext from a fresh page if we did it earlier
  // For now, dispatch a tick and see if oscillators get created (which only happens if context is running)
  let oscCreated = 0;
  // Find any existing AudioContext in window
  const findCtx = () => {
    // Hack: trigger React DevTools API
    return null;
  };
  return { oscCreated };
});
console.log('Tick test:', JSON.stringify(ctxState));

await b.close();
