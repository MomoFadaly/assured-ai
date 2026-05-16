/**
 * Scan orchestrator for a monitored site.
 *
 * Flow per invocation:
 *   1. Open a `monitor_scan_runs` row (status='running')
 *   2. Discover pages via lib/monitor/discover
 *   3. For each page (capped at site.max_pages, concurrency-limited):
 *      a. Fetch + extract main content via @mozilla/readability
 *      b. Hash cleaned text; skip if matches monitored_pages.last_content_hash
 *      c. Otherwise run through runVerifyLifecycle({ input_mode: 'paste' })
 *      d. Compute severity; if not 'clean', INSERT into monitor_findings
 *      e. UPDATE monitored_pages with new hash + severity
 *   4. Close the run row (status='completed' | 'partial' | 'failed')
 *   5. Update monitored_sites totals
 *
 * Per-invocation page cap is `runtime.maxPagesPerRun` so Vercel 60s
 * functions don't time out on large sites. Cron picks up the remainder.
 *
 * Per the existing "no retry on paid calls" rule (ADR + memory), each
 * page is verified at most once per scan. Failed pages bump
 * pages_failed but don't block the run.
 */

import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import pLimit from 'p-limit';

import { query, transaction } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { runVerifyLifecycle, type VerifyResponse } from '@/lib/verification/lifecycle';
import { discoverPages } from './discover';
import { computeSeverity, type MonitorSeverity } from './severity';
import { getPackById, getPackBySlug } from '@/lib/packs/registry';
import { notifyEvent } from '@/lib/notifications/dispatch';
import { getDefaultTenant } from '@/lib/tenants';
import type { VerticalPackRow } from '@/lib/packs/types';
import type { Scenario } from '@/lib/db/types';

const FETCH_TIMEOUT_MS = 20_000;
const USER_AGENT = 'AssuredAIMonitor/0.1 (+https://assuredai.online)';
const DEFAULT_MAX_PAGES_PER_RUN = 25;

export interface RunScanOptions {
  siteId: string;
  triggeredKind: 'manual' | 'cron' | 'webhook';
  triggeredByUserId?: string | null;
  /** Per-invocation cap; remainder rolls to the next scan. */
  maxPagesPerRun?: number;
}

export interface RunScanResult {
  runId: string;
  status: 'completed' | 'partial' | 'failed';
  pagesDiscovered: number;
  pagesScanned: number;
  pagesSkippedUnchanged: number;
  pagesFailed: number;
  newFindings: number;
  durationMs: number;
}

interface SiteRow {
  id: string;
  name: string;
  url: string;
  scenario: Scenario;
  vertical_pack_id: string | null;
  enabled: boolean;
  sitemap_url: string | null;
  include_paths: string[] | null;
  exclude_paths: string[] | null;
  max_pages: number;
  crawl_concurrency: number;
}

export async function runScan(opts: RunScanOptions): Promise<RunScanResult> {
  const start = performance.now();
  const maxPagesPerRun = opts.maxPagesPerRun ?? DEFAULT_MAX_PAGES_PER_RUN;

  // Load site
  const siteResult = await query<SiteRow>(
    `SELECT id, name, url, scenario, vertical_pack_id, enabled, sitemap_url, include_paths,
            exclude_paths, max_pages, crawl_concurrency
       FROM monitored_sites WHERE id = $1`,
    [opts.siteId],
  );
  const site = siteResult.rows[0];
  if (!site) throw new Error(`Monitored site ${opts.siteId} not found`);
  if (!site.enabled) throw new Error(`Monitored site ${site.name} is disabled`);

  // Resolve the vertical pack — preferred: vertical_pack_id; fall back to
  // legacy scenario slug.
  const pack: VerticalPackRow | null = site.vertical_pack_id
    ? await getPackById(site.vertical_pack_id)
    : await getPackBySlug(site.scenario);
  if (!pack) {
    throw new Error(`Could not resolve vertical pack for site ${site.name}`);
  }

  // Resolve tenant — sites carry tenant_id post-migration 008; legacy
  // sites without one fall back to the default tenant. This is the
  // single point of tenant resolution for the entire scan run.
  const tenantId: string =
    (site as unknown as { tenant_id: string | null }).tenant_id ??
    (await getDefaultTenant()).id;

  // Open scan run
  const runResult = await query<{ id: string }>(
    `INSERT INTO monitor_scan_runs (site_id, triggered_by_user_id, triggered_kind, status)
       VALUES ($1, $2, $3, 'running')
       RETURNING id`,
    [opts.siteId, opts.triggeredByUserId ?? null, opts.triggeredKind],
  );
  const runId = runResult.rows[0]!.id;

  let pagesDiscovered = 0;
  let pagesScanned = 0;
  let pagesSkippedUnchanged = 0;
  let pagesFailed = 0;
  let newFindings = 0;
  let finalStatus: RunScanResult['status'] = 'completed';

  try {
    // 1. Discover
    const discovery = await discoverPages({
      rootUrl: site.url,
      sitemapUrl: site.sitemap_url,
      includePatterns: site.include_paths,
      excludePatterns: site.exclude_paths,
      maxPages: site.max_pages,
    });
    pagesDiscovered = discovery.pages.length;
    logger.info(
      { siteId: site.id, source: discovery.source, discovered: pagesDiscovered },
      'monitor: discovered pages',
    );

    // 2. Upsert into monitored_pages (so we always know about pages, even
    //    if this run doesn't have time to scan them all).
    await upsertPages(site.id, discovery.pages.map((p) => p.url));

    // 3. Decide which pages to scan THIS run: prioritise
    //    (a) never-scanned pages, then
    //    (b) oldest last_scanned_at first.
    const toScan = await pickPagesToScan(site.id, maxPagesPerRun);
    logger.info(
      { siteId: site.id, candidates: toScan.length, cap: maxPagesPerRun },
      'monitor: scanning batch',
    );

    if (toScan.length < pagesDiscovered) {
      finalStatus = 'partial';
    }

    // 4. Scan each (concurrent, capped)
    const limit = pLimit(Math.max(1, Math.min(site.crawl_concurrency, 6)));
    await Promise.all(
      toScan.map((p) =>
        limit(async () => {
          try {
            const outcome = await scanOne({
              siteId: site.id,
              pageId: p.id,
              pageUrl: p.url,
              previousHash: p.last_content_hash,
              pack,
              tenantId,
            });
            if (outcome === 'unchanged') {
              pagesSkippedUnchanged++;
            } else {
              pagesScanned++;
              if (outcome === 'finding') newFindings++;
            }
          } catch (e) {
            pagesFailed++;
            logger.error({ err: e, url: p.url }, 'monitor: scan failed for page');
          }
        }),
      ),
    );

    // 5. Refresh site denormalised totals
    await refreshSiteTotals(site.id);
  } catch (e) {
    finalStatus = 'failed';
    logger.error({ err: e, siteId: site.id }, 'monitor: run failed');
    const errMsg = e instanceof Error ? e.message : String(e);
    await query(
      `UPDATE monitor_scan_runs
          SET status = 'failed', error = $2, finished_at = NOW(),
              pages_discovered = $3, pages_scanned = $4,
              pages_skipped_unchanged = $5, pages_failed = $6,
              new_findings = $7
        WHERE id = $1`,
      [
        runId,
        errMsg,
        pagesDiscovered,
        pagesScanned,
        pagesSkippedUnchanged,
        pagesFailed,
        newFindings,
      ],
    );
    void notifyEvent({
      kind: 'scan_failed',
      event_key: `scanrun:${runId}`,
      scan_run_id: runId,
      site_id: site.id,
      site_name: site.name,
      error: errMsg,
    });
    return {
      runId,
      status: 'failed',
      pagesDiscovered,
      pagesScanned,
      pagesSkippedUnchanged,
      pagesFailed,
      newFindings,
      durationMs: Math.round(performance.now() - start),
    };
  }

  await query(
    `UPDATE monitor_scan_runs
        SET status = $2,
            finished_at = NOW(),
            pages_discovered = $3,
            pages_scanned = $4,
            pages_skipped_unchanged = $5,
            pages_failed = $6,
            new_findings = $7
      WHERE id = $1`,
    [
      runId,
      finalStatus,
      pagesDiscovered,
      pagesScanned,
      pagesSkippedUnchanged,
      pagesFailed,
      newFindings,
    ],
  );

  // Bump site last-scan markers
  await query(
    `UPDATE monitored_sites
        SET last_scanned_at = NOW(),
            last_run_status = $2,
            updated_at = NOW()
      WHERE id = $1`,
    [site.id, finalStatus],
  );

  return {
    runId,
    status: finalStatus,
    pagesDiscovered,
    pagesScanned,
    pagesSkippedUnchanged,
    pagesFailed,
    newFindings,
    durationMs: Math.round(performance.now() - start),
  };
}

// ====================================================================
// Per-page scan
// ====================================================================

interface ScanOneArgs {
  siteId: string;
  pageId: string;
  pageUrl: string;
  previousHash: string | null;
  pack: VerticalPackRow;
  tenantId: string;
}

type ScanOneOutcome = 'unchanged' | 'clean' | 'finding';

async function scanOne(args: ScanOneArgs): Promise<ScanOneOutcome> {
  // Fetch
  const html = await fetchPage(args.pageUrl);

  // Extract main content via Readability
  const { article, title } = extractArticle(html, args.pageUrl);
  if (!article || article.length < 60) {
    // Page too short to verify (likely landing / nav). Mark as scanned-empty.
    await query(
      `UPDATE monitored_pages
          SET last_scanned_at = NOW(),
              last_content_hash = $2,
              last_severity = 'clean',
              title = COALESCE($3, title)
        WHERE id = $1`,
      [args.pageId, hashText(article ?? ''), title],
    );
    return 'unchanged';
  }

  const contentHash = hashText(article);
  if (args.previousHash && args.previousHash === contentHash) {
    // No change since last scan — skip verification.
    await query(
      `UPDATE monitored_pages SET last_scanned_at = NOW() WHERE id = $1`,
      [args.pageId],
    );
    return 'unchanged';
  }

  // Run through the verification lifecycle
  const result: VerifyResponse = await runVerifyLifecycle({
    pack: args.pack,
    tenant_id: args.tenantId,
    user_session_id: `monitor:${args.siteId}`,
    input_mode: 'paste',
    article,
  });

  const sev = computeSeverity(result);
  const auditLogId = 'audit_log_id' in result ? result.audit_log_id : null;

  // Update the page row regardless
  await query(
    `UPDATE monitored_pages
        SET last_scanned_at = NOW(),
            last_content_hash = $2,
            last_severity = $3::monitor_severity_t,
            title = COALESCE($4, title)
      WHERE id = $1`,
    [args.pageId, contentHash, sev.severity, title],
  );

  if (sev.severity === 'clean') return 'clean';

  const findingResult = await query<{ id: string; site_name: string }>(
    `WITH new_finding AS (
       INSERT INTO monitor_findings
         (site_id, page_id, page_url, audit_log_id, severity, status, summary,
          pii_count, unsourced_count, supported_count, disclaimer_missing,
          red_flag_category, detail)
       VALUES ($1, $2, $3, $4, $5::monitor_severity_t, 'new', $6,
               $7, $8, $9, $10, $11, $12)
       RETURNING id
     )
     SELECT nf.id, ms.name AS site_name
       FROM new_finding nf, monitored_sites ms
      WHERE ms.id = $1`,
    [
      args.siteId,
      args.pageId,
      args.pageUrl,
      auditLogId,
      sev.severity,
      sev.summary,
      sev.pii_count,
      sev.unsourced_count,
      sev.supported_count,
      sev.disclaimer_missing,
      sev.red_flag_category,
      JSON.stringify(result),
    ],
  );

  // Fire-and-forget notification fan-out.
  const inserted = findingResult.rows[0];
  if (inserted) {
    void notifyEvent({
      kind: 'monitor_finding',
      event_key: `finding:${inserted.id}`,
      finding_id: inserted.id,
      site_id: args.siteId,
      site_name: inserted.site_name,
      page_url: args.pageUrl,
      severity: sev.severity,
      summary: sev.summary,
      audit_log_id: auditLogId,
      pack_slug: args.pack.slug,
    });
  }

  return 'finding';
}

// ====================================================================
// Helpers
// ====================================================================

async function upsertPages(siteId: string, urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  await transaction(async (client) => {
    for (const url of urls) {
      await client.query(
        `INSERT INTO monitored_pages (site_id, url)
           VALUES ($1, $2)
           ON CONFLICT (site_id, url)
           DO UPDATE SET last_seen_at = NOW()`,
        [siteId, url],
      );
    }
    await client.query(
      `UPDATE monitored_sites
          SET total_pages_known = (SELECT COUNT(*) FROM monitored_pages WHERE site_id = $1),
              updated_at = NOW()
        WHERE id = $1`,
      [siteId],
    );
  });
}

interface PickedPage {
  id: string;
  url: string;
  last_content_hash: string | null;
}

async function pickPagesToScan(siteId: string, cap: number): Promise<PickedPage[]> {
  // Never-scanned pages first, then oldest last_scanned_at.
  const r = await query<PickedPage>(
    `SELECT id, url, last_content_hash
       FROM monitored_pages
      WHERE site_id = $1
      ORDER BY last_scanned_at NULLS FIRST, last_seen_at DESC
      LIMIT $2`,
    [siteId, cap],
  );
  return r.rows;
}

async function refreshSiteTotals(siteId: string): Promise<void> {
  await query(
    `UPDATE monitored_sites
        SET total_findings_open = (
              SELECT COUNT(*) FROM monitor_findings
               WHERE site_id = $1 AND status = 'new'
            ),
            updated_at = NOW()
      WHERE id = $1`,
    [siteId],
  );
}

async function fetchPage(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*;q=0.5' },
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const ct = res.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml/.test(ct)) {
      throw new Error(`Non-HTML content-type: ${ct}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractArticle(
  html: string,
  url: string,
): { article: string | null; title: string | null } {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const parsed = reader.parse();
    if (!parsed) return { article: null, title: null };
    // textContent gives us clean prose without HTML tags — perfect for the
    // verification pipeline which works on paragraphs.
    const text = (parsed.textContent ?? '').replace(/\s+\n/g, '\n').trim();
    return { article: text, title: parsed.title ?? null };
  } catch {
    return { article: null, title: null };
  }
}

function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export type { MonitorSeverity };
