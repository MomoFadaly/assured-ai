// End-to-end verification:
//   1. Page load → intro overlay shown, scroll locked
//   2. Loader runs 1.6s → Begin button reveals
//   3. Click Begin → AudioContext unlocks, overlay fades out
//   4. Tick event fires full 3-layer synth
//   5. Refresh test: scroll mid-page, refresh, should land at scroll 0
import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.addInitScript(() => {
  const O = window.AudioContext;
  window.AudioContext = function(...a) {
    const ctx = new O(...a);
    window.__capturedCtx = ctx;
    return ctx;
  };
  Object.setPrototypeOf(window.AudioContext, O);
  Object.assign(window.AudioContext, O);
});

console.log('=== TEST 1: Intro overlay shown on load ===');
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
let state = await p.evaluate(() => ({
  bodyOverflow: document.body.style.overflow,
  bodyScrollY: window.scrollY,
  overlayPresent: !!document.querySelector('button[aria-label="Begin the experience"]') || document.body.innerText.includes('BEGIN') || document.body.innerText.includes('AssuredAI'),
  ctxState: window.__capturedCtx?.state ?? 'none',
}));
console.log('  body.overflow =', JSON.stringify(state.bodyOverflow));
console.log('  scrollY =', state.bodyScrollY);
console.log('  audio context =', state.ctxState);

console.log('\n=== TEST 2: Begin button reveals after 1.6s loader ===');
await p.waitForTimeout(1800);
const beginBtn = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label="Begin the experience"]');
  return b ? { exists: true, text: b.textContent.trim(), rect: b.getBoundingClientRect() } : { exists: false };
});
console.log('  Begin button:', JSON.stringify(beginBtn));

console.log('\n=== TEST 3: Click Begin → audio unlocks ===');
if (beginBtn.exists) {
  await p.mouse.click(beginBtn.rect.x + beginBtn.rect.width / 2, beginBtn.rect.y + beginBtn.rect.height / 2);
  await p.waitForTimeout(900); // wait for fade out (600ms) + buffer
  state = await p.evaluate(() => ({
    bodyOverflow: document.body.style.overflow,
    overlayGone: !document.querySelector('button[aria-label="Begin the experience"]'),
    ctxState: window.__capturedCtx?.state ?? 'none',
    sharedCtxOnWindow: !!window.__cinemaAudioCtx,
  }));
  console.log('  body.overflow restored =', JSON.stringify(state.bodyOverflow));
  console.log('  overlay unmounted =', state.overlayGone);
  console.log('  audio context state =', state.ctxState);
  console.log('  shared on window.__cinemaAudioCtx =', state.sharedCtxOnWindow);
}

console.log('\n=== TEST 4: Tick event fires full synth ===');
const synth = await p.evaluate(() => {
  const ctx = window.__cinemaAudioCtx;
  if (!ctx || ctx.state !== 'running') return { ok: false, state: ctx?.state };
  const orig = ctx.createOscillator.bind(ctx);
  const origBuf = ctx.createBufferSource.bind(ctx);
  let osc = 0, buf = 0;
  ctx.createOscillator = function() { osc++; return orig(); };
  ctx.createBufferSource = function() { buf++; return origBuf(); };
  window.dispatchEvent(new CustomEvent('cinema:type-tick'));
  return new Promise(r => setTimeout(() => r({ ok: true, osc, buf, state: ctx.state }), 200));
});
console.log('  tick result:', JSON.stringify(synth));
console.log('  expected: osc=2 buf=1 state=running');

console.log('\n=== TEST 5: Refresh from mid-page → resets to top ===');
// Scroll way down
await p.evaluate(() => window.__lenis?.scrollTo(5000, { immediate: true }) ?? window.scrollTo(0, 5000));
await p.waitForTimeout(300);
const beforeRefresh = await p.evaluate(() => window.scrollY);
console.log('  scrollY before refresh:', beforeRefresh);
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(800);
const afterRefresh = await p.evaluate(() => window.scrollY);
console.log('  scrollY after refresh:', afterRefresh);
console.log('  expected: 0 (intro should reset)');

await b.close();
