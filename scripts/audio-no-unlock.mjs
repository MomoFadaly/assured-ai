// Replicate Mo's specific case: NO event unlocks before pill click.
// We simulate by NOT scrolling, NOT moving mouse, just opening page
// and clicking the pill directly.
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.addInitScript(() => {
  const O = window.AudioContext;
  window.AudioContext = function (...a) {
    const ctx = new O(...a);
    window.__lastCtx = ctx;
    return ctx;
  };
  Object.setPrototypeOf(window.AudioContext, O);
  Object.assign(window.AudioContext, O);
});
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);

console.log('Initial state:');
console.log('  ctx state:', await p.evaluate(() => window.__lastCtx?.state));
console.log('  pill text:', await p.evaluate(() => document.querySelector('button[aria-label*="cinema sound"]')?.textContent.trim()));

// Click pill directly (no scrolling, no mousemove)
const pillRect = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});

// Direct click (this generates pointerdown + mousedown + mouseup + click — all qualifying events)
// But the test is: will the pill's text stay "Sound on"?
console.log('\nClicking pill ONCE (sound was suspended)...');
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(700);
console.log('  ctx state:', await p.evaluate(() => window.__lastCtx?.state));
console.log('  pill text:', await p.evaluate(() => document.querySelector('button[aria-label*="cinema sound"]')?.textContent.trim()));
console.log('  expected: "Sound on" — first click should unlock without toggling off');

// Dispatch tick
const synth = await p.evaluate(() => {
  const ctx = window.__lastCtx;
  if (!ctx || ctx.state !== 'running') return { ok: false };
  const orig = ctx.createOscillator.bind(ctx);
  const origBuf = ctx.createBufferSource.bind(ctx);
  let o = 0, b = 0;
  ctx.createOscillator = function() { o++; return orig(); };
  ctx.createBufferSource = function() { b++; return origBuf(); };
  window.dispatchEvent(new CustomEvent('cinema:type-tick'));
  return new Promise(r => setTimeout(() => r({ ok: true, osc: o, buf: b }), 200));
});
console.log('\nAfter tick dispatch:');
console.log('  synth:', JSON.stringify(synth));
console.log('  expected: osc=2 buf=1 (3-layer keystroke fired)');

await b.close();
