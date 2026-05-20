import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('/tmp/scroll-cue', { recursive: true });
const b = await chromium.launch({ headless: true });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
const p = await c.newPage();
await p.goto('http://localhost:3030', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
// Capture BEFORE clicking Begin — should show intro
await p.screenshot({ path: '/tmp/scroll-cue/00_pre-begin.jpg', type: 'jpeg', quality: 92 });

const btn = await p.evaluate(() => {
  const b = document.querySelector('button[aria-label="Begin the experience"]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (btn) { await p.mouse.click(btn.x, btn.y); }

// Capture right after Begin — should show cold-open frame
await p.waitForTimeout(800);
await p.screenshot({ path: '/tmp/scroll-cue/01_just-after-begin.jpg', type: 'jpeg', quality: 92 });

// Wait for the start-mode nudge to appear (1.5s + animation)
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/scroll-cue/02_scroll-to-begin-nudge.jpg', type: 'jpeg', quality: 92 });

// Wait longer to confirm nudge persists
await p.waitForTimeout(3000);
await p.screenshot({ path: '/tmp/scroll-cue/03_nudge-still-visible.jpg', type: 'jpeg', quality: 92 });

// Now scroll a tiny bit — should hide the nudge
await p.evaluate(() => window.scrollBy(0, 200));
await p.waitForTimeout(800);
await p.screenshot({ path: '/tmp/scroll-cue/04_after-first-scroll-hidden.jpg', type: 'jpeg', quality: 92 });

console.log('done');
await b.close();
