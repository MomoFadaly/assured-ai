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

const BEATS = [0.250, 0.300, 0.350, 0.500, 0.730, 0.770, 0.790, 0.820, 0.850];

for (const p of BEATS) {
  const y = geom.sTop + geom.range * p;
  await page.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
  await page.waitForTimeout(400);
  const data = await page.evaluate(() => {
    // Find PostStage's title bar — it's the FIRST div inside the editor chrome containing "Pain Relief Education Post" text
    const title = Array.from(document.querySelectorAll('span')).find((s) => s.textContent === 'Pain Relief Education Post');
    const button = document.querySelectorAll('div.absolute.left-1\\/2.top-1\\/2.z-\\[34\\]');
    if (!title) return { error: 'no title' };
    const titleRect = title.getBoundingClientRect();
    const titleBarParent = title.closest('.border-b');
    const titleBarRect = titleBarParent ? titleBarParent.getBoundingClientRect() : titleRect;
    const titleBarCenterY = titleBarRect.top + titleBarRect.height/2;

    // Find both buttons
    const buttons = Array.from(button).map(b => {
      const r = b.getBoundingClientRect();
      const cs = window.getComputedStyle(b);
      return {
        cx: Math.round(r.left + r.width/2),
        cy: Math.round(r.top + r.height/2),
        op: cs.opacity,
        transform: cs.transform.substring(0, 80),
      };
    });

    return {
      titleBarY: Math.round(titleBarCenterY),
      titleBarTop: Math.round(titleBarRect.top),
      titleBarBottom: Math.round(titleBarRect.top + titleBarRect.height),
      buttons,
    };
  });
  if (data.error) {
    console.log(`raw ${p.toFixed(3)}  ${data.error}`);
  } else {
    const visible = data.buttons.filter(b => parseFloat(b.op) > 0.05);
    console.log(`raw ${p.toFixed(3)}  titleBar y=${data.titleBarY} (top=${data.titleBarTop} bot=${data.titleBarBottom})`);
    for (const b of visible) {
      console.log(`              btn cx=${b.cx} cy=${b.cy} op=${b.op}  Δy-from-titleBar=${b.cy - data.titleBarY}`);
    }
  }
}

await browser.close();
