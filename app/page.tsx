import { query } from '@/lib/db/client';
import { MarketingHeader } from '@/components/marketing/Header';
import { ScrollProgress } from '@/components/marketing/Parallax';
import { SectionNav } from '@/components/marketing/SectionNav';
import { Hero } from '@/components/marketing/Hero';
import { Audience } from '@/components/marketing/Audience';
import { TrustStrip } from '@/components/marketing/TrustStrip';
import { FailureModes } from '@/components/marketing/FailureModes';
import { PullQuote } from '@/components/marketing/PullQuote';
import { Stakes } from '@/components/marketing/Stakes';
import { Pipeline } from '@/components/marketing/Pipeline';
import { Architecture } from '@/components/marketing/Architecture';
import { FeaturedArtifacts } from '@/components/marketing/FeaturedArtifacts';
import { WhitePaperQuote } from '@/components/marketing/Quote';
import { VoiceSection, WordPressDiagram } from '@/components/marketing/VoiceSection';
import { Comparison } from '@/components/marketing/Comparison';
import { Origin } from '@/components/marketing/Origin';
import { Pricing } from '@/components/marketing/Pricing';
import { FAQ } from '@/components/marketing/FAQ';
import { CTAFooter } from '@/components/marketing/CTAFooter';
import { BackToTop } from '@/components/marketing/BackToTop';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Returns the latest verified-answer audit ID, or null when no rows exist.
 *
 * The marketing-page CTAs ("See an example proof") use this to either link
 * to a real, browsable proof URL — or hide the CTA entirely when there's
 * nothing real to show. Linking to a hardcoded `/v/91` that may 404 is worse
 * than not linking at all.
 */
async function getLatestAuditId(): Promise<number | null> {
  try {
    const r = await query<{ latest_audit: number | null }>(
      `SELECT id AS latest_audit FROM audit_log WHERE outcome = 'answered' ORDER BY id DESC LIMIT 1`,
    );
    return r.rows[0]?.latest_audit ?? null;
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const proofExampleId = await getLatestAuditId();
  return (
    <div className="relative min-h-screen bg-background">
      <ScrollProgress />
      <SectionNav />
      <MarketingHeader />
      <main>
        <Hero proofExampleId={proofExampleId} />
        <Audience />
        <TrustStrip />
        <FailureModes />
        <PullQuote attribution="HHS · OCR enforcement bulletins, 2024">
          <span className="text-foreground">The median malpractice settlement involving</span>{' '}
          <span className="font-serif italic font-normal text-primary">
            a single piece of published medical misinformation
          </span>{' '}
          <span className="text-foreground">is $1.8 million.</span>
        </PullQuote>
        <Stakes />
        <Origin />
        <Pipeline />
        <FeaturedArtifacts proofExampleId={proofExampleId} />
        <Architecture />
        <WhitePaperQuote />
        <VoiceSection />
        <WordPressDiagram />
        <Comparison />
        <Pricing />
        <FAQ />
        <CTAFooter proofExampleId={proofExampleId} />
      </main>
      <BackToTop />
    </div>
  );
}
