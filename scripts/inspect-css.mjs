import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);

const links = await p.evaluate(() => {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
});
console.log('Stylesheets loaded:', links);

const ruleSearch = await p.evaluate(async () => {
  const results = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        const txt = rule.cssText || '';
        if (txt.includes('cinema-lawsuit-callback') || txt.includes('coldOpenBadCallback')) {
          results.push({ href: sheet.href, rule: txt.slice(0, 200) });
        }
      }
    } catch (e) {
      results.push({ href: sheet.href, error: String(e).slice(0, 100) });
    }
  }
  return results;
});
console.log('Matching rules:', JSON.stringify(ruleSearch, null, 2));

await b.close();
