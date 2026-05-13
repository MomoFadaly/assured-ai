import { notFound } from 'next/navigation';
import { query } from '@/lib/db/client';
import { PageShell } from '@/components/verify/PageShell';
import { VoiceProfileDetail } from '@/components/verify/VoiceProfileDetail';
import type { VoiceMetrics } from '@/lib/voice/analyze';

export const dynamic = 'force-dynamic';

interface ProfileRow {
  id: string;
  name: string;
  scenario: string | null;
  sample_count: number;
  metrics: { aggregated: VoiceMetrics; samples: VoiceMetrics[] };
  notes: string | null;
  created_at: Date;
}

export default async function VoiceProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await query<ProfileRow>(
    `SELECT id, name, scenario, sample_count, metrics, notes, created_at
       FROM voice_profiles WHERE id = $1`,
    [id],
  );
  const row = r.rows[0];
  if (!row) notFound();
  return (
    <PageShell
      activePath="/library"
      title={row.name}
      description={
        row.notes ? (
          <span className="italic">&ldquo;{row.notes}&rdquo;</span>
        ) : (
          <span>
            {row.sample_count} sample{row.sample_count === 1 ? '' : 's'} · created{' '}
            {new Date(row.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )
      }
    >
      <VoiceProfileDetail
        id={row.id}
        name={row.name}
        scenario={row.scenario}
        sampleCount={row.sample_count}
        aggregated={row.metrics.aggregated}
        samples={row.metrics.samples}
      />
    </PageShell>
  );
}
