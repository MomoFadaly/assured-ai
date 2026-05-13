/**
 * Tests for the chunker.
 */

import { describe, it, expect } from 'vitest';
import { chunk } from '@/lib/corpus/chunk';
import type { ParsedDocument } from '@/lib/corpus/types';

function doc(text: string): ParsedDocument {
  return {
    url: 'https://example.test/doc',
    title: 'Test Doc',
    cleanText: text,
    metadata: { source_kind: 'test' },
  };
}

describe('chunk()', () => {
  it('produces a single chunk for short text', () => {
    const result = chunk(doc('A short paragraph that fits in one chunk.'));
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toContain('short paragraph');
  });

  it('respects paragraph boundaries', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const result = chunk(doc(text));
    expect(result.length).toBeGreaterThanOrEqual(1);
    // Each chunk should contain whole paragraphs, not split mid-sentence
    for (const c of result) {
      expect(c.content.endsWith('.')).toBe(true);
    }
  });

  it('produces multiple chunks for long text', () => {
    // Build a long doc — many paragraphs that exceed the target token budget.
    const para = 'word '.repeat(200) + '. ';
    const text = Array.from({ length: 20 }, () => para).join('\n\n');
    const result = chunk(doc(text));
    expect(result.length).toBeGreaterThan(1);
  });

  it('assigns sequential chunk_index', () => {
    const text = Array.from({ length: 10 }, (_, i) => `Paragraph ${i} content.`)
      .join('\n\n')
      .repeat(40);
    const result = chunk(doc(text));
    for (let i = 0; i < result.length; i++) {
      expect(result[i]?.chunk_index).toBe(i);
    }
  });

  it('produces stable content_hash for identical input', () => {
    const text = 'Stable content hash test paragraph.';
    const a = chunk(doc(text));
    const b = chunk(doc(text));
    expect(a[0]?.content_hash).toBe(b[0]?.content_hash);
  });
});
