/**
 * Wizard types — client-safe.
 *
 * State shape + meta for the /get-started flow. Kept here (no
 * server-only imports) so client step components can pull just the
 * types without dragging the rest of the wizard backend through
 * Next's bundler.
 */

export type Industry = 'healthcare' | 'finance' | 'government' | 'legal';

export const INDUSTRIES: Industry[] = ['healthcare', 'finance', 'government', 'legal'];

/**
 * Per-industry presentation metadata. The hex accent threads through
 * the hover states, progress bar fill, and badge tints after the
 * user picks. Keep these aligned with the four vertical packs in
 * `packages/db/004_vertical_packs.sql`.
 */
export const INDUSTRY_META: Record<
  Industry,
  {
    name: string;
    compliance: string;
    accent: string;
    accentSoft: string;
    recent: number;
  }
> = {
  healthcare: {
    name: 'Healthcare',
    compliance: 'HIPAA · BAA-ready',
    accent: '#0d9488',
    accentSoft: '#ccfbf1',
    recent: 47,
  },
  finance: {
    name: 'Finance',
    compliance: 'SEC · FINRA · SOX',
    accent: '#047857',
    accentSoft: '#d1fae5',
    recent: 31,
  },
  government: {
    name: 'Government',
    compliance: 'Plain-language · § 508',
    accent: '#475569',
    accentSoft: '#e2e8f0',
    recent: 18,
  },
  legal: {
    name: 'Legal',
    compliance: 'ABA Model Rules',
    accent: '#7e22ce',
    accentSoft: '#f3e8ff',
    recent: 9,
  },
};

/**
 * Pack-tailored role options. We surface a different set per industry
 * because a CISO at a hospital cares about different things than a
 * Chief Compliance Officer at a bank.
 */
export const ROLES_BY_INDUSTRY: Record<
  Industry,
  Array<{ id: string; label: string; sub: string }>
> = {
  healthcare: [
    { id: 'head_digital', label: 'Head of Digital', sub: 'Owns the web + content channels end-to-end' },
    { id: 'ai_lead', label: 'AI Transformation Lead', sub: 'Rolling out generative AI safely across the org' },
    { id: 'ciso', label: 'CISO / Security', sub: 'Risk owner, OCR letters land on your desk' },
    { id: 'compliance', label: 'Compliance / Privacy', sub: 'HIPAA, BAA, OCR correspondence' },
    { id: 'editorial', label: 'Editorial / Content', sub: 'Patient-education, marketing, web' },
    { id: 'medical_dir', label: 'Medical Director', sub: 'Clinical oversight, MA approval' },
    { id: 'marketing', label: 'Marketing / Comms', sub: 'Brand, growth, social' },
  ],
  finance: [
    { id: 'head_digital', label: 'Head of Digital', sub: 'Public-facing web + comms platforms' },
    { id: 'ai_lead', label: 'AI Transformation Lead', sub: 'Generative AI program owner, safety-first' },
    { id: 'cco', label: 'CCO / Compliance', sub: 'FINRA, SEC marketing rule, supervision' },
    { id: 'ciso', label: 'CISO / Security', sub: 'Risk owner, vendor reviews, SOX' },
    { id: 'marketing', label: 'Marketing / CMO', sub: 'Fund factsheets, social, retirement comms' },
    { id: 'editorial', label: 'Editorial / Content', sub: 'Wealth, retail, advisory content' },
    { id: 'engineering', label: 'Engineering / Platform', sub: 'CMS integration, dev review' },
  ],
  government: [
    { id: 'head_digital', label: 'Head of Digital', sub: 'Agency digital service or web team lead' },
    { id: 'ai_lead', label: 'AI Transformation Lead', sub: 'Responsible-AI program, EO 14110 posture' },
    { id: 'public_affairs', label: 'Public Affairs', sub: 'Agency communications, press, plain-language' },
    { id: 'compliance', label: 'Compliance / Records', sub: 'FOIA, § 508, transparency mandates' },
    { id: 'ciso', label: 'CISO / Security', sub: 'FedRAMP, FISMA, ATO posture' },
    { id: 'editorial', label: 'Editorial / Content', sub: 'Citizen-facing guidance, services, alerts' },
    { id: 'engineering', label: 'Engineering / Web', sub: 'Web team, CMS, accessibility' },
  ],
  legal: [
    { id: 'head_digital', label: 'Head of Digital', sub: 'Firm web + insights distribution' },
    { id: 'ai_lead', label: 'AI Transformation Lead', sub: 'Generative AI rollout, ethics screen owner' },
    { id: 'legal_counsel', label: 'GC / Legal Counsel', sub: 'ABA Model Rules, privilege, Rule 1.6' },
    { id: 'compliance', label: 'Compliance / Ethics', sub: 'Bar compliance, ethics screen' },
    { id: 'marketing', label: 'Marketing / BD', sub: 'Case studies, web, social, thought leadership' },
    { id: 'editorial', label: 'Editorial / Content', sub: 'Insights, alerts, knowledge management' },
    { id: 'ciso', label: 'CISO / Security', sub: 'Client data protection, vendor reviews' },
  ],
};

export type CmsPlatform =
  | 'wordpress'
  | 'custom-cms'
  | 'headless'
  | 'aem'
  | 'sitecore'
  | 'salesforce-marketing'
  | 'other';

export const CMS_OPTIONS: Array<{ id: CmsPlatform; label: string }> = [
  { id: 'wordpress', label: 'WordPress' },
  { id: 'custom-cms', label: 'Custom CMS' },
  { id: 'headless', label: 'Headless (Contentful, Sanity, Strapi)' },
  { id: 'aem', label: 'Adobe Experience Manager' },
  { id: 'sitecore', label: 'Sitecore' },
  { id: 'salesforce-marketing', label: 'Salesforce Marketing Cloud' },
  { id: 'other', label: 'Other' },
];

export const VOLUME_OPTIONS = [
  { id: 'under-100', label: 'Under 100 / month' },
  { id: '100-500', label: '100–500 / month' },
  { id: '500-2k', label: '500–2,000 / month' },
  { id: '2k-10k', label: '2,000–10,000 / month' },
  { id: '10k-plus', label: '10,000+ / month' },
  { id: 'unknown', label: 'Not sure yet' },
] as const;

export type ContentSource =
  | 'in-house'
  | 'ai-drafted'
  | 'agency'
  | 'freelance'
  | 'partner-reposts'
  | 'vendor-supplied';

export const CONTENT_SOURCE_OPTIONS: Array<{ id: ContentSource; label: string; sub: string }> = [
  { id: 'in-house', label: 'In-house writers', sub: 'Editors, staff writers, comms team' },
  { id: 'ai-drafted', label: 'AI-drafted', sub: 'Claude, ChatGPT, in-house LLMs' },
  { id: 'agency', label: 'Agency-delivered', sub: 'Outside content shops, PR firms' },
  { id: 'freelance', label: 'Freelance / contractor', sub: 'Independent writers' },
  { id: 'partner-reposts', label: 'Partner / press reposts', sub: 'Shared, syndicated, licensed' },
  { id: 'vendor-supplied', label: 'Vendor-supplied', sub: 'Whitepapers, fact sheets, decks' },
];

export type Region = 'us-east-1' | 'us-west-2' | 'eu-central-1' | 'ap-southeast-2';

export const REGION_OPTIONS: Array<{ id: Region; label: string }> = [
  { id: 'us-east-1', label: 'US East (Virginia)' },
  { id: 'us-west-2', label: 'US West (Oregon)' },
  { id: 'eu-central-1', label: 'EU Central (Frankfurt)' },
  { id: 'ap-southeast-2', label: 'AP Southeast (Sydney)' },
];

export interface WizardState {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  industry: Industry | null;
  role: string | null;
  contentSources: ContentSource[];
  cmsPlatform: CmsPlatform | null;
  monthlyVolume: string | null;
  compliance: {
    baaNeeded: boolean;
    soc2Needed: boolean;
    fedrampNeeded: boolean;
    region: Region;
    retentionDays: number;
  };
  verification: {
    auditLogId: number | null;
    verdict: string | null;
    proofUrl: string | null;
    sampleSlug: string | null;
  };
  account: {
    name: string;
    email: string;
    password: string;
  };
}

export const INITIAL_WIZARD_STATE: WizardState = {
  step: 1,
  industry: null,
  role: null,
  contentSources: [],
  cmsPlatform: null,
  monthlyVolume: null,
  compliance: {
    baaNeeded: false,
    soc2Needed: false,
    fedrampNeeded: false,
    region: 'us-east-1',
    retentionDays: 2555,
  },
  verification: {
    auditLogId: null,
    verdict: null,
    proofUrl: null,
    sampleSlug: null,
  },
  account: {
    name: '',
    email: '',
    password: '',
  },
};

export type WizardAction =
  | { type: 'set_industry'; industry: Industry }
  | { type: 'set_role'; role: string }
  | { type: 'toggle_content_source'; source: ContentSource }
  | { type: 'set_cms'; cms: CmsPlatform }
  | { type: 'set_volume'; volume: string }
  | { type: 'set_compliance'; compliance: Partial<WizardState['compliance']> }
  | { type: 'set_verification'; verification: Partial<WizardState['verification']> }
  | { type: 'set_account'; account: Partial<WizardState['account']> }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goto'; step: WizardState['step'] };

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'set_industry':
      return { ...state, industry: action.industry, role: null };
    case 'set_role':
      return { ...state, role: action.role };
    case 'toggle_content_source': {
      const next = new Set(state.contentSources);
      if (next.has(action.source)) next.delete(action.source);
      else next.add(action.source);
      return { ...state, contentSources: Array.from(next) };
    }
    case 'set_cms':
      return { ...state, cmsPlatform: action.cms };
    case 'set_volume':
      return { ...state, monthlyVolume: action.volume };
    case 'set_compliance':
      return { ...state, compliance: { ...state.compliance, ...action.compliance } };
    case 'set_verification':
      return { ...state, verification: { ...state.verification, ...action.verification } };
    case 'set_account':
      return { ...state, account: { ...state.account, ...action.account } };
    case 'next':
      return state.step < 6 ? { ...state, step: (state.step + 1) as WizardState['step'] } : state;
    case 'back':
      return state.step > 1 ? { ...state, step: (state.step - 1) as WizardState['step'] } : state;
    case 'goto':
      return { ...state, step: action.step };
  }
}

export const STEP_LABELS: Record<WizardState['step'], string> = {
  1: 'Industry',
  2: 'Role',
  3: 'Publishing',
  4: 'Compliance',
  5: 'Verify',
  6: 'Provision',
};
