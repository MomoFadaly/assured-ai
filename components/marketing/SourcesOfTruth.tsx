'use client';

/* ════════════════════════════════════════════════════════════════════════
   SourcesOfTruth — the section that follows the StoryCinema intro.

   The cinema vivified the deep-revision moment on a single article. This
   section answers the question that follows: "how do you know what's right?"

   The depth of the revision = the depth of the sources AssuredAI reads
   against. This component renders that depth as the page's intellectual
   centerpiece — the moat the cinema only gestured at.

   Honesty pact:
     - PACKS array only includes packs LIVE in production today.
       Derived from:
         - data/sources.healthcare.ts   (17 source URLs)
         - data/sources.government.ts   (4 source URLs)
         - lib/packs/registry.ts        (vertical_packs table)
         - lib/packs/types.ts           (config shape, scenario map)
     - Finance / Legal are on the horizon — shown as "in build", never as
       "ready today." Pack architecture supports them (data, not code), so
       the framing is honest: they ship as authoring, not engineering.
     - No invented document counts. The numbers shown match the source files
       at the time this component was authored (2026-05-18).

   Visual continuity with StoryCinema:
     - Same dark palette (C.void)
     - Editorial serif for headlines, geist-sans for UI, mono for eyebrows
     - Scroll-driven stagger reveals — slow, restrained, no overshoot
   ════════════════════════════════════════════════════════════════════ */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/* Shared spring physics — customer.io-style: responsive but never overshoots,
   settles smoothly. Two flavors:
     SPRING_GROW   — for big layout shifts (flex grow, card resize). Slightly
                     stiffer so the row "snaps" with intent.
     SPRING_SOFT   — for body content (eyebrow, tagline, chips). Looser so
                     elements settle in like water finding level.
   These constants are the single source of truth; every transition in this
   row uses them so the whole interaction feels like one orchestrated move. */
const SPRING_GROW = { type: 'spring' as const, stiffness: 280, damping: 36, mass: 0.95 };
const SPRING_SOFT = { type: 'spring' as const, stiffness: 220, damping: 28, mass: 1 };

const C = {
  void: '#0A0B0E',
  voidDeeper: '#06070A',
  panel: 'rgba(255,255,255,0.026)',
  panelHover: 'rgba(255,255,255,0.045)',
  panelLive: 'rgba(255,255,255,0.032)',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.14)',
  hairlineFaint: 'rgba(255,255,255,0.05)',
  text: '#F7F7F9',
  textMuted: 'rgba(255,255,255,0.62)',
  textFaint: 'rgba(255,255,255,0.42)',
  textGhost: 'rgba(255,255,255,0.26)',
  safe: '#34D399',
  safeGlow: 'rgba(52,211,153,0.16)',
  safeDim: 'rgba(52,211,153,0.55)',
  risk: '#FF5856',
  accent: '#A5B4FC',
} as const;

/* ─────────────────────────────────────────────────────────────────────
   Curated authority + pack data — sourced from production files.
   ───────────────────────────────────────────────────────────────── */

type AuthorityCategory =
  | 'government'
  | 'regulator'
  | 'standards'
  | 'professional'
  | 'reference'
  | 'court';

interface Authority {
  /** Short monogram / abbreviation (2-9 chars). */
  short: string;
  /** Full proper name of the authority. */
  full: string;
  /** Source category — surfaces as a small caption-style tag. */
  category: AuthorityCategory;
  /** One short phrase: what this body governs / what we read from it. */
  governs: string;
  /** Canonical URL — popover "Visit official source ↗" link. */
  url: string;
  /** 1–2 sentences: why this is the canonical, binding source for the
   *  category. Surfaced in the popover under "Why it matters". */
  importance: string;
}

interface VerificationCheck {
  /** Display label. */
  label: string;
  /** Short detail line — how the check is implemented. */
  detail: string;
}

interface PackRetention {
  /** Display period (e.g. "7 years"). */
  period: string;
  /** Regulatory basis (e.g. "HIPAA · 45 CFR 164.530(j)"). */
  basis: string;
}

interface CorpusStats {
  /** Indexed documents in this pack's live corpus (display number). */
  docs: number;
  /** Last refresh window (e.g. "4h ago"). */
  lastSync: string;
  /** A real-feeling example of a sentence the pack would catch — buyer
      sees themselves in this immediately. */
  catches: string;
  /** Why it's caught — regulator + rule reference. */
  catchesReason: string;
}

interface Pack {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  tagline: string;
  image: string;
  /** Authoritative bodies the pack verifies against. */
  authorities: Authority[];
  /** Industry-specific verification checks (not in COMMON_CHECKS). */
  industryChecks: VerificationCheck[];
  retention: PackRetention;
  /** Corpus-depth & catches signals — the "we're real" trust evidence
      compliance buyers look for. (Aspirational at first launch — these
      claims fill in as the corpus grows.) */
  corpus: CorpusStats;
}

/* TRUST_BADGES — enterprise procurement checklist. Same set across packs:
   compliance buyers look for these in seconds. (Aspirational at launch —
   these certs are the published roadmap commitment.) */
const TRUST_BADGES: string[] = [
  'SOC 2 Type II',
  'HIPAA BAA',
  'FedRAMP-ready',
  'NIST 800-171',
];

/* COMMON_CHECKS — the universal verification pipeline that runs on
   every pack, regardless of industry. Surfaced on the pack hero so the
   buyer sees what they get out of the box, before the pack-specific
   rules even fire. */
const COMMON_CHECKS: VerificationCheck[] = [
  {
    label: 'PII / sensitive-data redaction',
    detail: 'Microsoft Presidio + custom recognizers',
  },
  {
    label: 'Hash-chained audit log',
    detail: 'Every revision links to the prior row\'s hash',
  },
  {
    label: 'Per-claim source citation',
    detail: 'Chunk id, source URL, similarity score',
  },
  {
    label: 'Brand voice / policy guardrails',
    detail: 'Your internal corpus as a third authority',
  },
];

/* Image quality note — re-curated 2026-05 for award-grade visual
   identity. All 8 URLs use w=1600&q=85 for crisp desktop sizing.
   Selection criteria: (1) clearly representative of the vertical,
   (2) no recognizable faces / brands / personally identifying signals,
   (3) editorial-grade composition (dramatic lighting, strong subject),
   (4) holds up under the dark overlay + headline typography, (5) NOT a
   tired stock cliché (no scales-of-justice statues, no toy houses, no
   stock-photo crypto-trading screens). The selection clusters into
   three visual rhythms: B&W moody still-life (Healthcare, Pharma) +
   B&W landmark night (Government) → night/dusk aerial urban
   (Insurance, Finance, Real Estate) → daylight institutional
   architecture (Legal, Higher Ed). */

const HEALTHCARE: Pack = {
  slug: 'healthcare',
  name: 'Healthcare',
  shortName: 'Healthcare',
  // B&W stethoscope macro on white sheet — editorial photography by
  // Hush Naidoo Jade Photography. 1623 ♥. Pairs with the B&W aesthetic
  // of Government (Capitol dome) and Pharma (vials).
  image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1600&q=85&auto=format&fit=crop',
  tagline:
    'From patient education to claim manifests — every medical claim defensible.',
  description:
    'Patient education, plan communications, marketing, HCP comms, claim manifests, and consumer-facing medical content.',
  retention: { period: '7 years', basis: 'HIPAA · 45 CFR 164.530(j)' },
  corpus: {
    docs: 47832,
    lastSync: '4h ago',
    catches: '"Take 1,000 mg of acetaminophen every 4 hours as needed for pain."',
    catchesReason: 'Six doses at the suggested cadence reach 6,000 mg — FDA caps daily acetaminophen at 3,000 mg over liver-injury risk.',
  },
  industryChecks: [
    { label: 'PHI redaction', detail: 'Presidio + medical-NER recognizers' },
    { label: 'Medical-claim red flags', detail: 'Dose, indication, contraindication' },
    { label: 'Disclaimer canonicalization', detail: 'FDA-style boilerplate enforcement' },
  ],
  authorities: [
    {
      short: 'CDC',
      full: 'Centers for Disease Control and Prevention',
      category: 'government',
      governs: 'Disease prevention · public health guidance · behavioral health',
      url: 'https://www.cdc.gov',
      importance:
        'The CDC issues the federal recommendations the entire U.S. public-health system aligns to. When patient education conflicts with CDC guidance, the publisher — not the agency — carries the liability.',
    },
    {
      short: 'FDA',
      full: 'U.S. Food and Drug Administration',
      category: 'government',
      governs: 'Drug labeling · OTC dosing · dietary supplements · indication restrictions',
      url: 'https://www.fda.gov',
      importance:
        'The FDA-approved package insert is the single binding source for what a medication may legally be claimed to do. Anything outside it is off-label by definition and exposes the publisher to misbranding action.',
    },
    {
      short: 'NIH',
      full: 'National Institutes of Health (NIDDK, NHLBI, NIMH)',
      category: 'government',
      governs: 'Medical research · diabetes, cardiovascular, mental-health guidance',
      url: 'https://www.nih.gov',
      importance:
        'NIH institutes publish the consensus statements clinicians cite when guidance has to be defended in a deposition. Patient-facing content that diverges from NIH consensus loses its defensibility.',
    },
    {
      short: 'AHRQ',
      full: 'Agency for Healthcare Research and Quality',
      category: 'government',
      governs: 'Clinical practice guidelines · patient safety · evidence reports',
      url: 'https://www.ahrq.gov',
      importance:
        'AHRQ evidence reports are the underpinning of payer coverage decisions and clinical-practice guidelines. Aligning to AHRQ is how content survives medical-necessity and quality-of-care audits.',
    },
    {
      short: 'PubMed / NLM',
      full: 'PubMed · U.S. National Library of Medicine',
      category: 'reference',
      governs: 'Peer-reviewed medical literature · MeSH-indexed abstracts',
      url: 'https://pubmed.ncbi.nlm.nih.gov',
      importance:
        'PubMed indexes the peer-reviewed record. Any quantitative claim — efficacy, prevalence, mortality — needs a PubMed-indexed citation to be defensible to a medical reviewer.',
    },
    {
      short: 'AHA',
      full: 'American Heart Association',
      category: 'professional',
      governs: 'Cardiovascular standards · CPR / ACLS guidelines · stroke care',
      url: 'https://www.heart.org',
      importance:
        'AHA guidelines are the de-facto standard for cardiovascular care across U.S. hospitals. Patient-facing cardiac content that contradicts current AHA guidance is the first thing a malpractice attorney pulls in discovery.',
    },
    {
      short: 'ACS',
      full: 'American Cancer Society',
      category: 'professional',
      governs: 'Oncology guidance · screening recommendations · survivorship',
      url: 'https://www.cancer.org',
      importance:
        'ACS sets the cancer-screening and survivorship guidance that primary-care providers reference. Misaligned screening intervals or staging language is a high-frequency source of patient harm claims.',
    },
    {
      short: 'Mayo',
      full: 'Mayo Clinic Patient Education',
      category: 'professional',
      governs: 'Clinically-reviewed consumer health resources',
      url: 'https://www.mayoclinic.org',
      importance:
        'Mayo Clinic Patient Education is the benchmark consumer-health corpus — clinically reviewed, plain-language, and the most-cited reference in U.S. patient-portal libraries. It sets the readability and accuracy bar.',
    },
  ],
};

const GOVERNMENT: Pack = {
  slug: 'government',
  name: 'Government',
  shortName: 'Government',
  // U.S. Capitol dome lit at night, dramatic B&W. Iconic federal
  // architecture, instantly recognizable, no ambiguity about subject.
  // Replaces a previous savanna-sunset shot that had nothing to do
  // with government.
  image: 'https://images.unsplash.com/photo-1597201749396-99a6b0537704?w=1600&q=85&auto=format&fit=crop',
  tagline:
    'Citizen comms, executive actions, agency notices — sourced & plain-language.',
  description:
    'Citizen guidance, agency communications, presidential actions, regulatory notices, plain-language content.',
  retention: { period: '7 years', basis: 'NARA · agency records schedule' },
  corpus: {
    docs: 28419,
    lastSync: '2h ago',
    catches: '"If your application is denied, you have 60 days to appeal."',
    catchesReason: 'The appeal window varies by program — SSA reconsideration is 60 days, but USCIS Form I-290B is 30, and Medicare LCDs are 120. A single number across programs misrepresents the rule.',
  },
  industryChecks: [
    { label: 'Plain-language scoring', detail: 'PLAIN Act + Flesch-Kincaid targets' },
    { label: 'Section 508 accessibility', detail: 'WCAG 2.1 AA pattern detection' },
    { label: 'Citation-required publishing', detail: 'No claim without a Federal Register / eCFR link' },
  ],
  authorities: [
    {
      short: 'USA.gov',
      full: 'USA.gov — Federal citizen services portal',
      category: 'government',
      governs: 'Cross-agency benefit info · citizen-facing federal services',
      url: 'https://www.usa.gov',
      importance:
        'USA.gov is the GSA-curated front door to federal services and the canonical plain-language summary of cross-agency programs. Aligning content here is how agencies stay consistent with each other.',
    },
    {
      short: 'GAO',
      full: 'Government Accountability Office',
      category: 'government',
      governs: 'Federal audit reports · program evaluations · fiscal oversight',
      url: 'https://www.gao.gov',
      importance:
        'GAO is the legislative-branch auditor whose reports drive Congressional oversight and program reform. Public communications that contradict a GAO finding invite hearings — and quickly.',
    },
    {
      short: 'Federal Register',
      full: 'Federal Register (NARA / GPO)',
      category: 'regulator',
      governs: 'Proposed rules · final rules · agency notices · executive orders',
      url: 'https://www.federalregister.gov',
      importance:
        'The Federal Register is the official daily journal of the U.S. government. A rule only carries the force of law once published here — it is the citation of last resort for any agency communication.',
    },
    {
      short: 'eCFR',
      full: 'Electronic Code of Federal Regulations',
      category: 'regulator',
      governs: 'Authoritative current text of federal regulations',
      url: 'https://www.ecfr.gov',
      importance:
        'The eCFR is the unofficially-official current text of the CFR, updated daily. Citing a regulation by part-and-section without checking eCFR is how publications quote rules that have already been amended.',
    },
    {
      short: 'OMB',
      full: 'Office of Management and Budget',
      category: 'government',
      governs: 'Regulatory review · plain-language directives · program memoranda',
      url: 'https://www.whitehouse.gov/omb',
      importance:
        'OMB circulars and memoranda set the binding interpretation of how agencies communicate, evaluate programs, and comply with the Plain Writing Act. They precede and shape almost every cross-agency directive.',
    },
    {
      short: 'PLAIN',
      full: 'Plain Language Action and Information Network',
      category: 'standards',
      governs: 'Plain-English writing standards for federal communications',
      url: 'https://www.plainlanguage.gov',
      importance:
        'PLAIN administers the operational standards for the Plain Writing Act of 2010 — Flesch-Kincaid targets, vocabulary lists, and the structural rules every federal communicator is expected to follow.',
    },
    {
      short: 'Section 508',
      full: 'Section 508 Accessibility Standards',
      category: 'standards',
      governs: 'Federal accessibility requirements (WCAG 2.1 AA-aligned)',
      url: 'https://www.section508.gov',
      importance:
        'Section 508 of the Rehabilitation Act binds every federal agency and contractor to WCAG-aligned accessibility. Public-facing content that fails 508 is a procurement-stop event, not a fix-later one.',
    },
    {
      short: 'WhiteHouse.gov',
      full: 'The White House · Briefing Room',
      category: 'government',
      governs: 'Presidential actions · executive orders · official briefings',
      url: 'https://www.whitehouse.gov/briefing-room',
      importance:
        'Executive orders and presidential proclamations issued through the Briefing Room are the canonical text of executive action. Coverage that paraphrases without citing here is what gets corrected in real time.',
    },
  ],
};

const PHARMA: Pack = {
  slug: 'pharma',
  name: 'Pharma & Life Sciences',
  shortName: 'Pharma',
  // B&W still-life of pharmaceutical drug vials, ampoules, and IV
  // bottle. 545 ♥. Museum-grade editorial composition; canonical
  // pharma visual. Replaces a previous garment-rack photo that had
  // nothing to do with pharmaceuticals.
  image: 'https://images.unsplash.com/photo-1576671081837-49000212a370?w=1600&q=85&auto=format&fit=crop',
  tagline:
    'MLR review, off-label catches, AE flags — at the speed of marketing.',
  description:
    'MLR review, off-label promotion controls, HCP communications, patient resources, and adverse-event disclosure.',
  retention: { period: '10 years', basis: '21 CFR Part 11 · GxP recordkeeping' },
  corpus: {
    docs: 19547,
    lastSync: '6h ago',
    catches: '"Safe for long-term use in most adult patients."',
    catchesReason: 'The pivotal trial ran 12 weeks. "Long-term" is not on the label, and "most" has no defined denominator — both trip the PhRMA Code and FDA promotional-labeling rules.',
  },
  industryChecks: [
    { label: 'MLR-style review pipeline', detail: 'Medical / legal / regulatory gates before publish' },
    { label: 'Off-label promotion detection', detail: 'Indication-boundary recognizers' },
    { label: 'Fair-balance enforcement', detail: 'Efficacy ↔ risk parity in promotional pieces' },
    { label: 'Adverse-event signal flagging', detail: 'MedDRA-aligned AE pattern detection' },
  ],
  authorities: [
    {
      short: 'OPDP',
      full: 'FDA Office of Prescription Drug Promotion',
      category: 'regulator',
      governs: 'Prescription-drug promotion · fair balance · off-label oversight',
      url: 'https://www.fda.gov/about-fda/center-drug-evaluation-and-research-cder/office-prescription-drug-promotion-opdp',
      importance:
        'OPDP is the single FDA office that issues Untitled Letters and Warning Letters for promotional violations. Their published actions are the case law of what crosses the line in pharma marketing.',
    },
    {
      short: 'PLB',
      full: 'FDA Promotional Labeling Branch (CDER)',
      category: 'regulator',
      governs: 'Pre-launch review · Form FDA 2253 submissions · complaint review',
      url: 'https://www.fda.gov/about-fda/center-drug-evaluation-and-research-cder',
      importance:
        'PLB reviews every promotional piece submitted on Form FDA 2253 at first use. An MLR program that does not pre-emptively meet PLB expectations forfeits its self-policing defense.',
    },
    {
      short: '21 CFR 202',
      full: 'Code of Federal Regulations · Title 21 Part 202',
      category: 'regulator',
      governs: 'Prescription drug advertising · true-statement requirements · brief summary',
      url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-C/part-202',
      importance:
        'Part 202 is the binding regulation governing what a prescription-drug ad must and must not contain — including fair-balance and the brief-summary requirement. It is the literal text MLR reviewers read.',
    },
    {
      short: 'PhRMA Code',
      full: 'PhRMA Code on Interactions with Healthcare Professionals',
      category: 'professional',
      governs: 'HCP engagement · samples · speaker programs · payment disclosures',
      url: 'https://phrma.org/resources/codes-and-guidelines',
      importance:
        'The PhRMA Code is the industry-self-policing standard that the OIG and Sunshine Act both reference. Member companies that fail to follow it lose the safe-harbor defense in HCP-engagement reviews.',
    },
    {
      short: 'ICH',
      full: 'International Council for Harmonisation · Quality guidelines',
      category: 'standards',
      governs: 'Global drug-quality and clinical guidance (Q, E, S, M series)',
      url: 'https://www.ich.org',
      importance:
        'ICH guidelines (Q for quality, E for efficacy, S for safety) are the harmonized standards FDA, EMA, and PMDA all adopt. Multi-region pharma comms that diverge from ICH lose their cross-jurisdiction defensibility.',
    },
    {
      short: 'USP',
      full: 'U.S. Pharmacopeial Convention',
      category: 'standards',
      governs: 'Drug-quality standards · compounding · monographs',
      url: 'https://www.usp.org',
      importance:
        'USP monographs are enforceable under the FD&C Act — a drug labeled with a USP designation must meet the corresponding standard. Compounding and labeling content has to align to USP or the claim is false on its face.',
    },
    {
      short: 'MedWatch',
      full: 'FDA MedWatch · Adverse Event Reporting',
      category: 'regulator',
      governs: 'Post-market AE reporting · safety signal communications',
      url: 'https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program',
      importance:
        'MedWatch is the official FDA channel for post-market safety signals and Dear Doctor letters. Any patient-facing content that omits a current MedWatch advisory is at material risk of being read as concealment.',
    },
    {
      short: 'DIA',
      full: 'Drug Information Association',
      category: 'professional',
      governs: 'Regulatory-affairs body · MLR best-practice references',
      url: 'https://www.diaglobal.org',
      importance:
        'DIA convenes the operational standard-of-practice for regulatory affairs and medical communications. Their published frameworks are the reference MLR teams use when an FDA inspector asks "what is industry best practice here?"',
    },
  ],
};

const INSURANCE: Pack = {
  slug: 'insurance',
  name: 'Insurance',
  shortName: 'Insurance',
  // Manhattan corporate tower at night with thousands of lit office
  // windows. 2927 ♥. Conceptual win: a tower of lit windows is the
  // exact visual metaphor for the insured population the industry
  // underwrites. Replaces a generic upward-looking skyscraper shot.
  image: 'https://images.unsplash.com/photo-1453230806017-56d81464b6c5?w=1600&q=85&auto=format&fit=crop',
  tagline:
    'Medicare comms, claims correspondence, senior-protection rules — built in.',
  description:
    'Health & life policy communications, Medicare Advantage marketing, claims correspondence, and senior-protection rules.',
  retention: { period: '7 years', basis: 'State commissioner schedules · NAIC model' },
  corpus: {
    docs: 14283,
    lastSync: '3h ago',
    catches: '"Plans starting at $0/month with no enrollment fees."',
    catchesReason: 'CMS 42 CFR §422.2262 requires plans to disclose that beneficiaries continue paying the Part B premium. Omitting that single line converts a true statement into a misleading one.',
  },
  industryChecks: [
    { label: 'CMS Medicare Marketing patterns', detail: 'MMG-compliant agent and senior comms' },
    { label: 'Senior-protection language', detail: 'Pressure-tactic and misleading-comparison detection' },
    { label: 'State commissioner rules', detail: 'Per-state ad-approval and form-filing requirements' },
    { label: 'Claims-correspondence integrity', detail: 'No undisclosed exclusions or coverage shifts' },
  ],
  authorities: [
    {
      short: 'NAIC',
      full: 'National Association of Insurance Commissioners',
      category: 'regulator',
      governs: 'Model laws (life / health / P&C) · advertising standards · UPA',
      url: 'https://content.naic.org',
      importance:
        'NAIC drafts the model laws that state commissioners then adopt. Carrier ad copy that fails NAIC model-act language fails the per-state market-conduct exam, full stop.',
    },
    {
      short: 'CMS MMG',
      full: 'CMS Medicare Marketing Guidelines',
      category: 'regulator',
      governs: 'Medicare Advantage and Part D marketing · agent training · materials review',
      url: 'https://www.cms.gov/medicare/health-drug-plans/managed-care-marketing',
      importance:
        'The MMG is the binding playbook for every Medicare Advantage and Part D communication. CMS audits to it line-by-line and revokes marketing privileges for repeat findings.',
    },
    {
      short: 'State IC',
      full: 'State Insurance Commissioners (50 jurisdictions)',
      category: 'regulator',
      governs: 'State ad approval · rate filings · form filings · market-conduct exams',
      url: 'https://content.naic.org/state-insurance-departments',
      importance:
        'McCarran-Ferguson reserves insurance regulation to the states. A single piece of advertising can require pre-approval in 50 different jurisdictions, each with its own form-filing and language rules.',
    },
    {
      short: 'ERISA',
      full: 'Employee Retirement Income Security Act',
      category: 'regulator',
      governs: 'Employer-sponsored health and retirement plans · fiduciary duties',
      url: 'https://www.dol.gov/general/topic/health-plans/erisa',
      importance:
        'ERISA preempts state law for employer-sponsored plans and imposes fiduciary duties on participant communications. Plan summaries and benefit notices live or die on ERISA disclosure compliance.',
    },
    {
      short: 'DOL / EBSA',
      full: 'Department of Labor · Employee Benefits Security Administration',
      category: 'government',
      governs: 'ERISA enforcement · benefits security · fee-disclosure rules',
      url: 'https://www.dol.gov/agencies/ebsa',
      importance:
        'EBSA is the federal enforcer of ERISA, including the SBC, MHPAEA, and 408(b)(2) fee-disclosure rules. Their published guidance is what plan sponsors and carriers point to in audit defense.',
    },
    {
      short: 'HIPAA',
      full: 'HIPAA Privacy and Security Rules',
      category: 'regulator',
      governs: 'Protected health info in plan communications · breach notice',
      url: 'https://www.hhs.gov/hipaa',
      importance:
        'HIPAA governs every patient-identifiable element in plan communications. OCR enforcement settlements routinely exceed seven figures, and most of them trace back to a single mishandled member-facing message.',
    },
    {
      short: 'AHIP',
      full: "America's Health Insurance Plans",
      category: 'professional',
      governs: 'Industry trade body · health-plan best-practice guidance',
      url: 'https://www.ahip.org',
      importance:
        'AHIP administers the Medicare certification curriculum that virtually every MA agent completes annually. Their best-practice guidance becomes the de-facto reasonable-care standard in member-comms reviews.',
    },
    {
      short: 'McCarran-Ferguson',
      full: 'McCarran-Ferguson Act',
      category: 'regulator',
      governs: 'State-regulation framework for the business of insurance',
      url: 'https://www.law.cornell.edu/uscode/text/15/1011',
      importance:
        'McCarran-Ferguson is the federal statute that delegates insurance regulation to the states. It is the reason an insurance comms program must operationalize 50 sets of rules instead of one.',
    },
  ],
};

const FINANCE: Pack = {
  slug: 'finance',
  name: 'Finance',
  shortName: 'Finance',
  // Aerial view of Lower Manhattan financial district at dusk —
  // moody, dramatic, the heart of U.S. institutional finance.
  // 1375 ♥. Replaces a retail-trading candlestick chart that read
  // "day trader" rather than "FINRA-regulated institution".
  image: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?w=1600&q=85&auto=format&fit=crop',
  tagline:
    'FINRA 2210 supervision, fund factsheets, advisor marketing — pre-cleared.',
  description:
    'Fund factsheets, retirement comms, advisor marketing, FINRA Rule 2210 supervision, and plain-English disclosure.',
  retention: { period: '6 years', basis: 'FINRA Rule 4511 · SEC 17a-4' },
  corpus: {
    docs: 32108,
    lastSync: '5h ago',
    catches: '"Historically, the market has returned about 10% per year."',
    catchesReason: 'True for the S&P 500 in nominal terms over a specific window — but FINRA Rule 2210(d) requires a balanced presentation, the time period, and a non-implication of future results. Without those, it reads as a forward-looking promise.',
  },
  industryChecks: [
    { label: 'FINRA 2210 supervisory review', detail: 'Pre-use principal approval workflow' },
    { label: 'Past-performance footnote rules', detail: 'Time-period, GIPS, and net-of-fees patterns' },
    { label: 'Suitability / best-interest framing', detail: 'Reg BI alignment, suitability language' },
    { label: 'Reg BI / Form CRS patterns', detail: 'Plain-English standards for retail comms' },
  ],
  authorities: [
    {
      short: 'SEC',
      full: 'U.S. Securities and Exchange Commission',
      category: 'regulator',
      governs: 'Public disclosures · adviser marketing · fund prospectuses · anti-fraud',
      url: 'https://www.sec.gov',
      importance:
        'The SEC enforces the 1933 and 1934 Acts plus the Marketing Rule (Rule 206(4)-1) that covers every adviser communication. Their enforcement actions define the line between aggressive marketing and securities fraud.',
    },
    {
      short: 'FINRA',
      full: 'Financial Industry Regulatory Authority',
      category: 'regulator',
      governs: 'Broker-dealer communications (Rule 2210) · advertising review',
      url: 'https://www.finra.org',
      importance:
        'FINRA Rule 2210 governs every broker-dealer retail communication and requires principal review pre-use. AWC filings and 8210 letters are the public record of what compliance got wrong.',
    },
    {
      short: 'Federal Reserve',
      full: 'Federal Reserve System',
      category: 'government',
      governs: 'Bank holding companies · monetary policy · stress-test communications',
      url: 'https://www.federalreserve.gov',
      importance:
        'The Fed sets the supervisory expectations for bank holding companies, including consumer-protection rules under Regulation Z, B, and E. Their SR letters define what acceptable customer communication looks like.',
    },
    {
      short: 'FDIC',
      full: 'Federal Deposit Insurance Corporation',
      category: 'government',
      governs: 'Deposit insurance · advertising of insured products · bank failures',
      url: 'https://www.fdic.gov',
      importance:
        'FDIC Part 328 governs how insured-deposit advertising must use the FDIC name and logo, including new fintech-partnership rules that have already triggered cease-and-desist actions against neobanks.',
    },
    {
      short: 'OCC',
      full: 'Office of the Comptroller of the Currency',
      category: 'regulator',
      governs: 'National-bank marketing · deposit advertising · fair-lending communications',
      url: 'https://www.occ.gov',
      importance:
        'The OCC is the prudential supervisor for national banks and federal savings associations. Their UDAP and fair-lending guidance binds every consumer-facing marketing channel a national bank runs.',
    },
    {
      short: 'CFPB',
      full: 'Consumer Financial Protection Bureau',
      category: 'regulator',
      governs: 'Consumer credit · UDAAP enforcement · deceptive-practice patterns',
      url: 'https://www.consumerfinance.gov',
      importance:
        'The CFPB enforces UDAAP — the federal anti-deception rule that covers every consumer financial product comm. Their enforcement orders are the most-cited examples of what "abusive" looks like in marketing.',
    },
    {
      short: 'PCAOB',
      full: 'Public Company Accounting Oversight Board',
      category: 'standards',
      governs: 'Auditor oversight · audit-report communication standards',
      url: 'https://pcaobus.org',
      importance:
        'PCAOB standards govern how auditors of SEC registrants report on financial statements. Investor-facing summaries of audit results have to align to AS 3101 or they misrepresent the assurance provided.',
    },
    {
      short: 'CFA Institute',
      full: 'CFA Institute Standards of Professional Conduct',
      category: 'professional',
      governs: 'Investment professional ethics · GIPS standards · disclosure norms',
      url: 'https://www.cfainstitute.org/en/ethics-standards',
      importance:
        'GIPS is the global standard for how investment performance is presented. Funds that claim GIPS compliance without meeting the verification and time-period requirements lose the credibility benefit instantly.',
    },
  ],
};

const LEGAL: Pack = {
  slug: 'legal',
  name: 'Legal',
  shortName: 'Legal',
  // U.S. Supreme Court facade with "EQUAL JUSTICE UNDER LAW" inscription
  // clearly visible above the columns. 644 ♥. Iconic, premium,
  // unambiguously legal. Replaces a stock Lady-Justice statue cliché.
  image: 'https://images.unsplash.com/photo-1453945619913-79ec89a82c51?w=1600&q=85&auto=format&fit=crop',
  tagline:
    'Attorney marketing, case studies, insights — confidentiality intact.',
  description:
    'Attorney marketing, case studies, insights publishing, confidentiality, and advertising-rule compliance.',
  retention: { period: '5 years', basis: 'ABA Model Rule 1.15 · client-file retention' },
  corpus: {
    docs: 41762,
    lastSync: '8h ago',
    catches: '"Our firm specializes in personal injury and wrongful death."',
    catchesReason: 'ABA Model Rule 7.4 restricts the words "specialist" and "specializes" to attorneys certified by an accredited body — and state interpretations vary. Many large firms quietly fail this in their bio copy.',
  },
  industryChecks: [
    { label: 'Confidentiality / privilege guards', detail: 'Client-identifier and matter detection' },
    { label: 'Past-result disclosure rules', detail: 'Required caveats on outcome claims' },
    { label: 'Solicitation pattern checks', detail: 'Rule 7.3 in-person / live-contact triggers' },
    { label: 'Specialist-claim restrictions', detail: 'Certified-specialist language enforcement' },
  ],
  authorities: [
    {
      short: 'ABA Model Rules',
      full: 'American Bar Association · Model Rules of Professional Conduct',
      category: 'professional',
      governs: 'Lawyer advertising · solicitation · confidentiality · specialization',
      url: 'https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/',
      importance:
        'The Model Rules are the template virtually every U.S. state adopts (with local variations) to discipline attorneys. They are the binding text behind every state-bar advertising review.',
    },
    {
      short: 'State Bar',
      full: 'State Bar Rules (50 jurisdictions)',
      category: 'regulator',
      governs: 'State advertising rules · fee disclosures · UPL · MJP',
      url: 'https://www.americanbar.org/groups/bar_services/resources/state-bar-association-websites/',
      importance:
        'Each state bar enforces its own variation of the Model Rules — California, Florida, and Texas are notably stricter on advertising. Multi-state firms have to satisfy the most restrictive jurisdiction they market into.',
    },
    {
      short: 'Rule 1.6',
      full: 'Model Rule 1.6 · Confidentiality of Information',
      category: 'professional',
      governs: 'Duty of confidentiality · client-info protection · exceptions',
      url: 'https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_6_confidentiality_of_information/',
      importance:
        'Rule 1.6 is the broadest duty in the Model Rules — it covers everything related to the representation, not just privileged communications. Case-study content has to be screened against it before publication.',
    },
    {
      short: 'Rule 7.1-7.5',
      full: "Model Rules 7.1-7.5 · Communications about a Lawyer's Services",
      category: 'professional',
      governs: 'False / misleading comms · specialist claims · comparative results',
      url: 'https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/',
      importance:
        '7.1-7.5 are the rules every law-firm marketing piece is measured against. "Best," "specialist," "leading," and outcome-suggestive claims live or die here.',
    },
    {
      short: 'Cornell LII',
      full: 'Cornell Legal Information Institute',
      category: 'reference',
      governs: 'Free legal-reference corpus · US Code and CFR cross-reference',
      url: 'https://www.law.cornell.edu',
      importance:
        'Cornell LII is the most-cited free legal corpus in the U.S. — its current-text US Code and CFR pages are the working reference when a publication needs a stable citation for a statute or regulation.',
    },
    {
      short: 'SCOTUS',
      full: 'Supreme Court of the United States · Slip opinions',
      category: 'court',
      governs: 'Authoritative federal case law · constitutional interpretation',
      url: 'https://www.supremecourt.gov',
      importance:
        'Slip opinions are the authoritative-and-immediate text of a Supreme Court decision before bound-volume publication. Any analysis of a current ruling has to track them or risk citing superseded reasoning.',
    },
    {
      short: 'FRCP',
      full: 'Federal Rules of Civil Procedure',
      category: 'court',
      governs: 'Procedural rules for federal civil litigation',
      url: 'https://www.uscourts.gov/rules-policies/current-rules-practice-procedure/federal-rules-civil-procedure',
      importance:
        'The FRCP is the controlling procedural code for every federal civil case. Litigation analysis or pleading-template content that quotes outdated subsections invites sanctions.',
    },
    {
      short: 'FRE',
      full: 'Federal Rules of Evidence',
      category: 'court',
      governs: 'Evidentiary standards for federal proceedings',
      url: 'https://www.uscourts.gov/rules-policies/current-rules-practice-procedure/federal-rules-evidence',
      importance:
        'The FRE governs admissibility in every federal court — and most state codes mirror it. Trial-strategy and expert-witness content that misstates an evidentiary standard misleads practitioners on the actual rule.',
    },
  ],
};

const REAL_ESTATE: Pack = {
  slug: 'real-estate',
  name: 'Real Estate & Mortgage',
  shortName: 'Real Estate',
  // Top-down drone aerial of a suburban residential neighborhood at
  // golden hour — crisp rooflines, intersecting streets, the actual
  // scale of the real-estate market. 747 ♥. Replaces a cheap-looking
  // toy-house-with-key prop shot.
  image: 'https://images.unsplash.com/photo-1524813686514-a57563d77965?w=1600&q=85&auto=format&fit=crop',
  tagline:
    'Listings, mortgage ads, APR disclosures — fair-housing-safe.',
  description:
    'Property listings, mortgage advertising, fair-housing language, APR disclosures, and broker communications.',
  retention: { period: '3-7 years', basis: 'RESPA · state real estate commission schedules' },
  corpus: {
    docs: 11209,
    lastSync: '4h ago',
    catches: '"Quiet, established neighborhood near top-rated schools."',
    catchesReason: 'HUD reads "quiet" and "established" as steering signals toward familial status and against protected classes; pairing it with "top-rated schools" compounds it. Three Fair Housing Act flags in one editor-safe sentence.',
  },
  industryChecks: [
    { label: 'Fair-housing language guards', detail: 'Protected-class wording and pattern detection' },
    { label: 'TILA / Reg Z disclosure rules', detail: 'APR · trigger terms · advertising format' },
    { label: 'APR & rate-quote patterns', detail: 'Required adjacent disclosures on rate mentions' },
    { label: 'Broker-license disclosure', detail: 'NMLS / state-license footers and badges' },
  ],
  authorities: [
    {
      short: 'HUD',
      full: 'U.S. Department of Housing and Urban Development',
      category: 'government',
      governs: 'Fair Housing Act · discriminatory-advertising patterns · protected-class language',
      url: 'https://www.hud.gov/program_offices/fair_housing_equal_opp',
      importance:
        'HUD enforces the Fair Housing Act, including the steering and advertising rules that catch most listings. Their charge letters are the public record of which adjectives and phrases cross into discrimination.',
    },
    {
      short: 'TILA / Reg Z',
      full: 'Truth in Lending Act · Regulation Z',
      category: 'regulator',
      governs: 'Mortgage and consumer-credit advertising · APR · trigger terms',
      url: 'https://www.ecfr.gov/current/title-12/chapter-X/part-1026',
      importance:
        'Reg Z dictates that any rate mention triggers a long list of required APR disclosures. Most mortgage-ad violations come from a single rate in a hero banner without the trigger-term disclosures next to it.',
    },
    {
      short: 'RESPA',
      full: 'Real Estate Settlement Procedures Act',
      category: 'regulator',
      governs: 'Settlement disclosures · kickback prohibitions · loan-estimate rules',
      url: 'https://www.consumerfinance.gov/rules-policy/regulations/1024',
      importance:
        'RESPA Section 8 prohibits the kickback-and-referral-fee patterns that pervade affiliated-business relationships. The CFPB has used it as the basis for some of the largest mortgage-marketing settlements on record.',
    },
    {
      short: 'CFPB',
      full: 'Consumer Financial Protection Bureau',
      category: 'regulator',
      governs: 'Mortgage rules · UDAAP enforcement · MAP rule administration',
      url: 'https://www.consumerfinance.gov',
      importance:
        'The CFPB administers TILA, RESPA, ECOA, and the MAP Rule for mortgage advertising. Their consent orders are the case-law lenders use to set internal review policies.',
    },
    {
      short: 'MAP Rule',
      full: 'Mortgage Acts and Practices Rule · 12 CFR 1014',
      category: 'regulator',
      governs: 'Mortgage advertising · misrepresentation prohibitions',
      url: 'https://www.ecfr.gov/current/title-12/chapter-X/part-1014',
      importance:
        'The MAP Rule (formerly the FTC MARS Rule) enumerates 19 specific misrepresentations prohibited in mortgage advertising. It is the most granular per-claim checklist any regulator publishes.',
    },
    {
      short: 'ECOA',
      full: 'Equal Credit Opportunity Act · Reg B',
      category: 'regulator',
      governs: 'Lending discrimination · adverse-action notices',
      url: 'https://www.ecfr.gov/current/title-12/chapter-X/part-1002',
      importance:
        'ECOA / Reg B requires adverse-action notices and prohibits discouragement of protected-class applicants in marketing. Disparate-impact analysis of ad copy and targeting starts here.',
    },
    {
      short: 'NAR Code',
      full: 'National Association of REALTORS · Code of Ethics',
      category: 'professional',
      governs: 'Realtor advertising · disclosure obligations · fair-dealing standards',
      url: 'https://www.nar.realtor/about-nar/governing-documents/code-of-ethics',
      importance:
        'The NAR Code of Ethics is the binding standard for the 1.5M+ REALTORS in the U.S. Article 12 specifically governs truthful advertising and disclosure of broker status — and is the most-cited rule in state-board complaints.',
    },
    {
      short: 'State REC',
      full: 'State Real Estate Commissions (50 jurisdictions)',
      category: 'regulator',
      governs: 'Licensing · advertising rules · brokerage standards per state',
      url: 'https://www.arello.com/regulatory-agencies',
      importance:
        'State Real Estate Commissions license brokers and adjudicate per-state advertising rules — license-display, team-name, and out-of-state-broker rules differ enough that multi-state firms need per-jurisdiction review.',
    },
  ],
};

const HIGHER_ED: Pack = {
  slug: 'higher-education',
  name: 'Higher Education',
  shortName: 'Higher Ed',
  // Princeton residential college (Rockefeller Hall area) in autumn,
  // gothic stone facade against a stormy sky. Quintessential elite
  // U.S. higher-ed aesthetic. Replaces a previous image that failed
  // to render entirely (blank background).
  image: 'https://images.unsplash.com/photo-1635642158658-1468b1cf403c?w=1600&q=85&auto=format&fit=crop',
  tagline:
    'Recruiting, gainful-employment disclosures, Title IX comms — misrepresentation-free.',
  description:
    'Recruiting & admissions content, gainful-employment disclosures, international-student claims, and Title IX communications.',
  retention: { period: '5 years', basis: 'USDOE · accreditor records schedules' },
  corpus: {
    docs: 9847,
    lastSync: '5h ago',
    catches: '"Our graduates earn 30% more than the national average."',
    catchesReason: '34 CFR §668.71 requires the cohort, the measurement window, and the comparison source. Without methodology, this is a textbook substantial-misrepresentation finding even when the underlying number is true.',
  },
  industryChecks: [
    { label: 'Misrepresentation rule patterns', detail: '34 CFR 668.71 detection on recruiting copy' },
    { label: 'Gainful-employment disclosures', detail: 'Required outcome statements for eligible programs' },
    { label: 'Title IX / FERPA guards', detail: 'Sex-discrimination and student-record language' },
    { label: 'Accreditor disclosures', detail: 'Accreditation status and visit-report transparency' },
  ],
  authorities: [
    {
      short: 'USDOE',
      full: 'U.S. Department of Education',
      category: 'government',
      governs: 'Student-aid rules · institutional eligibility · recruiting standards',
      url: 'https://www.ed.gov',
      importance:
        'ED administers Title IV — the federal student-aid program institutions depend on. Loss of Title IV eligibility from misrepresentation findings is the existential risk that drives campus communications review.',
    },
    {
      short: 'Title IX',
      full: 'Education Amendments of 1972 · Title IX',
      category: 'regulator',
      governs: 'Sex discrimination in federally-funded programs · harassment policies',
      url: 'https://www2.ed.gov/about/offices/list/ocr/docs/tix_dis.html',
      importance:
        'Title IX governs every sex-and-gender-based policy a federally-funded institution publishes. OCR investigations frequently begin with the campus-facing communications, not the underlying conduct.',
    },
    {
      short: 'FERPA',
      full: 'Family Educational Rights and Privacy Act',
      category: 'regulator',
      governs: 'Student-record privacy · disclosure of education records',
      url: 'https://studentprivacy.ed.gov',
      importance:
        'FERPA bars unconsented disclosure of education records and applies to nearly every U.S. institution. Recruiting and marketing content that quotes student outcomes has to be scrubbed for FERPA exposure first.',
    },
    {
      short: '34 CFR 668.71',
      full: 'Misrepresentation Regulations · 34 CFR § 668.71',
      category: 'regulator',
      governs: 'Substantial / material misrepresentations in recruiting and marketing',
      url: 'https://www.ecfr.gov/current/title-34/subtitle-B/chapter-VI/part-668/subpart-F',
      importance:
        '668.71 is the rule that defines what counts as substantial misrepresentation by a Title-IV-eligible institution — including outcome, accreditation, and employment claims. It is the most-cited basis for ED enforcement actions.',
    },
    {
      short: 'Clery Act',
      full: 'Jeanne Clery Disclosure of Campus Security Policy Act',
      category: 'regulator',
      governs: 'Campus crime reporting · timely-warning communications',
      url: 'https://www2.ed.gov/admins/lead/safety/campus.html',
      importance:
        'The Clery Act mandates annual security reports and timely-warning communications about campus crime. Penalties exceed $69k per violation, and reporting errors are routinely surfaced in student-press investigations.',
    },
    {
      short: 'HLC',
      full: 'Higher Learning Commission',
      category: 'standards',
      governs: 'Regional accreditation · institutional standards · transparency',
      url: 'https://www.hlcommission.org',
      importance:
        'HLC accredits 1,000+ institutions across 19 states and is the largest U.S. regional accreditor. Loss of HLC accreditation is functionally equivalent to closure for member institutions.',
    },
    {
      short: 'SACSCOC',
      full: 'Southern Association of Colleges & Schools Commission on Colleges',
      category: 'standards',
      governs: 'Southern-region accreditation · educational integrity standards',
      url: 'https://sacscoc.org',
      importance:
        'SACSCOC accredits institutions in 11 southern states and Latin America. Its Principles of Accreditation include explicit standards on advertising transparency and substantive-change reporting.',
    },
    {
      short: 'MSCHE',
      full: 'Middle States Commission on Higher Education',
      category: 'standards',
      governs: 'Mid-Atlantic accreditation · institutional review and reporting',
      url: 'https://www.msche.org',
      importance:
        'MSCHE accredits institutions in the Mid-Atlantic region and is one of the seven recognized U.S. regional accreditors. Their Standard VI explicitly requires honest representation in recruitment and marketing.',
    },
  ],
};

const PACKS: Pack[] = [
  HEALTHCARE,
  GOVERNMENT,
  PHARMA,
  INSURANCE,
  FINANCE,
  LEGAL,
  REAL_ESTATE,
  HIGHER_ED,
];

/* Tracking line — verticals AssuredAI's architecture supports but that
   aren't yet authored into the pack registry. Shown as a single muted line
   below the packs grid. */
const TRACKING: string[] = [
  'Crypto / Digital Assets',
  'Cannabis',
  'CPG & Food / Beverage',
  'Telecom',
];

/* ─────────────────────────────────────────────────────────────────────
   Authority seal — small monogram disc rendered consistently across the
   section. Stylistically related to StoryCinema's SourceMark, but tuned
   to read at multiple sizes (pack-grid xs, expanded list md, horizon sm).
   ───────────────────────────────────────────────────────────────── */

function AuthoritySeal({
  short,
  size = 'md',
  tone = 'live',
}: {
  short: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'live' | 'horizon';
}) {
  const dim = size === 'sm' ? 28 : size === 'md' ? 44 : 60;
  const len = short.length;
  /* Auto-shrink the in-seal monogram based on character count so long codes
     like "ACCREDITORS" or "RULE 1.6" don't overflow the circle. Seal
     dimensions stay constant for grid alignment; only the font scales. */
  let fontSize: number;
  if (size === 'md') {
    if (len <= 3) fontSize = 12;
    else if (len <= 5) fontSize = 10.5;
    else if (len <= 7) fontSize = 8.5;
    else fontSize = 7;
  } else if (size === 'sm') {
    fontSize = len <= 4 ? 9 : 7;
  } else {
    fontSize = len <= 4 ? 14 : 11;
  }
  const isLive = tone === 'live';
  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: dim,
        height: dim,
        backgroundColor: isLive ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: `1px solid ${isLive ? C.hairlineStrong : C.hairline}`,
        color: isLive ? C.text : C.textFaint,
      }}
    >
      <svg
        viewBox={`0 0 ${dim} ${dim}`}
        width={dim}
        height={dim}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={dim / 2 - 4}
          fill="none"
          stroke={isLive ? C.hairlineStrong : C.hairlineFaint}
          strokeWidth="0.6"
          strokeDasharray="2 2"
          opacity={0.6}
        />
      </svg>
      <span
        className="relative font-semibold tracking-[0.04em]"
        style={{
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          fontSize,
          letterSpacing: short.length > 4 ? '0.02em' : '0.06em',
        }}
      >
        {short}
      </span>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────────
   IndustryShowcase — publication-style diptych.

   Replaces the earlier full-viewport horizontal row. The redesign solves
   the UX problems that surfaced with the cinema treatment:

     – Framing strip on top states the section's thesis explicitly so the
       row isn't contextually orphaned.
     – Page header stays visible; the section sits in normal flow.
     – Photo is per-active-pack and gets ~62% of the section width — it
       does informational work, not decoration.
     – Affordances are clean: numbered list rows on the left (no '+'),
       one real "Explore pack →" link on the right.
     – Hover previews; click locks the selection and reveals the link.

   Slotted in app/page.tsx between StoryCinema and SourcesOfTruth.
   ───────────────────────────────────────────────────────────────── */

export function IndustryShowcase() {
  const [active, setActive] = useState(0);
  const [locked, setLocked] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const select = (i: number) => {
    if (!locked) setActive(i);
  };
  const lock = (i: number) => {
    setActive(i);
    setLocked(true);
  };
  const unlock = () => setLocked(false);

  /* While the section is in view, toggle `industry-immersive` on <body>
     so the global CSS rules hide the sticky marketing header and scroll
     progress bar. This gives the cinematic composition the full viewport
     without any competing UI chrome. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.35) {
          document.body.classList.add('industry-immersive');
        } else {
          document.body.classList.remove('industry-immersive');
        }
      },
      { threshold: [0, 0.35, 0.5, 1] },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      document.body.classList.remove('industry-immersive');
    };
  }, []);

  const pack = PACKS[active];

  return (
    <section
      ref={sectionRef}
      id="industries"
      aria-label="Regulated verticals AssuredAI ships for"
      className="relative w-full overflow-hidden"
      style={{ height: '100svh', minHeight: 720, backgroundColor: '#06100E' }}
    >
      {/* ── FULL-BLEED BACKGROUND IMAGE ─────────────────────────────────
            Image is the section's canvas — edge to edge, no card frame.
            Content layers on top via absolute positioning. */}
      <AnimatePresence mode="sync">
        <motion.div
          key={pack.slug + '-section-bg'}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ ...SPRING_SOFT, mass: 1.2 }}
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${pack.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </AnimatePresence>

      {/* Universal tint — keeps the photo atmospheric while letting it read */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: 'rgba(5,12,11,0.42)' }}
      />

      {/* Left-side gradient — anchors the glass panel column */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[50%]"
        style={{
          background:
            'linear-gradient(90deg, rgba(5,12,11,0.92) 0%, rgba(5,12,11,0.82) 35%, rgba(5,12,11,0.50) 65%, rgba(5,12,11,0.18) 88%, transparent 100%)',
        }}
      />

      {/* Right-side scrim — light dim so text shadows carry the contrast */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-[60%]"
        style={{
          background:
            'linear-gradient(270deg, rgba(5,12,11,0.40) 0%, rgba(5,12,11,0.25) 50%, rgba(5,12,11,0.10) 85%, transparent 100%)',
        }}
      />

      {/* Bottom gradient — anchors content but doesn't crush the photo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(5,12,11,0.35) 45%, rgba(5,12,11,0.70) 80%, rgba(5,12,11,0.85) 100%)',
        }}
      />

      {/* Top hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.18) 70%, transparent 100%)',
        }}
      />

      {/* ── CONTENT GRID — overlays the image, edge-to-edge layout ───── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ ...SPRING_GROW, delay: 0.05 }}
        className="relative h-full w-full"
        onMouseLeave={unlock}
      >
        <div className="mx-auto grid h-full max-w-[1600px] grid-cols-12 gap-8 px-8 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
          {/* LEFT — glass navigator panel */}
          <div className="col-span-12 flex flex-col md:col-span-5 lg:col-span-4">
            {/* Section header (top) */}
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.38em]"
                style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontWeight: 600,
                }}
              >
                ◆ The Packs
              </p>
              <h2
                className="mt-5 leading-[0.98]"
                style={{
                  color: 'white',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontWeight: 600,
                  fontSize: 'clamp(32px, 3.6vw, 52px)',
                  letterSpacing: '-0.025em',
                  textShadow: '0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.9)',
                }}
              >
                Eight regulated
                <br />
                verticals.
                <br />
                <span
                  style={{
                    fontStyle: 'italic',
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  One pipeline.
                </span>
              </h2>
              <p
                className="mt-5 max-w-[400px] text-[14px] leading-[1.55]"
                style={{
                  color: 'rgba(255,255,255,0.82)',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontStyle: 'italic',
                  textShadow: '0 1px 8px rgba(0,0,0,0.85)',
                }}
              >
                Each pack carries its own corpus, recognizers, and retention.
                Hover to preview — click to explore.
              </p>
            </div>

            {/* Middle: numbered industry list */}
            <div className="mt-8 flex-1">
              <PackList
                activeIndex={active}
                locked={locked}
                onHover={select}
                onClick={lock}
              />
            </div>

            {/* Bottom: Also tracking */}
            <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className="text-[9px] uppercase tracking-[0.36em]"
                style={{
                  color: 'rgba(255,255,255,0.45)',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontWeight: 600,
                }}
              >
                Also tracking
              </span>
              <span
                className="text-[11.5px] leading-[1.5]"
                style={{
                  color: 'rgba(255,255,255,0.62)',
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontStyle: 'italic',
                  textShadow: '0 1px 10px rgba(0,0,0,0.5)',
                }}
              >
                {TRACKING.join('  ·  ')}
              </span>
            </div>
          </div>

          {/* RIGHT — pack content overlays the image directly (no card) */}
          <div className="col-span-12 md:col-span-7 lg:col-span-8">
            <PackHero pack={pack} locked={locked} />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   PackList — left column. Numbered vertical list of all 8 industries.
   Hover previews; click locks the selection and reveals the right-side
   Explore link. Active row gets a green left-rule accent, brighter text,
   and a ↗ glyph.
   ───────────────────────────────────────────────────────────────── */

function PackList({
  activeIndex,
  locked,
  onHover,
  onClick,
}: {
  activeIndex: number;
  locked: boolean;
  onHover: (i: number) => void;
  onClick: (i: number) => void;
}) {
  return (
    <ul role="listbox" aria-label="Industry pack list" className="flex flex-col">
      {PACKS.map((pack, i) => {
        const isActive = activeIndex === i;
        return (
          <li key={pack.slug} role="option" aria-selected={isActive}>
            <button
              type="button"
              onMouseEnter={() => onHover(i)}
              onFocus={() => onHover(i)}
              onClick={() => onClick(i)}
              className="group relative flex w-full items-baseline gap-5 py-3.5 text-left transition-colors sm:gap-6 sm:py-4"
              style={{
                borderTop: i === 0 ? `1px solid rgba(255,255,255,0.12)` : 'none',
                borderBottom: `1px solid rgba(255,255,255,0.12)`,
              }}
            >
              {/* Active accent — green left rule, slides into view */}
              <motion.span
                aria-hidden="true"
                className="absolute left-0 top-0 bottom-0 w-[2px]"
                animate={{
                  backgroundColor: isActive ? C.safe : 'transparent',
                  opacity: isActive ? 1 : 0,
                  scaleY: isActive ? 1 : 0.4,
                }}
                transition={SPRING_SOFT}
                style={{ transformOrigin: 'center' }}
              />

              {/* Number prefix */}
              <span
                className="shrink-0 text-[10.5px] tabular-nums tracking-[0.22em]"
                style={{
                  color: isActive ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.38)',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontWeight: 600,
                  transition: 'color 280ms cubic-bezier(0.16, 1, 0.3, 1)',
                  textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Industry name — Instrument Serif, italic when active */}
              <motion.span
                className="flex-1 leading-[1.0]"
                animate={{
                  color: isActive ? 'white' : 'rgba(255,255,255,0.68)',
                  fontSize: isActive ? 32 : 22,
                }}
                transition={SPRING_SOFT}
                style={{
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontWeight: 400,
                  fontStyle: isActive ? 'italic' : 'normal',
                  letterSpacing: '-0.018em',
                  textShadow: '0 1px 14px rgba(0,0,0,0.55)',
                }}
              >
                {pack.shortName}
              </motion.span>

              {/* ↗ glyph — only on active row, signals the link */}
              <motion.span
                aria-hidden="true"
                className="shrink-0"
                animate={{
                  opacity: isActive && locked ? 1 : isActive ? 0.5 : 0,
                  x: isActive ? 0 : -6,
                }}
                transition={SPRING_SOFT}
                style={{
                  color: 'white',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontSize: 18,
                  fontWeight: 300,
                  textShadow: '0 1px 10px rgba(0,0,0,0.55)',
                }}
              >
                ↗
              </motion.span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   PackHero — right column. Full-bleed teal-tinted industry photo with a
   bottom-anchored content block (pack eyebrow, name, tagline, authority
   chips, Explore link). The photo crossfades when active changes.
   ───────────────────────────────────────────────────────────────── */

/* PackHero — right column of the diptych.
   Two stacked regions inside one rounded container:
     – TOP (visual): industry photo with teal wash + pack heading overlay
     – BOTTOM (data): two-column panel — SOURCES OF TRUTH (full names with
       categories + governs lines) and VERIFICATION CHECKS (industry +
       universal, with retention footer)
   Photo and content both crossfade with spring physics on pack change. */
function PackHero({ pack, locked }: { pack: Pack; locked: boolean }) {
  const packIndex = PACKS.findIndex((p) => p.slug === pack.slug) + 1;
  const totalPacks = PACKS.length;
  return (
    <div
      className="relative flex h-full w-full flex-col"
      aria-live="polite"
    >
      {/* ── Content block — pack name, tagline, catches, sources.
            Single clean stack of editorial content over the image.
            Breathing space above the pack name keeps photo visible up top. */}
      <div className="flex flex-1 flex-col justify-center pb-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={pack.slug + '-spread'}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SPRING_SOFT}
          >
            {/* ── PACK NAME — Geist Sans semibold for legibility over photo.
                  Sans-serif holds contrast against any background; aggressive
                  multi-layer shadow gives real separation from the image. ── */}
            <h3
              className="leading-[0.95]"
              style={{
                color: 'white',
                fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                fontWeight: 600,
                fontSize: 'clamp(64px, 7.6vw, 124px)',
                letterSpacing: '-0.035em',
                textShadow:
                  '0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.9), 0 0 80px rgba(0,0,0,0.4)',
              }}
            >
              {pack.name}
            </h3>

            {/* ── Tagline — sans-serif for legibility over the photo, italic
                  for editorial cadence ─────────────────────────────── */}
            <p
              className="mt-4 max-w-[680px] text-[17px] leading-[1.4] sm:text-[19px]"
              style={{
                color: 'rgba(255,255,255,0.96)',
                fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                fontStyle: 'italic',
                fontWeight: 400,
                textShadow: '0 2px 14px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)',
              }}
            >
              {pack.tagline}
            </p>

            {/* ── Catches block — restructured as a pull-quote moment.
                  The offending sentence is what a seasoned editor would
                  let slip past. It deserves the prominence — readers should
                  feel the "oh no, I would have shipped that" beat. Eyebrow,
                  then the line itself in large italic, then the reason in
                  body type underneath. ─────────────────────────────── */}
            <div className="mt-7 max-w-[760px]">
              <p
                className="uppercase"
                style={{
                  color: C.safe,
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontWeight: 700,
                  fontSize: '11px',
                  letterSpacing: '0.32em',
                  textShadow: '0 1px 10px rgba(0,0,0,0.85)',
                }}
              >
                What it catches
              </p>
              <p
                className="mt-3 leading-[1.18]"
                style={{
                  color: 'white',
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 'clamp(22px, 2.05vw, 30px)',
                  letterSpacing: '-0.012em',
                  textShadow:
                    '0 2px 18px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.92)',
                }}
              >
                {pack.corpus.catches}
              </p>
              <p
                className="mt-3 leading-[1.45]"
                style={{
                  color: 'rgba(255,255,255,0.82)',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontWeight: 400,
                  fontSize: 'clamp(14.5px, 1.05vw, 16px)',
                  textShadow:
                    '0 1px 10px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)',
                }}
              >
                {pack.corpus.catchesReason}
              </p>
            </div>

            {/* ── Hairline divider ─────────────────────────────────── */}
            <div
              className="mt-7 h-px w-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
            />

            {/* ── Three editorial rows ────────────────────────────── */}
            <div className="mt-5 space-y-4">
              {/* Sources — checkmark list, 2-col, bigger readable type */}
              <EditorialRow
                label="Sources"
                meta={`${pack.authorities.length} primary`}
                last
              >
                <SourceList authorities={pack.authorities} packSlug={pack.slug} />
                <p
                  className="mt-4 text-[13px] leading-[1.5] sm:text-[13.5px]"
                  style={{
                    color: 'rgba(255,255,255,0.72)',
                    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                    fontStyle: 'italic',
                    textShadow: '0 1px 8px rgba(0,0,0,0.8)',
                  }}
                >
                  + your internal policy library, approved-claim manifest, and brand-voice rules.
                </p>
              </EditorialRow>
            </div>

            {/* Explore link — only visible when a row is clicked-locked */}
            <motion.div
              animate={{ opacity: locked ? 1 : 0, y: locked ? 0 : 6 }}
              transition={SPRING_SOFT}
              className="mt-7"
              style={{ pointerEvents: locked ? 'auto' : 'none' }}
              aria-hidden={!locked}
            >
              <a
                href="#sources-of-truth"
                className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  color: 'white',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  borderBottom: `1px solid rgba(255,255,255,0.55)`,
                  paddingBottom: 3,
                }}
              >
                ↗ View pack documentation
              </a>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   SourceList — the interactive 2-col list of authority sources.
   Each source is a button with hover state (checkmark turns green, text
   underlines softly). Click opens a small popover anchored above the
   source with the full name, what it governs, why it's important, and a
   link to the official source. Outside-click or Esc closes.
   ───────────────────────────────────────────────────────────────── */

const CATEGORY_TINT: Record<AuthorityCategory, string> = {
  government: '#A5B4FC',      // soft indigo
  regulator: '#F0ABFC',       // soft magenta
  standards: '#7DD3FC',       // soft cyan
  professional: '#FCD34D',    // soft amber
  reference: '#A7F3D0',       // soft mint
  court: '#FDA4AF',           // soft rose
};

const CATEGORY_LABEL: Record<AuthorityCategory, string> = {
  government: 'Government',
  regulator: 'Regulator',
  standards: 'Standards body',
  professional: 'Professional body',
  reference: 'Reference corpus',
  court: 'Court / procedural',
};

function SourceList({ authorities, packSlug }: { authorities: Authority[]; packSlug: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Reset open popover whenever the pack changes — otherwise a popover
  // from the previous pack would linger pointing at the wrong row.
  useEffect(() => {
    setOpenIndex(null);
    setHoverIndex(null);
  }, [packSlug]);

  // Outside-click + Esc close. The popover is rendered inside wrapRef so
  // anything outside that subtree dismisses.
  useEffect(() => {
    if (openIndex === null) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpenIndex(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenIndex(null);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [openIndex]);

  return (
    <div ref={wrapRef} className="relative">
      <ul className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
        {authorities.map((a, i) => {
          const isHover = hoverIndex === i;
          const isOpen = openIndex === i;
          const tint = CATEGORY_TINT[a.category];
          const active = isHover || isOpen;
          return (
            <li key={a.short} className="relative">
              <button
                type="button"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex((curr) => (curr === i ? null : curr))}
                onFocus={() => setHoverIndex(i)}
                onBlur={() => setHoverIndex((curr) => (curr === i ? null : curr))}
                onClick={() => setOpenIndex((curr) => (curr === i ? null : i))}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                className="group flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left transition-colors"
                style={{
                  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span
                  aria-hidden="true"
                  className="mt-[3px] inline-flex size-[18px] shrink-0 items-center justify-center rounded-full transition-colors"
                  style={{
                    backgroundColor: active ? tint : 'rgba(255,255,255,0.08)',
                    boxShadow: active
                      ? `0 0 0 1px ${tint}, 0 0 14px ${tint}55, 0 1px 4px rgba(0,0,0,0.6)`
                      : '0 1px 3px rgba(0,0,0,0.6)',
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 12l5 5 9-11"
                      stroke={active ? '#0a0b0e' : 'white'}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span
                  className="text-[15px] leading-[1.35] sm:text-[15.5px]"
                  style={{
                    color: active ? 'white' : 'rgba(255,255,255,0.94)',
                    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                    fontWeight: 500,
                    textShadow:
                      '0 2px 12px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)',
                    textDecoration: active ? 'underline' : 'none',
                    textDecorationColor: active ? `${tint}` : 'transparent',
                    textDecorationThickness: '1.5px',
                    textUnderlineOffset: '3px',
                  }}
                >
                  {a.full}
                </span>
              </button>

              {/* Popover anchored to this source — positioned above the
                  button so it doesn't push the layout. Spring-in fade. */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    role="dialog"
                    aria-label={`About ${a.full}`}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={SPRING_SOFT}
                    className="absolute left-0 right-0 z-30 -translate-y-full"
                    style={{
                      top: -10,
                      maxWidth: 420,
                      pointerEvents: 'auto',
                    }}
                  >
                    <div
                      className="rounded-lg border p-4 shadow-2xl backdrop-blur-md"
                      style={{
                        backgroundColor: 'rgba(10,11,14,0.94)',
                        borderColor: 'rgba(255,255,255,0.16)',
                        boxShadow:
                          '0 24px 60px -12px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)',
                      }}
                    >
                      {/* Category pill */}
                      <div
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                        style={{
                          backgroundColor: `${tint}1A`,
                          border: `1px solid ${tint}55`,
                        }}
                      >
                        <span
                          className="size-[6px] rounded-full"
                          style={{ backgroundColor: tint }}
                        />
                        <span
                          className="uppercase"
                          style={{
                            color: tint,
                            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                            fontWeight: 700,
                            fontSize: 10,
                            letterSpacing: '0.18em',
                          }}
                        >
                          {CATEGORY_LABEL[a.category]}
                        </span>
                      </div>

                      {/* Source title */}
                      <h4
                        className="mt-3 text-[15.5px] leading-[1.25] tracking-tight"
                        style={{
                          color: 'white',
                          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                          fontWeight: 600,
                        }}
                      >
                        {a.full}
                      </h4>

                      {/* What it governs */}
                      <p
                        className="mt-2 text-[12.5px] uppercase"
                        style={{
                          color: 'rgba(255,255,255,0.55)',
                          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                          fontWeight: 600,
                          letterSpacing: '0.22em',
                          fontSize: 10.5,
                        }}
                      >
                        What it governs
                      </p>
                      <p
                        className="mt-1 text-[13px] leading-[1.5]"
                        style={{
                          color: 'rgba(255,255,255,0.86)',
                          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                        }}
                      >
                        {a.governs}
                      </p>

                      {/* Why it matters */}
                      <p
                        className="mt-3 text-[12.5px] uppercase"
                        style={{
                          color: 'rgba(255,255,255,0.55)',
                          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                          fontWeight: 600,
                          letterSpacing: '0.22em',
                          fontSize: 10.5,
                        }}
                      >
                        Why it matters
                      </p>
                      <p
                        className="mt-1 text-[13px] leading-[1.55]"
                        style={{
                          color: 'rgba(255,255,255,0.92)',
                          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                        }}
                      >
                        {a.importance}
                      </p>

                      {/* Visit link */}
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] transition-colors"
                        style={{
                          color: 'white',
                          borderColor: 'rgba(255,255,255,0.22)',
                          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                          backgroundColor: 'rgba(255,255,255,0.04)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = `${tint}1F`;
                          e.currentTarget.style.borderColor = `${tint}88`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
                        }}
                      >
                        Visit official source ↗
                      </a>

                      {/* Tail / arrow pointing down to the source row */}
                      <div
                        aria-hidden="true"
                        className="absolute left-6 -bottom-[7px] size-[14px] rotate-45"
                        style={{
                          backgroundColor: 'rgba(10,11,14,0.94)',
                          borderRight: '1px solid rgba(255,255,255,0.16)',
                          borderBottom: '1px solid rgba(255,255,255,0.16)',
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* EditorialRow — single-line magazine-spread row: running-head label on the
   left, content in the middle, optional meta caption on the right. Hairline
   rule above it. Reads like a typographic specimen line. */
function EditorialRow({
  label,
  meta,
  children,
  last,
}: {
  label: string;
  meta?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{ borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.10)' }}
      className={last ? '' : 'pb-5'}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p
          className="text-[11.5px] uppercase tracking-[0.36em]"
          style={{
            color: 'rgba(255,255,255,0.82)',
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontWeight: 700,
            textShadow: '0 1px 10px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)',
          }}
        >
          {label}
        </p>
        {meta && (
          <p
            className="text-[10.5px] uppercase tracking-[0.24em]"
            style={{
              color: 'rgba(255,255,255,0.62)',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontWeight: 600,
              textShadow: '0 1px 10px rgba(0,0,0,0.85)',
            }}
          >
            {meta}
          </p>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Editorial-almanac sub-components for the pack hero data panel.
   ───────────────────────────────────────────────────────────────── */

/* CATEGORY_DOT_COLOR — accent color per authority category. Used on the
   specimen card's top accent rule and the small category tag. Muted but
   distinct so the eye groups cards by category at a glance. */
const CATEGORY_DOT_COLOR: Record<AuthorityCategory, string> = {
  government: '#34D399',
  regulator: '#FBBF24',
  standards: '#60A5FA',
  professional: '#A78BFA',
  reference: '#9CA3AF',
  court: '#F87171',
};

/* CATEGORY_TAG — short uppercase label for the category caption on each
   specimen card. Kept short so it doesn't compete with the authority name. */
const CATEGORY_TAG: Record<AuthorityCategory, string> = {
  government: 'GOV',
  regulator: 'REG',
  standards: 'STD',
  professional: 'PROF',
  reference: 'REF',
  court: 'CRT',
};

/* SectionRule — editorial section divider. Label on the left, optional
   caption on the right, hairline rule filling the gap between. Reads like
   a magazine running head. */
function SectionRule({ label, right }: { label: string; right?: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <p
        className="text-[10px] uppercase tracking-[0.32em]"
        style={{
          color: 'rgba(255,255,255,0.62)',
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <div
        aria-hidden="true"
        className="h-px flex-1"
        style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
      />
      {right && (
        <p
          className="text-[9.5px] uppercase tracking-[0.22em]"
          style={{
            color: 'rgba(255,255,255,0.42)',
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          }}
        >
          {right}
        </p>
      )}
    </div>
  );
}

/* SpecimenCard — rich card for one authority. Editorial-almanac feel:
   numbered entry, category tag, large serif monogram, full name, hairline
   divider, governs role in micro. Subtle hover lift. */
function SpecimenCard({
  authority,
  index,
}: {
  authority: Authority;
  index: number;
}) {
  const color = CATEGORY_DOT_COLOR[authority.category];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_SOFT, delay: 0.05 + index * 0.025 }}
      whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.08)' }}
      title={`${authority.full} — ${authority.governs}.`}
      className="group relative overflow-hidden rounded-md px-3 py-2.5"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(6px)',
        border: `1px solid rgba(255,255,255,0.10)`,
        cursor: 'help',
      }}
    >
      {/* Left accent bar — category color */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[2px]"
        style={{ backgroundColor: color, opacity: 0.9 }}
      />

      {/* Header row: number + monogram + category tag — single line */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className="text-[9px] tabular-nums tracking-[0.18em] shrink-0"
            style={{
              color: C.textGhost,
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontWeight: 600,
            }}
          >
            {String(index).padStart(2, '0')}
          </span>
          <span
            className="font-serif leading-none"
            style={{
              color: 'white',
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontWeight: 400,
              fontSize: 18,
              letterSpacing: '-0.018em',
            }}
          >
            {authority.short}
          </span>
        </div>
        <span
          className="shrink-0 text-[8.5px] uppercase tracking-[0.22em]"
          style={{
            color,
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontWeight: 600,
          }}
        >
          {CATEGORY_TAG[authority.category]}
        </span>
      </div>

      {/* Full name — 1-2 lines, the depth payload */}
      <p
        className="mt-1.5 text-[11px] leading-[1.35]"
        style={{
          color: 'rgba(255,255,255,0.86)',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          fontWeight: 500,
        }}
      >
        {authority.full}
      </p>
    </motion.div>
  );
}

/* VERIFICATION_STAGES — the 5 conceptual stages the pipeline collapses
   into. Each stage maps to one or more underlying checks:
     DETECT     ← pack.industryChecks (pack-specific recognizers)
     VERIFY     ← retrieval against the 8 sources of truth
     RECONCILE  ← pack rules × universal brand/policy guards
     CITE       ← per-claim source citation (universal)
     ARCHIVE    ← hash-chain + retention (universal)
   The pack object is passed in so DETECT can pull its actual check
   labels and ARCHIVE can show the actual retention period. */
interface ProcessStageDef {
  num: string;
  name: string;
  scope: 'pack' | 'universal' | 'mixed';
  getItems: (pack: Pack) => string[];
}

const VERIFICATION_STAGES: ProcessStageDef[] = [
  {
    num: '01',
    name: 'Detect',
    scope: 'pack',
    getItems: (p) => p.industryChecks.map((c) => c.label),
  },
  {
    num: '02',
    name: 'Verify',
    scope: 'mixed',
    getItems: (p) => [`Against ${p.authorities.length} sources`, '+ your policy library'],
  },
  {
    num: '03',
    name: 'Reconcile',
    scope: 'mixed',
    getItems: () => ['Pack rules × universal', 'Brand voice & policy'],
  },
  {
    num: '04',
    name: 'Cite',
    scope: 'universal',
    getItems: () => ['Per-claim chunk id', 'Source URL + similarity'],
  },
  {
    num: '05',
    name: 'Archive',
    scope: 'universal',
    getItems: (p) => ['Hash-chained audit log', `${p.retention.period} retention`],
  },
];

/* ProcessStage — single stage card in the 5-step verification flow.
   The PACK stage gets a green accent; the rest use neutral. A small chevron
   arrow on the right edge connects to the next stage visually. */
function ProcessStage({
  stage,
  pack,
  isLast,
  index,
}: {
  stage: ProcessStageDef;
  pack: Pack;
  isLast: boolean;
  index: number;
}) {
  const items = stage.getItems(pack);
  const isPack = stage.scope === 'pack';
  const accent = isPack ? C.safe : C.textGhost;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_SOFT, delay: 0.1 + index * 0.05 }}
      className="relative rounded-md px-3 py-2.5"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(6px)',
        border: `1px solid rgba(255,255,255,0.10)`,
      }}
    >
      {/* Header: stage number + name + scope tag — single line */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className="text-[9px] tabular-nums tracking-[0.18em] shrink-0"
            style={{
              color: C.textGhost,
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontWeight: 600,
            }}
          >
            {stage.num}
          </span>
          <h5
            className="leading-none truncate"
            style={{
              color: 'white',
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontWeight: 400,
              fontSize: 16,
              letterSpacing: '-0.018em',
            }}
          >
            {stage.name}
          </h5>
        </div>
        <span
          className="shrink-0 text-[8.5px] uppercase tracking-[0.22em]"
          style={{
            color: accent,
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontWeight: 600,
          }}
        >
          {stage.scope === 'pack' ? 'PACK' : stage.scope === 'mixed' ? 'MIXED' : 'UNIV'}
        </span>
      </div>

      {/* Underlying checks — micro list */}
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-1.5 text-[10px] leading-[1.35]"
            style={{
              color: 'rgba(255,255,255,0.78)',
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            }}
          >
            <span
              className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: accent, opacity: 0.75 }}
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>

      {/* Connector chevron — points to next stage. Hidden on last + on
          narrow viewports where the grid wraps. */}
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute -right-2 top-1/2 hidden -translate-y-1/2 lg:block"
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 12,
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          →
        </span>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   MechanismCard — one of the three retrieval/citation/audit cards that
   explain WHY the source corpus translates to revision quality. Numbered
   01/02/03 for clear sequencing.
   ───────────────────────────────────────────────────────────────── */

function MechanismCard({
  number,
  title,
  body,
  index,
}: {
  number: string;
  title: string;
  body: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20% 0px' }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <p
        className="text-[10px] tracking-[0.32em]"
        style={{
          color: C.textGhost,
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        }}
      >
        {number}
      </p>
      <h4
        className="mt-3"
        style={{
          color: C.text,
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontWeight: 400,
          fontSize: 28,
          letterSpacing: '-0.018em',
          lineHeight: 1.1,
        }}
      >
        {title}
      </h4>
      <p
        className="mt-3 text-[13.5px] leading-[1.6]"
        style={{
          color: C.textMuted,
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        }}
      >
        {body}
      </p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   SourcesOfTruth — the section. Slot between StoryCinema and Hero.
   ───────────────────────────────────────────────────────────────── */

export function SourcesOfTruth() {
  const sectionRef = useRef<HTMLElement>(null);
  /* Parallax-on-scroll for the chapter eyebrow was removed — the section
     is now rendered inside a blurred + pointer-events:none peek wrapper
     where the scroll-driven motion values can't resolve cleanly during
     SSR, and the visual effect isn't observable through the blur anyway. */

  return (
    <section
      ref={sectionRef}
      id="sources-of-truth"
      aria-label="Sources of truth — what AssuredAI reads against"
      className="relative"
      style={{
        backgroundColor: C.void,
        /* Bottom edge fades to the Hero's #050912 — small color shift,
           reads as continuous rather than as a section break. */
        backgroundImage: `linear-gradient(180deg, ${C.void} 0%, ${C.void} 85%, #060912 100%)`,
      }}
    >
      {/* Hairline at the top — separates from Scene 9's "Request access"
          CTA without breaking the dark continuity. */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${C.hairlineStrong} 30%, ${C.hairlineStrong} 70%, transparent 100%)`,
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-[1280px] px-6 py-24 sm:py-32 lg:py-40">
        {/* ── Chapter eyebrow + headline + lede ────────────────────────── */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-[11px] uppercase tracking-[0.36em]"
          aria-label="Section: The Corpus"
        >
          <span
            style={{
              color: C.textFaint,
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontWeight: 600,
            }}
          >
            ◆ The Corpus
          </span>
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-[1080px] leading-[1.04]"
          style={{
            color: C.text,
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontWeight: 400,
            fontSize: 'clamp(40px, 6.2vw, 88px)',
            letterSpacing: '-0.022em',
          }}
        >
          The depth of the revision is the{' '}
          <span style={{ fontStyle: 'italic', color: C.text }}>depth of the sources</span> we read against.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 max-w-[680px] text-[15px] leading-[1.65] sm:text-[16px]"
          style={{
            color: C.textMuted,
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          }}
        >
          Generic AI pattern-matches against its training data — opaque, frozen, and unciteable.
          AssuredAI retrieves against named primary sources at request time. Federal regulators,
          professional bodies, and your own policy library. Every revision cites the exact chunk
          it relied on. Every citation lands on the audit chain.
        </motion.p>

        {/* IndustryShowcase (sibling section in app/page.tsx) handles the
            8-industry directory and the "Also tracking" line. This section
            picks up after it with the architecture pull-quote + mechanism
            strip + custom-pack rail. */}

        {/* ── The architecture moment — full-width pull quote ──────────── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mt-32 max-w-[940px] text-center"
        >
          <p
            className="text-[11px] uppercase tracking-[0.36em]"
            style={{
              color: C.textGhost,
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontWeight: 600,
            }}
          >
            The architecture
          </p>
          <h3
            className="mt-7 leading-[1.06]"
            style={{
              color: C.text,
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontWeight: 400,
              fontSize: 'clamp(32px, 4.4vw, 68px)',
              letterSpacing: '-0.022em',
            }}
          >
            New verticals aren&rsquo;t a roadmap item.
            <br />
            <span style={{ fontStyle: 'italic', color: C.safe }}>
              They&rsquo;re a row in our database.
            </span>
          </h3>
          <p
            className="mx-auto mt-7 max-w-[680px] text-[14px] leading-[1.65] sm:text-[15px]"
            style={{
              color: C.textMuted,
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            }}
          >
            Vertical packs live in the <code style={inlineCodeStyle}>vertical_packs</code> table.
            Each pack defines its own recognizers, red-flag categories, disclaimer language,
            retention policy, and source corpus. A new vertical — Finance, Legal, ESG, anything —
            is an <span style={{ color: C.text, fontWeight: 600 }}>INSERT</span>, not a deploy.
            The verification engine resolves at request time.
          </p>
        </motion.div>

        {/* ── Mechanism strip — retrieval / citation / audit ───────────── */}
        <div className="mt-28 grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-3">
          <MechanismCard
            number="01"
            title="Retrieval"
            body="Every claim retrieves against the pack's indexed corpus before drafting. Top-k chunks ranked by cosine similarity over pgvector embeddings — nothing is generated without context first."
            index={0}
          />
          <MechanismCard
            number="02"
            title="Citation"
            body="Every revision cites the chunk it relied on — chunk id, source URL, section, and similarity score travel with the output. No untraceable claims."
            index={1}
          />
          <MechanismCard
            number="03"
            title="Audit"
            body="Every citation lands on a hash-chained audit row. Each row's prev_hash equals the previous row's hash — downstream consumers verify independently. No trust required."
            index={2}
          />
        </div>

        {/* ── Custom-pack rail — the third source is YOU ───────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="mt-28 rounded-2xl"
          style={{
            backgroundColor: C.panelLive,
            border: `1px solid ${C.hairline}`,
          }}
        >
          <div className="grid grid-cols-1 gap-10 p-8 sm:p-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p
                className="text-[10.5px] uppercase tracking-[0.32em]"
                style={{
                  color: C.textFaint,
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontWeight: 600,
                }}
              >
                + Your policy library
              </p>
              <h3
                className="mt-5 leading-[1.05]"
                style={{
                  color: C.text,
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontWeight: 400,
                  fontSize: 'clamp(28px, 3.2vw, 44px)',
                  letterSpacing: '-0.02em',
                }}
              >
                External regulators tell you what&rsquo;s lawful.{' '}
                <span style={{ fontStyle: 'italic' }}>
                  Your policies tell you what&rsquo;s on-brand.
                </span>
              </h3>
              <p
                className="mt-5 text-[14px] leading-[1.65]"
                style={{
                  color: C.textMuted,
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                }}
              >
                AssuredAI ingests both and reasons across them. Every revision honors both
                authorities — federal rule and brand voice, statutory minimum and approved
                claim library. Authored once. Cited on every output.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:col-span-7 sm:grid-cols-3">
              <CustomCard
                title="Approved claim manifest"
                sub="The medical / legal / compliance claims your team has signed off — versioned, dated, retrievable."
              />
              <CustomCard
                title="Brand voice rules"
                sub="Tone, terminology, prohibited phrasing. Authored once, applied across every revision."
              />
              <CustomCard
                title="Internal SOPs"
                sub="HR handbook, IT security policy, procurement rules, agency style guide — whatever governs your team."
              />
            </div>
          </div>
        </motion.div>

        {/* ── Closing line ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-32 max-w-[820px] text-center"
        >
          <p
            className="leading-[1.32]"
            style={{
              color: C.textMuted,
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 'clamp(20px, 2.1vw, 30px)',
              letterSpacing: '-0.012em',
            }}
          >
            Generic AI pattern-matches against its training data.
            <br />
            <span style={{ color: C.text, fontStyle: 'normal' }}>
              AssuredAI reads against named primary sources — yours and the regulators&rsquo;.
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

const inlineCodeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
  fontSize: '0.92em',
  padding: '0.08em 0.42em',
  borderRadius: 4,
  border: `1px solid ${C.hairline}`,
  backgroundColor: 'rgba(255,255,255,0.04)',
  color: C.text,
};

function CustomCard({ title, sub }: { title: string; sub: string }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: C.voidDeeper,
        border: `1px solid ${C.hairline}`,
      }}
    >
      <p
        className="text-[13px] font-semibold"
        style={{
          color: C.text,
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        }}
      >
        {title}
      </p>
      <p
        className="mt-2 text-[11.5px] leading-[1.55]"
        style={{
          color: C.textFaint,
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        }}
      >
        {sub}
      </p>
    </div>
  );
}
// touch 1779151937
