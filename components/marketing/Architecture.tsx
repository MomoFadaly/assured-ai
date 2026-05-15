'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock, Database, FileSearch, Shield, Hash, FileCheck } from 'lucide-react';
import { SectionEyebrow, SectionHeadline, SectionLede } from './Pipeline';

interface Layer {
  index: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  details: { label: string; value: string }[];
  body: string;
}

const LAYERS: Layer[] = [
  {
    index: '01',
    icon: <Lock className="h-5 w-5" strokeWidth={1.5} />,
    title: 'I/O boundary redaction',
    subtitle: 'Microsoft Presidio sidecar · runs in your VPC',
    details: [
      { label: 'Entities', value: 'PERSON · MRN · EMAIL · PHONE · IP · DATE' },
      { label: 'Latency', value: '~80ms p99' },
      { label: 'Egress', value: 'Zero — PHI never leaves your perimeter' },
    ],
    body:
      'Every prompt and every response passes through a Presidio container running inside your network. Detected PHI is replaced with typed tokens before any model call. The original mapping is held in a per-session cache that is wiped at the close of the audit entry.',
  },
  {
    index: '02',
    icon: <Shield className="h-5 w-5" strokeWidth={1.5} />,
    title: 'Red-flag classifier',
    subtitle: 'Domain-tuned safety layer · pre-LLM',
    details: [
      { label: 'Topics', value: 'cardiac · suicidal · overdose · stroke · anaphylaxis' },
      { label: 'Decision', value: 'binary route · no LLM if matched' },
      { label: 'Fallback', value: '988 · 911 · poison control · NSPL' },
    ],
    body:
      'A specialized classifier inspects every inbound prompt for medical emergencies, ideation, or symptom-prompting content. Matched prompts bypass the LLM entirely and surface a hard-coded hotline routing screen — there is no scenario in which an emergency reaches a generative model.',
  },
  {
    index: '03',
    icon: <Database className="h-5 w-5" strokeWidth={1.5} />,
    title: 'Vetted source corpus',
    subtitle: 'pgvector · HNSW · voyage-3 1024-dim',
    details: [
      { label: 'Index', value: 'HNSW · cosine · m=16 ef_construction=200' },
      { label: 'Cells', value: 'CDC · NIH · FDA · HHS · NEJM · provider-uploaded' },
      { label: 'Refresh', value: 'incremental · weekly · trace-logged' },
    ],
    body:
      'Your retrieval cell is built from the canonical sources you trust — CDC topic pages, NIH bulletins, your own clinical content. The corpus is embedded with voyage-3 (1024-dim) and queried with HNSW cosine. Retrieved chunks are passed to the model as context, never as training data.',
  },
  {
    index: '04',
    icon: <FileSearch className="h-5 w-5" strokeWidth={1.5} />,
    title: 'Sentence-level verification',
    subtitle: 'Claim graph · similarity threshold 0.35',
    details: [
      { label: 'Granularity', value: 'per-sentence with character offsets' },
      { label: 'Action', value: 'flag · suggest-fix · auto-reject' },
      { label: 'Audit', value: 'every claim → cited source ID' },
    ],
    body:
      'Each sentence in the model output is mapped to the closest chunks in your corpus. Sentences without sufficient support are flagged for editor review or routed to suggest-fix, which rewrites the claim anchored to a real source. The full claim-to-source graph is persisted with the audit entry.',
  },
  {
    index: '05',
    icon: <Hash className="h-5 w-5" strokeWidth={1.5} />,
    title: 'Hash-chained audit log',
    subtitle: 'Postgres trigger · append-only · SHA-256',
    details: [
      { label: 'Algorithm', value: 'SHA-256(prev_hash ‖ row_payload)' },
      { label: 'Enforcement', value: 'Postgres trigger revokes UPDATE/DELETE' },
      { label: 'Verify', value: 'walk-the-chain in any browser' },
    ],
    body:
      'Every audit entry computes SHA-256 over the previous hash plus the current row payload. A Postgres trigger enforces append-only — UPDATE and DELETE are revoked at the database level. Tampering with any historical entry breaks every entry that follows, which any visitor can verify locally.',
  },
  {
    index: '06',
    icon: <FileCheck className="h-5 w-5" strokeWidth={1.5} />,
    title: 'Compliance artifacts',
    subtitle: 'Proof URL · PDF · embed code',
    details: [
      { label: 'Public proof', value: '/v/{audit_id} · re-verifiable in browser' },
      { label: 'PDF', value: '@react-pdf · CISO-filable · hash-stamped' },
      { label: 'Embed', value: 'iframe · zero JS dependencies' },
    ],
    body:
      'When verification completes, three artifacts are minted: a public proof URL that walks the chain from genesis on any browser, a compliance PDF stamped with the audit hash and sources, and an embed code your editorial team drops into the published article.',
  },
];

export function Architecture() {
  const [activeIndex, setActiveIndex] = useState(0);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    layerRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setActiveIndex(i);
        },
        { rootMargin: '-40% 0px -50% 0px', threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <section id="architecture" className="scanlines relative isolate border-y border-foreground/10 bg-[#06101c] text-white">
      {/* Decorations are clipped inside their own wrapper so the section itself can host sticky children */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="grain absolute inset-0" />
        <div className="absolute inset-0 aurora-bg opacity-[0.18]" />
      </div>

      <div className="relative mx-auto max-w-[1320px] px-5 section-pad">
        <div className="text-white [&_h2]:text-white [&_.text-foreground]:text-white">
          <SectionEyebrow n="07">Under the hood</SectionEyebrow>
          <SectionHeadline>Six layers your CISO can audit.</SectionHeadline>
          <p className="mx-auto mt-6 max-w-[680px] text-balance text-center text-[16px] leading-[1.6] text-white/65 sm:text-[18px]">
            Every claim above traces to a specific layer in the stack. This is the stack — the
            actual primitives, the actual algorithms, the actual enforcement. No magic. No
            black box. No vendor-only verifiability.
          </p>
        </div>

        <div className="mt-24 grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          {/* Left: sticky index list */}
          <aside className="hidden lg:block">
            <div className="scroll-spine">
              <div className="mb-6 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-white/40">
                The stack
              </div>
              <ol className="space-y-1">
                {LAYERS.map((l, i) => (
                  <li key={l.index}>
                    <a
                      href={`#layer-${l.index}`}
                      className={`group flex items-center gap-4 rounded-md px-3 py-3 transition-all ${
                        i === activeIndex
                          ? 'bg-white/[0.06] text-white'
                          : 'text-white/55 hover:text-white/80'
                      }`}
                    >
                      <span className={`font-mono text-[12px] font-semibold tabular-nums transition-colors ${
                        i === activeIndex ? 'text-primary' : 'text-white/40'
                      }`}>
                        {l.index}
                      </span>
                      <span className={`h-px transition-all ${
                        i === activeIndex ? 'w-10 bg-primary' : 'w-6 bg-white/15'
                      }`} />
                      <span className="text-[13.5px] font-medium tracking-tight">{l.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          {/* Right: scroll-through content */}
          <div className="space-y-32">
            {LAYERS.map((l, i) => (
              <div
                key={l.index}
                id={`layer-${l.index}`}
                ref={(el) => {
                  layerRefs.current[i] = el;
                }}
                className="scroll-mt-32"
              >
                <div className="mb-6 flex items-center gap-4">
                  <span className="font-mono text-[13px] font-semibold tabular-nums text-white/40">
                    {l.index} / 06
                  </span>
                  <span className="h-px flex-1 bg-white/15" />
                  <span className="flex size-11 items-center justify-center rounded-xl bg-white/[0.06] text-white/80 ring-1 ring-white/10">
                    {l.icon}
                  </span>
                </div>
                <h3 className="font-semibold leading-[1.05] tracking-[-0.02em] text-[32px] sm:text-[44px] md:text-[52px]">
                  {l.title}
                </h3>
                <div className="mt-3 text-[12.5px] font-semibold uppercase tracking-[0.18em] text-primary/85">
                  {l.subtitle}
                </div>
                <p className="mt-6 max-w-[600px] text-[15.5px] leading-[1.65] text-white/70 sm:text-[16.5px]">
                  {l.body}
                </p>

                <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
                  {l.details.map((d) => (
                    <div
                      key={d.label}
                      className="grid grid-cols-1 gap-1.5 bg-[#06101c] px-5 py-3.5 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4 md:grid-cols-[180px_minmax(0,1fr)]"
                    >
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                        {d.label}
                      </dt>
                      <dd className="min-w-0 break-words font-mono text-[12.5px] text-white/85">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
