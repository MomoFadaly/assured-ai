'use client';

/**
 * IcebergCompoundingDamage — the iceberg metaphor for §01, with a
 * coordinated hover-orchestration system across all five annotation
 * labels.
 *
 * Resting state is a static photographic exhibit (screenshot-able).
 * On hover, the design comes alive:
 *
 *   • The hovered label scales gently (1.04) and its backplate becomes
 *     more opaque, reading as "lifted forward"
 *   • A 1–2 sentence description fades in below the main label
 *   • Its connector line strokes brighter and its iceberg-edge dot
 *     blooms outward with a halo ring
 *   • All four non-hovered labels dim to ~45% opacity — focus the eye
 *
 * The orchestration is owned by the parent so motion is coordinated,
 * not five disconnected hovers competing. All transitions use a single
 * easing curve and timing scale so the system feels designed.
 *
 * Imagery is fal-ai/flux-pro/v1.1-ultra. Generated 2026-05-19 via
 * scripts/generate-iceberg.mjs. Prompts + seeds saved alongside each
 * image as <slot>.meta.json.
 */

import Image from 'next/image';
import { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────
// Motion system — single source of truth so every layer animates on the
// same timing/easing.  Keeps the orchestration coherent.
// ─────────────────────────────────────────────────────────────────────────
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // gentle ease-out
const T_LABEL = '260ms'; // scale, opacity, backplate
const T_DESC = '320ms'; // description fade + max-height grow
const T_SVG = '220ms'; // connector + dot

// ─────────────────────────────────────────────────────────────────────────
// Annotation data
//
// `depthPct` is the vertical position of the label's anchor point along
// the iceberg, measured top-to-bottom of the image. The hero photograph
// has the waterline at ~28% and the iceberg base at ~92%. Depths below
// were chosen so each label sits over a visually distinct region of the
// underwater bulk while leaving the iceberg silhouette uncovered.
//
// Descriptions are metaphorical — they describe the *kind* of damage,
// not specific dollar figures. The brief argues from shape, not from
// numbers the regulator hasn't published.
// ─────────────────────────────────────────────────────────────────────────
type Annotation = {
  key: string;
  depthPct: number; // 0 = top of image, 100 = bottom
  side: 'left' | 'right';
  eyebrow: string;
  label: string;
  description: string;
  isAnchor?: boolean;
};

const ANNOTATIONS: Annotation[] = [
  {
    key: 'fine',
    depthPct: 14,
    side: 'left',
    eyebrow: 'Above the waterline',
    label: 'The fine.',
    description:
      'The number on the regulator’s letterhead. The only one with a public dollar figure — and almost always the smallest of the five.',
    isAnchor: true,
  },
  {
    key: 'reputation',
    depthPct: 32,
    side: 'right',
    eyebrow: 'Just below',
    label: 'Reputation damage.',
    description:
      'The news cycle picks it up. The stock reacts the same day. Briefly the company becomes a verb in trade press — and then a cautionary tale forever after.',
  },
  {
    key: 'litigation',
    depthPct: 48,
    side: 'left',
    eyebrow: 'Deeper',
    label: 'Litigation cascade.',
    description:
      'Class-action and shareholder-derivative suits follow regulatory action as a matter of course. Damages routinely dwarf the original fine.',
  },
  {
    key: 'remediation',
    depthPct: 65,
    side: 'right',
    eyebrow: 'Deeper still',
    label: 'Internal remediation.',
    description:
      'Audit, retraining, compliance overhaul, consultant fees, audit-trail rebuilds. Slow, quiet, and almost always several times the fine itself.',
  },
  {
    key: 'trust',
    depthPct: 82,
    side: 'left',
    eyebrow: 'At the base',
    label: 'Trust erosion.',
    description:
      'Patient and customer confidence takes years to rebuild. Some accounts churn permanently. The compounding cost no spreadsheet ever fully captures.',
  },
];

export default function IcebergCompoundingDamage() {
  // Single source of truth — null when no label is hovered, the key of
  // the hovered label otherwise. Drives the entire coordinated motion
  // system: label scale, backplate, description, connector, dot, and
  // dimming of the other labels.
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const isAnyHovered = hoveredKey !== null;

  return (
    <figure className="relative">
      <div
        className="relative w-full overflow-hidden rounded-lg bg-[#0a1622] shadow-[0_10px_60px_-20px_rgba(8,18,30,0.45)]"
        onMouseLeave={() => setHoveredKey(null)}
      >
          <Image
            src="/iceberg/hero.jpg"
            alt="A cinematic iceberg photographed in cross-section, with a small peak above the cold ocean's waterline and an enormous luminous teal-blue mass extending deep below — the metaphor for compounding regulatory damage."
            width={1376}
            height={768}
            priority={false}
            sizes="(max-width: 1024px) 100vw, 1080px"
            className="block h-auto w-full"
          />

          {/* Subtle vignette over the image that intensifies a touch
              while any label is hovered — adds focal weight. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(10,22,34,0) 30%, rgba(10,22,34,0.18) 100%)',
              opacity: isAnyHovered ? 1 : 0,
              transition: `opacity ${T_LABEL} ${EASE}`,
            }}
          />

          {/* Waterline rule + label. Stays visible at full strength
              regardless of hover state — it's diagrammatic, not
              annotation. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0"
            style={{
              top: '28%',
              borderTop: '1px solid rgba(255,255,255,0.45)',
              boxShadow: '0 1px 0 rgba(0,0,0,0.15)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              top: 'calc(28% - 11px)',
              left: '24px',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: '10px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.75)',
              padding: '3px 7px',
              background: 'rgba(10,22,34,0.55)',
              backdropFilter: 'blur(4px)',
              borderRadius: '2px',
            }}
          >
            Waterline · what the public sees
          </div>

          {/* Annotations */}
          {ANNOTATIONS.map((a) => (
            <AnnotationLabel
              key={a.key}
              annotation={a}
              isHovered={hoveredKey === a.key}
              isAnyHovered={isAnyHovered}
              onHoverChange={(hovering) =>
                setHoveredKey(hovering ? a.key : null)
              }
            />
        ))}
      </div>
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AnnotationLabel — single annotation pair (SVG connector + HTML tag).
//
// Renders both its own SVG dot/line/halo AND the HTML label tag with the
// expandable description. All visual state is derived from `isHovered`
// and `isAnyHovered` so the parent owns the orchestration.
// ─────────────────────────────────────────────────────────────────────────
function AnnotationLabel({
  annotation,
  isHovered,
  isAnyHovered,
  onHoverChange,
}: {
  annotation: Annotation;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHoverChange: (hovering: boolean) => void;
}) {
  const { depthPct, side, eyebrow, label, description, isAnchor } = annotation;

  // Iceberg-edge geometry — approximate the silhouette as a triangle
  // narrowing from ~30%/~70% at the waterline (28% depth) to ~50% at
  // the base (92% depth).
  const t = Math.max(0, Math.min(1, (depthPct - 28) / (92 - 28)));
  const isTip = depthPct < 28;
  const TIP_X = 50;
  const TIP_Y = 10;
  const dotLeftPct = isTip
    ? TIP_X
    : side === 'left'
    ? 30 + t * 20
    : 70 - t * 20;
  const dotTopPct = isTip ? TIP_Y : depthPct;

  // Dimming — when ANY label is hovered but THIS one isn't, dim to
  // 50%. When nothing is hovered, full opacity. When this one is
  // hovered, full opacity (and the scale animation kicks in).
  const labelOpacity = !isAnyHovered ? 1 : isHovered ? 1 : 0.45;
  const svgOpacity = !isAnyHovered ? 1 : isHovered ? 1 : 0.3;

  // Anchor position — for the tip the label sits at upper-left of the
  // image and connects diagonally to the peak. For underwater labels
  // the label hugs the outer edge.
  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${depthPct}%`,
    transform: 'translateY(-50%)',
    opacity: labelOpacity,
    transition: `opacity ${T_LABEL} ${EASE}, transform ${T_LABEL} ${EASE}`,
    zIndex: isHovered ? 20 : 10,
  };
  if (isTip) {
    labelStyle.left = '24px';
    labelStyle.maxWidth = '320px';
  } else if (side === 'left') {
    labelStyle.left = '24px';
    labelStyle.maxWidth = `calc(${dotLeftPct}% - 40px)`;
  } else {
    labelStyle.right = '24px';
    labelStyle.maxWidth = `calc(${100 - dotLeftPct}% - 40px)`;
  }

  return (
    <>
      {/* Connector + dot + halo — all in SVG, painted in viewport %
          coordinates so they scale with the image. Single SVG per
          label keeps each annotation self-contained. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        style={{
          opacity: svgOpacity,
          transition: `opacity ${T_SVG} ${EASE}`,
        }}
      >
        {isTip ? (
          <line
            x1={16}
            y1={depthPct}
            x2={dotLeftPct}
            y2={dotTopPct}
            stroke={isHovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)'}
            strokeWidth="0.15"
            vectorEffect="non-scaling-stroke"
            style={
              {
                strokeWidth: isHovered ? '1.5px' : '1px',
                transition: `stroke ${T_SVG} ${EASE}, stroke-width ${T_SVG} ${EASE}`,
              } as React.CSSProperties
            }
          />
        ) : (
          <line
            x1={side === 'left' ? 5 : 95}
            y1={depthPct}
            x2={dotLeftPct}
            y2={depthPct}
            stroke={isHovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)'}
            strokeWidth="0.15"
            vectorEffect="non-scaling-stroke"
            style={
              {
                strokeWidth: isHovered ? '1.5px' : '1px',
                transition: `stroke ${T_SVG} ${EASE}, stroke-width ${T_SVG} ${EASE}`,
              } as React.CSSProperties
            }
          />
        )}

        {/* Halo ring — appears around the dot on hover. For the tip
            it's permanent (a visual anchor); for others, hover only. */}
        {(isTip || isHovered) && (
          <circle
            cx={dotLeftPct}
            cy={dotTopPct}
            r={isHovered ? 2.4 : 1.6}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="0.12"
            vectorEffect="non-scaling-stroke"
            style={
              {
                strokeWidth: '1px',
                transition: `r ${T_SVG} ${EASE}`,
              } as React.CSSProperties
            }
          />
        )}

        {/* Inner dot — slightly larger on hover. */}
        <circle
          cx={dotLeftPct}
          cy={dotTopPct}
          r={isHovered ? 1.1 : isTip ? 0.7 : 0.5}
          fill="rgba(255,255,255,0.98)"
          style={
            {
              transition: `r ${T_SVG} ${EASE}`,
            } as React.CSSProperties
          }
        />
      </svg>

      {/* HTML label tag — hoverable target. The wrapper owns the hover
          handlers; the inner card scales gently on hover and reveals
          the description in a smooth grid-row expansion. */}
      <div
        style={labelStyle}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        onFocus={() => onHoverChange(true)}
        onBlur={() => onHoverChange(false)}
        tabIndex={0}
        role="button"
        aria-label={`${eyebrow}: ${label}`}
      >
        <div
          style={{
            background: isHovered
              ? 'rgba(10,22,34,0.88)'
              : 'rgba(10,22,34,0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '8px 14px 10px',
            borderRadius: '4px',
            borderLeft: isAnchor
              ? `${isHovered ? 3 : 2}px solid rgba(255,255,255,0.92)`
              : `${isHovered ? 2 : 1}px solid rgba(255,255,255,${
                  isHovered ? 0.5 : 0.25
                })`,
            transform: isHovered ? 'scale(1.045)' : 'scale(1)',
            transformOrigin:
              isTip || side === 'left' ? 'left center' : 'right center',
            boxShadow: isHovered
              ? '0 12px 32px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)'
              : '0 4px 16px -8px rgba(0,0,0,0.25)',
            transition: `background ${T_LABEL} ${EASE}, border-left-color ${T_LABEL} ${EASE}, border-left-width ${T_LABEL} ${EASE}, transform ${T_LABEL} ${EASE}, box-shadow ${T_LABEL} ${EASE}`,
            cursor: 'default',
          }}
        >
          <p
            className="font-mono"
            style={{
              fontSize: '9px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: isHovered
                ? 'rgba(255,255,255,0.78)'
                : 'rgba(255,255,255,0.6)',
              margin: 0,
              transition: `color ${T_LABEL} ${EASE}`,
            }}
          >
            {eyebrow}
          </p>
          <p
            className="font-display italic"
            style={{
              fontSize: 'clamp(0.95rem, 1.15vw, 1.1rem)',
              lineHeight: 1.2,
              color: 'rgba(255,255,255,0.97)',
              margin: '2px 0 0',
              fontVariationSettings: '"opsz" 36, "SOFT" 50',
            }}
          >
            {label}
          </p>

          {/* Description — collapsed by default, expands on hover.
              Uses grid-template-rows trick for a natural-height
              animation that respects the actual text height. */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: isHovered ? '1fr' : '0fr',
              opacity: isHovered ? 1 : 0,
              transition: `grid-template-rows ${T_DESC} ${EASE}, opacity ${T_DESC} ${EASE}`,
            }}
          >
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                  maxWidth: '34ch',
                }}
              >
                <p
                  className="font-display"
                  style={{
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                    color: 'rgba(255,255,255,0.82)',
                    margin: 0,
                    fontVariationSettings: '"opsz" 24, "SOFT" 80',
                  }}
                >
                  {description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
