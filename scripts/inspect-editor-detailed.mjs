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
    // Get direct children heights
    const children = Array.from(editor.children).map((c, i) => {
      const r = c.getBoundingClientRect();
      const cs = window.getComputedStyle(c);
      return {
        idx: i,
        tag: c.tagName,
        cls: (c.className || '').toString().substring(0, 60),
        h: Math.round(r.height),
        op: cs.opacity,
      };
    });
    const editorRect = editor.getBoundingClientRect();
    return { editorHeight: Math.round(editorRect.height), children };
  });
  console.log(`raw ${p.toFixed(3)}  editor h=${data.editorHeight}`);
  for (const c of data.children) {
    console.log(`  [${c.idx}] ${c.tag} cls=${c.cls} h=${c.h} op=${c.op}`);
  }
}

await browser.close();
