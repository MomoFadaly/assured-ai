/**
 * Healthcare source declarations.
 *
 * The companion human-readable index is in docs/SOURCE_LIST.md.
 * This file is the machine-readable source of truth used by the ingestion CLI.
 */

import type { SourceDeclaration } from '@/lib/corpus/types';

export const HEALTHCARE_SOURCES: SourceDeclaration[] = [
  // ============================================================
  // CDC (US government, public domain)
  // ============================================================
  {
    organization: 'CDC',
    source_type: 'government',
    url: 'https://www.cdc.gov/diabetes/living-with/index.html',
    title: 'Living With Diabetes',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain (17 U.S.C. § 105).',
  },
  {
    organization: 'CDC',
    source_type: 'government',
    url: 'https://www.cdc.gov/diabetes/healthy-eating/index.html',
    title: 'Diabetes and Healthy Eating',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'CDC',
    source_type: 'government',
    url: 'https://www.cdc.gov/high-blood-pressure/about/index.html',
    title: 'About High Blood Pressure',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'CDC',
    source_type: 'government',
    url: 'https://www.cdc.gov/high-blood-pressure/prevention/index.html',
    title: 'Preventing High Blood Pressure',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'CDC',
    source_type: 'government',
    url: 'https://www.cdc.gov/mental-health/',
    title: 'Mental Health Information for the Public',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'CDC',
    source_type: 'government',
    url: 'https://www.cdc.gov/howrightnow/',
    title: 'How Right Now — Coping Strategies',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'CDC',
    source_type: 'government',
    url: 'https://www.cdc.gov/heart-disease/prevention/index.html',
    title: 'Preventing Heart Disease',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  // ============================================================
  // FDA (US government, public domain)
  // ============================================================
  {
    organization: 'FDA',
    source_type: 'government',
    url: 'https://www.fda.gov/consumers/consumer-updates',
    title: 'FDA Consumer Updates',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'FDA',
    source_type: 'government',
    url: 'https://www.fda.gov/food/dietary-supplements',
    title: 'Dietary Supplements — Information for Consumers',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  // ============================================================
  // NIH/NIDDK
  // ============================================================
  {
    organization: 'NIH/NIDDK',
    source_type: 'government',
    url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes/type-2-diabetes',
    title: 'Type 2 Diabetes — Overview',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'NIH/NIDDK',
    source_type: 'government',
    url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/diet-eating-physical-activity',
    title: 'Diabetes Diet, Eating, and Physical Activity',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'NIH/NHLBI',
    source_type: 'government',
    url: 'https://www.nhlbi.nih.gov/education/dash-eating-plan',
    title: 'DASH Eating Plan',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'NIH/NIMH',
    source_type: 'government',
    url: 'https://www.nimh.nih.gov/health/topics/depression',
    title: 'Depression — Patient Information',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  // ============================================================
  // Weight management / obesity (CDC + NIDDK)
  // ============================================================
  {
    organization: 'CDC',
    source_type: 'government',
    url: 'https://www.cdc.gov/healthy-weight-growth/about/index.html',
    title: 'Healthy Weight — About',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'CDC',
    source_type: 'government',
    url: 'https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html',
    title: 'Losing Weight — Strategies and Tips',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'CDC',
    source_type: 'government',
    url: 'https://www.cdc.gov/healthy-weight-growth/physical-activity/index.html',
    title: 'Physical Activity for a Healthy Weight',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'NIH/NIDDK',
    source_type: 'government',
    url: 'https://www.niddk.nih.gov/health-information/weight-management',
    title: 'Weight Management — Overview',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  {
    organization: 'NIH/NIDDK',
    source_type: 'government',
    url: 'https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/treatment',
    title: 'Treatment for Adult Overweight & Obesity',
    scenario: 'healthcare',
    license_notes: 'US government work; public domain.',
  },
  // ============================================================
  // Synthetic hospital content (clearly fabricated for POC demo)
  // ============================================================
  {
    organization: 'Memorial Hospital (synthetic)',
    source_type: 'synthetic',
    url: 'https://demo.assured-ai.local/memorial/visitor-policy',
    title: 'Memorial Hospital Visitor Policy',
    scenario: 'healthcare',
    license_notes: 'Synthetic content authored for POC demo only. Not real organization.',
    inline_content: `
Memorial Hospital Visitor Policy

Visiting Hours
General visiting hours are 9:00 AM to 8:00 PM, seven days a week. Intensive Care Units (ICUs) and Neonatal Intensive Care Units (NICUs) operate on modified hours of 11:00 AM to 7:00 PM, with two visitors permitted at the bedside at any time. Maternity ward visiting is open from 9:00 AM to 9:00 PM, with the partner permitted to stay overnight.

COVID-19 Precautions
Masks are recommended in all clinical areas and required in oncology, transplant, and intensive care units. Visitors with respiratory symptoms are asked to defer their visit. Hand hygiene stations are available at every unit entrance. Vaccination is no longer required for visitors as of January 2026, but is strongly encouraged.

Pediatric Visitors
Visitors under age 12 are limited to immediate family in most units. Pediatric visitors in ICU/NICU areas must be accompanied by an adult and limited to 30 minutes per visit.

End-of-Life Visitation
End-of-life visitation hours are extended at the discretion of the care team. Please coordinate with the unit's nurse manager for special arrangements.

Photography and Recording
Photography of patients other than yourself is not permitted without consent of the patient and the care team. Audio or video recording of clinical conversations requires prior written authorization.
    `.trim(),
  },
  {
    organization: 'Memorial Hospital (synthetic)',
    source_type: 'synthetic',
    url: 'https://demo.assured-ai.local/memorial/patient-rights',
    title: 'Memorial Hospital Patient Rights',
    scenario: 'healthcare',
    license_notes: 'Synthetic content authored for POC demo only.',
    inline_content: `
Memorial Hospital Patient Rights

Right to Respectful Care
Every patient at Memorial Hospital is entitled to considerate, respectful care that recognizes their personal dignity, cultural values, and personal beliefs. Discrimination on the basis of race, ethnicity, national origin, religion, sex, age, mental or physical disability, sexual orientation, gender identity, or source of payment is strictly prohibited.

Right to Information
Patients have the right to receive complete information about their diagnosis, treatment, and prognosis in terms they can understand. When the patient is unable to understand the information, the information must be provided to the patient's legal representative.

Right to Make Decisions
Patients have the right to make decisions about their care, including the right to refuse treatment. Patients may also formulate advance directives such as a living will, durable power of attorney for health care, or other instructions to be followed if the patient becomes incapable of making decisions.

Right to Privacy
Patient communications and records pertaining to the patient's care will be treated as confidential except as otherwise required by law or contract. Memorial Hospital will not release patient information without the patient's consent except as authorized or required by law.

Right to Access Records
Patients have the right to access information contained in their medical records within a reasonable time frame, consistent with applicable laws and regulations.
    `.trim(),
  },
];
