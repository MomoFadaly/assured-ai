/**
 * Governed retrieval — the gate that says "you can only see approved content".
 *
 * Implements step 4 of the orchestration lifecycle (see ARCHITECTURE.md):
 *   - Embed the query (Voyage voyage-3, 1024-dim)
 *   - pgvector cosine search, filtered by scenario AND is_active=true
 *   - Top-K=8 (configurable), threshold ≥ RETRIEVAL_MIN_SIMILARITY
 *   - Returns RetrievedChunk[] with similarity score and source metadata
 *
 * The downstream confidence gate (step 5) decides whether to proceed to
 * synthesis or return "I don't know"; this module just retrieves.
 */

import { query, toVectorLiteral } from '@/lib/db/client';
import { embedOne } from '@/lib/embeddings/provider';
import { getConfig } from '@/lib/config';
import { logger } from '@/lib/logger';
import type { RetrievedChunk, Scenario } from '@/lib/db/types';

export interface RetrievalParams {
  question: string;
  scenario: Scenario;
  /** Override defaults from config. */
  topK?: number;
  minSimilarity?: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  topSimilarity: number;
  belowThreshold: boolean;
  embeddingLatencyMs: number;
  retrievalLatencyMs: number;
}

interface ChunkRow {
  id: string;
  source_id: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
  organization: string;
  url: string;
  title: string;
  publication_date: Date | null;
}

export async function retrieve(params: RetrievalParams): Promise<RetrievalResult> {
  const config = getConfig();
  const topK = params.topK ?? config.RETRIEVAL_TOP_K;
  const minSim = params.minSimilarity ?? config.RETRIEVAL_MIN_SIMILARITY;

  // 1. Embed the query
  const embedStart = performance.now();
  const queryEmbedding = await embedOne(params.question, 'query');
  const embeddingLatencyMs = Math.round(performance.now() - embedStart);

  // 2. pgvector cosine search, filtered by scenario + active sources
  const retrievalStart = performance.now();
  const result = await query<ChunkRow>(
    `SELECT
       sc.id,
       sc.source_id,
       sc.chunk_index,
       sc.content,
       sc.metadata,
       1 - (sc.embedding <=> $1::vector) AS similarity,
       s.organization,
       s.url,
       s.title,
       s.publication_date
     FROM source_chunks sc
     JOIN sources s ON s.id = sc.source_id
     WHERE s.scenario = $2
       AND s.is_active = true
       AND 1 - (sc.embedding <=> $1::vector) >= $3
     ORDER BY sc.embedding <=> $1::vector ASC
     LIMIT $4`,
    [toVectorLiteral(queryEmbedding), params.scenario, minSim, topK],
  );
  const retrievalLatencyMs = Math.round(performance.now() - retrievalStart);

  const chunks: RetrievedChunk[] = result.rows.map((r) => ({
    id: r.id,
    source_id: r.source_id,
    chunk_index: r.chunk_index,
    content: r.content,
    metadata: r.metadata,
    similarity: r.similarity,
    organization: r.organization,
    url: r.url,
    title: r.title,
    publication_date: r.publication_date,
  }));

  const topSimilarity = chunks[0]?.similarity ?? 0;
  const belowThreshold = topSimilarity < config.SYNTHESIS_CONFIDENCE_THRESHOLD;

  logger.debug(
    {
      scenario: params.scenario,
      chunks_returned: chunks.length,
      top_similarity: topSimilarity.toFixed(3),
      below_threshold: belowThreshold,
      embed_ms: embeddingLatencyMs,
      retrieve_ms: retrievalLatencyMs,
    },
    'governed-rag retrieval',
  );

  return {
    chunks,
    topSimilarity,
    belowThreshold,
    embeddingLatencyMs,
    retrievalLatencyMs,
  };
}
