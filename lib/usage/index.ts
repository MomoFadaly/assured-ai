/**
 * Usage metering — write one `usage_events` row per paid LLM /
 * embedding call. A DB trigger (see migration 007) rolls each event
 * into `usage_daily` so the cost-dashboard reads are O(days).
 *
 * Callers MUST NOT await — wrap with `void recordUsage(...)` so a meter
 * write failure can't break a verification request.
 */

import 'server-only';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { estimateCostMicroUsd } from './pricing';

export type UsageKind = 'llm.synthesis' | 'llm.classifier' | 'embedding';

export interface RecordUsageInput {
  kind: UsageKind;
  provider: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number | null;
  packId?: string | null;
  packSlug?: string | null;
  auditLogId?: number | null;
  apiKeyId?: string | null;
  source?: string | null;
}

export async function recordUsage(input: RecordUsageInput): Promise<void> {
  try {
    const inTok = input.inputTokens ?? 0;
    const outTok = input.outputTokens ?? 0;
    const cost = estimateCostMicroUsd(input.provider, input.model, inTok, outTok);
    await query(
      `INSERT INTO usage_events
         (vertical_pack_id, pack_slug, kind, provider, model,
          input_tokens, output_tokens, cost_micro_usd,
          audit_log_id, source, api_key_id, latency_ms)
       VALUES ($1, $2, $3::usage_kind_t, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        input.packId ?? null,
        input.packSlug ?? null,
        input.kind,
        input.provider,
        input.model,
        input.inputTokens ?? null,
        input.outputTokens ?? null,
        cost,
        input.auditLogId ?? null,
        input.source ?? null,
        input.apiKeyId ?? null,
        input.latencyMs ?? null,
      ],
    );
  } catch (err) {
    logger.error({ err, kind: input.kind, provider: input.provider }, 'usage: record failed');
  }
}

// ============================================================
// Read helpers for the admin /admin/usage page
// ============================================================

export interface UsageKpis {
  total_calls_24h: number;
  total_calls_7d: number;
  total_cost_usd_24h: number;
  total_cost_usd_7d: number;
  total_cost_usd_30d: number;
  /** Convenience: total all-time. */
  total_cost_usd_all: number;
}

export async function getUsageKpis(): Promise<UsageKpis> {
  const r = await query<{
    c24: string;
    c7: string;
    cost24: string;
    cost7: string;
    cost30: string;
    costAll: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE occurred_at > NOW() - INTERVAL '24 hours')::text AS c24,
       COUNT(*) FILTER (WHERE occurred_at > NOW() - INTERVAL '7 days')::text AS c7,
       COALESCE(SUM(cost_micro_usd) FILTER (WHERE occurred_at > NOW() - INTERVAL '24 hours'), 0)::text AS cost24,
       COALESCE(SUM(cost_micro_usd) FILTER (WHERE occurred_at > NOW() - INTERVAL '7 days'), 0)::text AS cost7,
       COALESCE(SUM(cost_micro_usd) FILTER (WHERE occurred_at > NOW() - INTERVAL '30 days'), 0)::text AS cost30,
       COALESCE(SUM(cost_micro_usd), 0)::text AS costAll
     FROM usage_events`,
  );
  const a = r.rows[0]!;
  return {
    total_calls_24h: Number(a.c24),
    total_calls_7d: Number(a.c7),
    total_cost_usd_24h: Number(a.cost24) / 1_000_000,
    total_cost_usd_7d: Number(a.cost7) / 1_000_000,
    total_cost_usd_30d: Number(a.cost30) / 1_000_000,
    total_cost_usd_all: Number(a.costAll) / 1_000_000,
  };
}

export interface DailyRollupRow {
  day: string; // ISO date
  pack_slug: string;
  provider: string;
  kind: UsageKind;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export async function getDailyRollup(days = 14): Promise<DailyRollupRow[]> {
  const r = await query<{
    day: Date;
    pack_slug: string;
    provider: string;
    kind: UsageKind;
    calls: string;
    input_tokens: string;
    output_tokens: string;
    cost_micro_usd: string;
  }>(
    `SELECT day, pack_slug, provider, kind, calls::text, input_tokens::text,
            output_tokens::text, cost_micro_usd::text
       FROM usage_daily
      WHERE day >= CURRENT_DATE - $1::INTEGER
      ORDER BY day DESC, cost_micro_usd DESC`,
    [days],
  );
  return r.rows.map((row) => ({
    day: new Date(row.day).toISOString().slice(0, 10),
    pack_slug: row.pack_slug,
    provider: row.provider,
    kind: row.kind,
    calls: Number(row.calls),
    input_tokens: Number(row.input_tokens),
    output_tokens: Number(row.output_tokens),
    cost_usd: Number(row.cost_micro_usd) / 1_000_000,
  }));
}

export interface ProviderRollupRow {
  provider: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export async function getProviderRollup(days = 30): Promise<ProviderRollupRow[]> {
  const r = await query<{
    provider: string;
    calls: string;
    input_tokens: string;
    output_tokens: string;
    cost_micro_usd: string;
  }>(
    `SELECT provider,
            SUM(calls)::text AS calls,
            SUM(input_tokens)::text AS input_tokens,
            SUM(output_tokens)::text AS output_tokens,
            SUM(cost_micro_usd)::text AS cost_micro_usd
       FROM usage_daily
      WHERE day >= CURRENT_DATE - $1::INTEGER
      GROUP BY provider
      ORDER BY SUM(cost_micro_usd) DESC`,
    [days],
  );
  return r.rows.map((row) => ({
    provider: row.provider,
    calls: Number(row.calls),
    input_tokens: Number(row.input_tokens),
    output_tokens: Number(row.output_tokens),
    cost_usd: Number(row.cost_micro_usd) / 1_000_000,
  }));
}

export interface PackRollupRow {
  pack_slug: string;
  calls: number;
  cost_usd: number;
}

export async function getPackRollup(days = 30): Promise<PackRollupRow[]> {
  const r = await query<{ pack_slug: string; calls: string; cost_micro_usd: string }>(
    `SELECT pack_slug,
            SUM(calls)::text AS calls,
            SUM(cost_micro_usd)::text AS cost_micro_usd
       FROM usage_daily
      WHERE day >= CURRENT_DATE - $1::INTEGER
      GROUP BY pack_slug
      ORDER BY SUM(cost_micro_usd) DESC`,
    [days],
  );
  return r.rows.map((row) => ({
    pack_slug: row.pack_slug || '(unset)',
    calls: Number(row.calls),
    cost_usd: Number(row.cost_micro_usd) / 1_000_000,
  }));
}
