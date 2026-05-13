import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db/client';
import { analyzeText, aggregateMetrics, type VoiceMetrics } from '@/lib/voice/analyze';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  scenario: z.enum(['healthcare', 'government']).optional(),
  samples: z.array(z.string().min(50).max(40_000)).min(1).max(10),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  let parsed;
  try {
    parsed = CreateSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid body', detail: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }
  const sampleMetrics: VoiceMetrics[] = parsed.samples.map(analyzeText);
  const aggregated = aggregateMetrics(sampleMetrics);
  const r = await query<{ id: string; created_at: Date }>(
    `INSERT INTO voice_profiles (name, scenario, sample_count, metrics, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [
      parsed.name,
      parsed.scenario ?? null,
      parsed.samples.length,
      JSON.stringify({ aggregated, samples: sampleMetrics }),
      parsed.notes ?? null,
    ],
  );
  const row = r.rows[0];
  if (!row) {
    return NextResponse.json({ error: 'insert failed' }, { status: 500 });
  }
  return NextResponse.json(
    {
      id: row.id,
      name: parsed.name,
      scenario: parsed.scenario ?? null,
      sample_count: parsed.samples.length,
      metrics: aggregated,
      created_at: row.created_at,
    },
    { status: 201 },
  );
}

export async function GET(): Promise<NextResponse> {
  const r = await query<{
    id: string;
    name: string;
    scenario: string | null;
    sample_count: number;
    metrics: { aggregated: VoiceMetrics };
    notes: string | null;
    created_at: Date;
  }>(
    `SELECT id, name, scenario, sample_count, metrics, notes, created_at
       FROM voice_profiles
       ORDER BY created_at DESC
       LIMIT 50`,
  );
  return NextResponse.json({
    profiles: r.rows.map((row) => ({
      id: row.id,
      name: row.name,
      scenario: row.scenario,
      sample_count: row.sample_count,
      metrics: row.metrics?.aggregated ?? null,
      notes: row.notes,
      created_at: row.created_at,
    })),
  });
}
