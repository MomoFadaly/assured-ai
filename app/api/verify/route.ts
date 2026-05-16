/**
 * POST /api/verify — pack-aware verification entry point.
 *
 * Body — provide ONE of (resolved in priority order):
 *   vertical_pack_id: UUID            (preferred — stable identifier)
 *   vertical_pack_slug: string        (e.g. 'finance')
 *   scenario: 'healthcare'|'government'  (legacy back-compat)
 *
 * Plus one of:
 *   { input_mode: 'paste',  article: string }
 *   { input_mode: 'draft',  brief:   string, format?: 'qa'|'handout'|'faq'|'social'|'email' }
 *
 * Returns: VerifyResponse (see lib/verification/lifecycle.ts).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runVerifyLifecycle } from '@/lib/verification/lifecycle';
import { resolvePack } from '@/lib/packs/registry';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import {
  validateKey,
  keyHasScope,
  keyAllowsPack,
  type ValidatedKey,
} from '@/lib/api-keys';
import { tenantForServiceCall } from '@/lib/tenants';
import { query } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-session-id, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const RequestSchema = z
  .object({
    vertical_pack_id: z.string().uuid().optional(),
    vertical_pack_slug: z.string().min(1).max(60).optional(),
    scenario: z.enum(['healthcare', 'government']).optional(),
    input_mode: z.enum(['paste', 'draft']),
    article: z.string().max(50_000).optional(),
    brief: z.string().max(2_000).optional(),
    format: z.enum(['qa', 'handout', 'faq', 'social', 'email']).optional(),
  })
  .refine(
    (v) =>
      v.vertical_pack_id !== undefined ||
      v.vertical_pack_slug !== undefined ||
      v.scenario !== undefined,
    {
      message:
        'Provide vertical_pack_id, vertical_pack_slug, or scenario (legacy) to select a vertical pack.',
    },
  )
  .refine(
    (v) =>
      (v.input_mode === 'paste' && typeof v.article === 'string' && v.article.length > 0) ||
      (v.input_mode === 'draft' && typeof v.brief === 'string' && v.brief.length > 0),
    {
      message: 'paste mode requires `article`; draft mode requires `brief`.',
    },
  );

export async function POST(req: Request): Promise<NextResponse> {
  const limit = checkRateLimit(clientKey(req));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        kind: 'error',
        message:
          limit.reason === 'burst'
            ? `Too many requests this minute. Try again in ${limit.retryAfter}s.`
            : `Daily limit reached. Try again in ${Math.ceil(limit.retryAfter / 3600)}h.`,
        audit_log_id: null,
        latency_ms: 0,
      },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          'Retry-After': String(limit.retryAfter),
          'X-RateLimit-Burst-Remaining': String(limit.burstRemaining),
          'X-RateLimit-Daily-Remaining': String(limit.dailyRemaining),
        },
      },
    );
  }

  // Optional API-key authentication. When a bearer is present we validate
  // and enforce its scope + pack restrictions. When absent we fall back to
  // the rate-limited unauthenticated path (browser users of the public
  // verifier and the Chrome extension without a key). Misuse → 401 JSON
  // (never redirect — would break fetch() callers).
  let apiKey: ValidatedKey | null = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const v = await validateKey(authHeader);
    if (!v.ok) {
      return NextResponse.json(
        { kind: 'error', message: `API key ${v.reason}.`, audit_log_id: null, latency_ms: 0 },
        { status: 401, headers: CORS_HEADERS },
      );
    }
    apiKey = v.key;
    if (!keyHasScope(apiKey, 'verify')) {
      return NextResponse.json(
        { kind: 'error', message: 'API key lacks the `verify` scope.', audit_log_id: null, latency_ms: 0 },
        { status: 403, headers: CORS_HEADERS },
      );
    }
  }

  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body', details: err instanceof Error ? err.message : null },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const pack = await resolvePack({
    packId: parsed.vertical_pack_id,
    packSlug: parsed.vertical_pack_slug,
    scenario: parsed.scenario,
  });
  if (!pack) {
    return NextResponse.json(
      {
        kind: 'error',
        message: `Unknown vertical pack. Provide a valid vertical_pack_id, vertical_pack_slug, or scenario.`,
        audit_log_id: null,
        latency_ms: 0,
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Per-key pack restriction
  if (apiKey && !keyAllowsPack(apiKey, pack.slug)) {
    return NextResponse.json(
      {
        kind: 'error',
        message: `API key is not authorised for pack "${pack.slug}".`,
        audit_log_id: null,
        latency_ms: 0,
      },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  const sessionId = req.headers.get('x-session-id') ?? null;

  // Resolve tenant context. API-key requests → the key's tenant.
  // Unauthenticated public-chat requests → default tenant.
  let apiKeyTenantId: string | null = null;
  if (apiKey) {
    const r = await query<{ tenant_id: string | null }>(
      `SELECT tenant_id FROM api_keys WHERE id = $1`,
      [apiKey.id],
    );
    apiKeyTenantId = r.rows[0]?.tenant_id ?? null;
  }
  const tenant = await tenantForServiceCall({ apiKeyTenantId });

  try {
    const result = await runVerifyLifecycle({
      pack,
      tenant_id: tenant.id,
      input_mode: parsed.input_mode,
      article: parsed.article,
      brief: parsed.brief,
      format: parsed.format,
      user_session_id: sessionId,
    });

    const status =
      result.kind === 'kill_switch' ? 503 : result.kind === 'error' ? 500 : 200;

    return NextResponse.json(result, {
      status,
      headers: {
        ...CORS_HEADERS,
        'X-RateLimit-Burst-Remaining': String(limit.burstRemaining),
        'X-RateLimit-Daily-Remaining': String(limit.dailyRemaining),
        'X-AssuredAI-Pack': pack.slug,
      },
    });
  } catch (err) {
    logger.error({ err, pack: pack.slug }, '/api/verify unhandled error');
    return NextResponse.json(
      { kind: 'error', message: 'Internal server error.', audit_log_id: null, latency_ms: 0 },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
