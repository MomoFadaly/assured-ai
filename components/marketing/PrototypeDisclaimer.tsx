'use client';

/* ════════════════════════════════════════════════════════════════════════
   PrototypeDisclaimer — the honest-end-of-page section.

   Sits right after IndustryShowcase. Defuses expectations: this is a
   pre-interview prototype, not a finished product. Everything below this
   section is intentionally blurred + scroll-locked — visitors hit this
   page-floor at the disclaimer, on purpose.

   The dicap meme (Django Unchained "Leo pointing/laughing") is the visual
   wink. Mo's call — leaning into the meme is more honest than a stock
   placeholder and signals personality.
   ════════════════════════════════════════════════════════════════════ */

import Link from 'next/link';
import { motion } from 'framer-motion';

export function PrototypeDisclaimer() {
  return (
    <section
      aria-label="Prototype disclaimer"
      className="relative w-full overflow-hidden bg-black"
      style={{ minHeight: '100svh' }}
    >
      {/* Top fade — taller now so it covers the overlap with the blurred
          peek above. Pure-black at the top edge (where it tucks up under
          the peek's tail), dissolving to transparent by the time we reach
          the disclaimer's actual content. The combination of (a) the peek
          fading out via its own mask and (b) the disclaimer fading IN from
          pure black makes the seam vanish. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-[1]"
        style={{
          height: '34vh',
          background:
            'linear-gradient(to bottom, #000 0%, #000 28%, rgba(0,0,0,0.78) 55%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0) 100%)',
        }}
      />

      {/* Faint radial glow behind the image so the JPG doesn't look
          like a cut-out floating on flat black. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 60% at 50% 45%, rgba(255,255,255,0.04) 0%, transparent 60%)',
        }}
      />

      {/* Content container — anchored BELOW the top fade overlay (34vh)
          and the disclaimer's -22vh pull-up into the peek. Padding-top of
          42vh clears both, so the eyebrow + heading start where the bg
          is solid black and the text reads at full contrast. Bottom
          padding gives the trailing line breathing room. */}
      <div
        className="relative mx-auto flex max-w-[1240px] flex-col items-center px-5 text-center"
        style={{ paddingTop: '42vh', paddingBottom: '14vh' }}
      >
        {/* Eyebrow — sized up so it reads as a real opener, not a label.
            Switched off whileInView because the disclaimer is the final
            section after a heavy blurred wrapper, and framer's viewport
            detection was firing inconsistently. Plain mount animation =
            reliable. */}
        <motion.p
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="uppercase"
          style={{
            color: 'rgba(255,255,255,0.78)',
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontWeight: 700,
            fontSize: 'clamp(15px, 1.35vw, 20px)',
            letterSpacing: '0.22em',
            lineHeight: 1.35,
          }}
        >
          From the builder
        </motion.p>

        {/* Main line — softened to read as an honest framing note
            rather than a sales hook. Mo (2026-05-19): "this is not
            the kind of visual direction I would normally put in
            front of a client as a final recommendation..." Sized
            down a touch from the previous hero (38px max instead
            of 48px) because the copy is longer and more reflective. */}
        <motion.h2
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 max-w-[920px] text-balance leading-[1.22] tracking-[-0.015em]"
          style={{
            color: 'white',
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontWeight: 500,
            fontSize: 'clamp(22px, 2.4vw, 34px)',
          }}
        >
          To be clear, this is not meant to be a final client-facing
          visual direction. I pushed it into a more playful and
          unconventional space on purpose, because I wanted the
          prototype to show creative range &mdash; how I think about
          brand, storytelling, product, and go-to-market, not just
          the technical build.
        </motion.h2>

        {/* Business-model CTA — the only reachable forward action from
            this page-floor. Sits between the H2 and the image so it gets
            the eye before the meme. Hover lifts the underline and shifts
            the arrow — small motion that confirms it's clickable. */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="mt-7"
        >
          <Link
            href="/business"
            className="group inline-flex items-center gap-2 rounded-full px-5 py-3 transition-colors"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.16)',
              color: 'white',
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              fontSize: 'clamp(14px, 1.15vw, 16.5px)',
              fontWeight: 500,
              letterSpacing: '-0.005em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.32)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
            }}
          >
            <span>Read the business model</span>
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
              style={{ fontWeight: 300 }}
            >
              →
            </span>
          </Link>
        </motion.div>

        {/* No meme. The confident-builder framing doesn't pair with the
            "we're both in on the joke" register that a meme delivers.
            Personality comes from the sign-off line at the bottom. */}

        {/* "Treat this as a conversation starter..." closing note
            removed (2026-05-19) — Mo's new H2 already carries the
            framing message; the second paragraph was duplicative. */}

        {/* Signature — editorial serif italic. Mo (2026-05-19):
            "make this signature less comical and disney like and
            more professional." Previous Allison script font at
            64-120px read as a costume-shop signature. Now sits as
            a personal-letter signoff: serif italic, modest size,
            em-dash prefix for cadence. No textShadow gimmick. */}
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          className="mt-12 flex flex-col items-center"
        >
          <span
            aria-label="Signed by Mo Fadaly"
            style={{
              color: 'rgba(255,255,255,0.92)',
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(22px, 2.2vw, 34px)',
              lineHeight: 1.2,
              letterSpacing: '-0.005em',
              display: 'inline-block',
              whiteSpace: 'nowrap',
            }}
          >
            — Mo Fadaly
          </span>
        </motion.div>

        {/* Personal website — clearly visible, full readable size, sits
            directly under the signature like a business-card line. */}
        <motion.a
          initial={false}
          animate={{ opacity: 1 }}
          href="https://fadaly.net"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block transition-colors"
          style={{
            color: 'rgba(255,255,255,0.9)',
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontSize: 'clamp(17px, 1.35vw, 20px)',
            fontWeight: 500,
            letterSpacing: '-0.005em',
            borderBottom: '1px solid rgba(255,255,255,0.35)',
            paddingBottom: 2,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderBottomColor = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
            e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.35)';
          }}
        >
          fadaly.net
        </motion.a>

        {/* Fueled application context — declared clearly with the live
            link to fadaly.net/fueled. Pill button so it reads as a
            destination, not flavor text. */}
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          className="mt-12 flex flex-col items-center gap-3 text-center"
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              fontSize: 'clamp(15px, 1.2vw, 18px)',
              fontWeight: 400,
              lineHeight: 1.55,
            }}
          >
            This page is part of my job application to{' '}
            <span
              style={{
                fontWeight: 600,
                color: 'white',
              }}
            >
              Fueled
            </span>
            .
          </span>
          <a
            href="https://fadaly.net/fueled"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full px-5 py-3 transition-colors"
            style={{
              backgroundColor: 'white',
              color: '#0a0b0e',
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              fontSize: 'clamp(14px, 1.15vw, 16.5px)',
              fontWeight: 600,
              letterSpacing: '-0.005em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.88)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            <span>fadaly.net/fueled</span>
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
              style={{ fontWeight: 300 }}
            >
              →
            </span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
