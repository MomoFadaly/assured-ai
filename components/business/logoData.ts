/**
 * Logo URL registry for the /business brief.
 * Sources: Simple Icons CDN (color-controllable monochrome) + Google favicons
 * (domain-based fallback) + Wikipedia Commons (institutional seals).
 *
 * All sources are CSP-allowed via next.config.ts.
 */

import { googleFaviconUrl, simpleIconUrl, wikiCommonsUrl } from './logoUrls';

// ─────────────────────────────────────────────────────────────────────────
// Fueled-named client logos (Hero strip + ICP proof points)
// ─────────────────────────────────────────────────────────────────────────

export const FUELED_CLIENTS = {
  mayoClinic: {
    src: wikiCommonsUrl('c/c3/Mayo_Clinic_logo.svg'),
    alt: 'Mayo Clinic',
    href: 'https://www.mayoclinic.org/',
  },
  clevelandClinic: {
    src: wikiCommonsUrl('f/fb/Cleveland_Clinic_logo.svg'),
    alt: 'Cleveland Clinic',
    href: 'https://my.clevelandclinic.org/',
  },
  stanfordMedicine: {
    src: wikiCommonsUrl('7/73/Stanford_School_of_Medicine_Logo.jpg'),
    alt: 'Stanford Medicine',
    href: 'https://med.stanford.edu/',
  },
  kff: {
    src: wikiCommonsUrl('1/18/Kaiser_Family_Foundation_Logo.svg'),
    alt: 'KFF (Kaiser Family Foundation)',
    href: 'https://www.kff.org/',
  },
  harvardChan: {
    src: wikiCommonsUrl('7/70/Harvard_University_logo.svg'),
    alt: 'Harvard T.H. Chan School of Public Health',
    href: 'https://hsph.harvard.edu/',
  },
  vidaHealth: {
    src: googleFaviconUrl('vida.com'),
    alt: 'Vida Health',
    href: 'https://www.vida.com/',
  },
  wcgClinical: {
    src: googleFaviconUrl('wcgclinical.com'),
    alt: 'WCG Clinical',
    href: 'https://www.wcgclinical.com/',
  },
  floreyInstitute: {
    src: googleFaviconUrl('florey.edu.au'),
    alt: 'The Florey Institute of Neuroscience & Mental Health',
    href: 'https://www.florey.edu.au/',
  },
  whiteHouse: {
    src: wikiCommonsUrl('3/36/Seal_of_the_President_of_the_United_States.svg'),
    alt: 'The White House',
    href: 'https://www.whitehouse.gov/',
  },
  californiaDMV: {
    src: googleFaviconUrl('dmv.ca.gov'),
    alt: 'California DMV',
    href: 'https://www.dmv.ca.gov/',
  },
  calMatters: {
    src: googleFaviconUrl('calmatters.org'),
    alt: 'CalMatters',
    href: 'https://calmatters.org/',
  },
  politico: {
    src: wikiCommonsUrl('5/57/Politico-logo_2024_red.svg'),
    alt: 'POLITICO',
    href: 'https://www.politico.com/',
  },
  lumaVision: {
    src: googleFaviconUrl('lumavision.com'),
    alt: 'LUMA Vision',
    href: 'https://www.lumavision.com/',
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Regulator seals (§02 Stakes)
// ─────────────────────────────────────────────────────────────────────────

export const REGULATORS = {
  hhs: {
    src: wikiCommonsUrl('7/79/Seal_of_the_United_States_Department_of_Health_and_Human_Services.svg'),
    alt: 'HHS / Office for Civil Rights',
    href: 'https://www.hhs.gov/ocr/',
  },
  finra: {
    src: googleFaviconUrl('finra.org'),
    alt: 'FINRA',
    href: 'https://www.finra.org/',
  },
  sec: {
    src: wikiCommonsUrl('1/1c/Seal_of_the_United_States_Securities_and_Exchange_Commission.svg'),
    alt: 'U.S. Securities and Exchange Commission',
    href: 'https://www.sec.gov/',
  },
  fda: {
    src: wikiCommonsUrl('7/7d/Food_and_Drug_Administration_logo.svg'),
    alt: 'FDA Office of Prescription Drug Promotion',
    href: 'https://www.fda.gov/',
  },
  ftc: {
    src: googleFaviconUrl('ftc.gov'),
    alt: 'Federal Trade Commission',
    href: 'https://www.ftc.gov/',
  },
  euAiAct: {
    src: googleFaviconUrl('europa.eu'),
    alt: 'EU AI Act',
    href: 'https://artificialintelligenceact.eu/',
  },
};

// ─────────────────────────────────────────────────────────────────────────
// 2024 enforcement-named firms (§02 named-firm grid)
// ─────────────────────────────────────────────────────────────────────────

// Each firm's `href` points to the PRIMARY-SOURCE document that names
// the firm by name — not aggregator articles. Verified URL-by-URL via
// web search content extraction (May 2026). The logos themselves come
// from Wikipedia Commons (CC-licensed) where a high-quality SVG/JPG
// exists; smaller firms fall back to Google favicons at sz=256.
//
// Verified primary sources by regulator:
//   • FDA OPDP letters (5 of 5) → fda.gov/media/{ID}/download (the
//     actual untitled letter PDF on FDA's servers)
//   • HHS OCR settlements → hhs.gov/about/news/{date} press releases
//     (the official HHS press release naming the firm + penalty)
//   • FTC HBNR GoodRx → ftc.gov/news-events/... press release
//   • SEC Marketing Rule sweep (RBA + Abacus) → SEC press release
//     2024-121, which names both firms with penalty amounts
//   • UnitedHealth nH Predict → Bank Info Security article naming
//     UnitedHealth, nH Predict, and the Lokken case (Reuters URL was
//     restricted by browser; substituted with verified equivalent)
//
// (HMR nudge 2026-05-19 — tooltip fields added below.)
//
// Each entry in NAMED_2024_FIRMS_{DIRECT,ADJACENT} carries a `tooltip`
// string containing the destination-page title verified via the
// browser. The LogoTile reads this to render a hover-card showing
// where the click will land.
// SCOPING NOTE — the firms below are split into two cohorts because
// the brief's intellectual-honesty test requires it: AssuredAI does
// NOT prevent every kind of regulatory failure. The DIRECT cohort
// shipped misleading or unsubstantiated content — exactly what a
// content-verification gate is built to catch. The ADJACENT cohort
// was penalized for vectors outside AssuredAI's scope (insider EHR
// theft, phishing-based ePHI exposure, tracking-pixel data leakage,
// payer-ops AI claim-denial). They're named for context, not as
// claimed wins for the product.

// ── DIRECT PREVENTION (7 firms) ───────────────────────────────────────────
// These 7 firms shipped content a verification layer was designed to
// catch — unsupported efficacy claims, missing risk information,
// untrue statements, missing disclosures, comparative claims without
// head-to-head data. An AssuredAI-style verification gate on the
// drafting workflow would have surfaced each issue pre-publication.
export const NAMED_2024_FIRMS_DIRECT = {
  // FDA OPDP — 5 untitled letters in 2024 (links go to FDA letter PDFs).
  // `tooltip` field is the actual destination-page title, verified by
  // opening each PDF in the browser. The tooltip shows on hover and
  // confirms to the reader where the click will take them.
  novartis: {
    src: wikiCommonsUrl('6/68/Novartis-Logo.svg'),
    alt: 'Novartis (Kisqali — FDA OPDP untitled letter)',
    href: 'https://www.fda.gov/media/175584/download',
    tooltip: 'FDA OPDP — Untitled Letter Kisqali (Novartis)',
    name: 'Novartis',
    actionLabel: 'FDA OPDP — Kisqali',
    summary:
      "DTC TV ad claimed Kisqali “preserves quality of life” for breast-cancer patients. The trial didn’t measure that — FDA called the claim misleading.",
  },
  kaleo: {
    src: googleFaviconUrl('kaleopharma.com'),
    alt: 'Kaleo (Auvi-Q — FDA OPDP untitled letter)',
    href: 'https://www.fda.gov/media/180350/download',
    tooltip: 'FDA OPDP — Untitled Letter Auvi-Q (Kaleo)',
    name: 'Kaleo',
    actionLabel: 'FDA OPDP — Auvi-Q',
    summary:
      'Influencer Instagram post promoted Auvi-Q (epinephrine for anaphylaxis) with zero risk information. FDA: a link to safety info isn’t the same as showing the risk.',
  },
  bms: {
    src: wikiCommonsUrl('5/56/Bristol-Myers_Squibb_logo.svg'),
    alt: 'Mirati Therapeutics / Bristol Myers Squibb (Krazati — FDA OPDP untitled letter)',
    href: 'https://www.fda.gov/media/180633/download',
    tooltip: 'FDA OPDP — Untitled Letter Krazati (Mirati / BMS)',
    name: 'Mirati / Bristol Myers Squibb',
    actionLabel: 'FDA OPDP — Krazati',
    summary:
      'Healthcare-provider website made composite-endpoint and brain-metastases claims for Krazati. FDA: the lung-cancer trial wasn’t designed to support either claim.',
  },
  abbvie: {
    src: wikiCommonsUrl('c/cc/AbbVie_logo.svg'),
    alt: 'AbbVie (Ubrelvy — FDA OPDP untitled letter)',
    href: 'https://www.fda.gov/media/181754/download',
    tooltip: 'FDA OPDP — Untitled Letter for Ubrelvy (AbbVie)',
    name: 'AbbVie',
    actionLabel: 'FDA OPDP — Ubrelvy',
    summary:
      'Serena Williams TV ad oversold Ubrelvy’s migraine benefits. FDA flagged both the unsupported claims and the celebrity-credibility amplification.',
  },
  merz: {
    src: wikiCommonsUrl('c/c5/Merz_Logo.jpg'),
    alt: 'Merz Pharmaceuticals (Xeomin — FDA OPDP untitled letter)',
    href: 'https://www.fda.gov/media/183512/download',
    tooltip: 'FDA OPDP — Xeomin Untitled Letter (Merz)',
    name: 'Merz Pharmaceuticals',
    actionLabel: 'FDA OPDP — Xeomin',
    summary:
      'Nate Berkus Instagram called Xeomin a “double-filtered smart tox” and a same-day fix. FDA: superiority and timing claims the trials never supported.',
  },

  // SEC Marketing Rule sweep — press release names both firms
  richardBernstein: {
    src: googleFaviconUrl('rbadvisors.com'),
    alt: 'Richard Bernstein Advisors ($295K — SEC Marketing Rule sweep)',
    href: 'https://www.sec.gov/newsroom/press-releases/2024-121',
    tooltip: 'SEC — Nine advisers charged in Marketing Rule sweep',
    name: 'Richard Bernstein Advisors',
    actionLabel: 'SEC Marketing Rule sweep',
    summary:
      'Marketing materials cited third-party ratings without the disclosures the SEC Marketing Rule requires. Civil penalty: $295,000.',
  },
  abacusPlanning: {
    src: googleFaviconUrl('abacusplanninggroup.com'),
    alt: 'Abacus Planning Group ($150K — SEC Marketing Rule sweep)',
    href: 'https://www.sec.gov/newsroom/press-releases/2024-121',
    tooltip: 'SEC — Nine advisers charged in Marketing Rule sweep',
    name: 'Abacus Planning Group',
    actionLabel: 'SEC Marketing Rule sweep',
    summary:
      'Ads made untrue statements about third-party ratings — a direct violation of the SEC Marketing Rule. Civil penalty: $150,000.',
  },
};

// ── ADJACENT HARMS (4 firms) ──────────────────────────────────────────────
// Named for context — these firms got penalized for vectors OUTSIDE
// AssuredAI's scope. They're shown so the reader sees the full
// enforcement landscape, not as claimed product wins.
//
//   • Montefiore — malicious-insider EHR theft (HIPAA audit-control
//     failure on the hospital's EHR; AssuredAI does not govern EHR
//     access controls).
//   • Solara — phishing → email-account compromise → ePHI exposure
//     (AssuredAI does not govern email security or breach-notification
//     timing).
//   • GoodRx — tracking-pixel data leakage to ad networks; HBNR
//     notification failure (AssuredAI does not govern web-tracking
//     telemetry or breach-notification cadence).
//   • UnitedHealth (nH Predict) — payer-ops AI denying medically
//     necessary care; allegations of ~90% reversal rate on appeal
//     (different AI layer entirely — claims adjudication, not
//     content generation).
export const NAMED_2024_FIRMS_ADJACENT = {
  unitedHealth: {
    src: wikiCommonsUrl('f/f3/UnitedHealth_Group_logo.svg'),
    alt: 'UnitedHealth Group (nH Predict AI class-action lawsuit, Lokken v. UnitedHealth, filed Nov 14 2023) — adjacent: payer-ops AI, not content',
    href: 'https://www.bankinfosecurity.com/court-unitedhealth-must-answer-for-ai-based-claim-denials-a-27534',
    tooltip: 'Court: UnitedHealth Must Answer for AI-Based Claim Denials (Bank Info Security)',
  },
  goodrx: {
    src: wikiCommonsUrl('2/22/GoodRx_logo.svg'),
    alt: 'GoodRx ($1.5M FTC HBNR civil penalty — Feb 1 2023) — adjacent: tracking-pixel data leakage, not content',
    href: 'https://www.ftc.gov/news-events/news/press-releases/2023/02/ftc-enforcement-action-bar-goodrx-sharing-consumers-sensitive-health-info-advertising',
    tooltip: 'FTC Enforcement Action to Bar GoodRx from Sharing Consumers’ Sensitive Health Info',
  },
  montefiore: {
    src: wikiCommonsUrl('9/97/Montefiore_logo.svg'),
    alt: 'Montefiore Medical Center ($4.75M HHS OCR settlement, Feb 6 2024) — adjacent: insider EHR theft, not content',
    href: 'https://www.hhs.gov/about/news/2024/02/06/hhs-office-civil-rights-settles-malicious-insider-cybersecurity-investigation.html',
    tooltip: 'HHS OCR Settles Malicious Insider Cybersecurity Investigation — $4.75M',
  },
  solara: {
    src: googleFaviconUrl('solaramedicalsupplies.com'),
    alt: 'Solara Medical Supplies ($3M HHS OCR settlement, Jan 14 2025) — adjacent: phishing-based ePHI exposure, not content',
    href: 'https://www.hhs.gov/about/news/2025/01/14/hhs-office-civil-rights-settles-hipaa-phishing-cybersecurity-investigation-solara-medical-supplies-3000000.html',
    tooltip: 'HHS OCR Settles HIPAA Phishing Investigation — Solara Medical Supplies, $3M',
  },
};

// Backward-compat alias — some other modules may still import the
// flat list. Re-exported as the union of the two cohorts.
export const NAMED_2024_FIRMS = {
  ...NAMED_2024_FIRMS_DIRECT,
  ...NAMED_2024_FIRMS_ADJACENT,
};

// ─────────────────────────────────────────────────────────────────────────
// AI-startup logos (§09 per-vertical accordions)
// ─────────────────────────────────────────────────────────────────────────

export const AI_STARTUPS = {
  // Healthcare
  abridge: { src: googleFaviconUrl('abridge.com'), alt: 'Abridge (AI medical scribe)', href: 'https://www.abridge.com/' },
  daxCopilot: { src: wikiCommonsUrl('c/c9/Nuance_Communications_logo_2018.svg'), alt: 'DAX Copilot (Nuance, Microsoft)', href: 'https://www.nuance.com/' },
  suki: { src: googleFaviconUrl('suki.ai'), alt: 'Suki AI', href: 'https://www.suki.ai/' },
  augmedix: { src: googleFaviconUrl('augmedix.com'), alt: 'Augmedix', href: 'https://www.augmedix.com/' },
  hippocraticAi: { src: googleFaviconUrl('hippocraticai.com'), alt: 'Hippocratic AI', href: 'https://www.hippocraticai.com/' },
  insitro: { src: googleFaviconUrl('insitro.com'), alt: 'Insitro (AI drug discovery)', href: 'https://insitro.com/' },
  recursion: { src: wikiCommonsUrl('5/5e/Recursion_Logo_Horizontal.png'), alt: 'Recursion Pharmaceuticals', href: 'https://www.recursion.com/' },
  atomwise: { src: googleFaviconUrl('atomwise.com'), alt: 'Atomwise', href: 'https://www.atomwise.com/' },
  benchSci: { src: wikiCommonsUrl('6/6f/BenchSci_Logo.png'), alt: 'BenchSci', href: 'https://www.benchsci.com/' },
  owkin: { src: wikiCommonsUrl('d/d0/Owkin_logo.svg'), alt: 'Owkin', href: 'https://www.owkin.com/' },

  // Finance
  bloombergGpt: { src: wikiCommonsUrl('a/aa/Bloomberg_L.P._logo.svg'), alt: 'BloombergGPT', href: 'https://www.bloomberg.com/' },
  alphaSense: { src: googleFaviconUrl('alpha-sense.com'), alt: 'AlphaSense', href: 'https://www.alpha-sense.com/' },
  wealthfront: { src: wikiCommonsUrl('6/69/Wealthfront_Logo.svg'), alt: 'Wealthfront AI', href: 'https://www.wealthfront.com/' },
  numerai: { src: googleFaviconUrl('numer.ai'), alt: 'Numerai', href: 'https://numer.ai/' },
  brex: { src: wikiCommonsUrl('f/f8/Brex_logo_black.svg'), alt: 'Brex AI', href: 'https://www.brex.com/' },

  // Legal
  harvey: { src: googleFaviconUrl('harvey.ai'), alt: 'Harvey AI', href: 'https://www.harvey.ai/' },
  evenUp: { src: googleFaviconUrl('evenuplaw.com'), alt: 'EvenUp', href: 'https://www.evenuplaw.com/' },
  spellbook: { src: googleFaviconUrl('spellbook.legal'), alt: 'Spellbook', href: 'https://www.spellbook.legal/' },
  ironclad: { src: googleFaviconUrl('ironcladapp.com'), alt: 'Ironclad AI', href: 'https://ironcladapp.com/' },
  lexisAi: { src: googleFaviconUrl('lexisnexis.com'), alt: 'Lexis+ AI', href: 'https://www.lexisnexis.com/' },
  casetext: { src: googleFaviconUrl('casetext.com'), alt: 'Casetext (Thomson Reuters)', href: 'https://casetext.com/' },

  // Insurance
  lemonade: { src: googleFaviconUrl('lemonade.com'), alt: 'Lemonade', href: 'https://www.lemonade.com/' },
  tractable: { src: googleFaviconUrl('tractable.ai'), alt: 'Tractable', href: 'https://tractable.ai/' },
  sproutAi: { src: googleFaviconUrl('sprout.ai'), alt: 'Sprout.ai', href: 'https://sprout.ai/' },
  capeAnalytics: { src: googleFaviconUrl('capeanalytics.com'), alt: 'Cape Analytics', href: 'https://capeanalytics.com/' },
  ladder: { src: googleFaviconUrl('ladderlife.com'), alt: 'Ladder', href: 'https://www.ladderlife.com/' },

  // Real Estate & Mortgage
  houseCanary: { src: googleFaviconUrl('housecanary.com'), alt: 'HouseCanary', href: 'https://www.housecanary.com/' },
  compass: { src: googleFaviconUrl('compass.com'), alt: 'Compass AI', href: 'https://www.compass.com/' },
  rocketMortgage: { src: googleFaviconUrl('rocketmortgage.com'), alt: 'Rocket Mortgage AI', href: 'https://www.rocketmortgage.com/' },
  betterMortgage: { src: googleFaviconUrl('better.com'), alt: 'Better.com AI', href: 'https://better.com/' },
  doma: { src: googleFaviconUrl('doma.com'), alt: 'Doma', href: 'https://www.doma.com/' },

  // Higher Education
  khanmigo: { src: googleFaviconUrl('khanacademy.org'), alt: 'Khan Academy (Khanmigo)', href: 'https://www.khanacademy.org/' },
  squirrelAi: { src: googleFaviconUrl('squirrelai.com'), alt: 'Squirrel AI', href: 'https://squirrelai.com/' },
  carnegieLearning: { src: googleFaviconUrl('carnegielearning.com'), alt: 'Carnegie Learning', href: 'https://www.carnegielearning.com/' },
  courseHero: { src: googleFaviconUrl('coursehero.com'), alt: 'CourseHero AI', href: 'https://www.coursehero.com/' },

  // Government / Defense AI
  palantir: { src: googleFaviconUrl('palantir.com'), alt: 'Palantir USG', href: 'https://www.palantir.com/' },
  anduril: { src: googleFaviconUrl('anduril.com'), alt: 'Anduril', href: 'https://www.anduril.com/' },
};

// ─────────────────────────────────────────────────────────────────────────
// Model-agnostic stack (§07 Product)
// ─────────────────────────────────────────────────────────────────────────

export const MODEL_PROVIDERS = {
  openai: { src: wikiCommonsUrl('4/4d/OpenAI_Logo.svg'), alt: 'OpenAI', href: 'https://openai.com/' },
  azure: { src: wikiCommonsUrl('f/fa/Microsoft_Azure.svg'), alt: 'Azure OpenAI', href: 'https://azure.microsoft.com/' },
  google: { src: simpleIconUrl('googlegemini'), alt: 'Google Gemini', href: 'https://gemini.google.com/' },
  xai: { src: simpleIconUrl('x'), alt: 'xAI Grok', href: 'https://x.ai/' },
  aws: { src: wikiCommonsUrl('9/93/Amazon_Web_Services_Logo.svg'), alt: 'AWS Bedrock', href: 'https://aws.amazon.com/bedrock/' },
  ollama: { src: simpleIconUrl('ollama'), alt: 'Ollama (local models)', href: 'https://ollama.com/' },
};

// ─────────────────────────────────────────────────────────────────────────
// Comparables (§05)
// ─────────────────────────────────────────────────────────────────────────

export const COMP_LOGOS = {
  veeva: { src: wikiCommonsUrl('e/e0/Veeva_Systems_Logo.svg'), alt: 'Veeva Systems' },
  grammarly: { src: simpleIconUrl('grammarly'), alt: 'Grammarly' },
  onetrust: { src: wikiCommonsUrl('a/ab/OneTrust_logo.png'), alt: 'OneTrust' },
  vanta: { src: simpleIconUrl('vanta'), alt: 'Vanta' },
  securiti: { src: googleFaviconUrl('securiti.ai'), alt: 'Securiti' },
  lithero: { src: googleFaviconUrl('lithero.com'), alt: 'Lithero' },
};

// ─────────────────────────────────────────────────────────────────────────
// Stripe / Twilio / AssuredAI infrastructure trinity (§09)
// ─────────────────────────────────────────────────────────────────────────

export const INFRA_TRINITY = {
  stripe: {
    src: wikiCommonsUrl('b/ba/Stripe_Logo%2C_revised_2016.svg'),
    alt: 'Stripe — payments infrastructure',
    href: 'https://stripe.com/',
    category: 'Payments infrastructure',
  },
  twilio: {
    src: wikiCommonsUrl('7/7e/Twilio-logo-red.svg'),
    alt: 'Twilio — communications infrastructure',
    href: 'https://www.twilio.com/',
    category: 'Communications infrastructure',
  },
  assuredAi: {
    src: '/logos/assured-ai-mark.svg', // we'll fall back to text mark if missing
    alt: 'AssuredAI — compliance infrastructure',
    href: '/',
    category: 'Compliance infrastructure',
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Platform / Partnership (§07 Fueled+AssuredAI+WP Engine trinity)
// ─────────────────────────────────────────────────────────────────────────

export const PARTNERSHIP_TRINITY = {
  fueled: {
    src: googleFaviconUrl('fueled.com'),
    alt: 'Fueled',
    href: 'https://fueled.com/',
  },
  assuredAi: {
    src: '/logos/assured-ai-mark.svg',
    alt: 'AssuredAI',
    href: '/',
  },
  wpEngine: {
    src: googleFaviconUrl('wpengine.com'),
    alt: 'WP Engine',
    href: 'https://wpengine.com/',
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Editor surfaces (§07 Chrome extension targets)
// ─────────────────────────────────────────────────────────────────────────

export const EDITOR_SURFACES = {
  wordpress: { src: simpleIconUrl('wordpress'), alt: 'WordPress' },
  googleDocs: { src: simpleIconUrl('googledocs'), alt: 'Google Docs' },
  notion: { src: simpleIconUrl('notion'), alt: 'Notion' },
  substack: { src: wikiCommonsUrl('4/4c/Substack_logo.svg'), alt: 'Substack' },
  medium: { src: simpleIconUrl('medium'), alt: 'Medium' },
};

// ─────────────────────────────────────────────────────────────────────────
// Frontier LLM providers as potential partner-customers (§09)
// These are not just models AssuredAI runs on — they are platforms that
// could *integrate* AssuredAI as the compliance API for their Enterprise
// tier. Different conceptually from MODEL_PROVIDERS (which is "what we
// run on"); this is "who we sell to at the model layer."
// ─────────────────────────────────────────────────────────────────────────

export const LLM_PROVIDER_CUSTOMERS = {
  openai: {
    src: wikiCommonsUrl('4/4d/OpenAI_Logo.svg'),
    alt: 'OpenAI Enterprise',
    href: 'https://openai.com/enterprise/',
    note: 'Enterprise tier needs vertical-compliance overlays for healthcare / finance / legal',
  },
  anthropic: {
    src: wikiCommonsUrl('7/78/Anthropic_logo.svg'),
    alt: 'Anthropic (Claude Enterprise)',
    href: 'https://www.anthropic.com/enterprise',
    note: 'Responsible-AI thesis is core; vertical compliance is the natural next layer',
  },
  google: {
    src: simpleIconUrl('googlegemini', '4285F4'),
    alt: 'Google Gemini / Med-PaLM',
    href: 'https://cloud.google.com/gemini',
    note: 'Med-PaLM has clinical positioning; needs the verification layer to scale safely',
  },
  xai: {
    src: simpleIconUrl('x', '000000'),
    alt: 'xAI Grok',
    href: 'https://x.ai/',
    note: 'Newest entrant, fewest legacy partnerships, highest opportunity for integration',
  },
  mistral: {
    src: wikiCommonsUrl('e/e6/Mistral_AI_logo_%282025%E2%80%93%29.svg'),
    alt: 'Mistral AI',
    href: 'https://mistral.ai/',
    note: 'European; EU AI Act Article 12 compliance is a direct customer need',
  },
  cohere: {
    src: googleFaviconUrl('cohere.com'),
    alt: 'Cohere',
    href: 'https://cohere.com/',
    note: 'B2B-only model; explicitly enterprise-focused; natural integration partner',
  },
  microsoft: {
    src: wikiCommonsUrl('9/96/Microsoft_logo_%282012%29.svg'),
    alt: 'Microsoft Copilot (Healthcare, Finance, Legal)',
    href: 'https://www.microsoft.com/copilot',
    note: 'Industry-vertical Copilots already shipping; need a compliance verification primitive',
  },
};
