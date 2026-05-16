/**
 * Vertical pack registry — single read path for `vertical_packs`.
 *
 *   getPackById(id)       → load by UUID
 *   getPackBySlug(slug)   → load by slug ('healthcare', etc.)
 *   resolvePack({ id?, slug?, scenario? })  → smart resolver for back-compat
 *   listPacks()           → registry of all active packs
 *
 * 60-second in-memory cache. Pack changes via the admin UI bump
 * updated_at; the cache picks the change up on next read after TTL. Tight
 * enough that operators see edits within a minute; loose enough that
 * every verify call doesn't hit the DB.
 */

import '@/lib/server-only';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import {
  LEGACY_SCENARIO_TO_PACK_SLUG,
  type VerticalPackConfig,
  type VerticalPackId,
  type VerticalPackRow,
  type VerticalPackSlug,
  type VerticalPackSummary,
} from './types';
import type { Scenario } from '@/lib/db/types';

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  fetchedAt: number;
  byId: Map<string, VerticalPackRow>;
  bySlug: Map<string, VerticalPackRow>;
  list: VerticalPackRow[];
}

let cache: CacheEntry | null = null;

async function loadAll(): Promise<CacheEntry> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache;

  const r = await query<{
    id: string;
    slug: string;
    name: string;
    version: string;
    description: string | null;
    config: VerticalPackConfig;
    is_active: boolean;
    is_built_in: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, slug, name, version, description, config, is_active, is_built_in,
            created_at, updated_at
       FROM vertical_packs
       ORDER BY is_built_in DESC, name ASC`,
  );

  const byId = new Map<string, VerticalPackRow>();
  const bySlug = new Map<string, VerticalPackRow>();
  const list: VerticalPackRow[] = [];
  for (const row of r.rows) {
    byId.set(row.id, row);
    bySlug.set(row.slug, row);
    list.push(row);
  }

  cache = { fetchedAt: now, byId, bySlug, list };
  return cache;
}

export async function getPackById(id: VerticalPackId): Promise<VerticalPackRow | null> {
  const c = await loadAll();
  return c.byId.get(id) ?? null;
}

export async function getPackBySlug(slug: VerticalPackSlug): Promise<VerticalPackRow | null> {
  const c = await loadAll();
  return c.bySlug.get(slug) ?? null;
}

export async function listPacks(opts?: { activeOnly?: boolean }): Promise<VerticalPackRow[]> {
  const c = await loadAll();
  return opts?.activeOnly === false ? c.list : c.list.filter((p) => p.is_active);
}

/**
 * Back-compat smart resolver. Accepts any of:
 *   - vertical_pack_id (UUID) — preferred
 *   - vertical_pack_slug
 *   - scenario ('healthcare' | 'government') — legacy
 *
 * Returns null when nothing resolves. Callers MUST treat null as a 400.
 */
export async function resolvePack(args: {
  packId?: string | null;
  packSlug?: string | null;
  scenario?: Scenario | null;
}): Promise<VerticalPackRow | null> {
  if (args.packId) {
    const r = await getPackById(args.packId);
    if (r) return r;
  }
  if (args.packSlug) {
    const r = await getPackBySlug(args.packSlug);
    if (r) return r;
  }
  if (args.scenario) {
    const slug = LEGACY_SCENARIO_TO_PACK_SLUG[args.scenario];
    if (slug) {
      const r = await getPackBySlug(slug);
      if (r) return r;
    }
  }
  return null;
}

/** Public summary suitable for /api/packs (no regex internals). */
export function toSummary(row: VerticalPackRow): VerticalPackSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.config.icon ?? null,
    compliance_framework: row.config.compliance_framework ?? null,
    recognizer_count: row.config.recognizers.length,
    red_flag_category_count: row.config.red_flag_rules.length,
    retention_days: row.config.retention_days,
    is_active: row.is_active,
    is_built_in: row.is_built_in,
  };
}

/** Force-clear the cache. Used after admin edits. */
export function invalidatePackCache(): void {
  cache = null;
  logger.info({}, 'vertical pack registry: cache invalidated');
}
