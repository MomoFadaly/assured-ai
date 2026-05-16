// ProofSection — cinematic upgrade with aurora background + animated hash chain
import Link from 'next/link';
import { Lock, ShieldCheck, Copy, ArrowRight } from 'lucide-react';
import { SectionEyebrow, SectionHeadline, SectionLede } from './Pipeline';
import { HashChainAnimated } from './HashChainAnimated';

export function ProofSection({ proofExampleId }: { proofExampleId: number }) {
  return (
    <section id="proof" className="relative overflow-hidden border-b border-border/60 bg-card/40">
      <div className="pointer-events-none absolute inset-0 gradient-mesh" aria-hidden />
      <div className="pointer-events-none absolute -inset-x-20 top-0 h-[480px] aurora-bg opacity-[0.10] dark:opacity-[0.20]" aria-hidden />
      <div className="relative mx-auto max-w-[1240px] px-5 py-24">
        <SectionEyebrow>The differentiator</SectionEyebrow>
        <SectionHeadline>
          The first AI compliance vendor to ship cryptographic proof URLs.
        </SectionHeadline>
        <SectionLede>
          Every verification produces a shareable URL anyone — a CISO, a regulator, a journalist,
          a patient — can re-verify in their browser. No vendor lock-in. No &ldquo;trust us.&rdquo;
          Just SHA-256, walking from genesis to head, in your own tab.
        </SectionLede>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* Proof page mock */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-transparent to-primary/10 blur-2xl" aria-hidden />
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <div className="flex items-center gap-2 border-b border-border/80 bg-muted/40 px-3 py-2">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-400/80" />
                  <span className="size-2.5 rounded-full bg-amber-400/80" />
                  <span className="size-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div className="ml-2 inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" />
                  assuredai.online/v/{proofExampleId}
                </div>
              </div>
              <div className="space-y-4 p-6">
                <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-card p-5 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-card">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        Cryptographic proof
                      </div>
                      <h3 className="mt-1 text-[18px] font-semibold tracking-tight">
                        Verified by AssuredAI
                      </h3>
                      <p className="mt-1 text-[11.5px] text-muted-foreground">
                        Demo publisher · May 10, 2026 at 3:01 PM · 833ms
                      </p>
                    </div>
                  </div>
                </div>

                <HashChainAnimated />

                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Sources cited · 5
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {['CDC', 'NHL', 'NID', 'CDC', 'CDC'].map((o, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded bg-card px-1.5 py-1 text-[10px]">
                        <span className="flex size-5 items-center justify-center rounded bg-primary/10 text-[8px] font-bold text-primary">
                          {o}
                        </span>
                        <span className="truncate text-muted-foreground">healthy weight</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: explainer */}
          <div className="space-y-5">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-primary/5 px-2.5 py-1 font-mono text-[11px] text-primary">
                <Lock className="h-3 w-3" />
                /v/{proofExampleId}
              </div>
              <h3 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">
                TLS for content.
              </h3>
              <p className="mt-2 max-w-[480px] text-[14.5px] leading-relaxed text-muted-foreground">
                Every audit entry produces a shareable URL. Click <strong>Verify chain</strong>{' '}
                and your browser walks the SHA-256 chain back to genesis — re-computing each hash
                locally. Altering any historical row breaks every entry that follows.
              </p>
            </div>

            <ProofStep
              n={1}
              title="Audit fingerprint header"
              body="Outcome, scenario, model, timestamp, and the previous + current hash."
            />
            <ProofStep
              n={2}
              title="Verified article with annotations"
              body="Sentence-level highlighting + PII tokens, exactly as the editor saw them."
            />
            <ProofStep
              n={3}
              title="Walk-the-chain button"
              body="Animated step-by-step re-verification in the visitor's own browser. No trust required."
            />
            <ProofStep
              n={4}
              title="Compliance PDF + embed code"
              body="One-click filable PDF for CISOs; iframe snippet so client sites can embed proof in their trust page."
            />

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <Link
                href={`/v/${proofExampleId}`}
                className="group inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground shadow-sm hover:opacity-90"
              >
                Open an example proof
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-[13px] font-medium hover:bg-accent"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy embed code
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProofStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-3.5">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
        {n}
      </span>
      <div>
        <div className="text-[13.5px] font-semibold">{title}</div>
        <div className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}

