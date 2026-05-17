'use client';

/**
 * LiveHashChainHero — the home-page hero background.
 *
 * THE SAFETY NET METAPHOR.
 *
 * AssuredAI is a publishing safety net — it catches the bad sentence
 * before it ships. The background visual is that exact metaphor,
 * rendered as a kinetic woven fabric:
 *
 *   1. PASTEL MESH GRADIENT (CSS only, always visible)
 *      Soft peach/pink/lilac/blue/mint hues, 200%×200% with a 40s
 *      drift. Same Apple-keynote / Stripe-homepage aesthetic.
 *
 *   2. SAFETY-NET CANVAS (mouse-reactive)
 *      A woven net of intersecting fibers. Nodes drape with a
 *      natural parabolic sag (like a real net hanging slack between
 *      anchor points). When the cursor passes over, the net DIPS
 *      DOWN toward the cursor — as if catching something falling
 *      into it — then recovers via spring physics. The conceptual
 *      message: "this is the layer that catches things."
 *
 *      Fibers are warm-cool-blended translucent strokes, intersection
 *      points are tiny knots. Reads as a real woven net at scale,
 *      not a generic dot grid.
 *
 *   3. SONAR PULSE (CSS-only, programmatically triggered)
 *      When a verification completes, the verifier dispatches the
 *      `assured:verify-complete` event with the card's screen
 *      position. A teal wavefront emanates from there through the
 *      net — "the audit being broadcast to the chain."
 *
 * PERFORMANCE BUDGET (the previous version was the "heavy/glitchy"
 * element Mo correctly called out):
 *
 *   - Render loop throttled to 30fps (50% CPU vs. 60fps)
 *   - devicePixelRatio capped at 1.5 (was 2 — 56% pixel reduction)
 *   - Cell size grew from 96px to 130px (~46% fewer nodes)
 *   - IntersectionObserver pauses the loop when hero scrolls out
 *   - document.visibilityState pauses the loop when tab is hidden
 *   - prefers-reduced-motion replaces the canvas with a static
 *     gradient — no animation at all for users who opt out
 *   - Static-state short-circuit: when all nodes are within 0.3px
 *     of rest AND no cursor present AND no pulse active, the physics
 *     tick is skipped (we still render once so the canvas isn't blank)
 */

import { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  origX: number;
  /** Draped Y — origY plus a natural parabolic sag from the row edge.
   *  Nodes spring back to this, not to origY. Gives the net its
   *  hanging-slack-fabric look. */
  drapeY: number;
  vx: number;
  vy: number;
}

interface Connection {
  a: number; // index into points
  b: number;
  goalDist: number;
}

interface Pulse {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  born: number;
}

const CELL_SIZE = 130; // larger = fewer nodes = faster. Net still reads at scale.
const FRICTION = 0.10; // higher = settles faster (less idle CPU)
const ELASTICITY = 0.045; // spring stiffness
const ORIGIN_PULL = 0.022; // pull toward drape position
const CURSOR_RADIUS = 240;
const CURSOR_FORCE = 0.32; // ATTRACTIVE — nodes dip TOWARD cursor (catch-not-push)
const DRAPE_DEPTH = 16; // px of natural sag at the deepest point
const TARGET_FPS = 30;
const TARGET_DELTA_MS = 1000 / TARGET_FPS;
const REST_THRESHOLD = 0.3; // px; below this we freeze the physics tick

export function LiveHashChainHero() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const pulsesRef = useRef<Pulse[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -10000,
    y: -10000,
    active: false,
  });
  const dprRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const inViewRef = useRef(true);

  // ---- Build the triangular grid + natural drape ------------------
  const rebuild = (canvas: HTMLCanvasElement) => {
    const w = canvas.width / dprRef.current;
    const h = canvas.height / dprRef.current;
    const points: Point[] = [];
    const cols = Math.ceil(w / CELL_SIZE) + 2;
    const rows = Math.ceil(h / CELL_SIZE) + 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Offset every other row by half a cell — isometric / triangular.
        // Each interior node ends up with six neighbours, which is the
        // standard hexagonal-net topology that real safety nets use.
        const xOffset = row % 2 === 0 ? 0 : CELL_SIZE / 2;
        const x = col * CELL_SIZE + xOffset - CELL_SIZE;
        const y = row * (CELL_SIZE * 0.85) - CELL_SIZE;
        // Parabolic sag in the X direction — nodes mid-row sag most,
        // edge nodes are anchored. Multiplies by row-progress so the
        // sag accumulates downward like a real hanging net.
        const xNorm = w > 0 ? Math.max(0, Math.min(1, x / w)) : 0.5;
        const sagAtX = 4 * xNorm * (1 - xNorm); // parabola, peaks at 0.5
        const rowProgress = Math.max(0, Math.min(1, row / Math.max(1, rows - 2)));
        const drapeOffset = sagAtX * rowProgress * DRAPE_DEPTH;
        const drapeY = y + drapeOffset;
        points.push({
          x,
          y: drapeY,
          origX: x,
          drapeY,
          vx: 0,
          vy: 0,
        });
      }
    }
    const conns: Connection[] = [];
    const idx = (col: number, row: number) =>
      row >= 0 && row < rows && col >= 0 && col < cols ? row * cols + col : -1;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const here = idx(col, row);
        if (here < 0) continue;
        const neighborOffsets =
          row % 2 === 0
            ? [
                [1, 0],
                [0, 1],
                [-1, 1],
              ]
            : [
                [1, 0],
                [1, 1],
                [0, 1],
              ];
        for (const [dc, dr] of neighborOffsets) {
          if (dc === undefined || dr === undefined) continue;
          const there = idx(col + dc, row + dr);
          if (there >= 0) {
            const p1 = points[here]!;
            const p2 = points[there]!;
            const dx = p1.origX - p2.origX;
            const dy = p1.drapeY - p2.drapeY;
            conns.push({ a: here, b: there, goalDist: Math.hypot(dx, dy) });
          }
        }
      }
    }
    pointsRef.current = points;
    connectionsRef.current = conns;
  };

  // ---- Resize handler ---------------------------------------------
  const resize = (canvas: HTMLCanvasElement) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    dprRef.current = dpr;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    rebuild(canvas);
  };

  // ---- Tick (physics) + render ------------------------------------
  const tick = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const points = pointsRef.current;
    const conns = connectionsRef.current;
    const mouse = mouseRef.current;
    const pulses = pulsesRef.current;

    // Static-state short-circuit — if nothing is moving and nothing is
    // pushing, skip the physics tick. We still render once so the
    // canvas isn't blank, but no new force application.
    let maxV = 0;
    for (const p of points) {
      const v = Math.abs(p.vx) + Math.abs(p.vy);
      if (v > maxV) maxV = v;
      if (maxV > REST_THRESHOLD) break;
    }
    const idle = !mouse.active && pulses.length === 0 && maxV < REST_THRESHOLD;

    if (!idle) {
      // Update physics
      for (const p of points) {
        // Spring back toward drape position (Hooke's law)
        const dxO = p.origX - p.x;
        const dyO = p.drapeY - p.y;
        p.vx += dxO * ORIGIN_PULL;
        p.vy += dyO * ORIGIN_PULL;

        // Cursor — ATTRACTION (dip toward cursor, like catching a falling
        // object). Different from the previous repulsion model which made
        // the mesh feel like a force field. This makes it feel like a net.
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const d2 = dx * dx + dy * dy;
          const r2 = CURSOR_RADIUS * CURSOR_RADIUS;
          if (d2 < r2 && d2 > 1) {
            const d = Math.sqrt(d2);
            const force = (1 - d / CURSOR_RADIUS) * CURSOR_FORCE;
            // Dip dominantly DOWN-and-toward — gives the catching feel
            // rather than a generic radial pull.
            p.vx += (dx / d) * force * 5;
            p.vy += (dy / d) * force * 9;
          }
        }

        // Sonar pulse push
        for (const pulse of pulses) {
          const dx = p.x - pulse.x;
          const dy = p.y - pulse.y;
          const d = Math.hypot(dx, dy);
          const ring = Math.abs(d - pulse.radius);
          if (ring < 60 && d > 1) {
            const force = (1 - ring / 60) * pulse.alpha * 1.4;
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
          }
        }

        // Apply velocity + friction
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 1 - FRICTION;
        p.vy *= 1 - FRICTION;
      }

      // Apply spring constraint on each connection
      for (const c of conns) {
        const p1 = points[c.a]!;
        const p2 = points[c.b]!;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const d = Math.hypot(dx, dy) || 1;
        const stretch = (d - c.goalDist) * ELASTICITY;
        const fx = (dx / d) * stretch;
        const fy = (dy / d) * stretch;
        p1.vx += fx;
        p1.vy += fy;
        p2.vx -= fx;
        p2.vy -= fy;
      }
    }

    // Update pulses (always — even in idle, until they die)
    pulsesRef.current = pulses.filter((p) => {
      const age = (performance.now() - p.born) / 1000;
      p.radius = age * 420;
      p.alpha = Math.max(0, 1 - age / 2.4);
      return p.alpha > 0.02;
    });

    // Render — even in idle we draw once so the canvas isn't blank
    // and so the sonar pulse keeps animating.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dprRef.current, dprRef.current);

    // Fibers — woven safety-net cords. Brighter / warmer where stretched.
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    for (const c of conns) {
      const p1 = points[c.a]!;
      const p2 = points[c.b]!;
      const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const stretch = Math.abs(d - c.goalDist);
      const intensity = Math.min(1, stretch / 30);
      // At rest: muted indigo-blue (reads as cool rope on the pastel bg).
      // Under deformation: warmer amber blend, signaling active region.
      const baseAlpha = 0.12;
      const activeAlpha = 0.55;
      const alpha = baseAlpha + (activeAlpha - baseAlpha) * intensity;
      const r = Math.round(40 + intensity * 180);
      const g = Math.round(70 + intensity * 70);
      const b = Math.round(150 - intensity * 90);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Knots at each intersection — tiny circles that thicken slightly
    // when the net is deformed nearby. Subtle; reads as woven knots.
    for (const p of points) {
      const offset = Math.abs(p.x - p.origX) + Math.abs(p.y - p.drapeY);
      const r = 1.1 + Math.min(0.9, offset / 18);
      ctx.fillStyle = `rgba(40, 70, 150, ${0.32 + Math.min(0.4, offset / 30)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sonar pulse rings
    for (const pulse of pulses) {
      ctx.strokeStyle = `rgba(13, 148, 136, ${pulse.alpha * 0.55})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(13, 148, 136, ${pulse.alpha * 0.22})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  // ---- Lifecycle --------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Respect prefers-reduced-motion — render the gradient only, no canvas.
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) {
      canvas.style.display = 'none';
      return;
    }

    resize(canvas);

    const onResize = () => resize(canvas);
    window.addEventListener('resize', onResize, { passive: true });

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const within =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: within,
      };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -10000, y: -10000, active: false };
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave, { passive: true });

    // Pause when the hero scrolls out of view (IntersectionObserver).
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          inViewRef.current = e.isIntersecting;
        }
      },
      { threshold: 0.01 },
    );
    io.observe(wrapper);

    // Pause when the tab is hidden.
    const onVisibility = () => {
      // Only relax inViewRef when the tab is hidden — don't override
      // the IntersectionObserver state when the tab becomes visible
      // again (that path will re-trigger via the observer).
      if (document.hidden) inViewRef.current = false;
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Listen for verification-complete events from HomeVerifierDemo.
    const onVerifyComplete = (e: Event) => {
      const detail = (e as CustomEvent<{ x?: number; y?: number }>).detail ?? {};
      const rect = canvas.getBoundingClientRect();
      const x = (detail.x ?? rect.width / 2 + rect.left) - rect.left;
      const y = (detail.y ?? rect.height / 2 + rect.top) - rect.top;
      pulsesRef.current.push({
        x,
        y,
        radius: 0,
        alpha: 1,
        born: performance.now(),
      });
    };
    window.addEventListener('assured:verify-complete', onVerifyComplete);

    // 30fps throttled loop — accumulator pattern means we don't tick on
    // every rAF, just when the elapsed budget has passed.
    let running = true;
    let lastDraw = performance.now();
    const loop = (t: number) => {
      if (!running) return;
      rafRef.current = requestAnimationFrame(loop);
      if (!inViewRef.current) return;
      const delta = t - lastDraw;
      if (delta < TARGET_DELTA_MS) return;
      lastDraw = t;
      tick(canvas, ctx);
    };
    rafRef.current = requestAnimationFrame(loop);

    // Draw once immediately so the net is visible before the first tick.
    tick(canvas, ctx);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('assured:verify-complete', onVerifyComplete);
      document.removeEventListener('visibilitychange', onVisibility);
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      {/* Layer 1: animated pastel mesh gradient */}
      <div className="absolute inset-0 mesh-aurora-bg" />
      {/* Layer 2: safety-net canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full opacity-[0.65] mix-blend-multiply"
      />
      {/* Layer 3: bottom vignette so content below the hero blends down */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
