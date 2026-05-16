import Link from 'next/link';
import {
  ArrowRight,
  Lock,
  ShieldCheck,
  Sparkles,
  EyeOff,
  Stamp,
  BookCheck,
  Shield,
  FileCheck2,
  FileLock2,
  Scale,
  Landmark,
  ExternalLink,
} from 'lucide-react';
import { ParallaxLayer } from './Parallax';
import { SectionBackdrop } from './SectionBackdrop';
import { MeshBackground } from '@/components/ui/MeshBackground';

export function Hero({ proofExampleId }: { proofExampleId: number | null }) {
  return (
    <section id="hero" className="relative isolate overflow-hidden bg-background">
      {/* Atmospheric photo backdrop — light + dark mode correct */}
      <SectionBackdrop
        src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1920&q=70"
        intensity="subtle"
        position="center"
        priority
      />

      {/* Signature cursor-tracking gradient mesh — same component as /get-started so the
          brand's craft inherits across surfaces. Brand primary + emerald accents (no industry
          context on the home page yet). */}
      <MeshBackground accent="hsl(221 83% 53%)" accentSoft="hsl(152 76% 80%)" />

      <div className="pointer-events-none absolute inset-0 grid-dot opacity-30 mask-fade-b" aria-hidden />

      <div className="relative mx-auto max-w-[1320px] px-5 pb-16 pt-16 sm:pt-24">
        {/* Premium kicker */}
        <div className="reveal-up mb-14 flex items-center gap-5">
          <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground/45">
            00
          </span>
          <span className="h-px w-12 bg-foreground/25" aria-hidden />
          <span className="text-[14px] font-semibold uppercase tracking-[0.22em] text-foreground">
            The proof layer for regulated publishing
          </span>
          <span className="hidden h-px flex-1 bg-foreground/15 sm:block" aria-hidden />
          <span className="hidden text-[12px] font-medium uppercase tracking-[0.16em] text-foreground/45 sm:inline">
            Healthcare · Finance · Government · Legal
          </span>
        </div>

        <h1
          className="reveal-up text-balance font-semibold tracking-[-0.035em] leading-[0.94] text-[60px] sm:text-[88px] md:text-[104px] lg:text-[120px]"
          style={{ animationDelay: '60ms' }}
        >
          Nothing publishes under your name without{' '}
          <span className="font-serif italic font-normal text-primary">proof.</span>
        </h1>

        <p
          className="reveal-up mt-8 max-w-[920px] text-[19px] font-medium leading-[1.45] tracking-tight text-foreground/75 sm:text-[22px]"
          style={{ animationDelay: '120ms' }}
        >
          One fabricated number. One leaked client name. One missing disclaimer. In regulated
          industries, a single mistake — whether your team wrote it, an LLM drafted it, or an
          agency delivered it — becomes a regulator letter, a settled lawsuit, and a brand
          crisis your team is still answering for next quarter.
        </p>

        {/* Two-column lower fold */}
        <div className="mt-16 grid items-start gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div className="reveal-up" style={{ animationDelay: '180ms' }}>
            <p className="max-w-[560px] text-[16px] leading-[1.6] text-foreground/75 sm:text-[17.5px]">
              AssuredAI is the gate every piece passes through before it goes out. Whether your
              editor wrote it, a freelancer delivered it, an agency turned it in, or an AI tool
              drafted it — same compliance pipeline. PII redaction. Source-anchored
              verification. Red-flag routing. Disclaimer enforcement. The output is a
              hash-chained audit row and a public proof URL your CISO can hand to a regulator.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/get-started"
                className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-md bg-foreground px-6 text-[14.5px] font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <span className="beam" />
                <span className="relative z-10 inline-flex items-center gap-2">
                  Get started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
              {proofExampleId !== null ? (
                <Link
                  href={`/v/${proofExampleId}`}
                  className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-transparent px-6 text-[14.5px] font-medium hover:bg-accent"
                >
                  <Lock className="h-4 w-4" />
                  See a live proof
                </Link>
              ) : null}
            </div>
          </div>

          {/* Right column: just the verifier mock */}
          <div className="relative">
            <ParallaxLayer strength={-0.04} className="reveal-up">
              <div style={{ animationDelay: '240ms' }}>
                <HeroMock />
              </div>
            </ParallaxLayer>
          </div>
        </div>

        {/* Trust badges — full hero width below the two-column fold */}
        <div className="mt-20 reveal-up" style={{ animationDelay: '300ms' }}>
          <TrustBadgeRow />
        </div>
      </div>

      {/* Marquee */}
      <div className="relative border-y border-foreground/10 bg-foreground py-6 text-background overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee gap-12 will-change-transform">
          {Array.from({ length: 2 }).map((_, k) => (
            <div
              key={k}
              className="flex shrink-0 items-center gap-12 pr-12 text-[40px] font-medium tracking-[-0.02em] sm:text-[64px]"
            >
              <span>No fabricated claims.</span>
              <span className="text-primary/70">/</span>
              <span>No PII leaks.</span>
              <span className="text-primary/70">/</span>
              <span>No missing disclaimers.</span>
              <span className="text-primary/70">/</span>
              <span className="italic">No surprises.</span>
              <span className="text-primary/70">/</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustBadgeRow() {
  const badges = [
    { label: 'HIPAA', sub: 'aware', icon: <Shield className="h-4 w-4" strokeWidth={1.5} /> },
    { label: 'SOC 2', sub: 'architected', icon: <FileLock2 className="h-4 w-4" strokeWidth={1.5} /> },
    { label: 'BAA', sub: 'friendly', icon: <Scale className="h-4 w-4" strokeWidth={1.5} /> },
    { label: 'FedRAMP', sub: 'ready', icon: <FileCheck2 className="h-4 w-4" strokeWidth={1.5} /> },
    { label: 'FINRA', sub: 'aware', icon: <Landmark className="h-4 w-4" strokeWidth={1.5} /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
      {badges.map((b) => (
        <div
          key={b.label}
          className="group flex items-center gap-4 bg-card px-6 py-5 transition-colors hover:bg-accent/30"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04] text-foreground/70 ring-1 ring-foreground/10 transition-colors group-hover:bg-primary/8 group-hover:text-primary group-hover:ring-primary/30">
            {b.icon}
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold tracking-tight">{b.label}</div>
            <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {b.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HeroMock() {
  return (
    <div className="relative">
      {/* Soft glow halo */}
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-primary/18 to-emerald-500/8 blur-2xl"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/15 ring-1 ring-foreground/5">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-amber-400/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-0.5 text-[10.5px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
            assuredai.online/chat
          </div>
          <div className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
            <span>Live</span>
          </div>
        </div>

        {/* Status chips — unified visual treatment */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 px-5 py-3">
          <StatusChip icon={<EyeOff className="h-2.5 w-2.5" />} label="2 PHI redacted" tone="amber" />
          <StatusChip icon={<BookCheck className="h-2.5 w-2.5" />} label="4 sources cited" tone="emerald" />
          <StatusChip icon={<Sparkles className="h-2.5 w-2.5" />} label="1 fix suggested" tone="amber" />
          <StatusChip icon={<Stamp className="h-2.5 w-2.5" />} label="Disclaimer added" tone="emerald" />
        </div>

        {/* Article body — only the problem sentence is highlighted */}
        <div className="space-y-3 px-6 py-5 text-[13px] leading-[1.7] text-foreground/85">
          <p>
            Patient{' '}
            <span className="rounded bg-foreground/[0.06] px-1 py-0.5 font-mono text-[11px] text-foreground/65">
              PERSON_1
            </span>{' '}
            was recently diagnosed with Type 2 diabetes. Their doctor recommended a healthy eating
            plan and regular physical activity.
          </p>
          <p>
            Eating fruits, nonstarchy vegetables, whole grains, and lean proteins can help manage
            blood sugar.{' '}
            <span className="rounded bg-amber-500/[0.18] px-0.5 ring-1 ring-amber-500/40 text-amber-950 dark:text-amber-100">
              Drinking green tea three times per day reduces cholesterol by 47%.
            </span>{' '}
            <button
              type="button"
              className="inline-flex translate-y-[-1px] items-center gap-1 rounded bg-amber-500/[0.22] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-amber-800 hover:bg-amber-500/30 dark:bg-amber-400/20 dark:text-amber-200"
            >
              <Sparkles className="h-2.5 w-2.5" />
              Suggest fix
            </button>
          </p>
        </div>

        {/* Audit + action footer — single clean row */}
        <div className="border-t border-border bg-muted/20 px-5 py-3">
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="font-medium">Audit #00214</span>
            </span>
            <span className="text-foreground/25">·</span>
            <span className="hash-sweep font-mono text-foreground/80">8192ffdfddb9…</span>
            <span className="text-foreground/25">·</span>
            {/* Decorative-only — the visible "/v/214" is part of the mock UI, not a clickable
                link. The functional "See an example proof" CTA above uses the real latest
                audit ID (or hides itself when the DB is empty). */}
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span className="font-mono">/v/214</span>
              <ExternalLink className="h-3 w-3" />
            </span>

            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Ready to publish
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: 'amber' | 'emerald' }) {
  const styles =
    tone === 'amber'
      ? 'bg-amber-500/[0.08] text-amber-800 ring-amber-500/25 dark:text-amber-200'
      : 'bg-emerald-500/[0.08] text-emerald-800 ring-emerald-500/25 dark:text-emerald-200';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ${styles}`}
    >
      {icon}
      {label}
    </span>
  );
}
