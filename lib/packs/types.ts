/**
 * Vertical pack — the typed shape of `vertical_packs.config` JSONB.
 *
 * Every regulated vertical (healthcare, government, finance, legal, and
 * any custom pack the operator authors) is data, not code. Adding a new
 * vertical is an INSERT into `vertical_packs` — no deploy, no migration,
 * no rebuild.
 *
 * This file is the contract between the DB column and every consumer
 * (lifecycle, disclaimer, draft, red-flag, presidio-client).
 *
 * Versioned: bump `version` whenever the canonical shape changes in a
 * way that affects rendered output. Audit-log rows record the pack id +
 * the verification_detail snapshot, so old rows always tell the story
 * they were verified against.
 */

import type { Scenario } from '@/lib/db/types';

export type VerticalPackId = string;
export type VerticalPackSlug = string;

export interface VerticalPackRow {
  id: VerticalPackId;
  slug: VerticalPackSlug;
  name: string;
  version: string;
  description: string | null;
  config: VerticalPackConfig;
  is_active: boolean;
  is_built_in: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface VerticalPackConfig {
  slug: VerticalPackSlug;
  name: string;
  icon?: string;
  compliance_framework?: string;
  regulatory_references?: Array<{ name: string; url: string }>;
  disclaimer: PackDisclaimer;
  draft_voice_prompt: string;
  recognizers: string[];
  red_flag_rules: PackRedFlagRule[];
  retention_days: number;
  default_min_similarity: number;
  default_top_k: number;
  /** Suggested editorial gate — UI surfaces it but doesn't enforce. */
  max_unsourced_paragraphs_publishable?: number;
  max_pii_publishable?: number;
}

export interface PackDisclaimer {
  canonical: string;
  detection_patterns: string[];
}

export interface PackRedFlagRule {
  category: string;
  severity: 'emergency' | 'urgent' | 'review';
  patterns: string[];
  /** Plain-text message rendered to the end user when triggered. */
  escalation: string;
}

/**
 * Public-facing summary — what `/api/packs` returns + what the verifier UI
 * displays in the pack switcher. Excludes regex internals.
 */
export interface VerticalPackSummary {
  id: VerticalPackId;
  slug: VerticalPackSlug;
  name: string;
  description: string | null;
  icon: string | null;
  compliance_framework: string | null;
  recognizer_count: number;
  red_flag_category_count: number;
  retention_days: number;
  is_active: boolean;
  is_built_in: boolean;
}

/**
 * Legacy scenario → pack-slug mapping. New code reads pack ids directly;
 * back-compat callers (e.g. an older Chrome-extension build) can still
 * pass `scenario: 'healthcare'` and we resolve to the matching pack.
 */
export const LEGACY_SCENARIO_TO_PACK_SLUG: Record<Scenario, VerticalPackSlug> = {
  healthcare: 'healthcare',
  government: 'government',
};
