import { VoiceProfileForm } from '@/components/verify/VoiceProfileForm';
import { PageShell } from '@/components/verify/PageShell';

export default function NewVoiceProfilePage() {
  return (
    <PageShell
      activePath="/library"
      title="Create a voice profile"
      description="Paste 3–5 articles in your publisher's house style. AssuredAI analyzes them and produces a portable voice signature you can score every future draft against."
    >
      <VoiceProfileForm />
    </PageShell>
  );
}
