'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { SectionEyebrow, SectionHeadline, SectionLede } from './Pipeline';
import { SectionBackdrop } from './SectionBackdrop';

interface FAQItem {
  q: string;
  a: React.ReactNode;
}

const ITEMS: FAQItem[] = [
  {
    q: 'How does PHI redaction work in practice?',
    a: (
      <>
        Every inbound prompt and outbound response passes through a Microsoft Presidio container
        running inside your VPC. Detected entities — PERSON, MRN, EMAIL, PHONE, IP, DATE — are
        replaced with typed tokens (e.g., <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">&lt;PERSON_1&gt;</code>) before any model call. The mapping is held
        in a per-session cache that is wiped at the close of the audit entry. PHI never leaves
        your perimeter.
      </>
    ),
  },
  {
    q: 'What happens when the model hallucinates a citation?',
    a: (
      <>
        Every sentence in the output is matched against your retrieval corpus. Sentences without
        sufficient support (cosine similarity below the threshold) are flagged for editor review
        or routed to suggest-fix, which rewrites the claim anchored to a real source from your
        corpus. The full claim-to-source graph is persisted with the audit entry, so an editor
        can see exactly which sentences were flagged and why.
      </>
    ),
  },
  {
    q: 'How long does a full implementation take?',
    a: (
      <>
        Managed: ~2 weeks from kickoff to first verified publish. Hybrid: 4-6 weeks (your
        infrastructure team provisions the Presidio sidecar and source-library Postgres,
        we host the operator console). Self-hosted: 1-2 months from contract to production,
        depending on internal review cycles. The reference codebase is small and audited — most
        of the time goes to your team&apos;s security review, not to AssuredAI engineering.
      </>
    ),
  },
  {
    q: 'Why a hash chain and not a regular audit log?',
    a: (
      <>
        Regular logs can be modified by anyone with database access. A Postgres trigger
        enforcing SHA-256 over <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">prev_hash ‖ row_payload</code> creates evidentiary-grade
        tamper evidence: if any historical row is changed, every entry after it breaks. Anyone
        with a browser can re-verify the chain locally, walking from genesis to head. This is
        the property that turns an audit log into court-admissible evidence.
      </>
    ),
  },
  {
    q: 'What if my legal team wants to review the codebase?',
    a: (
      <>
        AssuredAI is MIT-licensed and open source. Your CISO, your legal team, and your
        security auditor can read every layer — Presidio recognizers, retrieval thresholds,
        audit-log trigger SQL, proof-URL hash computation — line by line. There are no
        proprietary black-box layers in the verification pipeline.
      </>
    ),
  },
  {
    q: 'Can it run fully on-premises with no external API calls?',
    a: (
      <>
        Yes — the Self-hosted mode supports an on-prem Ollama deployment for the LLM layer, and
        all other components (Presidio, Postgres + pgvector, voyage-3 embeddings if licensed
        on-prem) run inside your VPC. Zero data egress is the default in this mode. The
        tradeoff is that you become responsible for model quality benchmarking against your
        chosen on-prem LLM.
      </>
    ),
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section id="faq" className="relative overflow-hidden border-b border-border/60 bg-background">
      <SectionBackdrop
        src="https://images.unsplash.com/photo-1454944338482-a69bb95894af?auto=format&fit=crop&w=2000&q=75"
        intensity="subtle"
        position="center"
      />
      <div className="relative mx-auto max-w-[1080px] px-5 py-24 sm:py-32">
        <SectionEyebrow>FAQ</SectionEyebrow>
        <SectionHeadline>Questions a CISO asks first.</SectionHeadline>
        <SectionLede>
          The technical and procurement questions that come up in every healthcare-AI sales
          cycle, answered up front. If yours isn&apos;t here, the live verifier at /chat is the
          fastest way to find out.
        </SectionLede>

        <div className="mt-16 divide-y divide-border border-y border-border">
          {ITEMS.map((it, i) => {
            const open = openIndex === i;
            return (
              <div key={it.q}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`faq-panel-${i}`}
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="group flex w-full items-start justify-between gap-6 py-6 text-left transition-colors hover:bg-accent/20 sm:py-7"
                >
                  <div className="flex items-start gap-5">
                    <span className="mt-1 font-mono text-[11.5px] font-semibold tabular-nums text-foreground/40">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[18px] font-semibold leading-[1.4] tracking-tight sm:text-[20px]">
                      {it.q}
                    </span>
                  </div>
                  <span
                    className={`mt-1.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-all ${open ? 'bg-foreground text-background' : 'text-foreground/55'}`}
                    aria-hidden
                  >
                    {open ? (
                      <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : (
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    )}
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-hidden={!open}
                  className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
                    open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="pb-7 pl-10 pr-12 text-[15px] leading-[1.7] text-muted-foreground sm:text-[16px]">
                      {it.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
