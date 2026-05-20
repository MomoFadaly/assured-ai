/**
 * Type primitives — the only sanctioned text components for /business.
 *
 * Components MUST use these instead of raw `text-[Npx]` Tailwind. Any
 * inline `text-[…px]` in the codebase outside this file or tokens.ts is
 * a code-review failure per feedback_visual_work_quality_gate.md.
 *
 * Each primitive consumes a token from tokens.ts. Color is contextual,
 * passed via the optional `tone` prop or `className` override.
 *
 *   <Eyebrow>02 · the stakes</Eyebrow>
 *   <H2>Who buys, and what they buy.</H2>
 *   <Lede>Veeva and OneTrust both crossed $5B in value …</Lede>
 *   <Body>A few notes on why I think this is worth building inside Fueled…</Body>
 *   <BodySm muted>Footnote-style note.</BodySm>
 *   <Caption>Photo: HHS · OCR enforcement bulletins, 2024.</Caption>
 */

import type { ElementType, ReactNode, ComponentPropsWithoutRef } from 'react';
import { type } from './tokens';

type Tone = 'ink' | 'muted' | 'soft' | 'faint' | 'onDark' | 'onDarkMuted' | 'accent' | 'future';

const toneClass: Record<Tone, string> = {
  ink: 'text-foreground',
  muted: 'text-foreground/75',
  soft: 'text-foreground/60',
  faint: 'text-muted-foreground',
  onDark: 'text-white',
  onDarkMuted: 'text-white/75',
  accent: 'text-emerald-700',
  future: 'text-indigo-800',
};

/* ──────────────────────────────────────────────────────────────────────
   Helper: build a primitive with token + tone + polymorphic `as`.
   ─────────────────────────────────────────────────────────────────── */

type BaseProps<T extends ElementType> = {
  children: ReactNode;
  className?: string;
  tone?: Tone;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, 'children' | 'className'>;

function makePrimitive(token: string, defaultTone: Tone, defaultAs: ElementType) {
  return function Primitive<T extends ElementType = typeof defaultAs>({
    children,
    className = '',
    tone = defaultTone,
    as,
    ...rest
  }: BaseProps<T>) {
    const Tag = (as ?? defaultAs) as ElementType;
    return (
      <Tag className={`${token} ${toneClass[tone]} ${className}`} {...rest}>
        {children}
      </Tag>
    );
  };
}

/* ──────────────────────────────────────────────────────────────────────
   The 8 primitives. Each maps 1:1 to a token in tokens.ts.
   ─────────────────────────────────────────────────────────────────── */

/** 11px mono caps — footnote labels. Use sparingly. */
export const EyebrowSm = makePrimitive(type.eyebrowSm, 'faint', 'div');

/** 12px mono caps — standard section/card eyebrow. */
export const Eyebrow = makePrimitive(type.eyebrow, 'faint', 'div');

/** 14px sans — captions, table sub-text, citation strips. */
export const Caption = makePrimitive(type.caption, 'soft', 'p');

/** 15px sans — sidebar text, dense table rows, supporting paragraphs. */
export const BodySm = makePrimitive(type.bodySm, 'muted', 'p');

/** 17px sans — primary body. Every paragraph of editorial prose. */
export const Body = makePrimitive(type.body, 'ink', 'p');

/** 20px serif — ledes, opening paragraphs, body callouts. */
export const Lede = makePrimitive(type.lede, 'ink', 'p');

/** 22px display — card titles, sub-section titles, table headers. */
export const H3 = makePrimitive(type.h3, 'ink', 'h3');

/** clamp(40,5vw,64) display — section titles. */
export const H2 = makePrimitive(type.h2, 'ink', 'h2');

/** clamp(64,9vw,120) display — hero only. One per page. */
export const H1 = makePrimitive(type.h1, 'ink', 'h1');
