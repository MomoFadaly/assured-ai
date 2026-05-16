/**
 * Home-page verifier demo — engineered sample articles.
 *
 * Each sample is hand-tuned to demonstrably trigger a specific behavior in
 * the live verification lifecycle. They are NOT marketing cherry-picks —
 * the patterns each one matches are real rules in the corresponding pack
 * (`packages/db/004_vertical_packs.sql`):
 *
 *   healthcare-phi   → triggers MEDICAL_RECORD_NUMBER + EMAIL_ADDRESS +
 *                       PHONE_NUMBER + PERSON Presidio recognizers
 *   finance-fraud    → triggers fraud_disclosure red-flag rule
 *                       (`guaranteed return`, `risk-free investment`)
 *   government-snap  → clean plain-language draft — should clear with the
 *                       government disclaimer auto-injected if missing
 *   legal-result     → legal-bio language without ABA disclaimer — should
 *                       inject the canonical "general informational
 *                       purposes only" disclaimer
 *
 * When the user clicks a sample chip, the textarea populates with the
 * `article` string, the industry pill auto-syncs to the sample's `pack`,
 * and the user can edit before running. The demo behavior is the real
 * pipeline, not a script — pasting a sample then editing it produces a
 * different result than pasting the unedited sample.
 */
export interface HomeVerifierSample {
  /** Stable id used in URL params + analytics. */
  id: string;
  /** Pack slug the sample is engineered for. User-overrideable in the UI. */
  pack: 'healthcare' | 'finance' | 'government' | 'legal';
  /** Sector icon name for the chip (matches the SectorTrust component). */
  icon: 'stethoscope' | 'banknote' | 'landmark' | 'scale';
  /** Chip headline (≤24 chars to fit). */
  label: string;
  /** Chip sub-text: what the sample is designed to demonstrate. */
  sub: string;
  /** The actual content that goes into the textarea. */
  article: string;
  /** Brand-accent color for the active chip + result tone. */
  accent: string;
}

export const HOME_VERIFIER_SAMPLES: HomeVerifierSample[] = [
  {
    id: 'healthcare-phi',
    pack: 'healthcare',
    icon: 'stethoscope',
    label: 'Patient handout',
    sub: 'PHI inside — MRN, email, phone',
    accent: '#0d9488',
    article: `Patient Maria Hernandez (MRN 8842-91-44731) was recently diagnosed with Type 2 diabetes and has started a lifestyle-based treatment plan. Her care team recommends a heart-healthy eating pattern emphasising vegetables, whole grains, lean protein, and low-fat dairy.

Adults benefit from at least 150 minutes of moderate-intensity activity each week, such as brisk walking. Limiting sodium to less than 2,300 milligrams per day and avoiding excess alcohol also help maintain healthy blood pressure.

For follow-up questions about her treatment plan, please contact Maria directly at maria.hernandez@example.com or at (415) 555-2210. Her next appointment is scheduled at the cardiology clinic on the third floor of the main hospital.`,
  },
  {
    id: 'finance-fraud',
    pack: 'finance',
    icon: 'banknote',
    label: 'Annuity sell sheet',
    sub: '"Risk-free" + "guaranteed" claims',
    accent: '#1e40af',
    article: `Our new Platinum Income Annuity is a risk-free investment that offers a guaranteed return of 8% per year for the first five years, with no possibility of loss to your principal. Unlike volatile market-linked products, the Platinum Income Annuity lets you double your money over the contract period while sleeping well at night.

Eligible investors aged 50 and over can lock in today's rate by transferring their existing retirement assets. Payments begin within thirty days of contract issue and continue for the contract term selected at purchase.

For a personalised illustration based on your retirement timeline, contact our advisory desk during business hours.`,
  },
  {
    id: 'government-snap',
    pack: 'government',
    icon: 'landmark',
    label: 'SNAP eligibility',
    sub: 'Plain-language citizen guidance',
    accent: '#7c3aed',
    article: `The Supplemental Nutrition Assistance Program (SNAP) helps households with limited income buy groceries. Most adults aged 18 to 59 must register for work, accept a suitable job if offered, and may have time-limited eligibility unless they meet a work or training requirement.

To qualify, your household's gross monthly income generally must be at or below 130 percent of the federal poverty line, and your countable resources (such as bank accounts) must fall under the program's limit. Households that include an elderly or disabled member may follow different rules.

You can apply online through your state's SNAP agency, by mail, or in person at a local office. After you submit your application, an interview will be scheduled. Most decisions are made within 30 days; emergency benefits are available within 7 days for households that qualify for expedited service.

For the most current eligibility rules and dollar limits in your state, contact your local SNAP office or visit your state's official human services website.`,
  },
  {
    id: 'legal-result',
    pack: 'legal',
    icon: 'scale',
    label: 'Firm bio · case result',
    sub: 'Case-result claim · no ABA disclaimer',
    accent: '#b45309',
    article: `Sarah Chen is a senior partner at Chen & Associates LLP, where her practice focuses on commercial litigation and securities defence. Over the past decade she has tried more than forty cases to verdict in state and federal courts, including a recent $14.2 million plaintiff's verdict in a contract dispute and the successful defence of a Fortune 500 financial-services client in a multi-district class action.

Before joining the firm, Sarah served as a law clerk to a federal district judge and as a deputy attorney general focused on consumer-protection enforcement. She speaks regularly at continuing legal education programs on appellate strategy and complex commercial litigation.

Sarah holds her J.D. from a top-ten law school and is admitted to practice in California, New York, and the United States Supreme Court. She lives in San Francisco with her family.`,
  },
];

export function getSampleById(id: string): HomeVerifierSample | undefined {
  return HOME_VERIFIER_SAMPLES.find((s) => s.id === id);
}
