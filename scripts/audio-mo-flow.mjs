// Replicate Mo's exact flow:
//   1. Open page (sound on by default, context suspended)
//   2. Scroll without clicking anywhere
//   3. Click pill ONCE (should unlock without flipping to off)
//   4. Verify pill still says "Sound on" AND context is running
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

console.log('STEP 1 — after page load');
console.log('  ctx state:', await p.evaluate(() => window.__lastCtx?.state));
console.log('  pill text:', await p.evaluate(() => document.querySelector('button[aria-label*="cinema sound"]')?.textContent.trim()));

// Step 2: scroll into the typing zone WITHOUT clicking
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});
console.log('\nSTEP 2 — scrolling without clicking');
for (let i = 0; i <= 8; i++) {
  // Use wheel to simulate trackpad scroll (does not qualify as user activation)
  await p.mouse.wheel(0, 100);
  await p.waitForTimeout(80);
}
console.log('  ctx state:', await p.evaluate(() => window.__lastCtx?.state));
console.log('  pill text:', await p.evaluate(() => document.querySelector('button[aria-label*="cinema sound"]')?.textContent.trim()));

// Step 3: click pill ONCE
console.log('\nSTEP 3 — click pill ONCE (expecting unlock without toggle-off)');
const pillRect = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label*="cinema sound"]');
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(800);
console.log('  ctx state:', await p.evaluate(() => window.__lastCtx?.state));
console.log('  pill text:', await p.evaluate(() => document.querySelector('button[aria-label*="cinema sound"]')?.textContent.trim()));
console.log('  pill aria:', await p.evaluate(() => document.querySelector('button[aria-label*="cinema sound"]')?.getAttribute('aria-label')));

// Step 4: dispatch a tick and verify it synths audio
console.log('\nSTEP 4 — dispatch tick, count oscillators');
const synth = await p.evaluate(() => {
  const ctx = window.__lastCtx;
  if (!ctx || ctx.state !== 'running') return { ok: false, state: ctx?.state };
  const orig = ctx.createOscillator.bind(ctx);
  const origBuf = ctx.createBufferSource.bind(ctx);
  let osc = 0, buf = 0;
  ctx.createOscillator = function () { osc++; return orig(); };
  ctx.createBufferSource = function () { buf++; return origBuf(); };
  window.dispatchEvent(new CustomEvent('cinema:type-tick'));
  return new Promise(r => setTimeout(() => r({ ok: true, osc, buf, state: ctx.state }), 200));
});
console.log('  synth:', JSON.stringify(synth));

// Step 5: click pill AGAIN — this SHOULD toggle off
console.log('\nSTEP 5 — click pill again (expecting toggle to off)');
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(500);
console.log('  pill text:', await p.evaluate(() => document.querySelector('button[aria-label*="cinema sound"]')?.textContent.trim()));

// Step 6: click pill once more — toggle back on
console.log('\nSTEP 6 — click pill again (toggle back to on)');
await p.mouse.click(pillRect.x, pillRect.y);
await p.waitForTimeout(500);
console.log('  pill text:', await p.evaluate(() => document.querySelector('button[aria-label*="cinema sound"]')?.textContent.trim()));

await b.close();
