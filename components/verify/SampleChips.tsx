'use client';

import * as React from 'react';
import { Sparkles, ShieldAlert, AlertCircle, HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DraftFormat } from './InputPanel';

/**
 * Pre-filled samples for the verifier — one-click affordances so reviewers
 * don't have to think about what to paste. Each sample is engineered to
 * exercise a specific layer of the compliance pipeline, so the verifier's
 * output is meaningfully different per chip:
 *
 *   - "clean"       — verifies cleanly with citations to the corpus
 *   - "phi"         — triggers PHI redaction at the I/O boundary
 *   - "fabricated"  — triggers suggest-fix on an unsourced claim
 *   - "red-flag"    — triggers safety routing (bypasses the LLM entirely)
 */

export interface PasteSample {
  key: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'amber' | 'red' | 'primary';
  text: string;
}

export interface DraftSample {
  key: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'amber' | 'red' | 'primary';
  brief: string;
  format: DraftFormat;
}

export const PASTE_SAMPLES: PasteSample[] = [
  {
    key: 'clean',
    label: 'Clean article',
    hint: 'Verifies cleanly with citations',
    icon: <Sparkles className="h-3 w-3" />,
    tone: 'emerald',
    text: `The DASH eating plan emphasizes fruits, vegetables, whole grains, and low-fat dairy to help lower blood pressure. Adults should aim for 150 minutes of moderate-intensity physical activity per week, such as brisk walking. Limiting sodium intake to less than 2,300 mg per day and avoiding excess alcohol also help maintain healthy blood pressure levels.`,
  },
  {
    key: 'phi',
    label: 'With patient PHI',
    hint: 'Triggers redaction',
    icon: <ShieldAlert className="h-3 w-3" />,
    tone: 'amber',
    text: `Patient John Smith (MRN 8842-91) was recently diagnosed with Type 2 diabetes. His doctor recommended a healthy eating plan and regular physical activity. Eating fruits, vegetables, whole grains, and lean proteins can help manage blood sugar. For questions, contact john.smith@example.com or call 555-867-5309.`,
  },
  {
    key: 'fabricated',
    label: 'With a fabricated stat',
    hint: 'Triggers suggest-fix',
    icon: <AlertCircle className="h-3 w-3" />,
    tone: 'amber',
    text: `Eating fruits, nonstarchy vegetables, whole grains, and lean proteins can help manage blood sugar in adults with Type 2 diabetes. Drinking green tea three times per day reduces cholesterol by 47% in adults over 50. Walking 30 minutes per day is also recommended for cardiovascular health.`,
  },
  {
    key: 'red-flag',
    label: 'Cardiac emergency',
    hint: 'Triggers safety routing',
    icon: <HeartPulse className="h-3 w-3" />,
    tone: 'red',
    text: `If you are experiencing crushing chest pain that radiates down your left arm, try lying down and taking deep, slow breaths until the pain passes. Aspirin can help. Most chest pain in healthy adults resolves on its own within 20 minutes.`,
  },
];

export const DRAFT_SAMPLES: DraftSample[] = [
  {
    key: 'diabetes-handout',
    label: 'Diabetes handout',
    hint: '500-word patient handout',
    icon: <Sparkles className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      '500-word patient handout for adults newly diagnosed with type 2 diabetes. Cover diet basics (what to eat, what to limit), physical activity guidance, and when to call their care team. Plain language, no medical jargon.',
    format: 'handout',
  },
  {
    key: 'flu-faq',
    label: 'Flu shot FAQ',
    hint: '5 Q&A pairs for parents',
    icon: <Sparkles className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      'FAQ for parents about back-to-school flu shots for kids ages 5 to 12. 5 question/answer pairs covering safety, timing, side effects, where to get one, and what to do if their child is sick.',
    format: 'faq',
  },
  {
    key: 'bp-qa',
    label: 'Blood-pressure Q&A',
    hint: 'Conversational answer',
    icon: <Sparkles className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      'Conversational Q&A: "What is the DASH eating plan and how does it help blood pressure?" 2-4 paragraphs, friendly tone, cites the underlying evidence.',
    format: 'qa',
  },
  {
    key: 'telehealth-email',
    label: 'Telehealth newsletter',
    hint: 'Newsletter blurb',
    icon: <Sparkles className="h-3 w-3" />,
    tone: 'emerald',
    brief:
      'Newsletter blurb for a hospital system\'s patient mailing list: new telehealth coverage rules going into effect, what patients need to do, and how to schedule a virtual visit. 150-220 words.',
    format: 'email',
  },
];

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
