/**
 * /get-started — entry to the AssuredAI sandbox flow.
 *
 * Framing matters here. Enterprise regulated buyers (Mayo, top-5
 * payers, federal agencies, AmLaw 100 firms) see "configure your
 * AssuredAI in 60 seconds" and bounce — they know production
 * deployment is BAA + IT review + SSO + custom pack tuning + SOC 2
 * evidence + change management. We're explicit about that contract:
 * this wizard builds a SANDBOX TENANT for exploration; production
 * deployment is a separate engagement we line up via a working
 * session.
 *
 * The wizard component lives entirely client-side after this shell
 * (state machine, step navigation, workspace preview). The shell is
 * just the page chrome + the production-path section below the
 * wizard.
 */

import Link from 'next/link';
import { ArrowLeft, Calendar, Mail, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { BrandLockup } from '@/components/verify/Brand';
import { GetStartedFlow } from './GetStartedFlow';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Get started · AssuredAI',
  description:
    'Build a sandbox tenant tailored to your industry in 60 seconds — explore the verifier, share proof URLs with your team, see your audit log. Production deployment is a separate engagement we scope together (typical timeline: 2-6 weeks).',
  robots: { index: true, follow: true },
};

export default function GetStartedPage() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Minimal header — logo + back-to-home. The wizard owns the viewport. */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-md transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
            <BrandLockup />
          </Link>
          <div className="hidden items-center gap-4 text-[12.5px] text-muted-foreground sm:flex">
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/book-a-demo" className="hover:text-foreground">
              Book a working session
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12.5px] font-medium text-foreground hover:bg-accent"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Framing strip — sets honest expectations BEFORE the wizard */}
      <section className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-[1400px] px-5 py-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.16em] text-foreground/65">
              <ShieldCheck className="h-3.5 w-3.5" />
              Sandbox tenant in 60 seconds
            </span>
            <span className="hidden h-3 w-px bg-foreground/15 sm:inline-block" />
            <span>
              Explore the verifier, share proof URLs with your team, see your audit log live.
            </span>
            <span className="hidden h-3 w-px bg-foreground/15 sm:inline-block" />
            <span className="text-foreground/55">
              Production deployment is a separate engagement (BAA, SSO, IT review &mdash;
              typical 2–6 weeks).
            </span>
          </div>
        </div>
      </section>

      {/* The wizard itself — split canvas, owns the viewport */}
      <GetStartedFlow />

      {/* Below the wizard — the honest path to production */}
      <ProductionPath />
    </div>
  );
}

function ProductionPath() {
  return (
    <section className="border-t border-border bg-muted/30 py-20">
      <div className="mx-auto max-w-[1180px] px-5">
        <div className="mb-10 max-w-3xl">
          <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-foreground/60">
            What comes after the sandbox
          </div>
          <h2 className="mt-3 text-balance text-[34px] sm:text-[40px] font-semibold leading-tight tracking-tight">
            Production deployment is its{' '}
            <span className="font-serif italic font-normal text-primary">own engagement</span>.
          </h2>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-foreground/75">
            The sandbox above is for exploration &mdash; everything you need to evaluate
            AssuredAI, share with your team, and get a CISO read. Standing up the real thing
            in your environment is a multi-week working engagement. We&rsquo;ve done it before.
            Here&rsquo;s what it actually looks like.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ProductionCard
            icon={Calendar}
            title="Book a 30-minute working session"
            blurb="Send us 3–5 representative articles from your team. We run them live on the call. You leave with a private proof URL for each one and a written compliance assessment scoped to your industry."
            href="/book-a-demo"
            cta="Book the session"
          />
          <ProductionCard
            icon={Mail}
            title="Talk to sales about a deployment"
            blurb="Pricing scoped to your volume, packs, and residency. BAA template. SOC 2 Type II report under MNDA. SIG / CAIQ / HITRUST mapping on request. MSA + Order Form delivered same day."
            href="/talk-to-sales"
            cta="Talk to sales"
          />
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/60">
            What a real deployment includes
          </div>
          <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Reality label="Week 1–2" body="Security review, BAA execution, IT architecture sign-off" />
            <Reality label="Week 2–3" body="Pack tuning to your house style guide + approved sources" />
            <Reality label="Week 3–4" body="SSO/SAML wiring, role mapping, audit channel setup" />
            <Reality label="Week 4–5" body="CMS integration (WordPress plugin / REST API / custom)" />
            <Reality label="Week 5–6" body="UAT with your editorial + compliance teams" />
            <Reality label="Week 6+" body="Production cutover, ongoing pack maintenance, quarterly review" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductionCard({
  icon: Icon,
  title,
  blurb,
  href,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  blurb: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <p className="mt-3 flex-1 text-[14px] leading-relaxed text-foreground/80">{blurb}</p>
      <Link
        href={href}
        className="mt-5 inline-flex h-11 w-fit items-center gap-2 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background hover:opacity-90"
      >
        {cta}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function Reality({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-[13px] leading-snug text-foreground/85">{body}</div>
    </div>
  );
}
