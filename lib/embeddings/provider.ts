/**
 * Embedding provider abstraction.
 *
 * Default: Voyage AI (voyage-3, 1024-dim) — Anthropic's recommended embedding
 * partner; quality is empirically best-in-class for retrieval as of mid-2026.
 *
 * Alternates: OpenAI text-embedding-3-large, Ollama. Switching providers must
 * be paired with re-ingesting the corpus, since embeddings from different
 * models live in different vector spaces.
 */

import { getConfig } from '@/lib/config';
import { logger } from '@/lib/logger';
import { recordUsage } from '@/lib/usage';

/** Document-vs-query distinction. Some providers tune for one or the other. */
export type EmbeddingInputType = 'document' | 'query';

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  inputTokens?: number;
  latencyMs: number;
}

export interface EmbeddingProvider {
  readonly name: string;
  /** Number of dimensions returned. Used for db schema validation at startup. */
  readonly dimensions: number;
  embed(texts: string[], inputType: EmbeddingInputType): Promise<EmbeddingResult>;
}

let _provider: EmbeddingProvider | null = null;

export async function getEmbeddingProvider(): Promise<EmbeddingProvider> {
  if (_provider !== null) return _provider;
  const config = getConfig();
  switch (config.EMBEDDING_PROVIDER) {
    case 'voyage': {
      const { VoyageProvider } = await import('./voyage');
      _provider = new VoyageProvider();
      return _provider;
    }
    case 'openai':
      throw new Error('OpenAI embedding provider not yet implemented.');
    case 'ollama':
      throw new Error('Ollama embedding provider not yet implemented.');
  }
}

export function _resetEmbeddingProvider(): void {
  _provider = null;
}

/** Single-text helper. Convenience wrapper. */
export async function embedOne(text: string, inputType: EmbeddingInputType): Promise<number[]> {
  const provider = await getEmbeddingProvider();
  const result = await provider.embed([text], inputType);
  if (result.embeddings.length === 0 || result.embeddings[0] === undefined) {
    logger.error({ inputType }, 'embedding provider returned empty result');
    throw new Error('Embedding provider returned no embeddings');
  }
  // Best-effort usage record. Doesn't know about pack context here; the
  // dashboard rolls these up under pack_slug = '' (unset) for retrieval calls.
  // Caller-level provenance (corpus ingest vs sentence-level retrieval) is
  // captured in the `source` label.
  void recordUsage({
    kind: 'embedding',
    provider: provider.name,
    model: result.model,
    inputTokens: result.inputTokens ?? null,
    outputTokens: 0,
    latencyMs: result.latencyMs,
    source: inputType === 'query' ? 'retrieval' : 'corpus_ingest',
  });
  return result.embeddings[0];
}
