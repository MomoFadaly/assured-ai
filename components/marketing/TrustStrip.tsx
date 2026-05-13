import { Plus, ShieldCheck, Upload } from 'lucide-react';

interface SourceItem {
  name: string;
  meta: string;
}

const FEDERAL: SourceItem[] = [
  { name: 'CDC', meta: 'cdc.gov · 412 chunks' },
  { name: 'NIH / NIDDK', meta: 'niddk.nih.gov · 287 chunks' },
  { name: 'NIH / NHLBI', meta: 'nhlbi.nih.gov · 244 chunks' },
  { name: 'NIH / NIMH', meta: 'nimh.nih.gov · 198 chunks' },
  { name: 'FDA', meta: 'fda.gov · 356 chunks' },
  { name: 'HHS', meta: 'hhs.gov · 174 chunks' },
];

const YOURS: SourceItem[] = [
  { name: 'Your editorial style guide', meta: 'house style · tone · voice rules' },
  { name: 'Your clinical protocols', meta: 'internal procedures · approved language' },
  { name: 'Your patient-education archive', meta: 'three-year archive · re-indexed nightly' },
  { name: 'Your peer-reviewed library', meta: 'curated journal references' },
];

export function TrustStrip() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-[#fbf8f3] dark:bg-[#11151f]">
      {/* Subtle paper-grain texture overlay for the "library/corpus" feel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] mix-blend-multiply dark:opacity-[0.25] dark:mix-blend-screen"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.7\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-[1240px] px-5 py-24 sm:py-32">
        {/* Editorial header, centered */}
        <div className="mx-auto max-w-[840px] text-center">
          <div className="mb-7 flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-foreground/25" aria-hidden />
            <span className="text-[12.5px] font-semibold uppercase tracking-[0.22em] text-foreground">
              Approved sources only
            </span>
            <span className="h-px w-12 bg-foreground/25" aria-hidden />
          </div>
          <h2 className="font-semibold tracking-[-0.025em] leading-[1.02] text-[40px] sm:text-[56px] md:text-[64px]">
            Every claim, checked against the sources you approve.
          </h2>
          <p className="mx-auto mt-6 max-w-[680px] text-[16px] leading-[1.6] text-muted-foreground sm:text-[18px]">
            AssuredAI ships with public-domain federal health sources. You add your own
            approved internal content. The verifier may only cite from that combined library —
            nothing else is reachable, ever.
          </p>
        </div>

        {/* Two cards with a primary "+" between */}
        <div className="mt-20 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-10">
          {/* LEFT — federal seed sources */}
          <SourceColumn
            kicker="Approved by AssuredAI"
            title="Federal health sources."
            sub="Public-domain content from US health authorities. Shipped with every implementation."
            icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.5} />}
            items={FEDERAL}
            stat="1,671 chunks"
            statLabel="6 federal sources"
          />

          {/* PLUS marker */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 size-14 rounded-full bg-primary/15 blur-xl" aria-hidden />
              <div className="relative flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg shadow-foreground/15">
                <Plus className="h-6 w-6" strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* RIGHT — customer-approved content */}
          <SourceColumn
            kicker="Approved by you"
            title="Your own content."
            sub="Upload your editorial guidelines, clinical protocols, and archive. They become canonical."
            icon={<Upload className="h-5 w-5" strokeWidth={1.5} />}
            items={YOURS}
            stat="Unlimited"
            statLabel="customer-uploaded"
            primary
          />
        </div>

        {/* Unified statement below */}
        <div className="mx-auto mt-14 max-w-[860px] rounded-2xl border border-border bg-card px-7 py-6 text-center shadow-sm">
          <div className="flex flex-col items-center gap-1.5 text-[14.5px] leading-[1.5] text-foreground sm:flex-row sm:justify-center sm:gap-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-primary">
              The result
            </span>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span>
              The only library your AI is allowed to cite from. Every published sentence is
              matched against it.
            </span>
          </div>
        </div>

        {/* Footnotes */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[12.5px] text-muted-foreground">
            <span className="inline-block size-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_hsl(152_60%_50%/0.18)]" />
            Library refreshes weekly · last index 2 hours ago
          </span>
          <p className="max-w-[480px] text-center text-[11px] leading-[1.55] text-muted-foreground sm:text-right">
            Federal sources cited under nominative fair use of public-domain content. AssuredAI
            does not claim endorsement or partnership with any organization.
          </p>
        </div>
      </div>
    </section>
  );
}

function SourceColumn({
  kicker,
  title,
  sub,
  icon,
  items,
  stat,
  statLabel,
  primary,
}: {
  kicker: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
  items: SourceItem[];
  stat: string;
  statLabel: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`lift-on-hover relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm ${
        primary ? 'border-primary/30 ring-1 ring-primary/20' : 'border-border'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-start gap-4 border-b border-border/60 px-7 py-6 ${primary ? 'bg-primary/[0.04]' : 'bg-muted/20'}`}
      >
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
            primary
              ? 'bg-primary text-primary-foreground ring-primary/40 shadow-md shadow-primary/25'
              : 'bg-foreground/[0.05] text-foreground/70 ring-foreground/10'
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div
            className={`text-[10.5px] font-semibold uppercase tracking-[0.18em] ${primary ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {kicker}
          </div>
          <div className="mt-2 text-[24px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[28px]">
            {title}
          </div>
          <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground sm:text-[13.5px]">{sub}</p>
        </div>
      </div>

      {/* Items list */}
      <ul className="flex-1 divide-y divide-border/60">
        {items.map((it) => (
          <li key={it.name} className="flex items-baseline justify-between gap-4 px-7 py-3.5">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium tracking-tight">{it.name}</div>
            </div>
            <div className="shrink-0 text-right text-[11.5px] text-muted-foreground">
              {it.meta}
            </div>
          </li>
        ))}
      </ul>

      {/* Footer stat */}
      <div
        className={`flex items-baseline justify-between border-t border-border/60 px-7 py-5 ${primary ? 'bg-primary/[0.04]' : 'bg-muted/20'}`}
      >
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {statLabel}
        </span>
        <span
          className={`text-[22px] font-semibold tabular-nums tracking-[-0.02em] ${primary ? 'text-primary' : 'text-foreground'}`}
        >
          {stat}
        </span>
      </div>
    </div>
  );
}
