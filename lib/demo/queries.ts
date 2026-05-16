/**
 * Read-side helpers for showcase verifications. Used by:
 *   - the marketing Hero `proofExampleId` prop
 *   - the FeaturedArtifacts / ShowcaseStrip component
 *   - the /demo page's curated examples list
 */

import '@/lib/server-only';
import { query } from '@/lib/db/client';

export interface ShowcaseRow {
  slug: string;
  pack_slug: string;
  audit_log_id: number;
  title: string;
  blurb: string;
  expected_kind: string;
  tone: 'positive' | 'warning' | 'critical';
  created_at: Date;
}

export async function listShowcases(): Promise<ShowcaseRow[]> {
  try {
    const r = await query<ShowcaseRow>(
      `SELECT slug, pack_slug, audit_log_id, title, blurb, expected_kind, tone, created_at
         FROM showcase_verifications
        WHERE audit_log_id IS NOT NULL
        ORDER BY
          CASE tone WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
          pack_slug,
          created_at DESC`,
    );
    return r.rows;
  } catch {
    // Showcase table may not exist yet on a fresh DB (seed hasn't run).
    return [];
  }
}

export async function getShowcaseBySlug(slug: string): Promise<ShowcaseRow | null> {
  try {
    const r = await query<ShowcaseRow>(
      `SELECT slug, pack_slug, audit_log_id, title, blurb, expected_kind, tone, created_at
         FROM showcase_verifications
        WHERE slug = $1 AND audit_log_id IS NOT NULL LIMIT 1`,
      [slug],
    );
    return r.rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Pick the most impressive showcase to feature in the hero CTA. Priority:
 * red-flag-blocked (most visually striking) > verified-with-warnings >
 * verified-clean. Within tier, prefer healthcare (broadest audience).
 */
export async function getHeroShowcase(): Promise<ShowcaseRow | null> {
  const all = await listShowcases();
  if (all.length === 0) return null;
  const order: Record<string, number> = {
    'red-flag-blocked': 0,
    'verified-with-warnings': 1,
    'verified-blocking': 2,
    'verified-clean': 3,
  };
  const packOrder: Record<string, number> = {
    healthcare: 0,
    finance: 1,
    legal: 2,
    government: 3,
  };
  return [...all].sort((a, b) => {
    const ak = order[a.expected_kind] ?? 9;
    const bk = order[b.expected_kind] ?? 9;
    if (ak !== bk) return ak - bk;
    return (packOrder[a.pack_slug] ?? 9) - (packOrder[b.pack_slug] ?? 9);
  })[0]!;
}
