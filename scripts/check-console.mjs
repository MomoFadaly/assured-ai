import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
const errors = [];
const warnings = [];
p.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
p.on('console', m => {
  if (m.type() === 'error') errors.push(m.text());
  if (m.type() === 'warning') warnings.push(m.text());
});
await p.goto('http://localhost:3030', { waitUntil: 'networkidle', timeout: 90000 });
await p.waitForSelector('section.cinema-stage');
await p.waitForTimeout(3000);
// Trigger some scroll to surface motion-related warnings
const g = await p.evaluate(() => {
  const s = document.querySelector('section.cinema-stage');
  return { sTop: s.getBoundingClientRect().top + window.scrollY, range: s.offsetHeight - window.innerHeight };
});
await p.evaluate(y => window.__lenis?.scrollTo(y, { immediate: true }) ?? window.scrollTo(0, y), g.sTop + g.range * 0.1);
await p.waitForTimeout(1000);
console.log('=== ERRORS ===');
errors.slice(0, 10).forEach(e => console.log('•', e.slice(0, 300)));
console.log('=== WARNINGS ===');
warnings.slice(0, 10).forEach(w => console.log('•', w.slice(0, 300)));
await b.close();
