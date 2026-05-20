'use client';

/**
 * DamageStack3D — real-time WebGL 3D rendering of the five
 * compounding-damage layers as floating slabs in 3D space.
 *
 * Labels are painted onto each slab using **canvas textures** —
 * meshBasicMaterial.map drawn once at mount with plain Canvas 2D.
 * This avoids drei's <Text> which suspends on font fetch and was
 * blanking the entire scene under <Suspense fallback={null}>.
 *
 * Stack from bottom to top (visible cost → hidden cost):
 *   1. Regulatory enforcement (emerald — the anchor / public floor)
 *   2. Reputation + PR crisis (amber)
 *   3. Litigation cascade (orange)
 *   4. Internal remediation (red)
 *   5. Trust erosion (deep rose — long-tail, permanent)
 *
 * Interaction:
 *   - Drag to orbit (OrbitControls, polar/azimuth clamped)
 *   - Auto-rotates slowly when idle
 *   - Hover a slab or legend row → emissive boost + scale on both
 *   - Each slab bobs subtly out of phase
 */

import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Float } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type LayerDef = {
  key: string;
  yIndex: number; // 0 = bottom, 4 = top
  color: string;
  emissive: string;
  label: string;
  tag: string;
  description: string;
  isAnchor?: boolean;
};

// Bottom to top — emerald floor → escalating warmth → deep rose
const LAYERS: LayerDef[] = [
  {
    key: 'regulatory',
    yIndex: 0,
    color: '#059669',
    emissive: '#053f2e',
    label: 'Regulatory enforcement',
    tag: 'PUBLIC FLOOR',
    description:
      'Fines, untitled letters, sanctions. The poster above. The only layer with a public dollar figure — and the smallest of the five.',
    isAnchor: true,
  },
  {
    key: 'reputation',
    yIndex: 1,
    color: '#d97706',
    emissive: '#5a3001',
    label: 'Reputation + PR crisis',
    tag: '$M – $B',
    description:
      'News cycle picks up. Stock price drops. For public companies, often the largest single-day market-cap hit of the year.',
  },
  {
    key: 'litigation',
    yIndex: 2,
    color: '#ea580c',
    emissive: '#5e2305',
    label: 'Litigation cascade',
    tag: '10–100× FINE',
    description:
      'Class actions and shareholder derivative suits often follow regulatory action. Damages frequently exceed the fine by an order of magnitude.',
  },
  {
    key: 'remediation',
    yIndex: 3,
    color: '#dc2626',
    emissive: '#5e0a0a',
    label: 'Internal remediation',
    tag: '3–5× FINE',
    description:
      'Legal fees, compliance overhaul, consultant fees, retraining, audit-trail rebuild. Routinely 3–5× the original fine.',
  },
  {
    key: 'trust',
    yIndex: 4,
    color: '#a8174a',
    emissive: '#4a0820',
    label: 'Trust erosion',
    tag: 'PERMANENT',
    description:
      'Patient and customer trust takes years to rebuild. Some accounts churn permanently. NPS damage compounds long after the news cycle ends.',
  },
];

// Stack geometry — tuned so every slab's front-face label reads
// clearly from the default camera angle.
const SLAB_W = 5.4;
const SLAB_H = 0.62;
const SLAB_D = 3.0;
const STACK_GAP = 0.32;
const STACK_STEP = SLAB_H + STACK_GAP;

// Canvas texture dimensions (high enough for crisp labels at zoom).
// 4.5:1 aspect roughly matches SLAB_W / SLAB_H — keeps text un-stretched.
const TEX_W = 2048;
const TEX_H = 460;

/**
 * Build a CanvasTexture with the layer label + tag drawn onto it.
 * Called once per slab at mount. The texture is the diffuse map of
 * a thin plane positioned just in front of the slab's front face.
 *
 * No fonts are fetched — we use system-ui which is universally
 * available, so there's no async font loading and no Suspense.
 */
function useLabelTexture(layer: LayerDef): THREE.CanvasTexture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Transparent background — we want the slab color to show through
    ctx.clearRect(0, 0, TEX_W, TEX_H);

    // ---- Main label ----
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font =
      '600 168px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(layer.label, 70, TEX_H / 2 - 30);

    // ---- Tag (mono-cap below the label) ----
    ctx.fillStyle = 'rgba(255,255,255,0.66)';
    ctx.font =
      '500 72px ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace';
    // Approximate letter-spacing via manual character draws so we get
    // the tracked-out feel of a section tag (CSS tracking ≈ 0.18em).
    const tag = layer.tag;
    const trackEm = 0.18;
    const fontSize = 72;
    const tracking = trackEm * fontSize;
    let x = 72;
    const y = TEX_H / 2 + 100;
    for (const ch of tag) {
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width + tracking;
    }

    // ---- Anchor pip on the right side ----
    if (layer.isAnchor) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font =
        '500 64px ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace';
      ctx.textAlign = 'right';
      const anchorTag = '★  ANCHOR';
      let ax = TEX_W - 70;
      // Right-aligned tracked text — draw right-to-left
      const chars = [...anchorTag].reverse();
      const anchorTracking = 0.22 * 64;
      for (const ch of chars) {
        const w = ctx.measureText(ch).width;
        ctx.fillText(ch, ax, TEX_H / 2);
        ax -= w + anchorTracking;
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [layer.label, layer.tag, layer.isAnchor]);
}

function Slab({
  layer,
  isHovered,
  onHover,
  yBase,
}: {
  layer: LayerDef;
  isHovered: boolean;
  onHover: (key: string | null) => void;
  yBase: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const labelTexture = useLabelTexture(layer);

  // Subtle bobbing + hover scale, animated each frame.
  // useFrame in R3F v9 passes (state, delta) — we use performance.now()
  // as a stable time source so this never depends on THREE.Clock/Timer.
  useFrame(() => {
    if (!groupRef.current) return;
    const t = performance.now() * 0.001;
    const phase = layer.yIndex * 0.7;
    const bob = Math.sin(t * 0.6 + phase) * 0.03;
    groupRef.current.position.y = yBase + bob;

    const targetScale = isHovered ? 1.04 : 1.0;
    const current = groupRef.current.scale.x;
    const next = current + (targetScale - current) * 0.1;
    groupRef.current.scale.set(next, next, next);
  });

  // Dispose the texture when the component unmounts to avoid GPU leak
  useEffect(() => {
    return () => {
      labelTexture.dispose();
    };
  }, [labelTexture]);

  return (
    <group ref={groupRef} position={[0, yBase, 0]}>
      {/* Main slab — physically based with hover-driven emissive glow */}
      <mesh
        castShadow
        receiveShadow
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(layer.key);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[SLAB_W, SLAB_H, SLAB_D]} />
        <meshPhysicalMaterial
          color={layer.color}
          metalness={0.25}
          roughness={0.4}
          clearcoat={0.55}
          clearcoatRoughness={0.18}
          emissive={layer.emissive}
          emissiveIntensity={isHovered ? 1.6 : 0.45}
        />
      </mesh>

      {/* Label plane — sits ~0.005 in front of the slab's front face.
          meshBasicMaterial with transparent=true lets the slab color
          show through wherever the canvas is transparent. */}
      <mesh position={[0, 0, SLAB_D / 2 + 0.005]}>
        <planeGeometry args={[SLAB_W, SLAB_H]} />
        <meshBasicMaterial
          map={labelTexture}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Stack({
  hoveredKey,
  setHoveredKey,
}: {
  hoveredKey: string | null;
  setHoveredKey: (k: string | null) => void;
}) {
  const totalHeight = (LAYERS.length - 1) * STACK_STEP;
  const yOffset = -totalHeight / 2;

  return (
    <Float speed={0.4} rotationIntensity={0.05} floatIntensity={0.1}>
      {LAYERS.map((layer) => {
        const yBase = yOffset + layer.yIndex * STACK_STEP;
        return (
          <Slab
            key={layer.key}
            layer={layer}
            yBase={yBase}
            isHovered={hoveredKey === layer.key}
            onHover={setHoveredKey}
          />
        );
      })}
    </Float>
  );
}

export default function DamageStack3D() {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[3fr_2fr] lg:items-center lg:gap-12">
      {/* LEFT — real WebGL 3D scene with labels painted onto each slab */}
      <div
        className="relative"
        style={{
          width: '100%',
          height: '620px',
          background:
            'radial-gradient(ellipse at 50% 65%, rgba(0,0,0,0.06) 0%, transparent 70%)',
        }}
      >
        <Canvas
          shadows
          camera={{ position: [6.5, 1.5, 6.5], fov: 38 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          frameloop="always"
        >
          {/* Lighting — no HDRI (would fetch from CDN and fail offline).
              Directional key + warm rim + cool fill + red underside accent. */}
          <ambientLight intensity={0.45} />
          <directionalLight
            position={[5, 10, 4]}
            intensity={1.6}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={20}
            shadow-camera-left={-9}
            shadow-camera-right={9}
            shadow-camera-top={9}
            shadow-camera-bottom={-9}
          />
          <pointLight position={[-7, 5, -5]} intensity={0.55} color="#ffe0c0" />
          <pointLight position={[7, 3, 6]} intensity={0.45} color="#cdd6f4" />
          <pointLight position={[0, -4, 0]} intensity={0.4} color="#a8174a" />

          <Stack hoveredKey={hoveredKey} setHoveredKey={setHoveredKey} />

          {/* Soft contact shadow under the bottom slab — anchors the
              stack to an implied ground plane. */}
          <ContactShadows
            position={[0, -1.85, 0]}
            opacity={0.55}
            scale={14}
            blur={2.6}
            far={4}
          />

          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
            minAzimuthAngle={-Math.PI / 3}
            maxAzimuthAngle={Math.PI / 3}
            autoRotate
            autoRotateSpeed={0.4}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>

        {/* Subtle "drag to rotate" hint */}
        <div
          style={{
            position: 'absolute',
            bottom: '14px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: '10px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.35)',
            pointerEvents: 'none',
          }}
        >
          Drag to rotate
        </div>
      </div>

      {/* RIGHT — HTML legend with full descriptions. Hover-synced with
          the 3D scene: hovering either side highlights the other. */}
      <div className="space-y-4">
        {[...LAYERS].reverse().map((layer) => {
          const isHovered = hoveredKey === layer.key;
          return (
            <button
              key={layer.key}
              type="button"
              onMouseEnter={() => setHoveredKey(layer.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className="group flex w-full items-start gap-3 rounded-md p-2 text-left transition"
              style={{
                background: isHovered ? 'rgba(0,0,0,0.04)' : 'transparent',
              }}
            >
              <span
                className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full transition"
                style={{
                  background: layer.color,
                  boxShadow: isHovered ? `0 0 0 4px ${layer.color}33` : 'none',
                }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h5 className="text-[14px] font-semibold leading-tight text-foreground">
                    {layer.label}
                  </h5>
                  <span
                    className="font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
                    style={{ color: layer.color }}
                  >
                    {layer.tag}
                  </span>
                  {layer.isAnchor ? (
                    <span className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-emerald-700">
                      ★ Anchor
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[12.5px] leading-[1.5] text-foreground/65">
                  {layer.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
