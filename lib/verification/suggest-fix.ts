/**
 * Suggest a sourced rewrite for an unsourced sentence.
 *
 * Given the offending sentence and its closest-match chunk (which fell below
 * the support threshold), ask Claude to rewrite the sentence so it stays true
 * to the chunk's evidence. The rewrite is grounded in the chunk's text — we
 * pull the chunk content from the DB so the model sees what we trust.
 */

import { getLlmProvider } from '@/lib/llm/provider';
import { query } from '@/lib/db/client';
import type { Scenario } from '@/lib/db/types';

export interface SuggestFixParams {
  sentence: string;
  chunkId: string;
  scenario: Scenario;
  /** Optional surrounding paragraph for context. */
  paragraph?: string;
}

export interface SuggestFixResult {
  rewrite: string;
  notes?: string;
  source: {
    chunk_id: string;
    organization: string;
    title: string;
    url: string;
  };
  model: string;
  latencyMs: number;
}

const TOOL_SCHEMA = {
  type: 'object',
  properties: {
    rewrite: {
      type: 'string',
      description:
        'A single revised sentence that is fully supported by the provided chunk. Keep the same intent and audience.',
    },
    notes: {
      type: 'string',
      description:
        'Optional. Editor-facing one-line caveat (e.g. "softened a numeric claim that the chunk could not support").',
    },
  },
  required: ['rewrite'],
  additionalProperties: false,
} as const;

function isResult(raw: unknown): raw is { rewrite: string; notes?: string } {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  if (typeof r.rewrite !== 'string' || r.rewrite.trim().length === 0) return false;
  if (r.notes !== undefined && typeof r.notes !== 'string') return false;
  return true;
}

export async function suggestFix(params: SuggestFixParams): Promise<SuggestFixResult> {
  const start = performance.now();
  // Pull the chunk + source.
  const r = await query<{
    content: string;
    organization: string;
    title: string;
    url: string;
  }>(
    `SELECT sc.content, s.organization, s.title, s.url
       FROM source_chunks sc
       JOIN sources s ON s.id = sc.source_id
       WHERE sc.id = $1 AND s.scenario = $2 AND s.is_active = true`,
    [params.chunkId, params.scenario],
  );
  const chunk = r.rows[0];
  if (!chunk) {
    throw new Error(`chunk ${params.chunkId} not found for scenario ${params.scenario}`);
  }

  const provider = getLlmProvider();
  const system = `You are an editorial assistant for a ${params.scenario} publisher. Your job is to revise a single sentence that an automated fact-checker flagged as unsourced, so that the revised version is fully and faithfully supported by the trusted source chunk below.

Rules:
1. Output exactly ONE revised sentence (no preamble, no list).
2. Preserve the original sentence's intent and audience.
3. Stay within what the trusted chunk says. Do NOT add facts the chunk does not contain.
4. If the original sentence makes a specific numeric or factual claim the chunk does not support, soften or generalize the claim. Note this in the "notes" field.
5. Match the original sentence's reading level and tone.
6. Do NOT introduce citations, markdown, or bracketed references — the system handles citations separately.
7. ${params.scenario === 'healthcare' ? 'Do not give clinical advice. Direct readers to a clinician when appropriate.' : 'Be plain-spoken and neutral.'}`;

  const user = `Original sentence (unsourced):
${params.sentence}

${params.paragraph && params.paragraph !== params.sentence
    ? `Surrounding paragraph (for context):\n${params.paragraph}\n\n`
    : ''}Trusted source chunk:
Organization: ${chunk.organization}
Title: ${chunk.title}
URL: ${chunk.url}

Content:
${chunk.content}

Call the submit_rewrite tool with the revised sentence.`;

  const result = await provider.jsonCompletion<{ rewrite: string; notes?: string }>({
    systemPrompt: system,
    userPrompt: user,
    schema: TOOL_SCHEMA,
    validate: isResult,
    intent: 'synthesis',
    temperature: 0,
    maxOutputTokens: 600,
    toolName: 'submit_rewrite',
    toolDescription: 'Submit the rewritten sentence. You MUST call this tool exactly once.',
  });

  return {
    rewrite: result.output.rewrite,
    notes: result.output.notes,
    source: {
      chunk_id: params.chunkId,
      organization: chunk.organization,
      title: chunk.title,
      url: chunk.url,
    },
    model: result.model,
    latencyMs: Math.round(performance.now() - start),
  };
}
