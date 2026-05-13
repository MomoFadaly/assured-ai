/**
 * Disclaimer detection and auto-injection.
 *
 * Healthcare publishers must include a "not a substitute for professional
 * medical advice" line on patient-facing content. Government publishers
 * have a softer norm but a similar pattern.
 *
 * This module:
 *   - Detects whether the article already contains a disclaimer
 *     matching the scenario.
 *   - If absent, returns the canonical disclaimer to be appended.
 *
 * The detection is regex-based on a few signature phrases — not a perfect
 * NLP match, but reliable enough that we don't double-add a disclaimer
 * when the writer already wrote one in their own words.
 */

import type { Scenario } from '@/lib/db/types';

export interface DisclaimerResult {
  scenario: Scenario;
  required: boolean;
  present: boolean;
  /** The canonical disclaimer text. Append to the article if `present` is false. */
  canonical: string;
}

const HEALTHCARE_DISCLAIMER =
  'This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified clinician about your individual health needs.';

const GOVERNMENT_DISCLAIMER =
  'This information is provided for general reference. Policies and procedures may change; consult the official source for the most current information before making decisions.';

const HEALTHCARE_SIGNATURE_PHRASES = [
  /not\s+a?\s*substitute\s+for\s+(professional\s+)?(medical|clinical)\s+(advice|guidance)/i,
  /consult\s+(a\s+|your\s+)?(qualified\s+)?(clinician|doctor|health\s*care\s*provider|physician)/i,
  /educational\s+purposes\s+only/i,
  /is\s+not\s+intended\s+to\s+(replace|substitute)/i,
];

const GOVERNMENT_SIGNATURE_PHRASES = [
  /consult\s+(the\s+)?official\s+(source|website|guidance)/i,
  /policies\s+and\s+procedures\s+may\s+change/i,
  /for\s+(general|informational)\s+(reference|purposes)/i,
];

export function checkDisclaimer(article: string, scenario: Scenario): DisclaimerResult {
  const phrases =
    scenario === 'healthcare' ? HEALTHCARE_SIGNATURE_PHRASES : GOVERNMENT_SIGNATURE_PHRASES;

  const present = phrases.some((p) => p.test(article));

  return {
    scenario,
    required: true,
    present,
    canonical: scenario === 'healthcare' ? HEALTHCARE_DISCLAIMER : GOVERNMENT_DISCLAIMER,
  };
}

/**
 * Append the canonical disclaimer to the article if not already present.
 * Returns the (possibly modified) article and a boolean indicating whether
 * an injection happened.
 */
export function ensureDisclaimer(
  article: string,
  scenario: Scenario,
): { article: string; injected: boolean } {
  const check = checkDisclaimer(article, scenario);
  if (check.present) {
    return { article, injected: false };
  }
  return { article: `${article.trim()}\n\n${check.canonical}`, injected: true };
}
