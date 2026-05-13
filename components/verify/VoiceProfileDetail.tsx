'use client';

import * as React from 'react';
import { Loader2, Sparkles, Mic, BookOpen, Pencil, Volume2, FileText, Type, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VoiceMetrics } from '@/lib/voice/analyze';

interface ScoreResponse {
  match_score: number;
  weighted_distance: number;
  candidate_metrics: VoiceMetrics;
  profile_metrics: VoiceMetrics;
  dimensions: Array<{
    key: keyof VoiceMetrics;
    label: string;
    profile_value: number;
    candidate_value: number;
    normalized_delta: number;
    weight: number;
  }>;
}

export function VoiceProfileDetail({
  id,
  name,
  scenario,
  sampleCount,
  aggregated,
  samples,
}: {
  id: string;
  name: string;
  scenario: string | null;
  sampleCount: number;
  aggregated: VoiceMetrics;
  samples: VoiceMetrics[];
}) {
  const [scoreInput, setScoreInput] = React.useState('');
  const [scoring, setScoring] = React.useState(false);
  const [score, setScore] = React.useState<ScoreResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const runScore = async () => {
    if (scoring) return;
    setScoring(true);
    setScore(null);
    setError(null);
    try {
      const r = await fetch(`/api/voice-profiles/${id}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article: scoreInput }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as ScoreResponse;
      setScore(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">{name}</h2>
              <p className="text-[12px] text-muted-foreground">
                Aggregated from {sampleCount} sample{sampleCount === 1 ? '' : 's'}
                {scenario && <> · <Badge variant="muted" className="ml-1">{scenario}</Badge></>}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<BookOpen className="h-3 w-3" />} label="Grade level" value={aggregated.flesch_kincaid_grade.toFixed(1)} hint="Flesch-Kincaid" />
          <Stat icon={<Type className="h-3 w-3" />} label="Sentence length" value={`${Math.round(aggregated.avg_sentence_length_words)}w`} hint="words / sentence" />
          <Stat icon={<Pencil className="h-3 w-3" />} label="Paragraph length" value={`${aggregated.avg_paragraph_length_sentences.toFixed(1)}s`} hint="sentences / paragraph" />
          <Stat icon={<Volume2 className="h-3 w-3" />} label="Direct address" value={`${(aggregated.second_person_ratio * 100).toFixed(1)}%`} hint='"you" frequency' />
          <Stat icon={<Hash className="h-3 w-3" />} label="Vocabulary" value={aggregated.type_token_ratio.toFixed(2)} hint="type/token ratio" />
          <Stat icon={<FileText className="h-3 w-3" />} label="Passive" value={`${(aggregated.passive_indicator_ratio * 100).toFixed(1)}%`} hint="passive-voice signals" />
          <Stat icon={<FileText className="h-3 w-3" />} label="Questions" value={`${(aggregated.question_ratio * 100).toFixed(1)}%`} hint="of sentences" />
          <Stat icon={<FileText className="h-3 w-3" />} label="Bullets" value={`${aggregated.bullet_density_per_1000.toFixed(1)}/1k`} hint="bullets per 1,000 words" />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            <Sparkles className="h-3 w-3" /> Score an article
          </div>
          <h3 className="text-[16px] font-semibold tracking-tight">Test the profile</h3>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Paste a draft to see how closely it matches this voice. Off-spec dimensions are
            highlighted so editors know what to tweak.
          </p>
        </div>
        <textarea
          value={scoreInput}
          onChange={(e) => setScoreInput(e.target.value)}
          rows={6}
          placeholder="Paste a draft to score against this voice profile…"
          className="w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-[13.5px] leading-[1.6] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          disabled={scoring}
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {scoreInput.trim().split(/\s+/).filter(Boolean).length} words
          </p>
          <Button onClick={runScore} disabled={scoring || scoreInput.trim().length < 20}>
            {scoring ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Scoring…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Score this draft
              </>
            )}
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-[12.5px] text-red-600">{error}</p>
        )}
        {score && <ScoreView score={score} />}
      </section>

      {samples.length > 1 && (
        <section className="rounded-2xl border border-border bg-card/60 p-6">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Per-sample breakdown
          </h3>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-[12.5px]">
              <thead className="border-b border-border bg-muted/30 text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Sample</th>
                  <th className="px-3 py-2 font-semibold">Words</th>
                  <th className="px-3 py-2 font-semibold">Grade</th>
                  <th className="px-3 py-2 font-semibold">Sent.</th>
                  <th className="px-3 py-2 font-semibold">2nd person</th>
                  <th className="px-3 py-2 font-semibold">Passive</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-3 py-2">#{i + 1}</td>
                    <td className="px-3 py-2 tabular-nums">{s.total_words.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{s.flesch_kincaid_grade.toFixed(1)}</td>
                    <td className="px-3 py-2 tabular-nums">{Math.round(s.avg_sentence_length_words)}w</td>
                    <td className="px-3 py-2 tabular-nums">{(s.second_person_ratio * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2 tabular-nums">{(s.passive_indicator_ratio * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-[18px] font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function ScoreView({ score }: { score: ScoreResponse }) {
  const tone = score.match_score >= 80 ? 'success' : score.match_score >= 60 ? 'warning' : 'danger';
  const toneClass = {
    success: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30',
    warning: 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30',
    danger: 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30',
  }[tone];
  const toneText = {
    success: 'text-emerald-800 dark:text-emerald-200',
    warning: 'text-amber-800 dark:text-amber-200',
    danger: 'text-red-800 dark:text-red-200',
  }[tone];

  return (
    <div className={cn('mt-5 rounded-xl border p-5', toneClass)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={cn('text-[11px] font-semibold uppercase tracking-[0.12em]', toneText)}>
            Voice match score
          </div>
          <div className={cn('mt-1 text-[36px] font-semibold tabular-nums leading-none', toneText)}>
            {score.match_score}
            <span className="text-[18px] font-normal opacity-70"> / 100</span>
          </div>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          {score.match_score >= 80
            ? 'On brand — ship it'
            : score.match_score >= 60
              ? 'Editor review recommended'
              : 'Significantly off voice — rewrite'}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Biggest deviations
        </div>
        <div className="space-y-1.5">
          {score.dimensions.slice(0, 5).map((d) => {
            const pct = Math.min(100, Math.round(d.normalized_delta * 100));
            const matched = d.normalized_delta < 0.15;
            return (
              <div key={d.key} className="flex items-center gap-2 text-[12px]">
                <span className="w-44 shrink-0 truncate text-foreground">{d.label}</span>
                <span className="flex-1">
                  <span className="block h-1.5 w-full rounded-full bg-muted">
                    <span
                      className={cn(
                        'block h-full rounded-full transition-all',
                        matched ? 'bg-emerald-500' : pct > 60 ? 'bg-red-500' : 'bg-amber-500',
                      )}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </span>
                </span>
                <span className="w-32 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                  {formatVal(d.key, d.candidate_value)} <span className="opacity-60">vs</span>{' '}
                  {formatVal(d.key, d.profile_value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatVal(key: keyof VoiceMetrics, v: number): string {
  if (key.endsWith('ratio')) return `${(v * 100).toFixed(1)}%`;
  if (key.includes('per_1000')) return v.toFixed(1);
  return v.toFixed(1);
}
