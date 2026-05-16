import { Stethoscope, Banknote, Landmark, Scale } from 'lucide-react';
import { SectionEyebrow } from './Pipeline';
import { SectionBackdrop } from './SectionBackdrop';

interface AudienceCell {
  icon: React.ReactNode;
  segment: string;
  role: string;
  story: React.ReactNode;
}

const AUDIENCES: AudienceCell[] = [
  {
    icon: <Stethoscope className="h-5 w-5" strokeWidth={1.5} />,
    segment: 'Healthcare publishers',
    role: 'Hospital systems, payers, pharma communications, patient-education teams.',
    story: (
      <>
        A single unredacted patient initial lands on the front page of the trade press —
        and an OCR letter on your CISO&rsquo;s desk. AssuredAI verifies every published claim
        against your medical-affairs-approved corpus, redacts PHI at the I/O boundary, and
        ships a hash-chained proof URL on every article. Whether the draft came from your
        editorial team, a freelance writer, or an LLM.
      </>
    ),
  },
  {
    icon: <Banknote className="h-5 w-5" strokeWidth={1.5} />,
    segment: 'Financial services',
    role: 'Banks, wealth managers, insurers, fintech communications and marketing teams.',
    story: (
      <>
        Every public-facing piece — fund factsheets, retirement explainers, social posts,
        account-opening flows — touches FINRA suitability, SEC marketing rules, or your
        firm&rsquo;s own risk-language playbook. AssuredAI verifies against your compliance
        corpus, flags suitability-triggering phrasing before it ships, and produces an audit
        row your CCO can file. Source-agnostic: the gate doesn&rsquo;t care if your CMO&rsquo;s
        intern wrote it or Claude did.
      </>
    ),
  },
  {
    icon: <Landmark className="h-5 w-5" strokeWidth={1.5} />,
    segment: 'Government & public services',
    role: 'Federal agencies, state and municipal publishers, crisis-line and public-health services.',
    story: (
      <>
        FOIA-ready audit trails. Section 508 disclaimer checks. Plain-language verification
        against your authoritative sources. Crisis-line routing on every piece of
        symptom-prompting content. Public proof URLs anyone can re-verify in their browser —
        built for transparency mandates that require every published claim be traceable to
        its origin.
      </>
    ),
  },
  {
    icon: <Scale className="h-5 w-5" strokeWidth={1.5} />,
    segment: 'Legal & professional services',
    role: 'Law firms, professional service firms, regulated consultancies with public-facing content.',
    story: (
      <>
        ABA Model Rules and your privilege protocol enforced before the post goes live.
        Client name detection. Imminent-harm escalation per Rule 1.6(b). Whether the case
        study was drafted by an associate, a marketing freelancer, or an AI tool — same
        compliance gate, same audit row, same proof URL.
      </>
    ),
  },
];

export function Audience() {
  return (
    <section id="audience" className="relative overflow-hidden border-b border-border/60 bg-background">
      <SectionBackdrop
        src="https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=2000&q=75"
        intensity="subtle"
        position="center"
      />
      <div className="relative mx-auto max-w-[1240px] px-5 py-24 sm:py-32">
        {/* Asymmetric header — kicker + headline on left, lede on right */}
        <div className="grid items-end gap-10 sm:grid-cols-[1.3fr_1fr] sm:gap-16">
          <div>
            <SectionEyebrow n="01">Built for</SectionEyebrow>
            <h2 className="tracking-[-0.025em] leading-[1.02] text-[40px] sm:text-[56px] md:text-[64px]">
              <span className="font-semibold">Regulated teams</span>{' '}
              <span className="font-light text-foreground/70">that publish anyway.</span>
            </h2>
          </div>
          <p className="text-[15px] leading-[1.65] text-muted-foreground sm:text-[16.5px]">
            Four buyer profiles. One operating reality: a single mistake in a published
            piece &mdash; whether it came from your team, your vendors, or your AI tools &mdash;
            isn&rsquo;t a content bug. It&rsquo;s a regulator letter, a settlement filing, a
            board conversation. AssuredAI is built for the teams that have to publish anyway.
          </p>
        </div>

        {/* Editorial directory list — hairlines, no cards */}
        <div className="mt-20">
          {AUDIENCES.map((a, i) => (
            <AudienceRow key={a.segment} {...a} index={i + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AudienceRow({
  icon,
  segment,
  role,
  story,
  index,
}: AudienceCell & { index: number }) {
  return (
    <div className="group relative grid grid-cols-[60px_1fr] items-start gap-5 border-t border-border py-10 transition-colors hover:bg-accent/15 sm:grid-cols-[112px_1fr_auto] sm:gap-10 sm:py-12">
      {/* Large editorial index number */}
      <div className="font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground/[0.12] transition-colors group-hover:text-foreground/25 text-[56px] sm:text-[88px] md:text-[104px]">
        {String(index).padStart(2, '0')}
      </div>

      {/* Main content */}
      <div className="min-w-0">
        <h3 className="font-semibold tracking-[-0.018em] leading-[1.05] text-[26px] sm:text-[32px] md:text-[36px]">
          {segment}.
        </h3>
        <p className="mt-3 max-w-[680px] text-[14.5px] leading-[1.55] text-muted-foreground sm:text-[16px]">
          {role}
        </p>

        <p className="mt-6 max-w-[680px] text-[15px] leading-[1.7] text-foreground/85 sm:text-[16.5px]">
          {story}
        </p>
      </div>

      {/* Icon on the right (desktop only) — keeps row visually anchored */}
      <div className="col-span-2 mt-2 sm:col-span-1 sm:mt-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-foreground/[0.04] text-foreground/65 ring-1 ring-foreground/10 transition-all group-hover:bg-primary/10 group-hover:text-primary group-hover:ring-primary/30">
          {icon}
        </div>
      </div>
    </div>
  );
}
