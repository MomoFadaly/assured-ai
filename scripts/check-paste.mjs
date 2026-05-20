import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
p.on('console', m => { if (m.type() === 'error') console.log('ERR:', m.text().slice(0, 200)); });
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
const info = await p.evaluate(() => {
  return {
    pasteFound: !!document.querySelector('#paste-and-scan'),
    pasteHtml: document.querySelector('#paste-and-scan')?.outerHTML?.slice(0, 200),
    bodyLen: document.body.innerHTML.length,
    sectionsCount: document.querySelectorAll('section').length,
    industryShowcase: !!document.querySelector('section[aria-labelledby*="industry"]') || document.body.innerHTML.includes('verticals'),
    hasPasteText: document.body.innerHTML.includes('Paste a sentence'),
  };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
