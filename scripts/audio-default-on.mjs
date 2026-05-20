import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(3500);

// Check pill state on first load — should already say "Sound on"
const initialState = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  if (!b) return null;
  return {
    aria: b.getAttribute('aria-label'),
    pressed: b.getAttribute('aria-pressed'),
    text: (b.textContent || '').trim(),
    visible: window.getComputedStyle(b).opacity !== '0',
  };
});
console.log('Initial pill state:', JSON.stringify(initialState, null, 2));

// Now simulate a user click somewhere (NOT on the pill) to trigger the pre-arm
await p.mouse.click(720, 100); // click on the AssuredAI logo area
await p.waitForTimeout(500);

// Check if AudioContext was armed
const ctxState = await p.evaluate(() => {
  // Try to find the context via the ref — we can't easily, but we can
  // check if any context exists in the page's audio system
  return {
    audioContextExists: typeof window.AudioContext !== 'undefined',
    // Check via a stored reference if we set one
  };
});
console.log('Audio context after first click:', JSON.stringify(ctxState));

// Now dispatch a tick event (which would happen during typing in real usage)
await p.evaluate(() => {
  window.dispatchEvent(new CustomEvent('cinema:type-tick'));
});
await p.waitForTimeout(500);

// Now click the pill to verify mute works
const pillRect = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(500);

const afterMute = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  return {
    aria: b.getAttribute('aria-label'),
    pressed: b.getAttribute('aria-pressed'),
    text: (b.textContent || '').trim(),
    storage: sessionStorage.getItem('cinema-sound'),
  };
});
console.log('After mute click:', JSON.stringify(afterMute, null, 2));

await b.close();
