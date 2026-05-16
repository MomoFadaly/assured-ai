/**
 * GET /api/cron/monitor — invoked by Vercel Cron (see vercel.json).
 *
 * Iterates enabled monitored sites whose schedule is due, runs a partial
 * scan on each within the function budget. The runScan helper already
 * caps pages per invocation (default 25), so longer scans naturally
 * incrementally complete across multiple cron firings.
 *
 * Vercel cron jobs send an Authorization header derived from CRON_SECRET
 * (when configured) so unauthenticated requests are rejected — important
 * because this endpoint runs paid LLM calls.
 *
 * Triggered_kind on the scan run is recorded as 'cron'.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { runScan } from '@/lib/monitor/scan';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface DueRow {
  id: string;
  name: string;
  schedule: 'hourly' | 'daily' | 'weekly';
  last_scanned_at: Date | null;
}

export async function GET(req: Request): Promise<Response> {
  // Vercel sets `Authorization: Bearer <CRON_SECRET>` when crons are
  // configured with a CRON_SECRET env var. If we have one, require it.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const got = req.headers.get('authorization') ?? '';
    if (got !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const dueResult = await query<DueRow>(
    `SELECT id, name, schedule, last_scanned_at
       FROM monitored_sites
      WHERE enabled = true
        AND schedule != 'manual'
        AND (
          last_scanned_at IS NULL
          OR (schedule = 'hourly'  AND last_scanned_at < NOW() - INTERVAL '50 minutes')
          OR (schedule = 'daily'   AND last_scanned_at < NOW() - INTERVAL '23 hours')
          OR (schedule = 'weekly'  AND last_scanned_at < NOW() - INTERVAL '6 days 22 hours')
        )
      ORDER BY last_scanned_at NULLS FIRST
      LIMIT 5`,
  );

  const results: Array<{
    siteId: string;
    name: string;
    status: string;
    pagesScanned: number;
    newFindings: number;
    error?: string;
  }> = [];

  for (const site of dueResult.rows) {
    try {
      const r = await runScan({
        siteId: site.id,
        triggeredKind: 'cron',
        triggeredByUserId: null,
        maxPagesPerRun: 15, // tighter cap inside cron to be safe with 60s budget
      });
      results.push({
        siteId: site.id,
        name: site.name,
        status: r.status,
        pagesScanned: r.pagesScanned,
        newFindings: r.newFindings,
      });
    } catch (e) {
      logger.error({ err: e, siteId: site.id }, 'cron scan failed');
      results.push({
        siteId: site.id,
        name: site.name,
        status: 'failed',
        pagesScanned: 0,
        newFindings: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    triggered: dueResult.rows.length,
    results,
    triggered_at: new Date().toISOString(),
  });
}
