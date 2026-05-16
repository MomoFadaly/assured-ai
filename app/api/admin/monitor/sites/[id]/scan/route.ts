/**
 * POST /api/admin/monitor/sites/[id]/scan
 *
 * Trigger a scan of a monitored site. Returns the scan run id + summary.
 *
 * Synchronous: caller waits for the run to complete (or partial). The
 * run will process up to `maxPagesPerRun` (default 25) pages within
 * Vercel's 60s function budget; any remainder rolls to the next run.
 *
 * Admin only.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { auth } from '@/lib/auth/auth';
import { logAdminAction } from '@/lib/admin/log';
import { runScan } from '@/lib/monitor/scan';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// One page can take 5-10s end-to-end (fetch + redact + per-sentence embed +
// per-sentence retrieval + audit write). At concurrency=3 we want ~50s
// budget to scan ~15-25 pages per run. Cap at Vercel's max for the plan.
export const maxDuration = 60;

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.code === 'unauthenticated' ? 401 : 403 },
    );
  }

  const { id } = await context.params;
  const session = await auth();

  try {
    const result = await runScan({
      siteId: id,
      triggeredKind: 'manual',
      triggeredByUserId: guard.actor.userId,
    });

    await logAdminAction({
      actor: {
        userId: guard.actor.userId,
        role: guard.actor.role,
        email: session?.user?.email ?? null,
      },
      action: 'monitor_scan_triggered',
      targetKind: 'monitored_site',
      targetId: id,
      afterState: {
        runId: result.runId,
        status: result.status,
        pages_scanned: result.pagesScanned,
        new_findings: result.newFindings,
      },
    });

    return NextResponse.json(result);
  } catch (e) {
    logger.error({ err: e, siteId: id }, 'manual scan endpoint failed');
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'scan failed' },
      { status: 500 },
    );
  }
}
