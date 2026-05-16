/**
 * SSO config CRUD per tenant.
 *
 *   GET    /api/admin/sso/[tenantId]   — read current config (or null)
 *   PUT    /api/admin/sso/[tenantId]   — upsert
 *   DELETE /api/admin/sso/[tenantId]   — disable (soft — keeps cert + metadata)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { disableSsoConfig, getSsoConfig, spMetadata, upsertSsoConfig } from '@/lib/sso';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PutSchema = z.object({
  idp_entity_id: z.string().min(1).max(500),
  idp_sso_url:   z.string().url().max(500),
  idp_slo_url:   z.string().url().max(500).nullable().optional(),
  idp_x509_cert: z.string().min(40).max(20_000),
  attribute_map: z.record(z.string(), z.string()).optional(),
  jit_provisioning: z.boolean().optional(),
  enforce_sso:      z.boolean().optional(),
  default_role:     z.enum(['admin', 'auditor', 'operator', 'customer']).optional(),
  enabled:          z.boolean().optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ tenantId: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 401 });
  const { tenantId } = await ctx.params;
  const config = await getSsoConfig(tenantId);
  return NextResponse.json({ config, sp: spMetadata() });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ tenantId: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 401 });
  const { tenantId } = await ctx.params;

  let parsed;
  try {
    parsed = PutSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid body', detail: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const row = await upsertSsoConfig({
    tenantId,
    idp_entity_id: parsed.idp_entity_id,
    idp_sso_url: parsed.idp_sso_url,
    idp_slo_url: parsed.idp_slo_url ?? null,
    idp_x509_cert: parsed.idp_x509_cert,
    attribute_map: parsed.attribute_map,
    jit_provisioning: parsed.jit_provisioning ?? true,
    enforce_sso: parsed.enforce_sso ?? false,
    default_role: parsed.default_role ?? 'customer',
    enabled: parsed.enabled ?? false,
    createdBy: guard.actor.userId,
  });
  return NextResponse.json({ ok: true, config: row });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ tenantId: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 401 });
  const { tenantId } = await ctx.params;
  await disableSsoConfig(tenantId);
  return NextResponse.json({ ok: true });
}
