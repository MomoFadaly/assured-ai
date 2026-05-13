/**
 * Shared cross-highlight selection for the result panel.
 *
 * Three flavors of "what is the user pointing at":
 *   - paragraph (the row container — used for the dot indicator and meta tag)
 *   - sentence  (the actual unit of cited claim — used for cross-highlight with sources)
 *   - source    (a row in the SOURCES USED list)
 *
 * AnnotatedArticle and SourcesList read this shared state and decide their
 * own visual state from it.
 */

import type { ParagraphCheck, SentenceCheck } from './AnnotatedArticle';

export type HighlightSelection =
  | { kind: 'paragraph'; paragraphIndex: number }
  | { kind: 'sentence'; paragraphIndex: number; sentenceIndex: number }
  | { kind: 'source'; sourceId: string };

/** Source IDs cited by any sentence in the paragraph. */
export function paragraphSourceIds(p: ParagraphCheck): Set<string> {
  if (p.support.kind === 'supported') {
    return new Set(p.support.citations.map((c) => c.source_id));
  }
  return new Set();
}

/** Source IDs cited by a specific sentence. */
export function sentenceSourceIds(s: SentenceCheck): Set<string> {
  return new Set(s.citations.map((c) => c.source_id));
}
