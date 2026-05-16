/**
 * POST /api/suggest-fix — re-anchor an unsourced sentence to its closest chunk.
 *
 * Body:
 *   {
 *     sentence: string,
 *     chunk_id: string,                              // best_match chunk
 *     vertical_pack_id?: string,
 *     vertical_pack_slug?: string,
 *     scenario?: 'healthcare'|'government',         // legacy
 *     paragraph?: string                             // optional context
 *   }
 *
 * Returns: { rewrite, notes?, source, model, latency_ms }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { suggestFix } from '@/lib/verification/suggest-fix';
import { resolvePack } from '@/lib/packs/registry';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import {
  validateKey,
  keyHasScope,
  keyAllowsPack,
  type ValidatedKey,
} from '@/lib/api-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const RequestSchema = z
  .object({
    sentence: z.string().min(5).max(2000),
    chunk_id: z.string().uuid(),
    vertical_pack_id: z.string().uuid().optional(),
    vertical_pack_slug: z.string().min(1).max(60).optional(),
    scenario: z.enum(['healthcare', 'government']).optional(),
    paragraph: z.string().max(4000).optional(),
  })
  .refine(
    (v) =>
      v.vertical_pack_id !== undefined ||
      v.vertical_pack_slug !== undefined ||
      v.scenario !== undefined,
    {
      message: 'Provide vertical_pack_id, vertical_pack_slug, or scenario.',
    },
  );

export async function POST(req: Request): Promise<NextResponse> {
  const limit = checkRateLimit(clientKey(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate-limited', retryAfter: limit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  let apiKey: ValidatedKey | null = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const v = await validateKey(authHeader);
    if (!v.ok) {
      return NextResponse.json({ error: `API key ${v.reason}.` }, { status: 401 });
    }
    apiKey = v.key;
    if (!keyHasScope(apiKey, 'verify')) {
      return NextResponse.json(
        { error: 'API key lacks the `verify` scope.' },
        { status: 403 },
      );
    }
  }

  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid body', detail: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const pack = await resolvePack({
    packId: parsed.vertical_pack_id,
    packSlug: parsed.vertical_pack_slug,
    scenario: parsed.scenario,
  });
  if (!pack) {
    return NextResponse.json({ error: 'unknown pack' }, { status: 400 });
  }

  if (apiKey && !keyAllowsPack(apiKey, pack.slug)) {
    return NextResponse.json(
      { error: `API key not authorised for pack "${pack.slug}".` },
      { status: 403 },
    );
  }

  try {
    const result = await suggestFix({
      sentence: parsed.sentence,
      chunkId: parsed.chunk_id,
      pack,
      paragraph: parsed.paragraph,
    });
    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err, pack: pack.slug }, '/api/suggest-fix failed');
    return NextResponse.json(
      { error: 'suggest-fix failed', detail: err instanceof Error ? err.message : null },
      { status: 500 },
    );
  }
}
