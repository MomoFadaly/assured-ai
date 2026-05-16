import { Check, Sparkles } from 'lucide-react';
import { SectionEyebrow } from './Pipeline';

const LAYERS = [
  { label: 'PHI / PII redaction at the I/O boundary', meta: 'Presidio sidecar · zero egress' },
  { label: 'Vertical red-flag routing — pre-LLM', meta: 'Crisis · suitability · privilege · safety' },
  { label: 'Sentence-level sourced retrieval', meta: 'pgvector · voyage-3 · 1024-dim' },
  { label: 'Hash-chained audit log', meta: 'Postgres trigger · SHA-256 · append-only' },
  { label: 'Public cryptographic proof URLs', meta: 'Re-verifiable in any browser' },
  { label: 'Compliance PDF + embed code', meta: 'CISO-filable · iframe-droppable' },
];

export function Origin() {
  return (
    <section id="origin" className="relative overflow-hidden border-b border-border/60 bg-background">
      <div className="grain pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-[1320px] px-5 section-pad">
        <SectionEyebrow n="04">Why AssuredAI exists</SectionEyebrow>

        <h2 className="mx-auto max-w-[1020px] text-balance text-center font-semibold leading-[1.0] tracking-[-0.028em] text-[42px] sm:text-[60px] md:text-[76px]">
          The hard part of regulated publishing isn&apos;t the AI.
        </h2>

        <p className="mx-auto mt-6 max-w-[720px] text-balance text-center text-[17px] leading-[1.55] text-muted-foreground sm:text-[19px]">
          It&apos;s the verification, the redaction, the audit trail, the regulatory posture &mdash;
          everything that has to be true <em>around</em> the content for the content to be safe
          to ship. Whether a human wrote it or an LLM did. That everything is the work. AssuredAI
          is the work.
        </p>

        {/* Visual proof of the argument: disproportion between "the AI" and "the work around it" */}
        <div className="mt-20 grid items-stretch gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] lg:gap-10">
          {/* LEFT — the AI as a small, almost incidental component */}
          <div className="relative">
            <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-9">
              <div className="mb-2 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                The easy part
              </div>
              <div className="mt-3 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[32px]">
                The model.
              </div>
              <p className="mt-3 text-[13.5px] leading-[1.55] text-muted-foreground sm:text-[14.5px]">
                Claude, GPT, Gemini, the next one — pick your favorite. Swap them whenever the
                benchmark shifts. None of them are AssuredAI&apos;s problem.
              </p>

              {/* a small, almost incidental "model box" — emphasizes the proportion */}
              <div className="mt-auto pt-8">
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                    Generic LLM call
                  </div>
                  <div className="mt-1.5 font-mono text-[12px] text-foreground/70">
                    model.invoke(prompt) → response
                  </div>
                </div>
                <div className="mt-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
                  ≈ one component
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — the actual work: six layers, shipping together */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[28px] bg-gradient-to-br from-primary/10 to-emerald-500/5 blur-2xl" aria-hidden />
            <div className="flex h-full flex-col rounded-2xl border border-primary/30 bg-card p-7 shadow-xl shadow-primary/10 sm:p-9">
              <div className="mb-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-primary">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_hsl(152_60%_50%/0.18)]" />
                  The hard part — what we ship
                </div>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                  6 / 6 shipped
                </span>
              </div>
              <div className="mt-3 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[32px]">
                Everything around the model.
              </div>
              <p className="mt-3 max-w-[560px] text-[13.5px] leading-[1.55] text-muted-foreground sm:text-[14.5px]">
                The six layers that make a regulated publish defensible &mdash; built end-to-end,
                wired together, deployable in your VPC by Monday. Not a feature menu. A
                compliance pipeline.
              </p>

              <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
                {LAYERS.map((l, i) => (
                  <li
                    key={l.label}
                    className="group flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[10px] font-semibold tabular-nums text-foreground/35">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="truncate text-[13px] font-semibold tracking-tight">
                          {l.label}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {l.meta}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Editorial close — names the consensus without crediting it as our origin */}
        <div className="mx-auto mt-20 grid max-w-[1080px] gap-10 border-t border-border pt-12 sm:grid-cols-2 sm:gap-16">
          <p className="text-[15px] leading-[1.7] text-foreground/80 sm:text-[16.5px]">
            For two years the industry has been naming this gap. Industry analysts
            have enumerated the layers. Vendors named them at every conference.
            CISOs named them in every procurement call. The principles aren&apos;t new.
            <span className="text-muted-foreground"> The shipped stack is.</span>
          </p>
          <p className="text-[15px] leading-[1.7] text-foreground/80 sm:text-[16.5px]">
            AssuredAI is open source under MIT, runs on infrastructure you already have, and is
            architected so a CISO can audit every layer.
            <span className="text-muted-foreground">
              {' '}Built so the next regulated brand on the front page for a published mistake
              isn&apos;t yours.
            </span>
          </p>
        </div>

        {/* Stats footer */}
        <div className="mx-auto mt-12 grid max-w-[820px] grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          <Stat n="6" label="pipeline layers" />
          <Stat n="833ms" label="median latency" />
          <Stat n="100%" label="auditable" />
          <Stat n="MIT" label="licensed" />
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-semibold tracking-[-0.02em] text-[32px] tabular-nums">{n}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
