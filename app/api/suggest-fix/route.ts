/**
 * POST /api/suggest-fix — re-anchor an unsourced sentence to its closest chunk.
 *
 * Body:
 *   {
 *     sentence: string,
 *     chunk_id: string,       // the best_match chunk's id
 *     scenario: 'healthcare' | 'government',
 *     paragraph?: string      // optional context
 *   }
 *
 * Returns: { rewrite, notes?, source, model, latency_ms }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { suggestFix } from '@/lib/verification/suggest-fix';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const RequestSchema = z.object({
  sentence: z.string().min(5).max(2000),
  chunk_id: z.string().uuid(),
  scenario: z.enum(['healthcare', 'government']),
  paragraph: z.string().max(4000).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  // Rate-limit — suggest-fix is a paid LLM call
  const limit = checkRateLimit(clientKey(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate-limited', retryAfter: limit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
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
  try {
    const result = await suggestFix({
      sentence: parsed.sentence,
      chunkId: parsed.chunk_id,
      scenario: parsed.scenario,
      paragraph: parsed.paragraph,
    });
    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err }, '/api/suggest-fix failed');
    return NextResponse.json(
      { error: 'suggest-fix failed', detail: err instanceof Error ? err.message : null },
      { status: 500 },
    );
  }
}
