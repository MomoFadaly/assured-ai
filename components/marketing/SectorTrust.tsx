import { Stethoscope, Banknote, Landmark, Scale, FlaskConical, Building2 } from 'lucide-react';

/**
 * SectorTrust — anonymized-but-honest sector trust strip.
 *
 * Vanta has 16,000 customer logos. Drata has Fortune 500 logos on
 * carousel. We don't have customer logos to show yet — but we can
 * honestly say which sector profiles we're built for and have
 * verified content against.
 *
 * Goes below OutcomesStrip and above Audience on the home page.
 * Anonymous-but-truthful: no fabricated company names, just the
 * sector profile we're explicitly designed for. Visitors who
 * recognize themselves in the description self-select.
 *
 * When real customer logos land, this component swaps to a logo
 * carousel — same slot, same role, more concrete.
 */
export function SectorTrust() {
  const sectors: Array<{
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    label: string;
    sub: string;
  }> = [
    {
      icon: Stethoscope,
      label: 'Health systems & payers',
      sub: 'Patient education, marketing, plan communications',
    },
    {
      icon: FlaskConical,
      label: 'Pharma & medical device',
      sub: 'HCP comms, patient resources, MA-approved corpus',
    },
    {
      icon: Banknote,
      label: 'Banks, wealth & insurers',
      sub: 'Fund factsheets, retirement, social, advisory content',
    },
    {
      icon: Landmark,
      label: 'Federal & state agencies',
      sub: 'Citizen guidance, FOIA-ready audit, § 508 compliance',
    },
    {
      icon: Scale,
      label: 'AmLaw 100 + boutiques',
      sub: 'Case studies, insights, web — ABA Model Rules-aware',
    },
    {
      icon: Building2,
      label: 'Regulated consultancies',
      sub: 'Big-Four advisory, professional services, BD content',
    },
  ];

  return (
    <section
      aria-label="Designed for"
      className="relative border-b border-border bg-background"
    >
      <div className="mx-auto max-w-[1320px] px-5 py-12 sm:py-16">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
              Built for &middot; ready today
            </div>
            <h2 className="mt-2 text-balance text-[20px] sm:text-[24px] font-semibold leading-tight tracking-[-0.018em] text-foreground/85">
              Six regulated-content profiles &mdash;{' '}
              <span className="font-serif italic font-normal text-primary">pre-wired for each.</span>
            </h2>
          </div>
          <p className="max-w-[420px] text-[12.5px] leading-relaxed text-muted-foreground">
            We don&rsquo;t publish a customer logo wall yet. We publish what we&rsquo;re{' '}
            <em>designed for</em>. Recognize yourself in any of these &mdash; the pack already
            ships.
          </p>
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="group flex items-start gap-3 bg-card px-5 py-4 transition-colors hover:bg-accent/30"
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-foreground/[0.04] text-foreground/70 ring-1 ring-foreground/10 transition-colors group-hover:bg-primary/10 group-hover:text-primary group-hover:ring-primary/30">
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold tracking-tight">{s.label}</div>
                  <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                    {s.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
