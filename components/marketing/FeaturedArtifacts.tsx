import Link from 'next/link';
import { ArrowUpRight, Lock, FileText, Code2, Mic } from 'lucide-react';
import { SectionEyebrow, SectionHeadline, SectionLede } from './Pipeline';
import { RevealOnScroll } from './Parallax';

interface Artifact {
  index: string;
  title: string;
  blurb: string;
  hrefLabel: string;
  href: string;
  icon: React.ReactNode;
  visual: React.ReactNode;
  reverse?: boolean;
}

export function FeaturedArtifacts({ proofExampleId }: { proofExampleId: number | null }) {
  // When the DB has no audit entries yet, link to /chat (where the user can generate one)
  // instead of /v/<broken-id>.
  const proofHref = proofExampleId !== null ? `/v/${proofExampleId}` : '/chat';
  const proofDisplay = proofExampleId !== null ? `/v/${proofExampleId}` : '/v/[generated]';
  const artifacts: Artifact[] = [
    {
      index: '01',
      title: 'Public proof URL',
      blurb:
        "Every verification produces a shareable link. A CISO, a regulator, a journalist — anyone can re-verify the SHA-256 chain in their own browser. We never ask anyone to trust us.",
      hrefLabel: proofExampleId !== null ? 'Open an example proof' : 'Generate your first proof',
      href: proofHref,
      icon: <Lock className="h-4 w-4" />,
      visual: <ProofVisual proofDisplay={proofDisplay} />,
    },
    {
      index: '02',
      title: 'Compliance PDF for the CISO',
      blurb:
        'One-click filable PDF stamped with audit ID, hash, sources, and disclaimers. Drops into the same evidence binder your security team is already filing for SOC 2 and HIPAA assessments.',
      hrefLabel: 'See a sample PDF',
      href: '/audit',
      icon: <FileText className="h-4 w-4" />,
      visual: <PdfVisual />,
      reverse: true,
    },
    {
      index: '03',
      title: 'Embed badge for the article',
      blurb:
        "A one-line iframe snippet your editorial team drops into the published article. Readers see a verified ribbon. Click to walk the chain back to genesis in their own tab. Zero JavaScript dependencies.",
      hrefLabel: 'View embed snippet',
      href: '#',
      icon: <Code2 className="h-4 w-4" />,
      visual: <EmbedVisual />,
    },
    {
      index: '04',
      title: 'Voice profile scorecard',
      blurb:
        "Upload 3-5 archive articles. AssuredAI extracts a voice signature — reading level, sentence rhythm, vocabulary, direct address — and scores every new draft against it. Compliance keeps you out of trouble. Voice keeps you on brand.",
      hrefLabel: 'See voice scoring live',
      href: '/voice',
      icon: <Mic className="h-4 w-4" />,
      visual: <VoiceVisual />,
      reverse: true,
    },
  ];

  return (
    <section id="featured-artifacts" className="relative overflow-hidden border-b border-border/60 bg-background">
      <div className="relative mx-auto max-w-[1320px] px-5 py-24 sm:py-32">
        <SectionEyebrow n="06">The evidence</SectionEyebrow>
        <SectionHeadline>Defensible evidence, in your hands.</SectionHeadline>
        <SectionLede>
          When something does get questioned — by a regulator, a journalist, a plaintiff&apos;s
          attorney — these four artifacts are what your team hands over. Filed, hashed, and
          re-verifiable by anyone with a browser.
        </SectionLede>

        <div className="mt-20 space-y-28">
          {artifacts.map((a) => (
            <RevealOnScroll key={a.index} direction={a.reverse ? 'right' : 'left'}>
              <ArtifactRow {...a} />
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArtifactRow({ index, title, blurb, hrefLabel, href, icon, visual, reverse }: Artifact) {
  return (
    <div className={`grid items-center gap-10 lg:gap-16 ${reverse ? 'lg:grid-cols-[1fr_1.1fr]' : 'lg:grid-cols-[1.1fr_1fr]'}`}>
      <div className={reverse ? 'lg:order-2' : ''}>
        <div className="mb-6 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="font-mono text-foreground">{index}</span>
          <span className="h-px w-10 bg-border" />
          <span className="inline-flex items-center gap-1.5">
            {icon}
            Artifact
          </span>
        </div>
        <h3 className="font-semibold leading-[1.0] tracking-[-0.025em] text-[40px] sm:text-[52px] md:text-[60px]">
          {title}
        </h3>
        <p className="mt-6 max-w-[520px] text-[16px] leading-[1.6] text-muted-foreground sm:text-[17px]">
          {blurb}
        </p>
        <Link
          href={href}
          className="mt-8 inline-flex items-center gap-2 text-[13.5px] font-medium text-foreground hover:opacity-70"
        >
          <span className="underline decoration-foreground/30 decoration-[1.5px] underline-offset-[6px] group-hover:decoration-foreground">
            {hrefLabel}
          </span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className={reverse ? 'lg:order-1' : ''}>{visual}</div>
    </div>
  );
}

function ProofVisual({ proofDisplay }: { proofDisplay: string }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-primary/15 to-emerald-500/10 blur-2xl" aria-hidden />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/10">
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2 text-[10.5px]">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-amber-400/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="ml-2 inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
            assured-ai.com{proofDisplay}
          </div>
        </div>
        <div className="space-y-3 p-6">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-500/40">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Cryptographic proof</div>
              <div className="text-[14.5px] font-semibold">Verified by AssuredAI</div>
              <div className="text-[11px] text-muted-foreground">Demo publisher · May 10, 2026 · 833ms</div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <span>Chain · 5 blocks</span>
              <span className="text-emerald-700 dark:text-emerald-300">VALID</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {['genesis', '#211', '#212', '#213', '#214'].map((b, i) => (
                <div key={b} className={`rounded border px-1 py-1.5 text-center text-[9px] font-semibold ${i === 4 ? 'border-primary bg-card text-primary' : 'border-border bg-card text-foreground'}`}>
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PdfVisual() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-primary/15 to-amber-500/10 blur-2xl" aria-hidden />
      <div className="relative">
        {/* Stacked paper effect */}
        <div className="absolute inset-x-6 -bottom-1 -top-1 rotate-[1.5deg] rounded-md border border-border bg-card shadow-md" aria-hidden />
        <div className="absolute inset-x-3 -bottom-0.5 -top-0.5 -rotate-[0.5deg] rounded-md border border-border bg-card shadow-md" aria-hidden />

        <div className="relative aspect-[8.5/11] overflow-hidden rounded-md border border-border bg-card shadow-2xl shadow-foreground/12">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              AssuredAI · Compliance attestation
            </div>
            <div className="mt-1 font-semibold text-[15px]">Audit #00214 · Demo publisher</div>
          </div>
          <div className="space-y-3 p-6 text-[10px] text-foreground">
            <Row label="Article title" value="DASH eating plan for blood pressure" />
            <Row label="Outcome" value="answered · 0 red flags" />
            <Row label="Model" value="claude-sonnet-4-5" />
            <Row label="PII redacted" value="2 tokens · PERSON, EMAIL_ADDRESS" />
            <Row label="Sources cited" value="5 · CDC, NIH/NHLBI" />
            <Row label="Disclaimer" value="auto-injected · HIPAA-aware" />
            <Row label="Previous hash" value="cb12…ffc8" mono />
            <Row label="Current hash" value="8192…c539" mono />
            <Row label="Chain status" value="VALID" highlight />
            <div className="mt-4 rounded border border-border bg-muted/20 p-2 text-center">
              <div className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground">Re-verify in browser</div>
              <div className="mt-0.5 font-mono text-[9.5px] text-primary">assured-ai.com/v/214</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-1.5">
      <span className="text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} ${highlight ? 'rounded bg-emerald-100 px-1.5 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : ''}`}>{value}</span>
    </div>
  );
}

function EmbedVisual() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-emerald-400/15 to-primary/10 blur-2xl" aria-hidden />
      <div className="space-y-4">
        {/* Code window */}
        <div className="overflow-hidden rounded-xl border border-border bg-[#0b1320] text-white shadow-2xl shadow-foreground/10">
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-red-400/80" />
              <span className="size-2.5 rounded-full bg-amber-400/80" />
              <span className="size-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <span className="ml-2 text-[10.5px] text-white/50 font-mono">embed.html</span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[11.5px] leading-[1.7]">
{`<iframe
  src="https://assured-ai.com/embed/v/214"
  width="100%" height="92"
  loading="lazy"
  style="border:0;border-radius:12px">
</iframe>`}
          </pre>
        </div>
        {/* Rendered badge preview */}
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-card p-4 shadow-md dark:border-emerald-900 dark:from-emerald-950/30">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-500/40">
              <Lock className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Verified by AssuredAI</div>
              <div className="text-[12.5px] text-muted-foreground">5 sources · 0 red flags · chain valid</div>
            </div>
            <span className="font-mono text-[10.5px] text-muted-foreground">/v/214</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceVisual() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-primary/15 to-emerald-500/10 blur-2xl" aria-hidden />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-foreground/10">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <div className="text-[14.5px] font-semibold">Demo voice profile · Patient education</div>
            <div className="text-[11px] text-muted-foreground">Built from 3 archive samples</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Voice match</div>
            <div className="text-[26px] font-semibold tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
              34<span className="text-[14px] font-normal text-amber-600/60 dark:text-amber-400/60">/100</span>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Bar label="Reading grade level" pct={95} />
          <Bar label="Avg sentence length" pct={45} />
          <Bar label="Direct address (you)" pct={85} />
          <Bar label="Passive voice" pct={80} />
        </div>
      </div>
    </div>
  );
}

function Bar({ label, pct }: { label: string; pct: number }) {
  const tone = pct > 70 ? 'bg-red-500' : pct > 40 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-3 text-[11.5px]">
      <span className="w-44 shrink-0 truncate text-foreground">{label}</span>
      <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-10 shrink-0 text-right font-mono tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}
