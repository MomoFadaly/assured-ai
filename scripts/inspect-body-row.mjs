import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await context.newPage();
await page.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('section.cinema-stage');
await page.waitForTimeout(1200);

const geom = await page.evaluate(() => {
  const sec = document.querySelector('section.cinema-stage');
  return { sTop: sec.getBoundingClientRect().top + window.scrollY, range: sec.offsetHeight - window.innerHeight };
});

const BEATS = [0.770, 0.820];

for (const p of BEATS) {
  const y = geom.sTop + geom.range * p;
  await page.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await page.waitForTimeout(400);
  const data = await page.evaluate(() => {
    const titleSpan = Array.from(document.querySelectorAll('span')).find(s => s.textContent === 'Pain Relief Education Post');
    let editor = titleSpan.parentElement;
    while (editor && !editor.style.borderRadius) editor = editor.parentElement;
    if (!editor) return {};
    // Find body row (the flex child)
    const bodyRow = Array.from(editor.children).find(c => c.className && c.className.toString().includes('flex'));
    if (!bodyRow) return { error: 'no body row' };
    const bodyRowChildren = Array.from(bodyRow.children).map((c, i) => {
      const r = c.getBoundingClientRect();
      return {
        idx: i,
        cls: (c.className || '').toString().substring(0, 80),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    });
    // Also measure the sidebar's actual content height
    const sidebarOuter = bodyRow.children[1]; // second child is sidebar
    let sidebarInfo = null;
    if (sidebarOuter) {
      const inner = sidebarOuter.children[0]; // the inner div with relative
      if (inner) {
        const innerR = inner.getBoundingClientRect();
        const draftMeta = inner.children[0]; // DraftMeta motion.div
        const dmR = draftMeta?.getBoundingClientRect();
        sidebarInfo = {
          outer: { w: Math.round(sidebarOuter.getBoundingClientRect().width), h: Math.round(sidebarOuter.getBoundingClientRect().height) },
          inner: { w: Math.round(innerR.width), h: Math.round(innerR.height) },
          draftMeta: dmR ? { h: Math.round(dmR.height) } : null,
        };
      }
    }
    return {
      bodyRow: { h: Math.round(bodyRow.getBoundingClientRect().height) },
      bodyRowChildren,
      sidebarInfo,
    };
  });
  console.log(`raw ${p.toFixed(3)}  bodyRow h=${data.bodyRow?.h}  sidebar=${JSON.stringify(data.sidebarInfo)}`);
  for (const c of data.bodyRowChildren || []) {
    console.log(`  [${c.idx}] w=${c.w} h=${c.h} cls=${c.cls}`);
  }
}

await browser.close();
