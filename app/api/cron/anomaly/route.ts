/**
 * GET /api/cron/anomaly — daily anomaly scan.
 *
 * Wired into vercel.json's cron schedule (once / hour is fine — the
 * detectors dedupe via `dedupe_key`). Returns a JSON report of what
 * was detected + what was newly persisted + what was sent through
 * the notification system.
 *
 * Auth: Vercel cron sends `Authorization: Bearer $CRON_SECRET` when
 * the env var is set. We mirror that contract.
 */

import { NextResponse } from 'next/server';
import { runAnomalyScan } from '@/lib/anomaly';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const got = req.headers.get('authorization') ?? '';
    if (got !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  try {
    const report = await runAnomalyScan();
    return NextResponse.json(report);
  } catch (err) {
    logger.error({ err }, 'anomaly cron failed');
    return NextResponse.json(
      { error: 'scan_failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// POST mirror so admins can manually trigger a scan from the UI.
export async function POST(req: Request): Promise<Response> {
  return GET(req);
}
