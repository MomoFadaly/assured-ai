/**
 * Voyage AI embedding provider (voyage-3, 1024-dim).
 *
 * The voyageai npm package wraps the API; we wrap that with our provider
 * interface so retrieval and ingestion can stay provider-agnostic.
 */

import { VoyageAIClient } from 'voyageai';
import { getConfig } from '@/lib/config';
import { logger } from '@/lib/logger';
import type { EmbeddingInputType, EmbeddingProvider, EmbeddingResult } from './provider';

const VOYAGE_DIMENSIONS = 1024;
const MAX_BATCH = 128; // voyage-3 supports up to 128 inputs per call

export class VoyageProvider implements EmbeddingProvider {
  readonly name = 'voyage';
  readonly dimensions = VOYAGE_DIMENSIONS;
  private readonly client: VoyageAIClient;
  private readonly model: string;

  constructor() {
    const config = getConfig();
    if (!config.VOYAGE_API_KEY) {
      throw new Error('VOYAGE_API_KEY is required when EMBEDDING_PROVIDER=voyage. Set it in .env.');
    }
    this.client = new VoyageAIClient({ apiKey: config.VOYAGE_API_KEY });
    this.model = config.VOYAGE_EMBEDDING_MODEL;
  }

  async embed(texts: string[], inputType: EmbeddingInputType): Promise<EmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], model: this.model, latencyMs: 0 };
    }
    if (texts.length > MAX_BATCH) {
      // Batch internally so callers don't have to.
      const batches: string[][] = [];
      for (let i = 0; i < texts.length; i += MAX_BATCH) {
        batches.push(texts.slice(i, i + MAX_BATCH));
      }
      const start = performance.now();
      const results = await Promise.all(batches.map((b) => this.embed(b, inputType)));
      return {
        embeddings: results.flatMap((r) => r.embeddings),
        model: this.model,
        inputTokens: results.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0),
        latencyMs: Math.round(performance.now() - start),
      };
    }

    const start = performance.now();
    try {
      const response = await this.client.embed({
        input: texts,
        model: this.model,
        inputType: inputType,
      });
      const latencyMs = Math.round(performance.now() - start);

      const data = response.data ?? [];
      const embeddings = data
        .map((d) => d.embedding ?? [])
        .filter((e): e is number[] => Array.isArray(e) && e.length > 0);

      if (embeddings.length !== texts.length) {
        logger.error(
          { requested: texts.length, returned: embeddings.length },
          'Voyage returned mismatched embedding count',
        );
        throw new Error('Voyage embedding count mismatch');
      }

      // Sanity check on dimensions
      for (const e of embeddings) {
        if (e.length !== VOYAGE_DIMENSIONS) {
          throw new Error(
            `Expected ${VOYAGE_DIMENSIONS}-dim embedding from ${this.model}, got ${e.length}-dim`,
          );
        }
      }

      return {
        embeddings,
        model: this.model,
        inputTokens: response.usage?.totalTokens,
        latencyMs,
      };
    } catch (err) {
      logger.error({ err, model: this.model, count: texts.length }, 'Voyage embed failed');
      throw err;
    }
  }
}
