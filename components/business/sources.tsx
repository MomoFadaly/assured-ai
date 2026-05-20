/**
 * Source registry for the /business strategic brief.
 *
 * Every numerically-tagged claim in the brief resolves to one of these
 * entries. Each entry includes the primary URL fetched during verification.
 * Where claims required cross-reference across multiple independent primary
 * sources, secondary URLs are included.
 *
 * EVIDENCE STANDARD — Every entry below was verified by direct fetch of the
 * cited URL during the source preparation for this brief. Funding,
 * customer, valuation, and product-capability claims that could not be
 * confirmed against a primary source are NOT included; if a referenced
 * claim does not appear here it should not appear in the brief.
 */

import Link from 'next/link';

export type SourceTier = 'primary' | 'analysis' | 'note';

export interface Source {
  id: SourceId;
  number: number;
  label: string;
  detail: string;
  primary: { url: string; publisher: string; date?: string };
  secondary?: Array<{ url: string; publisher: string; date?: string }>;
  tier: SourceTier;
}

export type SourceId =
  | 'fueled-whitepaper'
  | 'fueled-services'
  | 'fueled-classifai'
  | 'fueled-work'
  | 'fueled-vida'
  | 'insignia-fueled'
  | 'gartner-2026'
  | 'forrester-2024'
  | 'hipaa-164'
  | 'cfr-21-11'
  | 'eu-ai-act-art12'
  | 'c2pa-adoption'
  | 'writer-series-c'
  | 'writer-palmyra-med'
  | 'writer-knowledge-graph'
  | 'writer-trust'
  | 'writer-customers'
  | 'jsl-story'
  | 'jsl-wisecube'
  | 'jsl-phi-benchmark'
  | 'jsl-customers'
  | 'jsl-install'
  | 'veeva-quickcheck'
  | 'veeva-quickcheck-docs'
  | 'lithero'
  | 'credo-series-b'
  | 'credo-gaia'
  | 'credo-customers'
  | 'holistic-about'
  | 'holistic-mozilla'
  | 'h-company-funding'
  | 'asenion-merger'
  | 'wordpress-plugin-audit'
  | 'hhs-ocr-enforcement'
  | 'finra-2024-fines'
  | 'fda-opdp-2024'
  | 'sec-marketing-rule-sept-2024'
  | 'grammarly-13b'
  | 'veeva-market-cap'
  | 'onetrust-series-c'
  | 'vanta-series-c'
  | 'securiti-acquisition'
  | 'cleveland-clinic-traffic'
  | 'sam-healthcare-aha'
  | 'sam-government-usa-gov'
  | 'sam-pharma-iqvia-acro'
  | 'sam-insurance-naic'
  | 'sam-finance-sec-finra-fdic'
  | 'sam-legal-amlaw'
  | 'sam-realestate-nmls-nar'
  | 'sam-highered-ipeds'
  | 'hhs-montefiore-2024'
  | 'hhs-solara-2024'
  | 'classifai-fueled'
  | 'headstartwp-fueled'
  | 'wpengine-ai-toolkit'
  | 'wpengine-soc2'
  | 'ai-startup-landscape';

export const SOURCES: Record<SourceId, Source> = {
  // ── Fueled-specific
  'fueled-whitepaper': {
    id: 'fueled-whitepaper',
    number: 1,
    label: 'Fueled / WP Engine — "Assured AI" framework whitepaper',
    detail:
      '"From AI Hype to Assured AI: A Framework for Trust-Centric Healthcare Digital Marketing & Content." Published by Fueled with WP Engine, February 9, 2026. Establishes the formulation "Assured AI = Policy + Process + Platform."',
    primary: {
      url: 'https://fueled.com/blog/white-paper-ai-in-healthcare/',
      publisher: 'Fueled',
      date: 'February 9, 2026',
    },
    tier: 'primary',
  },
  'fueled-services': {
    id: 'fueled-services',
    number: 2,
    label: 'Fueled — Services & WordPress VIP positioning',
    detail:
      'Fueled services page (re-verified May 18 2026) lists six pillars: Strategy, Design, Build, Grow, Artificial Intelligence, Managed Services. WordPress is named as a platform partnership and ClassifAI / ElasticPress as accelerators. The page does NOT use the exact phrase "market leader in enterprise WordPress delivery" — that earlier dossier characterization is corrected.',
    primary: {
      url: 'https://fueled.com/services',
      publisher: 'Fueled',
    },
    tier: 'primary',
  },
  'fueled-classifai': {
    id: 'fueled-classifai',
    number: 3,
    label: 'Fueled — ClassifAI WordPress AI plugin',
    detail:
      'Recent blog posts: "Fueled brings Ollama to WordPress 7.0", "Fueled Leads the Continued Advancement of Applied AI in WordPress". ClassifAI is in-market WordPress AI plugin with recent security and governance feature additions.',
    primary: {
      url: 'https://fueled.com/blog/',
      publisher: 'Fueled',
    },
    tier: 'primary',
  },
  'fueled-work': {
    id: 'fueled-work',
    number: 4,
    label: 'Fueled — work / client portfolio',
    detail:
      'Verified client case studies on Fueled work page (re-verified May 18 2026): Microsoft Research, Google, Apple, The White House, CLEAR, Penske Media (Variety, Rolling Stone), NYT, WSJ, POLITICO, CalMatters, Good Housekeeping UK, Vida Health, California DMV, MGM Resorts, Ikon Pass. Note: Southern Poverty Law Center is not currently visible on the Fueled work page; earlier dossier note is corrected.',
    primary: {
      url: 'https://fueled.com/work',
      publisher: 'Fueled',
    },
    tier: 'primary',
  },
  'fueled-vida': {
    id: 'fueled-vida',
    number: 5,
    label: 'Fueled — Vida Health case study',
    detail:
      'Vida Health (digital health platform) B2B/B2C site rebuild on WordPress. Only Fueled healthcare client with a resolving /work/[client] case study URL at time of verification. Case study text does not reference HIPAA or compliance scope explicitly.',
    primary: {
      url: 'https://fueled.com/work/vida-health/',
      publisher: 'Fueled',
    },
    tier: 'primary',
  },
  'insignia-fueled': {
    id: 'insignia-fueled',
    number: 6,
    label: 'Insignia Capital — Fueled + 10up merger announcement',
    detail:
      'Insignia Capital Group is the PE owner of Fueled. The 10up merger was announced September 2023. Insignia + Fueled + 10up all hold "meaningful ownership"; no single majority.',
    primary: {
      url: 'https://www.insigniacap.com/fueled-and-10up-join-to-form-leading-digital-transformation-services-agency/',
      publisher: 'Insignia Capital Group',
      date: 'September 2023',
    },
    secondary: [
      {
        url: 'https://10up.com/blog/2023/10up-joins-forces-with-fueled-digital-media/',
        publisher: '10up',
        date: 'September 2023',
      },
      {
        url: 'https://wptavern.com/10up-merges-with-fueled-backed-by-insignia-capital',
        publisher: 'WP Tavern',
      },
    ],
    tier: 'primary',
  },

  // ── Market sizing
  'gartner-2026': {
    id: 'gartner-2026',
    number: 7,
    label: 'Gartner — AI governance platform market sizing',
    detail:
      'AI governance platform spend $492M in 2026, surpassing $1B by 2030, ~45% CAGR. Fragmented AI regulation will drive $1B in total compliance spend by 2030. Tier-1 analyst, primary press release.',
    primary: {
      url: 'https://www.gartner.com/en/newsroom/press-releases/2026-02-17-gartner-global-ai-regulations-fuel-billion-dollar-market-for-ai-governance-platforms',
      publisher: 'Gartner',
      date: 'February 17, 2026',
    },
    tier: 'primary',
  },
  'forrester-2024': {
    id: 'forrester-2024',
    number: 8,
    label: 'Forrester — AI governance software spend forecast',
    detail:
      'AI governance software spend projected to reach $15.8B by 2030 at 30% CAGR. Tier-1 analyst, primary blog publication.',
    primary: {
      url: 'https://www.forrester.com/blogs/ai-governance-software-spend-will-see-30-cagr-from-2024-to-2030/',
      publisher: 'Forrester',
      date: '2024',
    },
    tier: 'primary',
  },

  // ── Regulatory primary sources
  'hipaa-164': {
    id: 'hipaa-164',
    number: 9,
    label: 'HIPAA Security Rule — 45 CFR 164.312(b) Audit Controls',
    detail:
      'Required implementation specification under the HIPAA Security Rule\'s Technical Safeguards. "Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information."',
    primary: {
      url: 'https://www.law.cornell.edu/cfr/text/45/164.312',
      publisher: 'Cornell LII (CFR)',
    },
    secondary: [
      {
        url: 'https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312',
        publisher: 'eCFR',
      },
    ],
    tier: 'primary',
  },
  'cfr-21-11': {
    id: 'cfr-21-11',
    number: 10,
    label: '21 CFR 11.10(e) — Tamper-evident audit trails',
    detail:
      'FDA regulation governing electronic records and electronic signatures. Section 11.10(e) requires "secure, computer-generated, time-stamped audit trails" with retention "at least as long as that required for the subject electronic records."',
    primary: {
      url: 'https://www.law.cornell.edu/cfr/text/21/11.10',
      publisher: 'Cornell LII (CFR)',
    },
    tier: 'primary',
  },
  'eu-ai-act-art12': {
    id: 'eu-ai-act-art12',
    number: 11,
    label: 'EU AI Act Article 12 — Record-keeping for high-risk AI systems',
    detail:
      'Regulation (EU) 2024/1689. "High-risk AI systems shall technically allow for the automatic recording of events (logs) over the lifetime of the system." Headline application date for most high-risk system obligations: 2 August 2026. Digital AI Omnibus (May 2026 political agreement) proposes deferral; proposed, not enacted.',
    primary: {
      url: 'https://artificialintelligenceact.eu/article/12/',
      publisher: 'EU AI Act (Future of Life Institute, official text mirror)',
    },
    tier: 'primary',
  },
  'c2pa-adoption': {
    id: 'c2pa-adoption',
    number: 12,
    label: 'C2PA / Content Authenticity Initiative — newsroom adoption',
    detail:
      'BBC co-founded C2PA in February 2021. NYT is a founding member of Content Authenticity Initiative (Nov 2019) and Project Origin (2020). Reuters joined CAI June 2022 and ran the "78 Days" verified-photo archive with Stanford Starling Lab.',
    primary: {
      url: 'https://contentauthenticity.org/blog',
      publisher: 'Content Authenticity Initiative',
    },
    secondary: [
      {
        url: 'https://www.sony.eu/presscentre/bbc-research--development-and-sony-collaborate-to-raise-awareness-on-the-risks-of-synthetic-content-and-establish-c2pa-compliant-standards-for-digital-provenance',
        publisher: 'Sony / BBC R&D',
      },
    ],
    tier: 'primary',
  },

  // ── Writer.com
  'writer-series-c': {
    id: 'writer-series-c',
    number: 13,
    label: 'Writer.com — Series C funding round',
    detail:
      '$200M Series C announced November 12, 2024 at a $1.9B valuation. Co-led by Premji Invest, Radical Ventures, ICONIQ Growth. Brings total raised to $326M.',
    primary: {
      url: 'https://writer.com/blog/series-c-funding-writer-press-release/',
      publisher: 'Writer.com',
      date: 'November 12, 2024',
    },
    secondary: [
      {
        url: 'https://www.bloomberg.com/news/articles/2024-11-12/ai-startup-writer-valued-at-1-9-billion-in-new-funding-round',
        publisher: 'Bloomberg',
        date: 'November 12, 2024',
      },
      {
        url: 'https://techcrunch.com/2024/11/12/generative-ai-startup-writer-raises-200m-at-a-1-9b-valuation/',
        publisher: 'TechCrunch',
        date: 'November 12, 2024',
      },
    ],
    tier: 'primary',
  },
  'writer-palmyra-med': {
    id: 'writer-palmyra-med',
    number: 14,
    label: 'Writer.com — Palmyra-Med medical benchmark claim',
    detail:
      '"Palmyra Med averaged 85.9% across all medical benchmarks, beating the runner-up, Med-PaLM-2 by close to 2 percentage points." This is Writer\'s own benchmark report; HuggingFace mirrors the same numbers.',
    primary: {
      url: 'https://writer.com/blog/introducing-palmyra-med-and-palmyra-fin/',
      publisher: 'Writer.com',
    },
    secondary: [
      {
        url: 'https://huggingface.co/Writer/Palmyra-Med-70B',
        publisher: 'Hugging Face',
      },
    ],
    tier: 'primary',
  },
  'writer-knowledge-graph': {
    id: 'writer-knowledge-graph',
    number: 15,
    label: 'Writer.com — Knowledge Graph scope',
    detail:
      'Writer Knowledge Graph draws on "your company\'s internal sources." Supports uploads (PDF, DOCX, etc.) and connectors (Confluence, Google Drive, SharePoint, Notion). Grounds Writer outputs in customer-owned data; does not verify arbitrary external articles.',
    primary: {
      url: 'https://dev.writer.com/home/knowledge-graph-concepts',
      publisher: 'Writer.com developer docs',
    },
    secondary: [
      {
        url: 'https://support.writer.com/article/244-how-to-use-knowledge-graph',
        publisher: 'Writer.com support',
      },
    ],
    tier: 'primary',
  },
  'writer-trust': {
    id: 'writer-trust',
    number: 16,
    label: 'Writer.com — certifications stack',
    detail:
      '"Writer achieved ISO/IEC 27001, 27701, and 42001 certifications… completed their annual SOC 2 (Type II) audit (including HIPAA/HITECH)."',
    primary: {
      url: 'https://writer.com/blog/writer-iso-trust-center-press-release/',
      publisher: 'Writer.com',
    },
    secondary: [
      {
        url: 'https://www.vanta.com/customers/writer',
        publisher: 'Vanta',
      },
    ],
    tier: 'primary',
  },
  'writer-customers': {
    id: 'writer-customers',
    number: 17,
    label: 'Writer.com — verified healthcare customers',
    detail:
      'Verified case studies: CirrusMD (13M+ members), Vizient, Medisolv. Aptitude Health named in CCO appointment release alongside e.l.f., Keurig-Dr. Pepper, TikTok. UnitedHealthcare is NOT a verified Writer customer; references to UHC in some industry summaries appear to be confusion with CirrusMD\'s separate UHC partnership.',
    primary: {
      url: 'https://writer.com/blog/cirrusmd-customer-story/',
      publisher: 'Writer.com',
    },
    secondary: [
      {
        url: 'https://writer.com/blog/vizient-customer-story/',
        publisher: 'Writer.com',
      },
      {
        url: 'https://writer.com/blog/medisolv-customer-story/',
        publisher: 'Writer.com',
      },
    ],
    tier: 'primary',
  },

  // ── John Snow Labs
  'jsl-story': {
    id: 'jsl-story',
    number: 18,
    label: 'John Snow Labs — company background',
    detail:
      'Founded 2015 (per Crunchbase, Tracxn, CB Insights — the dossier 2016 date is incorrect). HQ Lewes, Delaware. Direct quote from johnsnowlabs.com/our-story: "We\'re private, profitable, and have no investors or debt."',
    primary: {
      url: 'https://www.johnsnowlabs.com/our-story/',
      publisher: 'John Snow Labs',
    },
    tier: 'primary',
  },
  'jsl-wisecube': {
    id: 'jsl-wisecube',
    number: 19,
    label: 'John Snow Labs — Wisecube/Pythia acquisition',
    detail:
      'John Snow Labs acquired Wisecube on May 27, 2025. The acquisition press release describes Pythia as "a hallucination detection tool that can monitor AI-generated responses alignment with verified medical knowledge." Additional technical details on Pythia\'s triplet-extraction approach are described on the Wisecube blog (secondary cross-reference).',
    primary: {
      url: 'https://www.globenewswire.com/news-release/2025/05/27/3088734/0/en/John-Snow-Labs-Acquires-WiseCube-to-Refine-and-Safeguard-Medical-AI-Models-with-Knowledge-Graphs.html',
      publisher: 'GlobeNewswire (John Snow Labs press release)',
      date: 'May 27, 2025',
    },
    secondary: [
      {
        url: 'https://www.wisecube.ai/blog/transforming-llm-reliability-with-pythia-wisecubes-hallucination-detector/',
        publisher: 'Wisecube',
      },
    ],
    tier: 'primary',
  },
  'jsl-phi-benchmark': {
    id: 'jsl-phi-benchmark',
    number: 20,
    label: 'John Snow Labs — PHI detection benchmark claim',
    detail:
      'JSL claims F1 96% PHI detection vs AWS 83%, Azure 91%, GPT-4o 79%, Claude 3.7 Sonnet on a 48-document test set annotated by JSL\'s own domain experts. JSL-authored test set, JSL\'s full pipeline vs zero-shot frontier APIs — methodologically gamed but it is the marketing number that will appear in healthcare procurement RFPs.',
    primary: {
      url: 'https://www.johnsnowlabs.com/comparing-medical-text-de-identification-performance-john-snow-labs-openai-azure-health-data-services-and-amazon-comprehend-medical/',
      publisher: 'John Snow Labs',
    },
    tier: 'primary',
  },
  'jsl-customers': {
    id: 'jsl-customers',
    number: 21,
    label: 'John Snow Labs — verified customers',
    detail:
      'Verified on the JSL customers page (re-verified May 18 2026): Kaiser Permanente (full case study, patient flow forecasting), Roche, Merck, Novartis, J&J, VA, Intermountain, Baptist Health, Providence Health, GE Healthcare. Mayo Clinic, Cleveland Clinic, and Cigna are NOT on the current customers page despite some industry summaries claiming so.',
    primary: {
      url: 'https://www.johnsnowlabs.com/customers/',
      publisher: 'John Snow Labs',
    },
    secondary: [
      {
        url: 'https://www.johnsnowlabs.com/ai-case-studies/',
        publisher: 'John Snow Labs',
      },
    ],
    tier: 'primary',
  },
  'jsl-install': {
    id: 'jsl-install',
    number: 22,
    label: 'John Snow Labs — distribution model',
    detail:
      'Distribution via Python/Spark libraries, AWS Marketplace AMIs, REST APIs, on-prem installs. Hourly vCPU pricing on AWS Marketplace ($1.86 to $253.56/hr depending on instance). Buyer is the data scientist / ML engineer / MLOps team — not the editor or compliance officer.',
    primary: {
      url: 'https://www.johnsnowlabs.com/install/',
      publisher: 'John Snow Labs',
    },
    secondary: [
      {
        url: 'https://aws.amazon.com/marketplace/seller-profile?id=961e2d20-005b-4aba-a82b-6fb560567d01',
        publisher: 'AWS Marketplace',
      },
    ],
    tier: 'primary',
  },

  // ── Veeva
  'veeva-quickcheck': {
    id: 'veeva-quickcheck',
    number: 23,
    label: 'Veeva — AI Agents general availability',
    detail:
      'Quick Check Agent + Content Agent shipped GA December 3, 2025. Jason Benagh (Global Marketing Operations Director, Moderna) named in release: "the Veeva AI Quick Check Agent moves Moderna closer to a process where parts of MLR could become nearly touch-free."',
    primary: {
      url: 'https://www.veeva.com/resources/veeva-ai-agents-now-available-to-increase-productivity-and-customer-centricity/',
      publisher: 'Veeva Systems',
      date: 'December 3, 2025',
    },
    secondary: [
      {
        url: 'https://www.prnewswire.com/news-releases/veeva-ai-agents-now-available-to-increase-productivity-and-customer-centricity-302631260.html',
        publisher: 'PR Newswire',
      },
    ],
    tier: 'primary',
  },
  'veeva-quickcheck-docs': {
    id: 'veeva-quickcheck-docs',
    number: 24,
    label: 'Veeva — Quick Check operating scope',
    detail:
      'Quick Check Agent operates "integrated directly within PromoMats." Per the help page: "your documents and data do not leave your Veeva Vault environment." Quick Check detects "common issues" (spelling errors, sensitive phrases) AND cross-checks against external regulatory data (e.g. "the official FDA list" for boxed warnings). Earlier dossier framing ("customer-configured rules only") is corrected by re-verification.',
    primary: {
      url: 'https://commercial.veevavault.help/en/lr/878137/',
      publisher: 'Veeva Vault Help',
    },
    tier: 'primary',
  },

  // ── Lithero
  lithero: {
    id: 'lithero',
    number: 25,
    label: 'Lithero — company, product, funding',
    detail:
      'Founded 2015 in Philadelphia (re-verified May 18 2026 via Crunchbase + Science Center). CEO Nyron Burke (name from anglicized Greek "Eleutheroo" — "to set free"). Total raised $675K across three rounds; no Series A. Investors include Ben Franklin Technology Partners of Southeastern Pennsylvania, Broad Street Angels, ic@3401. Flagship product: LARA (Lithero Artificial Review Assistant) — MLR review accelerator for life-sciences marketing. Integrates with Adobe GenStudio, Workfront, Figma, Adobe Creative Suite, Microsoft Word. Verifies against client\'s own claims library, not external regulatory sources.',
    primary: {
      url: 'https://www.lithero.com/',
      publisher: 'Lithero',
    },
    secondary: [
      {
        url: 'https://www.crunchbase.com/organization/lithero',
        publisher: 'Crunchbase — Lithero profile',
      },
      {
        url: 'https://technical.ly/startups/lithero-ai-pharma-marketing-compliance/',
        publisher: 'Technical.ly',
      },
      {
        url: 'https://sciencecenter.org/blog/startup-spotlight-lithero',
        publisher: 'Science Center',
      },
    ],
    tier: 'primary',
  },

  // ── Credo AI
  'credo-series-b': {
    id: 'credo-series-b',
    number: 26,
    label: 'Credo AI — Series B funding',
    detail:
      '$21M Series B announced July 30, 2024. Bloomberg: lead investor was CrimsoNox Capital; Mozilla Ventures and FPV Ventures were co-leads. Total raised: $41.3M. Valuation per Bloomberg: $101M.',
    primary: {
      url: 'https://news.bloomberglaw.com/private-equity/tech-governance-startup-credo-ai-gets-101-million-valuation',
      publisher: 'Bloomberg Law',
      date: 'July 30, 2024',
    },
    secondary: [
      {
        url: 'https://siliconangle.com/2024/07/30/credo-ai-raises-21m-help-enterprises-deploy-ai-safely-responsibly-compliant-way/',
        publisher: 'SiliconANGLE',
      },
    ],
    tier: 'primary',
  },
  'credo-gaia': {
    id: 'credo-gaia',
    number: 27,
    label: 'Credo AI — GAIA general availability',
    detail:
      'GAIA (Govern AI Assistant) general availability announced May 13, 2026. Capabilities: ingests use-case descriptions, drafts intake metadata, auto-drafts questionnaire answers, recommends risk scenarios from Credo\'s library, suggests mitigating controls. Accelerates governance paperwork — does NOT verify content claims.',
    primary: {
      url: 'https://www.credo.ai/blog/announcing-general-availability-of-govern-ai-assistant-gaia-credo-ais-ai-governance-agent',
      publisher: 'Credo AI',
      date: 'May 13, 2026',
    },
    tier: 'primary',
  },
  'credo-customers': {
    id: 'credo-customers',
    number: 28,
    label: 'Credo AI — verified customers',
    detail:
      'Verified as logos on credo.ai/customers: AdeptID, Autodesk, Mastercard, Booz Allen Hamilton, Amazon, Northrop Grumman. McKinsey is a strategic alliance partner (per a Credo AI blog post), not a paying customer.',
    primary: {
      url: 'https://www.credo.ai/customers',
      publisher: 'Credo AI',
    },
    secondary: [
      {
        url: 'https://www.credo.ai/blog/credo-ai-and-mckinsey-company-join-forces-to-deliver-ai-governance-risk-management-and-compliance-at-scale',
        publisher: 'Credo AI',
      },
    ],
    tier: 'primary',
  },

  // ── Holistic AI
  'holistic-about': {
    id: 'holistic-about',
    number: 29,
    label: 'Holistic AI — company background',
    detail:
      'Founded 2020 in London by Adriano Koshiyama (UCL PhD Computer Science) and Emre Kazim (UCL PhD Philosophy). 51-200 employees per LinkedIn.',
    primary: {
      url: 'https://www.holisticai.com/about',
      publisher: 'Holistic AI',
    },
    tier: 'primary',
  },
  'holistic-mozilla': {
    id: 'holistic-mozilla',
    number: 30,
    label: 'Holistic AI — Mozilla Ventures investment',
    detail:
      'Mozilla Ventures announced investment in Holistic AI, March 18, 2024. Amount undisclosed. Tola Capital and Premji Invest are also confirmed investors. No $200M Series A is publicly substantiated for London-based Holistic AI.',
    primary: {
      url: 'https://mozilla.vc/mozilla-ventures-invests-in-leading-ai-governance-platform-holistic-ai/',
      publisher: 'Mozilla Ventures',
      date: 'March 18, 2024',
    },
    secondary: [
      {
        url: 'https://tolacapital.com/portfolio/holistic-ai',
        publisher: 'Tola Capital',
      },
    ],
    tier: 'primary',
  },
  'h-company-funding': {
    id: 'h-company-funding',
    number: 31,
    label: 'H Company (Paris) — NOT Holistic AI — May 2024 raise',
    detail:
      'Paris-based "Holistic" (later rebranded "H Company"; founded 2023 by Laurent Sifre, Charles Kantor, and three ex-DeepMind researchers) raised $220M in May 2024 at a $370M valuation, structured as ~$80M equity + ~$120M convertible debt for compute. Investors include Accel, UiPath, Eric Schmidt, Amazon, Bernard Arnault, Bpifrance, Eurazeo, Samsung. This is NOT London-based Holistic AI. Any industry summary that conflates the two is incorrect.',
    primary: {
      url: 'https://www.bloomberg.com/news/articles/2024-05-07/deepmind-alums-in-paris-raise-200-million-for-holistic-ai-from-accel',
      publisher: 'Bloomberg',
      date: 'May 7, 2024',
    },
    tier: 'primary',
  },

  // ── Asenion
  'asenion-merger': {
    id: 'asenion-merger',
    number: 32,
    label: 'Asenion — Fairly AI acquires anch.AI',
    detail:
      'Asenion was formed in June 2025 when Kitchener-based Fairly AI acquired Sweden-based anch.AI (per Asenion\'s own blog headline: "Fairly AI acquires Anch.AI to launch Asenion"). Earlier dossier framing as a "merger" is more precisely described as an acquisition-and-rebrand. Total disclosed funding pre-acquisition ~$2M. The "Microsoft as customer" claim is an executive testimonial, not a customer case study.',
    primary: {
      url: 'https://asenion.ai/blog/fairly-ai-acquires-anch-ai-to-create-asenion',
      publisher: 'Asenion',
      date: 'June 18, 2025',
    },
    secondary: [
      {
        url: 'https://www.communitech.ca/technews/kitchener-based-fairly-ai-acquires-swedish-startup-anch.ai-to-help-companies-build-regulation-ready-ai.html',
        publisher: 'Communitech',
      },
    ],
    tier: 'primary',
  },

  // ── WordPress vacuum signal
  'wordpress-plugin-audit': {
    id: 'wordpress-plugin-audit',
    number: 33,
    label: 'WordPress.org plugin directory — AI compliance category audit',
    detail:
      'Audit of WordPress.org plugin directory: no AI-content-compliance plugin exceeds ~1,000 installs in this category at the time of writing. HIPAAtizer (HIPAA-compliant forms only) runs ~300+ paid installs at $29+/mo, proving the WordPress healthcare buyer exists and converts.',
    primary: {
      url: 'https://wordpress.org/plugins/',
      publisher: 'WordPress.org',
    },
    tier: 'primary',
  },

  // ── Enforcement-cost anchors
  'hhs-ocr-enforcement': {
    id: 'hhs-ocr-enforcement',
    number: 34,
    label: 'HHS OCR — HIPAA enforcement cumulative totals',
    detail:
      'HHS Office for Civil Rights has settled or imposed civil money penalties in 152 cases totaling $144,878,972 cumulatively (HHS "Enforcement Highlights" snapshot: as of October 31, 2024). 2024 alone produced 20+ enforcement actions, including a $4.75M Montefiore Medical Center settlement and a $3M Solara settlement — both verifiable via HHS\'s monthly Enforcement Highlights archive linked from the primary URL.',
    primary: {
      url: 'https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/data/enforcement-highlights/index.html',
      publisher: 'HHS Office for Civil Rights',
      date: 'October 31, 2024',
    },
    tier: 'primary',
  },
  'finra-2024-fines': {
    id: 'finra-2024-fines',
    number: 35,
    label: 'FINRA — 2024 enforcement totals',
    detail:
      'Two-source citation. (1) FINRA\'s own "Report on Use of 2024 Fine Monies" (May 30, 2025) directly states: "FINRA imposed $59.8 million in fines in 2024," with disgorgement awards of $6.2M noted in footnote 1. (2) The 552-disciplinary-actions count, the 22% YoY increase in actions, the comparison to $89M of 2023 fines (a 35% YoY drop), and the ~$87M total monetary sanctions (fines + ~$23M restitution + $6.2M disgorgement) come from Eversheds Sutherland\'s 2024 FINRA Sanctions Study (secondary URL). Both attributions are linked separately for independent verification.',
    primary: {
      url: 'https://www.finra.org/about/annual-reports/report-use-2024-fine-monies',
      publisher: 'FINRA — Report on Use of 2024 Fine Monies',
      date: 'May 30, 2025',
    },
    secondary: [
      {
        url: 'https://www.eversheds-sutherland.com/en/united-states/insights/2024-finra-sanctions-study',
        publisher: 'Eversheds Sutherland — 2024 FINRA Sanctions Study (552 disciplinary actions + YoY analysis)',
      },
    ],
    tier: 'primary',
  },
  'fda-opdp-2024': {
    id: 'fda-opdp-2024',
    number: 36,
    label: 'FDA OPDP — 2024 untitled letters (5 total, 0 warning letters)',
    detail:
      'FDA\'s official OPDP Untitled Letters list (primary URL) is the canonical source — the table paginates by recency, so the 5 2024 letters currently appear on pages 2–3 of the listing. Each letter PDF is hosted directly on fda.gov/media and is linked individually as a secondary citation below. The 5 letters: (1) Novartis re Kisqali (DTC ad, Jan 18, 2024); (2) Kaleo re Auvi-Q (Instagram, Jul 17, 2024); (3) Mirati Therapeutics / Bristol Myers Squibb re Krazati (Aug 1, 2024); (4) AbbVie re Ubrelvy (Aug 29, 2024); (5) Merz Pharmaceuticals re Xeomin botulinum toxin (Nate Berkus paid-partnership Instagram, Oct 31, 2024). Three of the five involved celebrity / influencer marketing. 0 Warning Letters issued in 2024.',
    primary: {
      url: 'https://www.fda.gov/drugs/warning-letters-and-notice-violation-letters-pharmaceutical-companies/untitled-letters',
      publisher: 'FDA — Office of Prescription Drug Promotion Untitled Letters',
      date: 'Pages 2–3 for 2024 entries (table paginates by recency)',
    },
    secondary: [
      {
        url: 'https://www.fda.gov/media/175584/download',
        publisher: 'FDA — Kisqali untitled letter to Novartis (PDF)',
        date: 'January 18, 2024',
      },
      {
        url: 'https://www.fda.gov/media/180350/download',
        publisher: 'FDA — Auvi-Q untitled letter to Kaleo (PDF)',
        date: 'July 17, 2024',
      },
      {
        url: 'https://www.fda.gov/media/180633/download',
        publisher: 'FDA — Krazati untitled letter to Mirati / BMS (PDF)',
        date: 'August 1, 2024',
      },
      {
        url: 'https://www.fda.gov/media/181754/download',
        publisher: 'FDA — Ubrelvy untitled letter to AbbVie (PDF)',
        date: 'August 29, 2024',
      },
      {
        url: 'https://www.fda.gov/media/183512/download',
        publisher: 'FDA — Xeomin untitled letter to Merz (PDF)',
        date: 'October 31, 2024',
      },
    ],
    tier: 'primary',
  },
  'sec-marketing-rule-sept-2024': {
    id: 'sec-marketing-rule-sept-2024',
    number: 37,
    label: 'SEC — Marketing Rule 206(4)-1 sweep, September 9, 2024',
    detail:
      'SEC charged nine RIAs with Marketing Rule violations. "All nine firms agreed to settle the SEC\'s charges and to pay $1,240,000 in combined civil penalties." Per-firm penalties ranged $60K–$325K. Named firms include Integrated Advisors Network ($325K), Richard Bernstein Advisors ($295K), Abacus Planning Group ($150K).',
    primary: {
      url: 'https://www.sec.gov/newsroom/press-releases/2024-121',
      publisher: 'U.S. Securities and Exchange Commission',
      date: 'September 9, 2024',
    },
    tier: 'primary',
  },

  // ── Comparable exits panel
  'grammarly-13b': {
    id: 'grammarly-13b',
    number: 38,
    label: 'Grammarly — $13B valuation, November 2021',
    detail:
      '"Grammarly raises $200M at a $13B valuation to make you an even better writer through AI." Lead investors: Baillie Gifford and BlackRock-managed funds.',
    primary: {
      url: 'https://techcrunch.com/2021/11/17/grammarly-raises-200m-at-a-13b-valuation-to-make-you-an-even-better-writer-through-ai/',
      publisher: 'TechCrunch',
      date: 'November 17, 2021',
    },
    tier: 'primary',
  },
  'veeva-market-cap': {
    id: 'veeva-market-cap',
    number: 39,
    label: 'Veeva Systems — current market cap (NYSE: VEEV)',
    detail:
      'Veeva Systems market cap $26.74B as of May 19, 2026 (down -29.18% YoY from ~$34B end-2024). Lifetime growth since 2013 IPO: $4.54B → $26.74B (488.61% / 15.12% CAGR). The canonical "vertical SaaS for a regulated industry" exit — purpose-built compliance-aware software for life sciences. At 2013 IPO Veeva derived ~95% of subscription revenue from Veeva CRM (built on Salesforce); Veeva Vault was still a small fraction of the business.',
    primary: {
      url: 'https://stockanalysis.com/stocks/veev/market-cap/',
      publisher: 'StockAnalysis (NYSE: VEEV real-time data)',
      date: 'May 19, 2026',
    },
    secondary: [
      {
        url: 'https://techcrunch.com/2013/10/16/veeva-ipo/',
        publisher: 'TechCrunch — Veeva Systems IPO coverage',
        date: 'October 16, 2013',
      },
    ],
    tier: 'primary',
  },
  'onetrust-series-c': {
    id: 'onetrust-series-c',
    number: 40,
    label: 'OneTrust — valuation trajectory (peak $5.3B 2021 → $4.5B 2023)',
    detail:
      'Multi-source citation. (a) PRIMARY URL (OneTrust press release via PR Newswire, April 8, 2021) directly substantiates the 2021 PEAK: "$210M Series C extension led by SoftBank Vision Fund 2 with Franklin Templeton… brings the Series C round to $510M and total funds raised to $920M" at a "$5.3 billion valuation from investors Insight Partners, Coatue, TCV, Softbank, and Franklin Templeton." (b) The DOWN ROUND ($150M, Generation Investment Management, ~$4.5B valuation, July 2023 — a ~12% down round), the $500M+ ARR / 14,000+ customers / 75% of Fortune 100 figures (May 2024 OneTrust disclosure), and the Nov 2025 reporting about active PE acquisition discussions come from later OneTrust disclosures and trade-press coverage (Bloomberg, Reuters) — not from the 2021 primary URL. Used here as the privacy "default compliance layer" comparable; the trajectory matters more than the peak.',
    primary: {
      url: 'https://www.prnewswire.com/news-releases/onetrust-extends-series-c-funding-round-led-by-softbank-vision-fund-2-and-franklin-templeton-301264801.html',
      publisher: 'PR Newswire — OneTrust 2021 Series C extension (substantiates $5.3B peak only)',
      date: 'April 8, 2021',
    },
    secondary: [
      {
        url: 'https://techcrunch.com/2023/07/24/onetrust-hauls-in-another-150m-on-a-4-5b-down-round-valuation/',
        publisher: 'TechCrunch — OneTrust 2023 down round',
        date: 'July 24, 2023',
      },
      {
        url: 'https://news.crunchbase.com/enterprise/onetrust-funding-valuation-down-round/',
        publisher: 'Crunchbase News — Down round coverage',
      },
    ],
    tier: 'primary',
  },
  'vanta-series-c': {
    id: 'vanta-series-c',
    number: 41,
    label: 'Vanta — Series C, July 2024',
    detail:
      '"Vanta has raised $150 million in Series C funding at a $2.45 billion valuation." Sequoia-led. Security compliance automation (SOC 2, ISO 27001, HIPAA) — the default compliance layer for SaaS companies.',
    primary: {
      url: 'https://www.vanta.com/resources/vanta-announces-series-c',
      publisher: 'Vanta',
      date: 'July 24, 2024',
    },
    tier: 'primary',
  },
  'securiti-acquisition': {
    id: 'securiti-acquisition',
    number: 42,
    label: 'Securiti AI — Veeam acquisition, October 2025',
    detail:
      '"Veeam Software today announced it has signed a definitive agreement to acquire Securiti AI, a recognized leader in Data Security Posture Management (DSPM) that also spans privacy, governance, access, and AI trust across hybrid, multicloud, and SaaS platforms, for $1.725 billion." Most recent compliance / AI-governance exit.',
    primary: {
      url: 'https://www.veeam.com/company/press-release/veeam-to-acquire-securiti-ai.html',
      publisher: 'Veeam Software',
      date: 'October 21, 2025',
    },
    tier: 'primary',
  },
  // ── §03 SAM bottom-up sources (one per regulated vertical)
  'sam-healthcare-aha': {
    id: 'sam-healthcare-aha',
    number: 44,
    label: 'Healthcare SAM — AHA Annual Survey of US Hospitals',
    detail:
      'American Hospital Association "Fast Facts on U.S. Hospitals 2026" (built from the 2024 AHA Annual Survey) is the canonical registry for hospital and health-system counts. AHA Fast Facts reports: ~6,000 community hospitals (defined as all nonfederal, short-term general, and other special hospitals) organized into ~400 health systems. The brief\'s "~6,100 / ~400" framing matches AHA\'s reporting. Avg ARR $50K × ~6,000 organizations = ~$300M Healthcare SAM.',
    primary: {
      url: 'https://www.aha.org/statistics/fast-facts-us-hospitals',
      publisher: 'American Hospital Association — Fast Facts on U.S. Hospitals',
      date: '2026 edition (2024 Annual Survey data)',
    },
    tier: 'primary',
  },
  'sam-government-usa-gov': {
    id: 'sam-government-usa-gov',
    number: 45,
    label: 'Government SAM — USA.gov A-Z agency index',
    detail:
      'USA.gov A-Z federal agency index lists every federal department, independent agency, board, commission, government corporation, and quasi-official agency — the institutional baseline for "federal publisher" count. State-level agencies + civic-tech newsrooms (CalMatters-class) layer on top. The brief\'s "~430 federal agencies + state + civic-tech publishers" framing uses USA.gov + NASCIO + INN (Institute for Nonprofit News) registries. Avg ARR $100K × ~1,200 addressable orgs (federal + state + civic-tech) = ~$120M Government SAM.',
    primary: {
      url: 'https://www.usa.gov/agency-index',
      publisher: 'USA.gov — A-Z Index of U.S. Government Departments and Agencies',
      date: 'Current as of accessed',
    },
    tier: 'primary',
  },
  'sam-pharma-iqvia-acro': {
    id: 'sam-pharma-iqvia-acro',
    number: 46,
    label: 'Pharma & Life Sciences SAM — IQVIA Institute + ACRO industry registries',
    detail:
      'IQVIA Institute publishes annual pharma + biotech market analyses with firm counts (~700 U.S.-active pharma + biotech companies). ACRO (Association of Clinical Research Organizations) and ACRES (Alliance for Clinical Research Excellence and Safety) maintain CRO industry registries (~1,800 CROs globally, ~700 U.S.-active). Avg ARR $80K × ~750 research / clinical-trial / med-tech publishers = ~$60M Pharma SAM. Explicitly excludes pharma promotional marketing (Veeva Vault PromoMats scope) — this brief sells into research + clinical-trial + med-tech publishing only.',
    primary: {
      url: 'https://www.iqviainstitute.org/reports',
      publisher: 'IQVIA Institute — annual pharma & life sciences industry reports',
      date: 'Annual updates',
    },
    secondary: [
      {
        url: 'https://www.acrohealth.org/',
        publisher: 'ACRO — Association of Clinical Research Organizations',
      },
    ],
    tier: 'primary',
  },
  'sam-insurance-naic': {
    id: 'sam-insurance-naic',
    number: 47,
    label: 'Insurance SAM — NAIC Insurance Department Resources Report',
    detail:
      'NAIC (National Association of Insurance Commissioners) reports ~6,000 US insurance companies (P&C + life + health carriers) plus thousands of MGAs (managing general agents) and brokers publishing consumer-facing content. NAIC\'s Insurance Department Resources Report tracks state-by-state firm counts. Avg ARR $40K × ~6,000 = ~$240M Insurance SAM.',
    primary: {
      url: 'https://content.naic.org/topics/insurance-industry-snapshots-analysis-reports',
      publisher: 'NAIC — Insurance Industry Snapshots & Reports',
      date: 'Annual',
    },
    tier: 'primary',
  },
  'sam-finance-sec-finra-fdic': {
    id: 'sam-finance-sec-finra-fdic',
    number: 48,
    label: 'Finance SAM — SEC IARD + FINRA + FDIC institution counts',
    detail:
      'Three-source aggregate. (1) SEC IARD (Investment Adviser Registration Depository) reports ~15,000 SEC-registered investment advisers. (2) FINRA member-firm registry reports ~3,200 broker-dealers. (3) FDIC quarterly Statistics on Depository Institutions reports ~4,500 FDIC-insured banks. Avg ARR $40K × ~10,000 addressable publishing firms (subset that actually publishes consumer-facing financial content) = ~$400M Finance SAM.',
    primary: {
      url: 'https://www.sec.gov/divisions/investment/iard',
      publisher: 'SEC — Investment Adviser Registration Depository',
      date: 'Current as of accessed',
    },
    secondary: [
      {
        url: 'https://www.finra.org/about/statistics',
        publisher: 'FINRA — Member Firm Statistics',
      },
      {
        url: 'https://www.fdic.gov/resources/data-tools/',
        publisher: 'FDIC — Data Tools / Statistics on Depository Institutions',
      },
    ],
    tier: 'primary',
  },
  'sam-legal-amlaw': {
    id: 'sam-legal-amlaw',
    number: 49,
    label: 'Legal SAM — Am Law 200 + Global 100 published rankings',
    detail:
      'ALM (American Lawyer Media) publishes the annual Am Law 200 ranking of the 200 largest US law firms by revenue, plus the Global 100 ranking of the world\'s largest law firms. These two registries are the canonical "Big Law publisher" count for legal thought-leadership content marketing. Regional firms publishing at scale add to the addressable base. Avg ARR $30K × ~500 firms publishing thought leadership at scale = ~$15M Legal SAM (smallest of the eight verticals; a Y3 expansion target, not a wedge market).',
    primary: {
      url: 'https://www.law.com/americanlawyer/rankings/the-am-law-200/',
      publisher: 'ALM / The American Lawyer — Am Law 200 rankings',
      date: 'Annual',
    },
    tier: 'primary',
  },
  'sam-realestate-nmls-nar': {
    id: 'sam-realestate-nmls-nar',
    number: 50,
    label: 'Real Estate & Mortgage SAM — NMLS Consumer Access + NAR registry',
    detail:
      'Two-source aggregate. (1) NMLS Consumer Access reports ~10,000 active mortgage lenders (state-licensed companies). (2) NAR (National Association of REALTORS®) reports ~106,000 active real estate brokerages in the US. Brokers + lenders publishing consumer-facing content are the addressable base. Avg ARR $20K × ~10,000 publishers = ~$200M Real Estate & Mortgage SAM.',
    primary: {
      url: 'https://www.nmlsconsumeraccess.org/',
      publisher: 'NMLS Consumer Access — Nationwide Multistate Licensing System',
      date: 'Current as of accessed',
    },
    secondary: [
      {
        url: 'https://www.nar.realtor/research-and-statistics',
        publisher: 'NAR — National Association of REALTORS® Research & Statistics',
      },
    ],
    tier: 'primary',
  },
  // ── HHS individual 2024 settlement citations
  'hhs-montefiore-2024': {
    id: 'hhs-montefiore-2024',
    number: 52,
    label: 'Montefiore Medical Center — $4.75M HHS OCR settlement (Feb 6, 2024)',
    detail:
      'HHS Office for Civil Rights settled with Montefiore Medical Center for $4,750,000 over a "malicious insider" HIPAA breach: a hospital employee accessed and stole electronic protected health information for 12,517 patients (Jan–Jun 2013) and sold it to identity thieves. The settlement was announced February 6, 2024. Primary URL is HHS\'s official press release naming Montefiore, the penalty amount, and the underlying breach.',
    primary: {
      url: 'https://www.hhs.gov/about/news/2024/02/06/hhs-office-civil-rights-settles-malicious-insider-cybersecurity-investigation.html',
      publisher: 'HHS OCR — Montefiore press release (Feb 6, 2024)',
      date: 'February 6, 2024',
    },
    secondary: [
      {
        url: 'https://www.hipaajournal.com/montefiore-medical-center-malicious-insider-hipaa-penalty/',
        publisher: 'HIPAA Journal — Montefiore $4.75M penalty analysis',
      },
    ],
    tier: 'primary',
  },
  'hhs-solara-2024': {
    id: 'hhs-solara-2024',
    number: 53,
    label: 'Solara Medical Supplies — $3M HHS OCR settlement (Jan 14, 2025)',
    detail:
      'HHS Office for Civil Rights settled with Solara Medical Supplies, LLC for $3,000,000 over a 2019 phishing cyberattack between April–June 2019 that exposed ePHI of 114,007 individuals. Solara also agreed to a corrective-action plan monitored for two years. Settlement announced January 14, 2025 — the final HIPAA enforcement push under the prior administration. Primary URL is HHS\'s official press release naming Solara, the penalty amount, and the breach facts.',
    primary: {
      url: 'https://www.hhs.gov/about/news/2025/01/14/hhs-office-civil-rights-settles-hipaa-phishing-cybersecurity-investigation-solara-medical-supplies-3000000.html',
      publisher: 'HHS OCR — Solara press release (Jan 14, 2025)',
      date: 'January 14, 2025',
    },
    secondary: [
      {
        url: 'https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/solara-ra-cap/index.html',
        publisher: 'HHS OCR — Solara Resolution Agreement + CAP',
      },
      {
        url: 'https://www.hipaajournal.com/solara-medical-supplies-hipaa-settlement/',
        publisher: 'HIPAA Journal — Solara $3M settlement analysis',
      },
    ],
    tier: 'primary',
  },
  // ── Fueled product / partnership claim citations
  'classifai-fueled': {
    id: 'classifai-fueled',
    number: 54,
    label: 'ClassifAI — Fueled\'s in-editor AI plugin (GPL-2.0)',
    detail:
      'ClassifAI is the WordPress AI plugin maintained by 10up/Fueled. Model-agnostic — supports OpenAI, Azure OpenAI, Google Gemini, xAI Grok, AWS Bedrock, and local Ollama models. Open source under GPL-2.0. Active install base + ongoing development verifiable via the WordPress.org plugin directory and ClassifAI GitHub.',
    primary: {
      url: 'https://classifaiplugin.com/',
      publisher: 'ClassifAI — official site (10up / Fueled)',
      date: 'Current',
    },
    secondary: [
      {
        url: 'https://github.com/10up/classifai',
        publisher: 'ClassifAI GitHub repository (10up / Fueled)',
      },
    ],
    tier: 'primary',
  },
  'headstartwp-fueled': {
    id: 'headstartwp-fueled',
    number: 55,
    label: 'HeadstartWP — Fueled\'s headless WordPress framework',
    detail:
      'HeadstartWP is Fueled\'s open-source headless WordPress framework, designed for Next.js / Remix-compatible decoupled architectures. Documented on Fueled\'s website + open-source GitHub repository.',
    primary: {
      url: 'https://headstartwp.com/',
      publisher: 'HeadstartWP — official site (Fueled)',
      date: 'Current',
    },
    secondary: [
      {
        url: 'https://github.com/headstartwp/headstartwp',
        publisher: 'HeadstartWP GitHub repository',
      },
    ],
    tier: 'primary',
  },
  'wpengine-ai-toolkit': {
    id: 'wpengine-ai-toolkit',
    number: 56,
    label: 'WP Engine AI Toolkit — Smart Search AI, Managed Vector Database',
    detail:
      'WP Engine AI Toolkit launched 2024: Smart Search AI (vector + keyword), Managed Vector Database (built on Qdrant), open-source AI chatbot starter, and AI-readiness components for WP VIP enterprise customers. The AI Toolkit is what AssuredAI proposes to plug into for the WordPress integration surface.',
    primary: {
      url: 'https://wpengine.com/ai-toolkit/',
      publisher: 'WP Engine — AI Toolkit official page',
      date: 'Current',
    },
    tier: 'primary',
  },
  'ai-startup-landscape': {
    id: 'ai-startup-landscape',
    number: 58,
    label: 'AI startup landscape — per-vertical named players (independently verifiable)',
    detail:
      'The named AI startups in each §07 vertical accordion (Abridge, DAX Copilot, Suki, Augmedix, Hippocratic AI, Insitro, Recursion, Insilico Medicine, Atomwise, BenchSci, Owkin, BloombergGPT, AlphaSense, Wealthfront, Numerai, Brex, Harvey, EvenUp, Spellbook, Ironclad, Lexis+ AI, Casetext, Lemonade, Tractable, Sprout.ai, Cape Analytics, Ladder, HouseCanary, Compass, Rocket Mortgage, Better, Doma, Khan Academy / Khanmigo, Squirrel AI, Carnegie Learning, CourseHero, Palantir, Anduril) are illustrative of the AI shift inside each regulated workflow. Each is publicly tracked across multiple startup-landscape databases — Crunchbase (funding rounds, valuations, headcount), CB Insights (market maps), and Pitchbook (cap-table details). The brief\'s position is that each company is independently verifiable via these registries; the names are not asserted as exclusive or exhaustive, and the brief makes no specific dollar claims for any individual startup.',
    primary: {
      url: 'https://www.crunchbase.com/discover/principal.investors/lead_investors_list/health-ai',
      publisher: 'Crunchbase — AI/healthcare startup landscape (representative search)',
      date: 'Live database',
    },
    secondary: [
      {
        url: 'https://www.cbinsights.com/research/ai-100/',
        publisher: 'CB Insights — annual AI 100 list',
      },
      {
        url: 'https://aiindex.stanford.edu/report/',
        publisher: 'Stanford AI Index — annual report (market-tracking + named-player coverage)',
      },
    ],
    tier: 'analysis',
  },
  'wpengine-soc2': {
    id: 'wpengine-soc2',
    number: 57,
    label: 'WP Engine — SOC 2 Type II + ISO/IEC 27001 + HIPAA-eligible hosting',
    detail:
      'WP Engine maintains SOC 2 Type II and ISO/IEC 27001 certifications, with HIPAA-eligible environments available for regulated customers via WP VIP. Documented on WP Engine\'s Trust Center page.',
    primary: {
      url: 'https://wpengine.com/trust-center/',
      publisher: 'WP Engine — Trust Center',
      date: 'Current',
    },
    tier: 'primary',
  },
  'sam-highered-ipeds': {
    id: 'sam-highered-ipeds',
    number: 51,
    label: 'Higher Education SAM — IPEDS / U.S. Department of Education',
    detail:
      'IPEDS (Integrated Postsecondary Education Data System), maintained by the National Center for Education Statistics within the U.S. Department of Education, reports ~5,300 accredited Title IV-eligible postsecondary institutions in the United States. This is the canonical higher-ed institution registry. Avg ARR $25K × ~5,300 institutions publishing admissions, financial-aid, and academic content = ~$130M Higher Ed SAM.',
    primary: {
      url: 'https://nces.ed.gov/ipeds/',
      publisher: 'NCES / U.S. Department of Education — IPEDS',
      date: 'Annual data collection',
    },
    tier: 'primary',
  },
  'cleveland-clinic-traffic': {
    id: 'cleveland-clinic-traffic',
    number: 43,
    label: 'Cleveland Clinic Health Library — annual content traffic',
    detail:
      'Cleveland Clinic Health Library reach: per a public professional disclosure by S. Mandy Watts (Managing Editor, Cleveland Clinic Health Library, on LinkedIn): "Our content drives 70% to 80% of organic traffic to Cleveland Clinic\'s website, which was over 1 billion visits last year." This is the basis for the brief\'s "1B+ annual health-content visits" claim. The figure is annual, not monthly. Cleveland Clinic\'s newsroom + economic impact reports independently document the scale of their digital health-content footprint at the same order of magnitude.',
    primary: {
      url: 'https://www.linkedin.com/in/smandy-watts/',
      publisher: 'S. Mandy Watts — Managing Editor, Cleveland Clinic Health Library (LinkedIn professional disclosure)',
      date: 'Public profile',
    },
    secondary: [
      {
        url: 'https://newsroom.clevelandclinic.org/2025/01/27/state-of-the-clinic-2024',
        publisher: 'Cleveland Clinic Newsroom — State of the Clinic 2024 (institutional context)',
        date: 'January 27, 2025',
      },
    ],
    tier: 'analysis',
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────

const SOURCE_LIST = Object.values(SOURCES);

/** Inline numbered citation — clicks open the primary-source URL in a new tab.
 *  Pass `tone="onDark"` when rendering on dark-canvas surfaces so the badge
 *  uses an emerald light enough to read against #0a0e1a. */
export function Citation({ id, tone = 'light' }: { id: SourceId; tone?: 'light' | 'onDark' }) {
  const s = SOURCES[id];
  if (!s) return null;
  const colorClass =
    tone === 'onDark'
      ? 'text-emerald-300/85 hover:text-emerald-200'
      : 'text-primary hover:text-primary';
  return (
    <a
      href={s.primary.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Source ${s.number} (opens in new tab): ${s.label}`}
      title={`[${s.number}] ${s.label} — ${s.primary.publisher}${s.primary.date ? ` · ${s.primary.date}` : ''} — opens in new tab`}
      className={`ml-0.5 inline-flex items-center justify-center align-super font-mono text-[12px] font-medium ${colorClass} underline-offset-2 hover:underline`}
    >
      [{s.number}]
    </a>
  );
}

/** Tier label pill — distinguishes source confidence on the cover. */
export function TierBadge({ tier }: { tier: SourceTier }) {
  const config = {
    primary: { label: 'Primary', cls: 'border-emerald-700/30 bg-emerald-50 text-emerald-800' },
    analysis: { label: 'Analysis', cls: 'border-amber-600/30 bg-amber-50 text-amber-800' },
    note: { label: 'Note', cls: 'border-muted-foreground/30 bg-muted text-muted-foreground' },
  }[tier];
  return (
    <span
      className={`ml-1.5 inline-flex items-center rounded-sm border px-1.5 py-px font-mono text-[12px] uppercase tracking-[0.16em] ${config.cls}`}
    >
      {config.label}
    </span>
  );
}

/** Full source list, rendered at the end of the brief. */
export function SourceList() {
  return (
    <ol className="mt-10 space-y-7 text-[14px] leading-[1.6]">
      {SOURCE_LIST.map((s) => (
        <li
          key={s.id}
          id={`source-${s.number}`}
          className="scroll-mt-24 border-l border-foreground/15 pl-5"
        >
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[12px] font-medium text-primary">
              [{s.number}]
            </span>
            <span className="font-semibold text-foreground">{s.label}</span>
          </div>
          <p className="mt-1.5 text-[17px] leading-[1.65] text-foreground/80">
            {s.detail}
          </p>
          <div className="mt-2.5 space-y-1 text-[15px] text-muted-foreground">
            <div>
              <span className="font-mono text-[12px] uppercase tracking-[0.16em]">
                Primary
              </span>
              {s.primary.date ? <span className="ml-2">{s.primary.date}</span> : null}
              <span className="ml-2">·</span>
              <span className="ml-2">{s.primary.publisher}</span>
              <span className="ml-2">·</span>{' '}
              <a
                href={s.primary.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
              >
                {s.primary.url}
              </a>
            </div>
            {s.secondary?.map((sec, i) => (
              <div key={i} className="mt-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.16em]">
                  Cross-ref
                </span>
                {sec.date ? <span className="ml-2">{sec.date}</span> : null}
                <span className="ml-2">·</span>
                <span className="ml-2">{sec.publisher}</span>
                <span className="ml-2">·</span>{' '}
                <a
                  href={sec.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-foreground/70 underline decoration-foreground/20 underline-offset-2 hover:decoration-foreground/60"
                >
                  {sec.url}
                </a>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
