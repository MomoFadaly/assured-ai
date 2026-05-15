import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { BrandLockup } from '@/components/verify/Brand';
import { ParallaxLayer } from './Parallax';

export function CTAFooter({ proofExampleId }: { proofExampleId: number | null }) {
  return (
    <>
      <section id="cta" className="relative isolate overflow-hidden border-b border-border/60 bg-[#06101c] text-white">
        {/* Full-bleed cinematic backdrop — data viz / server / abstract tech */}
        <ParallaxLayer strength={-0.15} className="absolute inset-0 -z-10">
          <div className="absolute -inset-[10%] ken-burns photo-cinematic" aria-hidden>
            <img
              aria-hidden
              alt=""
              src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=960&auto=format&fit=crop&q=70"
              srcSet="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=640&auto=format&fit=crop&q=65 640w, https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=960&auto=format&fit=crop&q=70 960w, https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1440&auto=format&fit=crop&q=72 1440w, https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920&auto=format&fit=crop&q=72 1920w"
              sizes="100vw"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="size-full object-cover"
              style={{ filter: 'saturate(85%) brightness(0.45)' }}
            />
          </div>
        </ParallaxLayer>

        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#04101c]/80 via-[#06101c]/65 to-[#04101c]/90" aria-hidden />
        <div className="pointer-events-none absolute inset-0 -z-10 aurora-bg opacity-25" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" aria-hidden />

        <div className="relative mx-auto max-w-[960px] px-5 py-28 text-center sm:py-32">
          <div className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11.5px] font-medium text-white/80 backdrop-blur">
            <span className="inline-block size-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_hsl(152_60%_50%/0.25)]" />
            Live demo · no signup
          </div>
          <h2 className="mx-auto text-balance font-semibold leading-[0.98] tracking-[-0.025em] text-white text-[44px] sm:text-[60px] md:text-[72px]">
            See it for yourself in 60 seconds.
          </h2>
          <p className="mx-auto mt-6 max-w-[640px] text-balance text-[16px] leading-[1.6] text-white/70 sm:text-[18px]">
            Paste any healthcare article. Watch the pipeline run. Rewrite an unsourced claim with
            one click. Send the verified draft to a mock WordPress queue. Share the cryptographic
            proof URL. Download the CISO-filable PDF.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/chat"
              className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-md bg-primary px-6 text-[14.5px] font-medium text-primary-foreground glow-primary transition-all hover:shadow-2xl hover:shadow-primary/40 active:scale-[0.98]"
            >
              <span className="beam" />
              <span className="relative z-10 inline-flex items-center gap-2">
                Try the verifier
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            {proofExampleId !== null ? (
              <Link
                href={`/v/${proofExampleId}`}
                className="inline-flex h-12 items-center gap-2 rounded-md border border-white/20 bg-white/5 px-6 text-[14.5px] font-medium text-white backdrop-blur hover:bg-white/10"
              >
                <Lock className="h-4 w-4" />
                See an example proof
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <footer className="bg-background">
        <div className="mx-auto max-w-[1240px] px-5 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <BrandLockup />
              <p className="mt-3 max-w-[280px] text-[12.5px] leading-relaxed text-muted-foreground">
                Compliance-grade AI verification for healthcare and government content. Built
                on industry-consensus principles for trust-centric AI in regulated industries.
              </p>
            </div>
            <FooterCol
              title="Product"
              links={[
                { href: '/chat', label: 'Verifier' },
                { href: '/library', label: 'Source library' },
                { href: '/voice', label: 'Voice profiles' },
                { href: '/audit', label: 'Audit log' },
                { href: '/wp-mock', label: 'WP draft queue' },
              ]}
            />
            <FooterCol
              title="Proof"
              links={[
                ...(proofExampleId !== null
                  ? [{ href: `/v/${proofExampleId}`, label: 'Example proof URL' }]
                  : []),
                { href: '/escalations', label: 'Red-flag escalations' },
                { href: '/api/audit/export', label: 'Audit CSV export' },
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                { href: '#pipeline', label: 'How it works' },
                { href: '#pricing', label: 'Talk to us' },
              ]}
            />
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center">
            <p className="text-[11.5px] text-muted-foreground">
              © {new Date().getFullYear()} AssuredAI. Pilot implementation of the trust-centric AI
              framework. MIT-licensed reference code in the repo.
            </p>
            <div className="flex items-center gap-4 text-[11.5px] text-muted-foreground">
              <a className="hover:text-foreground" href="#">
                Privacy
              </a>
              <a className="hover:text-foreground" href="#">
                Terms
              </a>
              <a className="hover:text-foreground" href="#">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string; external?: boolean }>;
}) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </div>
      <ul className="mt-3 space-y-2 text-[12.5px]">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target={l.external ? '_blank' : undefined}
              rel={l.external ? 'noopener noreferrer' : undefined}
              className="text-foreground/80 hover:text-foreground"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
