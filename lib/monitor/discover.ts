/**
 * Page discovery for a monitored site.
 *
 * Strategy:
 *   1. If `sitemap_url` is configured, parse it (with sitemap-index recursion).
 *   2. Otherwise probe /sitemap.xml at the site root.
 *   3. Final fallback: BFS crawl from the homepage to depth 2, following
 *      same-origin <a href> links.
 *
 * Apply optional include/exclude regex filters and cap at max_pages.
 * The output is a deterministic list of absolute URLs.
 *
 * Everything in this module is pure (no DB writes) — the caller persists
 * results to monitored_pages.
 */

import { JSDOM } from 'jsdom';
import pLimit from 'p-limit';

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = 'AssuredAIMonitor/0.1 (+https://assuredai.online)';
const MAX_BFS_DEPTH = 2;
const MAX_BFS_BREADTH = 60;

export interface DiscoverOptions {
  rootUrl: string;
  sitemapUrl?: string | null;
  includePatterns?: string[] | null;
  excludePatterns?: string[] | null;
  maxPages: number;
}

export interface DiscoveredPage {
  url: string;
  title?: string | null;
  source: 'sitemap' | 'crawl';
}

export interface DiscoverResult {
  pages: DiscoveredPage[];
  source: 'sitemap' | 'sitemap-probe' | 'crawl';
  notes: string[];
}

export async function discoverPages(opts: DiscoverOptions): Promise<DiscoverResult> {
  const notes: string[] = [];
  const includeRegexes = compileRegexes(opts.includePatterns);
  const excludeRegexes = compileRegexes(opts.excludePatterns);
  const origin = new URL(opts.rootUrl).origin;

  // 1. Explicit sitemap_url
  if (opts.sitemapUrl) {
    const urls = await fetchSitemapDeep(opts.sitemapUrl);
    notes.push(`sitemap "${opts.sitemapUrl}" → ${urls.length} URLs`);
    return finalise(urls, 'sitemap', opts.maxPages, origin, includeRegexes, excludeRegexes, notes);
  }

  // 2. /sitemap.xml probe
  const probeUrl = new URL('/sitemap.xml', opts.rootUrl).toString();
  try {
    const urls = await fetchSitemapDeep(probeUrl);
    if (urls.length > 0) {
      notes.push(`probed ${probeUrl} → ${urls.length} URLs`);
      return finalise(urls, 'sitemap-probe', opts.maxPages, origin, includeRegexes, excludeRegexes, notes);
    }
    notes.push(`probed ${probeUrl} → empty`);
  } catch (e) {
    notes.push(`sitemap probe failed: ${err(e)}`);
  }

  // 3. BFS fallback
  notes.push('falling back to BFS crawl from root');
  const urls = await bfsCrawl(opts.rootUrl, origin, MAX_BFS_DEPTH, MAX_BFS_BREADTH);
  notes.push(`BFS crawl → ${urls.length} URLs`);
  return finalise(urls, 'crawl', opts.maxPages, origin, includeRegexes, excludeRegexes, notes);
}

// ====================================================================
// Sitemap parsing
// ====================================================================

async function fetchSitemapDeep(url: string, visited = new Set<string>()): Promise<string[]> {
  if (visited.has(url) || visited.size > 25) return [];
  visited.add(url);

  const xml = await fetchText(url);
  const dom = new JSDOM(xml, { contentType: 'application/xml' });
  const doc = dom.window.document;

  // Sitemap index (nested sitemaps)
  const sitemapNodes = Array.from(doc.querySelectorAll('sitemap > loc'));
  if (sitemapNodes.length > 0) {
    const nestedUrls = sitemapNodes
      .map((n) => n.textContent?.trim())
      .filter((s): s is string => !!s);
    const results: string[] = [];
    const limit = pLimit(3);
    await Promise.all(
      nestedUrls.map((u) =>
        limit(async () => {
          try {
            const more = await fetchSitemapDeep(u, visited);
            results.push(...more);
          } catch {
            // ignore individual nested sitemap failures
          }
        }),
      ),
    );
    return results;
  }

  // Flat urlset
  return Array.from(doc.querySelectorAll('url > loc'))
    .map((n) => n.textContent?.trim())
    .filter((s): s is string => !!s);
}

// ====================================================================
// BFS fallback (same-origin, depth-limited)
// ====================================================================

async function bfsCrawl(
  rootUrl: string,
  origin: string,
  maxDepth: number,
  maxBreadth: number,
): Promise<string[]> {
  const seen = new Set<string>([normaliseUrl(rootUrl)]);
  const queue: Array<{ url: string; depth: number }> = [{ url: rootUrl, depth: 0 }];
  const found: string[] = [rootUrl];
  const limit = pLimit(4);

  while (queue.length > 0 && found.length < maxBreadth) {
    const batch = queue.splice(0, 8);
    await Promise.all(
      batch.map((item) =>
        limit(async () => {
          if (item.depth >= maxDepth) return;
          let html: string;
          try {
            html = await fetchText(item.url);
          } catch {
            return;
          }
          let dom: JSDOM;
          try {
            dom = new JSDOM(html);
          } catch {
            return;
          }
          const anchors = Array.from(dom.window.document.querySelectorAll('a[href]'));
          for (const a of anchors) {
            const href = a.getAttribute('href');
            if (!href) continue;
            let abs: string;
            try {
              abs = new URL(href, item.url).toString();
            } catch {
              continue;
            }
            if (new URL(abs).origin !== origin) continue;
            const norm = normaliseUrl(abs);
            if (seen.has(norm)) continue;
            seen.add(norm);
            found.push(norm);
            queue.push({ url: norm, depth: item.depth + 1 });
            if (found.length >= maxBreadth) break;
          }
        }),
      ),
    );
  }

  return found;
}

// ====================================================================
// Filtering + finalisation
// ====================================================================

function finalise(
  rawUrls: string[],
  source: DiscoverResult['source'],
  maxPages: number,
  origin: string,
  include: RegExp[],
  exclude: RegExp[],
  notes: string[],
): DiscoverResult {
  const seen = new Set<string>();
  const pages: DiscoveredPage[] = [];

  for (const raw of rawUrls) {
    let abs: string;
    try {
      abs = normaliseUrl(raw);
    } catch {
      continue;
    }
    if (new URL(abs).origin !== origin) continue;
    if (seen.has(abs)) continue;
    if (include.length > 0 && !include.some((r) => r.test(abs))) continue;
    if (exclude.length > 0 && exclude.some((r) => r.test(abs))) continue;
    seen.add(abs);
    pages.push({
      url: abs,
      source: source === 'crawl' ? 'crawl' : 'sitemap',
    });
    if (pages.length >= maxPages) break;
  }

  notes.push(`final list after filter + cap: ${pages.length} URLs (cap ${maxPages})`);
  return { pages, source, notes };
}

function compileRegexes(patterns?: string[] | null): RegExp[] {
  if (!patterns || patterns.length === 0) return [];
  return patterns
    .map((p) => {
      try {
        return new RegExp(p);
      } catch {
        return null;
      }
    })
    .filter((r): r is RegExp => r !== null);
}

function normaliseUrl(url: string): string {
  const u = new URL(url);
  u.hash = '';
  // Drop common tracking params
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
    u.searchParams.delete(k);
  }
  // Strip trailing slash on non-root paths for dedup
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.replace(/\/+$/, '');
  }
  return u.toString();
}

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xml;q=0.9,*/*;q=0.5' },
      signal: ctrl.signal,
      // Always fetch fresh — we're scanning for changes
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function err(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
