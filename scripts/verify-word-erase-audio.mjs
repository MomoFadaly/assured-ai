import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.addInitScript(() => {
  const O = window.AudioContext;
  window.AudioContext = function(...a) {
    const ctx = new O(...a);
    window.__lastCtx = ctx;
    return ctx;
  };
  Object.setPrototypeOf(window.AudioContext, O);
  Object.assign(window.AudioContext, O);
  // Count word-erase events
  window.__wordEraseCount = 0;
  window.addEventListener('cinema:word-erase', () => window.__wordEraseCount++);
});
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);

// Click Begin to unlock audio
const btn = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label="Begin the experience"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await p.mouse.click(btn.x, btn.y);
await p.waitForTimeout(900);

// Hook into AudioContext to count synth nodes per word-erase
await p.evaluate(() => {
  const ctx = window.__lastCtx;
  if (!ctx) return;
  const origOsc = ctx.createOscillator.bind(ctx);
  const origBuf = ctx.createBufferSource.bind(ctx);
  window.__synthOsc = 0;
  window.__synthBuf = 0;
  ctx.createOscillator = function() { window.__synthOsc++; return origOsc(); };
  ctx.createBufferSource = function() { window.__synthBuf++; return origBuf(); };
});

// Smooth-scroll through the erase window (0.148 → 0.165)
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});
for (let i = 0; i <= 30; i++) {
  const progress = 0.148 + (i / 30) * 0.020;
  const y = g.sTop + g.range * progress;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(110);
}
await p.waitForTimeout(500);

const result = await p.evaluate(() => ({
  wordEraseEvents: window.__wordEraseCount,
  oscillators: window.__synthOsc,
  bufferSources: window.__synthBuf,
  ctxState: window.__lastCtx?.state,
}));
console.log(JSON.stringify(result, null, 2));
console.log('\nExpected: ~11 word-erase events (one per word)');
console.log('Expected: ~22 oscillators (2 per event: click + thock)');
console.log('Expected: ~11 buffer sources (1 per event: noise sweep)');

await b.close();
