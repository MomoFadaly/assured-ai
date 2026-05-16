import type { Metadata } from 'next';
import { VerifyInterface } from '@/components/verify/VerifyInterface';
import { HeaderAuthChip } from '@/components/marketing/HeaderAuth';

export const metadata: Metadata = {
  title: 'Verify',
  description:
    'Paste or draft an article and run it through the AssuredAI compliance pipeline — PHI redaction, claim-by-claim sourcing, disclaimer enforcement, and a hash-chained audit trail.',
};

export default function VerifyPage() {
  return (
    <>
      {/* Top-right server-rendered auth chip pinned over the client verifier
          Header. Pure server component — no SessionProvider required. */}
      <div className="pointer-events-none fixed right-5 top-2.5 z-40 flex justify-end">
        <div className="pointer-events-auto">
          <HeaderAuthChip />
        </div>
      </div>
      <VerifyInterface initialScenario="healthcare" />
    </>
  );
}
