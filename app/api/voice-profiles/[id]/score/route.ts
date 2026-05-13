import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db/client';
import { analyzeText, scoreAgainstProfile, type VoiceMetrics } from '@/lib/voice/analyze';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Schema = z.object({
  article: z.string().min(20).max(60_000),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  let parsed;
  try {
    parsed = Schema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid body', detail: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }
  const r = await query<{ metrics: { aggregated: VoiceMetrics } }>(
    `SELECT metrics FROM voice_profiles WHERE id = $1`,
    [id],
  );
  if (r.rows.length === 0) {
    return NextResponse.json({ error: 'profile not found' }, { status: 404 });
  }
  const profile = r.rows[0]!.metrics.aggregated;
  const candidate = analyzeText(parsed.article);
  const result = scoreAgainstProfile(profile, candidate);
  return NextResponse.json({
    profile_id: id,
    candidate_metrics: candidate,
    profile_metrics: profile,
    ...result,
  });
}
