/**
 * Red-flag escalation — pack-aware.
 *
 * Each vertical pack defines its own red-flag rules: medical emergencies
 * for healthcare, fraud / market-manipulation patterns for finance,
 * imminent-harm + privilege-disclosure for legal, etc.
 *
 * Two-pass detection (unchanged from the scenario era):
 *   1. Cheap regex pre-filter from pack.red_flag_rules
 *   2. For ambiguous long inputs, a Claude Haiku classifier confirms
 *      category + severity (skipped for short obvious cases)
 *
 * This module is NEVER bypassed for a "demo only" mode. The cost of
 * missing a real emergency in a healthcare deployment is catastrophic.
 */

import { z } from 'zod';
import { getLlmProvider } from '@/lib/llm/provider';
import { logger } from '@/lib/logger';
import type { EscalationSeverity, RedFlagCategory } from '@/lib/db/types';
import type { VerticalPackRow, PackRedFlagRule } from '@/lib/packs/types';

export interface RedFlagDetection {
  triggered: boolean;
  category: string | null;
  severity: EscalationSeverity | null;
  triggeringPhrase: string | null;
  /** Latency for the detection step (ms). */
  latencyMs: number;
  /** Audience-facing emergency message to render. */
  emergencyResponse: string | null;
}

// ============================================================
// Pre-filter
// ============================================================

interface CompiledRule {
  category: string;
  severity: EscalationSeverity;
  patterns: RegExp[];
  escalation: string;
}

function compileRules(rules: PackRedFlagRule[]): CompiledRule[] {
  return rules.map((r) => ({
    category: r.category,
    severity: r.severity,
    patterns: r.patterns
      .map((p) => safeRegex(p))
      .filter((re): re is RegExp => re !== null),
    escalation: r.escalation,
  }));
}

function safeRegex(source: string): RegExp | null {
  try {
    return new RegExp(source, 'i');
  } catch {
    return null;
  }
}

interface PrefilterResult {
  hit: boolean;
  category: string | null;
  severity: EscalationSeverity | null;
  triggeringPhrase: string | null;
  escalation: string | null;
}

function prefilter(input: string, compiled: CompiledRule[]): PrefilterResult {
  for (const rule of compiled) {
    for (const pattern of rule.patterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          hit: true,
          category: rule.category,
          severity: rule.severity,
          triggeringPhrase: match[0],
          escalation: rule.escalation,
        };
      }
    }
  }
  return { hit: false, category: null, severity: null, triggeringPhrase: null, escalation: null };
}

// ============================================================
// LLM classifier (Haiku) — confirms ambiguous long inputs
// ============================================================

const ClassifierResponseSchema = z.object({
  is_emergency: z.boolean(),
  category: z.string(),
  severity: z.enum(['emergency', 'urgent', 'review', 'none']),
  reasoning: z.string(),
});

type ClassifierResponse = z.infer<typeof ClassifierResponseSchema>;

function isClassifierResponse(raw: unknown): raw is ClassifierResponse {
  return ClassifierResponseSchema.safeParse(raw).success;
}

function classifierSchemaFor(pack: VerticalPackRow) {
  const categoryEnum = [...pack.config.red_flag_rules.map((r) => r.category), 'none'];
  return {
    type: 'object',
    properties: {
      is_emergency: { type: 'boolean' },
      category: { type: 'string', enum: categoryEnum },
      severity: { type: 'string', enum: ['emergency', 'urgent', 'review', 'none'] },
      reasoning: { type: 'string' },
    },
    required: ['is_emergency', 'category', 'severity', 'reasoning'],
    additionalProperties: false,
  } as const;
}

function classifierSystemPromptFor(pack: VerticalPackRow): string {
  const categoriesDesc = pack.config.red_flag_rules
    .map((r) => `- ${r.category}: ${truncate(r.escalation, 120)}`)
    .join('\n');
  return `You are a safety classifier for the ${pack.name} vertical of the AssuredAI
verification platform. Given a user-submitted piece of content, decide whether
it indicates an emergency or otherwise dangerous situation that requires the
system to escalate to the appropriate hotline / contact instead of treating it
as ordinary editorial content.

Be precise. False positives waste user time; false negatives can be catastrophic.

Categories available in this pack:
${categoriesDesc}
- none: not an emergency, ordinary content for this vertical.

Severity:
- emergency: needs immediate external action (911, 988, regulator hotline) NOW
- urgent: needs same-day attention but not immediately life-threatening
- review: ambiguous; flag for human review
- none: routine content

If the content is asking about a topic in the abstract (educational or
descriptive question), this is NOT an emergency — return none. If it
describes an event that is happening or about to happen, treat with
appropriate severity.`;
}

async function classifierSecondPass(
  input: string,
  pack: VerticalPackRow,
): Promise<{
  category: string | null;
  severity: EscalationSeverity | null;
  escalationFor: PackRedFlagRule | null;
  reasoning: string;
}> {
  const provider = getLlmProvider();
  const result = await provider.jsonCompletion<ClassifierResponse>({
    systemPrompt: classifierSystemPromptFor(pack),
    userPrompt: `Content: ${input}\n\nClassify by calling the tool.`,
    schema: classifierSchemaFor(pack),
    validate: isClassifierResponse,
    intent: 'synthesis',
    temperature: 0,
    maxOutputTokens: 256,
  });

  const r = result.output;
  if (r.category === 'none' || r.severity === 'none') {
    return { category: null, severity: null, escalationFor: null, reasoning: r.reasoning };
  }
  const match = pack.config.red_flag_rules.find((rule) => rule.category === r.category) ?? null;
  return {
    category: r.category,
    severity: r.severity as EscalationSeverity,
    escalationFor: match,
    reasoning: r.reasoning,
  };
}

// ============================================================
// Public entry point
// ============================================================

export async function detectRedFlag(
  input: string,
  pack: VerticalPackRow,
): Promise<RedFlagDetection> {
  const start = performance.now();
  const compiled = compileRules(pack.config.red_flag_rules);

  // Pass 1: cheap pre-filter
  const pre = prefilter(input, compiled);
  if (pre.hit && pre.severity === 'emergency') {
    logger.warn(
      {
        pack: pack.slug,
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
      emergencyResponse: renderEscalation(pre.escalation ?? '', pack),
    };
  }

  // Pass 2: classifier confirms (only for inputs long enough to be ambiguous)
  if (input.trim().length > 250) {
    try {
      const llm = await classifierSecondPass(input, pack);
      if (llm.category && llm.severity === 'emergency' && llm.escalationFor) {
        logger.warn(
          {
            pack: pack.slug,
            category: llm.category,
            reasoning: llm.reasoning.slice(0, 200),
          },
          'red-flag classifier triggered',
        );
        return {
          triggered: true,
          category: llm.category,
          severity: llm.severity,
          triggeringPhrase: null,
          latencyMs: Math.round(performance.now() - start),
          emergencyResponse: renderEscalation(llm.escalationFor.escalation, pack),
        };
      }
    } catch (err) {
      logger.error({ err, pack: pack.slug }, 'red-flag classifier failed; falling through');
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

function renderEscalation(escalation: string, pack: VerticalPackRow): string {
  const header = '🚨 If this is an emergency, please get help now.';
  const footer = `\n\nI'm an AI assistant trained on this publisher's content. I cannot provide ${pack.config.compliance_framework ?? 'professional'} guidance.`;
  return `${header}\n\n${escalation}${footer}`;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

// ----------------------------------------------------------------------
// Back-compat: the old red_flag_category enum in audit_log accepts a
// fixed set of strings. New packs can introduce any category string; we
// map well-known ones to the enum and pass others as plain text via the
// `red_flag_category` TEXT column. The type alias below preserves the
// previous import path.
// ----------------------------------------------------------------------
export type { RedFlagCategory };

// ----------------------------------------------------------------------
// Test export — a precompiled healthcare ruleset mirroring the seed pack
// in migration 004. The test suite calls `__test__.prefilter(text)` to
// validate detection without needing to hit the DB for the live pack.
// Keep in sync with the healthcare red_flag_rules in 004_vertical_packs.sql.
// ----------------------------------------------------------------------
const HEALTHCARE_TEST_RULES: PackRedFlagRule[] = [
  {
    category: 'cardiac',
    severity: 'emergency',
    patterns: [
      '\\bchest pain(s|ful)?\\b',
      '\\bheart attack\\b',
      '\\bcrushing pressure\\b.{0,40}\\b(chest|sternum)\\b',
      '\\bdifficulty breathing\\b',
      "\\bcan(?:'?| no)t breathe\\b",
    ],
    escalation: 'Call 911',
  },
  {
    category: 'mental_health_crisis',
    severity: 'emergency',
    patterns: [
      '\\b(?:want|wanting|going) to (?:kill|end|hurt|harm) (?:my ?self|me)\\b',
      '\\b(?:suicidal|suicide)\\b',
      '\\bsuicide plan\\b',
      "\\b(?:no point|don'?t want to live|want to die)\\b",
      '\\bself[- ]harm\\b',
    ],
    escalation: 'Call 988',
  },
  {
    category: 'overdose',
    severity: 'emergency',
    patterns: [
      '\\b(?:overdose|overdosed)\\b',
      '\\btook too (?:many|much)\\b',
      '\\baccident(?:al(?:ly)?)? ingest(?:ion|ed)?\\b',
      '\\bswallowed (?:bleach|poison|chemicals)\\b',
    ],
    escalation: 'Call Poison Help',
  },
  {
    category: 'severe_bleeding',
    severity: 'emergency',
    patterns: ['\\bbleeding heavily\\b', "\\bcan'?t stop bleeding\\b", '\\bgushing blood\\b'],
    escalation: 'Call 911',
  },
  {
    category: 'stroke',
    severity: 'emergency',
    patterns: [
      '\\bface (?:droop|drooping|fell)\\b',
      "\\bsudden(?:ly)? (?:can'?t|cannot) (?:speak|talk|move)\\b",
      '\\bhaving a stroke\\b',
      '\\barm (?:weakness|numb)\\b.{0,40}\\b(?:speech|talk)\\b',
    ],
    escalation: 'Call 911',
  },
  {
    category: 'anaphylaxis',
    severity: 'emergency',
    patterns: [
      '\\banaphylaxis\\b',
      '\\bsevere allergic reaction\\b',
      '\\b(?:throat|tongue) swelling\\b',
      "\\bcan'?t breathe\\b.{0,40}\\ballerg(?:y|ic|ies)\\b",
    ],
    escalation: 'Use EpiPen and call 911',
  },
];
const HEALTHCARE_TEST_COMPILED = compileRules(HEALTHCARE_TEST_RULES);
export const __test__ = {
  prefilter: (input: string) => prefilter(input, HEALTHCARE_TEST_COMPILED),
  KEYWORD_RULES: HEALTHCARE_TEST_RULES,
};
