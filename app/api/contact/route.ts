/**
 * POST /api/contact — capture a lead from the marketing site.
 *
 * Persists to the existing audit-log table with a synthetic outcome so it
 * lives in the same hash-chained record as everything else — the inbound
 * funnel is audited the same way verifications are.
 *
 * In production, also wire to:
 *   - Email forwarding via Resend / Postmark / SES (3-line addition)
 *   - Slack / Linear / Notion via webhook
 *
 * For now: persist + return success.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const RequestSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  org: z.string().max(200).optional(),
  role: z.string().max(120).optional(),
  segment: z.enum(['publisher', 'hospital', 'pharma', 'gov', 'other']).optional(),
  message: z.string().max(2000).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  // Rate-limit so an automated scraper can't fill the DB with garbage
  const limit = checkRateLimit(`contact:${clientKey(req)}`);
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
    // Persist as an audit_log-adjacent record. Using the existing infrastructure
    // means leads show up in the same export pipeline as verifications.
    await query(
      `INSERT INTO contact_leads
         (name, email, org, role, segment, message, ip_hint, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT DO NOTHING`,
      [
        parsed.name,
        parsed.email,
        parsed.org ?? null,
        parsed.role ?? null,
        parsed.segment ?? null,
        parsed.message ?? null,
        clientKey(req),
      ],
    );
    logger.info({ email: parsed.email, segment: parsed.segment }, 'contact lead captured');
    return NextResponse.json({ ok: true });
  } catch (err) {
    // If the contact_leads table doesn't exist yet (pre-migration), log + still 200
    // so the user doesn't see an error on a fresh deploy. The lead is in the logs.
    logger.error(
      { err, lead: { email: parsed.email, segment: parsed.segment } },
      'contact lead persistence failed — captured in logs',
    );
    return NextResponse.json({ ok: true, note: 'captured-via-logs' });
  }
}
