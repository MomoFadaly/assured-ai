import { query } from '@/lib/db/client';
import Link from 'next/link';
import { Mic, Sparkles, Plus } from 'lucide-react';
import { PageShell } from '@/components/verify/PageShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { VoiceMetrics } from '@/lib/voice/analyze';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Voice profiles',
  description: 'Brand-voice profiles: measurable, scoreable house style for every draft.',
};

interface ProfileRow {
  id: string;
  name: string;
  scenario: string | null;
  sample_count: number;
  metrics: { aggregated: VoiceMetrics };
  notes: string | null;
  created_at: Date;
}

async function getProfiles(): Promise<ProfileRow[]> {
  const r = await query<ProfileRow>(
    `SELECT id, name, scenario, sample_count, metrics, notes, created_at
       FROM voice_profiles
       ORDER BY created_at DESC
       LIMIT 50`,
  );
  return r.rows;
}

export default async function VoicePage() {
  const profiles = await getProfiles();
  return (
    <PageShell
      activePath="/library"
      title="Brand voice profiles"
      description={
        <>
          Upload 3–5 articles in a publisher&apos;s house style. AssuredAI extracts a voice profile
          — reading level, sentence rhythm, vocabulary, first/second-person preference,
          structural patterns — and scores every new draft against it. The score shows up in the
          verification result so editors know if a piece is on-brand before they ship it.
        </>
      }
      actions={
        <Button asChild>
          <Link href="/voice/new">
            <Plus className="h-3.5 w-3.5" /> New profile
          </Link>
        </Button>
      }
    >
      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <Mic className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" />
          <p className="text-[14px] font-medium">No voice profiles yet</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Build one in 60 seconds — paste 3–5 articles from your publisher&apos;s archive.
          </p>
          <Button asChild className="mt-5">
            <Link href="/voice/new">
              <Plus className="h-4 w-4" /> Create your first profile
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <Link
              key={p.id}
              href={`/voice/${p.id}`}
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md"
            >
              <div className="mb-3 inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mic className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="truncate text-[15px] font-semibold tracking-tight group-hover:text-primary">
                  {p.name}
                </h3>
                {p.scenario && <Badge variant="muted">{p.scenario}</Badge>}
              </div>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                {p.sample_count} sample{p.sample_count === 1 ? '' : 's'} ·{' '}
                {new Date(p.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[11.5px]">
                <Stat label="Grade level" value={p.metrics.aggregated.flesch_kincaid_grade.toFixed(1)} />
                <Stat
                  label="Avg sentence"
                  value={`${Math.round(p.metrics.aggregated.avg_sentence_length_words)}w`}
                />
                <Stat
                  label="2nd person"
                  value={`${(p.metrics.aggregated.second_person_ratio * 100).toFixed(1)}%`}
                />
                <Stat
                  label="Passive"
                  value={`${(p.metrics.aggregated.passive_indicator_ratio * 100).toFixed(1)}%`}
                />
              </dl>
              {p.notes && (
                <p className="mt-3 line-clamp-2 text-[11.5px] italic text-muted-foreground">
                  &ldquo;{p.notes}&rdquo;
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      <section className="mt-10 rounded-2xl border border-border bg-card/60 p-6">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Why voice profiles matter
        </div>
        <h3 className="text-[16px] font-semibold tracking-tight">
          Compliance keeps you out of trouble. Voice keeps you on brand.
        </h3>
        <p className="mt-2 max-w-[700px] text-[13.5px] leading-relaxed text-muted-foreground">
          Healthcare publishers spend years training editors on house style. When AI joins the
          workflow, that consistency erodes — every output sounds slightly like ChatGPT instead
          of like your own newsroom. AssuredAI&apos;s voice profile reverses that:{' '}
          <strong className="text-foreground">your house style becomes a measurable, scoreable thing</strong>,
          and every draft shows its match score before it ships.
        </p>
      </section>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 tabular-nums">{value}</dd>
    </div>
  );
}
