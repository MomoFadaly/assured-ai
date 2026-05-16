/**
 * Severity calculation for monitor findings.
 *
 * Maps a verification result to a 5-level severity. Tunable here — every
 * threshold lives in one place so we can adjust posture per regulated
 * vertical later (vertical packs in Path C v2 will let healthcare and
 * finance disagree on what "high" means).
 */

import type { VerifyResponse } from '@/lib/verification/lifecycle';

export type MonitorSeverity = 'clean' | 'low' | 'medium' | 'high' | 'critical';

export interface SeverityResult {
  severity: MonitorSeverity;
  summary: string;
  pii_count: number;
  unsourced_count: number;
  supported_count: number;
  disclaimer_missing: boolean;
  red_flag_category: string | null;
}

export function computeSeverity(result: VerifyResponse): SeverityResult {
  // Red-flag block → critical regardless of anything else.
  if (result.kind === 'red_flag_blocked') {
    return {
      severity: 'critical',
      summary: `Emergency content (${result.category}) detected — page must be reviewed.`,
      pii_count: 0,
      unsourced_count: 0,
      supported_count: 0,
      disclaimer_missing: false,
      red_flag_category: result.category,
    };
  }

  if (result.kind === 'kill_switch' || result.kind === 'error') {
    return {
      severity: 'low',
      summary: `Scan could not complete: ${result.kind}`,
      pii_count: 0,
      unsourced_count: 0,
      supported_count: 0,
      disclaimer_missing: false,
      red_flag_category: null,
    };
  }

  // result.kind === 'verified'
  const r = result.report;
  const pii = r.pii_input_count + r.pii_output_count;
  const unsourced = r.unsourced_paragraph_count;
  const supported = r.supported_paragraph_count;
  const disclaimerMissing = r.disclaimer_required && !r.disclaimer_was_present;
  const totalParagraphs = unsourced + supported;

  let severity: MonitorSeverity = 'clean';
  const reasons: string[] = [];

  // PHI/PII detection on a public page is severe by itself.
  if (pii >= 3) {
    severity = 'critical';
    reasons.push(`${pii} PII/PHI leaks`);
  } else if (pii >= 1) {
    severity = 'high';
    reasons.push(`${pii} PII/PHI leak${pii === 1 ? '' : 's'}`);
  }

  // Unsourced ratio escalation.
  if (totalParagraphs > 0) {
    const unsourcedRatio = unsourced / totalParagraphs;
    if (unsourcedRatio >= 0.5 && unsourced >= 3) {
      severity = bump(severity, 'medium');
      reasons.push(`${unsourced}/${totalParagraphs} paragraphs unsourced`);
    } else if (unsourced > 0) {
      severity = bump(severity, 'low');
      reasons.push(`${unsourced} unsourced paragraph${unsourced === 1 ? '' : 's'}`);
    }
  }

  if (disclaimerMissing) {
    severity = bump(severity, 'low');
    reasons.push('missing disclaimer');
  }

  const summary =
    severity === 'clean'
      ? 'Clean — no findings.'
      : reasons.join(' · ');

  return {
    severity,
    summary,
    pii_count: pii,
    unsourced_count: unsourced,
    supported_count: supported,
    disclaimer_missing: disclaimerMissing,
    red_flag_category: null,
  };
}

const ORDER: Record<MonitorSeverity, number> = {
  clean: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function bump(current: MonitorSeverity, candidate: MonitorSeverity): MonitorSeverity {
  return ORDER[candidate] > ORDER[current] ? candidate : current;
}
