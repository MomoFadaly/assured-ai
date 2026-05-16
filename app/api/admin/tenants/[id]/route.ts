/**
 * PATCH /api/admin/tenants/[id] — update tenant settings.
 *
 * Phase 3 surfaces: region pin, retention days, allowed_regions.
 * Settings stays JSONB-extensible — anything outside the dedicated
 * columns goes into `tenants.settings`.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { query } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REGIONS = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-southeast-2'] as const;

const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  region: z.enum(REGIONS).optional(),
  audit_retention_days: z.number().int().min(30).max(36500).nullable().optional(),
  allowed_regions: z.array(z.enum(REGIONS)).min(1).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.code === 'unauthenticated' ? 401 : 403 },
    );
  }
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  let parsed;
  try {
    parsed = PatchSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid body', detail: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const fields: string[] = [];
  const args: unknown[] = [id];
  function push(col: string, val: unknown) {
    args.push(val);
    fields.push(`${col} = $${args.length}`);
  }
  if (parsed.name !== undefined) push('name', parsed.name.trim());
  if (parsed.description !== undefined) push('description', parsed.description);
  if (parsed.region !== undefined) push('region', parsed.region);
  if (parsed.audit_retention_days !== undefined) push('audit_retention_days', parsed.audit_retention_days);
  if (parsed.allowed_regions !== undefined) push('allowed_regions', parsed.allowed_regions);
  if (parsed.is_active !== undefined) push('is_active', parsed.is_active);

  if (fields.length === 0) return NextResponse.json({ ok: true, noop: true });

  fields.push(`updated_at = NOW()`);
  await query(`UPDATE tenants SET ${fields.join(', ')} WHERE id = $1`, args);
  return NextResponse.json({ ok: true });
}
