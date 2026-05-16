/**
 * POST /api/wizard/provision — create a sandbox tenant from the
 * /get-started Step 6 form.
 *
 * Body: every answer the visitor entered, plus name / email / password.
 *
 * Provisioning is transactional via `provisionSandbox` (lib/wizard/
 * provision.ts) — tenant + owner user + 8 seed sources + first API
 * key + draft notification channel, all in one call. If the email is
 * already in use, returns 409 so the wizard prompts sign-in instead.
 *
 * The API key is returned in plaintext ONCE; it's never persisted
 * unhashed anywhere. Caller streams it to the browser's reveal screen
 * and forgets it.
 *
 * Rate limited per IP — 3 sandbox provisions per IP per day to prevent
 * tenant-spam from one attacker.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import { provisionSandbox } from '@/lib/wizard/provision';
import { evaluatePassword } from '@/lib/auth/password';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const INDUSTRIES = ['healthcare', 'finance', 'government', 'legal'] as const;
const REGIONS = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-southeast-2'] as const;

const RequestSchema = z.object({
  industry: z.enum(INDUSTRIES),
  role: z.string().min(1).max(60),
  contentSources: z.array(z.string()).default([]),
  cmsPlatform: z.string().nullable(),
  monthlyVolume: z.string().nullable(),
  compliance: z.object({
    baaNeeded: z.boolean(),
    soc2Needed: z.boolean(),
    fedrampNeeded: z.boolean(),
    region: z.enum(REGIONS),
    retentionDays: z.number().int().min(30).max(36_500),
  }),
  account: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(200),
    password: z.string().min(10).max(200),
  }),
  sampleAuditLogId: z.number().int().positive().nullable(),
});

export async function POST(req: Request): Promise<Response> {
  // Aggressive: sandbox creation is permanent (until GC) and we don't
  // want anyone provisioning hundreds. 5/min shared bucket caps it.
  const limit = checkRateLimit(`wizard:provision:${clientKey(req)}`);
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
      { error: 'invalid_body', detail: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  // Password strength sanity check — same evaluator the sign-up form uses.
  const strength = evaluatePassword(parsed.account.password, parsed.account.email);
  if (!strength.ok) {
    return NextResponse.json(
      { error: 'weak_password', message: strength.reasons[0] ?? 'Pick a stronger password.' },
      { status: 400 },
    );
  }

  try {
    const result = await provisionSandbox({
      industry: parsed.industry,
      role: parsed.role,
      contentSources: parsed.contentSources,
      cmsPlatform: parsed.cmsPlatform,
      monthlyVolume: parsed.monthlyVolume,
      compliance: parsed.compliance,
      account: parsed.account,
      sampleAuditLogId: parsed.sampleAuditLogId,
    });

    return NextResponse.json({
      ok: true,
      tenant: {
        id: result.tenantId,
        slug: result.tenantSlug,
      },
      api_key: {
        prefix: result.apiKeyPrefix,
        plaintext: result.apiKeyPlaintext, // shown once
      },
      seed_source_count: result.seedSourceCount,
      first_audit_log_id: result.firstAuditLogId,
      channel_draft_id: result.channelDraftId,
      sign_in_url: '/sign-in',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'EMAIL_IN_USE') {
      return NextResponse.json(
        {
          error: 'email_in_use',
          message: 'An account with that email already exists. Sign in instead, or use a different email.',
          sign_in_url: '/sign-in',
        },
        { status: 409 },
      );
    }
    logger.error({ err, email: parsed.account.email, industry: parsed.industry }, 'wizard provision failed');
    return NextResponse.json(
      { error: 'provision_failed', message },
      { status: 502 },
    );
  }
}
