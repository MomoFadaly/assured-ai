import { NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import type { VoiceMetrics } from '@/lib/voice/analyze';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const r = await query<{
    id: string;
    name: string;
    scenario: string | null;
    sample_count: number;
    metrics: { aggregated: VoiceMetrics; samples: VoiceMetrics[] };
    notes: string | null;
    created_at: Date;
  }>(
    `SELECT id, name, scenario, sample_count, metrics, notes, created_at
       FROM voice_profiles WHERE id = $1`,
    [id],
  );
  if (r.rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const row = r.rows[0]!;
  return NextResponse.json({
    id: row.id,
    name: row.name,
    scenario: row.scenario,
    sample_count: row.sample_count,
    metrics: row.metrics.aggregated,
    sample_metrics: row.metrics.samples,
    notes: row.notes,
    created_at: row.created_at,
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  await query(`DELETE FROM voice_profiles WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
