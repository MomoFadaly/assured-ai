import { chromium } from 'playwright';
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

// Scrub to p=0.190 (post-erase middle)
const y = g.sTop + g.range * 0.190;
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
await p.waitForTimeout(800);

// Find all cursor-like spans (narrow background-color rects)
const dump = await p.evaluate(() => {
  const stage = document.querySelector('section.cinema-stage');
  if (!stage) return { error: 'no stage' };
  const cursors = [];
  for (const el of stage.querySelectorAll('span')) {
    const cs = getComputedStyle(el);
    if (cs.backgroundColor === 'rgba(0, 0, 0, 0)') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.width > 20) continue;
    cursors.push({
      className: typeof el.className === 'string' ? el.className.slice(0, 80) : 'motion-span',
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      opacity: cs.opacity,
      bg: cs.backgroundColor,
      boxShadow: cs.boxShadow?.slice(0, 60),
      parentClass: (el.parentElement?.className || '').slice(0, 80),
    });
  }
  // Also check what's inside the z-[20] cold-open container
  const coldOpen = stage.querySelector('div.z-\\[20\\]');
  const coldOpenChildren = coldOpen ? Array.from(coldOpen.children).map(c => {
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    return {
      tag: c.tagName.toLowerCase(),
      className: typeof c.className === 'string' ? c.className.slice(0, 80) : '',
      hasContent: c.children.length > 0 || (c.textContent || '').trim().length > 0,
      childCount: c.children.length,
      text: (c.textContent || '').slice(0, 60),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      opacity: cs.opacity,
      innerHTMLPrefix: c.innerHTML?.slice(0, 200),
    };
  }) : [];
  return { cursors, coldOpenChildren, scrollY: window.scrollY };
});

console.log(JSON.stringify(dump, null, 2));
await b.close();
