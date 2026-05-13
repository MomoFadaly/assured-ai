import type { Metadata } from 'next';
import { VerifyInterface } from '@/components/verify/VerifyInterface';

export const metadata: Metadata = {
  title: 'Verify',
  description:
    'Paste or draft an article and run it through the AssuredAI compliance pipeline — PHI redaction, claim-by-claim sourcing, disclaimer enforcement, and a hash-chained audit trail.',
};

export default function VerifyPage() {
  return <VerifyInterface initialScenario="healthcare" />;
}
