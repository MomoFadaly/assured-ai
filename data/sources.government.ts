/**
 * Government scenario source declarations.
 *
 * Smaller corpus, mirroring the white paper's reference to CalMatters
 * (a Fueled client) and the broader CA government content shape.
 */

import type { SourceDeclaration } from '@/lib/corpus/types';

export const GOVERNMENT_SOURCES: SourceDeclaration[] = [
  {
    organization: 'White House',
    source_type: 'government',
    url: 'https://www.whitehouse.gov/briefing-room/presidential-actions/',
    title: 'White House — Presidential Actions',
    scenario: 'government',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'Federal Register',
    source_type: 'government',
    url: 'https://www.federalregister.gov/',
    title: 'Federal Register',
    scenario: 'government',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'CalMatters (synthetic excerpt)',
    source_type: 'synthetic',
    url: 'https://demo.assured-ai.local/calmatters/telehealth-coverage-2025',
    title: 'California Telehealth Coverage Expansion (synthetic)',
    scenario: 'government',
    license_notes: 'Synthetic excerpt patterned after public CalMatters coverage; for POC demo only.',
    inline_content: `
California Telehealth Coverage Expansion

In a vote that drew bipartisan support, the California State Assembly approved
legislation expanding telehealth coverage requirements for state-regulated
health plans. The legislation, which builds on temporary measures put in place
during the COVID-19 public health emergency, requires plans to reimburse
telehealth services at parity with in-person visits for a defined set of
clinical encounters.

Key provisions include:
- Payment parity for telehealth visits with primary care, mental health, and
  chronic disease management providers.
- Expansion of audio-only telehealth coverage for patients without reliable
  broadband access, particularly in rural counties.
- A reporting requirement for plans to disclose telehealth utilization
  patterns by demographic group, addressing concerns about equitable access.

Supporters argued that telehealth expansion improved access to care during
the pandemic, particularly for behavioral health services. Opponents
expressed concern about quality of care and program costs, though independent
analyses suggested administrative savings could offset incremental utilization.

The legislation now moves to the State Senate, where committee hearings are
expected to begin within the month.
    `.trim(),
  },
  {
    organization: 'California DMV (synthetic)',
    source_type: 'synthetic',
    url: 'https://demo.assured-ai.local/ca-dmv/license-renewal',
    title: 'CA DMV — Driver License Renewal Requirements (synthetic)',
    scenario: 'government',
    license_notes: 'Synthetic content patterned after public CA DMV materials; for POC demo only.',
    inline_content: `
Driver License Renewal — Eligibility and Requirements

Most California driver licenses can be renewed online, by mail, or in person
at a DMV field office. The available renewal method depends on your age,
license history, and whether your most recent renewal was conducted in person.

Online renewal eligibility:
- You are between 18 and 69 years old.
- You have not been convicted of a serious traffic violation in the past
  two years.
- Your last renewal was conducted in person.
- You have a clean record (no DUI, no uncorrected vision problem on file).

Required documents for in-person renewal:
- Existing California driver license or one acceptable form of identification.
- A second proof of California residency for REAL ID-compliant licenses.
- Payment of the applicable fee. Fees vary by license type.

Vision testing:
- Drivers age 70 and over must take a vision test in person at every renewal.
- Drivers under 70 may be required to test based on their record.

Photographs:
- A new photograph is required at every in-person renewal, regardless of age.
- Photographs are not retaken for online or mail renewals.

Processing time:
- Renewal is typically processed within 21 calendar days. A temporary
  paper license is issued at field offices and is valid for 60 days.
    `.trim(),
  },
];
