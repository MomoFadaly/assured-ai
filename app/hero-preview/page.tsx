// TEMPORARY — visual preview of the new Legora-style Hero + OneBadSentence
// in isolation, with no DB calls in the render path. Delete before commit.
import { Hero } from '@/components/marketing/Hero';
import { OneBadSentence } from '@/components/marketing/OneBadSentence';

export const dynamic = 'force-static';

export default function HeroPreview() {
  return (
    <main>
      <Hero proofExampleId={42} />
      <OneBadSentence />
    </main>
  );
}
