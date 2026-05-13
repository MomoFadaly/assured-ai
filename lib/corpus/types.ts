/**
 * Shared types for the corpus ingestion pipeline.
 */

import type { Scenario, SourceType } from '@/lib/db/types';

/** A single source as declared in the curated source list. */
export interface SourceDeclaration {
  organization: string;
  source_type: SourceType;
  url: string;
  title: string;
  publication_date?: string; // ISO date
  scenario: Scenario;
  license_notes?: string;
  /** Override: if set, use this content instead of fetching the URL (for synthetic sources). */
  inline_content?: string;
}

/** Output of the parse step: clean text plus structural metadata. */
export interface ParsedDocument {
  url: string;
  title: string;
  cleanText: string;
  /** Where parser found section headings, page numbers, etc. */
  metadata: Record<string, unknown>;
}

/** A chunk before embedding. */
export interface RawChunk {
  source_url: string;
  chunk_index: number;
  content: string;
  content_hash: string;
  metadata: Record<string, unknown>;
}

/** A chunk with its embedding, ready to insert. */
export interface EmbeddedChunk extends RawChunk {
  embedding: number[];
}
