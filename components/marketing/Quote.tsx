import { Quote as QuoteIcon } from 'lucide-react';
import { ParallaxLayer } from './Parallax';

export function WhitePaperQuote() {
  return (
    <section className="relative isolate overflow-hidden border-y border-border/60 bg-[#08111d]">
      {/* Full-bleed cinematic hospital corridor — desaturated, with Ken Burns motion */}
      <ParallaxLayer strength={-0.18} className="absolute inset-0 -z-10">
        <div
          className="absolute -inset-[10%] ken-burns photo-cinematic"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=2400&q=70)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'saturate(60%) brightness(0.55)',
          }}
          aria-hidden
        />
      </ParallaxLayer>

      {/* Dark vignette + color overlays */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#06101c]/85 via-[#04101c]/70 to-[#06101c]/95" aria-hidden />
      <div className="pointer-events-none absolute inset-0 -z-10 aurora-bg opacity-[0.18]" aria-hidden />

      <div className="relative mx-auto max-w-[1240px] px-5 py-28 sm:py-36">
        <figure className="mx-auto max-w-[920px] text-center text-white">
          <QuoteIcon className="mx-auto h-12 w-12 text-primary/70" />
          <blockquote className="mt-8 text-balance text-[28px] font-medium leading-[1.3] tracking-tight text-white sm:text-[36px] md:text-[42px]">
            &ldquo;Customers will not distinguish &lsquo;the AI made a mistake&rsquo; from
            &lsquo;your firm gave me false information.&rsquo; A single high-profile published
            error can shatter the hard-won trust a regulated brand has built over years.&rdquo;
          </blockquote>
          <figcaption className="mt-9 inline-flex items-center gap-3">
            <span className="inline-block size-10 rounded-full bg-gradient-to-br from-primary/40 to-emerald-400/20 ring-1 ring-white/20" />
            <span className="text-left">
              <span className="block text-[14px] font-semibold">Foley &amp; Lardner LLP</span>
              <span className="block text-[12.5px] text-white/60">
                regulated-content compliance counsel, 2026
              </span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
