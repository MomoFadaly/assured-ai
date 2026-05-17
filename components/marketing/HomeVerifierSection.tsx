import { HomeVerifierDemo } from './HomeVerifierDemo';
import { GlowCard } from './GlowCard';

/**
 * HomeVerifierSection — the dedicated full-width section that gives
 * the live verifier its own stage.
 *
 * Earlier the verifier card sat in the right column of the hero,
 * competing for attention with the massive headline. The result felt
 * cluttered — Apple and Stripe don't put product UI above the fold
 * because nothing about a busy hero converts.
 *
 * Here the verifier gets:
 *   - A short pre-heading ("Watch it work") so the user knows what's
 *     coming and why this section exists.
 *   - A confident framing headline ("Paste any draft. Watch the
 *     pipeline run. Get a public proof URL — in six seconds.").
 *   - The card itself, wrapped in GlowCard for the pen-#4 cursor-
 *     following edge glow.
 *   - Centered, max-width-constrained, plenty of breathing room on
 *     both sides so the card reads as a deliberate artifact.
 *
 * The card is left at its current 1140px native width — but the
 * section frames it so it doesn't feel like a stranded form on a
 * blank page.
 */

export function HomeVerifierSection() {
  return (
    <section
      id="verifier"
      aria-labelledby="verifier-heading"
      className="relative isolate overflow-hidden bg-background py-24 sm:py-32"
    >
      {/* Subtle pastel halo so the section feels connected to the hero
          above but visually distinct from the surfaces below. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 50% 0%, hsla(265, 60%, 88%, 0.30) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 50% 100%, hsla(35, 100%, 88%, 0.20) 0%, transparent 60%)',
        }}
        aria-hidden
      />

      <div className="mx-auto max-w-[920px] px-5">
        <div className="mb-10 text-center sm:mb-14">
          <p className="reveal-up text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
            Watch it work
          </p>
          <h2
            id="verifier-heading"
            className="reveal-up mt-4 text-balance text-[36px] font-semibold leading-[1.05] tracking-[-0.022em] sm:text-[52px] md:text-[60px]"
            style={{ animationDelay: '60ms' }}
          >
            Paste any draft. Watch the pipeline run. Get a public proof URL{' '}
            <span className="font-serif italic font-normal text-primary">in six seconds.</span>
          </h2>
          <p
            className="reveal-up mx-auto mt-5 max-w-[640px] text-balance text-[16px] leading-[1.55] text-foreground/65 sm:text-[17.5px]"
            style={{ animationDelay: '120ms' }}
          >
            The same pipeline whether your team wrote it, your agency delivered it, or your
            AI drafted it. No signup. Real audit row. Real public{' '}
            <span className="font-mono">/v/&lt;id&gt;</span> URL.
          </p>
        </div>

        <div
          className="reveal-up mx-auto max-w-[700px]"
          style={{ animationDelay: '180ms' }}
        >
          <GlowCard className="rounded-2xl" glowColor="220deg 95% 78%">
            <HomeVerifierDemo />
          </GlowCard>
        </div>
      </div>
    </section>
  );
}
