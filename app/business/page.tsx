import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Anchor,
  Award,
  BadgeCheck,
  Banknote,
  Beaker,
  Brain,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Database,
  Eye,
  FileCheck2,
  FileLock2,
  FileText,
  Flag,
  Gavel,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Home,
  Landmark,
  Layers,
  LineChart,
  Link2,
  Lock,
  Megaphone,
  Network,
  Newspaper,
  Pill,
  Radar,
  Rocket,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  Telescope,
  Umbrella,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/Header';
import { HeaderAuthChip } from '@/components/marketing/HeaderAuth';
import { Citation, SourceList } from '@/components/business/sources';
import { Tabs } from '@/components/business/Tabs';
import { StickyToc } from '@/components/business/StickyToc';
import { PhotoFigure, EDITORIAL_PHOTOS } from '@/components/business/PhotoFigure';
import IcebergCompoundingDamage from '@/components/business/IcebergCompoundingDamage';
import WhyNowConvergence from '@/components/business/WhyNowConvergence';
import MarketMap from '@/components/business/MarketMap';
import TamExpansionInteractive from '@/components/business/TamExpansionInteractive';
import ProductArchitecture, {
  ProductArchitectureClosers,
} from '@/components/business/ProductArchitecture';
import {
  Eyebrow,
  Body,
  BodySm,
  Lede,
  H2,
  H3,
  Caption,
} from '@/components/business/Type';
import {
  Counter,
  LogoGrid,
  LogoStrip,
  LogoTile,
  PullStat,
  SectionIcon,
  TrustSeal,
  StatCard,
  Chip,
} from '@/components/business/VisualKit';
import {
  COMP_LOGOS,
  EDITOR_SURFACES,
  FUELED_CLIENTS,
  INFRA_TRINITY,
  LLM_PROVIDER_CUSTOMERS,
  MODEL_PROVIDERS,
  NAMED_2024_FIRMS_ADJACENT,
  NAMED_2024_FIRMS_DIRECT,
  PARTNERSHIP_TRINITY,
  REGULATORS,
} from '@/components/business/logoData';
import {
  ARRTrajectory,
} from '@/components/business/Charts';

export const metadata: Metadata = {
  title: 'The Grammarly of Regulated Industries',
  description:
    'AssuredAI verifies every paragraph against approved sources before it ships. The compliance layer for healthcare, finance, government, and legal content.',
  robots: { index: false, follow: false },
};

// ─────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#0a0e1a] text-white">
      {/* Ambient mesh — restrained, institutional */}
      <div
        className="absolute inset-0 opacity-[0.45]"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 70% 50% at 18% 0%, rgba(16, 185, 129, 0.18) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 86% 32%, rgba(45, 70, 120, 0.40) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 50% 100%, rgba(16, 185, 129, 0.10) 0%, transparent 60%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.65'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Hero cover photograph — Capitol Dome anchors the brief in the
          regulatory reality the thesis lives inside, before a single word
          lands. Gradient fades into the dark canvas; no overlay caption. */}
      <div className="relative h-[28vh] min-h-[200px] max-h-[340px] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/a/a1/The_dome_of_the_United_States_Capitol_building.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.55]"
          style={{ filter: 'contrast(1.05) saturate(0.75)' }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(10,14,26,0.25) 0%, rgba(10,14,26,0.55) 55%, rgba(10,14,26,0.95) 90%, #0a0e1a 100%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1180px] px-6 pb-24 pt-12 lg:px-12 lg:pb-28 lg:pt-16">
        {/* Masthead — restrained, institutional */}
        <div className="mb-16 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-white/55">
            Strategic analysis
          </span>
          <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-white/55">
            May 2026
          </span>
        </div>

        {/* The thesis — Fraunces display */}
        <h1
          className="max-w-[16ch] font-display text-[clamp(3rem,8.5vw,7.5rem)] font-medium leading-[0.96] tracking-[-0.025em] text-white"
          style={{ fontOpticalSizing: 'auto', fontVariationSettings: '"SOFT" 50, "opsz" 144' }}
        >
          The Grammarly of{' '}
          <em
            className="font-display italic text-emerald-300/85"
            style={{ fontVariationSettings: '"SOFT" 100, "opsz" 144' }}
          >
            regulated industries.
          </em>
        </h1>

        {/* Phase 5: hero body broken from one 200-word wall into three
            paragraphs. Same substance; the extra air lets the eye rest
            between the thesis, the precedent, and the asset story. */}
        <div className="mt-10 max-w-[62ch] space-y-5 text-[clamp(1.1rem,1.45vw,1.32rem)] leading-[1.55] text-white/75">
          <p>
            A few notes on why I think this is worth building inside
            Fueled, not somewhere else. Veeva (life sciences)
            <Citation id="veeva-market-cap" tone="onDark" /> and OneTrust
            (privacy)
            <Citation id="onetrust-series-c" tone="onDark" /> both crossed
            $5B in value by becoming the software regulated companies in
            their industries ended up having to run. Nothing comparable
            exists yet for editorial compliance &mdash;{' '}
            <Bold>a review layer that verifies any piece of content
            &mdash; staff-written, agency, or AI-drafted &mdash; against
            the rules its regulator enforces, before it ships.</Bold>
          </p>
          <p>
            The SEC and FDA both issued public actions last year against
            named firms for misleading content; HHS and FINRA pursued
            significant penalties in the same window. The published
            Assured AI whitepaper{' '}
            <Citation id="fueled-whitepaper" /> lays out the framework
            (healthcare-first); this brief extends it to the eight
            regulated verticals already on assuredai.online.
          </p>
          <p>
            The Fueled client roster already covers most of them &mdash;{' '}
            <Bold>Mayo Clinic, Cleveland Clinic (1B+ annual
            health-content visits)
            <Citation id="cleveland-clinic-traffic" tone="onDark" />,
            Stanford Medicine, KFF, Harvard T.H. Chan, Vida Health, The
            Florey Institute, WCG Clinical, the White House, California
            DMV</Bold> &mdash; and ClassifAI is already running inside
            their editors. Most of the hard parts are already in the
            building.
          </p>
        </div>

        {/* (Hero stat dashboard removed — the Cleveland Clinic "1B+
            annual visits" volume card, the $1.47B US SAM counter, the
            "8 verticals" counter, and the $1.7B–$26B comparable-exits
            tile all live in proper context later in the brief:
              • Cleveland Clinic 1B+ → §05 Who pays (Healthcare tab)
                and inline in the thesis paragraph above
              • $1.47B US SAM → §03 Market (full bottom-up math)
              • 8 verticals → §05 Who pays tabs, §07 10-yr horizon
              • $1.7B–$26B comparables → §02 Comparables (all five
                firms with citations + market-cap detail)
            Hero stays thesis-only. The reader earns the inventory
            by reading the brief, not by glancing at it.) */}

        {/* (Eight-verticals pill strip removed from hero — same reason
            as the Fueled-client roster: the brief covers the eight
            verticals multiple times below — §03 Market, §05 Who pays
            tabs, §06 Revenue, §07 10-yr horizon. The hero stays focused
            on thesis, not on inventory the reader will encounter four
            more times in proper context.) */}

        {/* (Fueled-client roster moved out of hero — it now lives at the
            end of §05 (Who pays) as a warm-start closer. Hero stays
            focused on thesis + stakes; buyer-list belongs in the
            GTM / execution arc, not before the reader knows what
            we're selling.) */}

        {/* (Compliance run-head removed — rule citations like
            "HIPAA 164.312(b)" and methodology meta-commentary like
            "primary-source cited" are compliance-officer language,
            not executive-opener language. The specific rule numbers
            still appear inline in §03 Solution and §04 Product
            where they describe the verifier's capability. */}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EXECUTIVE SUMMARY — 60-second skim
// ─────────────────────────────────────────────────────────────────────────

function ExecSummary() {
  const bullets: Array<{
    label: string;
    body: React.ReactNode;
    href: string;
    target: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    // ("The opportunity" tile removed — it duplicated the hero thesis
    //  above and pointed forward to §03 Comparables, where the reader
    //  encounters the $1.7B–$26.9B range with all five firms cited
    //  inline. The remaining 6 tiles open with "The stakes" — a
    //  natural continuation from the hero's regulatory-corpus outro.)
    // Tile order matches the YC section reading order top-to-bottom on
    // the page (§01 → §04 → §05 → §06 → §07 → §08), so the grid scans
    // the same way the brief does. §02 (Why now) and §03 (Market)
    // intentionally don't have tiles — they're category / inventory
    // sections, not narrative beats an exec needs surfaced in the
    // 60-second skim.
    {
      label: 'Problem',
      icon: <AlertOctagon className="h-full w-full" />,
      color: '#b45309',
      href: '#sec-01',
      target: 'Jump to §01 Problem',
      // Citations stripped from this tile body — the whole tile is
      // itself a <Link>, and Citation renders an <a> tag, which
      // would create nested anchors (HTML hydration error). The
      // citations live inside §01 where they belong; the skim tile
      // doesn't need them.
      body: (
        <>
          Four regulators with active enforcement. SEC + FDA hit named
          firms for misleading content; HHS + FINRA pursued significant
          penalties in the same window.
        </>
      ),
    },
    {
      label: 'Product',
      icon: <Workflow className="h-full w-full" />,
      color: '#0d9488',
      href: '#sec-04',
      target: 'Jump to §04 Product',
      body: (
        <>
          Working reference at{' '}
          <span className="text-foreground/85">assuredai.online</span>.
          Model-agnostic (OpenAI · Azure · Gemini · Grok · AWS ·
          Ollama-local). WordPress plugin in production; Google Docs Chrome
          ext in beta. SOC&nbsp;2 Type I in months 3&ndash;4.
        </>
      ),
    },
    {
      label: 'Traction',
      icon: <Layers className="h-full w-full" />,
      color: '#059669',
      href: '#sec-05',
      target: 'Jump to §05 Traction',
      body: (
        <>
          Y1: healthcare + state-level government (BAA at signing, no
          FedRAMP required). Y2: pharma research, insurance, finance. Y3:
          legal, real estate, higher ed.
        </>
      ),
    },
    {
      label: 'Business model',
      icon: <LineChart className="h-full w-full" />,
      color: '#10b981',
      href: '#sec-06',
      target: 'Jump to §06 Business model',
      body: (
        <>
          Two motions. <Bold>Services</Bold> &mdash; we deliver.{' '}
          <Bold>SaaS</Bold> &mdash; you operate. Different products,
          different buyers.
        </>
      ),
    },
    {
      label: 'To be continued',
      icon: <Telescope className="h-full w-full" />,
      color: '#15803d',
      href: '#sec-tbc',
      target: 'Jump to the sample terminator',
      body: (
        <>
          The full brief &mdash; Year-1 revenue plan, unit economics,
          assumptions, strategic observations, and the long-horizon
          platform case &mdash; is currently in private review.{' '}
          <Bold>Available on request.</Bold>
        </>
      ),
    },
  ];

  return (
    <section
      id="sec-exec"
      className="border-b border-foreground/10 bg-card/40 scroll-mt-20"
    >
      <div className="mx-auto max-w-[1280px] px-6 py-12 lg:px-12 lg:py-16">
        <div className="mb-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="flex items-baseline gap-3 font-display text-[clamp(1.4rem,2.2vw,1.85rem)] font-medium leading-none text-foreground tracking-[-0.015em]"
              style={{ fontVariationSettings: '"opsz" 72, "SOFT" 40' }}>
            <Sparkles className="h-4 w-4 text-emerald-700" />
            Executive summary
          </h2>
          <p className="text-[14px] leading-[1.4] text-foreground/55">
            Click any tile to jump.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {bullets.map((b, i) => {
            // Each card gets a generative gradient-mesh background tied to
            // its theme. Distinct positioning + complementary tones per
            // card so the 7-tile composition reads as a varied editorial
            // spread rather than 7 identical buckets. All gradients sit
            // under a grain texture for the "AI-art" feel Mo asked for,
            // while staying low-opacity so the body text remains the
            // primary visual element.
            // Mesh order matches the new 6-tile lineup after dropping
            // "The opportunity" (the duplicate of the hero thesis). Each gradient
            // is intentionally distinct so the spread reads as varied,
            // not as a 6-identical-bucket dashboard.
            const meshes = [
              // 0: Problem — warning bloom from top-left (amber)
              `radial-gradient(ellipse 100% 60% at 0% 0%, ${b.color}28 0%, ${b.color}10 30%, transparent 65%), radial-gradient(ellipse 55% 45% at 100% 100%, ${b.color}12 0%, transparent 60%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)`,
              // 1: Product — focused centered bloom
              `radial-gradient(ellipse 75% 65% at 50% 40%, ${b.color}1c 0%, ${b.color}08 35%, transparent 70%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)`,
              // 2: Traction — diagonal layered band
              `linear-gradient(135deg, ${b.color}18 0%, ${b.color}06 35%, transparent 55%), radial-gradient(ellipse 60% 50% at 100% 100%, ${b.color}14 0%, transparent 60%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)`,
              // 3: Business model — flowing diagonal mesh
              `radial-gradient(ellipse 110% 55% at 50% 0%, ${b.color}1a 0%, ${b.color}06 35%, transparent 60%), radial-gradient(ellipse 75% 55% at 0% 100%, ${b.color}14 0%, transparent 60%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)`,
              // 4: Vision — ascending trajectory
              `linear-gradient(35deg, ${b.color}1c 0%, ${b.color}08 40%, transparent 60%), radial-gradient(ellipse 65% 55% at 100% 0%, ${b.color}14 0%, transparent 60%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)`,
              // 5: Strategic observations — wide horizon bloom
              `radial-gradient(ellipse 130% 45% at 50% 100%, ${b.color}26 0%, ${b.color}0c 35%, transparent 65%), radial-gradient(ellipse 70% 50% at 50% 0%, ${b.color}10 0%, transparent 70%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)`,
            ];
            const grainSvg =
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";
            return (
            <li key={i}>
              <Link
                href={b.href}
                aria-label={b.target}
                className="group relative isolate flex h-full flex-col gap-3 overflow-hidden rounded-lg border border-foreground/10 p-5 transition hover:border-foreground/30 hover:shadow-[0_12px_40px_-20px_rgba(0,0,0,0.18)]"
                style={{ backgroundImage: meshes[i] }}
              >
                {/* Grain texture overlay — gives the gradient mesh the
                    organic "AI-art" surface quality. Mix-blend-overlay so
                    it modulates the underlying mesh rather than sitting
                    flat on top. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay"
                  style={{ backgroundImage: grainSvg }}
                />
                {/* Soft top-edge highlight so each card feels lit from above */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent 0%, ${b.color}55 40%, ${b.color}55 60%, transparent 100%)` }}
                />
                {/* Top row — section icon + section number tag + chevron.
                    The §NN tag is derived from the tile's href so it
                    always matches the click destination. Sits next to the
                    chevron because that's the "where am I going" cluster
                    of the card. */}
                <div className="relative z-10 flex items-start justify-between">
                  <SectionIcon color={b.color}>{b.icon}</SectionIcon>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="font-mono text-[11px] tabular-nums tracking-[0.06em] text-foreground/40"
                      aria-hidden="true"
                    >
                      §{b.href.match(/#sec-(\d+)/)?.[1] ?? ''}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
                    />
                  </div>
                </div>
                <h3
                  className="relative z-10 font-display text-[clamp(1.1rem,1.55vw,1.3rem)] font-medium leading-[1.15] tracking-[-0.005em]"
                  style={{ color: b.color, fontVariationSettings: '"opsz" 36, "SOFT" 50' }}
                >
                  {b.label}.
                </h3>
                <Body as="div" tone="muted" className="relative z-10 leading-[1.5]">
                  {b.body}
                </Body>
              </Link>
            </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// THE ANALOGY
// ─────────────────────────────────────────────────────────────────────────

function Analogy() {
  const rows: Array<[string, string]> = [
    ['Catches typos', 'Catches unverifiable claims against your source library'],
    ['Suggests phrasing', 'Redacts PHI, PII, and confidential identifiers before they leak'],
    ['Highlights tone', 'Flags content your regulator flags — vertical-specific rules'],
    ['Runs in your editor', 'Runs in your CMS — WordPress, Notion, Google Docs, Substack'],
    ['Improves the prose', 'Defends the publisher with a tamper-evident audit trail'],
  ];

  return (
    <section className="bg-card/40">
      <div className="mx-auto max-w-[1280px] px-6 py-28 lg:px-12">
        <SectionHeader
          number="01"
          label="The category"
          title="One layer below the words."
          subtitle="Where the risk lives."
        />

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-foreground/10 bg-foreground/10 lg:grid-cols-2">
          <div className="bg-background p-8 lg:p-10">
            <div className="mb-1 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              Grammarly
            </div>
            <div className="font-serif text-[28px] leading-tight text-foreground/55">
              Style &amp; grammar
            </div>
          </div>
          <div className="bg-background p-8 lg:p-10">
            <div className="mb-1 font-mono text-[12px] uppercase tracking-[0.16em] text-primary">
              AssuredAI
            </div>
            <div className="font-serif text-[28px] leading-tight text-foreground">
              Compliance &amp; liability
            </div>
          </div>
          {rows.map(([g, a], i) => (
            <div key={i} className="contents">
              <div className="bg-background px-8 py-5 text-[15px] text-foreground/70 lg:px-10">
                {g}
              </div>
              <div className="bg-background px-8 py-5 text-[15px] font-medium text-foreground lg:px-10">
                {a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// WHY NOW
// ─────────────────────────────────────────────────────────────────────────

function WhyNow() {
  type Reg = {
    code: string;
    title: string;
    vertical: string;
    status: string;
    cite?: 'hipaa-164' | 'cfr-21-11' | 'eu-ai-act-art12';
    inForce: boolean;
  };
  const regs: Reg[] = [
    {
      code: '45 CFR 164.312(b)',
      title: 'HIPAA audit controls',
      vertical: 'Healthcare',
      status: 'In force',
      cite: 'hipaa-164',
      inForce: true,
    },
    {
      code: '21 CFR 11.10(e)',
      title: 'FDA tamper-evident audit trails',
      vertical: 'Healthcare / Pharma',
      status: 'In force',
      cite: 'cfr-21-11',
      inForce: true,
    },
    {
      code: 'FINRA Rule 2210',
      title: 'Broker-dealer communications review & supervision',
      vertical: 'Finance',
      status: 'In force',
      inForce: true,
    },
    {
      code: 'SEC Marketing Rule 206(4)-1',
      title: 'Adviser marketing review, substantiation, recordkeeping',
      vertical: 'Finance',
      status: 'In force',
      inForce: true,
    },
    {
      code: 'ABA Model Rule 7.1',
      title: 'Lawyer communications — false / misleading prohibition',
      vertical: 'Legal',
      status: 'In force',
      inForce: true,
    },
    {
      code: 'EU AI Act Article 12',
      title: 'Automatic event logging, high-risk AI systems',
      vertical: 'Cross-vertical · EU',
      status: 'Aug 2 2026',
      cite: 'eu-ai-act-art12',
      inForce: false,
    },
  ];

  return (
    <section className="border-t border-foreground/10">
      <div className="mx-auto max-w-[1280px] px-6 py-32 lg:px-12">
        <div className="mb-16 max-w-[60ch]">
          <div className="mb-4 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            Why now
          </div>
          <h2 className="font-serif text-[clamp(2rem,4.5vw,3.5rem)] font-normal leading-[1.05] tracking-tight text-foreground">
            Every vertical has the rule.
            <br />
            <span className="italic text-foreground/55">
              None has the layer.
            </span>
          </h2>
          <p className="mt-6 max-w-[60ch] text-[15px] leading-[1.6] text-muted-foreground">
            Every regulated publisher already operates under one of the rules
            below — and pays humans to enforce it. The platform layer
            doesn&apos;t replace the humans; it makes the evidence trail
            defensible against a regulator, a plaintiff, or a CFO audit.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {regs.map((r) => (
            <div
              key={r.code}
              className="flex flex-col justify-between rounded-lg border border-foreground/10 bg-card/40 p-6"
            >
              <div>
                <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-primary">
                  {r.code}
                  {r.cite ? <> <Citation id={r.cite} /></> : null}
                </div>
                <div className="mt-3 font-serif text-[20px] leading-[1.2] text-foreground">
                  {r.title}
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between border-t border-foreground/10 pt-4">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  {r.vertical}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      r.inForce ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}
                  />
                  <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-foreground/75">
                    {r.status}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MARKET — TAM / SAM / SOM
// ─────────────────────────────────────────────────────────────────────────

function Market() {
  return (
    <section id="sec-03" className="bg-foreground text-background scroll-mt-20">
      <div className="mx-auto max-w-[1280px] px-6 py-28 lg:px-12">
        <SectionHeader
          number="03"
          label="Market"
          title="How big is this, vertical by vertical."
          variant="dark"
        />

        {/* Single interactive exhibit. Owns TAM annotation, treemap with
            hover-driven side panel, SOM slider with synchronized
            water-line overlays, and methodology-on-demand. Replaces the
            prior four stacked blocks (TAM, treemap, SAM table, SOM,
            methodology). */}
        <MarketMap />

        {/* TAM Expansion Engine — moved here from §07b. Sits directly
            beneath the market map because it answers the obvious next
            question: "and how does this grow?" Shows the path from
            today's $1.47B SAM to ~$6.5B by 2030 (~4.4×), broken into
            the specific expansion vectors that compound on top of the
            current addressable base. */}
        <div className="mt-12 rounded-lg border border-background/10 bg-background/[0.04] p-7 lg:p-10">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-display text-[clamp(1.55rem,2.4vw,2rem)] font-normal text-background"
                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40' }}>
              Same market, by 2030.
            </h3>
            <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-emerald-300">
              $1.47B today &rarr; ~$6.5B by 2030 · ~4.4&times; growth
            </span>
          </div>
          <p className="mb-7 max-w-[68ch] text-[14.5px] leading-[1.55] text-background/65">
            Today&rsquo;s base, re-sized as AI compliance, EU AI Act,
            and agentic / multimodal each add their own lines. Hover
            any 2030 segment for the AI flood inside it and the named
            players already
            operating there.
          </p>
          <TamExpansionInteractive />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ENFORCEMENT — the cost of doing nothing
// ─────────────────────────────────────────────────────────────────────────

function Enforcement() {
  const items: Array<{
    regulator: string;
    regulatorLogo: { src: string; alt: string };
    vertical: string;
    headline: string;
    barValue: number;
    barLabel: string;
    color: string;
    sub: string;
    detail: React.ReactNode;
    cite: 'hhs-ocr-enforcement' | 'finra-2024-fines' | 'sec-marketing-rule-sept-2024' | 'fda-opdp-2024';
  }> = [
    {
      regulator: 'HHS OCR',
      regulatorLogo: REGULATORS.hhs,
      vertical: 'Healthcare',
      headline: '$144.9M',
      barValue: 144.9,
      barLabel: '$144.9M',
      color: '#047857',
      sub: '152 cases · cumulative',
      detail: (
        <>
          Recent: $4.75M Montefiore settlement
          <Citation id="hhs-montefiore-2024" />{' '}
          &middot; $3M Solara settlement
          <Citation id="hhs-solara-2024" />
        </>
      ),
      cite: 'hhs-ocr-enforcement' as const,
    },
    {
      regulator: 'FINRA',
      regulatorLogo: REGULATORS.finra,
      vertical: 'Finance',
      headline: '$59.8M',
      barValue: 59.8,
      barLabel: '$59.8M',
      color: '#059669',
      sub: 'Annual fines · 552 disciplinary actions',
      detail: '$87M total monetary sanctions, full year (fines + restitution + disgorgement)',
      cite: 'finra-2024-fines' as const,
    },
    {
      regulator: 'SEC',
      regulatorLogo: REGULATORS.sec,
      vertical: 'Finance · advisers',
      headline: '$1.24M',
      barValue: 1.24,
      barLabel: '$1.24M · single sweep',
      color: '#10b981',
      sub: 'Single sweep · 9 firms',
      detail: 'Marketing Rule 206(4)-1 — $60K–$325K per firm; named: Abacus Planning, Richard Bernstein, others',
      cite: 'sec-marketing-rule-sept-2024' as const,
    },
    {
      regulator: 'FDA OPDP',
      regulatorLogo: REGULATORS.fda,
      vertical: 'Pharma',
      headline: '111+',
      barValue: 111,
      barLabel: '111+ untitled letters · all-time',
      color: '#34d399',
      sub: 'Untitled letters · OPDP all-time index',
      detail: 'FDA OPDP’s published index lists 111+ untitled letters; hundreds more across FDA Warning Letters and other Centers (CDER, CBER, CDRH). Most-recent-year cohort sampled in the case cards above.',
      cite: 'fda-opdp-2024' as const,
    },
  ];

  const maxBarValue = Math.max(...items.filter(i => typeof i.barValue === 'number').map(i => i.barValue));

  return (
    <section id="sec-01" className="bg-background scroll-mt-20">
      <div className="mx-auto max-w-[1280px] px-6 py-28 lg:px-12">
        <SectionHeader
          number="01"
          // Problem statement before the evidence — exec needs the
          // "what's the problem" sentence before the "what it cost" data.
          // Scope intentionally matches the hero thesis: ALL content
          // (staff-written, agency-delivered, AI-drafted), not just AI.
          // Most §01 firms got penalized for human-written content; an
          // AI-only framing would have a hole the reader could pick at.
          // Added cognitive-load sentence: even rigorous editors miss
          // things because the rule set is too big, too vertical-
          // specific, and changes too constantly to hold in human memory.
          // Added "across thousands of documents" for scale emphasis.
          label="Problem"
          title="Active enforcement, by regulator."
          intro="Every firm below ships content through legal and editorial review. The biggest brands still miss things — the rules span thousands of documents, change quarterly, and interact in ways no human reviewer can hold in mind. Below is what got past."
        />

        {/* Named 2024-firm logo grid — split into two cohorts to honor
            the intellectual-honesty test: AssuredAI does NOT prevent
            every kind of regulatory failure. The DIRECT cohort shipped
            misleading content (squarely in scope). The ADJACENT cohort
            was penalized for vectors AssuredAI does NOT govern (insider
            EHR theft, phishing, tracking-pixel leakage, payer-ops AI).
            Both shown so a skeptical reader sees the full landscape. */}
        <div className="mt-10 rounded-lg border border-foreground/10 bg-card/40 p-7 lg:p-10">
          {/* Headline + deck — proper editorial pairing, stacked.
              Display Fraunces at section-headline scale. */}
          <div className="mb-8 max-w-[60ch]">
            <h3
              className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-normal leading-[1.05] tracking-[-0.012em] text-foreground"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 0' }}
            >
              A sample of the firms behind the headlines.
            </h3>
            {/* (Deck removed — the two-cohort labels below ("Directly
                preventable" / "Adjacent harms") do the framing work
                themselves, and each cohort has its own descriptive
                paragraph. The headline can stand alone.)
                Headline rewritten 2026-05-19: "Every firm" implied
                completeness; replaced with explicit-subset framing. */}
          </div>

          {/* Cohort A — directly preventable. The 7 firms whose 2024
              violation IS exactly what AssuredAI's verification gate is
              designed to surface pre-publication. */}
          {/* Cohort label retained — it MAKES THE CLAIM that every
              firm shown below shipped content AssuredAI's verification
              gate is built to catch. That's the wedge thesis stated
              inline, not buried in body copy.
              (HMR nudge — adjacent-cohort removal 2026-05-19) */}
          <div className="mb-3 flex items-baseline gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            <h4
              className="font-display text-[clamp(1.1rem,1.45vw,1.3rem)] font-normal leading-[1.2] text-emerald-900"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              Directly preventable with a verification layer.
            </h4>
          </div>
          <p className="mb-5 max-w-[68ch] text-[15px] leading-[1.55] text-foreground/65">
            Unsupported efficacy claims, missing risk info, untrue
            statements, missing disclosures, comparative superiority
            without data. A pre-publish gate catches every category
            below.
          </p>
          {/* Case-card grid — each firm gets its own inline summary
              card so the reader gets the WHO + WHAT without context-
              switching to the primary source. The whole card is still
              the link to the verified primary-source PDF / press
              release; the ↗ icon top-right signals the click is
              outbound. Editorial register: Economist Schumpeter /
              Stripe Press case-brief / FT Lex column. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(NAMED_2024_FIRMS_DIRECT).map((f) => (
              <a
                key={f.alt}
                href={f.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col rounded-lg border border-foreground/10 bg-card/40 p-5 transition hover:border-foreground/30 hover:shadow-[0_12px_40px_-20px_rgba(0,0,0,0.18)] hover:bg-card/60"
                aria-label={f.alt}
              >
                {/* Top row: logo + outbound-link indicator */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-background p-2 ring-1 ring-foreground/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.src}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5 flex-shrink-0 text-foreground/30 transition group-hover:text-foreground/65"
                  >
                    <path
                      d="M5 3h8v8M5 11l8-8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Firm name — Fraunces display */}
                <h4
                  className="font-display text-[clamp(1.05rem,1.35vw,1.2rem)] font-normal leading-[1.2] text-foreground"
                  style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
                >
                  {f.name}
                </h4>

                {/* Regulator action eyebrow */}
                <p className="mt-1.5 text-[13px] leading-[1.3] text-emerald-800/75">
                  {f.actionLabel}
                </p>

                {/* The case summary — what they did, why it got flagged.
                    Sans-serif body text, ~14px, 3-4 lines per card. */}
                <p className="mt-4 text-[14px] leading-[1.55] text-foreground/75">
                  {f.summary}
                </p>
              </a>
            ))}
          </div>

          {/* ("Adjacent harms" cohort removed — naming firms AssuredAI
              CAN'T help reads as a concession in a stakes section.
              Execs want to know who got hit and that we'd have caught
              them; the 4 adjacent firms (UnitedHealth nH Predict,
              GoodRx tracking-pixel, Montefiore insider theft, Solara
              phishing) muddied that signal even though it was honest.
              The NAMED_2024_FIRMS_ADJACENT export is kept in case it's
              wanted back. The "X of 11" counters and the "Eleven names,
              two cohorts" closer all removed with this cohort.) */}
        </div>

        {/* ── FDA Letter Exhibit ────────────────────────────────────
            Real text excerpts from the FDA OPDP untitled letter to
            Novartis re: Kisqali, formatted to look like the actual
            government document. The reader sees what one of "these
            letters" actually says — concrete proof, not just a tile
            count. Highlighted (cyan) passages are the skimmable
            damage: misleading-impression finding, misbranding finding,
            and the 15-working-day response demand. Visual register:
            primary-source exhibit inset, paper background with strong
            drop-shadow, Times-style serif body, FDA letterhead. */}
        <div className="mx-auto mt-20 max-w-[860px]">
          {/* Caption above */}
          <div className="mb-6 max-w-[60ch]">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
              Exhibit · primary source
            </p>
            <h4
              className="mt-2 font-display text-[clamp(1.4rem,2.2vw,1.75rem)] font-normal leading-[1.15] text-foreground"
              style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30' }}
            >
              What one of these letters actually says.
            </h4>
            <p className="mt-3 text-[14px] leading-[1.55] text-foreground/65">
              Excerpts from FDA OPDP&rsquo;s untitled letter to Novartis re:
              Kisqali (DTC television advertisement). Highlights added for
              emphasis; full primary source linked below.
            </p>
          </div>

          {/* The letter itself — styled to look like a real FDA document */}
          <div
            className="rounded-sm bg-white px-10 py-12 text-[#1a1a1a] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] lg:px-16 lg:py-16"
            style={{
              fontFamily: '"Times New Roman", Times, "Liberation Serif", Georgia, serif',
              fontSize: '14.5px',
              lineHeight: '1.6',
            }}
          >
            {/* FDA letterhead block */}
            <div className="mb-10 border-b border-[#222] pb-5 text-center">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#555]">
                Department of Health and Human Services
              </div>
              <div className="mt-1.5 text-[15px] font-bold tracking-wide text-[#1a1a1a]">
                Food and Drug Administration
              </div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#666]">
                Silver Spring, MD 20993 · Office of Prescription Drug Promotion
              </div>
            </div>

            {/* RE: reference block */}
            <div className="mb-8">
              <div className="grid grid-cols-[60px_1fr] gap-y-0.5 text-[14.5px]">
                <div className="font-bold">RE:</div>
                <div>
                  KISQALI<sup className="text-[9px]">®</sup> (ribociclib) tablets, for oral use
                  <br />
                  DTC Television Advertisement
                  <br />
                  MA-297
                </div>
              </div>
            </div>

            <p className="mb-5">Dear Mr./Ms. [Redacted]:</p>

            <p className="mb-5">
              The Office of Prescription Drug Promotion (OPDP) of the U.S.
              Food and Drug Administration (FDA) has reviewed the
              direct-to-consumer television advertisement (TV ad)<sup className="text-[9px]">1</sup>{' '}
              for KISQALI<sup className="text-[9px]">®</sup> (ribociclib) tablets submitted by Novartis
              Pharmaceuticals Corporation (Novartis) under cover of Form
              FDA 2253.
            </p>

            <p className="mb-5">
              <mark
                className="px-0.5"
                style={{ backgroundColor: '#9ecbff66' }}
              >
                The claims that Kisqali &ldquo;preserves quality of life&rdquo; and
                that patients taking the drug are &ldquo;living well&rdquo; create a
                misleading impression that Kisqali has demonstrated a
                benefit on the patient reported outcome measure of global
                quality of life.
              </mark>{' '}
              However, the QLQ-C30 global health status / quality of life
              domain was not designated as a primary or key secondary
              endpoint in the MONALEESA-2 trial, and the trial was not
              designed to support claims of improvement in this measure.
            </p>

            <p className="mb-5">
              <mark
                className="px-0.5"
                style={{ backgroundColor: '#9ecbff66' }}
              >
                The TV ad misbrands Kisqali within the meaning of the
                Federal Food, Drug and Cosmetic Act (FD&amp;C Act) and makes
                its distribution violative.
              </mark>
            </p>

            {/* Underlined section header */}
            <div className="mb-3 mt-9">
              <span className="underline decoration-1 underline-offset-[3px]">
                Required Action
              </span>
            </div>

            <p className="mb-5">
              <mark
                className="px-0.5"
                style={{ backgroundColor: '#9ecbff66' }}
              >
                OPDP requests that Novartis cease any violations of the
                FD&amp;C Act and submit a written response to this letter
                within 15 working days from the date of receipt
              </mark>
              , addressing the concerns described herein and listing all
                promotional communications (with the 2253 submission date)
                that contain representations like or related to those
                described in this letter.
            </p>

            {/* Signature block */}
            <div className="mt-10 text-[14px] text-[#333]">
              <p>Sincerely,</p>
              <p className="mt-8 italic text-[#666]">
                {'{Signature redacted}'}
              </p>
              <p className="mt-1 text-[13px]">
                Regulatory Review Officer
                <br />
                Office of Prescription Drug Promotion
              </p>
            </div>
          </div>

          {/* Primary-source link beneath the exhibit */}
          <div className="mt-5 text-right">
            <a
              href="https://www.fda.gov/media/175584/download"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition hover:text-foreground"
            >
              Full primary source — fda.gov/media/175584/download
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3 w-3"
              >
                <path
                  d="M5 3h8v8M5 11l8-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </a>
          </div>
        </div>

        {/* Editorial typographic poster — the four 2024 enforcement
            actions set as colossal Fraunces numerals on a full-bleed
            dark canvas. The data IS the cover image. Replaces a candid
            hearing photograph that read as networking-event, not
            consequence. Register: The Economist Briefing / FT Weekend
            front-page typographic spread. */}
        <div
          className="relative -mx-6 mt-16 overflow-hidden bg-[#0a0e1a] px-6 py-20 lg:-mx-12 lg:px-12 lg:py-28"
        >
          {/* Ambient cinematic mesh — subtle so the numerals own the canvas */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.55]"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 80% 60% at 12% 0%, rgba(180, 83, 9, 0.16) 0%, transparent 55%),
                radial-gradient(ellipse 60% 50% at 90% 100%, rgba(4, 120, 87, 0.18) 0%, transparent 60%),
                radial-gradient(ellipse 40% 30% at 50% 50%, rgba(255, 255, 255, 0.02) 0%, transparent 70%)
              `,
            }}
          />
          {/* Grain for the AI-art surface quality */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.65'/%3E%3C/svg%3E\")",
            }}
          />

          <div className="relative mx-auto max-w-[1240px]">
            {/* (Run-head removed — the §01 deck above the poster
                already carries the "what it cost" framing. The
                spread can open directly with the numerals; the data
                IS the cover image.) */}

            {/* The four-amount magazine spread.
                Mobile: single-column stack.
                Tablet+: 2x2 grid with hairline cross-dividers.
                Each cell gets ~520-580px of horizontal room so the
                colossal numerals breathe rather than overflow. */}
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {items.map((it, i) => {
                // Border rules for 2x2: right border on cells 0,2 ; bottom border on cells 0,1
                const isLeftCol = i % 2 === 0;
                const isTopRow = i < 2;
                return (
                  <div
                    key={it.regulator}
                    className={`relative px-2 py-10 sm:py-12 ${
                      isLeftCol ? 'sm:pr-12 sm:border-r sm:border-white/10' : 'sm:pl-12'
                    } ${
                      isTopRow ? 'sm:pb-14 sm:border-b sm:border-white/10' : 'sm:pt-14'
                    }`}
                  >
                    {/* The number — modern sans display (Geist bold).
                        Switched from Fraunces opsz-144 because the
                        display-serif curls read too "ornate" at this
                        size. Geist with tight tracking + tabular nums
                        gives a clean data-display feel that matches
                        modern editorial briefings (FT data pages,
                        Bloomberg, Stripe Press metrics). */}
                    <div
                      className="font-sans font-bold text-white tabular-nums"
                      style={{
                        fontSize: 'clamp(3.25rem, 6.5vw, 5.5rem)',
                        lineHeight: '0.95',
                        letterSpacing: '-0.045em',
                      }}
                    >
                      {it.headline}
                    </div>

                    {/* Modern sans byline — regulator + vertical.
                        Switched from italic Fraunces to Geist medium
                        to match the modern data-display register of
                        the big number above. Primary-source citation
                        badge sits at the end, clickable. */}
                    <div
                      className="mt-6 font-sans font-medium text-[clamp(1rem,1.3vw,1.2rem)] leading-[1.3] tracking-[-0.01em]"
                      style={{
                        color: 'rgba(110, 231, 183, 0.88)',
                      }}
                    >
                      {it.regulator}
                      <span className="text-white/35 font-normal">
                        {' '}&middot;{' '}
                      </span>
                      <span className="text-white/55 font-normal">
                        {it.vertical}
                      </span>
                      <Citation id={it.cite} tone="onDark" />
                    </div>

                    {/* Context line — restrained sans, one line ideally */}
                    <p className="mt-3 max-w-[34ch] text-[15px] leading-[1.5] text-white/55">
                      {it.sub}
                    </p>

                    {/* Per-regulator detail — named firms, settlement
                        specifics, per-firm penalty ranges. Carries any
                        embedded Citation badges (Montefiore + Solara
                        individual settlements live in here). */}
                    <div className="mt-4 max-w-[42ch] border-t border-white/8 pt-4 text-[14px] leading-[1.55] text-white/55">
                      {it.detail}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* (Closing apples-to-oranges disclaimer removed — the
                citation badges already give the reader the precise
                scope of each amount, and the deck above the poster
                does the framing. Let the numerals stand.) */}
          </div>
        </div>

        {/* (Duplicate card grid removed — the typographic spread above
            now carries the headline numerals + the per-regulator detail
            prose + the embedded Montefiore/Solara/named-firm citations.
            One visualization, not three.) */}

        {/* ("The rules behind the fines" card removed — the regulation
            citation list + the content-truth-vs-audit-trail split is
            inside-baseball for compliance practitioners, not stakes for
            business executives. Execs in §01 care about who got hit and
            for how much, not the §-and-subsection of every rule.
            The citations are preserved inline in the typographic poster
            above (next to each amount) and on the firm tooltips below.
            (Removal applied 2026-05-19; HMR nudge id: 0517-rules-trim) */}

        {/* (Two-card spread removed — "The other half of the
            healthcare-content exposure" (FTC HBNR / HHS OCR tracking /
            state health-data laws) and "AI-content failures already in
            the public record" (WHO SARAH / Mount Sinai chatbot study /
            UnitedHealth nH Predict). Both were dense walls of body text
            an executive doesn't need in the stakes section — the
            typographic poster + named-firms grid above already make the
            stakes case. The substantive references (FTC HBNR fine
            amount, HHS tracking guidance, WHO SARAH errors, etc.) are
            picked up downstream in §08 Strategic observations and
            §03 Market where they belong as supporting evidence rather
            than appendix.
            (HMR nudge v2 — supporting-cards trim 2026-05-19) */}

        {/* ── Compounding-damage iceberg exhibit ─────────────────────
            Two-beat photographic visual replacing the prior 3D stack:
            (1) annotated hero — the iceberg with overlay labels for
            each layer of damage above and below the waterline (the
            fine on top, then reputation, litigation, remediation,
            trust descending into the depths); (2) underwater cathedral
            shot for poetic close-out. Imagery is fal-ai/flux-pro/v1.1-
            ultra; prompts + seeds saved alongside the image files in
            public/iceberg/. Hover orchestration in the component
            scales the hovered label, reveals a 1–2 sentence
            description, and dims the others. */}
        <div className="mx-auto mt-24 max-w-[1080px]">
          {/* Caption above the stack */}
          <div className="mb-14 max-w-[64ch]">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
              Compounding consequence
            </p>
            <h4
              className="mt-2 font-display text-[clamp(1.5rem,2.4vw,1.9rem)] font-normal leading-[1.1] text-foreground"
              style={{ fontVariationSettings: '"opsz" 56, "SOFT" 30' }}
            >
              The fine is just the tip.
            </h4>
            <p className="mt-3 text-[clamp(0.95rem,1.15vw,1.05rem)] leading-[1.55] text-foreground/70">
              The regulator&rsquo;s number is the only one with a public
              dollar figure. Everything beneath the waterline &mdash;
              reputation, litigation, remediation, trust &mdash; stacks
              invisibly, and routinely costs more than the fine itself.
            </p>
          </div>

          {/* Iceberg metaphor — replaces the prior 3D damage stack.
              Two-beat visual: an annotated photographic hero with
              label callouts identifying each layer of compounding
              damage above and below the waterline, then a poetic
              underwater "cathedral" close-out with a single pull
              line. Both images are bespoke fal.ai generations
              (Flux Pro 1.1 Ultra); prompts + seeds saved alongside
              the image files under public/iceberg/. */}
          <IcebergCompoundingDamage />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ICP — who pays, in each vertical
// ─────────────────────────────────────────────────────────────────────────

function ICP() {
  // §05 — "The warm start"
  // Day-0 asset inventory, not traction. No fake pipeline. Three beats:
  // (1) the 12-account warm-start roster as the hero claim;
  // (2) Healthcare + Government Y1 wedge profiles, anchor-named;
  // (3) compact strip of the other six verticals.
  // The Frontier LLM provider thesis was moved out — it lives in §07
  // Vision where the Y3+ platform-expansion claim sits.

  type Vertical = {
    name: string;
    color: string;
    timing: 'Year 1' | 'Year 2' | 'Year 3';
    buyer: string;
    org: string;
    anchor: { src: string; alt: string; href?: string };
    supporting: Array<{ src: string; alt: string; href?: string }>;
    deal: string;
    precondition: string;
  };

  const y1Verticals: Vertical[] = [
    {
      name: 'Healthcare',
      color: '#047857',
      timing: 'Year 1',
      buyer: 'VP Communications / CMO / Chief Digital Officer',
      org: 'Hospital systems, payors, digital-health platforms, public-health nonprofits',
      anchor: FUELED_CLIENTS.mayoClinic,
      supporting: [
        FUELED_CLIENTS.clevelandClinic,
        FUELED_CLIENTS.stanfordMedicine,
        FUELED_CLIENTS.kff,
        FUELED_CLIENTS.harvardChan,
        FUELED_CLIENTS.vidaHealth,
      ],
      deal: '$50–200K services · $999/mo–$200K ARR',
      precondition:
        'HIPAA BAA template ready · warm intro through existing Fueled AE relationship',
    },
    {
      name: 'Government',
      color: '#059669',
      timing: 'Year 1',
      buyer: 'Director of Communications / Public Affairs Lead',
      org: 'State agencies, civic-tech newsrooms, public-health departments',
      anchor: FUELED_CLIENTS.californiaDMV,
      supporting: [
        FUELED_CLIENTS.whiteHouse,
        FUELED_CLIENTS.calMatters,
        FUELED_CLIENTS.politico,
      ],
      deal: '$100–300K services · $999/mo–$300K ARR',
      precondition:
        'State-level + civic-tech only in Y1 (no FedRAMP required) · existing Fueled AE relationship',
    },
  ];

  // The full warm-start roster — 12 named accounts already in the Fueled book.
  const warmRoster = [
    FUELED_CLIENTS.mayoClinic,
    FUELED_CLIENTS.clevelandClinic,
    FUELED_CLIENTS.stanfordMedicine,
    FUELED_CLIENTS.kff,
    FUELED_CLIENTS.harvardChan,
    FUELED_CLIENTS.vidaHealth,
    FUELED_CLIENTS.wcgClinical,
    FUELED_CLIENTS.floreyInstitute,
    FUELED_CLIENTS.whiteHouse,
    FUELED_CLIENTS.californiaDMV,
    FUELED_CLIENTS.calMatters,
    FUELED_CLIENTS.politico,
  ];

  return (
    <section id="sec-05" className="bg-background scroll-mt-20">
      <div className="mx-auto max-w-[1280px] px-6 py-28 lg:px-12">
        <SectionHeader
          number="05"
          label="The warm start"
          title="We're not cold-starting."
          intro={
            <>
              Most companies in this space burn $5&ndash;10M and 18
              months on outbound to land one regulated-vertical
              reference customer. Fueled walks in with twelve &mdash;
              already publishing in our target industries. The
              cold-start tax is paid.
            </>
          }
        />

        {/* ━━━ BEAT 1 ━━━ The warm-start roster (hero) ━━━━━━━━━━━━━━ */}
        <div className="mx-auto mb-20 max-w-[1080px]">
          <div className="mb-7 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h3
              className="font-display text-[clamp(1.55rem,2.4vw,2rem)] font-normal leading-[1.12] text-foreground"
              style={{ fontVariationSettings: '"opsz" 72, "SOFT" 40' }}
            >
              The twelve accounts we walk in with.
            </h3>
            <span className="font-mono text-[12px] uppercase tracking-[0.22em] text-emerald-700">
              Day 1 · existing Fueled relationships
            </span>
          </div>

          <div className="grid grid-cols-3 gap-x-5 gap-y-7 rounded-lg border border-foreground/10 bg-card/30 p-7 sm:grid-cols-4 lg:grid-cols-6 lg:p-10">
            {warmRoster.map((c) => (
              <LogoTile
                key={c.alt}
                src={c.src}
                alt={c.alt}
                href={c.href}
                size="md"
                rounded
              />
            ))}
          </div>

          <p className="mx-auto mt-6 max-w-[68ch] text-center text-[clamp(0.95rem,1.15vw,1.05rem)] leading-[1.55] text-foreground/70">
            Twelve accounts across the eight target verticals. All
            Fueled relationships. Twelve warm intros, not twelve cold
            calls. Verified at{' '}
            <a
              href="https://fueled.com/work"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:decoration-emerald-700"
            >
              fueled.com/work
            </a>.
          </p>
        </div>

        {/* ━━━ BEAT 2 ━━━ Year-1 wedge ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="mx-auto mb-20 max-w-[1080px]">
          <div className="mb-7 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h3
              className="font-display text-[clamp(1.55rem,2.4vw,2rem)] font-normal leading-[1.12] text-foreground"
              style={{ fontVariationSettings: '"opsz" 72, "SOFT" 40' }}
            >
              Where we open: Year 1 wedge.
            </h3>
            <span className="font-mono text-[12px] uppercase tracking-[0.22em] text-emerald-700">
              Two verticals · seven warm accounts
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {y1Verticals.map((v) => (
              <div
                key={v.name}
                className="relative overflow-hidden rounded-lg border border-foreground/10 bg-background"
              >
                {/* Brand-color accent stripe */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: v.color }}
                  aria-hidden="true"
                />
                <div className="space-y-6 p-7 lg:p-8">
                  {/* Eyebrow */}
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: v.color }}
                    >
                      {v.timing} · {v.name}
                    </p>
                  </div>

                  {/* Anchor account */}
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/55">
                      Anchor account
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                      <LogoTile
                        src={v.anchor.src}
                        alt={v.anchor.alt}
                        href={v.anchor.href}
                        size="lg"
                        rounded
                      />
                      <div
                        className="font-display text-[clamp(1.05rem,1.4vw,1.2rem)] font-medium leading-tight text-foreground"
                        style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
                      >
                        {v.anchor.alt}
                      </div>
                    </div>
                  </div>

                  {/* Supporting accounts */}
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/55">
                      Supporting warm accounts
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-3">
                      {v.supporting.map((s) => (
                        <LogoTile
                          key={s.alt}
                          src={s.src}
                          alt={s.alt}
                          href={s.href}
                          size="md"
                          rounded
                        />
                      ))}
                    </div>
                  </div>

                  {/* KV rows */}
                  <div className="grid grid-cols-1 gap-y-3 border-t border-foreground/10 pt-5 text-[13px] leading-[1.5]">
                    <div className="flex items-baseline gap-3">
                      <span className="w-28 flex-shrink-0 text-[12px] font-medium text-foreground/55">
                        Buyer
                      </span>
                      <span className="text-foreground/85">{v.buyer}</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="w-28 flex-shrink-0 text-[12px] font-medium text-foreground/55">
                        Org type
                      </span>
                      <span className="text-foreground/85">{v.org}</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="w-28 flex-shrink-0 text-[12px] font-medium text-foreground/55">
                        Deal shape
                      </span>
                      <span className="font-mono text-foreground/85 tabular-nums">
                        {v.deal}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="w-28 flex-shrink-0 text-[12px] font-medium text-foreground/55">
                        Pre-condition
                      </span>
                      <span className="text-foreground/85">{v.precondition}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// COMPETITIVE LANDSCAPE — compressed
// ─────────────────────────────────────────────────────────────────────────

function Competitive() {
  const competitors = ['AssuredAI', 'Writer.com', 'JSL / Pythia', 'Veeva QC', 'Governance lane'];

  type Cell = 'yes' | 'no' | 'partial';
  const rows: Array<{ feature: string; cells: Cell[] }> = [
    { feature: 'Verifies arbitrary content', cells: ['yes', 'no', 'partial', 'no', 'no'] },
    {
      feature: 'External regulatory corpus',
      cells: ['yes', 'no', 'partial', 'no', 'no'],
    },
    {
      feature: 'Publishing-surface distribution',
      cells: ['yes', 'partial', 'no', 'no', 'no'],
    },
    { feature: 'Hash-chained audit', cells: ['yes', 'no', 'no', 'partial', 'partial'] },
    { feature: 'Editor-facing UX', cells: ['yes', 'partial', 'no', 'partial', 'no'] },
  ];

  const dot = (c: Cell) =>
    c === 'yes' ? (
      <span className="font-mono text-[20px] text-emerald-700">●</span>
    ) : c === 'partial' ? (
      <span className="font-mono text-[20px] text-amber-600">◐</span>
    ) : (
      <span className="font-mono text-[20px] text-foreground/15">○</span>
    );

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1280px] px-6 py-28 lg:px-12">
        <SectionHeader
          number="04"
          label="The field"
          title="The only complete row."
        />

        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-foreground/10 bg-card/40">
                <th className="px-6 py-5 text-left font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  &nbsp;
                </th>
                {competitors.map((c, i) => (
                  <th
                    key={c}
                    className={`px-6 py-5 text-left font-mono text-[12px] font-medium uppercase tracking-[0.16em] ${
                      i === 0 ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature} className="border-b border-foreground/10 last:border-b-0">
                  <th
                    scope="row"
                    className="px-6 py-6 text-left text-[17px] font-medium leading-snug text-foreground"
                  >
                    {r.feature}
                  </th>
                  {r.cells.map((c, i) => (
                    <td
                      key={i}
                      className={`px-6 py-6 ${i === 0 ? 'bg-primary/[0.04]' : ''}`}
                    >
                      {dot(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-10 max-w-[60ch] text-[15px] leading-[1.6] text-muted-foreground">
          JSL/Wisecube <Citation id="jsl-wisecube" /> is the closest prior art.
          It operates on LLM outputs, not published articles, and sells to data
          scientists, not editors. The competitive window is real but narrow.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PRODUCT — what ships today (current features, verified)
// ─────────────────────────────────────────────────────────────────────────

function Product() {
  return (
    <section id="sec-04" className="bg-card/40 scroll-mt-20">
      <div className="mx-auto max-w-[1280px] px-6 py-28 lg:px-12">
        <SectionHeader
          number="04"
          label="Product"
          title="The architecture."
          intro={
            <>
              Five layers, top to bottom. The surfaces writers touch
              sit on top; the moats — the corpora, the audit chain —
              sit at the bottom. The verification engine in the middle
              is the IP every paragraph runs through. Hover any layer
              for what it actually contains.
            </>
          }
        />

        <ProductArchitecture />
        <ProductArchitectureClosers />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ROADMAP — three horizons
// ─────────────────────────────────────────────────────────────────────────

function Roadmap() {
  type ItemState = 'shipping' | 'planned' | 'roadmap';
  const horizons: Array<{ label: string; sub: string; items: Array<[string, ItemState]> }> = [
    {
      label: 'Now',
      sub: 'Shipping in the reference implementation',
      items: [
        ['Verification lifecycle', 'shipping'],
        ['Hash-chained audit', 'shipping'],
        ['WordPress plugin', 'shipping'],
        ['Chrome extension (6 surfaces)', 'shipping'],
        ['Healthcare + government packs (pilot corpus)', 'shipping'],
        ['Suggest-fix loop', 'shipping'],
      ],
    },
    {
      label: 'Next 6–12 months',
      sub: 'Validation sprint → Year 1 services delivery',
      items: [
        ['SOC 2 Type II', 'planned'],
        ['ISO/IEC 42001', 'planned'],
        ['HIPAA BAA pathway', 'planned'],
        ['Finance pack (FINRA 2210, SEC marketing rule)', 'planned'],
        ['Legal pack (ABA Rule 7.1)', 'planned'],
        ['Source corpus expansion — 2,000+ docs / pack', 'planned'],
      ],
    },
    {
      label: 'Year 2+',
      sub: 'Productized SaaS, platform optionality',
      items: [
        ['Verify-at-generation API for LLM platforms', 'roadmap'],
        ['C2PA / Content Authenticity Initiative integration', 'roadmap'],
        ['Multimodal verification — image + voice + video', 'roadmap'],
        ['Multilingual packs (EN → ES, FR, DE first)', 'roadmap'],
        ['Embeddable public-proof badge for publishers', 'roadmap'],
        ['Marketplace of community-curated packs', 'roadmap'],
      ],
    },
  ];

  const dot = (state: string) =>
    state === 'shipping' ? (
      <span className="font-mono text-[14px] text-emerald-700">●</span>
    ) : state === 'planned' ? (
      <span className="font-mono text-[14px] text-amber-600">◐</span>
    ) : (
      <span className="font-mono text-[14px] text-muted-foreground/60">○</span>
    );

  return (
    <section className="border-t border-foreground/10">
      <div className="mx-auto max-w-[1280px] px-6 py-32 lg:px-12">
        <div className="mb-16 max-w-[52ch]">
          <div className="mb-4 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            Roadmap
          </div>
          <h2 className="font-serif text-[clamp(2rem,4.5vw,3.5rem)] font-normal leading-[1.05] tracking-tight text-foreground">
            What comes next.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {horizons.map((h, i) => (
            <div
              key={h.label}
              className={`rounded-lg border p-8 ${
                i === 0
                  ? 'border-primary/30 bg-primary/[0.03]'
                  : 'border-foreground/10 bg-card/40'
              }`}
            >
              <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                {h.sub}
              </div>
              <h3 className="mt-2 font-serif text-[28px] leading-tight text-foreground">
                {h.label}
              </h3>
              <ul className="mt-7 space-y-3 text-[17px] leading-[1.5]">
                {h.items.map(([text, state], j) => (
                  <li key={j} className="flex items-baseline gap-3">
                    {dot(state)}
                    <span
                      className={
                        state === 'shipping'
                          ? 'text-foreground'
                          : 'text-foreground/75'
                      }
                    >
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="text-emerald-700">●</span> shipping
          </span>
          <span className="flex items-center gap-2">
            <span className="text-amber-600">◐</span> planned · Year 1
          </span>
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground/60">○</span> roadmap · Year 2+
          </span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PRICING — services & SaaS
// ─────────────────────────────────────────────────────────────────────────

function Pricing() {
  type Tier = {
    tier: string;
    price: string;
    unit?: string;
    who: string;
    delivers: string[];
    timeline: string;
    outcome: string;
    featured?: boolean;
  };

  const services: Tier[] = [
    {
      tier: 'Pilot',
      price: '$35–50K',
      who: 'One editorial team at a hospital, regional bank, federal agency, OR law firm — first reference customer in their vertical',
      delivers: [
        '4-week discovery: content workflows, regulatory exposure, source inventory',
        'AssuredAI deployed against ONE vertical pack — the buyer\'s vertical',
        'Curated source library — 200+ authoritative docs (CDC + specialty society for healthcare; SEC + FINRA for finance; Federal Register + agency-specific for govt; ABA + state bar for legal)',
        'WordPress plugin OR browser extension (one surface)',
        'Writer training (1 session)',
        '30-day live support',
      ],
      timeline: '90 days',
      outcome: 'First 100 verified articles + signed reference customer',
    },
    {
      tier: 'Implementation',
      price: '$150–250K',
      featured: true,
      who: 'Mid-sized publisher: regional hospital system, mid-market bank, Top-200 law firm, federal sub-agency, mid-tier news/comms operation',
      delivers: [
        'Everything in Pilot, plus:',
        'Source library expanded to 500–2,000 docs (vertical-specific)',
        'BOTH WordPress plugin AND Chrome extension deployed across writer workflow',
        'Hash-chained audit log + compliance officer console',
        'Custom integration with client CMS / DAM / approval workflow',
        'Compliance officer training: governance, escalations, audit reviews',
        '90-day post-launch support + 1 quarterly audit',
      ],
      timeline: '6 months',
      outcome: 'Full publishing workflow integrated; audit-ready evidence trail',
    },
    {
      tier: 'Platform',
      price: '$500K+ / yr',
      unit: 'Annual ARR',
      who: 'Enterprise publisher: hospital network, Fortune-1000 financial firm, Am-Law-50 firm, federal cabinet agency, multi-property media group',
      delivers: [
        'Everything in Implementation, plus:',
        'Multi-property deployment (brands, regions, imprints)',
        'Dedicated Customer Success Manager',
        'BAA / HIPAA-aligned hosting if required',
        'On-prem or VPC deployment option',
        '99.9% uptime SLA + 4-hour response SLA',
        'Custom sub-vertical packs (specialty pharma, FDIC banking, etc.)',
        'Quarterly executive business review',
      ],
      timeline: 'Annual contract',
      outcome: 'Compliance infrastructure across the enterprise',
    },
  ];

  const saas: Tier[] = [
    {
      tier: 'Pro',
      price: '$99',
      unit: 'per workspace / month',
      who: 'Solo editorial teams: independent publishers, small clinic marketing, boutique firm content',
      delivers: [
        'Up to 5 writers',
        'ONE vertical pack (you pick at signup)',
        '1,000 verifications / month',
        'Browser extension + WordPress plugin',
        'Standard audit log',
        'Email support',
      ],
      timeline: 'Monthly · cancel anytime',
      outcome: 'Compliance verification for a single editorial team',
    },
    {
      tier: 'Business',
      price: '$999',
      unit: 'per workspace / month',
      featured: true,
      who: 'Mid-market publishers: regional health systems, regional banks, in-house comms teams at sub-100M-rev firms',
      delivers: [
        'Up to 25 writers',
        'ONE vertical pack included',
        'Additional pack add-on: +$199 / mo each (rare — only for multi-vertical publishers)',
        '10,000 verifications / month',
        'Hash-chained tamper-evident audit log',
        'Upload your own source documents (custom corpus)',
        'SSO, 99.5% SLA, priority support',
      ],
      timeline: 'Annual or monthly',
      outcome: 'Audit-grade compliance for a mid-market team',
    },
    {
      tier: 'Enterprise',
      price: 'Custom',
      unit: 'Annual contract',
      who: 'Large publishers, multi-property media groups, hospital networks, federal agencies, multi-state law firms',
      delivers: [
        'Unlimited writers',
        'Vertical pack of choice included; multi-pack licensed à la carte',
        'Unlimited verifications',
        'BAA, HIPAA-aligned hosting',
        'On-prem / VPC deployment option',
        'Dedicated infrastructure + integrations',
        'Dedicated CSM + custom development hours',
      ],
      timeline: 'Multi-year',
      outcome: 'Compliance infrastructure at enterprise scale',
    },
  ];

  return (
    <section className="bg-card/40">
      <div className="mx-auto max-w-[1280px] px-6 py-28 lg:px-12">
        <SectionHeader
          number="07"
          label="Pricing"
          title="Two models."
          subtitle="Services first. Product after."
          intro="Year 1 captures services margin that the PE owner already underwrites. Year 2 productizes once validated customer references exist. Proposed pricing; not committed."
        />

        {/* Services */}
        <div className="mb-20">
          <div className="mb-6 flex items-baseline justify-between gap-6">
            <h3 className="font-serif text-[clamp(1.5rem,2.5vw,2rem)] font-normal text-foreground">
              Services — Year 1
            </h3>
            <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              Fueled engagement model
            </span>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {services.map((s) => (
              <TierCard key={s.tier} tier={s} unitDefault="" />
            ))}
          </div>
        </div>

        {/* SaaS */}
        <div>
          <div className="mb-6 flex items-baseline justify-between gap-6">
            <h3 className="font-serif text-[clamp(1.5rem,2.5vw,2rem)] font-normal text-foreground">
              SaaS — Year 2+
            </h3>
            <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              Productized subscription
            </span>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {saas.map((s) => (
              <TierCard key={s.tier} tier={s} unitDefault="" anchor />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TierCard({
  tier,
  anchor,
}: {
  tier: {
    tier: string;
    price: string;
    unit?: string;
    who: string;
    delivers: string[];
    timeline: string;
    outcome: string;
    featured?: boolean;
  };
  unitDefault?: string;
  anchor?: boolean;
}) {
  const label = anchor && tier.featured ? 'Anchor' : tier.featured ? 'Recommended' : null;
  return (
    <div
      className={`flex flex-col rounded-lg border p-8 ${
        tier.featured
          ? 'border-primary/40 bg-background ring-1 ring-primary/20'
          : 'border-foreground/10 bg-background'
      }`}
    >
      <div className="flex items-baseline justify-between">
        <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
          {tier.tier}
        </div>
        {label ? (
          <div className="rounded-sm bg-primary px-2 py-px font-mono text-[12px] uppercase tracking-[0.16em] text-primary-foreground">
            {label}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-serif text-[clamp(2rem,3.5vw,2.8rem)] font-normal leading-none text-foreground">
          {tier.price}
        </span>
        {tier.unit ? (
          <span className="text-[15px] text-muted-foreground">{tier.unit}</span>
        ) : null}
      </div>

      <div className="mt-6 border-t border-foreground/10 pt-5">
        <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
          Who buys
        </div>
        <p className="mt-2 text-[15px] leading-[1.5] text-foreground/85">{tier.who}</p>
      </div>

      <div className="mt-5 border-t border-foreground/10 pt-5">
        <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
          What we deliver
        </div>
        <ul className="mt-2 space-y-2 text-[15px] leading-[1.5] text-foreground/85">
          {tier.delivers.map((l, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-2 h-[3px] w-[3px] flex-shrink-0 rounded-full bg-foreground/40" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-foreground/10 pt-5 mt-5">
        <div>
          <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            Timeline
          </div>
          <div className="mt-1 text-[15px] text-foreground/85">{tier.timeline}</div>
        </div>
        <div>
          <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            Outcome
          </div>
          <div className="mt-1 text-[15px] text-foreground/85">{tier.outcome}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// REVENUE PROJECTIONS — 3-year model
// ─────────────────────────────────────────────────────────────────────────

function Revenue() {
  // §06 Business model — sample chapter (Beat 1 only).
  // Beat 2 onward + §07 Vision + §08 Strategic observations are
  // intentionally not rendered. See ToBeContinued below.

  return (
    <section id="sec-06" className="bg-foreground text-background scroll-mt-20">
      <div className="mx-auto max-w-[1280px] px-6 py-28 lg:px-12">
        <SectionHeader
          number="06"
          label="Business model"
          title=""
          variant="dark"
        />

        {/* ━━━ BEAT 1 ━━━ Two motions, not six tiers ━━━━━━━━━━━━━━━━━━━
            Reframed Nov-19 after Mo flagged that the 6-unit grid blurred
            the services/SaaS distinction. The two motions answer
            different questions, sell different things, to different
            buyers. Worked example with Cleveland Clinic vs a small
            content team makes the delta concrete.
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="mb-20">
          {/* ── The two-column motion compare ─────────────────────── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* SERVICES MOTION */}
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.05] p-7 lg:p-8">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                  Motion 1
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-background/45">
                  Capex · IP transfer
                </span>
              </div>
              <h4
                className="font-display text-[clamp(1.65rem,2.5vw,2rem)] font-medium leading-[1.15] text-background"
                style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30' }}
              >
                We deliver the system.
              </h4>

              <div className="mt-6 border-t border-emerald-400/20 pt-5">
                <p className="text-[14px] leading-[1.55] text-background/85">
                  Senior eng + ML + compliance architect. IP transfer
                  at handoff. Not features &mdash; finished work.
                </p>
              </div>

              {/* 3 tier rows */}
              <div className="mt-6 space-y-3">
                <div className="rounded-md border border-background/12 bg-background/[0.04] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-display text-[15.5px] font-medium leading-none text-background"
                        style={{ fontVariationSettings: '"opsz" 24' }}
                      >
                        Pilot
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300/65">
                        Validation
                      </span>
                    </div>
                    <span className="font-mono text-[13px] tabular-nums text-background/85">
                      $35–50K · 90 days
                    </span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-[1.5] text-background/70">
                    We deliver ONE vertical pack into ONE editorial
                    workflow. First reference customer in a vertical.
                  </p>
                </div>

                <div className="rounded-md border border-emerald-300/35 bg-emerald-300/[0.04] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-display text-[15.5px] font-medium leading-none text-background"
                        style={{ fontVariationSettings: '"opsz" 24' }}
                      >
                        Implementation
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300">
                        Core motion
                      </span>
                    </div>
                    <span className="font-mono text-[13px] tabular-nums text-background/85">
                      $150–250K · 6 months
                    </span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-[1.5] text-background/70">
                    We deliver the full verification system across your
                    org — audit, library, integration, training, rollout.
                  </p>
                </div>

                <div className="rounded-md border border-background/12 bg-background/[0.04] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-display text-[15.5px] font-medium leading-none text-background"
                        style={{ fontVariationSettings: '"opsz" 24' }}
                      >
                        Platform
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300/65">
                        Conversion target
                      </span>
                    </div>
                    <span className="font-mono text-[13px] tabular-nums text-background/85">
                      $500K+ · / year
                    </span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-[1.5] text-background/70">
                    We operate the system as your dedicated partner —
                    multi-property, BAA / on-prem, dedicated CSM, 99.9%
                    SLA.
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-emerald-400/20 pt-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-background/55">
                  Who buys this motion
                </div>
                <p className="mt-2 text-[13px] leading-[1.55] text-background/75">
                  Enterprises with complex compliance regimes ·
                  multi-property publishers · regulated industries with
                  custom CMS/DAM stacks · Y1 reference customers from the
                  §05 warm-start roster.
                </p>
              </div>
            </div>

            {/* SAAS MOTION */}
            <div className="rounded-lg border border-background/20 bg-background/[0.04] p-7 lg:p-8">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-300/85">
                  Motion 2
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-background/45">
                  Opex · Product access
                </span>
              </div>
              <h4
                className="font-display text-[clamp(1.65rem,2.5vw,2rem)] font-medium leading-[1.15] text-background"
                style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30' }}
              >
                You operate the system.
              </h4>

              <div className="mt-6 border-t border-background/15 pt-5">
                <p className="text-[14px] leading-[1.55] text-background/85">
                  Hosted access to the verification engine + your
                  vertical pack + a self-serve workspace your team
                  configures.
                </p>
              </div>

              {/* 3 tier rows */}
              <div className="mt-6 space-y-3">
                <div className="rounded-md border border-background/12 bg-background/[0.04] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-display text-[15.5px] font-medium leading-none text-background"
                        style={{ fontVariationSettings: '"opsz" 24' }}
                      >
                        Pro
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300/65">
                        Solo team
                      </span>
                    </div>
                    <span className="font-mono text-[13px] tabular-nums text-background/85">
                      $99 · per workspace / mo
                    </span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-[1.5] text-background/70">
                    5 writers · 1 vertical pack · 1K verifications/mo ·
                    email support. Sign-up to first verification in 15 min.
                  </p>
                </div>

                <div className="rounded-md border border-emerald-300/35 bg-emerald-300/[0.04] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-display text-[15.5px] font-medium leading-none text-background"
                        style={{ fontVariationSettings: '"opsz" 24' }}
                      >
                        Business
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300">
                        SaaS core
                      </span>
                    </div>
                    <span className="font-mono text-[13px] tabular-nums text-background/85">
                      $999 · per workspace / mo
                    </span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-[1.5] text-background/70">
                    25 writers · 10K verifications/mo · custom corpus
                    upload · SSO · priority. Mid-market self-serve
                    workspace.
                  </p>
                </div>

                <div className="rounded-md border border-background/12 bg-background/[0.04] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-display text-[15.5px] font-medium leading-none text-background"
                        style={{ fontVariationSettings: '"opsz" 24' }}
                      >
                        Enterprise
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300/65">
                        Scale tier
                      </span>
                    </div>
                    <span className="font-mono text-[13px] tabular-nums text-background/85">
                      Custom · annual contract
                    </span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-[1.5] text-background/70">
                    Unlimited writers + verifications · BAA / on-prem ·
                    dedicated CSM · multi-pack license · custom dev hours.
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-background/15 pt-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-background/55">
                  Who buys this motion
                </div>
                <p className="mt-2 text-[13px] leading-[1.55] text-background/75">
                  Solo editorial teams · mid-market publishers with
                  tech capability · SaaS-native customers from the
                  WP VIP funnel · single-vertical compliance.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}


// ─────────────────────────────────────────────────────────────────────────
// COMPARABLE EXITS — the upside math
// ─────────────────────────────────────────────────────────────────────────

function Comparables() {
  const comps: Array<{
    name: string;
    domain: string;
    logo: string;
    brandColor: string;
    sector: string;
    event: string;
    figure: string;
    date: string;
    relevance: string;
    cite:
      | 'veeva-market-cap'
      | 'grammarly-13b'
      | 'onetrust-series-c'
      | 'vanta-series-c'
      | 'securiti-acquisition';
    featured?: boolean;
  }> = [
    {
      name: 'Veeva',
      domain: 'veeva.com',
      logo: '/logos/veeva.svg',
      brandColor: '#FF7300',
      sector: 'Vertical SaaS · Life-sciences compliance',
      event: 'Public · NYSE',
      figure: '$26.9B',
      date: 'Current market cap, May 18 2026',
      relevance:
        'The canonical regulated-vertical SaaS exit. Veeva built a $25B+ public company by becoming the default compliance + content platform for life sciences. Same playbook, different vertical.',
      cite: 'veeva-market-cap',
      featured: true,
    },
    {
      name: 'Grammarly',
      domain: 'grammarly.com',
      logo: '/logos/grammarly.svg',
      brandColor: '#15C39A',
      sector: 'Default writing layer · Consumer + enterprise',
      event: 'Private growth round',
      figure: '$13B',
      date: 'November 2021',
      relevance:
        'The literal "Grammarly for regulated industries" reference. Grammarly became a $13B company by being the default layer every writer runs, regardless of what they\'re writing. AssuredAI is the same idea, applied to compliance instead of style.',
      cite: 'grammarly-13b',
      featured: true,
    },
    {
      name: 'OneTrust',
      domain: 'onetrust.com',
      logo: '/logos/onetrust.png',
      brandColor: '#2E2E2E',
      sector: 'Privacy + AI governance · Compliance default',
      event: 'Most recent round · Generation Investment Mgmt',
      figure: '$4.5B',
      date: 'July 2023 (down from $5.3B peak, Apr 2021)',
      relevance:
        'Default compliance layer for privacy. Peak $5.3B (2021); $4.5B down round in 2023 led by Generation Investment Management. $500M+ ARR, 14,000+ customers, 75% of Fortune 100. The trajectory matters: the compounding works even when the multiple compresses.',
      cite: 'onetrust-series-c',
    },
    {
      name: 'Vanta',
      domain: 'vanta.com',
      logo: '/logos/vanta.svg',
      brandColor: '#0F2D2A',
      sector: 'Security compliance automation',
      event: 'Series C · Sequoia',
      figure: '$2.45B',
      date: 'July 2024',
      relevance:
        'Compliance automation as a default purchase. SOC 2 / HIPAA evidence on autopilot. Built a $2B+ company in six years on the insight that every buyer asks for the same compliance proof.',
      cite: 'vanta-series-c',
    },
    {
      name: 'Securiti',
      domain: 'securiti.ai',
      logo: '/logos/securiti.png',
      brandColor: '#0EA5B0',
      sector: 'Data security + AI governance',
      event: 'Acquired by Veeam',
      figure: '$1.725B',
      date: 'October 2025',
      relevance:
        'Most recent exit in the AI-governance / data-compliance category. Veeam paid $1.7B to make AI-trust + privacy a default layer in their backup product. The category is consolidating; AssuredAI fits the same M&A logic.',
      cite: 'securiti-acquisition',
    },
  ];

  return (
    <section id="sec-02" className="bg-background scroll-mt-20">
      <div className="mx-auto max-w-[1280px] px-6 py-28 lg:px-12">
        <SectionHeader
          number="02"
          label="Why now"
          title="Three forces converged."
          intro={
            <>
              Any one matters. Together, they created a category that
              didn&rsquo;t exist two years ago &mdash; and the firm with
              the customer relationships, not the best model, will own
              it.
            </>
          }
        />

        {/* ── Five-beat convergence narrative ────────────────────────
            Three force cards → convergence arrows → category vacuum →
            "Fueled has." pull-quote → 24-month window. Typographic
            entirely; no imagery (saves the fal-ai budget for sections
            where photography earns its weight). Component owns all
            five beats so this section stays readable. */}
        <WhyNowConvergence />

        {/* ── Substantiation ──────────────────────────────────────────
            Five-company aspirational arc — comparables that compounded
            into category-defining outcomes. Substantiates the timing
            argument made by the convergence narrative above. ─────── */}
        {/* Five-company aspirational arc — what category formation
            looked like for the closest comparable waves. Comparables
            are the substantiation for the convergence narrative
            above; the section's headline argument is already made. */}
        <div className="mb-6 mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h3
              className="font-display text-[clamp(1.55rem,2.4vw,2rem)] font-normal leading-[1.15] text-foreground"
              style={{ fontVariationSettings: '"opsz" 72, "SOFT" 40' }}
            >
              What category formation looked like for the closest waves.
            </h3>
            <span className="font-mono text-[13px] font-medium uppercase tracking-[0.16em] text-foreground/55 tabular-nums">
              $1.7B &nbsp;&mdash;&nbsp; $26.9B
            </span>
          </div>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-[1.55] text-foreground/60">
            Five categories that took ~10 years to mature. Five
            primary-source exits, plotted by value. Same window each
            took to form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {comps.map((c) => (
            <div
              key={c.name}
              className="relative flex flex-col overflow-hidden rounded-lg border border-foreground/10 bg-background"
            >
              {/* Brand-color accent stripe */}
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: c.brandColor }}
              />
              <div className="flex flex-col p-6">
                {/* Logo row */}
                <div className="mb-3 flex h-12 items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.logo}
                    alt={`${c.name} logo`}
                    className="h-8 w-auto max-w-[140px] object-contain object-left"
                    height="32"
                  />
                </div>
                {/* Company name — anchors the card so the logo doesn't have
                    to carry recognition on its own (Securiti, Lithero etc.
                    are not universally recognized by sight). */}
                <div
                  className="mb-5 font-display text-[clamp(1.05rem,1.45vw,1.25rem)] font-medium leading-tight text-foreground"
                  style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
                >
                  {c.name}
                </div>
                <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-foreground/55">
                  {c.event}
                </div>
                <div className="mt-2 font-serif text-[clamp(1.7rem,2.7vw,2.3rem)] font-normal leading-none text-foreground">
                  {c.figure}
                </div>
                <div className="mt-1.5 text-[12px] text-muted-foreground">
                  {c.date}
                </div>
                <div className="mt-4 border-t border-foreground/10 pt-3 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  {c.sector}
                </div>
                <div className="mt-3 text-[15px] leading-[1.5] text-foreground/80">
                  {c.relevance}
                </div>
                <div className="mt-auto pt-4 text-right">
                  <Citation id={c.cite} />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// WEDGE — Fueled distribution
// ─────────────────────────────────────────────────────────────────────────

function Wedge() {
  return (
    <section className="border-t border-foreground/10">
      <div className="mx-auto max-w-[1280px] px-6 py-32 lg:px-12">
        <div className="mb-16 max-w-[60ch]">
          <div className="mb-4 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            The wedge
          </div>
          <h2 className="font-serif text-[clamp(2rem,4.5vw,3.5rem)] font-normal leading-[1.05] tracking-tight text-foreground">
            We&apos;re the executable layer
            <br />
            <span className="italic text-foreground/55">
              of a framework Fueled already published.
            </span>
          </h2>
        </div>

        <figure className="my-12 max-w-[820px]">
          <blockquote className="border-l-2 border-primary pl-8">
            <div className="font-serif text-[clamp(1.8rem,3.5vw,2.4rem)] font-normal leading-[1.25] text-foreground">
              &ldquo;Assured AI = Policy + Process + Platform.&rdquo;
            </div>
            <figcaption className="mt-6 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              Fueled · With WP Engine · February 9, 2026{' '}
              <Citation id="fueled-whitepaper" />
            </figcaption>
          </blockquote>
        </figure>

        <div className="mt-20 grid grid-cols-1 gap-y-12 gap-x-16 lg:grid-cols-2">
          <div>
            <div className="mb-6 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              Distribution we already own
            </div>
            <ul className="space-y-4 text-[17px] leading-[1.5]">
              <li className="flex items-baseline gap-4 border-b border-foreground/10 pb-4">
                <span className="font-mono text-[12px] text-muted-foreground">→</span>
                <div>
                  <div className="font-medium text-foreground">WordPress VIP</div>
                  <div className="text-[17px] text-muted-foreground">
                    Market leader in enterprise WordPress delivery{' '}
                    <Citation id="fueled-services" />
                  </div>
                </div>
              </li>
              <li className="flex items-baseline gap-4 border-b border-foreground/10 pb-4">
                <span className="font-mono text-[12px] text-muted-foreground">→</span>
                <div>
                  <div className="font-medium text-foreground">ClassifAI plugin</div>
                  <div className="text-[17px] text-muted-foreground">
                    In-market WordPress AI plugin <Citation id="fueled-classifai" />
                  </div>
                </div>
              </li>
              <li className="flex items-baseline gap-4 pb-4">
                <span className="font-mono text-[12px] text-muted-foreground">→</span>
                <div>
                  <div className="font-medium text-foreground">Enterprise publisher base</div>
                  <div className="text-[17px] text-muted-foreground">
                    Penske, POLITICO, CalMatters, Vida Health{' '}
                    <Citation id="fueled-work" />
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <div className="mb-6 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              What no competitor has
            </div>
            <ul className="space-y-4 text-[17px] leading-[1.5]">
              <li className="flex items-baseline gap-4 border-b border-foreground/10 pb-4">
                <span className="font-mono text-[12px] text-foreground/15">×</span>
                <div>
                  <div className="font-medium text-foreground/55">
                    JSL distributes via Python library
                  </div>
                  <div className="text-[17px] text-muted-foreground">
                    Buyer is the data scientist, not the editor
                  </div>
                </div>
              </li>
              <li className="flex items-baseline gap-4 border-b border-foreground/10 pb-4">
                <span className="font-mono text-[12px] text-foreground/15">×</span>
                <div>
                  <div className="font-medium text-foreground/55">
                    Writer.com verifies its own outputs
                  </div>
                  <div className="text-[17px] text-muted-foreground">
                    Knowledge Graph grounds only customer-owned content
                  </div>
                </div>
              </li>
              <li className="flex items-baseline gap-4 pb-4">
                <span className="font-mono text-[12px] text-foreground/15">×</span>
                <div>
                  <div className="font-medium text-foreground/55">
                    Veeva is pharma-locked
                  </div>
                  <div className="text-[17px] text-muted-foreground">
                    Quick Check requires Veeva Vault
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// THE ASK
// ─────────────────────────────────────────────────────────────────────────

function Ask() {
  return (
    <section className="bg-foreground text-background">
      <div className="mx-auto max-w-[1280px] px-6 py-28 lg:px-12">
        <SectionHeader
          number="11"
          label="The path"
          title="A 90-day validation window."
          subtitle="Tight enough to falsify. Long enough to convert."
          variant="dark"
        />

        {/* Framework attribution */}
        <figure className="mb-12 max-w-[820px] border-l-2 border-primary pl-8">
          <blockquote className="font-serif text-[clamp(1.4rem,2.4vw,1.9rem)] font-normal leading-[1.3] text-background">
            &ldquo;Assured AI = Policy + Process + Platform.&rdquo;
          </blockquote>
          <figcaption className="mt-4 font-mono text-[12px] uppercase tracking-[0.16em] text-background/55">
            Fueled · With WP Engine · February 9, 2026{' '}
            <Citation id="fueled-whitepaper" />
          </figcaption>
          <p className="mt-5 max-w-[60ch] text-[14px] leading-[1.6] text-background/75">
            The framework is already published. The case here is for{' '}
            <Bold>operationalizing its Platform layer.</Bold>
          </p>
        </figure>

        <div className="mt-16 grid max-w-[1000px] grid-cols-1 gap-px overflow-hidden rounded-lg border border-background/10 bg-background/10 md:grid-cols-3">
          <div className="bg-foreground p-7">
            <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-background/55">
              The window
            </div>
            <div className="mt-3 font-serif text-[22px] leading-tight text-background">
              90 days
            </div>
            <div className="mt-2 text-[15px] text-background/65">
              Binary outcome at the gate. Scale or fold.
            </div>
          </div>
          <div className="bg-foreground p-7">
            <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-background/55">
              The gate
            </div>
            <div className="mt-3 font-serif text-[22px] leading-tight text-background">
              ≥ 1 signed paid pilot
            </div>
            <div className="mt-2 text-[15px] text-background/65">
              From the existing Fueled client base (see Section 05).
            </div>
          </div>
          <div className="bg-foreground p-7">
            <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-background/55">
              The fallback
            </div>
            <div className="mt-3 font-serif text-[22px] leading-tight text-background">
              ClassifAI fold-in
            </div>
            <div className="mt-2 text-[15px] text-background/65">
              No signal → IP folds into ClassifAI; no separate product.
            </div>
          </div>
        </div>

        <div className="mt-16 grid max-w-[1000px] grid-cols-1 gap-px overflow-hidden rounded-md border border-background/10 bg-background/10 md:grid-cols-3">
          <div className="bg-background/[0.04] p-6">
            <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-background/55">
              Weeks 1–4
            </div>
            <div className="mt-2 font-serif text-[20px] leading-tight text-background">
              Buyer research
            </div>
            <p className="mt-2 text-[15px] leading-[1.5] text-background/65">
              5–7 conversations across the ICP cohort. Validate buyer, pain,
              price ceiling.
            </p>
          </div>
          <div className="bg-background/[0.04] p-6">
            <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-background/55">
              Weeks 4–8
            </div>
            <div className="mt-2 font-serif text-[20px] leading-tight text-background">
              Scoped proposals
            </div>
            <p className="mt-2 text-[15px] leading-[1.5] text-background/65">
              2–3 pilot proposals delivered with executive-sponsor support
              for warm-intro access.
            </p>
          </div>
          <div className="bg-background/[0.04] p-6">
            <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-background/55">
              Weeks 8–13
            </div>
            <div className="mt-2 font-serif text-[20px] leading-tight text-background">
              Sign + invoice
            </div>
            <p className="mt-2 text-[15px] leading-[1.5] text-background/65">
              Convert ≥ 1 proposal into a signed paid engagement. Gate
              decision at day 90.
            </p>
          </div>
        </div>

        {/* Distribution moats — folded in from the dropped Wedge section */}
        <div className="mt-16 border-t border-background/10 pt-10">
          <div className="mb-5 font-mono text-[12px] uppercase tracking-[0.16em] text-background/55">
            Distribution Fueled already owns
          </div>
          <div className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-3">
            <div>
              <div className="font-medium text-background">WordPress VIP</div>
              <div className="text-[15px] text-background/65">
                Market leader in enterprise WordPress delivery{' '}
                <Citation id="fueled-services" />
              </div>
            </div>
            <div>
              <div className="font-medium text-background">ClassifAI plugin</div>
              <div className="text-[15px] text-background/65">
                In-market WordPress AI plugin{' '}
                <Citation id="fueled-classifai" />
              </div>
            </div>
            <div>
              <div className="font-medium text-background">Publisher base</div>
              <div className="text-[15px] text-background/65">
                Penske, POLITICO, CalMatters, Vida Health{' '}
                <Citation id="fueled-work" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-16 max-w-[60ch] text-[15px] leading-[1.6] text-background/70">
          Hybrid path: services-led delivery in Year 1 (margin profile that
          fits the established services book), productized SaaS in Year 2
          (scaling economics). The validation window decides the rest.
        </p>
      </div>
    </section>
  );
}


// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function Em({ children }: { children: React.ReactNode }) {
  return <em className="font-serif italic">{children}</em>;
}

function Bold({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold">{children}</strong>;
}

// ─────────────────────────────────────────────────────────────────────────
// SectionHeader — centered, executive-banner section dividers.
// Floating numbered badge on a horizontal rule, then a large bold sans
// headline, optional italic serif subtitle, optional intro paragraph.
// Variant: light (default) or dark (for inverted bg).
// ─────────────────────────────────────────────────────────────────────────
function SectionHeader({
  number,
  label,
  title,
  subtitle,
  intro,
  variant = 'light',
}: {
  number: string;
  label: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  intro?: React.ReactNode;
  variant?: 'light' | 'dark';
}) {
  const isDark = variant === 'dark';
  return (
    <div className="mb-20 text-center">
      {/* Top divider rule */}
      <div
        className={`mx-auto mb-12 h-px max-w-[180px] ${
          isDark ? 'bg-emerald-400/40' : 'bg-emerald-700/40'
        }`}
      />

      {/* BIG HEADER — number · label, Fraunces display at full scale */}
      <h2
        className={`mx-auto max-w-[24ch] font-display text-[clamp(3rem,7.5vw,6.5rem)] font-medium leading-[0.96] tracking-[-0.025em] ${
          isDark ? 'text-background' : 'text-foreground'
        }`}
        style={{ fontOpticalSizing: 'auto', fontVariationSettings: '"SOFT" 30, "opsz" 144' }}
      >
        <span
          className={`${
            isDark ? 'text-emerald-400/55' : 'text-emerald-700/65'
          }`}
        >
          {number}
        </span>
        <span
          className={`${
            isDark ? 'text-background/30' : 'text-foreground/25'
          }`}
        >
          {' · '}
        </span>
        {label}
      </h2>

      {/* Subheader — editorial framing of the section */}
      <p
        className={`mx-auto mt-7 max-w-[36ch] font-sans text-[clamp(1.4rem,2.4vw,1.95rem)] font-medium leading-[1.2] tracking-tight ${
          isDark ? 'text-background/85' : 'text-foreground/80'
        }`}
      >
        {title}
      </p>

      {/* Optional editorial tagline (plain, non-italic) */}
      {subtitle ? (
        <p
          className={`mx-auto mt-3 max-w-[42ch] text-[clamp(1.05rem,1.5vw,1.3rem)] font-normal leading-[1.3] ${
            isDark ? 'text-background/55' : 'text-foreground/50'
          }`}
        >
          {subtitle}
        </p>
      ) : null}

      {/* Optional intro */}
      {intro ? (
        <p
          className={`mx-auto mt-8 max-w-[62ch] text-[17px] leading-[1.65] ${
            isDark ? 'text-background/70' : 'text-foreground/70'
          }`}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────

// Force recompile marker
// ─────────────────────────────────────────────────────────────────────────
// ToBeContinued
//
// Sample-mode terminator. The full brief ends at §06 Beat 1; everything
// past this point — Beat 2 funnel, year cards, mix-shift, capital plan,
// §07 Vision, §08 Strategic observations, Sources — is intentionally
// absent from the DOM and the JS bundle (the corresponding component
// definitions and data structures have been removed from this module).
//
// Visual: soft fade from the dark navy of §06 into pure black, then an
// editorial disclaimer card. No placeholder text; no "blurred preview"
// of hidden content. A curious developer opening DevTools or the
// minified source bundle sees what the reader sees.
// ─────────────────────────────────────────────────────────────────────────
function ToBeContinued() {
  return (
    <section
      id="sec-tbc"
      aria-label="To be continued"
      className="scroll-mt-20 bg-black text-white"
    >
      {/* Soft fade from §06 navy → black. Pure decoration, no content. */}
      <div
        aria-hidden="true"
        className="h-32 w-full lg:h-44"
        style={{
          background:
            'linear-gradient(180deg, rgb(15, 23, 41) 0%, rgb(7, 11, 22) 55%, rgb(0, 0, 0) 100%)',
        }}
      />

      <div className="mx-auto max-w-[760px] px-6 py-24 lg:py-32">
        {/* Decorative top mark */}
        <div className="mb-12 flex flex-col items-center">
          <div className="h-px w-12 bg-emerald-400/40" />
          <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.32em] text-emerald-400/70">
            To be continued
          </div>
        </div>

        <h2
          className="mb-6 text-center font-display text-[clamp(2rem,4vw,3rem)] font-normal leading-[1.1] tracking-[-0.015em] text-white"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}
        >
          A sample, not the full brief.
        </h2>

        <p className="mx-auto max-w-[58ch] text-center text-[16px] leading-[1.7] text-white/70">
          This brief is part of my application to Fueled. I believe
          strongly in the AssuredAI opportunity, and the data above is
          researched and cited. The case itself is a working
          demonstration &mdash; not exhaustive, polished, or final.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────

export default function BusinessPitch() {
  return (
    <div className="editorial min-h-screen bg-background">
      <MarketingHeader authChip={<HeaderAuthChip />} />
      <StickyToc />
      <main>
        <Hero />
        <ExecSummary />
        {/* Render order:
            §01 Problem            <Enforcement>
            §02 Why now            <Comparables>
            §03 Market             <Market>
            §04 Product            <Product>
            §05 Traction           <ICP>
            §06 Business model     <Revenue>          (Beat 1 only)
            — to-be-continued —    <ToBeContinued>    (sample terminator)
            §07/§08/Sources are intentionally NOT rendered and have been
            removed from this module's exports. */}
        <Enforcement />
        <Comparables />
        <Market />
        <Product />
        <ICP />
        <Revenue />
        <ToBeContinued />
      </main>
    </div>
  );
}
