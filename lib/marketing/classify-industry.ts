/**
 * Industry auto-detection for the home-page verifier demo.
 *
 * Two-tier classifier:
 *
 *   1. Heuristic n-gram scorer — instant, free. Scores each of the four
 *      regulated packs by counting characteristic-vocabulary hits in the
 *      pasted text (weighted by term specificity). If the leader's score
 *      is meaningfully above the runner-up, we trust it.
 *
 *   2. Reserved Haiku fallback — disabled by default in this build. The
 *      heuristic hit-rate on engineered samples + most real submissions
 *      is high enough that the latency + cost of a model call isn't
 *      justified for the demo surface. When the heuristic returns
 *      `confidence: 'low'`, the UI falls back to letting the user pick.
 *
 * The output shape is deliberately *plural* — we return both the winner
 * and the runner-up so the UI can render an "X (62%) · Y (38%) — pick
 * one" disambiguation chip for genuinely cross-vertical content (e.g.
 * "financial planning for diabetics").
 */
export type IndustrySlug = 'healthcare' | 'finance' | 'government' | 'legal';

export interface IndustryScore {
  industry: IndustrySlug;
  score: number;
  percent: number;
}

export interface ClassifyResult {
  /** Best guess. `null` when no industry exceeds the noise floor. */
  primary: IndustrySlug | null;
  /** Runner-up when both the leader and runner-up exceed the noise floor. */
  alternate: IndustrySlug | null;
  /**
   * 'high'   — clear winner (margin ≥ 15 pts)
   * 'medium' — winner is plausible (margin ≥ 5 pts)
   * 'low'    — too close to call; UI shows pick-one chip-group or asks
   */
  confidence: 'high' | 'medium' | 'low';
  /** Full per-industry score breakdown for the UI. */
  scores: IndustryScore[];
}

/**
 * Vocabulary by industry. Each entry has:
 *   - terms[]: case-insensitive substrings that count toward this industry
 *   - weight: how distinctive each match is. Generic terms ("patient",
 *     "client") weight 1; vertical-anchoring terms ("HIPAA", "MRN",
 *     "FOIA", "ABA Model Rule") weight 3-5.
 *
 * Tuned against the 4 engineered samples + ~20 sanity-check pieces in
 * the verifier scratch corpus. Don't ship without re-running the sanity
 * harness — the heuristic is brittle by design (an LLM would be more
 * robust but is overkill for the demo surface).
 */
const VOCAB: Record<IndustrySlug, Array<{ term: string; weight: number }>> = {
  healthcare: [
    { term: 'patient', weight: 2 },
    { term: 'clinician', weight: 3 },
    { term: 'diagnos', weight: 3 },
    { term: 'mrn', weight: 5 },
    { term: 'medical record', weight: 4 },
    { term: 'hipaa', weight: 5 },
    { term: 'phi ', weight: 4 },
    { term: 'phi.', weight: 4 },
    { term: 'protected health', weight: 5 },
    { term: 'treatment plan', weight: 3 },
    { term: 'cardiology', weight: 3 },
    { term: 'diabetes', weight: 3 },
    { term: 'blood pressure', weight: 2 },
    { term: 'milligram', weight: 2 },
    { term: 'mg/dl', weight: 4 },
    { term: 'prescription', weight: 3 },
    { term: 'physician', weight: 3 },
    { term: 'nurse', weight: 2 },
    { term: 'hospital', weight: 2 },
    { term: 'clinic', weight: 2 },
    { term: 'symptom', weight: 2 },
    { term: 'medication', weight: 3 },
    { term: 'dosage', weight: 3 },
    { term: 'health plan', weight: 3 },
    { term: 'payer', weight: 3 },
    { term: 'cms', weight: 3 },
    { term: 'fda', weight: 3 },
    { term: 'pharma', weight: 3 },
  ],
  finance: [
    { term: 'sec ', weight: 4 },
    { term: 'finra', weight: 5 },
    { term: 'sarbanes', weight: 5 },
    { term: 'pci-dss', weight: 4 },
    { term: 'investor', weight: 3 },
    { term: 'investment', weight: 2 },
    { term: 'portfolio', weight: 3 },
    { term: 'annuity', weight: 4 },
    { term: 'fund', weight: 2 },
    { term: 'fund factsheet', weight: 5 },
    { term: 'prospectus', weight: 5 },
    { term: 'security', weight: 1 },
    { term: 'securities', weight: 3 },
    { term: 'risk-free', weight: 3 },
    { term: 'guaranteed return', weight: 4 },
    { term: 'guaranteed', weight: 2 },
    { term: 'broker', weight: 3 },
    { term: 'dealer', weight: 2 },
    { term: 'advisor', weight: 2 },
    { term: 'advisory', weight: 2 },
    { term: 'mutual fund', weight: 4 },
    { term: 'etf', weight: 3 },
    { term: 'retirement', weight: 2 },
    { term: '401(k)', weight: 4 },
    { term: 'ira', weight: 2 },
    { term: 'past performance', weight: 4 },
    { term: 'risk disclosure', weight: 4 },
    { term: 'principal', weight: 2 },
    { term: 'yield', weight: 2 },
    { term: 'interest rate', weight: 2 },
    { term: 'compliance review', weight: 2 },
    { term: 'market', weight: 1 },
  ],
  government: [
    { term: 'fedramp', weight: 5 },
    { term: 'section 508', weight: 5 },
    { term: '§ 508', weight: 5 },
    { term: 'foia', weight: 5 },
    { term: 'plain writing act', weight: 4 },
    { term: 'plain language', weight: 3 },
    { term: 'citizen', weight: 3 },
    { term: 'public assistance', weight: 3 },
    { term: 'eligibility', weight: 3 },
    { term: 'federal poverty', weight: 4 },
    { term: 'state agency', weight: 3 },
    { term: 'snap', weight: 4 },
    { term: 'medicaid', weight: 3 },
    { term: 'medicare', weight: 3 },
    { term: 'social security', weight: 3 },
    { term: 'unemployment insurance', weight: 4 },
    { term: 'department of', weight: 2 },
    { term: 'agency', weight: 2 },
    { term: 'public benefit', weight: 3 },
    { term: 'application', weight: 1 },
    { term: 'enroll', weight: 1 },
    { term: 'policy', weight: 1 },
    { term: 'regulation', weight: 2 },
    { term: 'statutory', weight: 3 },
    { term: 'federal law', weight: 2 },
    { term: 'state law', weight: 2 },
    { term: 'municipal', weight: 3 },
    { term: 'county', weight: 1 },
    { term: 'taxpayer', weight: 3 },
    { term: 'official source', weight: 3 },
  ],
  legal: [
    { term: 'aba model rule', weight: 5 },
    { term: 'attorney-client', weight: 5 },
    { term: 'attorney client', weight: 5 },
    { term: 'attorney', weight: 3 },
    { term: 'counsel', weight: 2 },
    { term: 'litigation', weight: 4 },
    { term: 'plaintiff', weight: 4 },
    { term: 'defendant', weight: 4 },
    { term: 'verdict', weight: 4 },
    { term: 'settlement', weight: 3 },
    { term: 'class action', weight: 4 },
    { term: 'appellate', weight: 4 },
    { term: 'firm', weight: 1 },
    { term: 'llp', weight: 3 },
    { term: 'p.c.', weight: 3 },
    { term: 'pllc', weight: 3 },
    { term: 'j.d.', weight: 4 },
    { term: 'jd ', weight: 3 },
    { term: 'bar admission', weight: 4 },
    { term: 'admitted to practice', weight: 5 },
    { term: 'federal court', weight: 3 },
    { term: 'district court', weight: 3 },
    { term: 'supreme court', weight: 3 },
    { term: 'judge', weight: 2 },
    { term: 'law clerk', weight: 4 },
    { term: 'general counsel', weight: 3 },
    { term: 'privilege', weight: 3 },
    { term: 'privileged', weight: 4 },
    { term: 'confidentiality', weight: 2 },
    { term: 'jurisdiction', weight: 3 },
    { term: 'cle ', weight: 3 },
    { term: 'continuing legal education', weight: 5 },
    { term: 'partner', weight: 1 },
  ],
};

const NOISE_FLOOR = 4; // minimum raw score to be considered detected
const HIGH_MARGIN = 15;
const MEDIUM_MARGIN = 5;

/**
 * Pure, synchronous, instant. Pass the textarea contents; get back a
 * classification you can render as a pill. Empty input returns
 * `{ primary: null, ... }` — UI should show nothing (don't render
 * "Couldn't detect" for an empty box).
 */
export function classifyIndustry(text: string): ClassifyResult {
  const haystack = text.toLowerCase();
  if (haystack.trim().length < 40) {
    return { primary: null, alternate: null, confidence: 'low', scores: [] };
  }

  const rawScores: Record<IndustrySlug, number> = {
    healthcare: 0,
    finance: 0,
    government: 0,
    legal: 0,
  };

  for (const [industry, terms] of Object.entries(VOCAB) as Array<
    [IndustrySlug, typeof VOCAB.healthcare]
  >) {
    for (const { term, weight } of terms) {
      // Count occurrences (capped at 3 per term so a spammy article that
      // says "patient" 40 times doesn't crowd out a single "FOIA").
      let idx = 0;
      let hits = 0;
      while ((idx = haystack.indexOf(term, idx)) !== -1 && hits < 3) {
        hits += 1;
        idx += term.length;
      }
      rawScores[industry] += hits * weight;
    }
  }

  const total = Object.values(rawScores).reduce((a, b) => a + b, 0) || 1;
  const scores: IndustryScore[] = (Object.keys(rawScores) as IndustrySlug[])
    .map((industry) => ({
      industry,
      score: rawScores[industry],
      percent: Math.round((rawScores[industry] / total) * 100),
    }))
    .sort((a, b) => b.score - a.score);

  const [first, second] = scores;
  if (!first || first.score < NOISE_FLOOR) {
    return { primary: null, alternate: null, confidence: 'low', scores };
  }

  const margin = first.score - (second?.score ?? 0);
  const confidence: ClassifyResult['confidence'] =
    margin >= HIGH_MARGIN ? 'high' : margin >= MEDIUM_MARGIN ? 'medium' : 'low';

  return {
    primary: first.industry,
    alternate:
      confidence === 'low' && second && second.score >= NOISE_FLOOR ? second.industry : null,
    confidence,
    scores,
  };
}
