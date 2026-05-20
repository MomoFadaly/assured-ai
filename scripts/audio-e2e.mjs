// End-to-end audio test:
//   1. Land on page
//   2. Click the Sound off pill (user gesture creates AudioContext)
//   3. Verify the pill turned to Sound on
//   4. Verify AudioContext exists and is running
//   5. Dispatch a fake tick event
//   6. Verify the context received a render (any audio activity)
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(3500);

// Install a probe that captures the AudioContext on creation
await p.evaluate(() => {
  const OriginalCtx = window.AudioContext;
  window.__audioCtxLog = [];
  window.AudioContext = function (...args) {
    const ctx = new OriginalCtx(...args);
    window.__lastAudioCtx = ctx;
    window.__audioCtxLog.push({ event: 'created', state: ctx.state, time: Date.now() });
    ctx.addEventListener('statechange', () => {
      window.__audioCtxLog.push({ event: 'statechange', state: ctx.state, time: Date.now() });
    });
    return ctx;
  };
  Object.setPrototypeOf(window.AudioContext, OriginalCtx);
  Object.assign(window.AudioContext, OriginalCtx);
});

// Step 1: Click the pill
const pillRect = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
console.log('Pill rect center:', JSON.stringify(pillRect));
if (!pillRect) {
  console.log('ERROR: Pill not found');
  await b.close();
  process.exit(1);
}
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(500);

// Step 2: Verify pill state changed
const pillText = await p.evaluate(() => {
  return (document.querySelector('button[aria-label*="cinema sound"]')?.textContent || '').trim();
});
console.log('Pill text after click:', pillText);

// Step 3: AudioContext state
const ctxLog = await p.evaluate(() => window.__audioCtxLog || []);
const ctxState = await p.evaluate(() => window.__lastAudioCtx?.state || 'none');
console.log('AudioContext log:', JSON.stringify(ctxLog, null, 2));
console.log('AudioContext final state:', ctxState);

// Step 4: Dispatch a tick and see if any oscillator activity happens
await p.evaluate(() => {
  // Hook into createOscillator and createBufferSource to count audio nodes
  const ctx = window.__lastAudioCtx;
  if (!ctx) return { ok: false, reason: 'no ctx' };
  const origOsc = ctx.createOscillator.bind(ctx);
  const origBuf = ctx.createBufferSource.bind(ctx);
  window.__oscCount = 0;
  window.__bufCount = 0;
  ctx.createOscillator = function() { window.__oscCount++; return origOsc(); };
  ctx.createBufferSource = function() { window.__bufCount++; return origBuf(); };
  // Now dispatch the tick
  window.dispatchEvent(new CustomEvent('cinema:type-tick'));
  return { ok: true };
});
await p.waitForTimeout(200);
const counts = await p.evaluate(() => ({ osc: window.__oscCount || 0, buf: window.__bufCount || 0 }));
console.log('After tick dispatch — oscillators created:', counts.osc, 'buffers:', counts.buf);
console.log('Expected: 2 oscillators (click + body) + 1 buffer (snap)');

await b.close();
