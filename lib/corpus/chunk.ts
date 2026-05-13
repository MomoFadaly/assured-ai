/**
 * Split parsed documents into retrievable chunks.
 *
 * Strategy: paragraph-aware chunking with token-budget windows and overlap.
 *  - Aim ~800 tokens per chunk (tuned for Voyage voyage-3 + Claude context).
 *  - Maintain ~100 tokens of overlap to preserve context across boundaries.
 *  - Never split mid-paragraph; if a paragraph alone exceeds the budget,
 *    we fall back to sentence-level splitting for that paragraph.
 *
 * Token counting is approximate (chars/4) — fine for chunking decisions.
 * The model APIs do their own exact tokenization downstream.
 */

import { createHash } from 'node:crypto';
import type { ParsedDocument, RawChunk } from './types';

const TARGET_TOKENS = 800;
const OVERLAP_TOKENS = 100;
const MAX_TOKENS_HARD = 1024;

const approxTokens = (text: string): number => Math.ceil(text.length / 4);

/** Split into paragraphs by blank-line boundary. */
function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Split a single paragraph into sentences (best-effort regex). */
function sentences(paragraph: string): string[] {
  // Simple sentence splitter: matches end-of-sentence punctuation followed by whitespace.
  // Not perfect for edge cases (abbreviations, decimals), but adequate for chunking.
  const parts = paragraph.split(/(?<=[.!?])\s+(?=[A-Z])/);
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function chunk(doc: ParsedDocument): RawChunk[] {
  const paras = paragraphs(doc.cleanText);
  const chunks: RawChunk[] = [];
  let buffer = '';
  let bufferTokens = 0;

  const flushBuffer = (): void => {
    const trimmed = buffer.trim();
    if (trimmed.length === 0) return;
    chunks.push(makeChunk(doc, chunks.length, trimmed));
    // Carry overlap forward: the last ~OVERLAP_TOKENS of buffer becomes the seed of next.
    const overlapChars = OVERLAP_TOKENS * 4;
    const overlapText = trimmed.slice(Math.max(0, trimmed.length - overlapChars));
    buffer = overlapText;
    bufferTokens = approxTokens(overlapText);
  };

  for (const para of paras) {
    const paraTokens = approxTokens(para);

    // Edge case: paragraph alone is bigger than the hard cap. Sentence-split it.
    if (paraTokens > MAX_TOKENS_HARD) {
      flushBuffer();
      buffer = '';
      bufferTokens = 0;

      const sents = sentences(para);
      let sentBuf = '';
      let sentBufTokens = 0;
      for (const s of sents) {
        const tokens = approxTokens(s);
        if (sentBufTokens + tokens > TARGET_TOKENS && sentBuf.length > 0) {
          chunks.push(makeChunk(doc, chunks.length, sentBuf.trim()));
          // Overlap the tail
          const overlapChars = OVERLAP_TOKENS * 4;
          sentBuf = sentBuf.slice(Math.max(0, sentBuf.length - overlapChars)) + ' ' + s;
          sentBufTokens = approxTokens(sentBuf);
        } else {
          sentBuf = sentBuf.length === 0 ? s : sentBuf + ' ' + s;
          sentBufTokens += tokens;
        }
      }
      if (sentBuf.trim().length > 0) {
        chunks.push(makeChunk(doc, chunks.length, sentBuf.trim()));
      }
      continue;
    }

    // Normal case: add paragraph to buffer; flush if over target.
    if (bufferTokens + paraTokens > TARGET_TOKENS && buffer.length > 0) {
      flushBuffer();
    }
    buffer = buffer.length === 0 ? para : buffer + '\n\n' + para;
    bufferTokens += paraTokens;
  }

  if (buffer.trim().length > 0) {
    chunks.push(makeChunk(doc, chunks.length, buffer.trim()));
  }

  return chunks;
}

function makeChunk(doc: ParsedDocument, index: number, content: string): RawChunk {
  return {
    source_url: doc.url,
    chunk_index: index,
    content,
    content_hash: hashContent(content),
    metadata: {
      ...doc.metadata,
      char_length: content.length,
      approx_tokens: approxTokens(content),
    },
  };
}

function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}
