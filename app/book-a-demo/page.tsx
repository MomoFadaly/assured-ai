/**
 * /book-a-demo — 30-minute working session request.
 *
 * Differentiates from /talk-to-sales by the explicit "we bring your
 * real content" framing and a meeting-time field. Both write to the
 * same contact_leads table; lead_type='book_a_demo' separates them
 * downstream.
 */

import Link from 'next/link';
import { Calendar, ShieldCheck, PlayCircle, ArrowUpRight } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/Header';
import { HeaderAuthChip } from '@/components/marketing/HeaderAuth';
import { LeadCaptureForm } from '@/components/leads/LeadCaptureForm';

export const dynamic = 'force-static';
export const metadata = {
  title: 'Book a demo · AssuredAI',
  description:
    '30 minutes. Bring 3–5 representative articles. We run them live on the call and you walk away with a private proof URL for each one + a written compliance assessment.',
};

type SearchParams = Promise<{
  pack?: 'healthcare' | 'finance' | 'government' | 'legal';
  plan?: 'starter' | 'team' | 'enterprise';
}>;

export default async function BookADemoPage({
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
              Book a demo
            </div>
            <h1 className="mt-3 text-balance text-[40px] sm:text-[52px] font-semibold leading-[1.04] tracking-[-0.025em]">
              30 minutes. We bring your{' '}
              <span className="font-serif italic font-normal text-primary">
                real content
              </span>
              .
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-foreground/75">
              Send us 3–5 representative articles — patient handouts, fund explainers,
              policy briefs, whatever your team publishes — and we&rsquo;ll run them live on
              the call. You leave with a private proof URL for each one and a written
              compliance assessment your CISO can take to a board meeting.
            </p>

            <div className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/60">
                What we&rsquo;ll cover in 30 minutes
              </div>
              <ul className="space-y-3 text-[14px] leading-relaxed text-foreground/85">
                <li className="flex gap-3">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <strong>Live run, your content.</strong> Paste your article, watch the
                    pipeline route through PHI/PII redaction, source retrieval, draft,
                    red-flag review, and disclaimer.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <strong>Audit row + proof URL.</strong> Every run produces a
                    hash-chained record. We hand you the public proof URL for each one.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <strong>Architecture sketch.</strong> A diagram tailored to your stack
                    — WordPress, custom CMS, self-host, BAA — that you can take to
                    procurement.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <strong>Written compliance assessment.</strong> Delivered within one
                    business day. Itemises what we caught, what we&rsquo;d catch at scale,
                    and what we&rsquo;d need from your team.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-7 flex flex-wrap gap-2.5 text-[12px] text-foreground/75">
              <Pill>
                <ShieldCheck className="h-3.5 w-3.5" />
                BAA on request
              </Pill>
              <Pill>
                <ShieldCheck className="h-3.5 w-3.5" />
                SOC 2 Type II
              </Pill>
              <Pill>
                <ShieldCheck className="h-3.5 w-3.5" />
                FedRAMP-ready
              </Pill>
            </div>

            <div className="mt-10 rounded-xl border border-border bg-muted/20 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/60">
                Prefer to test first?
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/75">
                The verifier is open at <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[12px]">/chat</code> —
                no signup required for a single demo run. Or browse curated showcase URLs
                we&rsquo;re proud of.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/chat"
                  className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-[12.5px] font-medium text-foreground hover:bg-accent"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  Open verifier
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium text-foreground/70 hover:text-foreground"
                >
                  Showcase verifications
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/70 ring-1 ring-foreground/10">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[20px] font-semibold tracking-tight">Request a working session</h2>
                <p className="text-[12.5px] text-muted-foreground">
                  Replies within one business day. No call calendar tag-team.
                </p>
              </div>
            </div>
            <LeadCaptureForm
              leadType="book_a_demo"
              initialPack={pack ?? null}
              initialPlan={plan ?? null}
              showMeetingTime
              submitLabel="Request the session"
              successHeadline="Booked."
              successBody="We&rsquo;ll email you within one business day with two proposed times and a quick prep checklist for the content you'd like to run."
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-medium shadow-sm">
      {children}
    </span>
  );
}
