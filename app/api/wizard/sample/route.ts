/**
 * POST /api/wizard/sample — run a live verification at Step 5 of the
 * /get-started wizard.
 *
 * Public, unauthenticated (the whole wizard is pre-signup). Rate
 * limited per IP to protect the LLM + embedding budget — each
 * verification costs ~$0.30 in API calls (Anthropic + Voyage +
 * Presidio).
 *
 * Body:
 *   { industry: 'healthcare'|'finance'|'government'|'legal',
 *     article: string  ← 80–8000 chars }
 *
 * Returns:
 *   { audit_log_id: number,
 *     proof_url:    'https://assuredai.online/v/<id>',
 *     verdict:      'answered'|'cannot_answer'|'blocked'|'escalated',
 *     citations:    number,
 *     phi_redacted: number,
 *     verification_detail: { … the rich audit detail } }
 *
 * Uses the SAME runVerifyLifecycle as the production verifier — what
 * the wizard runs is exactly what the prospect's sandbox will run.
 * That's the promise of "real proof, not marketing."
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import { runVerifyLifecycle } from '@/lib/verification/lifecycle';
import { getPackBySlug } from '@/lib/packs/registry';
import { tenantForServiceCall } from '@/lib/tenants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SUPPORTED_INDUSTRIES = ['healthcare', 'finance', 'government', 'legal'] as const;

const RequestSchema = z.object({
  industry: z.enum(SUPPORTED_INDUSTRIES),
  article: z.string().min(80).max(8_000),
});

export async function POST(req: Request): Promise<Response> {
  // Aggressive rate limit — anyone running the wizard hits 1, maybe 2.
  // The shared bucket caps at 5/min and 50/day per IP; that's the right
  // ceiling for a public unmetered verification endpoint.
  const limit = checkRateLimit(`wizard:sample:${clientKey(req)}`);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'rate-limited',
        message:
          'Too many sample verifications from your IP. Try again in a few minutes, or use the live verifier at /chat for an unmetered run.',
        retryAfter: limit.retryAfter,
      },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', detail: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const pack = await getPackBySlug(parsed.industry);
  if (!pack) {
    return NextResponse.json(
      { error: 'pack_not_seeded', message: `The ${parsed.industry} pack hasn't been seeded on this deployment yet.` },
      { status: 503 },
    );
  }

  const tenant = await tenantForServiceCall({ apiKeyTenantId: null });

  try {
    const started = Date.now();
    const result = await runVerifyLifecycle({
      pack,
      tenant_id: tenant.id,
      input_mode: 'paste',
      article: parsed.article,
      user_session_id: `wizard:${clientKey(req)}`,
    });
    const elapsed_ms = Date.now() - started;

    const auditLogId = 'audit_log_id' in result ? result.audit_log_id : null;
    const verdict = result.kind;
    const proofUrl = auditLogId
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://assuredai.online'}/v/${auditLogId}`
      : null;

    // Pull out the useful summary numbers the wizard UI wants to display.
    const detail = (result as { verification_detail?: Record<string, unknown> }).verification_detail ?? {};
    const citations = Number(
      (detail as Record<string, unknown>).citation_count ??
        ((result as { citations?: unknown[] }).citations?.length ?? 0),
    );
    const phiRedacted = Number(
      (detail as Record<string, unknown>).recognizer_hits ??
        ((result as { recognizer_hits?: unknown[] }).recognizer_hits?.length ?? 0),
    );

    logger.info(
      {
        industry: parsed.industry,
        auditLogId,
        verdict,
        citations,
        phiRedacted,
        elapsed_ms,
      },
      'wizard sample verification complete',
    );

    return NextResponse.json({
      ok: true,
      audit_log_id: auditLogId,
      proof_url: proofUrl,
      verdict,
      citations,
      phi_redacted: phiRedacted,
      elapsed_ms,
      verification_detail: detail,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, industry: parsed.industry }, 'wizard sample verification failed');
    return NextResponse.json(
      {
        error: 'verification_failed',
        message,
      },
      { status: 502 },
    );
  }
}
