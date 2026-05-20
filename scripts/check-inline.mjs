import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('section.cinema-stage');
await page.waitForTimeout(1200);
const geom = await page.evaluate(() => {
  const sec = document.querySelector('section.cinema-stage');
  return { sTop: sec.getBoundingClientRect().top + window.scrollY, range: sec.offsetHeight - window.innerHeight };
});
const y = geom.sTop + geom.range * 0.300;
await page.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true, force: true }) ?? window.scrollTo(0, y), y);
await page.waitForTimeout(500);
const data = await page.evaluate(() => {
  // Find the title bar by walking up from the title span
  const titleSpan = Array.from(document.querySelectorAll('span')).find(s => s.textContent === 'Pain Relief Education Post');
  if (!titleSpan) return { error: 'no title' };
  const titleBar = titleSpan.closest('.border-b');
  if (!titleBar) return { error: 'no title bar' };
  // Get all children of the title bar
  const rightGroup = titleBar.children[titleBar.children.length - 1];
  return {
    titleBarHTML: titleBar.outerHTML.substring(0, 800),
    rightGroupChildCount: rightGroup.children.length,
    rightGroupHTML: rightGroup.outerHTML.substring(0, 600),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
