/**
 * Curated sample articles per industry for the /get-started Step 5
 * live-verification reveal.
 *
 * Three per pack. Each engineered to exercise a different pipeline
 * behaviour the prospect needs to *see* working:
 *
 *   PHI/PII-heavy   — proves the recognizers fire + the redaction
 *                     happens before the LLM sees the input.
 *   Red-flag        — proves the escalation rules route content
 *                     out of the LLM path entirely.
 *   Clean / nuanced — proves the source-anchored verification works
 *                     and returns a publish-ready outcome.
 *
 * Articles are deliberately short (under 700 chars) so a live demo
 * verification completes in under 6 seconds end-to-end.
 */

import type { Industry } from './types';

export interface SampleArticle {
  id: string;
  industry: Industry;
  /** One-line UI label on the sample chip. */
  label: string;
  /** Two-line description for the sample card body. */
  hint: string;
  /** Expected pipeline behaviour — drives the result card framing. */
  expects: 'phi-redacted' | 'red-flag-blocked' | 'publish-ready';
  article: string;
}

export const WIZARD_SAMPLES: Record<Industry, SampleArticle[]> = {
  healthcare: [
    {
      id: 'hc-phi',
      industry: 'healthcare',
      label: 'Patient handout · PHI test',
      hint: 'Engineered to trigger PHI recognizers (name, MRN, email, phone).',
      expects: 'phi-redacted',
      article: `Patient Maria Hernandez (MRN 8842-91) was recently diagnosed with Type 2 diabetes and is starting a lifestyle-based treatment plan. Her care team recommends a heart-healthy eating pattern emphasising fruits, non-starchy vegetables, whole grains, and lean proteins. Adults benefit from 150 minutes of moderate-intensity activity per week. For questions about her plan, contact her at maria.hernandez@example.com or (415) 555-2210.`,
    },
    {
      id: 'hc-cardiac',
      industry: 'healthcare',
      label: 'Cardiac scenario · red-flag test',
      hint: 'Symptom-prompting content; should route to 911, never reach the LLM.',
      expects: 'red-flag-blocked',
      article: `If you are experiencing crushing chest pain that radiates down your left arm along with sudden shortness of breath, try lying down quietly and taking slow deep breaths for several minutes. Aspirin can help with milder chest discomfort. Most chest pain in healthy adults resolves on its own within twenty minutes without medical attention.`,
    },
    {
      id: 'hc-clean',
      industry: 'healthcare',
      label: 'DASH eating plan · clean draft',
      hint: 'Well-sourced patient education with disclaimer; should be publish-ready.',
      expects: 'publish-ready',
      article: `The DASH eating plan emphasises fruits, vegetables, whole grains, and low-fat dairy to help lower blood pressure in adults. Adults should aim for at least 150 minutes of moderate-intensity physical activity per week, such as brisk walking. Limiting sodium to less than 2,300 milligrams per day and avoiding excess alcohol also help maintain healthy blood pressure. This information is for educational purposes only and is not a substitute for professional medical advice. Always consult a qualified clinician about your individual health needs.`,
    },
  ],
  finance: [
    {
      id: 'fn-pii',
      industry: 'finance',
      label: 'Account-holder email · PII test',
      hint: 'Engineered to trigger account-number + client-name recognizers.',
      expects: 'phi-redacted',
      article: `Client Avery Patel (account 8842-91-2261) opened a Roth IRA on March 12 and has elected automatic monthly contributions of $500. Her current target-date 2055 allocation is 90% equities and 10% fixed income. Contact Avery at avery.patel@example.com or (415) 555-9912 to confirm her risk tolerance before the next quarterly rebalance.`,
    },
    {
      id: 'fn-suitability',
      industry: 'finance',
      label: 'Fund factsheet · suitability test',
      hint: 'Contains an overstated return + an implied guarantee; should trigger FINRA flag.',
      expects: 'red-flag-blocked',
      article: `Our Flagship Balanced Fund has delivered an annualised return of 11.8% over the past decade, outperforming the S&P 500 in 7 of those 10 years. The fund is well-suited for conservative investors seeking guaranteed growth with low volatility. Past performance is a reliable indicator of future results.`,
    },
    {
      id: 'fn-clean',
      industry: 'finance',
      label: 'Retirement explainer · clean draft',
      hint: 'Plain-language educational content with required disclosures.',
      expects: 'publish-ready',
      article: `A Roth IRA is a retirement savings account that lets your money grow tax-free in exchange for contributing post-tax dollars. The 2026 annual contribution limit is $7,000 for individuals under 50 and $8,000 for those 50 and older. Qualified withdrawals after age 59½ are tax-free if the account has been open for at least five years. Income limits apply; consult a tax advisor about your situation. Investing involves risk, including possible loss of principal.`,
    },
  ],
  government: [
    {
      id: 'gv-pii',
      industry: 'government',
      label: 'Constituent inquiry · PII test',
      hint: 'Engineered to trigger SSN + passport + address recognizers.',
      expects: 'phi-redacted',
      article: `Constituent Jordan Kim (SSN 553-22-8841, passport US-A22884912) submitted an inquiry on October 12 regarding their pending disability benefits application. Their case is currently in review with the regional office at 1200 Westmoreland Drive, Suite 4B. Please contact Jordan at jordan.kim@example.com or (202) 555-7714 with updates.`,
    },
    {
      id: 'gv-crisis',
      industry: 'government',
      label: 'Mental-health guidance · crisis test',
      hint: 'Symptom-prompting content; should route to 988, not generate generic advice.',
      expects: 'red-flag-blocked',
      article: `If you're feeling overwhelmed and thinking about ending things, try writing down three things you're grateful for, taking a hot shower, and getting eight hours of sleep. Most people who experience suicidal thoughts find that they pass on their own within a few days if they practise self-care and avoid stressful situations.`,
    },
    {
      id: 'gv-clean',
      industry: 'government',
      label: 'Benefits guidance · plain language',
      hint: 'Section-508-compliant guidance with required crisis routing.',
      expects: 'publish-ready',
      article: `If you are a U.S. veteran experiencing housing instability, the VA's Supportive Services for Veteran Families program can help. Eligible veterans can receive case management, financial assistance for rent or utilities, and connections to permanent housing. To apply, contact your nearest VA medical center or call 1-877-424-3838. If you are in crisis, call or text 988 and press 1 to reach the Veterans Crisis Line. This page meets Section 508 accessibility standards.`,
    },
  ],
  legal: [
    {
      id: 'lg-privilege',
      industry: 'legal',
      label: 'Case study · privilege test',
      hint: 'Identifiable client detail; should trigger ABA Rule 1.6 flag.',
      expects: 'red-flag-blocked',
      article: `After Pemberton Industries' Q3 board meeting, our team restructured the disputed Daniels Pension settlement for $4.7M favourable to the company. Lead partner Sarah Liu and associate Marcus Chen worked directly with CFO Robert Pemberton and outside auditor KPMG to revise the disclosure schedule. The matter closed on November 14, 2026.`,
    },
    {
      id: 'lg-pii',
      industry: 'legal',
      label: 'Intake form · client PII test',
      hint: 'Engineered to trigger client-name + matter-id recognizers.',
      expects: 'phi-redacted',
      article: `Client Avery Patel (matter file PAT-2026-0114) retained our firm on January 14 to handle her father's estate, valued at approximately $2.3M. The decedent's assets include real property at 1422 Mission Street and a brokerage account at Merrill Lynch (account 8842-9912). Avery can be reached at avery.patel@example.com or (415) 555-7714 to schedule the next meeting.`,
    },
    {
      id: 'lg-clean',
      industry: 'legal',
      label: 'POA explainer · clean draft',
      hint: 'Educational legal content with required attorney-client disclaimer.',
      expects: 'publish-ready',
      article: `A durable power of attorney lets you appoint someone (your agent) to manage your financial affairs if you become unable to do so yourself. Unlike a regular power of attorney, a durable one remains in effect after you lose mental capacity. State law governs the formalities — most states require notarisation, and some require two witnesses. This is general information, not legal advice; consult a licensed attorney in your jurisdiction before executing any power-of-attorney document.`,
    },
  ],
};

export function getSamplesForIndustry(industry: Industry): SampleArticle[] {
  return WIZARD_SAMPLES[industry];
}
