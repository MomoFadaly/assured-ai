/**
 * /api/admin/api-keys
 *
 *   GET  → list keys (no plaintext; redacted)
 *   POST → create a key; response includes the plaintext ONCE.
 *
 * Admin only.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { auth } from '@/lib/auth/auth';
import { logAdminAction } from '@/lib/admin/log';
import { createApiKey, listApiKeys, type ApiKeyScope } from '@/lib/api-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  name: z.string().min(1).max(120).trim(),
  description: z.string().max(500).optional(),
  scopes: z
    .array(z.enum(['verify', 'monitor:trigger', 'monitor:read']))
    .min(1)
    .default(['verify']),
  allowed_pack_slugs: z.array(z.string().min(1).max(60)).default([]),
  expires_at: z.string().datetime().nullable().optional(),
});

export async function GET(): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.code === 'unauthenticated' ? 401 : 403 },
    );
  }
  return NextResponse.json({ keys: await listApiKeys() });
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

  const generated = await createApiKey({
    name: body.name,
    description: body.description ?? null,
    scopes: body.scopes as ApiKeyScope[],
    allowedPackSlugs: body.allowed_pack_slugs,
    expiresAt: body.expires_at ? new Date(body.expires_at) : null,
    createdBy: guard.actor.userId,
  });

  const session = await auth();
  await logAdminAction({
    actor: {
      userId: guard.actor.userId,
      role: guard.actor.role,
      email: session?.user?.email ?? null,
    },
    action: 'api_key_created',
    targetKind: 'api_key',
    targetId: generated.id,
    afterState: {
      name: body.name,
      prefix: generated.prefix,
      scopes: body.scopes,
      allowed_pack_slugs: body.allowed_pack_slugs,
    },
  });

  return NextResponse.json(
    {
      id: generated.id,
      prefix: generated.prefix,
      plaintext: generated.plaintext,
    },
    { status: 201 },
  );
}
