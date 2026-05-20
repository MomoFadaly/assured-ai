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

const BEATS = [0.300, 0.770, 0.820];

for (const p of BEATS) {
  const y = geom.sTop + geom.range * p;
  await page.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await page.waitForTimeout(400);
  const data = await page.evaluate(() => {
    // Find the editor's outer container — the motion.div with the box-shadow / paper background
    // It's the div containing the title bar
    const titleSpan = Array.from(document.querySelectorAll('span')).find(s => s.textContent === 'Pain Relief Education Post');
    if (!titleSpan) return { error: 'no title' };
    // Walk up to find the editor frame container
    let editor = titleSpan.parentElement;
    while (editor && !editor.style.borderRadius) editor = editor.parentElement;
    if (!editor) return { error: 'no editor frame' };
    const er = editor.getBoundingClientRect();
    // Find the pipeline footer (it has 'Scanning claim' or 'Claim extracted' text in 'safe' mode)
    const pipelineText = Array.from(document.querySelectorAll('*')).find(el =>
      el.children.length === 0 && el.textContent === 'Claim extracted'
    );
    let pipelineRect = null;
    if (pipelineText) {
      let pl = pipelineText.parentElement;
      while (pl && pl.tagName !== 'DIV') pl = pl.parentElement;
      while (pl) {
        if (pl.className && pl.className.includes && pl.className.includes('border-t')) break;
        pl = pl.parentElement;
      }
      if (pl) {
        const pr = pl.getBoundingClientRect();
        pipelineRect = { top: Math.round(pr.top), height: Math.round(pr.height) };
      }
    }
    return {
      editor: { top: Math.round(er.top), height: Math.round(er.height) },
      pipelineRect,
    };
  });
  console.log(`raw ${p.toFixed(3)}  editor h=${data.editor?.height} top=${data.editor?.top}  pipeline=${JSON.stringify(data.pipelineRect)}`);
}

await browser.close();
