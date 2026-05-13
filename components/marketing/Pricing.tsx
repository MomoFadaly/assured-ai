import Link from 'next/link';
import { Check, ArrowRight, Sparkles, Cloud, Server, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SectionEyebrow, SectionHeadline, SectionLede } from './Pipeline';
import { CursorSpotlight } from './Parallax';
import { SectionBackdrop } from './SectionBackdrop';
import { cn } from '@/lib/utils';

export function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden border-b border-border/60 bg-[#f4f6fa] dark:bg-[#0e131e]">
      <SectionBackdrop
        src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=75"
        intensity="subtle"
        position="center"
      />
      <CursorSpotlight className="pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] aurora-bg opacity-[0.08] dark:opacity-[0.18]" aria-hidden />
      <div className="relative mx-auto max-w-[1320px] px-5 py-28 sm:py-36">
        <SectionEyebrow n="11">How it deploys</SectionEyebrow>
        <h2 className="mx-auto max-w-[960px] text-balance text-center leading-[1.0] tracking-[-0.025em] text-[40px] sm:text-[56px] md:text-[68px]">
          <span className="font-semibold">Three ways to deploy.</span>{' '}
          <span className="font-light text-foreground/70">One platform.</span>
        </h2>
        <SectionLede>
          Tuned to where your data lives and how regulated your posture needs to be. All three
          modes run the same compliance pipeline — what changes is who hosts what, and how much
          of the operating discipline we run for you.
        </SectionLede>

        <div className="mx-auto mt-14 grid max-w-[1180px] gap-5 md:grid-cols-3">
          <Tier
            name="Managed"
            icon={<Cloud className="h-5 w-5" strokeWidth={1.5} />}
            tagline="Mid-size publishers without ML ops"
            customer="Best for"
            customerLine="Publishers · 1–5 editors · cloud-first"
            hostingLine="We host everything"
            hostingValue="HIPAA-eligible infrastructure"
            features={[
              'Source library curation included',
              'AI Governance Committee setup',
              'Public proof URLs on every publish',
              'Compliance PDF export',
              'WordPress integration',
              'Standard audit retention',
            ]}
            cta="Talk to the team"
          />
          <Tier
            name="Hybrid"
            icon={<Server className="h-5 w-5" strokeWidth={1.5} />}
            tagline="Hospital systems and payers"
            customer="Best for"
            customerLine="Hospital systems · payers · regulated content"
            hostingLine="Split deployment"
            hostingValue="PHI stays in your perimeter"
            features={[
              'You host source library + Presidio sidecar',
              'We host operator console + verification UI',
              'BAA-friendly architecture',
              'Governance dashboards',
              'Custom audit export to your SIEM',
              'Quarterly compliance review',
            ]}
            cta="Request a security review"
            highlighted
          />
          <Tier
            name="Self-hosted"
            icon={<Lock className="h-5 w-5" strokeWidth={1.5} />}
            tagline="Pharma, federal, top-five payers"
            customer="Best for"
            customerLine="Pharma · federal · top-five payers"
            hostingLine="Zero egress"
            hostingValue="Runs entirely in your VPC"
            features={[
              'Docker Compose / Helm chart in your VPC',
              'Zero data egress option (Ollama on-prem)',
              'FedRAMP, HIPAA, SOC 2 ready architecture',
              'Custom integrations included',
              'White-glove implementation',
              'Optional support retainer',
            ]}
            cta="Schedule an enterprise call"
          />
        </div>

        <div className="mx-auto mt-12 max-w-[680px] rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Pricing
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Quoted to your data residency, content volume, and compliance posture. Every
            engagement starts with a 30-minute call to scope what trust costs at your scale.
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-[14px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Request a quote
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="mx-auto mt-6 max-w-[640px] text-center text-[11.5px] text-muted-foreground">
          The audit chain is the structural lock-in: once content carries verifiable AssuredAI
          proof, switching vendors means re-issuing every artifact.
        </p>
      </div>
    </section>
  );
}

function Tier({
  name,
  icon,
  tagline,
  customer,
  customerLine,
  hostingLine,
  hostingValue,
  features,
  cta,
  highlighted,
}: {
  name: string;
  icon: React.ReactNode;
  tagline: string;
  customer: string;
  customerLine: string;
  hostingLine: string;
  hostingValue: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        'lift-on-hover relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm',
        highlighted
          ? 'border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/30'
          : 'border-border',
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default" className="shadow-md">
            <Sparkles className="h-2.5 w-2.5" />
            Most requested
          </Badge>
        </div>
      )}

      {/* Tier header with icon + name */}
      <div className={cn('flex items-start justify-between border-b border-border/60 px-8 pt-8 pb-6 sm:px-10', highlighted && 'bg-primary/[0.04]')}>
        <div>
          <div className={cn('text-[10.5px] font-semibold uppercase tracking-[0.18em]', highlighted ? 'text-primary' : 'text-muted-foreground')}>
            Mode
          </div>
          <div className="mt-2 text-[30px] font-semibold leading-[1.0] tracking-[-0.02em] sm:text-[34px]">
            {name}
          </div>
          <p className="mt-2 max-w-[220px] text-[13.5px] leading-[1.5] text-muted-foreground">{tagline}</p>
        </div>
        <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl ring-1', highlighted ? 'bg-primary text-primary-foreground ring-primary/40 shadow-lg shadow-primary/25' : 'bg-foreground/[0.04] text-foreground/65 ring-foreground/10')}>
          {icon}
        </div>
      </div>

      {/* Customer + hosting strip */}
      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card px-5 py-4">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {customer}
          </div>
          <div className="mt-1.5 text-[12.5px] font-medium leading-[1.4]">{customerLine}</div>
        </div>
        <div className="bg-card px-5 py-4">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {hostingLine}
          </div>
          <div className="mt-1.5 text-[12.5px] font-medium leading-[1.4]">{hostingValue}</div>
        </div>
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-3 px-8 pt-7 pb-5 text-[14px] leading-[1.5] sm:px-10">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-300">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="px-8 pb-8 sm:px-10 sm:pb-10">
        <Link
          href="/contact"
          className={cn(
            'inline-flex h-12 w-full items-center justify-center gap-2 rounded-md text-[14px] font-medium transition-all',
            highlighted
              ? 'bg-foreground text-background shadow-sm hover:opacity-90'
              : 'border border-foreground/15 bg-card text-foreground hover:bg-accent',
          )}
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
