/**
 * Free-form article draft synthesis — pack-aware.
 *
 * The model writes from its own knowledge in the voice of the supplied
 * vertical pack. The verification pipeline (fact-check, PII redaction,
 * red-flag check, disclaimer injection) runs after.
 *
 * Voice prompt comes from `pack.config.draft_voice_prompt` — no hardcoded
 * scenario branches.
 */

import { getLlmProvider } from '@/lib/llm/provider';
import type { VerticalPackRow } from '@/lib/packs/types';

export type DraftFormat = 'qa' | 'handout' | 'faq' | 'social' | 'email';

export const DRAFT_FORMATS: DraftFormat[] = ['qa', 'handout', 'faq', 'social', 'email'];

export interface DraftParagraph {
  text: string;
}

export interface DraftResponse {
  paragraphs: DraftParagraph[];
  notes?: string;
}

export interface DraftParams {
  brief: string;
  pack: VerticalPackRow;
  format: DraftFormat;
}

export interface DraftResult {
  response: DraftResponse;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
}

interface FormatSpec {
  instruction: string;
  maxOutputTokens: number;
}

const FORMAT_SPECS: Record<DraftFormat, FormatSpec> = {
  qa: {
    instruction:
      'Output format: a direct conversational answer. 1–4 short paragraphs. No headings.',
    maxOutputTokens: 2048,
  },
  handout: {
    instruction: `Output format: a reader handout draft, suitable for editorial review and publication.
- Paragraph 1: a one-line title followed by a 1–2 sentence intro framing the topic.
- Paragraphs 2–5: each one a self-contained section. Begin each with a short bold-style label (e.g. "What it is — ", "Why it matters — ", "What to do — ", "When to seek help — "). Keep each section 2–4 sentences.
- Final paragraph: a short closing that names a concrete next step.
- Total length: ~250–500 words. Plain language.`,
    maxOutputTokens: 3000,
  },
  faq: {
    instruction: `Output format: a frequently-asked-questions block.
- Produce 4–6 paragraphs.
- Each paragraph is ONE Q + A pair, formatted exactly as: "Q: <question>\\nA: <answer>".
- Questions should be the ones a real reader of this topic would actually ask.
- No intro paragraph, no closing paragraph — just the Q/A pairs.`,
    maxOutputTokens: 2500,
  },
  social: {
    instruction: `Output format: a short social-media-ready post (single platform-agnostic caption).
- Exactly ONE paragraph, 60–110 words.
- Plain prose, no hashtags, no emoji unless explicitly requested.
- Ends with a soft, non-clinical call to action.`,
    maxOutputTokens: 800,
  },
  email: {
    instruction: `Output format: a short newsletter / email blurb.
- 2–3 paragraphs, total length ~150–220 words.
- Paragraph 1: hook + the single most important fact.
- Paragraph 2: practical detail or context.
- Paragraph 3 (optional): one concrete next step.`,
    maxOutputTokens: 1800,
  },
};

const DRAFT_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    paragraphs: {
      type: 'array',
      description: 'The article body, broken into paragraphs.',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The paragraph text.' },
        },
        required: ['text'],
        additionalProperties: false,
      },
      minItems: 1,
    },
    notes: {
      type: 'string',
      description:
        'Optional. Author-facing note about uncertainty, caveats, or facts the editor should verify.',
    },
  },
  required: ['paragraphs'],
  additionalProperties: false,
} as const;

function isDraftResponse(raw: unknown): raw is DraftResponse {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.paragraphs)) return false;
  for (const p of r.paragraphs) {
    if (!p || typeof p !== 'object') return false;
    const para = p as Record<string, unknown>;
    if (typeof para.text !== 'string' || para.text.length === 0) return false;
  }
  if (r.notes !== undefined && typeof r.notes !== 'string') return false;
  return true;
}

export async function draftArticle(params: DraftParams): Promise<DraftResult> {
  const spec = FORMAT_SPECS[params.format];
  const provider = getLlmProvider();

  const systemPrompt = `${params.pack.config.draft_voice_prompt}

You are drafting an article that will be reviewed by an editor and run through an automated compliance check (the AssuredAI verification pipeline) before publication. Your job is to produce a strong first draft.

Guidelines:
1. Write the requested article using accurate information from your training. The compliance system will fact-check claims against an approved source library after you draft.
2. If a claim is uncertain or you would normally hedge, write it clearly anyway and add a short note in the "notes" field flagging it for the editor.
3. Do NOT include personal identifiers (names, IDs, account numbers, addresses) — even hypothetical ones — they will be flagged and redacted by the PII pass.
4. Do NOT echo emergency triage instructions inline (e.g. "call 911 if…") — the system has a separate red-flag escalation mechanism that handles this.

${spec.instruction}`;

  const userPrompt = `Editorial brief: ${params.brief}

Produce a ${params.format} on this topic. Call the submit_article_draft tool.`;

  const result = await provider.jsonCompletion<DraftResponse>({
    systemPrompt,
    userPrompt,
    schema: DRAFT_TOOL_SCHEMA,
    validate: isDraftResponse,
    intent: 'synthesis',
    temperature: 0,
    maxOutputTokens: spec.maxOutputTokens,
    toolName: 'submit_article_draft',
    toolDescription:
      'Submit the drafted article. You MUST call this tool exactly once.',
  });

  return {
    response: result.output,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    latencyMs: result.latencyMs,
  };
}
