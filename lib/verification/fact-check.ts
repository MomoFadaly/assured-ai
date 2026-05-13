/**
 * Sentence-level fact-check.
 *
 * AssuredAI uses the source library as a fact-check reference, not a retrieval
 * cage: writers produce or paste arbitrary content and we annotate every
 * sentence with the strongest supporting chunk we can find. Sentences below
 * the support threshold are flagged for editor review.
 *
 * Each paragraph is split into sentences, every sentence is embedded
 * individually, and pgvector retrieval runs per sentence. Paragraph-level
 * support is aggregated up from the sentences (max similarity, union of
 * citations). This gives the UI sub-paragraph cross-highlighting:
 * hovering a source lights up only the sentences that came from it, not
 * the whole paragraph.
 *
 * "Supported" in this layer means *semantically aligned with a chunk we
 * trust*, not *literally true*. The system surfaces evidence; the editor
 * still decides.
 */

import { query, toVectorLiteral } from '@/lib/db/client';
import { embedOne } from '@/lib/embeddings/provider';
import { getConfig } from '@/lib/config';
import type { Scenario } from '@/lib/db/types';

export interface SupportingCitation {
  chunk_id: string;
  source_id: string;
  url: string;
  title: string;
  organization: string;
  similarity: number;
}

export interface SentenceCheckResult {
  sentence_index: number;
  text: string;
  /** Character offset of the sentence within its paragraph. */
  start: number;
  end: number;
  citations: SupportingCitation[];
  /** Best-match chunk regardless of threshold (for unsourced tooltips). */
  best_match: SupportingCitation | null;
  top_similarity: number;
}

export type ParagraphSupport =
  | {
      kind: 'supported';
      citations: SupportingCitation[];
      top_similarity: number;
    }
  | {
      kind: 'unsourced';
      best_match: SupportingCitation | null;
      top_similarity: number;
      reason: 'below_threshold' | 'corpus_empty';
    };

export interface ParagraphCheckResult {
  paragraph_index: number;
  text: string;
  sentences: SentenceCheckResult[];
  support: ParagraphSupport;
}

export interface FactCheckResult {
  paragraphs: ParagraphCheckResult[];
  supported_count: number;
  unsourced_count: number;
  unique_sources_used: number;
  embedLatencyMs: number;
  retrievalLatencyMs: number;
}

interface ChunkRow {
  chunk_id: string;
  source_id: string;
  url: string;
  title: string;
  organization: string;
  similarity: number;
}

/**
 * Sentence-level threshold is slightly below the paragraph-level threshold
 * because shorter inputs naturally produce more variable cosine similarities.
 */
const SENTENCE_THRESHOLD_OFFSET = 0.05;

/** Below this length we don't bother embedding — too short to be a meaningful claim. */
const MIN_SENTENCE_CHARS = 12;

export async function factCheckParagraphs(
  paragraphs: string[],
  scenario: Scenario,
): Promise<FactCheckResult> {
  const config = getConfig();
  const supportThreshold = Math.max(
    0.05,
    config.RETRIEVAL_MIN_SIMILARITY - SENTENCE_THRESHOLD_OFFSET,
  );
  const topK = 3;

  if (paragraphs.length === 0) {
    return {
      paragraphs: [],
      supported_count: 0,
      unsourced_count: 0,
      unique_sources_used: 0,
      embedLatencyMs: 0,
      retrievalLatencyMs: 0,
    };
  }

  // 1. Split each paragraph into sentences with their character offsets.
  type SentenceTask = {
    paragraphIndex: number;
    sentenceIndex: number;
    text: string;
    start: number;
    end: number;
  };
  const allSentences: SentenceTask[] = [];
  const paragraphSentences: SentenceTask[][] = [];
  for (let pi = 0; pi < paragraphs.length; pi++) {
    const text = paragraphs[pi] ?? '';
    const splits = splitSentences(text);
    const tasks: SentenceTask[] = splits.map((s, si) => ({
      paragraphIndex: pi,
      sentenceIndex: si,
      text: s.text,
      start: s.start,
      end: s.end,
    }));
    paragraphSentences.push(tasks);
    for (const t of tasks) allSentences.push(t);
  }

  // 2. Embed every sentence sequentially. Voyage handles short inputs cheaply
  //    and we want to stay within free-tier rate limits.
  const embedStart = performance.now();
  const embeddings: (number[] | null)[] = [];
  for (const s of allSentences) {
    if (s.text.length < MIN_SENTENCE_CHARS) {
      embeddings.push(null);
    } else {
      embeddings.push(await embedOne(s.text, 'query'));
    }
  }
  const embedLatencyMs = Math.round(performance.now() - embedStart);

  // 3. Run pgvector retrieval per sentence in parallel.
  const retrievalStart = performance.now();
  const sentenceResults = await Promise.all(
    allSentences.map(async (s, idx): Promise<SentenceCheckResult> => {
      const emb = embeddings[idx];
      if (!emb) {
        return {
          sentence_index: s.sentenceIndex,
          text: s.text,
          start: s.start,
          end: s.end,
          citations: [],
          best_match: null,
          top_similarity: 0,
        };
      }
      const r = await query<ChunkRow>(
        `SELECT
           sc.id AS chunk_id,
           sc.source_id,
           s.url,
           s.title,
           s.organization,
           1 - (sc.embedding <=> $1::vector) AS similarity
         FROM source_chunks sc
         JOIN sources s ON s.id = sc.source_id
         WHERE s.scenario = $2 AND s.is_active = true
         ORDER BY sc.embedding <=> $1::vector ASC
         LIMIT $3`,
        [toVectorLiteral(emb), scenario, topK],
      );
      const top = r.rows[0];
      const topSim = top?.similarity ?? 0;
      const citations: SupportingCitation[] = r.rows
        .filter((row) => row.similarity >= supportThreshold)
        .map((row) => ({
          chunk_id: row.chunk_id,
          source_id: row.source_id,
          url: row.url,
          title: row.title,
          organization: row.organization,
          similarity: row.similarity,
        }));
      const bestMatch: SupportingCitation | null = top
        ? {
            chunk_id: top.chunk_id,
            source_id: top.source_id,
            url: top.url,
            title: top.title,
            organization: top.organization,
            similarity: topSim,
          }
        : null;
      return {
        sentence_index: s.sentenceIndex,
        text: s.text,
        start: s.start,
        end: s.end,
        citations,
        best_match: bestMatch,
        top_similarity: topSim,
      };
    }),
  );
  const retrievalLatencyMs = Math.round(performance.now() - retrievalStart);

  // 4. Roll up to paragraph view.
  const sourcesUsed = new Set<string>();
  let supported = 0;
  let unsourced = 0;
  const results: ParagraphCheckResult[] = [];

  let cursor = 0;
  for (let pi = 0; pi < paragraphs.length; pi++) {
    const text = paragraphs[pi] ?? '';
    const sentences = paragraphSentences[pi] ?? [];
    const sentenceChecks: SentenceCheckResult[] = sentences.map((_, si) => {
      const idx = cursor + si;
      const r = sentenceResults[idx];
      if (r) return r;
      // Should never happen, but keep types honest.
      const s = sentences[si]!;
      return {
        sentence_index: s.sentenceIndex,
        text: s.text,
        start: s.start,
        end: s.end,
        citations: [],
        best_match: null,
        top_similarity: 0,
      };
    });
    cursor += sentences.length;

    const dedupedCitations = dedupeCitations(sentenceChecks.flatMap((s) => s.citations));
    for (const c of dedupedCitations) sourcesUsed.add(c.source_id);
    const topSim = sentenceChecks.reduce((m, s) => Math.max(m, s.top_similarity), 0);
    const bestMatch = sentenceChecks
      .map((s) => s.best_match)
      .filter((m): m is SupportingCitation => m !== null)
      .sort((a, b) => b.similarity - a.similarity)[0] ?? null;
    const isSupported = dedupedCitations.length > 0;
    if (isSupported) supported++;
    else unsourced++;

    results.push({
      paragraph_index: pi,
      text,
      sentences: sentenceChecks,
      support: isSupported
        ? { kind: 'supported', citations: dedupedCitations, top_similarity: topSim }
        : {
            kind: 'unsourced',
            best_match: bestMatch,
            top_similarity: topSim,
            reason: bestMatch ? 'below_threshold' : 'corpus_empty',
          },
    });
  }

  return {
    paragraphs: results,
    supported_count: supported,
    unsourced_count: unsourced,
    unique_sources_used: sourcesUsed.size,
    embedLatencyMs,
    retrievalLatencyMs,
  };
}

function dedupeCitations(citations: SupportingCitation[]): SupportingCitation[] {
  const seen = new Map<string, SupportingCitation>();
  for (const c of citations) {
    const existing = seen.get(c.chunk_id);
    if (!existing || c.similarity > existing.similarity) {
      seen.set(c.chunk_id, c);
    }
  }
  return [...seen.values()].sort((a, b) => b.similarity - a.similarity);
}

/**
 * Split arbitrary article text into paragraphs (blank-line separated).
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Split a paragraph into sentences with character offsets relative to the
 * paragraph. The splitter handles common abbreviations (Dr., Mrs., e.g., i.e.,
 * etc.) and avoids breaking on decimals or single-letter abbreviations.
 */
export function splitSentences(
  paragraph: string,
): Array<{ text: string; start: number; end: number }> {
  if (paragraph.trim().length === 0) return [];

  // Tokens that MUST NOT terminate a sentence even though they end in a period.
  // Lowercase comparison.
  const ABBREVIATIONS = new Set([
    'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'sr', 'jr',
    'inc', 'ltd', 'co', 'corp',
    'e.g', 'i.e', 'etc', 'vs', 'cf', 'al',
    'fig', 'figs', 'no',
    'u.s', 'u.k', 'u.n',
    'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  ]);

  const sentences: Array<{ text: string; start: number; end: number }> = [];
  const len = paragraph.length;
  let segmentStart = 0;
  let i = 0;

  while (i < len) {
    const ch = paragraph[i]!;
    if (ch === '.' || ch === '!' || ch === '?') {
      // Consume any trailing terminators (e.g. "...", "!?")
      let j = i;
      while (j + 1 < len && '.!?'.includes(paragraph[j + 1]!)) j++;
      const next = paragraph[j + 1];
      const followsAbbrev = ch === '.' && isAbbrevAt(paragraph, i, ABBREVIATIONS);
      const followsDecimal =
        ch === '.' &&
        i > 0 &&
        /\d/.test(paragraph[i - 1]!) &&
        next !== undefined &&
        /\d/.test(next);
      const sentenceEnds =
        !followsAbbrev &&
        !followsDecimal &&
        (next === undefined || /\s/.test(next));
      if (sentenceEnds) {
        const rawEnd = j + 1;
        const text = paragraph.slice(segmentStart, rawEnd).trim();
        if (text.length > 0) {
          const trimmedStart =
            segmentStart + (paragraph.slice(segmentStart, rawEnd).match(/^\s*/)?.[0]?.length ?? 0);
          const trimmedEnd = trimmedStart + text.length;
          sentences.push({ text, start: trimmedStart, end: trimmedEnd });
        }
        // Advance past whitespace
        let k = rawEnd;
        while (k < len && /\s/.test(paragraph[k]!)) k++;
        segmentStart = k;
        i = k;
        continue;
      }
      i = j + 1;
    } else {
      i++;
    }
  }

  if (segmentStart < len) {
    const text = paragraph.slice(segmentStart).trim();
    if (text.length > 0) {
      const trimmedStart =
        segmentStart + (paragraph.slice(segmentStart).match(/^\s*/)?.[0]?.length ?? 0);
      sentences.push({ text, start: trimmedStart, end: trimmedStart + text.length });
    }
  }

  return sentences;
}

/** Look back from `dotIndex` and decide whether the token immediately before
 *  the period is in our abbreviation set. */
function isAbbrevAt(text: string, dotIndex: number, abbrevs: Set<string>): boolean {
  let start = dotIndex;
  while (start > 0 && /[A-Za-z.]/.test(text[start - 1]!)) start--;
  const token = text.slice(start, dotIndex).toLowerCase();
  return abbrevs.has(token);
}
