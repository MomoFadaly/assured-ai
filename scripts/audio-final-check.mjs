// Intercept AudioContext creation to track state changes through a
// real user flow.
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
// Install interception BEFORE the page loads
await p.addInitScript(() => {
  const Original = window.AudioContext;
  window.__audioLog = [];
  window.AudioContext = function (...args) {
    const ctx = new Original(...args);
    window.__lastCtx = ctx;
    window.__audioLog.push({ event: 'create', state: ctx.state, t: Date.now() });
    ctx.addEventListener('statechange', () => {
      window.__audioLog.push({ event: 'statechange', state: ctx.state, t: Date.now() });
    });
    return ctx;
  };
  Object.setPrototypeOf(window.AudioContext, Original);
  Object.assign(window.AudioContext, Original);
});

await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForTimeout(3000);

console.log('--- after page load ---');
console.log(await p.evaluate(() => JSON.stringify(window.__audioLog)));
console.log('Context state:', await p.evaluate(() => window.__lastCtx?.state));

// Simulate the actual flow: click somewhere on the body (not the pill)
console.log('\n--- clicking body at (720, 200) ---');
await p.mouse.click(720, 200);
await p.waitForTimeout(800);
console.log('Log:', await p.evaluate(() => JSON.stringify(window.__audioLog)));
console.log('Context state:', await p.evaluate(() => window.__lastCtx?.state));

// Now dispatch a tick — should fire if context is running
console.log('\n--- dispatching tick ---');
const result = await p.evaluate(() => {
  const ctx = window.__lastCtx;
  if (!ctx || ctx.state !== 'running') return { ok: false, reason: `state=${ctx?.state}` };
  // Intercept oscillators
  const orig = ctx.createOscillator.bind(ctx);
  const origBuf = ctx.createBufferSource.bind(ctx);
  let osc = 0, buf = 0;
  ctx.createOscillator = function () { osc++; return orig(); };
  ctx.createBufferSource = function () { buf++; return origBuf(); };
  window.dispatchEvent(new CustomEvent('cinema:type-tick'));
  return new Promise(r => setTimeout(() => r({ ok: true, osc, buf }), 100));
});
console.log('Result:', JSON.stringify(result));

await b.close();
