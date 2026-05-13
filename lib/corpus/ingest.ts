/**
 * Orchestrates the corpus ingestion pipeline.
 *
 * For each declared source:
 *   1. crawl   — fetch the URL (or use inline_content)
 *   2. parse   — clean text from HTML/PDF
 *   3. chunk   — split into paragraph-aware chunks
 *   4. embed   — Voyage voyage-3
 *   5. write   — INSERT INTO sources + source_chunks (idempotent on content_hash)
 *
 * Idempotency: re-running the pipeline against an unchanged source
 * results in zero new chunks. Updated content invalidates the source_id row's
 * chunks (delete + re-insert).
 *
 * Concurrency: capped at 4 sources in flight to be polite to upstream
 * publishers and to keep Voyage usage predictable.
 */

import pLimit from 'p-limit';
import { transaction, query, toVectorLiteral } from '@/lib/db/client';
import { getEmbeddingProvider } from '@/lib/embeddings/provider';
import { logger } from '@/lib/logger';
import { crawl } from './crawl';
import { parse } from './parse';
import { chunk } from './chunk';
import type { SourceDeclaration } from './types';

export interface IngestSummary {
  totalSources: number;
  succeeded: number;
  skippedUnchanged: number;
  failed: number;
  totalChunksWritten: number;
  errors: Array<{ url: string; error: string }>;
}

const limit = pLimit(4);

export async function ingestSources(sources: SourceDeclaration[]): Promise<IngestSummary> {
  const summary: IngestSummary = {
    totalSources: sources.length,
    succeeded: 0,
    skippedUnchanged: 0,
    failed: 0,
    totalChunksWritten: 0,
    errors: [],
  };

  await Promise.all(
    sources.map((source) =>
      limit(async () => {
        try {
          const result = await ingestOne(source);
          if (result.skipped) summary.skippedUnchanged++;
          else summary.succeeded++;
          summary.totalChunksWritten += result.chunksWritten;
        } catch (err) {
          summary.failed++;
          const msg = err instanceof Error ? err.message : String(err);
          summary.errors.push({ url: source.url, error: msg });
          logger.error({ err, url: source.url }, 'ingest failed');
        }
      }),
    ),
  );

  return summary;
}

interface IngestOneResult {
  skipped: boolean;
  chunksWritten: number;
}

async function ingestOne(source: SourceDeclaration): Promise<IngestOneResult> {
  // 1. Crawl or use inline content
  let parsedTitle: string;
  let cleanText: string;
  let metadata: Record<string, unknown>;

  if (source.inline_content) {
    parsedTitle = source.title;
    cleanText = source.inline_content.trim();
    metadata = { content_type: 'text/plain', source_kind: 'synthetic' };
    logger.info({ url: source.url }, 'using inline content');
  } else {
    const fetched = await crawl(source.url);
    const parsed = await parse(fetched);
    parsedTitle = parsed.title;
    cleanText = parsed.cleanText;
    metadata = parsed.metadata;
    logger.info(
      { url: source.url, chars: cleanText.length, title: parsedTitle.slice(0, 80) },
      'parsed',
    );
  }

  if (cleanText.length < 100) {
    throw new Error(`Parsed content too short (${cleanText.length} chars) for ${source.url}`);
  }

  // 2. Chunk
  const chunks = chunk({
    url: source.url,
    title: parsedTitle,
    cleanText,
    metadata,
  });
  if (chunks.length === 0) {
    throw new Error(`No chunks produced from ${source.url}`);
  }

  // 3. Check existing source row + chunk hashes for idempotency
  const existing = await query<{ id: string }>(
    `SELECT id FROM sources WHERE url = $1`,
    [source.url],
  );
  const sourceId =
    existing.rows[0]?.id ?? (await insertSource(source, parsedTitle));

  const existingHashes = await query<{ content_hash: string }>(
    `SELECT content_hash FROM source_chunks WHERE source_id = $1`,
    [sourceId],
  );
  const existingSet = new Set(existingHashes.rows.map((r) => r.content_hash));
  const newHashes = new Set(chunks.map((c) => c.content_hash));
  const allMatch =
    existingSet.size === newHashes.size &&
    [...newHashes].every((h) => existingSet.has(h));

  if (allMatch) {
    logger.info({ url: source.url, chunks: chunks.length }, 'unchanged, skipping');
    return { skipped: true, chunksWritten: 0 };
  }

  // 4. Embed (only the new/changed chunks would be optimal; for POC we re-embed all)
  const provider = await getEmbeddingProvider();
  const texts = chunks.map((c) => c.content);
  const embedResult = await provider.embed(texts, 'document');
  logger.info(
    {
      url: source.url,
      chunks: chunks.length,
      input_tokens: embedResult.inputTokens ?? null,
      latency_ms: embedResult.latencyMs,
    },
    'embedded',
  );

  // 5. Replace chunks atomically
  await transaction(async (client) => {
    await client.query(`DELETE FROM source_chunks WHERE source_id = $1`, [sourceId]);
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const embedding = embedResult.embeddings[i];
      if (!c || !embedding) {
        throw new Error(`Missing chunk or embedding at index ${i} for ${source.url}`);
      }
      await client.query(
        `INSERT INTO source_chunks
         (source_id, chunk_index, content, content_hash, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5::vector, $6)`,
        [
          sourceId,
          c.chunk_index,
          c.content,
          c.content_hash,
          toVectorLiteral(embedding),
          c.metadata,
        ],
      );
    }
    // Touch source ingestion timestamp
    await client.query(`UPDATE sources SET ingested_at = NOW() WHERE id = $1`, [sourceId]);
  });

  return { skipped: false, chunksWritten: chunks.length };
}

async function insertSource(source: SourceDeclaration, parsedTitle: string): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO sources
     (organization, source_type, url, title, publication_date, scenario, license_notes, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING id`,
    [
      source.organization,
      source.source_type,
      source.url,
      source.title || parsedTitle,
      source.publication_date ?? null,
      source.scenario,
      source.license_notes ?? null,
    ],
  );
  if (!result.rows[0]) {
    throw new Error(`Failed to insert source for ${source.url}`);
  }
  return result.rows[0].id;
}
