/**
 * POST /api/wizard/classify
 *
 * Lightweight industry classifier for the home-page verifier demo.
 * Stateless — the classify logic lives in `lib/marketing/classify-industry`.
 *
 * This endpoint exists (rather than running the classifier purely
 * client-side) because we want a single source of truth for the
 * vocabulary + scoring tuning. When the heuristic gets upgraded to an
 * LLM-assisted classifier later, the wire shape stays identical.
 *
 * Body:  { text: string }
 * Returns: ClassifyResult (see lib/marketing/classify-industry)
 *
 * Rate-limited per IP — 60/min, 600/day — because a debounced textarea
 * onChange can fire dozens of times per session. Cheaper than the
 * verify endpoint, so the ceiling is higher.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { classifyIndustry } from '@/lib/marketing/classify-industry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  text: z.string().max(20_000),
});

/**
 * No rate limit — the classifier is a pure synchronous function with no
 * downstream API cost. The textarea debounce on the client keeps call
 * volume low; even a pathological burst is bounded by Vercel's CPU budget.
 */
export async function POST(req: Request): Promise<Response> {
  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const result = classifyIndustry(parsed.text);
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
