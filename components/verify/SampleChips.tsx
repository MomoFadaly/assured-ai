'use client';

import * as React from 'react';
import {
  Sparkles,
  ShieldAlert,
  AlertCircle,
  HeartPulse,
  Landmark,
  Scale,
  Banknote,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DraftFormat } from './InputPanel';

/**
 * Pre-filled samples — one-click affordances per vertical pack so reviewers
 * don't have to think about what to paste. Each sample is engineered to
 * exercise a specific layer of the compliance pipeline for that pack:
 *
 *   - "clean"       — verifies cleanly with citations from the pack's corpus
 *   - "pii"         — triggers PII redaction with pack-specific recognizers
 *   - "fabricated"  — triggers suggest-fix on an unsourced claim
 *   - "red-flag"    — triggers safety routing with the pack's red-flag rules
 *
 * Filter via `getPasteSamples(packSlug)` so the verifier only shows samples
 * relevant to the user's currently-selected vertical.
 */

export interface PasteSample {
  key: string;
  /** Vertical pack slug this sample is engineered for. */
  pack: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'amber' | 'red' | 'primary';
  text: string;
}

export interface DraftSample {
  key: string;
  pack: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'amber' | 'red' | 'primary';
  brief: string;
  format: DraftFormat;
}

const HEALTHCARE_PASTE: PasteSample[] = [
  {
    key: 'hc-clean',
    pack: 'healthcare',
    label: 'Clean article',
    hint: 'Verifies cleanly with citations',
    icon: <Sparkles className="h-3 w-3" />,
    tone: 'emerald',
    text: `The DASH eating plan emphasizes fruits, vegetables, whole grains, and low-fat dairy to help lower blood pressure. Adults should aim for 150 minutes of moderate-intensity physical activity per week, such as brisk walking. Limiting sodium intake to less than 2,300 mg per day and avoiding excess alcohol also help maintain healthy blood pressure levels.`,
  },
  {
    key: 'hc-phi',
    pack: 'healthcare',
    label: 'With patient PHI',
    hint: 'Triggers PHI redaction (name, MRN, email, phone)',
    icon: <ShieldAlert className="h-3 w-3" />,
    tone: 'amber',
    text: `Patient John Smith (MRN 8842-91) was recently diagnosed with Type 2 diabetes. His doctor recommended a healthy eating plan and regular physical activity. Eating fruits, vegetables, whole grains, and lean proteins can help manage blood sugar. For questions, contact john.smith@example.com or call 555-867-5309.`,
  },
  {
    key: 'hc-fabricated',
    pack: 'healthcare',
    label: 'Fabricated stat',
    hint: 'Triggers suggest-fix on the unsourced claim',
    icon: <AlertCircle className="h-3 w-3" />,
    tone: 'amber',
    text: `Eating fruits, nonstarchy vegetables, whole grains, and lean proteins can help manage blood sugar in adults with Type 2 diabetes. Drinking green tea three times per day reduces cholesterol by 47% in adults over 50. Walking 30 minutes per day is also recommended for cardiovascular health.`,
  },
  {
    key: 'hc-red-flag',
    pack: 'healthcare',
    label: 'Cardiac emergency',
    hint: 'Triggers safety routing (911 escalation)',
    icon: <HeartPulse className="h-3 w-3" />,
    tone: 'red',
    text: `If you are experiencing crushing chest pain that radiates down your left arm, try lying down and taking deep, slow breaths until the pain passes. Aspirin can help. Most chest pain in healthy adults resolves on its own within 20 minutes.`,
  },
];

const GOVERNMENT_PASTE: PasteSample[] = [
  {
    key: 'gov-clean',
    pack: 'government',
    label: 'Policy explainer',
    hint: 'Plain-language policy summary',
    icon: <Sparkles className="h-3 w-3" />,
    tone: 'emerald',
    text: `California has expanded telehealth coverage requirements for state-regulated health plans. Plans must reimburse telehealth visits at parity with in-person visits for primary care, mental health, and chronic disease management. Audio-only telehealth is also covered for residents without reliable broadband, particularly in rural counties.`,
  },
  {
    key: 'gov-pii',
    pack: 'government',
    label: 'With constituent PII',
    hint: 'Triggers PII redaction (SSN, passport, phone)',
    icon: <ShieldAlert className="h-3 w-3" />,
    tone: 'amber',
    text: `Constituent Maria Garcia (SSN 412-55-9982, passport 489221773) submitted a request regarding her unemployment insurance claim. She can be reached at maria.garcia@example.com or (916) 555-2210 between 9am and 5pm Pacific time.`,
  },
  {
    key: 'gov-fabricated',
    pack: 'government',
    label: 'Unsourced figure',
    hint: 'Triggers suggest-fix on a fabricated statistic',
    icon: <AlertCircle className="h-3 w-3" />,
    tone: 'amber',
    text: `The California DMV processes roughly 12 million license renewals annually. Online renewal applications are typically approved within 48 hours, with 99.7% of submissions completed without follow-up. Drivers age 70 and over must complete an in-person vision test at every renewal.`,
  },
  {
    key: 'gov-red-flag',
    pack: 'government',
    label: 'Crisis escalation',
    hint: 'Triggers mental-health crisis routing',
    icon: <HeartPulse className="h-3 w-3" />,
    tone: 'red',
    text: `I've been calling the unemployment office for three weeks and nobody returns my calls. I lost my apartment last week. I don't want to live like this anymore. I'm thinking about ending it all this weekend.`,
  },
];

const FINANCE_PASTE: PasteSample[] = [
  {
    key: 'fin-clean',
    pack: 'finance',
    label: 'Compliant explainer',
    hint: 'Verifies cleanly with proper disclaimers',
    icon: <Banknote className="h-3 w-3" />,
    tone: 'emerald',
    text: `Index funds are investment vehicles that track a market index, such as the S&P 500, by holding the same securities in the same proportions. They typically charge lower expense ratios than actively-managed funds because they require less day-to-day management. Past performance is not indicative of future results. Consult a qualified financial professional regarding your individual circumstances.`,
  },
  {
    key: 'fin-pii',
    pack: 'finance',
    label: 'With financial PII',
    hint: 'Triggers PII redaction (SSN, credit card, bank, IBAN)',
    icon: <ShieldAlert className="h-3 w-3" />,
    tone: 'amber',
    text: `Account holder Sarah Chen (SSN 287-44-1109) wired $14,500 from account 4532-1488-0926-7715 to IBAN DE89370400440532013000 on March 14. The transfer fee of $35 was deducted automatically. Confirmation reference 8821-AX-44-72219 was sent to her registered email.`,
  },
  {
    key: 'fin-fraud',
    pack: 'finance',
    label: 'Fraud-language claim',
    hint: 'Triggers SEC/FINRA red-flag (guaranteed returns)',
    icon: <Scale className="h-3 w-3" />,
    tone: 'red',
    text: `Our proprietary algorithmic strategy delivers guaranteed returns of 18-22% annually with zero downside risk. We've identified a market inefficiency that allows us to double your money within 18 months. This is a once-in-a-lifetime opportunity to invest before the announcement next quarter.`,
  },
  {
    key: 'fin-unsourced',
    pack: 'finance',
    label: 'Fabricated market stat',
    hint: 'Triggers suggest-fix on the unsourced market claim',
    icon: <AlertCircle className="h-3 w-3" />,
    tone: 'amber',
    text: `Over the last ten years, dividend-paying stocks have outperformed non-dividend payers by 8.4% annually with 36% less volatility. Investors holding dividend ETFs in their retirement accounts have seen median portfolio growth of 412% since 2015. Diversification across sectors reduces this advantage somewhat.`,
  },
];

const LEGAL_PASTE: PasteSample[] = [
  {
    key: 'legal-clean',
    pack: 'legal',
    label: 'Compliant explainer',
    hint: 'Verifies cleanly with proper attorney-client disclaimer',
    icon: <FileText className="h-3 w-3" />,
    tone: 'emerald',
    text: `A power of attorney (POA) is a written authorization to act on another person's behalf in legal or financial matters. The principal grants authority to an agent, who must act in the principal's best interest. POAs vary by jurisdiction and can be limited or general. This content is for general informational purposes only and does not constitute legal advice. Consult a qualified attorney about your specific situation.`,
  },
  {
    key: 'legal-pii',
    pack: 'legal',
    label: 'With client PII',
    hint: 'Triggers PII redaction (name, SSN, license, contact)',
    icon: <ShieldAlert className="h-3 w-3" />,
    tone: 'amber',
    text: `Client David Park (SSN 511-22-8849, driver license CA D2244187) signed retainer for the personal injury matter involving the accident on October 3rd. Reachable at david.park.legal@example.com or (415) 555-7732. The settlement demand letter is being prepared for delivery to opposing counsel.`,
  },
  {
    key: 'legal-imminent',
    pack: 'legal',
    label: 'Imminent-harm disclosure',
    hint: 'Triggers ABA Model Rule 1.6(b) red-flag',
    icon: <Landmark className="h-3 w-3" />,
    tone: 'red',
    text: `I'm meeting with my business partner tomorrow afternoon. He stole $200,000 from our company and I have proof now. I'm going to confront him at his office and I have a gun in my car. He's going to pay for what he did to me one way or another.`,
  },
  {
    key: 'legal-fabricated',
    pack: 'legal',
    label: 'Unsourced legal claim',
    hint: 'Triggers suggest-fix on the unsourced rule citation',
    icon: <AlertCircle className="h-3 w-3" />,
    tone: 'amber',
    text: `Under the federal Fair Debt Collection Practices Act, debt collectors are prohibited from contacting debtors more than three times per week. Violations carry mandatory statutory damages of $4,500 per incident. Most cases settle within 90 days, with consumers recovering an average of $11,200 in damages.`,
  },
];

export const ALL_PASTE_SAMPLES: PasteSample[] = [
  ...HEALTHCARE_PASTE,
  ...GOVERNMENT_PASTE,
  ...FINANCE_PASTE,
  ...LEGAL_PASTE,
];

/** Back-compat: legacy callers still import PASTE_SAMPLES. Returns healthcare. */
export const PASTE_SAMPLES = HEALTHCARE_PASTE;

export function getPasteSamples(packSlug: string): PasteSample[] {
  const filtered = ALL_PASTE_SAMPLES.filter((s) => s.pack === packSlug);
  return filtered.length > 0 ? filtered : HEALTHCARE_PASTE;
}

const HEALTHCARE_DRAFT: DraftSample[] = [
  {
    key: 'hc-diabetes-handout',
    pack: 'healthcare',
    label: 'Diabetes handout',
    hint: '500-word patient handout',
    icon: <Sparkles className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      '500-word patient handout for adults newly diagnosed with type 2 diabetes. Cover diet basics (what to eat, what to limit), physical activity guidance, and when to call their care team. Plain language, no medical jargon.',
    format: 'handout',
  },
  {
    key: 'hc-flu-faq',
    pack: 'healthcare',
    label: 'Flu shot FAQ',
    hint: '5 Q&A pairs for parents',
    icon: <Sparkles className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      'FAQ for parents about back-to-school flu shots for kids ages 5 to 12. 5 question/answer pairs covering safety, timing, side effects, where to get one, and what to do if their child is sick.',
    format: 'faq',
  },
  {
    key: 'hc-bp-qa',
    pack: 'healthcare',
    label: 'Blood-pressure Q&A',
    hint: 'Conversational answer',
    icon: <Sparkles className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      'Conversational Q&A: "What is the DASH eating plan and how does it help blood pressure?" 2-4 paragraphs, friendly tone, cites the underlying evidence.',
    format: 'qa',
  },
  {
    key: 'hc-telehealth-email',
    pack: 'healthcare',
    label: 'Telehealth newsletter',
    hint: 'Newsletter blurb',
    icon: <Sparkles className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      "Newsletter blurb for a hospital system's patient mailing list: new telehealth coverage rules going into effect, what patients need to do, and how to schedule a virtual visit. 150-220 words.",
    format: 'email',
  },
];

const GOVERNMENT_DRAFT: DraftSample[] = [
  {
    key: 'gov-policy-explainer',
    pack: 'government',
    label: 'Policy explainer',
    hint: 'Citizen-facing rule summary',
    icon: <Landmark className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      "Plain-language explainer for a new state policy on driver license renewal eligibility for adults over 70. Cover the new vision-test requirement, what documents to bring, processing time, and how to schedule. 350-400 words, sixth-grade reading level.",
    format: 'handout',
  },
  {
    key: 'gov-faq',
    pack: 'government',
    label: 'Benefits FAQ',
    hint: '5 Q&A on unemployment',
    icon: <Landmark className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      "FAQ for residents about new unemployment-insurance eligibility rules going into effect next month. 5 question/answer pairs covering who qualifies, how to apply, processing time, appeal rights, and where to get help.",
    format: 'faq',
  },
];

const FINANCE_DRAFT: DraftSample[] = [
  {
    key: 'fin-investing-101',
    pack: 'finance',
    label: 'Index fund explainer',
    hint: 'Plain-language with disclaimers',
    icon: <Banknote className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      "Patient, neutral explainer for retail investors: what an S&P 500 index fund is, how it differs from active mutual funds and ETFs, what the expense ratio means in practice, and the trade-offs. 400-500 words. Include appropriate risk and 'past performance' disclaimers; never recommend specific securities.",
    format: 'handout',
  },
  {
    key: 'fin-ira-qa',
    pack: 'finance',
    label: 'IRA Q&A',
    hint: 'Conversational answer',
    icon: <Banknote className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      "Conversational Q&A: 'What's the difference between a Traditional IRA and a Roth IRA?' 2-4 paragraphs, friendly tone, distinguish tax treatment, contribution rules, withdrawal rules, and when each makes sense. Direct readers to a qualified financial professional for individual advice.",
    format: 'qa',
  },
];

const LEGAL_DRAFT: DraftSample[] = [
  {
    key: 'legal-poa-faq',
    pack: 'legal',
    label: 'Power-of-attorney FAQ',
    hint: 'Consumer legal FAQ',
    icon: <Scale className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      "Consumer legal FAQ on powers of attorney. 5 Q&A pairs: what a POA is, types (general vs durable vs healthcare), how to set one up, how to revoke, jurisdictional variation. Include the standard 'not legal advice / attorney-client relationship' disclaimer.",
    format: 'faq',
  },
  {
    key: 'legal-tenant-rights',
    pack: 'legal',
    label: 'Tenant rights explainer',
    hint: 'Plain-language overview',
    icon: <Scale className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      "Plain-language explainer for renters on tenant rights when a landlord wants to end the lease early. Cover notice requirements, security deposit return rules, what to do if you disagree, when to seek an attorney. 350-400 words. Note that rules vary by state.",
    format: 'handout',
  },
];

export const ALL_DRAFT_SAMPLES: DraftSample[] = [
  ...HEALTHCARE_DRAFT,
  ...GOVERNMENT_DRAFT,
  ...FINANCE_DRAFT,
  ...LEGAL_DRAFT,
];

export const DRAFT_SAMPLES = HEALTHCARE_DRAFT;

export function getDraftSamples(packSlug: string): DraftSample[] {
  const filtered = ALL_DRAFT_SAMPLES.filter((s) => s.pack === packSlug);
  return filtered.length > 0 ? filtered : HEALTHCARE_DRAFT;
}

const TONE_STYLES = {
  emerald:
    'hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-700 dark:hover:text-emerald-300',
  amber:
    'hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-300',
  red:
    'hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-700 dark:hover:text-red-300',
  primary: 'hover:bg-primary/10 hover:border-primary/40 hover:text-primary',
};

/**
 * Row of one-click sample chips. Each chip calls onSelect with the sample
 * payload — the parent decides what to do (fill textarea, optionally also
 * auto-submit, etc.).
 */
export function SampleChips<T extends PasteSample | DraftSample>({
  samples,
  onSelect,
  disabled,
}: {
  samples: T[];
  onSelect: (sample: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2 text-[11px] text-muted-foreground">
        <span className="font-medium">Try a sample</span>
        <span className="text-muted-foreground/60">— one click pre-fills the form</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {samples.map((s) => (
          <button
            key={s.key}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(s)}
            title={s.hint}
            className={cn(
              'group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[12px] font-medium text-foreground/75 shadow-sm transition-all',
              'disabled:cursor-not-allowed disabled:opacity-50',
              TONE_STYLES[s.tone],
            )}
          >
            <span className="text-muted-foreground group-hover:text-current">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
