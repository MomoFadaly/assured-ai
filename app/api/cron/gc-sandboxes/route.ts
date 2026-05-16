/**
 * GET /api/cron/gc-sandboxes — sweep unclaimed sandbox tenants.
 *
 * Visitors who provision through /get-started but never actually sign
 * in leave behind a tenant + user + 8 sources + API key. We don't
 * want those accumulating forever — they bloat the multi-tenant
 * query surface and (long-term) erode the value of "active tenants"
 * as a business metric.
 *
 * Definition of "unclaimed":
 *   - tenants.deployment_kind = 'sandbox'
 *   - tenants.created_at < NOW() - 24 hours
 *   - the owner user has NEVER signed in (last_login_at IS NULL)
 *
 * Deletion is cascading: the tenants table FK chain takes user, api
 * keys, notification channels, sources, etc with it. Audit_log rows
 * are PRESERVED (tenant_id is set to NULL by the ON DELETE clause)
 * so the hash chain stays unbroken — that's the only data that's
 * load-bearing for the platform's trust story.
 *
 * Vercel cron schedule: hourly via vercel.json. Authorised by
 * CRON_SECRET when set; otherwise unauthenticated for self-host
 * deployments without the env var.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const got = req.headers.get('authorization') ?? '';
    if (got !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  try {
    // Find candidates first so we can log what's about to die.
    const candidates = await query<{ id: string; slug: string; created_at: Date }>(
      `SELECT t.id, t.slug, t.created_at
         FROM tenants t
        WHERE t.deployment_kind = 'sandbox'
          AND t.created_at < NOW() - INTERVAL '24 hours'
          AND NOT EXISTS (
            SELECT 1 FROM users u
             WHERE u.tenant_id = t.id
               AND u.last_login_at IS NOT NULL
          )`,
    );

    if (candidates.rows.length === 0) {
      logger.info({ swept: 0 }, 'gc-sandboxes: nothing to sweep');
      return NextResponse.json({ ok: true, swept: 0 });
    }

    const ids = candidates.rows.map((r) => r.id);

    // Delete in one shot — ON DELETE CASCADE takes user/keys/channels/
    // sources with it. audit_log.tenant_id is ON DELETE SET NULL so the
    // hash chain is preserved.
    const del = await query<{ id: string }>(
      `DELETE FROM tenants WHERE id = ANY($1::uuid[]) RETURNING id`,
      [ids],
    );

    logger.info(
      { swept: del.rows.length, slugs: candidates.rows.map((r) => r.slug).slice(0, 20) },
      'gc-sandboxes: swept unclaimed sandbox tenants',
    );

    return NextResponse.json({
      ok: true,
      swept: del.rows.length,
      slugs: candidates.rows.map((r) => r.slug),
    });
  } catch (err) {
    logger.error({ err }, 'gc-sandboxes failed');
    return NextResponse.json(
      { error: 'gc_failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request): Promise<Response> {
  return GET(req);
}
