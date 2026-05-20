'use client';

import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';

/**
 * CinemaChrome — three pieces that lift any dark cinematic section to
 * Awwwards-tier polish:
 *
 *   1. Lenis scroll smoothing (lerp 0.085) — turns native scroll into a
 *      camera dolly. Active globally, ducks to lerp 0.07 inside .cinema-stage.
 *   2. CinemaCursor — a 4px cream dot that lerps after the pointer at 80ms,
 *      morphs to a 32px ring over interactive elements, and becomes a red
 *      redaction marker over [data-cinema-redact] targets.
 *   3. Grain filter defs — the SVG <filter> the .cinema-grain class
 *      references. Mounted once at the page root.
 *
 *   All three are no-ops on touch devices, prefers-reduced-motion, and
 *   pointer:coarse devices.
 */
export function CinemaChrome() {
  const cursorRef = useRef<HTMLDivElement>(null);

  // Hide marketing chrome (top header, side section-nav) while ANY cinema
  // section is sticky-pinned in the viewport. Rect-based detection — works
  // regardless of how tall the section is (IntersectionRatio is unreliable
  // for very tall pin-scrub sections because peak ratio is small).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId = 0;
    let lastActive = false;

    const check = () => {
      const stages = document.querySelectorAll('section.cinema-stage');
      let active = false;
      for (const s of stages) {
        const r = (s as HTMLElement).getBoundingClientRect();
        // Active when the section's top has scrolled past the viewport top
        // AND its bottom hasn't passed the viewport bottom — i.e. the sticky
        // child is currently filling the viewport.
        if (r.top <= 0 && r.bottom >= window.innerHeight) {
          active = true;
          break;
        }
      }
      if (active !== lastActive) {
        lastActive = active;
        if (active) document.body.setAttribute('data-cinema-active', 'true');
        else document.body.removeAttribute('data-cinema-active');
      }
      rafId = requestAnimationFrame(check);
    };
    rafId = requestAnimationFrame(check);

    return () => {
      cancelAnimationFrame(rafId);
      document.body.removeAttribute('data-cinema-active');
    };
  }, []);

  // Lenis smooth-scroll — global page-level. Single instance.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      // Native scroll on touch — Lenis on touch fights iOS momentum.
      syncTouch: false,
    });
    // Expose for programmatic scroll-to (used by anchor links, tests).
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    let rafId = 0;
    const raf = (t: number) => {
      lenis.raf(t);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, []);

  // Custom cursor — lerped follow, morphs based on hover target.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduce || coarse) return;

    const el = cursorRef.current;
    if (!el) return;

    // Target position (real pointer) and current position (lerped).
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;
    let inStage = false;
    let rafId = 0;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      // Determine cursor state from the element under the pointer.
      const target = e.target as Element | null;
      if (!target) return;
      const stage = target.closest('.cinema-stage');
      const next = stage ? 'true' : 'false';
      if (next !== String(inStage)) {
        inStage = stage !== null;
        el.style.opacity = inStage ? '1' : '0';
      }
      const redactTarget = target.closest('[data-cinema-redact]');
      const interactive = target.closest('a, button, [role="button"], input, textarea, label');
      const state = redactTarget ? 'redact' : interactive ? 'ring' : 'dot';
      if (el.getAttribute('data-state') !== state) {
        el.setAttribute('data-state', state);
      }
    };

    const tick = () => {
      // Lerp the rendered position toward the target — gives the cursor weight.
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(tick);
    };

    el.style.opacity = '0';
    window.addEventListener('pointermove', onMove, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <>
      {/* Custom cursor dot — only visible inside .cinema-stage scopes. */}
      <div
        ref={cursorRef}
        className="cinema-cursor"
        data-state="dot"
        aria-hidden="true"
      />
      {/* SVG defs for the film grain filter — referenced via url(#cinema-grain-filter) */}
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      >
        <defs>
          <filter id="cinema-grain-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.92"
              numOctaves="2"
              stitchTiles="stitch"
              seed="3"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0.55 0"
            />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>
      <CinemaSound />
    </>
  );
}

/**
 * CinemaSound — manages the one sound moment in the page: a single sub-bass
 * thump played when the user crosses beat 3 of the StakesCinema section.
 *
 *   Sound is opt-in (muted by default). A small pill in the bottom-right
 *   toggles audio for the session. When enabled, the next `cinema:thump`
 *   event plays a 320ms synthesized thump (Web Audio API — no asset needed).
 *
 *   The pill only appears once the user has scrolled past the hero, so the
 *   minimalist hero stays uncluttered.
 */
/* ═══════════════════════════════════════════════════════════════════════
   MASTER AUDIO BUS — SFX-AUDIT (2026-05-19)
   ════════════════════════════════════════════════════════════════════
   Mo: "some stuff is annoyingly loud and shocking and excessive.
   It needs to be contained and professional."
   Root cause: every sound was routing directly to `ctx.destination`
   with no master gain, no compressor, no limiter. Peaks were raw
   transients hitting the speakers. Now ALL sources route through:
       voice → masterGain (-12dB) → DynamicsCompressor → destination
   The compressor (threshold -18dB, ratio 4:1, knee 8dB, fast attack
   3ms, release 220ms) catches shocking transients and glues the mix
   to a contained dynamic range. The user still hears every detail,
   but nothing punches through into ear-fatigue territory.
   ─────────────────────────────────────────────────────────────────── */
const __MASTER_BUS_KEY = '__cinemaAudioMasterBus' as const;
const __MASTER_COMP_KEY = '__cinemaAudioMasterComp' as const;
const __MASTER_LIMITER_KEY = '__cinemaAudioMasterLimiter' as const;
// SFX-AUDIT v6 — single source of truth for tuning. Mo: "why am I
// still hearing it extremely loud?" Root cause: the master bus
// GainNode is cached on the AudioContext for the session, so HMR
// updates to the source code do NOT update the running audio
// graph. The cached node keeps whatever gain value it had at
// creation time. Solution: re-sync all parameters on every call,
// so live code changes take effect without needing a page refresh.
const MASTER_GAIN = 0.055;
const GLUE_THRESHOLD = -22;
const GLUE_RATIO = 5;
const GLUE_KNEE = 10;
const GLUE_ATTACK = 0.004;
const GLUE_RELEASE = 0.240;
const LIMITER_THRESHOLD = -4;
const LIMITER_RATIO = 20;
const LIMITER_ATTACK = 0.001;
const LIMITER_RELEASE = 0.060;

function getMasterBus(ctx: AudioContext): GainNode {
  // Lazily attach the master bus to the context itself so every
  // event handler that calls this gets the same chain. Stored on the
  // ctx via a non-enumerable WeakMap-like key. Single chain per ctx.
  const bag = ctx as unknown as Record<string, GainNode | DynamicsCompressorNode | undefined>;
  const cached = bag[__MASTER_BUS_KEY] as GainNode | undefined;
  if (cached) {
    // Re-sync params on every call so HMR-edited values take effect
    // immediately. Cheap (just setting numbers on existing nodes).
    cached.gain.setTargetAtTime(MASTER_GAIN, ctx.currentTime, 0.01);
    const compCached = bag[__MASTER_COMP_KEY] as DynamicsCompressorNode | undefined;
    if (compCached) {
      compCached.threshold.setTargetAtTime(GLUE_THRESHOLD, ctx.currentTime, 0.01);
      compCached.ratio.setTargetAtTime(GLUE_RATIO, ctx.currentTime, 0.01);
      compCached.knee.setTargetAtTime(GLUE_KNEE, ctx.currentTime, 0.01);
      compCached.attack.setTargetAtTime(GLUE_ATTACK, ctx.currentTime, 0.01);
      compCached.release.setTargetAtTime(GLUE_RELEASE, ctx.currentTime, 0.01);
    }
    const limCached = bag[__MASTER_LIMITER_KEY] as DynamicsCompressorNode | undefined;
    if (limCached) {
      limCached.threshold.setTargetAtTime(LIMITER_THRESHOLD, ctx.currentTime, 0.01);
      limCached.ratio.setTargetAtTime(LIMITER_RATIO, ctx.currentTime, 0.01);
      limCached.attack.setTargetAtTime(LIMITER_ATTACK, ctx.currentTime, 0.01);
      limCached.release.setTargetAtTime(LIMITER_RELEASE, ctx.currentTime, 0.01);
    }
    return cached;
  }
  // SFX-AUDIT v2 (Mo: "still too much") — more aggressive containment:
  //   1. Master trim dropped 0.55 → 0.32 (~-5dB on everything)
  //   2. Glue compressor: threshold -22dB, ratio 5:1, gluier knee
  //   3. NEW limiter stage: threshold -4dB, ratio 20:1 — a true
  //      brick wall. ANY peak that would shock now hits this
  //      ceiling and gets compressed 20:1. The result: peaks
  //      cannot exceed ~-4dB no matter what fires.
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.setValueAtTime(GLUE_THRESHOLD, ctx.currentTime);
  glue.ratio.setValueAtTime(GLUE_RATIO, ctx.currentTime);
  glue.knee.setValueAtTime(GLUE_KNEE, ctx.currentTime);
  glue.attack.setValueAtTime(GLUE_ATTACK, ctx.currentTime);
  glue.release.setValueAtTime(GLUE_RELEASE, ctx.currentTime);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(LIMITER_THRESHOLD, ctx.currentTime);
  limiter.ratio.setValueAtTime(LIMITER_RATIO, ctx.currentTime);
  limiter.knee.setValueAtTime(0, ctx.currentTime);
  limiter.attack.setValueAtTime(LIMITER_ATTACK, ctx.currentTime);
  limiter.release.setValueAtTime(LIMITER_RELEASE, ctx.currentTime);
  master.connect(glue).connect(limiter).connect(ctx.destination);
  bag[__MASTER_BUS_KEY] = master;
  bag[__MASTER_COMP_KEY] = glue;
  bag[__MASTER_LIMITER_KEY] = limiter;
  return master;
}

function CinemaSound() {
  // Sound is ON by default. The cinema is designed as an audiovisual
  // experience — the 3-layer keystroke synth is core to the cold-open's
  // craft. CinemaIntro guarantees the audio context is unlocked via the
  // user's "Begin" click before the cinema starts, so by the time
  // CinemaSound first runs, audio is ready. Users who don't want sound
  // can click the pill to mute; that preference persists in sessionStorage.
  const [enabled, setEnabled] = useState(true);
  const [visible, setVisible] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playedRef = useRef(false);

  // Restore session preference + adopt the AudioContext that CinemaIntro
  // creates + unlocks via the user's "Begin" click. The shared context
  // lives on `window.__cinemaAudioCtx`. By the time CinemaSound mounts
  // and the user has clicked Begin, the context is in 'running' state
  // and ready to synth.
  //
  // Storage semantics:
  //   null (never set)   → default to ENABLED (sound on)
  //   '1' (explicit on)  → ENABLED
  //   '0' (explicit off) → DISABLED
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem('cinema-sound');
    const initialEnabled = saved !== '0'; // null or '1' → enabled
    setEnabled(initialEnabled);
    setVisible(true);

    // Adopt CinemaIntro's context if it exists; otherwise wait for the
    // 'cinema:begin' event which fires when the user clicks Begin.
    const adoptCtx = () => {
      const shared = (window as unknown as { __cinemaAudioCtx?: AudioContext })
        .__cinemaAudioCtx;
      if (shared && !audioCtxRef.current) {
        audioCtxRef.current = shared;
      }
    };
    adoptCtx();
    window.addEventListener('cinema:begin', adoptCtx);
    return () => {
      window.removeEventListener('cinema:begin', adoptCtx);
    };
  }, []);

  // Listen for the one-shot thump event from StakesCinema.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onThump = () => {
      if (!enabled || playedRef.current) return;
      // SFX-AUDIT v3 — cinema:thump on Begin is the single most
      // jarring event in the system (sub-bass + click together
      // at the moment the user just clicked). DISABLED to honor
      // Mo's "still too much" feedback. The Begin gesture now
      // lands silently and the cinema starts on the cold-open
      // type-tick rhythm — which is plenty of audio onboarding.
      playedRef.current = true;
      return;

      // eslint-disable-next-line no-unreachable
      const existing = audioCtxRef.current;
      if (!existing) return;
      if (existing.state === 'suspended') {
        existing.resume().catch(() => {});
        return;
      }

      try {
        const ctx = existing;
        const now = ctx.currentTime;
        // Sub-bass body (60Hz) + thin click (180Hz) for definition.
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(80, now);
        body.frequency.exponentialRampToValueAtTime(45, now + 0.32);
        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0, now);
        // SFX-AUDIT: cinema:thump body was 0.6 (THE loudest in the
        // system — shocking transient at "Begin"). Cut to 0.20 and
        // attack stretched 0.03→0.06 so the sub-bass lands as a
        // felt thump, not a shocking pulse.
        bodyGain.gain.linearRampToValueAtTime(0.20, now + 0.06);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        body.connect(bodyGain).connect(getMasterBus(ctx));
        body.start(now);
        body.stop(now + 0.35);

        const click = ctx.createOscillator();
        click.type = 'triangle';
        click.frequency.setValueAtTime(180, now);
        click.frequency.exponentialRampToValueAtTime(70, now + 0.08);
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0, now);
        // SFX-AUDIT: thump-click cut 0.18→0.08, attack lengthened
        clickGain.gain.linearRampToValueAtTime(0.08, now + 0.022);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        click.connect(clickGain).connect(getMasterBus(ctx));
        click.start(now);
        click.stop(now + 0.15);
      } catch {
        /* silently no-op on contexts that block synth */
      }
    };

    // ─── Keyboard tick (cinema:type-tick) ─────────────────────────
    // Fired by Scene1ColdOpen on each new prequel/headline character.
    // A real mechanical-keyboard / typewriter keystroke is THREE
    // simultaneous layers — the previous two-layer "click + thock"
    // synth lacked the textural snap that distinguishes "plastic
    // hitting plastic" from "synth pretending to be plastic":
    //
    //   1. CLICK   — sharp metallic strike (~2.6kHz triangle, 30ms)
    //                The spring snap / typebar contacting the cap.
    //                Brightest, briefest layer.
    //
    //   2. BODY    — the bottom-out impact (~320Hz sine, 60ms)
    //                The switch hitting the plate / typebar hitting
    //                paper. Adds weight; arrives 3ms after click so
    //                the brain reads "press" not "two events".
    //
    //   3. SNAP    — bandpass-filtered white noise burst (18ms)
    //                The plastic clack texture pure oscillators can't
    //                reproduce. This is the single biggest layer for
    //                authenticity — it's what separates "synth" from
    //                "keyboard". Centered at 3.5kHz with Q=1.2 to
    //                isolate the snap frequencies and reject low-
    //                frequency rumble.
    //
    // Per-stroke ±5% pitch / ±15% volume variation prevents the brain
    // from pattern-matching consecutive ticks as "same sound on
    // repeat" — real keystrokes never sound identical.
    //
    // Throttled at 50ms so a fast scroll doesn't fire a machine-gun
    // burst — real keystrokes have a minimum mechanical interval.
    let lastTickTime = 0;
    // Type-tick can carry a per-event "context" via the CustomEvent's
    // detail object — the dispatcher passes { context: 'title' | 'body' }
    // and the synth applies a small pitch adjustment per context.
    // Title strokes pitch UP 4% (lighter, "above" the body in
    // hierarchy — like a cap row); body strokes pitch DOWN 4% (more
    // grounded prose). The shift is subtle enough that the brain
    // perceives "different paper weight" without consciously hearing
    // two distinct sounds. Default to no shift if no context provided.
    const onTypeTick = (e?: Event) => {
      if (!enabled) return;
      const nowMs = Date.now();
      if (nowMs - lastTickTime < 50) return;
      lastTickTime = nowMs;
      const detail = (e as CustomEvent | undefined)?.detail as
        | { context?: 'title' | 'body'; newLine?: boolean }
        | undefined;
      const contextPitchMul =
        detail?.context === 'title'
          ? 1.04
          : detail?.context === 'body'
            ? 0.96
            : 1.0;
      // First char of a new paragraph/line gets +8% volume — the
      // emphasis a real typist puts on starting a new thought. The
      // brain reads this as "next sentence begins" without it being
      // a separate sound.
      const newLineVolMul = detail?.newLine ? 1.08 : 1.0;
      try {
        // Don't create new contexts here. The pre-arm useEffect above
        // creates the context on the first user gesture; if no
        // gesture has happened yet, we have no usable context. Creating
        // a new one in this scroll-driven handler would just produce
        // another suspended context that never plays — and once a
        // suspended context exists, future resume attempts can be
        // racier in some browsers. So we strictly skip the tick if
        // the context isn't ready.
        const ctx = audioCtxRef.current;
        if (!ctx) {
          // No context yet — opportunistically nudge resume() in case
          // somehow a context exists in a closure we missed; otherwise
          // just bail. The next user gesture will create the context.
          return;
        }
        if (ctx.state === 'suspended') {
          // Try to resume (may succeed if user has gestured since the
          // context was created suspended). If it fails, skip this
          // tick — no point synthesizing into a context that won't play.
          ctx.resume().catch(() => {});
          return;
        }
        const now = ctx.currentTime;
        // Per-stroke variation — small enough to feel natural, large
        // enough that consecutive ticks don't sound identical. The
        // newLine multiplier compounds on the random variation so the
        // first-char-of-paragraph emphasis is preserved even on a
        // randomly-quieter stroke.
        const v = (Math.random() - 0.5) * 2; // -1..1
        const volMul = (1 + v * 0.15) * newLineVolMul; // ±15% volume + newLine accent
        const pitchMul = 1 + v * 0.05;        // ±5% pitch

        // ── 1. CLICK — sharp metallic strike ─────────────────────
        const clickFreq = 2600 * pitchMul * contextPitchMul;
        const click = ctx.createOscillator();
        click.type = 'triangle';
        click.frequency.setValueAtTime(clickFreq, now);
        click.frequency.exponentialRampToValueAtTime(clickFreq * 0.55, now + 0.025);
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0, now);
        clickGain.gain.linearRampToValueAtTime(0.055 * volMul, now + 0.0008);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
        click.connect(clickGain).connect(getMasterBus(ctx));
        click.start(now);
        click.stop(now + 0.032);

        // ── 2. BODY — bottom-out impact ──────────────────────────
        const bodyFreq = 320 * pitchMul * contextPitchMul;
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(bodyFreq, now + 0.003);
        body.frequency.exponentialRampToValueAtTime(bodyFreq * 0.62, now + 0.055);
        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0, now + 0.003);
        bodyGain.gain.linearRampToValueAtTime(0.075 * volMul, now + 0.007);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
        body.connect(bodyGain).connect(getMasterBus(ctx));
        body.start(now + 0.003);
        body.stop(now + 0.07);

        // ── 3. SNAP — filtered noise burst (the texture layer) ───
        // Generate a one-shot white-noise buffer just long enough
        // for the burst; cheap to create per keystroke.
        const snapDuration = 0.020;
        const snapSamples = Math.floor(ctx.sampleRate * snapDuration);
        const snapBuffer = ctx.createBuffer(1, snapSamples, ctx.sampleRate);
        const snapData = snapBuffer.getChannelData(0);
        for (let i = 0; i < snapSamples; i++) {
          snapData[i] = Math.random() * 2 - 1;
        }
        const snapSource = ctx.createBufferSource();
        snapSource.buffer = snapBuffer;
        // Bandpass to isolate the "snap" character — reject low
        // rumble (anything under ~1.5kHz) and very high hiss (above
        // ~6kHz). The 3.5kHz center with Q=1.2 is where the plastic
        // snap of real switches lives.
        const snapFilter = ctx.createBiquadFilter();
        snapFilter.type = 'bandpass';
        snapFilter.frequency.value = 3500 * pitchMul;
        snapFilter.Q.value = 1.2;
        const snapGain = ctx.createGain();
        snapGain.gain.setValueAtTime(0, now);
        snapGain.gain.linearRampToValueAtTime(0.045 * volMul, now + 0.0015);
        snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.020);
        snapSource.connect(snapFilter).connect(snapGain).connect(getMasterBus(ctx));
        snapSource.start(now);
        snapSource.stop(now + 0.022);
      } catch {
        /* silently no-op */
      }
    };

    // ─── Word-erase backspace (cinema:word-erase) ──────────────────
    // Fired by SelectionWord when a word transitions from "selected"
    // to "deleted" during the cold-open's word-by-word delete beat.
    // Distinct character from the type-tick keystroke — heavier,
    // deeper, with a low-frequency noise sweep that conveys removal
    // rather than insertion:
    //
    //   THOCK (130Hz sine → 75Hz, 110ms)  — heavy key bottom-out,
    //                                       lower-pitched than typing
    //                                       so it reads as "delete"
    //                                       not "type".
    //   CLICK (700Hz triangle → 350Hz, 50ms) — the key-cap strike,
    //                                       darker than the typing
    //                                       click (2.6kHz).
    //   SWEEP (lowpass-filtered noise burst, 40ms) — the "swoosh" of
    //                                       a chunk of content being
    //                                       vacuumed away. The lowpass
    //                                       (cutoff 2.5kHz) gives it
    //                                       a muffled "absorption"
    //                                       quality instead of the
    //                                       bright snap of typing.
    //
    // Per-event variation (±5% pitch / ±15% volume) prevents the brain
    // pattern-matching consecutive word-deletes as the same sound.
    // Throttled 80ms — word deletions are slower than keystrokes so
    // the minimum gap is wider.
    let lastWordEraseTime = 0;
    const onWordErase = () => {
      if (!enabled) return;
      const nowMs = Date.now();
      if (nowMs - lastWordEraseTime < 80) return;
      lastWordEraseTime = nowMs;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
        return;
      }
      try {
        const now = ctx.currentTime;
        const v = (Math.random() - 0.5) * 2;
        const volMul = 1 + v * 0.15;
        const pitchMul = 1 + v * 0.05;

        // CLICK — darker than typing keystroke
        const clickFreq = 700 * pitchMul;
        const click = ctx.createOscillator();
        click.type = 'triangle';
        click.frequency.setValueAtTime(clickFreq, now);
        click.frequency.exponentialRampToValueAtTime(clickFreq * 0.5, now + 0.045);
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0, now);
        clickGain.gain.linearRampToValueAtTime(0.07 * volMul, now + 0.0015);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        click.connect(clickGain).connect(getMasterBus(ctx));
        click.start(now);
        click.stop(now + 0.055);

        // THOCK — heavier than typing body
        const thockFreq = 130 * pitchMul;
        const thock = ctx.createOscillator();
        thock.type = 'sine';
        thock.frequency.setValueAtTime(thockFreq, now + 0.004);
        thock.frequency.exponentialRampToValueAtTime(thockFreq * 0.58, now + 0.110);
        const thockGain = ctx.createGain();
        thockGain.gain.setValueAtTime(0, now + 0.004);
        thockGain.gain.linearRampToValueAtTime(0.105 * volMul, now + 0.010);
        thockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.115);
        thock.connect(thockGain).connect(getMasterBus(ctx));
        thock.start(now + 0.004);
        thock.stop(now + 0.12);

        // SWEEP — lowpass-filtered noise burst
        const sweepDur = 0.040;
        const sweepSamples = Math.floor(ctx.sampleRate * sweepDur);
        const sweepBuf = ctx.createBuffer(1, sweepSamples, ctx.sampleRate);
        const sweepData = sweepBuf.getChannelData(0);
        for (let i = 0; i < sweepSamples; i++) {
          sweepData[i] = Math.random() * 2 - 1;
        }
        const sweepSrc = ctx.createBufferSource();
        sweepSrc.buffer = sweepBuf;
        const sweepFilter = ctx.createBiquadFilter();
        sweepFilter.type = 'lowpass';
        // Sweep the lowpass cutoff DOWN over the burst's lifetime so
        // it sounds like the noise is being "absorbed" / vacuumed away.
        sweepFilter.frequency.setValueAtTime(2500 * pitchMul, now);
        sweepFilter.frequency.exponentialRampToValueAtTime(600, now + 0.040);
        sweepFilter.Q.value = 0.9;
        const sweepGain = ctx.createGain();
        sweepGain.gain.setValueAtTime(0, now);
        sweepGain.gain.linearRampToValueAtTime(0.038 * volMul, now + 0.003);
        sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);
        sweepSrc.connect(sweepFilter).connect(sweepGain).connect(getMasterBus(ctx));
        sweepSrc.start(now);
        sweepSrc.stop(now + 0.045);
      } catch {
        /* silently no-op */
      }
    };

    // ─── Period-strike (cinema:period-strike) ──────────────────────
    // Fires exactly once when the cold-open headline's terminal period
    // mounts. The standard keystroke synth used during the rest of the
    // retype is built for a single GLYPH; the period that closes the
    // punchline is the most dramatic mark in the entire cold open and
    // deserves a heavier, more committed sound.
    //
    // Three reinforced layers — same architecture as `onTypeTick` but
    // tuned for impact rather than rhythm:
    //
    //   CLICK   (1.8kHz triangle → 700Hz, 60ms) — the typebar strike,
    //                                       pitched lower than the
    //                                       regular keystroke (2.6kHz)
    //                                       so it reads as a heavier
    //                                       press, not a fast tap.
    //                                       Held 2× longer so the
    //                                       attack registers.
    //   BODY    (165Hz sine → 95Hz, 200ms) — a deep wood-on-wood
    //                                       bottom-out. Half the
    //                                       frequency of the standard
    //                                       body (320Hz) — a writer's
    //                                       *thump*, not a clerk's
    //                                       *click*. Long enough that
    //                                       it actually settles on
    //                                       the page.
    //   SNAP    (bandpass-filtered noise, 50ms) — the plastic-on-paper
    //                                       crackle. Wider band (Q=0.9)
    //                                       and longer envelope than
    //                                       the typing snap (Q=1.2,
    //                                       18ms) so it has texture
    //                                       rather than just a tick.
    //
    // No throttling — this fires once per cinema, can't machine-gun.
    const onPeriodStrike = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
        return;
      }
      try {
        const now = ctx.currentTime;

        // ── PRE-STRIKE SWELL ─────────────────────────────────────
        // A quiet 90ms low-band noise swell that precedes the main
        // strike by ~90ms. The "inhale" before the writer slaps down
        // the period. Without this the strike arrives cold; with it,
        // the ear braces for the percussive moment. Very low
        // amplitude (0.045) — it shouldn't read as its own sound,
        // just as anticipation that the strike then resolves.
        const swellDur = 0.090;
        const swellSamples = Math.floor(ctx.sampleRate * swellDur);
        const swellBuf = ctx.createBuffer(1, swellSamples, ctx.sampleRate);
        const swellData = swellBuf.getChannelData(0);
        for (let i = 0; i < swellSamples; i++) swellData[i] = Math.random() * 2 - 1;
        const swellSrc = ctx.createBufferSource();
        swellSrc.buffer = swellBuf;
        const swellFilter = ctx.createBiquadFilter();
        swellFilter.type = 'bandpass';
        swellFilter.frequency.value = 220;
        swellFilter.Q.value = 1.6;
        const swellGain = ctx.createGain();
        swellGain.gain.setValueAtTime(0, now);
        swellGain.gain.linearRampToValueAtTime(0.045, now + 0.060);
        swellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.090);
        swellSrc.connect(swellFilter).connect(swellGain).connect(getMasterBus(ctx));
        swellSrc.start(now);
        swellSrc.stop(now + 0.095);

        // Main strike layers fire at +90ms so the swell completes
        // and resolves into the percussive moment.
        const strikeStart = now + 0.090;

        // ── CLICK — heavier than the keystroke click ─────────────
        const click = ctx.createOscillator();
        click.type = 'triangle';
        click.frequency.setValueAtTime(1800, strikeStart);
        click.frequency.exponentialRampToValueAtTime(700, strikeStart + 0.055);
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0, strikeStart);
        // SFX-AUDIT: period-strike click 0.11→0.06, attack
        // 0.002→0.010 so the punctuation thump still reads as
        // weight but doesn't pop above the dialogue.
        clickGain.gain.linearRampToValueAtTime(0.06, strikeStart + 0.010);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, strikeStart + 0.06);
        click.connect(clickGain).connect(getMasterBus(ctx));
        click.start(strikeStart);
        click.stop(strikeStart + 0.065);

        // ── BODY — the writer's thump ────────────────────────────
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(165, strikeStart + 0.006);
        body.frequency.exponentialRampToValueAtTime(95, strikeStart + 0.19);
        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0, strikeStart + 0.006);
        // SFX-AUDIT: period-strike body 0.16→0.08, attack
        // 0.014→0.022 — softens the cold-open punctuation thump
        bodyGain.gain.linearRampToValueAtTime(0.08, strikeStart + 0.022);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, strikeStart + 0.21);
        body.connect(bodyGain).connect(getMasterBus(ctx));
        body.start(strikeStart + 0.006);
        body.stop(strikeStart + 0.22);

        // ── SNAP — plastic-on-paper texture ──────────────────────
        const snapDur = 0.050;
        const snapSamples = Math.floor(ctx.sampleRate * snapDur);
        const snapBuf = ctx.createBuffer(1, snapSamples, ctx.sampleRate);
        const snapData = snapBuf.getChannelData(0);
        for (let i = 0; i < snapSamples; i++) snapData[i] = Math.random() * 2 - 1;
        const snapSrc = ctx.createBufferSource();
        snapSrc.buffer = snapBuf;
        const snapFilter = ctx.createBiquadFilter();
        snapFilter.type = 'bandpass';
        snapFilter.frequency.value = 2400;
        snapFilter.Q.value = 0.9;
        const snapGain = ctx.createGain();
        snapGain.gain.setValueAtTime(0, strikeStart);
        snapGain.gain.linearRampToValueAtTime(0.075, strikeStart + 0.003);
        snapGain.gain.exponentialRampToValueAtTime(0.0001, strikeStart + 0.050);
        snapSrc.connect(snapFilter).connect(snapGain).connect(getMasterBus(ctx));
        snapSrc.start(strikeStart);
        snapSrc.stop(strikeStart + 0.055);

        // ── REVERB TAIL ──────────────────────────────────────────
        // A 240ms low-frequency tail (42Hz sub-bass sine) that fades
        // out after the strike. Adds acoustic depth — the period
        // landing in a room with low-frequency resonance. Below
        // audible range on cheap speakers but felt as "weight" on
        // quality systems. Without this the strike was percussive
        // but rootless; with it, the strike feels physically
        // grounded in a space.
        const reverbStart = strikeStart + 0.060;
        const reverb = ctx.createOscillator();
        reverb.type = 'sine';
        reverb.frequency.setValueAtTime(42, reverbStart);
        reverb.frequency.exponentialRampToValueAtTime(34, reverbStart + 0.24);
        const reverbGain = ctx.createGain();
        reverbGain.gain.setValueAtTime(0, reverbStart);
        reverbGain.gain.linearRampToValueAtTime(0.065, reverbStart + 0.030);
        reverbGain.gain.exponentialRampToValueAtTime(0.0001, reverbStart + 0.260);
        reverb.connect(reverbGain).connect(getMasterBus(ctx));
        reverb.start(reverbStart);
        reverb.stop(reverbStart + 0.270);
      } catch {
        /* silently no-op */
      }
    };

    // ─── Editor-arrive (cinema:editor-arrive) ──────────────────────
    // The cinematic panel-slide that plays once when the editor frame
    // begins its entry from below the viewport. Three layers, tuned
    // for "expensive theater curtain rising" rather than "UI panel
    // popping in":
    //
    //   WHOOSH    — lowpass-filtered pink-ish noise sweep.
    //               Filter cutoff sweeps 5kHz → 700Hz over 520ms,
    //               envelope ramps up 0 → 0.075 over 120ms then
    //               decays exponentially. Reads as "air being
    //               displaced as something large moves up into the
    //               room." NOT a hi-fi swoosh — deliberately soft.
    //
    //   SETTLE    — deep sine 78Hz → 58Hz over 220ms, peaking at
    //               t=380ms (i.e. arriving with the panel's landing
    //               moment, not the start of the slide). Volume
    //               envelope 0 → 0.20 → 0 with the peak at 0.45s.
    //               The "panel settles into its frame" thud. Low
    //               enough to feel in the chest, short enough not
    //               to read as a sub-bass drone.
    //
    //   RUSTLE    — bandpass-filtered noise centered at 7kHz with
    //               Q=2.4, 90ms burst starting at t=420ms (just
    //               after the SETTLE peak). The paper/material
    //               texture arriving with the panel — what
    //               distinguishes "wooden drawer closing" from
    //               "metal panel locking." Brief and crisp.
    //
    // Total event duration ~620ms. Designed for one-shot playback;
    // no per-event variation (it's a single moment, not a
    // pattern), no throttling needed (PostStage's arriveFiredRef
    // guarantees one fire per cinema).
    const onEditorArrive = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
        return;
      }
      try {
        const now = ctx.currentTime;

        // ── WHOOSH ───────────────────────────────────────────────
        const whooshDur = 0.52;
        const whooshSamples = Math.floor(ctx.sampleRate * whooshDur);
        const whooshBuf = ctx.createBuffer(1, whooshSamples, ctx.sampleRate);
        const whooshData = whooshBuf.getChannelData(0);
        // Pink-ish noise — simple weighted random for warmer texture
        // than pure white noise. Bias toward low freq via a leaky
        // integrator (running average with strong feedback) keeps
        // the spectrum tilted downward like wind, not hiss.
        let prev = 0;
        for (let i = 0; i < whooshSamples; i++) {
          const w = Math.random() * 2 - 1;
          prev = prev * 0.92 + w * 0.08;
          whooshData[i] = prev * 8; // gain compensation for the leaky filter
        }
        const whooshSrc = ctx.createBufferSource();
        whooshSrc.buffer = whooshBuf;
        const whooshFilter = ctx.createBiquadFilter();
        whooshFilter.type = 'lowpass';
        whooshFilter.frequency.setValueAtTime(5000, now);
        whooshFilter.frequency.exponentialRampToValueAtTime(700, now + 0.52);
        whooshFilter.Q.value = 0.7;
        const whooshGain = ctx.createGain();
        whooshGain.gain.setValueAtTime(0, now);
        whooshGain.gain.linearRampToValueAtTime(0.075, now + 0.12);
        whooshGain.gain.linearRampToValueAtTime(0.060, now + 0.36);
        whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
        whooshSrc.connect(whooshFilter).connect(whooshGain).connect(getMasterBus(ctx));
        whooshSrc.start(now);
        whooshSrc.stop(now + 0.54);

        // ── SETTLE PRE-ATTACK ────────────────────────────────────
        // A brief 60ms low-mid "whump" that precedes the main SETTLE
        // by ~60ms. Adds anticipation — the panel's weight pressing
        // into the frame just before it locks in. Without this the
        // SETTLE thump arrives cold; with it, the ear braces for the
        // landing 60ms in advance. Filtered noise centered at 180Hz
        // with a short envelope, very low amplitude.
        const preStart = now + 0.36;
        const preDur = 0.060;
        const preSamples = Math.floor(ctx.sampleRate * preDur);
        const preBuf = ctx.createBuffer(1, preSamples, ctx.sampleRate);
        const preData = preBuf.getChannelData(0);
        for (let i = 0; i < preSamples; i++) preData[i] = Math.random() * 2 - 1;
        const preSrc = ctx.createBufferSource();
        preSrc.buffer = preBuf;
        const preFilter = ctx.createBiquadFilter();
        preFilter.type = 'bandpass';
        preFilter.frequency.value = 180;
        preFilter.Q.value = 1.4;
        const preGain = ctx.createGain();
        preGain.gain.setValueAtTime(0, preStart);
        preGain.gain.linearRampToValueAtTime(0.075, preStart + 0.010);
        preGain.gain.exponentialRampToValueAtTime(0.0001, preStart + 0.060);
        preSrc.connect(preFilter).connect(preGain).connect(getMasterBus(ctx));
        preSrc.start(preStart);
        preSrc.stop(preStart + 0.065);

        // ── SETTLE ───────────────────────────────────────────────
        // Arrives synchronized with the panel's visual landing.
        // Timing re-tuned: previously fired at +280ms but the visual
        // landing happens at ~+440ms from event dispatch given the
        // entry's easeOut curve. Now fires at +420ms so the audio
        // peak coincides with the visual settle.
        const settleStart = now + 0.42;
        const settle = ctx.createOscillator();
        settle.type = 'sine';
        settle.frequency.setValueAtTime(78, settleStart);
        settle.frequency.exponentialRampToValueAtTime(58, settleStart + 0.22);
        const settleGain = ctx.createGain();
        settleGain.gain.setValueAtTime(0, settleStart);
        // SFX-AUDIT: settle peak cut 0.20→0.10, sustain 0.12→0.06
        settleGain.gain.linearRampToValueAtTime(0.10, settleStart + 0.045);
        settleGain.gain.linearRampToValueAtTime(0.06, settleStart + 0.12);
        settleGain.gain.exponentialRampToValueAtTime(0.0001, settleStart + 0.24);
        settle.connect(settleGain).connect(getMasterBus(ctx));
        settle.start(settleStart);
        settle.stop(settleStart + 0.26);

        // ── SETTLE REVERB TAIL ───────────────────────────────────
        // Deep 48Hz sub-bass sine that fades over 280ms after the
        // SETTLE peak. Provides acoustic depth — the panel landing
        // in a physical room with low-frequency resonance. Below
        // the audible range of cheap speakers but felt rather than
        // heard on quality systems. Adds the "weight" that pure
        // mid-band sounds can't deliver.
        const reverbStart = settleStart + 0.10;
        const reverb = ctx.createOscillator();
        reverb.type = 'sine';
        reverb.frequency.setValueAtTime(48, reverbStart);
        reverb.frequency.exponentialRampToValueAtTime(38, reverbStart + 0.28);
        const reverbGain = ctx.createGain();
        reverbGain.gain.setValueAtTime(0, reverbStart);
        reverbGain.gain.linearRampToValueAtTime(0.085, reverbStart + 0.040);
        reverbGain.gain.exponentialRampToValueAtTime(0.0001, reverbStart + 0.300);
        reverb.connect(reverbGain).connect(getMasterBus(ctx));
        reverb.start(reverbStart);
        reverb.stop(reverbStart + 0.310);

        // ── RUSTLE ───────────────────────────────────────────────
        // Crisp paper/material texture arriving just after the settle.
        // Re-timed to fire at +560ms to follow the rescheduled SETTLE
        // at +420ms (was +280ms). The 140ms offset keeps the rustle
        // perceptually "in sync" with the panel's final settle.
        const rustleStart = now + 0.56;
        const rustleDur = 0.090;
        const rustleSamples = Math.floor(ctx.sampleRate * rustleDur);
        const rustleBuf = ctx.createBuffer(1, rustleSamples, ctx.sampleRate);
        const rustleData = rustleBuf.getChannelData(0);
        for (let i = 0; i < rustleSamples; i++) rustleData[i] = Math.random() * 2 - 1;
        const rustleSrc = ctx.createBufferSource();
        rustleSrc.buffer = rustleBuf;
        const rustleFilter = ctx.createBiquadFilter();
        rustleFilter.type = 'bandpass';
        rustleFilter.frequency.value = 7000;
        rustleFilter.Q.value = 2.4;
        const rustleGain = ctx.createGain();
        rustleGain.gain.setValueAtTime(0, rustleStart);
        rustleGain.gain.linearRampToValueAtTime(0.038, rustleStart + 0.006);
        rustleGain.gain.exponentialRampToValueAtTime(0.0001, rustleStart + 0.090);
        rustleSrc.connect(rustleFilter).connect(rustleGain).connect(getMasterBus(ctx));
        rustleSrc.start(rustleStart);
        rustleSrc.stop(rustleStart + 0.095);
      } catch {
        /* silently no-op */
      }
    };

    // ─── Title-complete (cinema:title-complete) ─────────────────────
    // A single brief "tap" the moment the article title finishes
    // typing. Acoustically the equivalent of the writer hitting
    // Tab/Enter to advance to the body. Single 1.4kHz triangle
    // 38ms with a small body sine for grounding. Subtle enough that
    // it doesn't compete with the body's first keystroke.
    const onTitleComplete = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        const click = ctx.createOscillator();
        click.type = 'triangle';
        click.frequency.setValueAtTime(1400, now);
        click.frequency.exponentialRampToValueAtTime(620, now + 0.04);
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0, now);
        clickGain.gain.linearRampToValueAtTime(0.055, now + 0.002);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);
        click.connect(clickGain).connect(getMasterBus(ctx));
        click.start(now);
        click.stop(now + 0.045);
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(280, now + 0.004);
        body.frequency.exponentialRampToValueAtTime(180, now + 0.060);
        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0, now + 0.004);
        bodyGain.gain.linearRampToValueAtTime(0.06, now + 0.010);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.070);
        body.connect(bodyGain).connect(getMasterBus(ctx));
        body.start(now + 0.004);
        body.stop(now + 0.075);
      } catch {
        /* silently no-op */
      }
    };

    // ─── Bad-ink reveal (cinema:bad-ink-reveal) ─────────────────────
    // Fires when the "bad" word transitions from neutral white to
    // editorial red. A soft 80ms filtered noise "ink soak" that adds
    // a subtle audio cue to the visual color bloom. Without this the
    // color transition was silent; with it, the recognition moment
    // has acoustic weight matching its visual gesture. Bandpass at
    // 900Hz (vocal range, warm) with very low amplitude — meant to
    // be felt as a "wash" rather than heard as a discrete sound.
    const onBadInkReveal = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        const dur = 0.180;
        const samples = Math.floor(ctx.sampleRate * dur);
        const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        // Two bandpass filters in series for a more focused ink-soak
        // texture — wide low band centered at 900Hz, narrow upper
        // band centered at 3.4kHz for the "fizz" of ink soaking in.
        const f1 = ctx.createBiquadFilter();
        f1.type = 'bandpass';
        f1.frequency.value = 900;
        f1.Q.value = 0.8;
        const f2 = ctx.createBiquadFilter();
        f2.type = 'bandpass';
        f2.frequency.value = 3400;
        f2.Q.value = 1.4;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.038, now + 0.040);
        gain.gain.linearRampToValueAtTime(0.022, now + 0.110);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.180);
        src.connect(f1).connect(f2).connect(gain).connect(getMasterBus(ctx));
        src.start(now);
        src.stop(now + 0.190);
      } catch {
        /* silently no-op */
      }
    };

    // ─── Pin-land thump (cinema:pin-land) ───────────────────────────
    // Fires when the headline reaches its pinned position at the top
    // of the viewport (raw 0.275). A subtle low-mid impact — the
    // thesis "locking in" to its anchor position. Quieter than the
    // editor-arrive SETTLE so it doesn't compete; this is a pin, not
    // a panel landing. Two layers: a 120Hz sine body + a brief bandpass
    // noise click for the "lock" texture.
    const onPinLand = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        // Body
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(120, now);
        body.frequency.exponentialRampToValueAtTime(82, now + 0.16);
        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0, now);
        bodyGain.gain.linearRampToValueAtTime(0.082, now + 0.012);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.180);
        body.connect(bodyGain).connect(getMasterBus(ctx));
        body.start(now);
        body.stop(now + 0.190);
        // Click texture
        const clkDur = 0.035;
        const clkSamples = Math.floor(ctx.sampleRate * clkDur);
        const clkBuf = ctx.createBuffer(1, clkSamples, ctx.sampleRate);
        const clkData = clkBuf.getChannelData(0);
        for (let i = 0; i < clkSamples; i++) clkData[i] = Math.random() * 2 - 1;
        const clkSrc = ctx.createBufferSource();
        clkSrc.buffer = clkBuf;
        const clkFilter = ctx.createBiquadFilter();
        clkFilter.type = 'bandpass';
        clkFilter.frequency.value = 1600;
        clkFilter.Q.value = 1.0;
        const clkGain = ctx.createGain();
        clkGain.gain.setValueAtTime(0, now);
        clkGain.gain.linearRampToValueAtTime(0.032, now + 0.004);
        clkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
        clkSrc.connect(clkFilter).connect(clkGain).connect(getMasterBus(ctx));
        clkSrc.start(now);
        clkSrc.stop(now + 0.040);
      } catch {
        /* silently no-op */
      }
    };

    // ─── Approval flip (cinema:approval-chime) ──────────────────────
    // A soft 880Hz sine bell that fires when an approval row flips
    // from Pending to Approved. Two flips happen (Editor, then
    // Medical), so the user hears two distinct soft confirmations.
    // 180ms duration, low amplitude — not a UI alert, more like the
    // gentle click of a stamp landing.
    const onApprovalChime = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        // Two-tone bell — 880Hz fundamental + 1320Hz overtone for
        // brightness. Quick decay so it doesn't overlap if approvals
        // flip in close succession.
        const fund = ctx.createOscillator();
        fund.type = 'sine';
        fund.frequency.setValueAtTime(880, now);
        const fundGain = ctx.createGain();
        fundGain.gain.setValueAtTime(0, now);
        fundGain.gain.linearRampToValueAtTime(0.06, now + 0.006);
        fundGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.180);
        fund.connect(fundGain).connect(getMasterBus(ctx));
        fund.start(now);
        fund.stop(now + 0.190);
        const over = ctx.createOscillator();
        over.type = 'sine';
        over.frequency.setValueAtTime(1320, now + 0.003);
        const overGain = ctx.createGain();
        overGain.gain.setValueAtTime(0, now + 0.003);
        overGain.gain.linearRampToValueAtTime(0.025, now + 0.012);
        overGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.150);
        over.connect(overGain).connect(getMasterBus(ctx));
        over.start(now + 0.003);
        over.stop(now + 0.160);
      } catch {
        /* silently no-op */
      }
    };

    // ─── Publish-press (cinema:publish-press) ───────────────────────
    // Fires the moment the user "presses" the publish button (raw 0.381).
    // A Twitter/Facebook-style outward "submitting" whoosh that builds
    // for ~600ms. Three layers:
    //   WHOOSH    — highpass-filtered noise sweep 600Hz → 4.5kHz over
    //               350ms. Reads as "data flying outward" / "request
    //               leaving the device."
    //   LIFT      — ascending sine 440Hz → 880Hz over 480ms with a
    //               slight overshoot at the top. The "going up" tone
    //               that signals commitment.
    //   PRE-CHIME — brief 150Hz body thump at start to feel like a
    //               tactile button press.
    const onPublishPress = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        // Press thump
        const thump = ctx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(150, now);
        thump.frequency.exponentialRampToValueAtTime(85, now + 0.08);
        const thumpGain = ctx.createGain();
        thumpGain.gain.setValueAtTime(0, now);
        thumpGain.gain.linearRampToValueAtTime(0.085, now + 0.006);
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.090);
        thump.connect(thumpGain).connect(getMasterBus(ctx));
        thump.start(now);
        thump.stop(now + 0.095);
        // Whoosh
        const whooshDur = 0.36;
        const whooshSamples = Math.floor(ctx.sampleRate * whooshDur);
        const whooshBuf = ctx.createBuffer(1, whooshSamples, ctx.sampleRate);
        const whooshData = whooshBuf.getChannelData(0);
        for (let i = 0; i < whooshSamples; i++) whooshData[i] = Math.random() * 2 - 1;
        const whooshSrc = ctx.createBufferSource();
        whooshSrc.buffer = whooshBuf;
        const whooshFilter = ctx.createBiquadFilter();
        whooshFilter.type = 'highpass';
        whooshFilter.frequency.setValueAtTime(600, now + 0.020);
        whooshFilter.frequency.exponentialRampToValueAtTime(4500, now + 0.350);
        whooshFilter.Q.value = 0.8;
        const whooshGain = ctx.createGain();
        whooshGain.gain.setValueAtTime(0, now + 0.020);
        whooshGain.gain.linearRampToValueAtTime(0.10, now + 0.100);
        whooshGain.gain.linearRampToValueAtTime(0.06, now + 0.270);
        whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.360);
        whooshSrc.connect(whooshFilter).connect(whooshGain).connect(getMasterBus(ctx));
        whooshSrc.start(now + 0.020);
        whooshSrc.stop(now + 0.380);
        // Lift tone
        const lift = ctx.createOscillator();
        lift.type = 'sine';
        lift.frequency.setValueAtTime(440, now + 0.050);
        lift.frequency.exponentialRampToValueAtTime(920, now + 0.420);
        lift.frequency.exponentialRampToValueAtTime(880, now + 0.480);
        const liftGain = ctx.createGain();
        liftGain.gain.setValueAtTime(0, now + 0.050);
        liftGain.gain.linearRampToValueAtTime(0.055, now + 0.150);
        liftGain.gain.linearRampToValueAtTime(0.045, now + 0.380);
        liftGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.500);
        lift.connect(liftGain).connect(getMasterBus(ctx));
        lift.start(now + 0.050);
        lift.stop(now + 0.510);
      } catch { /* silently no-op */ }
    };

    // ─── Publish-success (cinema:publish-success) ───────────────────
    // Fires the moment the green ✓ PUBLISHED state appears (raw 0.391).
    // A satisfying two-tone confirmation chime — bright, brief, joyful.
    // Three layers:
    //   CHIME-1  — 1175Hz (D6) sine, 180ms with quick attack and
    //              exponential decay. The primary "ding."
    //   CHIME-2  — 1760Hz (A6) sine 40ms after CHIME-1, slightly
    //              quieter. The harmonic that gives the chime
    //              its bell-like quality (perfect fifth + octave).
    //   SPARKLE  — bandpass-filtered noise at 8kHz, 80ms. The
    //              "shimmer" that makes the confirmation feel like
    //              a small celebration, not just a UI confirm.
    const onPublishSuccess = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        // Chime 1
        const c1 = ctx.createOscillator();
        c1.type = 'sine';
        c1.frequency.setValueAtTime(1175, now);
        const c1Gain = ctx.createGain();
        c1Gain.gain.setValueAtTime(0, now);
        c1Gain.gain.linearRampToValueAtTime(0.095, now + 0.008);
        c1Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.200);
        c1.connect(c1Gain).connect(getMasterBus(ctx));
        c1.start(now);
        c1.stop(now + 0.210);
        // Chime 2 (octave + fifth)
        const c2 = ctx.createOscillator();
        c2.type = 'sine';
        c2.frequency.setValueAtTime(1760, now + 0.040);
        const c2Gain = ctx.createGain();
        c2Gain.gain.setValueAtTime(0, now + 0.040);
        c2Gain.gain.linearRampToValueAtTime(0.045, now + 0.050);
        c2Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.220);
        c2.connect(c2Gain).connect(getMasterBus(ctx));
        c2.start(now + 0.040);
        c2.stop(now + 0.230);
        // Sparkle
        const sparkDur = 0.080;
        const sparkSamples = Math.floor(ctx.sampleRate * sparkDur);
        const sparkBuf = ctx.createBuffer(1, sparkSamples, ctx.sampleRate);
        const sparkData = sparkBuf.getChannelData(0);
        for (let i = 0; i < sparkSamples; i++) sparkData[i] = Math.random() * 2 - 1;
        const sparkSrc = ctx.createBufferSource();
        sparkSrc.buffer = sparkBuf;
        const sparkFilter = ctx.createBiquadFilter();
        sparkFilter.type = 'bandpass';
        sparkFilter.frequency.value = 8000;
        sparkFilter.Q.value = 1.8;
        const sparkGain = ctx.createGain();
        sparkGain.gain.setValueAtTime(0, now + 0.015);
        sparkGain.gain.linearRampToValueAtTime(0.030, now + 0.025);
        sparkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
        sparkSrc.connect(sparkFilter).connect(sparkGain).connect(getMasterBus(ctx));
        sparkSrc.start(now + 0.015);
        sparkSrc.stop(now + 0.105);
      } catch { /* silently no-op */ }
    };

    window.addEventListener('cinema:thump', onThump);
    window.addEventListener('cinema:type-tick', onTypeTick);
    window.addEventListener('cinema:word-erase', onWordErase);
    window.addEventListener('cinema:period-strike', onPeriodStrike);
    window.addEventListener('cinema:editor-arrive', onEditorArrive);
    window.addEventListener('cinema:title-complete', onTitleComplete);
    window.addEventListener('cinema:approval-chime', onApprovalChime);
    window.addEventListener('cinema:bad-ink-reveal', onBadInkReveal);
    window.addEventListener('cinema:pin-land', onPinLand);
    // ─── Comment-arrival tick (cinema:comment-arrive) ───────────────
    // Fires when each comment in the storm lands. `detail.tone`
    // ('friendly' | 'critical') chooses pitch + timbre:
    //   FRIENDLY  — warmer mid-band (320Hz body, 1.1kHz click).
    //               Reads as the soft "ping" of a positive notification.
    //   CRITICAL  — colder, brighter (220Hz body, 2.4kHz click) with
    //               a small noise burst for the "sharp intake" texture.
    //               The pitch difference is subtle but the brain
    //               picks up the tone shift across the comment storm.
    // Climax comments (`detail.climax: true`) get an additional layer:
    // a longer 60Hz sub-tail that hangs in the room — the "this one
    // hits hard" weight. Throttled at 60ms so the cadence still feels
    // human even at fast scroll.
    let lastCommentTickTime = 0;
    const onCommentArrive = (e?: Event) => {
      if (!enabled) return;
      const detail = (e as CustomEvent | undefined)?.detail as
        | { tone?: 'friendly' | 'critical'; climax?: boolean }
        | undefined;
      const isCritical = detail?.tone === 'critical';
      const isClimax = !!detail?.climax;
      const nowMs = Date.now();
      // Throttle ordinary ticks at 60ms (~16 Hz) so a fast scroll
      // doesn't cluster the storm into a buzz. CLIMAX ticks bypass the
      // throttle — they're the dramatic "in the hospital" beat and
      // must always be audible even if the user races through. We
      // still update lastCommentTickTime for the climax tick so it
      // doesn't fire back-to-back with a tail-of-cadence tick.
      if (!isClimax && nowMs - lastCommentTickTime < 60) return;
      lastCommentTickTime = nowMs;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        // Click (high band)
        const click = ctx.createOscillator();
        click.type = 'triangle';
        click.frequency.setValueAtTime(isCritical ? 2400 : 1100, now);
        click.frequency.exponentialRampToValueAtTime(isCritical ? 1100 : 560, now + 0.040);
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0, now);
        clickGain.gain.linearRampToValueAtTime(isCritical ? 0.055 : 0.040, now + 0.003);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.050);
        click.connect(clickGain).connect(getMasterBus(ctx));
        click.start(now);
        click.stop(now + 0.055);
        // Body (mid band)
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(isCritical ? 220 : 320, now + 0.004);
        body.frequency.exponentialRampToValueAtTime(isCritical ? 145 : 230, now + 0.090);
        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0, now + 0.004);
        bodyGain.gain.linearRampToValueAtTime(isCritical ? 0.080 : 0.055, now + 0.012);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.110);
        body.connect(bodyGain).connect(getMasterBus(ctx));
        body.start(now + 0.004);
        body.stop(now + 0.115);
        // Critical: brief noise scrape for "intake breath" texture
        if (isCritical) {
          const scrapeDur = 0.040;
          const scrapeSamples = Math.floor(ctx.sampleRate * scrapeDur);
          const scrapeBuf = ctx.createBuffer(1, scrapeSamples, ctx.sampleRate);
          const scrapeData = scrapeBuf.getChannelData(0);
          for (let i = 0; i < scrapeSamples; i++) scrapeData[i] = Math.random() * 2 - 1;
          const scrapeSrc = ctx.createBufferSource();
          scrapeSrc.buffer = scrapeBuf;
          const scrapeFilter = ctx.createBiquadFilter();
          scrapeFilter.type = 'highpass';
          scrapeFilter.frequency.value = 4500;
          const scrapeGain = ctx.createGain();
          scrapeGain.gain.setValueAtTime(0, now);
          scrapeGain.gain.linearRampToValueAtTime(0.022, now + 0.005);
          scrapeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.040);
          scrapeSrc.connect(scrapeFilter).connect(scrapeGain).connect(getMasterBus(ctx));
          scrapeSrc.start(now);
          scrapeSrc.stop(now + 0.045);
        }
        // Climax: sub-tail
        if (isClimax) {
          const sub = ctx.createOscillator();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(60, now + 0.020);
          sub.frequency.exponentialRampToValueAtTime(42, now + 0.220);
          const subGain = ctx.createGain();
          subGain.gain.setValueAtTime(0, now + 0.020);
          subGain.gain.linearRampToValueAtTime(0.075, now + 0.040);
          subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.240);
          sub.connect(subGain).connect(getMasterBus(ctx));
          sub.start(now + 0.020);
          sub.stop(now + 0.250);
        }
      } catch { /* silently no-op */ }
    };

    // ─── Lawsuit impact (cinema:lawsuit-impact) ─────────────────────
    // Fires the moment "1 lawsuit." lands at raw 0.561. The single
    // most dramatic line in the cinema — deserves a defined audio
    // gesture, not silence. Four-layer compound:
    //   IMPACT-CLICK  — bright triangle 2.8kHz → 1.1kHz, 80ms.
    //                   The "verdict has been read" sharp top.
    //   IMPACT-BODY   — heavy sine 95Hz → 55Hz, 380ms. The "weight
    //                   landing in the room" thud.
    //   IMPACT-NOISE  — bandpass-filtered noise 1.2kHz, 100ms.
    //                   The plastic-on-wood texture of a gavel.
    //   IMPACT-TAIL   — sub-bass 45Hz → 32Hz, 600ms. Acoustic
    //                   resonance — the room holds the impact.
    // No throttling — fires exactly once per cinema.
    const onLawsuitImpact = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        // Click
        const click = ctx.createOscillator();
        click.type = 'triangle';
        click.frequency.setValueAtTime(2800, now);
        click.frequency.exponentialRampToValueAtTime(1100, now + 0.080);
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0, now);
        // SFX-AUDIT: lawsuit click 0.16→0.08, attack 0.004→0.014
        clickGain.gain.linearRampToValueAtTime(0.08, now + 0.014);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.090);
        click.connect(clickGain).connect(getMasterBus(ctx));
        click.start(now);
        click.stop(now + 0.095);
        // Body
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(95, now + 0.008);
        body.frequency.exponentialRampToValueAtTime(55, now + 0.380);
        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0, now + 0.008);
        // SFX-AUDIT: lawsuit body 0.22→0.11, sustain 0.14→0.07,
        // attack stretched 0.020→0.030 so the gavel lands as a
        // felt thud, not a shocking transient.
        bodyGain.gain.linearRampToValueAtTime(0.11, now + 0.030);
        bodyGain.gain.linearRampToValueAtTime(0.07, now + 0.180);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.400);
        body.connect(bodyGain).connect(getMasterBus(ctx));
        body.start(now + 0.008);
        body.stop(now + 0.410);
        // Noise (gavel texture)
        const nDur = 0.100;
        const nSamples = Math.floor(ctx.sampleRate * nDur);
        const nBuf = ctx.createBuffer(1, nSamples, ctx.sampleRate);
        const nData = nBuf.getChannelData(0);
        for (let i = 0; i < nSamples; i++) nData[i] = Math.random() * 2 - 1;
        const nSrc = ctx.createBufferSource();
        nSrc.buffer = nBuf;
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.value = 1200;
        nFilter.Q.value = 1.2;
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0, now);
        // SFX-AUDIT: lawsuit gavel-noise 0.085→0.045, attack
        // stretched so the noise wash blends in instead of slapping.
        nGain.gain.linearRampToValueAtTime(0.045, now + 0.018);
        nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.100);
        nSrc.connect(nFilter).connect(nGain).connect(getMasterBus(ctx));
        nSrc.start(now);
        nSrc.stop(now + 0.110);
        // Sub-bass tail — tightened to fit the 400ms synced window
        // (T7). Was 600ms which leaked past the visual beat. Now
        // 380ms so audio + visual + viewport shake all complete
        // within the same 400ms window.
        const tail = ctx.createOscillator();
        tail.type = 'sine';
        tail.frequency.setValueAtTime(45, now + 0.040);
        tail.frequency.exponentialRampToValueAtTime(32, now + 0.380);
        const tailGain = ctx.createGain();
        tailGain.gain.setValueAtTime(0, now + 0.040);
        // SFX-AUDIT: lawsuit sub-bass tail 0.11→0.06
        tailGain.gain.linearRampToValueAtTime(0.06, now + 0.080);
        tailGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.400);
        tail.connect(tailGain).connect(getMasterBus(ctx));
        tail.start(now + 0.040);
        tail.stop(now + 0.410);
      } catch { /* silently no-op */ }
    };

    // ─── Scanner lock-on (cinema:scanner-lock) ──────────────────────
    // Fires when the red scanner beam stops sweeping and locks on the
    // dangerous sentence. AMPLITUDES REBALANCED (S9): scanner is the
    // FIRST beat in the catch sequence. Sets the floor amplitude
    // (0.10) that subsequent catch beats build on. The cinema's
    // crescendo starts here.
    const onScannerLock = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        const hum = ctx.createOscillator();
        hum.type = 'sine';
        hum.frequency.setValueAtTime(140, now);
        hum.frequency.exponentialRampToValueAtTime(220, now + 0.180);
        const humGain = ctx.createGain();
        humGain.gain.setValueAtTime(0, now);
        // SFX-AUDIT v4: scanner hum 0.10→0.045, sustain 0.07→0.03
        humGain.gain.linearRampToValueAtTime(0.045, now + 0.080);
        humGain.gain.linearRampToValueAtTime(0.030, now + 0.180);
        humGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.360);
        hum.connect(humGain).connect(getMasterBus(ctx));
        hum.start(now);
        hum.stop(now + 0.370);
        const tick = ctx.createOscillator();
        tick.type = 'triangle';
        tick.frequency.setValueAtTime(2400, now + 0.150);
        tick.frequency.exponentialRampToValueAtTime(1800, now + 0.220);
        const tickGain = ctx.createGain();
        tickGain.gain.setValueAtTime(0, now + 0.150);
        // SFX-AUDIT v4: scanner tick 0.09→0.035
        tickGain.gain.linearRampToValueAtTime(0.035, now + 0.155);
        tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.230);
        tick.connect(tickGain).connect(getMasterBus(ctx));
        tick.start(now + 0.150);
        tick.stop(now + 0.240);
      } catch { /* silently no-op */ }
    };

    // ─── Chip arrival (cinema:chip-arrive) ──────────────────────────
    // Each detection chip fires its own soft tick. Pitch shifts down
    // per chip (chip 1 highest, chip 4 lowest) so the ear hears the
    // cascade as a descending arpeggio — "finding, finding, finding,
    // bridging to verification." Detail.index drives the pitch.
    const onChipArrive = (e: Event) => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      const detail = (e as CustomEvent).detail as { index?: number; isLead?: boolean } | undefined;
      const idx = Math.max(0, Math.min(3, detail?.index ?? 0));
      const isLead = !!detail?.isLead;
      try {
        const now = ctx.currentTime;
        // Descending pitches: chip 0 = 880, chip 1 = 740, chip 2 = 620, chip 3 = 520
        const freqs = [880, 740, 620, 520];
        const freq = freqs[idx];
        const click = ctx.createOscillator();
        click.type = 'triangle';
        click.frequency.setValueAtTime(freq, now);
        click.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.060);
        const clickGain = ctx.createGain();
        // S9 REBALANCE: lead chip is now significantly louder (0.16
        // up from 0.14). Subsequent chips climb 0.10 → 0.14 to build
        // a crescendo into the flag punch. The catch sequence is
        // a mountain range, with peak at accept-press.
        const peak = isLead ? 0.16 : 0.10 + (idx * 0.013);
        clickGain.gain.setValueAtTime(0, now);
        clickGain.gain.linearRampToValueAtTime(peak, now + 0.005);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.080);
        click.connect(clickGain).connect(getMasterBus(ctx));
        click.start(now);
        click.stop(now + 0.090);
        // Lead chip also gets a low body so it reads as more significant
        if (isLead) {
          const body = ctx.createOscillator();
          body.type = 'sine';
          body.frequency.setValueAtTime(220, now);
          body.frequency.exponentialRampToValueAtTime(140, now + 0.180);
          const bodyGain = ctx.createGain();
          bodyGain.gain.setValueAtTime(0, now);
          bodyGain.gain.linearRampToValueAtTime(0.06, now + 0.020);
          bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.200);
          body.connect(bodyGain).connect(getMasterBus(ctx));
          body.start(now);
          body.stop(now + 0.210);
        }
      } catch { /* silently no-op */ }
    };

    // ─── Source verification ping (cinema:source-verify) ────────────
    // High-band soft ping that fires for each of the 5 sources as it
    // ticks green. All same pitch (this is "sources verified" not a
    // melody) but spaced out by SourceCheck stagger.
    const onSourceVerify = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        const ping = ctx.createOscillator();
        ping.type = 'sine';
        ping.frequency.setValueAtTime(1600, now);
        ping.frequency.exponentialRampToValueAtTime(1200, now + 0.050);
        const pingGain = ctx.createGain();
        // SFX-AUDIT v4: source-verify 0.085→0.035, attack
        // 0.003→0.012. Five pings in a row was cumulatively
        // shrill; now reads as soft confirmation ticks.
        pingGain.gain.setValueAtTime(0, now);
        pingGain.gain.linearRampToValueAtTime(0.035, now + 0.012);
        pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.060);
        ping.connect(pingGain).connect(getMasterBus(ctx));
        ping.start(now);
        ping.stop(now + 0.070);
      } catch { /* silently no-op */ }
    };

    // ─── Flag punch (cinema:flag-punch) ─────────────────────────────
    // The dramatic ! flag PUNCH-IN moment. Sharper, faster version of
    // the lawsuit impact — the AI's "GOT IT" beat. Three layers:
    //   click — bright snap (the punch lands)
    //   thud  — low body (the weight)
    //   tail  — short sub-bass (the room shakes briefly)
    const onFlagPunch = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        const click = ctx.createOscillator();
        click.type = 'square';
        click.frequency.setValueAtTime(1400, now);
        click.frequency.exponentialRampToValueAtTime(600, now + 0.050);
        const clickGain = ctx.createGain();
        // SFX-AUDIT v4: flag-punch click 0.07→0.03. The visual
        // (red flag + chip cascade) carries the "GOT IT" — the
        // audio is now just a soft tick under it, not a punch.
        clickGain.gain.setValueAtTime(0, now);
        clickGain.gain.linearRampToValueAtTime(0.03, now + 0.014);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.060);
        click.connect(clickGain).connect(getMasterBus(ctx));
        click.start(now);
        click.stop(now + 0.070);
        const thud = ctx.createOscillator();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(80, now + 0.005);
        thud.frequency.exponentialRampToValueAtTime(50, now + 0.220);
        const thudGain = ctx.createGain();
        // SFX-AUDIT v4: flag-punch thud 0.10→0.04. The catch
        // moment now sits quietly under the visuals — the chip
        // cascade + ink-bleed underline are the loud signals,
        // not the audio.
        thudGain.gain.setValueAtTime(0, now + 0.005);
        thudGain.gain.linearRampToValueAtTime(0.04, now + 0.028);
        thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.240);
        thud.connect(thudGain).connect(getMasterBus(ctx));
        thud.start(now + 0.005);
        thud.stop(now + 0.250);
      } catch { /* silently no-op */ }
    };

    // ─── Accept Fix self-press (cinema:accept-press) ───────────────
    // The button press at the climax. Tight, confident "click" — the
    // sound of a confirmation. Pitched mid-high so it reads as "yes,
    // applied" not "warning, error." Pairs with the visual
    // strikethrough draw.
    const onAcceptPress = () => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        const click = ctx.createOscillator();
        click.type = 'triangle';
        click.frequency.setValueAtTime(900, now);
        click.frequency.exponentialRampToValueAtTime(560, now + 0.060);
        const clickGain = ctx.createGain();
        // SFX-AUDIT v4: accept-press click 0.11→0.04, attack
        // 0.014→0.024. Subtle confirmation tick, not a UI ping.
        clickGain.gain.setValueAtTime(0, now);
        clickGain.gain.linearRampToValueAtTime(0.04, now + 0.024);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.090);
        click.connect(clickGain).connect(getMasterBus(ctx));
        click.start(now);
        click.stop(now + 0.100);
        // Affirming low note — the "yes" tone (also boosted)
        const yes = ctx.createOscillator();
        yes.type = 'sine';
        yes.frequency.setValueAtTime(380, now + 0.020);
        yes.frequency.exponentialRampToValueAtTime(280, now + 0.260);
        const yesGain = ctx.createGain();
        yesGain.gain.setValueAtTime(0, now + 0.020);
        // SFX-AUDIT v4: accept-press "yes" tone 0.09→0.035
        yesGain.gain.linearRampToValueAtTime(0.035, now + 0.040);
        yesGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.280);
        yes.connect(yesGain).connect(getMasterBus(ctx));
        yes.start(now + 0.020);
        yes.stop(now + 0.290);
        // S9 NEW: Resolution chord — A-major triad (A4 + C#5 + E5)
        // plays softly UNDER the click + yes. Sets up the cinema's
        // resolution audio brand mark (S3 — three-note motif).
        // The chord is the SAME notes as the AssuredAI brand mark.
        const chordFreqs = [440, 554.37, 659.25]; // A4, C#5, E5
        chordFreqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + 0.060);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now + 0.060);
          // SFX-AUDIT v4: resolution chord 0.05 → 0.018 per note
          // (3 notes summing). Now sits as a whisper-pad under the
          // click, not a chord that competes.
          g.gain.linearRampToValueAtTime(0.018, now + 0.120 + i * 0.020);
          g.gain.setValueAtTime(0.018, now + 0.6);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
          osc.connect(g).connect(getMasterBus(ctx));
          osc.start(now + 0.060);
          osc.stop(now + 1.5);
        });
      } catch { /* silently no-op */ }
    };

    // ─── David Chen spotlight heartbeat — RESPONSIVE (S2) ──────────
    // Audit identified: fixed 60bpm setInterval orphaned the heartbeat
    // from the line being said. Real hearts ACCELERATE under stress.
    // Now the heartbeat:
    //   1. Enters at 60bpm
    //   2. ACCELERATES to 90bpm as the line types in (raw 0.506-0.514)
    //   3. HOLDS at 90bpm (line lands, raw 0.514-0.519)
    //   4. DECELERATES back to 60bpm as spotlight fades (0.519-0.521)
    //   5. Each beat has ±50ms random jitter — real hearts skip
    //   6. Beat intensity also climbs with tempo (louder when stressed)
    //
    // Implementation: recursive setTimeout that recomputes the next
    // beat's delay based on a `tempoRef` that the caller updates.
    // Visual border on David's portrait dispatches `cinema:david-pulse`
    // events synced to each audio beat (T4).
    let davidHeartbeatTimer: ReturnType<typeof setTimeout> | null = null;
    const heartbeatTempoRef = { current: 60 }; // bpm — mutable across recursive calls
    const heartbeatGainRef = { current: 0.14 }; // amplitude — climbs with tempo
    const playHeartbeatTick = () => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        const gain = heartbeatGainRef.current;
        // Low thump
        const thump = ctx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(72, now);
        thump.frequency.exponentialRampToValueAtTime(48, now + 0.180);
        const thumpGain = ctx.createGain();
        thumpGain.gain.setValueAtTime(0, now);
        thumpGain.gain.linearRampToValueAtTime(gain, now + 0.018);
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.250);
        thump.connect(thumpGain).connect(getMasterBus(ctx));
        thump.start(now);
        thump.stop(now + 0.260);
        // Soft click at the peak
        const click = ctx.createOscillator();
        click.type = 'sine';
        click.frequency.setValueAtTime(280, now + 0.012);
        click.frequency.exponentialRampToValueAtTime(180, now + 0.060);
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0, now + 0.012);
        clickGain.gain.linearRampToValueAtTime(gain * 0.28, now + 0.020);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.080);
        click.connect(clickGain).connect(getMasterBus(ctx));
        click.start(now + 0.012);
        click.stop(now + 0.090);
        // Dispatch visual pulse event synced to audio beat (T4)
        window.dispatchEvent(new CustomEvent('cinema:david-pulse'));
      } catch { /* no-op */ }
    };
    const scheduleNextHeartbeat = () => {
      const bpm = heartbeatTempoRef.current;
      const baseInterval = 60000 / bpm; // ms per beat
      const jitter = (Math.random() - 0.5) * 100; // ±50ms
      const interval = Math.max(400, baseInterval + jitter);
      davidHeartbeatTimer = setTimeout(() => {
        playHeartbeatTick();
        scheduleNextHeartbeat();
      }, interval);
    };
    const onDavidSpotlight = (e: Event) => {
      const detail = (e as CustomEvent).detail as { action?: 'start' | 'stop' } | undefined;
      if (detail?.action === 'start') {
        if (davidHeartbeatTimer) clearTimeout(davidHeartbeatTimer);
        if (!enabled) return;
        heartbeatTempoRef.current = 60;
        heartbeatGainRef.current = 0.14;
        playHeartbeatTick();
        scheduleNextHeartbeat();
      } else {
        if (davidHeartbeatTimer) {
          clearTimeout(davidHeartbeatTimer);
          davidHeartbeatTimer = null;
        }
      }
    };

    // ─── Heartbeat tempo controller (cinema:heartbeat-tempo) ───────
    // External components (e.g., DavidChenSpotlight) dispatch this
    // event with { bpm } to update the heartbeat's tempo dynamically.
    // The next scheduled beat uses the new tempo.
    const onHeartbeatTempo = (e: Event) => {
      const detail = (e as CustomEvent).detail as { bpm?: number; gain?: number } | undefined;
      if (typeof detail?.bpm === 'number') {
        heartbeatTempoRef.current = Math.max(40, Math.min(140, detail.bpm));
      }
      if (typeof detail?.gain === 'number') {
        heartbeatGainRef.current = Math.max(0, Math.min(0.4, detail.gain));
      }
    };
    window.addEventListener('cinema:heartbeat-tempo', onHeartbeatTempo);

    window.addEventListener('cinema:publish-press', onPublishPress);
    window.addEventListener('cinema:publish-success', onPublishSuccess);
    window.addEventListener('cinema:comment-arrive', onCommentArrive);
    window.addEventListener('cinema:lawsuit-impact', onLawsuitImpact);
    window.addEventListener('cinema:scanner-lock', onScannerLock);
    window.addEventListener('cinema:chip-arrive', onChipArrive);
    window.addEventListener('cinema:source-verify', onSourceVerify);
    window.addEventListener('cinema:flag-punch', onFlagPunch);
    window.addEventListener('cinema:accept-press', onAcceptPress);
    window.addEventListener('cinema:david-spotlight', onDavidSpotlight);

    // ─── Decision pause (cinema:decision-pause) ────────────────────
    // The "Don't let this be you." beat. Single piano A4 note plays
    // (the leitmotif's root) — sets up the cinema's resolution audio
    // signature. The note has a BREATH envelope (slow attack, long
    // sustained body, gentle decay) — the opposite of every other
    // beat's hard-attack synthesis. Subjectively reads as "the cinema
    // is asking a question, not making a statement."
    const onDecisionPause = (e: Event) => {
      // SFX-AUDIT v4 — Mo: "the ding at the end... is super
      // annoying." The 440Hz piano A4 was creating an unintended
      // "ding" right when the cinema should be holding silence.
      // The "Don't let this be you" line is more powerful as a
      // SILENT decision pause — text over a dimmed stage, no
      // sound at all. Cinematic restraint > musical statement.
      // The brand-mark motif still fires at accept-press, so the
      // audio signature isn't lost — just moved off this beat.
      if (!enabled) return;
      void e;
      return;

      // eslint-disable-next-line no-unreachable
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const detail = (e as CustomEvent).detail as { action?: 'enter' | 'leave' } | undefined;
      if (detail?.action !== 'enter') return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      try {
        const now = ctx.currentTime;
        // Piano A4 = 440Hz, played with two-oscillator richer tone:
        //   primary: sine 440Hz (the note)
        //   sub:     sine 220Hz (octave below, depth)
        //   third:   triangle 660Hz at -12dB (color)
        const primary = ctx.createOscillator();
        primary.type = 'sine';
        primary.frequency.setValueAtTime(440, now);
        const pGain = ctx.createGain();
        pGain.gain.setValueAtTime(0, now);
        // SFX-AUDIT: decision-pause piano note 0.18→0.10. The
        // BREATH envelope already softens the attack; lowering the
        // sustained peak so it whispers under the held silence
        // rather than asserts over it.
        pGain.gain.linearRampToValueAtTime(0.10, now + 0.080);
        pGain.gain.setValueAtTime(0.10, now + 1.2);
        pGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
        primary.connect(pGain).connect(getMasterBus(ctx));
        primary.start(now);
        primary.stop(now + 2.5);
        // Octave below for depth
        const sub = ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(220, now + 0.020);
        const sGain = ctx.createGain();
        sGain.gain.setValueAtTime(0, now + 0.020);
        // SFX-AUDIT: decision-pause sub 0.10→0.055
        sGain.gain.linearRampToValueAtTime(0.055, now + 0.100);
        sGain.gain.setValueAtTime(0.055, now + 1.0);
        sGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
        sub.connect(sGain).connect(getMasterBus(ctx));
        sub.start(now + 0.020);
        sub.stop(now + 2.3);
        // Triangle harmonic for piano-like color
        const harm = ctx.createOscillator();
        harm.type = 'triangle';
        harm.frequency.setValueAtTime(660, now + 0.040);
        const hGain = ctx.createGain();
        hGain.gain.setValueAtTime(0, now + 0.040);
        hGain.gain.linearRampToValueAtTime(0.045, now + 0.120);
        hGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
        harm.connect(hGain).connect(getMasterBus(ctx));
        harm.start(now + 0.040);
        harm.stop(now + 1.9);
      } catch { /* no-op */ }
    };
    window.addEventListener('cinema:decision-pause', onDecisionPause);

    // ─── AssuredAI audio brand mark (cinema:brand-mark) ────────────
    // S3 — the cinema's audio brand signature. A 600ms 3-note motif:
    // A4 (root) → E4 (down a fourth, contemplative) → A5 (up an
    // octave, brighter resolution). Same falling-then-rising shape
    // as the visual ink-bleed gesture: stain spreads, settles,
    // then deposits. Plays at:
    //   - Cinema begin (first encounter with the brand)
    //   - Accept-fix climax (the brand's resolution moment)
    //   - Scan-button hover in PasteAndScan
    //   - 200ms fragment under every ink-bleed gesture
    //
    // The detail.intensity arg (0-1) lets the same motif play
    // at different volumes — soft fragment vs full brand statement.
    const onBrandMark = (e: Event) => {
      if (!enabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return; }
      const detail = (e as CustomEvent).detail as { intensity?: number } | undefined;
      const intensity = Math.max(0, Math.min(1, detail?.intensity ?? 1));
      try {
        const now = ctx.currentTime;
        // Three notes — A4, E4, A5 (440Hz, 329.63Hz, 880Hz)
        // SFX-AUDIT v4: brand-mark motif cut ~60% across all notes
        // (was 0.10/0.08/0.12 at intensity 1). The 3-note motif now
        // sits as a subtle audio signature beneath the visuals, not
        // a musical statement. The bright A5 high note (was 0.12)
        // was the most ear-pulling — cut hardest.
        const notes: { freq: number; offset: number; dur: number; gain: number }[] = [
          { freq: 440,    offset: 0.000, dur: 0.220, gain: 0.040 * intensity },
          { freq: 329.63, offset: 0.180, dur: 0.220, gain: 0.030 * intensity },
          { freq: 880,    offset: 0.360, dur: 0.380, gain: 0.045 * intensity },
        ];
        notes.forEach((n) => {
          // Each note is a sine + soft triangle harmonic for warmth
          const fundamental = ctx.createOscillator();
          fundamental.type = 'sine';
          fundamental.frequency.setValueAtTime(n.freq, now + n.offset);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now + n.offset);
          // Soft attack (40ms) for piano-like feel
          g.gain.linearRampToValueAtTime(n.gain, now + n.offset + 0.040);
          g.gain.setValueAtTime(n.gain, now + n.offset + n.dur * 0.55);
          g.gain.exponentialRampToValueAtTime(0.0001, now + n.offset + n.dur);
          fundamental.connect(g).connect(getMasterBus(ctx));
          fundamental.start(now + n.offset);
          fundamental.stop(now + n.offset + n.dur + 0.02);
          // Triangle harmonic at 2× freq for color
          const harm = ctx.createOscillator();
          harm.type = 'triangle';
          harm.frequency.setValueAtTime(n.freq * 2, now + n.offset + 0.020);
          const hg = ctx.createGain();
          hg.gain.setValueAtTime(0, now + n.offset + 0.020);
          hg.gain.linearRampToValueAtTime(n.gain * 0.25, now + n.offset + 0.060);
          hg.gain.exponentialRampToValueAtTime(0.0001, now + n.offset + n.dur * 0.7);
          harm.connect(hg).connect(getMasterBus(ctx));
          harm.start(now + n.offset + 0.020);
          harm.stop(now + n.offset + n.dur * 0.75);
        });
      } catch { /* no-op */ }
    };
    window.addEventListener('cinema:brand-mark', onBrandMark);
    return () => {
      window.removeEventListener('cinema:thump', onThump);
      window.removeEventListener('cinema:type-tick', onTypeTick);
      window.removeEventListener('cinema:word-erase', onWordErase);
      window.removeEventListener('cinema:period-strike', onPeriodStrike);
      window.removeEventListener('cinema:editor-arrive', onEditorArrive);
      window.removeEventListener('cinema:title-complete', onTitleComplete);
      window.removeEventListener('cinema:approval-chime', onApprovalChime);
      window.removeEventListener('cinema:bad-ink-reveal', onBadInkReveal);
      window.removeEventListener('cinema:pin-land', onPinLand);
      window.removeEventListener('cinema:publish-press', onPublishPress);
      window.removeEventListener('cinema:publish-success', onPublishSuccess);
      window.removeEventListener('cinema:comment-arrive', onCommentArrive);
      window.removeEventListener('cinema:lawsuit-impact', onLawsuitImpact);
      window.removeEventListener('cinema:scanner-lock', onScannerLock);
      window.removeEventListener('cinema:chip-arrive', onChipArrive);
      window.removeEventListener('cinema:source-verify', onSourceVerify);
      window.removeEventListener('cinema:flag-punch', onFlagPunch);
      window.removeEventListener('cinema:accept-press', onAcceptPress);
      window.removeEventListener('cinema:david-spotlight', onDavidSpotlight);
      window.removeEventListener('cinema:decision-pause', onDecisionPause);
      window.removeEventListener('cinema:brand-mark', onBrandMark);
      window.removeEventListener('cinema:heartbeat-tempo', onHeartbeatTempo);
      if (davidHeartbeatTimer) clearTimeout(davidHeartbeatTimer);
    };
  }, [enabled]);

  const toggle = () => {
    // Standard toggle. Context is already unlocked by CinemaIntro's
    // Begin-click before this pill ever becomes interactive, so no
    // unlock-vs-toggle gymnastics needed here.
    const next = !enabled;
    setEnabled(next);
    sessionStorage.setItem('cinema-sound', next ? '1' : '0');
    if (next) playedRef.current = false;
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute cinema sound' : 'Enable cinema sound'}
      className="fixed bottom-5 right-5 z-[60] inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-[#050912]/80 px-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur-md transition-all hover:bg-[#050912] hover:text-white"
      style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          enabled
            ? 'bg-[#DC2626] shadow-[0_0_8px_rgba(220,38,38,0.7)]'
            : 'bg-white/40'
        }`}
      />
      {enabled ? 'Sound on' : 'Sound off'}
    </button>
  );
}
