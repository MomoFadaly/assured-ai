/**
 * /talk-to-sales — pricing-and-procurement entry point.
 *
 * Differentiates from /book-a-demo by framing around contracts,
 * security review, BAA, SOC 2 reports, and procurement. No meeting-time
 * picker — we route these to a sales engineer first who confirms what
 * the prospect actually needs before booking a working session.
 */

import Link from 'next/link';
import { Mail, FileCheck2, ShieldCheck, Building2, ArrowUpRight, Calendar } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/Header';
import { HeaderAuthChip } from '@/components/marketing/HeaderAuth';
import { LeadCaptureForm } from '@/components/leads/LeadCaptureForm';

export const dynamic = 'force-static';
export const metadata = {
  title: 'Talk to sales · AssuredAI',
  description:
    'Pricing quotes, BAA, SOC 2 Type II reports, security review, procurement paperwork. Talk to someone who can scope what trust costs at your scale.',
};

type SearchParams = Promise<{
  pack?: 'healthcare' | 'finance' | 'government' | 'legal';
  plan?: 'starter' | 'team' | 'enterprise';
}>;

export default async function TalkToSalesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { pack, plan } = await searchParams;

  return (
    <div className="relative min-h-screen bg-background">
      <MarketingHeader authChip={<HeaderAuthChip />} />

      <main className="mx-auto max-w-[1180px] px-5 py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          {/* Left: pitch */}
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-foreground/60">
              Talk to sales
            </div>
            <h1 className="mt-3 text-balance text-[40px] sm:text-[52px] font-semibold leading-[1.04] tracking-[-0.025em]">
              Pricing, paperwork, and{' '}
              <span className="font-serif italic font-normal text-primary">
                the security review
              </span>{' '}
              your CISO needs.
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-foreground/75">
              You&rsquo;ve sized the platform. Now you need a quote scoped to your volume,
              the BAA in your contract, the SOC 2 Type II report for procurement, or the
              FedRAMP-ready architecture document for your IT review. We&rsquo;ll come
              prepared with answers in your stack&rsquo;s language.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <FactCard
                icon={Building2}
                title="Quote scoped to your reality"
                body="Verifications volume, vertical packs, hosting model, retention, residency. No menu pricing on regulated buyers."
              />
              <FactCard
                icon={FileCheck2}
                title="BAA + SOC 2 Type II"
                body="Sign-ready BAA template. SOC 2 Type II report under MNDA. SIG / CAIQ / HITRUST mapping on request."
              />
              <FactCard
                icon={ShieldCheck}
                title="Security review pack"
                body="Architecture diagrams, data-flow + key-management docs, pen-test summary, incident-response runbook."
              />
              <FactCard
                icon={Mail}
                title="Procurement loop"
                body="MSA + Order Form delivered same day. Custom redlines welcome. Net-30, ACH, invoice — whatever your AP runs on."
              />
            </div>

            <div className="mt-10 rounded-xl border border-border bg-muted/20 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/60">
                Want the live demo first?
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/75">
                Book a 30-minute working session — we run your content through the
                pipeline live, then size the deal from what you saw.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/book-a-demo"
                  className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-[12.5px] font-medium text-foreground hover:bg-accent"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Book a working session
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium text-foreground/70 hover:text-foreground"
                >
                  Compare plans
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/70 ring-1 ring-foreground/10">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[20px] font-semibold tracking-tight">Tell us what you&rsquo;re scoping</h2>
                <p className="text-[12.5px] text-muted-foreground">
                  Replies within one business day. No chatbot — a sales engineer reads this.
                </p>
              </div>
            </div>
            <LeadCaptureForm
              leadType="talk_to_sales"
              initialPack={pack ?? null}
              initialPlan={plan ?? null}
              showMeetingTime={false}
              submitLabel="Send to sales"
              successHeadline="Routed."
              successBody="A sales engineer will be in touch within one business day with a quote sketch and any of the security-review documents you flagged."
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function FactCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-foreground/65">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/80">{body}</p>
    </div>
  );
}
