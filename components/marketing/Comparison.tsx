import { Check, X, Minus, ShieldCheck } from 'lucide-react';
import { SectionEyebrow, SectionHeadline, SectionLede } from './Pipeline';
import { CursorSpotlight } from './Parallax';
import { SectionBackdrop } from './SectionBackdrop';

type Cell = 'yes' | 'no' | 'partial';

// Only 2 alternative columns now — AssuredAI gets its own hero card above
const ROWS: Array<{ label: string; sub: string; us: Cell; cells: [Cell, Cell] }> = [
  { label: 'PII / PHI redaction at I/O boundary', sub: 'Patient names, MRNs, emails caught before the LLM sees them', us: 'yes', cells: ['no', 'no'] },
  { label: 'Medical red-flag auto-block', sub: 'Cardiac, suicidal, overdose routes to a hotline, not the model', us: 'yes', cells: ['no', 'no'] },
  { label: 'Sentence-level source verification', sub: 'Every claim matched against your vetted library', us: 'yes', cells: ['no', 'no'] },
  { label: 'Public cryptographic proof URL', sub: 'Anyone with a browser can re-verify SHA-256 chain', us: 'yes', cells: ['no', 'no'] },
  { label: 'Hash-chained tamper-evident audit log', sub: 'Postgres trigger enforces append-only', us: 'yes', cells: ['no', 'partial'] },
  { label: 'Compliance PDF export for CISO filing', sub: 'One-click filable evidence', us: 'yes', cells: ['no', 'partial'] },
  { label: 'Brand voice profile + scoring', sub: '17 metrics from your archive', us: 'yes', cells: ['no', 'no'] },
  { label: 'Ships in weeks, not quarters', sub: 'Drops into your existing CMS', us: 'yes', cells: ['partial', 'no'] },
];

const ALT_COLS = [
  { label: 'Generic enterprise LLM', sub: 'writing only' },
  { label: 'Build in-house', sub: 'quarters of work' },
] as const;

export function Comparison() {
  return (
    <section id="category" className="relative overflow-hidden border-b border-border/60 bg-background">
      <SectionBackdrop
        src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2000&q=75"
        intensity="subtle"
        position="center"
      />
      <CursorSpotlight className="pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[480px] aurora-bg opacity-[0.08] dark:opacity-[0.20]" aria-hidden />
      <div className="relative mx-auto max-w-[1320px] px-5 py-28 sm:py-36">
        <SectionEyebrow n="10">The category</SectionEyebrow>
        <h2 className="mx-auto max-w-[960px] text-balance text-center leading-[1.0] tracking-[-0.025em] text-[40px] sm:text-[56px] md:text-[68px]">
          <span className="font-light text-foreground/70">The only stack that ships</span>{' '}
          <span className="font-semibold">a proof URL.</span>
        </h2>
        <SectionLede>
          Authoring tools and enterprise LLMs are great at writing. None of them give a CISO an
          auditable trust artifact for the article that gets published. AssuredAI is the proof
          layer that sits on top of whatever you already use.
        </SectionLede>

        {/* HERO column — AssuredAI as the protagonist, pulled out of the table */}
        <div className="mx-auto mt-20 max-w-[1180px]">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] via-card to-card p-8 shadow-xl shadow-primary/10 sm:p-10">
            <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr_auto]">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <ShieldCheck className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary">
                  All eight capabilities · One stack
                </div>
                <div className="mt-1 text-[24px] font-semibold tracking-tight sm:text-[28px]">
                  AssuredAI ships all of it, today.
                </div>
                <p className="mt-2 max-w-[600px] text-[14px] leading-[1.55] text-muted-foreground sm:text-[15px]">
                  Every capability below is in the reference implementation. Drops into your
                  existing CMS. No quarters-long build. No vendor stack to assemble.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Capability coverage
                </div>
                <div className="text-[44px] font-semibold tabular-nums tracking-[-0.025em] text-primary sm:text-[52px]">
                  8<span className="text-foreground/30">/8</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* "vs the alternatives" — table now compares only the others */}
        <div className="mx-auto mt-12 max-w-[1180px]">
          <div className="mb-5 flex items-center gap-4">
            <span className="font-mono text-[12px] font-semibold tabular-nums text-foreground/45">
              vs.
            </span>
            <span className="h-px w-10 bg-foreground/20" />
            <span className="text-[12.5px] font-semibold uppercase tracking-[0.2em] text-foreground/65">
              The alternatives
            </span>
          </div>

          <div className="grid grid-cols-[1.6fr_repeat(2,1fr)] gap-px overflow-hidden rounded-t-2xl border border-border bg-border">
            <div className="bg-card px-6 py-5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Capability
              </div>
            </div>
            {ALT_COLS.map((c, i) => (
              <div key={i} className="bg-card px-4 py-5 text-center">
                <div className="text-[15px] font-semibold tracking-tight">{c.label}</div>
                <div className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {c.sub}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1.6fr_repeat(2,1fr)] gap-px overflow-hidden rounded-b-2xl border border-t-0 border-border bg-border">
            {ROWS.map((row, i) => (
              <Row key={i} row={row} index={i + 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ row, index }: { row: { label: string; sub: string; us: Cell; cells: [Cell, Cell] }; index: number }) {
  return (
    <>
      <div className="bg-card px-6 py-5 transition-colors hover:bg-accent/30">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground/40">
            {String(index).padStart(2, '0')}
          </span>
          <span className="text-[15px] font-semibold tracking-tight">{row.label}</span>
        </div>
        <p className="mt-1 pl-7 text-[12.5px] leading-[1.5] text-muted-foreground">{row.sub}</p>
      </div>
      {row.cells.map((c, j) => (
        <div key={j} className="flex items-center justify-center bg-card px-4 py-5">
          <CellMark value={c} />
        </div>
      ))}
    </>
  );
}

function CellMark({ value }: { value: Cell }) {
  if (value === 'yes') {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === 'partial') {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300">
        <Minus className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className="inline-flex size-8 items-center justify-center rounded-full bg-foreground/[0.04] text-foreground/30 ring-1 ring-foreground/10">
      <X className="h-4 w-4" strokeWidth={2.5} />
    </span>
  );
}
