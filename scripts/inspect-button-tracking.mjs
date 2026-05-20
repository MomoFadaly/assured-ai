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

const BEATS = [0.300, 0.350, 0.400, 0.500, 0.720, 0.735, 0.745, 0.755, 0.765, 0.780, 0.790, 0.800, 0.808, 0.815];

for (const p of BEATS) {
  const y = geom.sTop + geom.range * p;
  await page.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await page.waitForTimeout(400);
  const data = await page.evaluate(() => {
    const button = document.querySelector('div.absolute.left-1\\/2.top-1\\/2.z-\\[34\\]');
    const editor = document.querySelector('[data-cinema-body="draft"]');
    if (!button || !editor) return { error: 'missing element', button: !!button, editor: !!editor };
    const br = button.getBoundingClientRect();
    const er = editor.getBoundingClientRect();
    const cs = window.getComputedStyle(button);
    return {
      button: {
        left: Math.round(br.left), right: Math.round(br.right), top: Math.round(br.top),
        width: Math.round(br.width), height: Math.round(br.height),
        opacity: cs.opacity, transform: cs.transform.substring(0, 60),
      },
      editor: {
        left: Math.round(er.left), right: Math.round(er.right), top: Math.round(er.top),
        width: Math.round(er.width), height: Math.round(er.height),
      },
      titleBarTopOffsetFromEditorTop: 25, // approx
    };
  });
  if (data.error) {
    console.log(`raw ${p.toFixed(3)}  ${data.error}  button=${data.button}  editor=${data.editor}`);
  } else {
    const titleBarRightInViewport = data.editor.right;
    const titleBarCenterY = data.editor.top + 25;
    const buttonCenterX = (data.button.left + data.button.right) / 2;
    const buttonCenterY = (data.button.top + data.button.height/2);
    const dx = buttonCenterX - titleBarRightInViewport;
    const dy = buttonCenterY - titleBarCenterY;
    console.log(`raw ${p.toFixed(3)}  editor[${data.editor.left}..${data.editor.right}, w=${data.editor.width}]  button cx=${Math.round(buttonCenterX)} cy=${Math.round(buttonCenterY)}  Δ-from-titlebar-right=(${Math.round(dx)},${Math.round(dy)})  op=${data.button.opacity}`);
  }
}

await browser.close();
