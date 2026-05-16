import { ParallaxLayer } from './Parallax';
import { AnimatedCounter } from './AnimatedCounter';

export function Stakes() {
  return (
    <section id="stakes" className="relative isolate overflow-hidden bg-[#070e1a] text-white">
      {/* Full-bleed cinematic photo — a moment of trust between provider + patient/document */}
      <ParallaxLayer strength={-0.16} className="absolute inset-0 -z-10">
        <div className="absolute -inset-[8%] ken-burns photo-cinematic" aria-hidden>
          <img
            aria-hidden
            alt=""
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=960&auto=format&fit=crop&q=75"
            srcSet="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=640&auto=format&fit=crop&q=70 640w, https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=960&auto=format&fit=crop&q=75 960w, https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1440&auto=format&fit=crop&q=75 1440w, https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1920&auto=format&fit=crop&q=78 1920w"
            sizes="100vw"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="size-full object-cover"
            style={{ filter: 'saturate(70%) brightness(0.4)' }}
          />
        </div>
      </ParallaxLayer>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#070e1a]/70 via-[#050b15]/55 to-[#070e1a]/90" aria-hidden />
      <div className="pointer-events-none absolute inset-0 -z-10 aurora-bg opacity-[0.12]" aria-hidden />

      <div className="relative mx-auto grid max-w-[1320px] gap-12 px-5 py-32 sm:py-40 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-10 flex items-center gap-4">
            <span className="font-mono text-[13px] font-semibold tabular-nums text-white/40">
              03
            </span>
            <span className="h-px w-12 bg-white/25" aria-hidden />
            <span className="text-[14px] font-semibold uppercase tracking-[0.22em] text-white">
              The stakes
            </span>
          </div>
          <h2 className="font-semibold leading-[0.96] tracking-[-0.03em] text-[52px] sm:text-[72px] md:text-[88px]">
            One published mistake becomes the headline.
          </h2>
          <p className="mt-10 max-w-[540px] text-[15.5px] leading-[1.6] text-white/65 sm:text-[17px]">
            A fabricated dosage. An invented citation. A missed disclaimer. A leaked client
            name. An overstated return. Any one of them &mdash; whether your team wrote it, your
            agency delivered it, or an AI drafted it &mdash; can cost a regulated brand a fine, a
            class-action filing, and years of earned trust. The cost isn&apos;t a bug fix.
            It&apos;s a litigated apology.
          </p>
        </div>

        <div className="flex flex-col justify-end gap-4">
          <StakeCard
            stat={<AnimatedCounter to={78} suffix="%" />}
            label="of CISOs in regulated industries cite content-driven AI errors as their #1 GenAI risk"
            attr="Industry analyst consensus, 2026"
          />
          <StakeCard
            stat={<><span className="font-mono opacity-80">$</span><AnimatedCounter to={1} suffix=".8M" /></>}
            label="median malpractice settlement involving a single piece of published medical misinformation"
            attr="HHS · OCR enforcement bulletins, 2024"
          />
          <StakeCard
            stat={<AnimatedCounter to={0} />}
            label="public proof URLs shipped by any other content-compliance vendor as of 2026"
            attr="The AssuredAI category claim"
          />
        </div>
      </div>
    </section>
  );
}

function StakeCard({ stat, label, attr }: { stat: React.ReactNode; label: string; attr: string }) {
  return (
    <div className="premium-card group rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
      <div className="flex items-baseline gap-5">
        <span className="font-semibold tracking-[-0.03em] text-[44px] leading-none text-white sm:text-[60px]">
          {stat}
        </span>
        <span className="text-[14px] leading-[1.45] text-white/75">{label}</span>
      </div>
      <div className="mt-4 text-[10.5px] uppercase tracking-[0.16em] text-white/40">{attr}</div>
    </div>
  );
}
