'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2, Mic, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Scenario = 'healthcare' | 'government' | '';

export function VoiceProfileForm() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [scenario, setScenario] = React.useState<Scenario>('healthcare');
  const [notes, setNotes] = React.useState('');
  const [samples, setSamples] = React.useState<string[]>(['', '', '']);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const addSample = () => setSamples((s) => [...s, '']);
  const removeSample = (i: number) =>
    setSamples((s) => (s.length > 1 ? s.filter((_, idx) => idx !== i) : s));
  const updateSample = (i: number, v: string) =>
    setSamples((s) => s.map((x, idx) => (idx === i ? v : x)));

  const validSamples = samples.map((s) => s.trim()).filter((s) => s.length >= 50);
  const canSubmit =
    !submitting && name.trim().length > 0 && validSamples.length >= 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/voice-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          scenario: scenario || undefined,
          samples: validSamples,
          notes: notes.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail ?? `HTTP ${r.status}`);
      }
      const data = (await r.json()) as { id: string };
      router.push(`/voice/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Mic className="h-4 w-4" />
        </div>
        <h2 className="text-[16px] font-semibold tracking-tight">Profile metadata</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Give the profile a name an editor will recognize.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="text-[12px] font-medium text-muted-foreground">
              Profile name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cleveland Clinic Patient Education"
              className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[13.5px] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              disabled={submitting}
              required
            />
          </div>
          <div>
            <label htmlFor="scenario" className="text-[12px] font-medium text-muted-foreground">
              Scenario
            </label>
            <select
              id="scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
              className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-[13.5px] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              disabled={submitting}
            >
              <option value="healthcare">Healthcare</option>
              <option value="government">Government</option>
              <option value="">Any</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="notes" className="text-[12px] font-medium text-muted-foreground">
            Editor notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder='"Warm and direct, sixth-grade reading level, second-person voice."'
            className="mt-1.5 w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-[13.5px] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            disabled={submitting}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight">Sample articles</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Paste 3–5 articles that capture the voice. More samples = sharper profile.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={addSample} disabled={submitting || samples.length >= 10}>
            <Plus className="h-3.5 w-3.5" /> Add sample
          </Button>
        </div>
        <div className="space-y-4">
          {samples.map((s, i) => (
            <div key={i} className="relative">
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor={`sample-${i}`} className="text-[11.5px] font-medium text-muted-foreground">
                  Sample {i + 1}
                  {s.trim().length >= 50 && (
                    <span className="ml-2 text-emerald-600">✓ {s.trim().split(/\s+/).filter(Boolean).length} words</span>
                  )}
                  {s.trim().length > 0 && s.trim().length < 50 && (
                    <span className="ml-2 text-amber-600">Too short (need 50+ chars)</span>
                  )}
                </label>
                {samples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSample(i)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove sample"
                    disabled={submitting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <textarea
                id={`sample-${i}`}
                value={s}
                onChange={(e) => updateSample(i, e.target.value)}
                rows={5}
                placeholder="Paste a representative article from the publisher's archive…"
                className="w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-[13.5px] leading-[1.6] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                disabled={submitting}
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {validSamples.length} of {samples.length} samples ready ·{' '}
          {validSamples.reduce((sum, s) => sum + s.split(/\s+/).filter(Boolean).length, 0).toLocaleString()}{' '}
          total words
        </p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 sticky bottom-0 -mx-2 border-t border-border bg-background/80 px-2 py-3 backdrop-blur-sm">
        <Button type="button" variant="ghost" onClick={() => history.back()} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Building profile…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Build voice profile
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
