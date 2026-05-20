import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
const r = await p.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
console.log('prefers-reduced-motion:', r);
// Also check if StoryCinemaStatic is rendered (no cinema-stage) vs full
const hasStage = await p.evaluate(() => !!document.querySelector('section.cinema-stage'));
const hasStatic = await p.evaluate(() => !!document.querySelector('[aria-labelledby="story-cinema-static"]'));
console.log('has cinema-stage:', hasStage);
console.log('has static fallback:', hasStatic);
await b.close();
