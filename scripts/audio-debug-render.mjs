import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
const errors = [];
p.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') {
    const t = m.text();
    if (!t.includes('animatable value') && !t.includes('Vercel') && !t.includes('Content Security')) {
      errors.push(`[${m.type()}] ${t}`);
    }
  }
});
p.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(3500);

// Find ALL buttons after hydration
const all = await p.evaluate(() => {
  return Array.from(document.querySelectorAll('button')).map(b => ({
    aria: b.getAttribute('aria-label'),
    text: (b.textContent || '').trim().slice(0, 30),
  }));
});
console.log('ALL BUTTONS:');
all.forEach((b, i) => console.log(`  [${i}] aria="${b.aria}" text="${b.text}"`));

// Check the body for data attributes
const bodyAttrs = await p.evaluate(() => {
  return Array.from(document.body.attributes).map(a => `${a.name}="${a.value}"`);
});
console.log('\nBODY ATTRS:');
bodyAttrs.forEach(a => console.log('  ', a));

console.log('\nERRORS/WARNINGS:');
errors.slice(0, 15).forEach(e => console.log(e));
await b.close();
