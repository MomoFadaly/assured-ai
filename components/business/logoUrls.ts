/**
 * Logo URL helpers — pure functions, server-side safe.
 * Kept separate from VisualKit.tsx (which is 'use client') so server
 * components can call these at module-load time without bringing client
 * runtime into the boundary.
 *
 * Source priority (Phase 2 logo policy):
 *   1. /logos/{slug}.svg  — hand-curated SVGs in public/logos/ (best quality)
 *   2. simpleIconUrl()    — Simple Icons CDN for tech brands with vector marks
 *   3. googleFaviconUrl() — Google s2/favicons at sz=256 (universal fallback,
 *      returns 128–256px for most brands; falls to 32px for niche brands)
 *
 * Banned: Clearbit (sunset 2025), 32px favicons (use sz=256 instead).
 */

/** Curated SVG mark shipped in public/logos/{slug}.svg. */
export function localLogo(slug: string): string {
  return `/logos/${slug}.svg`;
}

/** Simple Icons CDN — vector SVGs for tech brands. Verified slugs only.
 *  Known-removed slugs (404s): openai, microsoft, microsoftazure,
 *  amazonwebservices, twilio, cohere — use localLogo() or
 *  googleFaviconUrl() for these. */
export function simpleIconUrl(slug: string, color = '000000'): string {
  return `https://cdn.simpleicons.org/${slug}/${color}`;
}

/** Google s2/favicons at sz=256 — returns the highest-resolution favicon
 *  the brand publishes. Most institutional brands return 128–256px; only
 *  small/niche brands cap at 32px. 5x quality improvement over the previous
 *  sz=128 default. */
export function googleFaviconUrl(domain: string, size = 256): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/** Direct Wikipedia Commons SVG URL — pass the file path under /commons/
 *  (e.g. "0/04/ChatGPT_logo.svg"). Thumb-rendering paths are unreliable
 *  due to MD5 hashing; prefer direct file URLs or curate locally. */
export function wikiCommonsUrl(filePath: string): string {
  return `https://upload.wikimedia.org/wikipedia/commons/${filePath}`;
}
