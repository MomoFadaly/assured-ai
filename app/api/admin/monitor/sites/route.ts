/**
 * /api/admin/monitor/sites
 *
 *   GET  → list all monitored sites
 *   POST → create or upsert a monitored site (admin only)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { auth } from '@/lib/auth/auth';
import { logAdminAction } from '@/lib/admin/log';
import { listMonitoredSites } from '@/lib/admin/queries';
import { resolvePack } from '@/lib/packs/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z
  .object({
    name: z.string().min(1).max(160).trim(),
    url: z.string().url(),
    // Pack selection — any of these will be resolved.
    vertical_pack_id: z.string().uuid().optional(),
    vertical_pack_slug: z.string().min(1).max(60).optional(),
    scenario: z.enum(['healthcare', 'government']).optional(),
    enabled: z.boolean().default(true),
    schedule: z.enum(['manual', 'hourly', 'daily', 'weekly']).default('manual'),
    sitemap_url: z.string().url().nullable().optional(),
    include_paths: z.array(z.string()).nullable().optional(),
    exclude_paths: z.array(z.string()).nullable().optional(),
    max_pages: z.number().int().min(1).max(5000).default(100),
    crawl_concurrency: z.number().int().min(1).max(10).default(3),
  })
  .refine(
    (v) =>
      v.vertical_pack_id !== undefined ||
      v.vertical_pack_slug !== undefined ||
      v.scenario !== undefined,
    { message: 'Provide vertical_pack_id, vertical_pack_slug, or scenario.' },
  );

export async function GET(): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.code === 'unauthenticated' ? 401 : 403 },
    );
  }
  return NextResponse.json({ sites: await listMonitoredSites() });
}

export async function POST(req: Request): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.code === 'unauthenticated' ? 401 : 403 },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid body', detail: e instanceof Error ? e.message : null },
      { status: 400 },
    );
  }

  // Resolve pack
  const pack = await resolvePack({
    packId: body.vertical_pack_id,
    packSlug: body.vertical_pack_slug,
    scenario: body.scenario,
  });
  if (!pack) {
    return NextResponse.json({ error: 'unknown vertical pack' }, { status: 400 });
  }
  // Legacy scenario_t column — choose closest representable scenario for
  // back-compat. New code prefers vertical_pack_id.
  const scenarioAlias = pack.slug === 'government' ? 'government' : 'healthcare';

  // Canonical site URL.
  let canonicalUrl: string;
  try {
    const u = new URL(body.url);
    u.hash = '';
    canonicalUrl = u.toString().replace(/\/$/, '');
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  const r = await query<{ id: string }>(
    `INSERT INTO monitored_sites
       (name, url, scenario, vertical_pack_id, enabled, schedule, sitemap_url,
        include_paths, exclude_paths, max_pages, crawl_concurrency, created_by)
     VALUES ($1, $2, $3::scenario_t, $4, $5, $6::monitor_schedule_t, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (url) DO UPDATE
       SET name = EXCLUDED.name,
           scenario = EXCLUDED.scenario,
           vertical_pack_id = EXCLUDED.vertical_pack_id,
           enabled = EXCLUDED.enabled,
           schedule = EXCLUDED.schedule,
           sitemap_url = EXCLUDED.sitemap_url,
           include_paths = EXCLUDED.include_paths,
           exclude_paths = EXCLUDED.exclude_paths,
           max_pages = EXCLUDED.max_pages,
           crawl_concurrency = EXCLUDED.crawl_concurrency,
           updated_at = NOW()
     RETURNING id`,
    [
      body.name,
      canonicalUrl,
      scenarioAlias,
      pack.id,
      body.enabled,
      body.schedule,
      body.sitemap_url ?? null,
      body.include_paths ?? null,
      body.exclude_paths ?? null,
      body.max_pages,
      body.crawl_concurrency,
      guard.actor.userId,
    ],
  );
  const id = r.rows[0]!.id;

  const session = await auth();
  await logAdminAction({
    actor: {
      userId: guard.actor.userId,
      role: guard.actor.role,
      email: session?.user?.email ?? null,
    },
    action: 'monitor_site_upserted',
    targetKind: 'monitored_site',
    targetId: id,
    afterState: {
      name: body.name,
      url: canonicalUrl,
      pack_slug: pack.slug,
      schedule: body.schedule,
    },
  });

  return NextResponse.json({ id, url: canonicalUrl, pack: pack.slug }, { status: 201 });
}
