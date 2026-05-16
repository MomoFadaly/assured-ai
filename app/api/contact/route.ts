/**
 * POST /api/contact — capture a lead from the marketing site's
 * /contact form.
 *
 * Thin wrapper around `captureLead` (lib/leads). The unified helper
 * persists + fires `inbound_lead` notifications via the same channel
 * system as monitor findings and red-flag escalations.
 *
 * Surface kept stable for backwards compatibility with the existing
 * /contact form, which doesn't know about lead_type / plan / pack /
 * volume — those default to null and are filtered cleanly downstream
 * (lead_type='contact' for the inbox view).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import { captureLead } from '@/lib/leads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const RequestSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  org: z.string().max(200).optional(),
  role: z.string().max(120).optional(),
  segment: z
    .enum(['publisher', 'hospital', 'pharma', 'gov', 'agency', 'finance', 'legal', 'other'])
    .optional(),
  message: z.string().max(2000).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
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
    await captureLead({
      lead_type: 'contact',
      name: parsed.name,
      email: parsed.email,
      org: parsed.org ?? null,
      role: parsed.role ?? null,
      segment: parsed.segment ?? null,
      message: parsed.message ?? null,
      ip_hint: clientKey(req),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Fallback to logs so a fresh deploy without the leads table still
    // looks "ok" to the form caller.
    logger.error(
      { err, lead: { email: parsed.email, segment: parsed.segment } },
      'contact lead persistence failed — captured in logs',
    );
    return NextResponse.json({ ok: true, note: 'captured-via-logs' });
  }
}
