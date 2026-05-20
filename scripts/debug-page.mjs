import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text().slice(0, 300)); });
await p.goto('http://localhost:3031', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForTimeout(3000);
const state = await p.evaluate(() => {
  const css = Array.from(document.styleSheets).map(s => ({ href: s.href, rules: s.cssRules?.length || 0 }));
  const hasCinemaStage = !!document.querySelector('section.cinema-stage');
  const cinemaRect = document.querySelector('section.cinema-stage')?.getBoundingClientRect();
  const bodyDisplay = window.getComputedStyle(document.body).display;
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  return { css: css.slice(0, 20), hasCinemaStage, cinemaRect, bodyDisplay, bodyBg };
});
console.log(JSON.stringify(state, null, 2));
await p.screenshot({ path: '/tmp/debug-page.jpg', type: 'jpeg', quality: 88, fullPage: false });
await b.close();
