/**
 * /api/admin/monitor/sites/[id]
 *
 *   GET    → return the site row (admin shorthand)
 *   PATCH  → update mutable fields (enabled, schedule, settings)
 *   DELETE → permanently remove the site and its pages/findings/runs (CASCADE)
 *
 * Admin only.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { auth } from '@/lib/auth/auth';
import { logAdminAction } from '@/lib/admin/log';
import { getMonitoredSite } from '@/lib/admin/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Patch = z
  .object({
    name: z.string().min(1).max(160).trim().optional(),
    enabled: z.boolean().optional(),
    schedule: z.enum(['manual', 'hourly', 'daily', 'weekly']).optional(),
    scenario: z.enum(['healthcare', 'government']).optional(),
    sitemap_url: z.string().url().nullable().optional(),
    include_paths: z.array(z.string()).nullable().optional(),
    exclude_paths: z.array(z.string()).nullable().optional(),
    max_pages: z.number().int().min(1).max(5000).optional(),
    crawl_concurrency: z.number().int().min(1).max(10).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' });

export async function GET(
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
  const site = await getMonitoredSite(id);
  if (!site) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(site);
}

export async function PATCH(
  req: Request,
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

  let body: z.infer<typeof Patch>;
  try {
    body = Patch.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid body', detail: e instanceof Error ? e.message : null },
      { status: 400 },
    );
  }

  const before = await getMonitoredSite(id);
  if (!before) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const sets: string[] = [];
  const params: unknown[] = [id];
  function add(col: string, val: unknown, cast = '') {
    params.push(val);
    sets.push(`${col} = $${params.length}${cast}`);
  }
  if (body.name !== undefined) add('name', body.name);
  if (body.enabled !== undefined) add('enabled', body.enabled);
  if (body.schedule !== undefined) add('schedule', body.schedule, '::monitor_schedule_t');
  if (body.scenario !== undefined) add('scenario', body.scenario, '::scenario_t');
  if (body.sitemap_url !== undefined) add('sitemap_url', body.sitemap_url);
  if (body.include_paths !== undefined) add('include_paths', body.include_paths);
  if (body.exclude_paths !== undefined) add('exclude_paths', body.exclude_paths);
  if (body.max_pages !== undefined) add('max_pages', body.max_pages);
  if (body.crawl_concurrency !== undefined) add('crawl_concurrency', body.crawl_concurrency);
  sets.push('updated_at = NOW()');

  await query(`UPDATE monitored_sites SET ${sets.join(', ')} WHERE id = $1`, params);

  const session = await auth();
  await logAdminAction({
    actor: {
      userId: guard.actor.userId,
      role: guard.actor.role,
      email: session?.user?.email ?? null,
    },
    action: 'monitor_site_updated',
    targetKind: 'monitored_site',
    targetId: id,
    beforeState: before,
    afterState: body,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
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
  const before = await getMonitoredSite(id);
  if (!before) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await query(`DELETE FROM monitored_sites WHERE id = $1`, [id]);

  const session = await auth();
  await logAdminAction({
    actor: {
      userId: guard.actor.userId,
      role: guard.actor.role,
      email: session?.user?.email ?? null,
    },
    action: 'monitor_site_deleted',
    targetKind: 'monitored_site',
    targetId: id,
    beforeState: before,
  });

  return NextResponse.json({ ok: true });
}
