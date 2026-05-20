import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
const allConsole = [];
p.on('console', m => allConsole.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
p.on('pageerror', e => allConsole.push(`[pageerror] ${e.message}`));
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForTimeout(5000);

// Check if any element has the cinema-sound text or aria
const allButtonsRaw = await p.evaluate(() => document.querySelectorAll('button').length);
const containsSound = await p.evaluate(() => {
  const all = document.querySelectorAll('*');
  let sound = 0;
  for (const el of all) {
    const aria = el.getAttribute('aria-label') || '';
    if (aria.includes('cinema sound') || aria.includes('Sound')) sound++;
  }
  return sound;
});
const innerHTMLContainsSound = await p.evaluate(() => {
  return {
    bodyContainsSound: document.body.innerHTML.includes('cinema sound'),
    bodyContainsEnableSound: document.body.innerHTML.includes('Enable cinema sound'),
    bodyContainsSoundOn: document.body.innerHTML.includes('Sound on'),
    bodyContainsSoundOff: document.body.innerHTML.includes('Sound off'),
  };
});
console.log(`Total buttons: ${allButtonsRaw}`);
console.log(`Elements with sound-aria: ${containsSound}`);
console.log('Body innerHTML contains:', JSON.stringify(innerHTMLContainsSound));

// Check what hooks/state CinemaSound was rendered with by looking at React DevTools data... actually that's hard.
// Instead: read the SSR HTML directly to see if it ever rendered the button
const ssrHasSound = await p.evaluate(async () => {
  const res = await fetch('http://localhost:3030');
  const html = await res.text();
  return {
    htmlContainsCinemaSound: html.includes('cinema sound'),
    htmlContainsSoundOn: html.includes('Sound on'),
    htmlLength: html.length,
  };
});
console.log('SSR HTML:', JSON.stringify(ssrHasSound));

console.log('\n--- console logs (filtered) ---');
allConsole.filter(c => /sound|audio|cinema|hydrat|error/i.test(c)).slice(0, 20).forEach(c => console.log(c));

await b.close();
