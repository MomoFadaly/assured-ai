/**
 * Disclaimer detection and auto-injection — pack-aware.
 *
 * Each vertical pack defines:
 *   - The canonical disclaimer text to inject when missing
 *   - A list of detection regex patterns (so writers who phrased their own
 *     disclaimer differently aren't double-stamped)
 *
 * Patterns are compiled per-call (cheap; cached by pack updated_at in the
 * registry layer). Callers pass the resolved `VerticalPackRow`.
 */

import type { VerticalPackRow } from '@/lib/packs/types';

export interface DisclaimerResult {
  required: boolean;
  present: boolean;
  /** The canonical disclaimer text — append when `present` is false. */
  canonical: string;
}

export function checkDisclaimer(article: string, pack: VerticalPackRow): DisclaimerResult {
  const patterns = pack.config.disclaimer.detection_patterns
    .map((p) => safeRegex(p))
    .filter((r): r is RegExp => r !== null);

  const present = patterns.some((p) => p.test(article));

  return {
    required: true,
    present,
    canonical: pack.config.disclaimer.canonical,
  };
}

/**
 * Append the canonical disclaimer to the article if not already present.
 * Returns the (possibly modified) article and a boolean indicating whether
 * an injection happened.
 */
export function ensureDisclaimer(
  article: string,
  pack: VerticalPackRow,
): { article: string; injected: boolean } {
  const check = checkDisclaimer(article, pack);
  if (check.present) {
    return { article, injected: false };
  }
  return { article: `${article.trim()}\n\n${check.canonical}`, injected: true };
}

function safeRegex(source: string): RegExp | null {
  try {
    return new RegExp(source, 'i');
  } catch {
    return null;
  }
}
