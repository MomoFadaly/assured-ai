/**
 * POST /api/verify — the new AssuredAI entry point.
 *
 * Accepts either a pasted article or a brief for AI drafting, then runs the
 * full verification lifecycle (PII redaction, red-flag scan, fact-check,
 * disclaimer enforcement, output redaction, audit). Returns an annotated
 * verification report.
 *
 * Body:
 *   {
 *     scenario: 'healthcare' | 'government',
 *     input_mode: 'paste' | 'draft',
 *     article?: string,                    // required when input_mode === 'paste'
 *     brief?: string,                      // required when input_mode === 'draft'
 *     format?: 'qa'|'handout'|'faq'|'social'|'email'  // optional when 'draft'
 *   }
 *
 * Returns: VerifyResponse (see lib/verification/lifecycle.ts).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runVerifyLifecycle } from '@/lib/verification/lifecycle';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-session-id',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const RequestSchema = z
  .object({
    scenario: z.enum(['healthcare', 'government']),
    input_mode: z.enum(['paste', 'draft']),
    article: z.string().max(50_000).optional(),
    brief: z.string().max(2_000).optional(),
    format: z.enum(['qa', 'handout', 'faq', 'social', 'email']).optional(),
  })
  .refine(
    (v) =>
      (v.input_mode === 'paste' && typeof v.article === 'string' && v.article.length > 0) ||
      (v.input_mode === 'draft' && typeof v.brief === 'string' && v.brief.length > 0),
    {
      message:
        'paste mode requires `article`; draft mode requires `brief`.',
    },
  );

export async function POST(req: Request): Promise<NextResponse> {
  // Rate-limit before doing ANY work. Each /api/verify call costs $0.10–0.30
  // in paid API credits; the limiter is cost protection, not auth.
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

  let parsed;
  try {
    const body = await req.json();
    parsed = RequestSchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body', details: err instanceof Error ? err.message : null },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const sessionId = req.headers.get('x-session-id') ?? null;

  try {
    const result = await runVerifyLifecycle({
      scenario: parsed.scenario,
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
      },
    });
  } catch (err) {
    logger.error({ err }, '/api/verify unhandled error');
    return NextResponse.json(
      { kind: 'error', message: 'Internal server error.', audit_log_id: null, latency_ms: 0 },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
