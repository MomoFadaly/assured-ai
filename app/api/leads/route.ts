/**
 * POST /api/leads — unified lead-capture endpoint.
 *
 * Backs `/book-a-demo`, `/talk-to-sales`, and any other inbound form
 * that doesn't fit /contact. Persists to `contact_leads` and fans a
 * notification event out to configured Slack / email / webhook
 * channels.
 *
 * Rate-limited (5/min, 50/day per IP) — same posture as /api/contact.
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { captureLead, LeadInputSchema } from '@/lib/leads';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function POST(req: Request): Promise<NextResponse> {
  const limit = checkRateLimit(`leads:${clientKey(req)}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate-limited', retryAfter: limit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  let parsed;
  try {
    parsed = LeadInputSchema.parse({ ...(raw as object), ip_hint: clientKey(req) });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'invalid body', issues: err.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  try {
    const { id } = await captureLead(parsed);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    logger.error(
      { err, email: parsed.email, leadType: parsed.lead_type },
      'lead capture persistence failed',
    );
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 });
  }
}
