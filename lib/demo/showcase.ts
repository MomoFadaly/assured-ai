/**
 * Curated showcase verifications — the demo content that powers:
 *   - the marketing hero "See an example proof" CTA
 *   - the FeaturedArtifacts strip
 *   - the /demo page side-by-side display
 *
 * Each entry is a real article that gets verified through the live
 * pipeline (via scripts/seed-showcase.mjs), producing real audit_log
 * rows the marketing page can link to. Editing this file + redeploying
 * regenerates the showcase verifications idempotently (the script only
 * re-creates a row when the input text changes).
 *
 * The articles are deliberately chosen to look like prose a real
 * publisher would produce — not synthetic test fodder — so prospects
 * see something they recognise as their own workflow.
 */

export type ShowcasePackSlug = 'healthcare' | 'government' | 'finance' | 'legal';

export interface ShowcaseEntry {
  /** Stable id used as the dedup key for the seed script. */
  slug: string;
  pack: ShowcasePackSlug;
  /** Operator-facing title surfaced on the marketing page strip. */
  title: string;
  /** One-line description shown under the title. */
  blurb: string;
  /** What the editor sees on the verifier — drives the "Outcome" badge. */
  expectedKind:
    | 'verified-clean'
    | 'verified-with-warnings'
    | 'verified-blocking'
    | 'red-flag-blocked';
  /** Tone for the marketing card. */
  tone: 'positive' | 'warning' | 'critical';
  article: string;
}

export const SHOWCASE_VERIFICATIONS: ShowcaseEntry[] = [
  // ──────────────────────────────────────────────────────────────────
  // Healthcare
  // ──────────────────────────────────────────────────────────────────
  {
    slug: 'healthcare-phi-leak',
    pack: 'healthcare',
    title: 'PHI leak caught before publish',
    blurb: 'Patient name, MRN, email, and phone — all redacted at the I/O boundary.',
    expectedKind: 'verified-with-warnings',
    tone: 'warning',
    article: `Patient Maria Hernandez (MRN 8842-91) was recently diagnosed with Type 2 diabetes and is starting a lifestyle-based treatment plan. Her care team recommends a heart-healthy eating pattern emphasising fruits, non-starchy vegetables, whole grains, and lean proteins. Most adults benefit from 150 minutes of moderate-intensity physical activity per week such as brisk walking. For questions about her care plan, please contact her at maria.hernandez@example.com or (415) 555-2210.`,
  },
  {
    slug: 'healthcare-cardiac-emergency',
    pack: 'healthcare',
    title: 'Cardiac emergency routed to 911',
    blurb: 'AI bypasses the model entirely and surfaces emergency contacts.',
    expectedKind: 'red-flag-blocked',
    tone: 'critical',
    article: `If you are experiencing crushing chest pain that radiates down your left arm along with sudden shortness of breath, try lying down quietly and taking slow deep breaths for several minutes. Aspirin can help with milder chest discomfort. Most chest pain in healthy adults resolves on its own within twenty minutes without medical attention.`,
  },
  {
    slug: 'healthcare-clean-publish-ready',
    pack: 'healthcare',
    title: 'Clean draft — publish-ready',
    blurb: 'Every paragraph supported, disclaimer present, zero blocking issues.',
    expectedKind: 'verified-clean',
    tone: 'positive',
    article: `The DASH eating plan emphasises fruits, vegetables, whole grains, and low-fat dairy to help lower blood pressure in adults. Adults should aim for at least 150 minutes of moderate-intensity physical activity per week, such as brisk walking. Limiting sodium to less than 2,300 milligrams per day and avoiding excess alcohol also help maintain healthy blood pressure. This information is for educational purposes only and is not a substitute for professional medical advice. Always consult a qualified clinician about your individual health needs.`,
  },

  // ──────────────────────────────────────────────────────────────────
  // Government
  // ──────────────────────────────────────────────────────────────────
  {
    slug: 'government-pii-and-policy',
    pack: 'government',
    title: 'Constituent PII auto-redacted',
    blurb: 'SSN, passport, phone, email — all caught in the I/O passes.',
    expectedKind: 'verified-with-warnings',
    tone: 'warning',
    article: `Constituent Maria Garcia (SSN 412-55-9982, passport 489221773) submitted a request regarding her unemployment insurance claim originally filed on March 14. She can be reached at maria.garcia@example.com or (916) 555-2210 between 9am and 5pm Pacific. Per current state guidance, the appeals window is fifteen business days from the date of the determination letter and may be submitted through the online portal or in person at any field office.`,
  },

  // ──────────────────────────────────────────────────────────────────
  // Finance
  // ──────────────────────────────────────────────────────────────────
  {
    slug: 'finance-fraud-language',
    pack: 'finance',
    title: 'SEC red flags caught before send',
    blurb: '"Guaranteed returns" and "double your money" flagged for compliance.',
    expectedKind: 'red-flag-blocked',
    tone: 'critical',
    article: `Our proprietary algorithmic strategy delivers guaranteed returns of 18-22% annually with zero downside risk. We've identified a market inefficiency that allows us to double your money within 18 months. This is a once-in-a-lifetime opportunity to invest before the announcement next quarter — call us today to lock in your spot before the public filing.`,
  },
  {
    slug: 'finance-clean-explainer',
    pack: 'finance',
    title: 'Investor explainer — compliant',
    blurb: 'Past-performance language present, no recommendation, every claim sourced.',
    expectedKind: 'verified-clean',
    tone: 'positive',
    article: `Index funds are investment vehicles that track a market index, such as the S&P 500, by holding the same securities in the same proportions. They typically charge lower expense ratios than actively-managed funds because they require less day-to-day portfolio management. Over long horizons, lower fees compound into a meaningful difference for the end investor. Past performance is not indicative of future results. This material is for informational purposes only and does not constitute investment advice; consult a qualified financial professional regarding your individual circumstances.`,
  },

  // ──────────────────────────────────────────────────────────────────
  // Legal
  // ──────────────────────────────────────────────────────────────────
  {
    slug: 'legal-clean-poa-explainer',
    pack: 'legal',
    title: 'Consumer legal explainer — compliant',
    blurb: 'Attorney-client disclaimer present, no specific-advice language, jurisdictional caveat noted.',
    expectedKind: 'verified-clean',
    tone: 'positive',
    article: `A power of attorney (POA) is a written authorisation that lets one person — the agent — act on behalf of another — the principal — in legal or financial matters. POAs come in several forms (general, limited, durable, and healthcare) and the specific rules vary by state. The principal may revoke a POA at any time while they have legal capacity to do so. This content is for general informational purposes only and does not constitute legal advice. Reading this material does not create an attorney-client relationship. Consult a qualified attorney about your specific situation.`,
  },
];
