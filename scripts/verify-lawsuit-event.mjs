import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);

await p.evaluate(() => {
  window.__lawsuitFires = 0;
  window.addEventListener('cinema:lawsuit-impact', () => {
    window.__lawsuitFires++;
    console.log('[event] cinema:lawsuit-impact fired @ raw', window.scrollY);
  });
});

const btn = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label="Begin the experience"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (btn) { await p.mouse.click(btn.x, btn.y); await p.waitForTimeout(900); }
await p.waitForSelector('section.cinema-stage');
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});

// Forward sweep
for (let pct = 0.50; pct <= 0.62; pct += 0.005) {
  const y = g.sTop + g.range * pct;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(80);
}

await p.waitForTimeout(500);
const fires = await p.evaluate(() => window.__lawsuitFires);
const hadClass = await p.evaluate(() => {
  // Check if class was ever added — we'll know if MutationObserver caught it
  return document.body.classList.contains('cinema-lawsuit-callback') ||
    document.body.hasAttribute('data-test-lawsuit-fired');
});

console.log('Event fired count:', fires);
console.log('Body class present (now):', hadClass);

// Now check that the bad-word DOM has the right selector for our CSS rule
const badInfo = await p.evaluate(() => {
  const el = document.querySelector('.cold-open-bad-word-settled');
  return el ? {
    found: true,
    classes: el.className,
    parentScene: el.closest('[class*="scene"], section, [class*="stage"]')?.tagName,
  } : { found: false };
});
console.log('Bad-word element:', JSON.stringify(badInfo));

await b.close();
