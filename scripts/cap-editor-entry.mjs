import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/editor-entry', { recursive: true });
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
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

// When does the editor become visible? Walk the window between post-erase
// and "headline complete + hold" to find the transition point.
const beats = [
  { p: 0.190, label: '01-post-erase' },
  { p: 0.210, label: '02-early-retype' },
  { p: 0.225, label: '03-mid-retype' },
  { p: 0.235, label: '04-headline-complete' },
  { p: 0.245, label: '05-mid-hold' },
  { p: 0.255, label: '06-exit-begin' },
];
for (const beat of beats) {
  const y = g.sTop + g.range * beat.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(500);
  // Find the editor's Pain Relief Education Post element — its opacity tells us visibility
  const info = await p.evaluate(() => {
    // Find any element with text "Pain Relief Education Post"
    const all = document.querySelectorAll('*');
    let titleEl = null;
    for (const el of all) {
      const t = el.textContent || '';
      if (t.trim() === 'Pain Relief Education Post') { titleEl = el; break; }
    }
    if (!titleEl) return { found: false };
    // Walk up to find the containing PostStage / editor frame and capture its opacity
    let ancestor = titleEl;
    const chain = [];
    for (let i = 0; i < 12 && ancestor; i++) {
      const cs = getComputedStyle(ancestor);
      chain.push({
        tag: ancestor.tagName?.toLowerCase(),
        cls: (typeof ancestor.className === 'string' ? ancestor.className : '').slice(0, 80),
        opacity: cs.opacity,
        transform: cs.transform?.slice(0, 60),
      });
      ancestor = ancestor.parentElement;
    }
    return { found: true, chain };
  });
  await p.screenshot({ path: `/tmp/editor-entry/${beat.label}.jpg`, type: 'jpeg', quality: 85 });
  console.log(`\n[${beat.label}  p=${beat.p}]`);
  console.log(JSON.stringify(info, null, 2));
}
await b.close();
