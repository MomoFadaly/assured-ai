import { Mic } from 'lucide-react';
import { SectionEyebrow, SectionHeadline, SectionLede } from './Pipeline';
import { ParallaxLayer } from './Parallax';
import { cn } from '@/lib/utils';

export function VoiceSection() {
  return (
    <section id="voice" className="relative overflow-hidden border-b border-border/60 bg-background">
      <div className="pointer-events-none absolute -inset-x-20 top-0 h-[420px] aurora-bg opacity-[0.08] dark:opacity-[0.18]" aria-hidden />
      <div className="relative mx-auto max-w-[1320px] px-5 py-28 sm:py-36">
        <SectionEyebrow n="08">Voice match</SectionEyebrow>
        <SectionHeadline>
          Compliance keeps you out of court. Voice keeps you on brand.
        </SectionHeadline>
        <SectionLede>
          Upload three to five articles from your archive. AssuredAI extracts a voice signature —
          reading level, sentence rhythm, vocabulary, first vs. second-person preference — and
          scores every new draft against it.
        </SectionLede>

        <div className="mt-20 grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          {/* Editorial photo — author at desk */}
          <ParallaxLayer strength={-0.06} className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
              <div
                className="absolute inset-0 ken-burns photo-cinematic"
                style={{
                  backgroundImage:
                    'url(https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=80)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                aria-hidden
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" aria-hidden />
              <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-background/85 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foreground backdrop-blur-sm">
                <Mic className="h-3 w-3" />
                Demo voice profile · Patient education
              </div>
              <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/15 bg-foreground/85 p-4 text-background backdrop-blur">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-background/65">
                  Voice signature
                </div>
                <div className="mt-2 grid grid-cols-2 gap-y-1 text-[12px]">
                  <span className="text-background/60">Reading grade</span>
                  <span className="text-right font-mono tabular-nums">3.4</span>
                  <span className="text-background/60">Avg sentence</span>
                  <span className="text-right font-mono tabular-nums">8w</span>
                  <span className="text-background/60">Direct address</span>
                  <span className="text-right font-mono tabular-nums">8.5%</span>
                  <span className="text-background/60">Passive voice</span>
                  <span className="text-right font-mono tabular-nums">4.2%</span>
                </div>
              </div>
            </div>
          </ParallaxLayer>

          {/* Scorecard with bars */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <div className="mb-4 flex items-center gap-3 border-b border-border/60 pb-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mic className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-[14.5px] font-semibold">Demo voice profile · Patient education</div>
              <div className="text-[11.5px] text-muted-foreground">
                Built from 3 archive samples · 234 sentences analyzed
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Voice match
              </div>
              <div className="text-[26px] font-semibold tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
                34<span className="text-[14px] font-normal text-amber-600/60 dark:text-amber-400/60">/100</span>
              </div>
              <div className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                Significantly off voice
              </div>
            </div>
          </div>

          <div className="grid items-center gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                Profile (target)
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-[13px] leading-relaxed dark:border-emerald-900 dark:bg-emerald-950/20">
                If you have high blood pressure, making healthy lifestyle changes can help lower
                it. Try to eat plenty of fruits and vegetables. Walking counts.
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-red-700 dark:text-red-300">
                Candidate (off voice)
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50/40 p-3 text-[13px] leading-relaxed dark:border-red-900 dark:bg-red-950/20">
                Notwithstanding the multifactorial etiology of essential hypertension,
                evidence-based interventions demonstrate that dietary sodium restriction…
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-1.5">
            <DeviationBar label="Reading grade level" profile="3.4" candidate="21.3" pct={95} />
            <DeviationBar label="Avg sentence length" profile="8w" candidate="13w" pct={45} />
            <DeviationBar label="Direct address (you)" profile="8.5%" candidate="0%" pct={85} />
            <DeviationBar label="Passive voice" profile="4.2%" candidate="33.3%" pct={80} />
          </div>

          <p className="mt-5 text-center text-[11.5px] text-muted-foreground">
            Editor sees the four dimensions that drift the most. One click takes them to a rewrite
            that lands the draft inside the green zone.
          </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeviationBar({
  label,
  profile,
  candidate,
  pct,
}: {
  label: string;
  profile: string;
  candidate: string;
  pct: number;
}) {
  const tone = pct > 70 ? 'bg-red-500' : pct > 40 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-3 text-[12px]">
      <span className="w-44 shrink-0 truncate text-foreground">{label}</span>
      <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span className={cn('block h-full rounded-full', tone)} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-36 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
        <span className="text-red-600 dark:text-red-400">{candidate}</span>
        <span className="mx-1 opacity-50">vs</span>
        <span className="text-emerald-600 dark:text-emerald-400">{profile}</span>
      </span>
    </div>
  );
}

export function WordPressDiagram() {
  return (
    <section id="integrations" className="relative overflow-hidden border-b border-border/60 bg-card/40">
      <div className="relative mx-auto max-w-[1320px] px-5 py-28 sm:py-36">
        <SectionEyebrow n="09">The drop-in</SectionEyebrow>
        <SectionHeadline>
          Lives inside the WordPress stack you already ship.
        </SectionHeadline>
        <SectionLede>
          Verified articles POST directly into your <code className="rounded bg-muted px-1.5 py-0.5 text-[15px] font-mono">wp-json/wp/v2/posts</code> draft queue
          with the audit ID stitched in as post meta. Editors review and publish from the WordPress
          admin they already use. No new tool to learn.
        </SectionLede>

        <div className="mt-20 grid items-start gap-12 lg:grid-cols-[1.05fr_1fr]">
          {/* Left: editor workflow visual */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-primary/10 to-emerald-500/5 blur-2xl" aria-hidden />
            <div className="space-y-3">
              <FlowStep
                num="01"
                title="Editor pastes"
                body="A draft from any source — your writers, in-editor AI tools, ChatGPT, internal AI."
              />
              <FlowStep
                num="02"
                title="AssuredAI verifies"
                body="Four-check pipeline runs. PII redacted, claims sourced, disclaimers enforced, proof URL minted."
                highlight
              />
              <FlowStep
                num="03"
                title="Drops into WordPress"
                body="Article POSTs to your existing draft queue with the audit ID stitched in as post meta."
              />
            </div>
          </div>

          {/* Right: real API response */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border bg-[#0b1320] text-white shadow-2xl shadow-foreground/15">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-400/80" />
                    <span className="size-2.5 rounded-full bg-amber-400/80" />
                    <span className="size-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="ml-3 font-mono text-[10.5px] text-white/50">response.json</span>
                </div>
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-emerald-300">
                  201 Created
                </span>
              </div>
              <pre className="overflow-x-auto p-6 font-mono text-[12.5px] leading-[1.7]">
{`POST /api/wp-mock/drafts
{
  "id": 1,
  "title": "DASH eating plan for blood pressure",
  "status": "draft",
  "audit_log_id": 214,
  "_links": {
    "self":  { "href": "/api/wp-mock/drafts/1" },
    "ui":    { "href": "/wp-mock/drafts/1" },
    "proof": { "href": "/v/214" }
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowStep({ num, title, body, highlight }: { num: string; title: string; body: string; highlight?: boolean }) {
  return (
    <div className={cn(
      'flex gap-5 rounded-2xl border bg-card p-6 shadow-sm transition-colors',
      highlight ? 'border-primary/30 ring-2 ring-primary/15' : 'border-border'
    )}>
      <div className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-xl font-mono text-[15px] font-semibold tabular-nums',
        highlight ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.04] text-foreground/60 ring-1 ring-foreground/10',
      )}>
        {num}
      </div>
      <div>
        <h3 className={cn('text-[18px] font-semibold tracking-tight', highlight && 'text-primary')}>
          {title}
        </h3>
        <p className="mt-1.5 text-[14px] leading-[1.55] text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

