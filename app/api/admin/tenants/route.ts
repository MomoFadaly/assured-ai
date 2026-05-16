/**
 * /api/admin/tenants
 *
 *   GET  → list tenants
 *   POST → create a tenant. Admin only.
 *
 * Note: tenant management is intentionally separated from the per-tenant
 * admin surfaces. Today /admin/tenants is a super-admin view of all
 * tenants on the deployment — typical for an integrator running cloud
 * AssuredAI for multiple customers.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { auth } from '@/lib/auth/auth';
import { logAdminAction } from '@/lib/admin/log';
import { listTenants, createTenant } from '@/lib/tenants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, digits, or hyphens'),
  name: z.string().min(1).max(160).trim(),
  description: z.string().max(500).optional(),
  deployment_kind: z.enum(['cloud', 'self-host']).default('cloud'),
});

export async function GET(): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.code === 'unauthenticated' ? 401 : 403 },
    );
  }
  return NextResponse.json({ tenants: await listTenants() });
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
  const created = await createTenant({
    slug: body.slug,
    name: body.name,
    description: body.description,
    deploymentKind: body.deployment_kind,
    createdBy: guard.actor.userId,
  });

  const session = await auth();
  await logAdminAction({
    actor: {
      userId: guard.actor.userId,
      role: guard.actor.role,
      email: session?.user?.email ?? null,
    },
    action: 'tenant_created',
    targetKind: 'tenant',
    targetId: created.id,
    afterState: { slug: body.slug, name: body.name, deployment_kind: body.deployment_kind },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
