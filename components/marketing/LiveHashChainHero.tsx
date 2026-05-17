'use client';

/**
 * LiveHashChainHero — the home-page hero background.
 *
 * Three composited layers, designed as a single visual system:
 *
 *   1. PASTEL MESH GRADIENT (CSS only, always visible)
 *      Multi-radial-gradient with soft peach/pink/lilac/blue/mint
 *      hues. background-size 200% × 200% with a 40s linear-infinite
 *      animation that slowly drifts the gradient across the surface.
 *      Aesthetic reference: Yuujin "Mesh Gradient Animation" + Apple
 *      keynote backdrops + Stripe's hero.
 *
 *   2. INTERACTIVE HASH-CHAIN MESH (canvas, mouse-reactive)
 *      Isometric triangular grid of points connected by elastic
 *      springs — physics-based, inspired by Ben Matthews' "Elastic
 *      Mesh" codepen, but REFRAMED for our product: each point is a
 *      conceptual audit row, each line is a cryptographic prev→next
 *      link. The cursor pushes nearby nodes via inverse-square force,
 *      points spring back toward their origin via Hooke's law. Slow
 *      ambient drift even when the cursor is idle.
 *
 *   3. SONAR PULSE (CSS-only, programmatically triggered)
 *      When a verification completes, dispatching the
 *      `assured:verify-complete` window event fires an expanding ring
 *      from the verifier card's position — visually broadcasting the
 *      new audit out to the chain. Inspired by Luke Wood's "Make
 *      Waves" codepen but constrained to a single deliberate pulse
 *      per verification, not ambient chaos.
 *
 * Why this is unique to AssuredAI: the hash chain is our defining
 * brand element. Owning a kinetic visualization of "a chain of
 * audits" on the home page is something no competitor in the
 * regulated-content space (Vanta, Drata, Acrolinx, Secureframe) can
 * match because they don't have a public hash chain to visualize.
 * The background isn't decoration — it's the product made visible.
 */

import { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  origX: number;
  origY: number;
  vx: number;
  vy: number;
  pulse: number; // phase offset for ambient pulse animation
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

const CELL_SIZE = 96; // px between nodes — larger = sparser = more elegant
const FRICTION = 0.08;
const ELASTICITY = 0.04;
const CURSOR_RADIUS = 220;
const CURSOR_FORCE = 0.18;
const ORIGIN_PULL = 0.018;

export function LiveHashChainHero() {
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

  // ---- Build the triangular grid (isometric, like pen #1) ----------
  const rebuild = (canvas: HTMLCanvasElement) => {
    const w = canvas.width / dprRef.current;
    const h = canvas.height / dprRef.current;
    const points: Point[] = [];
    const cols = Math.ceil(w / CELL_SIZE) + 2;
    const rows = Math.ceil(h / CELL_SIZE) + 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Offset every other row by half a cell — isometric / triangular.
        const xOffset = row % 2 === 0 ? 0 : CELL_SIZE / 2;
        const x = col * CELL_SIZE + xOffset - CELL_SIZE;
        const y = row * (CELL_SIZE * 0.85) - CELL_SIZE;
        points.push({
          x,
          y,
          origX: x,
          origY: y,
          vx: 0,
          vy: 0,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }
    // Connections: each point connects to up to 6 neighbours forming the
    // triangular mesh. Iterate offsets per row parity.
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
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    rebuild(canvas);
  };

  // ---- Tick + render ----------------------------------------------
  const tick = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, t: number) => {
    const points = pointsRef.current;
    const conns = connectionsRef.current;
    const mouse = mouseRef.current;
    const pulses = pulsesRef.current;
    const w = canvas.width / dprRef.current;
    const h = canvas.height / dprRef.current;

    // Update physics
    for (const p of points) {
      // Spring back toward origin (Hooke's law)
      const dxO = p.origX - p.x;
      const dyO = p.origY - p.y;
      p.vx += dxO * ORIGIN_PULL;
      p.vy += dyO * ORIGIN_PULL;

      // Cursor repulsion — inverse-square within CURSOR_RADIUS
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        const r2 = CURSOR_RADIUS * CURSOR_RADIUS;
        if (d2 < r2 && d2 > 1) {
          const d = Math.sqrt(d2);
          const force = (1 - d / CURSOR_RADIUS) * CURSOR_FORCE;
          p.vx += (dx / d) * force * 12;
          p.vy += (dy / d) * force * 12;
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

    // Update pulses
    pulsesRef.current = pulses.filter((p) => {
      const age = (performance.now() - p.born) / 1000;
      p.radius = age * 480;
      p.alpha = Math.max(0, 1 - age / 2.4);
      return p.alpha > 0.01 && p.radius < Math.hypot(w, h);
    });

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dprRef.current, dprRef.current);

    // Connections
    ctx.lineWidth = 0.6;
    for (const c of conns) {
      const p1 = points[c.a]!;
      const p2 = points[c.b]!;
      const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const stretch = Math.abs(d - c.goalDist);
      // Default lines: very soft indigo on the pastel background.
      // Stretched lines (deformed by cursor or pulse): brighter
      // primary, signaling "active region of the chain."
      const intensity = Math.min(1, stretch / 24);
      const baseAlpha = 0.10;
      const activeAlpha = 0.55;
      const alpha = baseAlpha + (activeAlpha - baseAlpha) * intensity;
      ctx.strokeStyle = `rgba(36, 67, 152, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Nodes — small circles with gentle pulse
    for (const p of points) {
      const breath = 0.5 + 0.5 * Math.sin(t / 1200 + p.pulse);
      const r = 1.2 + breath * 0.8;
      ctx.fillStyle = `rgba(36, 67, 152, ${0.35 + breath * 0.25})`;
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
      ctx.strokeStyle = `rgba(13, 148, 136, ${pulse.alpha * 0.25})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  // ---- Lifecycle --------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    resize(canvas);

    const onResize = () => resize(canvas);
    window.addEventListener('resize', onResize, { passive: true });

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -10000, y: -10000, active: false };
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave, { passive: true });

    // Listen for verification-complete events from HomeVerifierDemo
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

    // Animation loop
    let running = true;
    const loop = (t: number) => {
      if (!running) return;
      tick(canvas, ctx, t);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('assured:verify-complete', onVerifyComplete);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Layer 1: animated pastel mesh gradient */}
      <div className="absolute inset-0 mesh-aurora-bg" />
      {/* Layer 2: interactive hash-chain canvas mesh */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full opacity-[0.55] mix-blend-multiply"
      />
      {/* Layer 3: bottom vignette so content below the hero blends down */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
