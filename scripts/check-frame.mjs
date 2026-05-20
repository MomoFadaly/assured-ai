import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForSelector('section.cinema-stage', { timeout: 10_000 });
await page.waitForTimeout(1200);

const geom = await page.evaluate(() => {
  const sec = document.querySelector('section.cinema-stage');
  return {
    sTop: sec.getBoundingClientRect().top + window.scrollY,
    sHeight: sec.offsetHeight,
    vh: window.innerHeight,
  };
});
const range = geom.sHeight - geom.vh;
const targetY = geom.sTop + range * 0.96;
await page.evaluate((y) => window.__lenis?.scrollTo(y, { immediate: true, force: true }), targetY);
await page.waitForTimeout(700);

const out = await page.evaluate(() => {
  const frame = document.querySelector('.cinema-stage [class*="z-10"][class*="w-["]');
  if (!frame) return { err: 'no frame' };
  const r = frame.getBoundingClientRect();
  // Find the published overlay
  const overlay = document.querySelector('.cinema-stage [class*="z-10"][class*="flex-col"]');
  const oR = overlay ? overlay.getBoundingClientRect() : null;
  // Find the body container (with minHeight)
  const bodies = document.querySelectorAll('.cinema-stage .relative');
  let body = null;
  for (const b of bodies) {
    if (b.style?.minHeight === '740px') { body = b; break; }
  }
  const bR = body ? body.getBoundingClientRect() : null;
  return {
    frame: { top: r.top, height: r.height, bottom: r.bottom },
    overlay: oR ? { top: oR.top, height: oR.height, bottom: oR.bottom } : null,
    body: bR ? { top: bR.top, height: bR.height, bottom: bR.bottom } : null,
    bodyMinHeight: body?.style?.minHeight,
  };
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
