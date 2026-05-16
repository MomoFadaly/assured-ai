import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Minus,
  Calendar,
  Sparkles,
  ShieldCheck,
  Lock,
  Building2,
  Layers,
  Server,
  Cloud,
  Stethoscope,
  Landmark,
  Banknote,
  Scale,
  FileCheck2,
  Mail,
} from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/Header';
import { HeaderAuthChip } from '@/components/marketing/HeaderAuth';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Pricing · AssuredAI',
  description:
    'Three plans for regulated AI verification — Starter for small editorial teams, Team for mid-market publishers, Enterprise for hospital systems, federal agencies, and pharma. BAA, SOC 2 Type II, FedRAMP-ready.',
};

type Tier = {
  slug: 'starter' | 'team' | 'enterprise';
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  priceLabel: string;
  priceSub: string;
  ctaLabel: string;
  ctaHref: string;
  highlight?: boolean;
  bullets: string[];
  bestFor: string;
};

const TIERS: Tier[] = [
  {
    slug: 'starter',
    name: 'Starter',
    tagline: 'For editorial teams shipping their first AI-assisted articles.',
    icon: Cloud,
    priceLabel: '$1,200',
    priceSub: 'per month · billed annually',
    ctaLabel: 'Start a Starter trial',
    ctaHref: '/book-a-demo?plan=starter',
    bestFor: 'Mid-size publishers · 1–5 editors',
    bullets: [
      '500 verifications / month',
      '1 vertical pack (healthcare, finance, government, or legal)',
      '2 editor seats',
      'Hash-chained audit log with public proof URLs',
      'PHI/PII recognizers + automatic redaction',
      'WordPress plugin + REST API',
      'Email support · next business day',
    ],
  },
  {
    slug: 'team',
    name: 'Team',
    tagline:
      'For regulated publishers with editorial review boards and compliance officers.',
    icon: Building2,
    priceLabel: '$4,800',
    priceSub: 'per month · billed annually',
    ctaLabel: 'Talk to sales · Team',
    ctaHref: '/talk-to-sales?plan=team',
    highlight: true,
    bestFor: 'Hospital systems · payers · regulated brands',
    bullets: [
      '5,000 verifications / month (overage at $0.40 each)',
      'All four vertical packs (healthcare, finance, government, legal)',
      '10 editor seats + unlimited reviewer seats',
      'Custom escalation rules + red-flag workflow',
      'BAA on request · SOC 2 Type II report on request',
      'Slack / email / webhook notification channels',
      'Quarterly compliance review with our team',
      'Priority support · 4-hour response SLA',
    ],
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    tagline:
      'For pharma, federal agencies, top-five payers, and any team that needs the platform inside their VPC.',
    icon: Lock,
    priceLabel: 'Custom',
    priceSub: 'scoped to volume, hosting model, and certification posture',
    ctaLabel: 'Schedule enterprise call',
    ctaHref: '/talk-to-sales?plan=enterprise',
    bestFor: 'Pharma · federal · top-five payers',
    bullets: [
      'Unlimited verifications + custom volume tiers',
      'Self-host (Docker Compose / Helm) inside your VPC',
      'Zero-egress mode with Ollama on-prem (no data leaves perimeter)',
      'SSO/SAML, SCIM provisioning, custom role mappings',
      'FedRAMP Moderate-ready architecture, HIPAA, SOC 2 Type II',
      'Dedicated tenant isolation + data-residency selection',
      'White-glove implementation + custom integrations',
      'Named CSM + 1-hour response SLA',
    ],
  },
];

type Row = {
  label: string;
  starter: string | boolean;
  team: string | boolean;
  enterprise: string | boolean;
};

const COMPARISON_GROUPS: { group: string; rows: Row[] }[] = [
  {
    group: 'Verification capacity',
    rows: [
      { label: 'Verifications / month', starter: '500', team: '5,000', enterprise: 'Unlimited' },
      { label: 'Overage pricing', starter: 'Not available', team: '$0.40 / verification', enterprise: 'Custom contract' },
      { label: 'Vertical packs included', starter: '1 of 4', team: 'All 4', enterprise: 'All 4 + custom packs' },
      { label: 'Editor seats', starter: '2', team: '10', enterprise: 'Unlimited' },
      { label: 'Reviewer (read-only) seats', starter: '5', team: 'Unlimited', enterprise: 'Unlimited' },
    ],
  },
  {
    group: 'Compliance & security',
    rows: [
      { label: 'Hash-chained audit log', starter: true, team: true, enterprise: true },
      { label: 'PHI / PII recognizers + redaction', starter: true, team: true, enterprise: true },
      { label: 'Public proof URLs (/v/<id>)', starter: true, team: true, enterprise: true },
      { label: 'BAA (Business Associate Agreement)', starter: false, team: 'On request', enterprise: 'Standard' },
      { label: 'SOC 2 Type II report', starter: false, team: 'On request', enterprise: 'Standard' },
      { label: 'HIPAA-eligible infrastructure', starter: true, team: true, enterprise: true },
      { label: 'FedRAMP Moderate-ready architecture', starter: false, team: false, enterprise: true },
      { label: 'Data residency (US / EU / on-prem)', starter: 'US', team: 'US / EU', enterprise: 'Custom' },
      { label: 'Zero-egress mode (Ollama on-prem)', starter: false, team: false, enterprise: true },
    ],
  },
  {
    group: 'Integrations',
    rows: [
      { label: 'WordPress plugin', starter: true, team: true, enterprise: true },
      { label: 'REST API + API key management', starter: true, team: true, enterprise: true },
      { label: 'Webhook notifications', starter: false, team: true, enterprise: true },
      { label: 'Slack notification channel', starter: false, team: true, enterprise: true },
      { label: 'Email notification channel', starter: true, team: true, enterprise: true },
      { label: 'SSO / SAML', starter: false, team: false, enterprise: true },
      { label: 'SCIM user provisioning', starter: false, team: false, enterprise: true },
      { label: 'Custom integrations (CMS / SIEM)', starter: false, team: 'Quoted', enterprise: 'Included' },
    ],
  },
  {
    group: 'Operating discipline',
    rows: [
      { label: 'Public-status uptime page', starter: true, team: true, enterprise: true },
      { label: 'Custom escalation rules', starter: false, team: true, enterprise: true },
      { label: 'Quarterly compliance review', starter: false, team: true, enterprise: 'Monthly' },
      { label: 'Named customer success manager', starter: false, team: false, enterprise: true },
      { label: 'Support response SLA', starter: 'Next business day', team: '4-hour', enterprise: '1-hour · 24/7 escalation' },
      { label: 'White-glove implementation', starter: false, team: false, enterprise: true },
    ],
  },
];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Why no per-seat or per-document pricing?',
    a: 'We tried both. Per-seat punishes editorial teams for inviting reviewers — exactly the people you want closer to the compliance loop. Per-document punishes correct rejection (a blocked draft costs the same as a published one). Verifications is the only meter that aligns with the value: every run produces an audit row.',
  },
  {
    q: 'How does the BAA work?',
    a: 'Team plan customers can request a BAA at signing — it covers our cloud-managed deployment on HIPAA-eligible infrastructure. Enterprise customers get a standard BAA in their contract, and self-hosted Enterprise deployments make most BAA scope moot (the data never leaves your perimeter).',
  },
  {
    q: 'When will SOC 2 Type II be available?',
    a: 'Our Type II report covers the 12-month window ending Q3 2026 and is available to Team and Enterprise customers under MNDA. Type I (point-in-time) is available today for any deployment.',
  },
  {
    q: 'Is FedRAMP authorization complete?',
    a: 'Our architecture is FedRAMP Moderate-ready — we run the platform on FedRAMP-authorized cloud regions, follow the 800-53 control baseline, and document the evidence trail. Full ATO requires a federal sponsor; we are currently in late-stage conversations with two agencies and are happy to walk a prospective sponsor through our SSP draft.',
  },
  {
    q: 'Can we switch plans later?',
    a: 'Yes. Upgrading is immediate and prorated. Downgrading takes effect at the end of your annual term so we do not surprise-bill you. The audit chain is portable across plans — your historical verifications are never archived behind a paywall.',
  },
  {
    q: 'What counts as a verification?',
    a: 'One end-to-end pipeline run on one piece of content — paste or draft. Re-runs of the same content (e.g., after an editor fix) count as new verifications because each produces a new hash-chained audit row. Failed runs (e.g., red-flag block) count; they are the runs you want to keep paying for.',
  },
];

export default function PricingPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <MarketingHeader authChip={<HeaderAuthChip />} />

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-[1240px] px-5 pb-10 pt-16 sm:pt-20">
          <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-foreground/60">
            Pricing
          </div>
          <h1 className="mt-3 text-balance text-[44px] sm:text-[60px] font-semibold leading-[1.02] tracking-[-0.03em]">
            What{' '}
            <span className="font-serif italic font-normal text-primary">trust costs</span>{' '}
            at your scale.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-foreground/75">
            Three plans, one platform. Every plan includes the same hash-chained audit log,
            the same PHI/PII recognizers, the same public proof URLs. What changes is the
            volume you can run, the certifications we&rsquo;ll co-sign, and how close we sit
            to your compliance team.
          </p>

          {/* Compliance pill row */}
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <CompliancePill icon={ShieldCheck} label="HIPAA-eligible" />
            <CompliancePill icon={FileCheck2} label="SOC 2 Type II (Team+)" />
            <CompliancePill icon={Landmark} label="FedRAMP Moderate-ready" />
            <CompliancePill icon={Lock} label="BAA available" />
            <CompliancePill icon={Server} label="Self-host / zero-egress (Enterprise)" />
          </div>
        </section>

        {/* Tier cards */}
        <section className="mx-auto max-w-[1240px] px-5 pb-16 pt-6">
          <div className="grid gap-5 lg:grid-cols-3">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              return (
                <div
                  key={tier.slug}
                  className={`relative flex flex-col rounded-2xl border bg-card p-7 sm:p-8 ${
                    tier.highlight
                      ? 'border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/30'
                      : 'border-border shadow-sm'
                  }`}
                >
                  {tier.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-background shadow-md">
                        <Sparkles className="h-3 w-3" />
                        Most requested
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Plan
                      </div>
                      <h2 className="mt-1.5 text-[30px] font-semibold leading-[1.0] tracking-[-0.02em]">
                        {tier.name}
                      </h2>
                    </div>
                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
                        tier.highlight
                          ? 'bg-primary text-primary-foreground ring-primary/40'
                          : 'bg-foreground/[0.04] text-foreground/70 ring-foreground/10'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                    {tier.tagline}
                  </p>

                  <div className="mt-6 border-y border-border/60 py-5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[36px] font-semibold tracking-[-0.02em] text-foreground">
                        {tier.priceLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-muted-foreground">{tier.priceSub}</p>
                    <p className="mt-3 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-foreground/65">
                      Best for
                    </p>
                    <p className="mt-1 text-[13px] text-foreground/85">{tier.bestFor}</p>
                  </div>

                  <ul className="mt-5 flex-1 space-y-2.5 text-[13.5px] leading-[1.55]">
                    {tier.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5">
                        <span className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                        <span className="text-foreground/85">{b}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={tier.ctaHref}
                    className={`group mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md text-[14px] font-semibold transition-all ${
                      tier.highlight
                        ? 'bg-foreground text-background shadow-sm hover:opacity-90'
                        : 'border border-foreground/15 bg-card text-foreground hover:bg-accent'
                    }`}
                  >
                    {tier.ctaLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-center text-[12px] text-muted-foreground">
            All plans billed annually. Monthly billing available on Team and Enterprise at a 15%
            premium. Prices in USD. Quoted plans converted to local currency at signing.
          </p>
        </section>

        {/* Vertical packs */}
        <section className="mx-auto max-w-[1240px] px-5 py-16">
          <div className="mb-8">
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-foreground/60">
              Vertical packs
            </div>
            <h2 className="mt-3 max-w-3xl text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]">
              Compliance pre-loaded, not retrofitted.
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground/75">
              Each pack is a complete recognizer set, disclaimer library, and escalation
              ruleset tuned for one regulatory environment. Starter includes one pack; Team and
              Enterprise include all four (and Enterprise adds custom packs scoped to your
              content surface).
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <PackCard
              icon={Stethoscope}
              name="Healthcare"
              blurb="HIPAA Safe-Harbor PHI recognizers, cardiac / mental-health / overdose escalation, FDA + CDC disclaimers."
            />
            <PackCard
              icon={Banknote}
              name="Finance"
              blurb="SEC / FINRA / SOX / PCI-DSS-aware recognizers, fraud-language detection, mandatory risk disclaimers."
            />
            <PackCard
              icon={Landmark}
              name="Government"
              blurb="Plain-language verification for federal / state / municipal publishers. Section 508 disclaimers, crisis-line routing."
            />
            <PackCard
              icon={Scale}
              name="Legal"
              blurb="ABA Model Rules + privilege-aware verification. Client PII detection, Rule 1.6(b) imminent-harm escalation."
            />
          </div>
        </section>

        {/* Comparison matrix */}
        <section className="border-y border-border bg-muted/20 py-20">
          <div className="mx-auto max-w-[1240px] px-5">
            <div className="mb-8 max-w-3xl">
              <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-foreground/60">
                Detail comparison
              </div>
              <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]">
                Every line item, every plan.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-foreground/75">
                If a procurement reviewer asked us to put it in writing, it&rsquo;s in this
                table. If you need a row added — ask. We&rsquo;ll publish it for everyone.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead className="bg-muted/40 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
                  <tr>
                    <th className="px-5 py-4 text-left">Feature</th>
                    <th className="px-5 py-4 text-left">Starter</th>
                    <th className="px-5 py-4 text-left">Team</th>
                    <th className="px-5 py-4 text-left">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {COMPARISON_GROUPS.map((group) => (
                    <>
                      <tr key={`g-${group.group}`} className="bg-muted/15">
                        <td
                          colSpan={4}
                          className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/60"
                        >
                          {group.group}
                        </td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr key={`${group.group}-${row.label}`}>
                          <td className="px-5 py-3 text-foreground/85">{row.label}</td>
                          <td className="px-5 py-3 text-foreground/80">
                            <CellValue v={row.starter} />
                          </td>
                          <td className="px-5 py-3 text-foreground/80">
                            <CellValue v={row.team} />
                          </td>
                          <td className="px-5 py-3 text-foreground/80">
                            <CellValue v={row.enterprise} />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-[1240px] px-5 py-20">
          <div className="mb-8 max-w-3xl">
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-foreground/60">
              Questions we hear weekly
            </div>
            <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]">
              The pricing FAQ — written by the people who quote it.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {FAQ_ITEMS.map((f) => (
              <div
                key={f.q}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <h3 className="text-[15.5px] font-semibold leading-snug text-foreground">
                  {f.q}
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-foreground/75">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border bg-muted/20 py-20">
          <div className="mx-auto max-w-[860px] px-5 text-center">
            <Calendar className="mx-auto h-7 w-7 text-foreground/70" />
            <h2 className="mt-4 text-balance text-[34px] sm:text-[40px] font-semibold leading-tight tracking-tight">
              Bring your{' '}
              <span className="font-serif italic font-normal text-primary">real content</span>.
              Walk away with a quote.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-foreground/75">
              Send us 3–5 representative articles — patient handouts, fund explainers, policy
              briefs, whatever you publish — and we&rsquo;ll run them live on a 30-minute call.
              You leave with a private proof URL for each one and a written quote scoped to your
              volume, packs, and compliance posture.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/book-a-demo"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-foreground px-6 text-[14px] font-semibold text-background hover:opacity-90"
              >
                <Calendar className="h-4 w-4" />
                Book a 30-min working session
              </Link>
              <Link
                href="/talk-to-sales"
                className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-card px-6 text-[14px] font-medium text-foreground hover:bg-accent"
              >
                <Mail className="h-4 w-4" />
                Talk to sales
              </Link>
              <Link
                href="/demo"
                className="inline-flex h-12 items-center gap-2 rounded-md px-4 text-[14px] font-medium text-foreground/75 hover:text-foreground"
              >
                <Layers className="h-4 w-4" />
                See live proof URLs first
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function CellValue({ v }: { v: string | boolean }) {
  if (v === true) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  if (v === false) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground/70">
        <Minus className="h-3.5 w-3.5" />
        <span className="sr-only">Not included</span>
      </span>
    );
  }
  return <span>{v}</span>;
}

function CompliancePill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground/80 shadow-sm">
      <Icon className="h-3.5 w-3.5 text-foreground/65" />
      {label}
    </span>
  );
}

function PackCard({
  icon: Icon,
  name,
  blurb,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  blurb: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
        <Icon className="h-4 w-4" />
        {name}
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/80">{blurb}</p>
    </div>
  );
}
