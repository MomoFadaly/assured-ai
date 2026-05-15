import { chromium } from 'playwright';
const browser = await chromium.launch();

async function inspect(url, label) {
  // Force OS-level dark mode preference to confirm we ignore it
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const html = document.documentElement;
    return {
      hasDarkClass: html.classList.contains('dark'),
      htmlColorScheme: html.style.colorScheme || getComputedStyle(html).colorScheme,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      themeToggleInDom: !!document.querySelector('[aria-label="Toggle theme"]'),
    };
  });
  console.log(`\n=== ${label} (OS prefers dark) ===`);
  console.log(JSON.stringify(r, null, 2));
  await ctx.close();
}

await inspect('https://assured-ai.fadaly.net/', 'homepage');
await inspect('https://assured-ai.fadaly.net/chat', 'verifier (/chat)');
await browser.close();
