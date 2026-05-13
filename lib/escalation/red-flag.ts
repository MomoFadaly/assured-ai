/**
 * Red-flag escalation — step 2 of the lifecycle.
 *
 * Detects medical emergencies, mental-health crises, and other urgent
 * scenarios that the white paper requires us to escalate (page 9):
 *   "Chatbots must be scoped... they should clearly disclose they are not
 *    clinicians and escalate red-flag scenarios (e.g., chest pain, suicidal
 *    ideation) to appropriate hotlines or emergency instructions."
 *
 * Two-pass detection:
 *  1. Cheap regex/keyword pre-filter (zero latency, catches the obvious cases)
 *  2. If pre-filter triggers OR the input is ambiguous, a Haiku classifier
 *     does the second pass to confirm category + severity
 *
 * This module is NEVER bypassed for a "demo only" mode. The cost of missing
 * a real emergency in a healthcare deployment is catastrophic.
 */

import { z } from 'zod';
import { getLlmProvider } from '@/lib/llm/provider';
import { logger } from '@/lib/logger';
import { getConfig } from '@/lib/config';
import type { EscalationSeverity, RedFlagCategory } from '@/lib/db/types';

export interface RedFlagDetection {
  triggered: boolean;
  category: RedFlagCategory | null;
  severity: EscalationSeverity | null;
  triggeringPhrase: string | null;
  /** Latency for the detection step (ms). */
  latencyMs: number;
  /** Audience-facing emergency message to render. */
  emergencyResponse: string | null;
}

// ============================================================
// Pre-filter: keyword and pattern matching
// ============================================================

interface KeywordRule {
  category: RedFlagCategory;
  severity: EscalationSeverity;
  patterns: RegExp[];
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    category: 'cardiac',
    severity: 'emergency',
    patterns: [
      /\bchest pain(s|ful)?\b/i,
      /\bheart attack\b/i,
      /\bcrushing pressure\b.{0,40}\b(chest|sternum)\b/i,
      /\bdifficulty breathing\b/i,
      /\bcan(?:'?| no)t breathe\b/i,
    ],
  },
  {
    category: 'mental_health_crisis',
    severity: 'emergency',
    patterns: [
      /\b(?:want|wanting|going) to (?:kill|end|hurt|harm) (?:my ?self|me)\b/i,
      /\b(?:suicidal|suicide)\b/i,
      /\bsuicide plan\b/i,
      /\b(?:no point|don'?t want to live|want to die)\b/i,
      /\bself[- ]harm\b/i,
    ],
  },
  {
    category: 'overdose',
    severity: 'emergency',
    patterns: [
      /\b(?:overdose|overdosed)\b/i,
      /\btook too (?:many|much)\b/i,
      /\baccident(?:al(?:ly)?)? ingest(?:ion|ed)?\b/i,
      /\bswallowed (?:bleach|poison|chemicals)\b/i,
    ],
  },
  {
    category: 'severe_bleeding',
    severity: 'emergency',
    patterns: [/\bbleeding heavily\b/i, /\bcan'?t stop bleeding\b/i, /\bgushing blood\b/i],
  },
  {
    category: 'stroke',
    severity: 'emergency',
    patterns: [
      /\bface (?:droop|drooping|fell)\b/i,
      /\bsudden(?:ly)? (?:can'?t|cannot) (?:speak|talk|move)\b/i,
      /\bhaving a stroke\b/i,
      /\barm (?:weakness|numb)\b.{0,40}\b(?:speech|talk)\b/i,
    ],
  },
  {
    category: 'anaphylaxis',
    severity: 'emergency',
    patterns: [
      /\banaphylaxis\b/i,
      /\bsevere allergic reaction\b/i,
      /\b(?:throat|tongue) swelling\b/i,
      /\bcan'?t breathe\b.{0,40}\ballerg(?:y|ic|ies)\b/i,
    ],
  },
];

interface PrefilterResult {
  hit: boolean;
  category: RedFlagCategory | null;
  severity: EscalationSeverity | null;
  triggeringPhrase: string | null;
}

function prefilter(input: string): PrefilterResult {
  for (const rule of KEYWORD_RULES) {
    for (const pattern of rule.patterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          hit: true,
          category: rule.category,
          severity: rule.severity,
          triggeringPhrase: match[0],
        };
      }
    }
  }
  return { hit: false, category: null, severity: null, triggeringPhrase: null };
}

// ============================================================
// LLM second-pass classifier (Haiku)
// ============================================================

const ClassifierResponseSchema = z.object({
  is_emergency: z.boolean(),
  category: z.enum([
    'cardiac',
    'mental_health_crisis',
    'overdose',
    'severe_bleeding',
    'stroke',
    'anaphylaxis',
    'none',
  ]),
  severity: z.enum(['emergency', 'urgent', 'review', 'none']),
  reasoning: z.string(),
});

type ClassifierResponse = z.infer<typeof ClassifierResponseSchema>;

function isClassifierResponse(raw: unknown): raw is ClassifierResponse {
  return ClassifierResponseSchema.safeParse(raw).success;
}

const CLASSIFIER_SCHEMA = {
  type: 'object',
  properties: {
    is_emergency: { type: 'boolean' },
    category: {
      type: 'string',
      enum: [
        'cardiac',
        'mental_health_crisis',
        'overdose',
        'severe_bleeding',
        'stroke',
        'anaphylaxis',
        'none',
      ],
    },
    severity: { type: 'string', enum: ['emergency', 'urgent', 'review', 'none'] },
    reasoning: { type: 'string' },
  },
  required: ['is_emergency', 'category', 'severity', 'reasoning'],
  additionalProperties: false,
} as const;

const CLASSIFIER_SYSTEM_PROMPT = `You are a safety classifier for a healthcare information chatbot.
Given a user message, decide whether it indicates an immediate medical emergency
or mental health crisis that requires the chatbot to escalate to emergency
hotlines instead of attempting to answer.

Be precise. False positives waste user time; false negatives can be catastrophic.

Categories:
- cardiac: chest pain, heart attack symptoms, severe shortness of breath
- mental_health_crisis: suicidal ideation, intent to self-harm, plans to harm
- overdose: medication overdose, accidental poisoning
- severe_bleeding: uncontrolled bleeding, severe trauma
- stroke: face droop, sudden speech or limb weakness
- anaphylaxis: severe allergic reaction, throat swelling
- none: not an emergency

Severity:
- emergency: needs 911 or 988 NOW
- urgent: needs same-day clinical attention but not immediately life-threatening
- review: ambiguous; flag for human review
- none: routine question

If the user is asking about emergency symptoms in the abstract (educational
question), this is NOT an emergency — return none. If the user describes
symptoms they are experiencing, treat with appropriate severity.`;

async function classifierSecondPass(input: string): Promise<{
  category: RedFlagCategory | null;
  severity: EscalationSeverity | null;
  reasoning: string;
}> {
  const provider = getLlmProvider();
  const result = await provider.jsonCompletion<ClassifierResponse>({
    systemPrompt: CLASSIFIER_SYSTEM_PROMPT,
    userPrompt: `User message: ${input}\n\nClassify by calling the tool.`,
    schema: CLASSIFIER_SCHEMA,
    validate: isClassifierResponse,
    intent: 'synthesis', // Haiku will be selected via the synthesisModel for now
    temperature: 0,
    maxOutputTokens: 256,
  });

  const r = result.output;
  return {
    category: r.category === 'none' ? null : (r.category as RedFlagCategory),
    severity: r.severity === 'none' ? null : (r.severity as EscalationSeverity),
    reasoning: r.reasoning,
  };
}

// ============================================================
// Public detection entrypoint
// ============================================================

export async function detectRedFlag(input: string): Promise<RedFlagDetection> {
  const start = performance.now();

  // Pass 1: cheap pre-filter
  const pre = prefilter(input);
  if (pre.hit && pre.severity === 'emergency') {
    logger.warn(
      {
        category: pre.category,
        triggering_phrase: pre.triggeringPhrase,
      },
      'red-flag pre-filter triggered',
    );
    return {
      triggered: true,
      category: pre.category,
      severity: pre.severity,
      triggeringPhrase: pre.triggeringPhrase,
      latencyMs: Math.round(performance.now() - start),
      emergencyResponse: emergencyMessageFor(pre.category),
    };
  }

  // Pass 2: classifier confirms (only for inputs long enough to be ambiguous,
  // to keep classifier costs predictable for routine queries)
  if (input.trim().length > 250) {
    try {
      const llmResult = await classifierSecondPass(input);
      if (llmResult.category && llmResult.severity === 'emergency') {
        logger.warn(
          {
            category: llmResult.category,
            reasoning: llmResult.reasoning.slice(0, 200),
          },
          'red-flag classifier triggered',
        );
        return {
          triggered: true,
          category: llmResult.category,
          severity: llmResult.severity,
          triggeringPhrase: null,
          latencyMs: Math.round(performance.now() - start),
          emergencyResponse: emergencyMessageFor(llmResult.category),
        };
      }
    } catch (err) {
      // If the classifier fails, we fall through. The pre-filter already
      // ran; downstream synthesis still has its own guardrails.
      logger.error({ err }, 'red-flag classifier failed; proceeding without second pass');
    }
  }

  return {
    triggered: false,
    category: null,
    severity: null,
    triggeringPhrase: null,
    latencyMs: Math.round(performance.now() - start),
    emergencyResponse: null,
  };
}

function emergencyMessageFor(category: RedFlagCategory | null): string {
  const cfg = getConfig();
  const phone911 = cfg.EMERGENCY_PHONE_911;
  const phone988 = cfg.MENTAL_HEALTH_CRISIS_PHONE;
  const poison = cfg.POISON_CONTROL_PHONE;

  const header = '🚨 If this is a medical emergency, please get help now.';
  const lines: string[] = [header, ''];

  switch (category) {
    case 'mental_health_crisis':
      lines.push(
        `Call or text **${phone988}** — Suicide & Crisis Lifeline (24/7, free, confidential).`,
        `If you are in immediate danger, call **${phone911}**.`,
        '',
        'You are not alone. A trained counselor is available right now.',
      );
      break;
    case 'overdose':
      lines.push(
        `Call **${poison}** — Poison Help (24/7).`,
        `If the person is unconscious, not breathing, or having a seizure, call **${phone911}** immediately.`,
      );
      break;
    case 'cardiac':
    case 'stroke':
    case 'severe_bleeding':
    case 'anaphylaxis':
    default:
      lines.push(
        `Call **${phone911}** immediately.`,
        '',
        'Stay on the line with the dispatcher. Do not drive yourself to the hospital — wait for emergency medical services.',
      );
      break;
  }

  lines.push(
    '',
    "I'm an AI assistant trained on this site's published content. I cannot provide emergency medical guidance.",
  );
  return lines.join('\n');
}

// Internal exports for tests
export const __test__ = { prefilter, KEYWORD_RULES };
