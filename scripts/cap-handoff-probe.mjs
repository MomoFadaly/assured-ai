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

// Probe each beat: where is the FIRST visible character / cursor centered vertically?
const probes = [
  { p: 0.190, label: 'post-erase' },
  { p: 0.200, label: 'pe-late' },
  { p: 0.207, label: 'retype-O' },
  { p: 0.215, label: 'retype-One-bad' },
  { p: 0.225, label: 'retype-most' },
  { p: 0.231, label: 'retype-period' },
  { p: 0.234, label: 'final-just' },
  { p: 0.240, label: 'shrink-mid' },
  { p: 0.252, label: 'rising' },
  { p: 0.260, label: 'pinned' },
];
for (const probe of probes) {
  const y = g.sTop + g.range * probe.p;
  await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await p.waitForTimeout(450);
  const info = await p.evaluate(() => {
    const stage = document.querySelector('section.cinema-stage');
    if (!stage) return null;
    // Find the cold open container z-[20]
    const coldOpen = stage.querySelector('div.z-\\[20\\]');
    if (!coldOpen) return null;
    // Find any cursor (off-white span with boxShadow glow)
    const cursors = [];
    for (const el of coldOpen.querySelectorAll('span')) {
      const cs = getComputedStyle(el);
      if (cs.backgroundColor !== 'rgb(244, 244, 246)') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.width > 20) continue;
      cursors.push({ x: Math.round(r.x), yTop: Math.round(r.y), yCenter: Math.round(r.y + r.height / 2), h: Math.round(r.height), w: Math.round(r.width) });
    }
    // Find the h2 element + the text-center wrapper
    const wrapper = coldOpen.querySelector('div.text-center');
    const wrapperRect = wrapper?.getBoundingClientRect();
    const h2 = wrapper?.querySelector('h2');
    const h2Rect = h2?.getBoundingClientRect();
    // First visible char in h2 (any cold-open-char)
    const firstChar = h2?.querySelector('.cold-open-char');
    const firstCharRect = firstChar?.getBoundingClientRect();
    return {
      cursors,
      wrapperRect: wrapperRect ? { x: Math.round(wrapperRect.x), y: Math.round(wrapperRect.y), w: Math.round(wrapperRect.width), h: Math.round(wrapperRect.height) } : null,
      h2Rect: h2Rect ? { x: Math.round(h2Rect.x), y: Math.round(h2Rect.y), w: Math.round(h2Rect.width), h: Math.round(h2Rect.height) } : null,
      firstChar: firstCharRect ? { text: firstChar.textContent, y: Math.round(firstCharRect.y), h: Math.round(firstCharRect.height), yCenter: Math.round(firstCharRect.y + firstCharRect.height / 2) } : null,
      viewportCenter: 450,
    };
  });
  console.log(`\n[${probe.label}  p=${probe.p}]`);
  console.log(JSON.stringify(info, null, 2));
}
await b.close();
