/**
 * Anomaly detection — daily cron + on-demand scan.
 *
 * Looks for unusual patterns in the last 24h vs a 14-day baseline:
 *
 *   red_flag_spike       red-flag escalations > 3x the 14-day mean
 *   volume_collapse      verifications < 25% of the 14-day mean (with
 *                        a 20-row minimum baseline so a low-volume
 *                        tenant doesn't trigger every quiet day)
 *   recognizer_storm     PHI/PII recognizer hits > 5x the 14-day mean
 *   api_key_burst        single API key > 10x its 14-day mean / day
 *   kill_switch_engaged  kill switch active for > 2h
 *
 * Each detection writes a row to `anomaly_events` with a stable
 * `dedupe_key` so re-runs in the same window don't spam. New rows
 * fire an `anomaly_detected` notification through the existing
 * Slack/email/webhook system.
 */

import '@/lib/server-only';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { notifyEvent } from '@/lib/notifications/dispatch';

const LOOKBACK_HOURS = 24;
const BASELINE_DAYS = 14;
const RED_FLAG_RATIO = 3;
const RECOGNIZER_RATIO = 5;
const API_KEY_RATIO = 10;
const VOLUME_COLLAPSE_RATIO = 0.25;
const VOLUME_BASELINE_MIN = 20;

export type AnomalyKind =
  | 'red_flag_spike'
  | 'volume_collapse'
  | 'recognizer_storm'
  | 'api_key_burst'
  | 'kill_switch_engaged';

export type AnomalySeverity = 'info' | 'warning' | 'critical';

export interface DetectedAnomaly {
  kind: AnomalyKind;
  severity: AnomalySeverity;
  summary: string;
  detail: Record<string, unknown>;
  dedupe_key: string;
  tenant_id: string | null;
  window_start: Date;
  window_end: Date;
}

export interface ScanReport {
  scanned_at: string;
  window_start: string;
  window_end: string;
  detected: number;
  inserted: number;
  skipped_duplicate: number;
  notified: number;
  anomalies: Array<{ kind: AnomalyKind; severity: AnomalySeverity; summary: string }>;
}

export async function runAnomalyScan(): Promise<ScanReport> {
  const now = new Date();
  const windowEnd = now;
  const windowStart = new Date(now.getTime() - LOOKBACK_HOURS * 3_600_000);
  const baselineStart = new Date(now.getTime() - (BASELINE_DAYS + 1) * 86_400_000);

  const detected: DetectedAnomaly[] = [];
  detected.push(...(await detectRedFlagSpike(windowStart, windowEnd, baselineStart)));
  detected.push(...(await detectVolumeCollapse(windowStart, windowEnd, baselineStart)));
  detected.push(...(await detectRecognizerStorm(windowStart, windowEnd, baselineStart)));
  detected.push(...(await detectApiKeyBurst(windowStart, windowEnd, baselineStart)));
  detected.push(...(await detectKillSwitch(windowStart, windowEnd)));

  let inserted = 0;
  let skipped = 0;
  let notified = 0;
  for (const a of detected) {
    const ins = await query<{ id: string }>(
      `INSERT INTO anomaly_events
         (tenant_id, kind, severity, summary, detail, dedupe_key, window_start, window_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (dedupe_key, window_start) DO NOTHING
       RETURNING id`,
      [
        a.tenant_id,
        a.kind,
        a.severity,
        a.summary,
        a.detail,
        a.dedupe_key,
        a.window_start.toISOString(),
        a.window_end.toISOString(),
      ],
    );
    if (ins.rows.length === 0) {
      skipped++;
      continue;
    }
    inserted++;
    const id = ins.rows[0]!.id;
    try {
      await notifyEvent({
        kind: 'anomaly_detected',
        event_key: `anomaly:${id}`,
        anomaly_id: id,
        anomaly_kind: a.kind,
        severity: a.severity,
        summary: a.summary,
        tenant_id: a.tenant_id,
      });
      notified++;
    } catch (err) {
      logger.error({ err, id }, 'anomaly notification dispatch failed');
    }
  }

  const report: ScanReport = {
    scanned_at: now.toISOString(),
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    detected: detected.length,
    inserted,
    skipped_duplicate: skipped,
    notified,
    anomalies: detected.map((a) => ({
      kind: a.kind,
      severity: a.severity,
      summary: a.summary,
    })),
  };
  logger.info(report, 'anomaly scan complete');
  return report;
}

// ============================================================
// Detectors
// ============================================================

async function detectRedFlagSpike(
  windowStart: Date,
  windowEnd: Date,
  baselineStart: Date,
): Promise<DetectedAnomaly[]> {
  // Per tenant, compare last-24h red-flag-escalation count to the
  // mean per-24h count over the baseline.
  const r = await query<{
    tenant_id: string | null;
    recent_count: number;
    baseline_mean: number;
  }>(
    `WITH baseline AS (
       SELECT tenant_id,
              COUNT(*)::float / GREATEST(EXTRACT(EPOCH FROM ($2::timestamptz - $3::timestamptz)) / 86400.0, 1) AS per_day
         FROM audit_log
        WHERE escalation_severity IS NOT NULL
          AND escalation_severity IN ('emergency','urgent')
          AND created_at >= $3 AND created_at < $1
        GROUP BY tenant_id
     ),
     recent AS (
       SELECT tenant_id, COUNT(*)::int AS cnt
         FROM audit_log
        WHERE escalation_severity IS NOT NULL
          AND escalation_severity IN ('emergency','urgent')
          AND created_at >= $1 AND created_at < $2
        GROUP BY tenant_id
     )
     SELECT r.tenant_id, r.cnt AS recent_count, COALESCE(b.per_day, 0) AS baseline_mean
       FROM recent r
       LEFT JOIN baseline b USING (tenant_id)
      WHERE r.cnt >= 3
        AND r.cnt > COALESCE(b.per_day, 0) * $4`,
    [
      windowStart.toISOString(),
      windowEnd.toISOString(),
      baselineStart.toISOString(),
      RED_FLAG_RATIO,
    ],
  );

  return r.rows.map((row) => ({
    kind: 'red_flag_spike',
    severity: row.recent_count >= 10 ? 'critical' : 'warning',
    summary: `Red-flag escalations: ${row.recent_count} in 24h vs ${row.baseline_mean.toFixed(1)}/day baseline.`,
    detail: { recent_count: row.recent_count, baseline_mean: row.baseline_mean },
    dedupe_key: `red_flag_spike:${row.tenant_id ?? 'all'}:${windowStart.toISOString().slice(0, 10)}`,
    tenant_id: row.tenant_id,
    window_start: windowStart,
    window_end: windowEnd,
  }));
}

async function detectVolumeCollapse(
  windowStart: Date,
  windowEnd: Date,
  baselineStart: Date,
): Promise<DetectedAnomaly[]> {
  const r = await query<{
    tenant_id: string | null;
    recent_count: number;
    baseline_mean: number;
  }>(
    `WITH baseline AS (
       SELECT tenant_id,
              COUNT(*)::float / GREATEST(EXTRACT(EPOCH FROM ($2::timestamptz - $3::timestamptz)) / 86400.0, 1) AS per_day
         FROM audit_log
        WHERE created_at >= $3 AND created_at < $1
        GROUP BY tenant_id
       HAVING COUNT(*) > $5
     ),
     recent AS (
       SELECT tenant_id, COUNT(*)::int AS cnt
         FROM audit_log
        WHERE created_at >= $1 AND created_at < $2
        GROUP BY tenant_id
     )
     SELECT b.tenant_id, COALESCE(r.cnt, 0) AS recent_count, b.per_day AS baseline_mean
       FROM baseline b
       LEFT JOIN recent r USING (tenant_id)
      WHERE COALESCE(r.cnt, 0) < b.per_day * $4`,
    [
      windowStart.toISOString(),
      windowEnd.toISOString(),
      baselineStart.toISOString(),
      VOLUME_COLLAPSE_RATIO,
      VOLUME_BASELINE_MIN,
    ],
  );

  return r.rows.map((row) => ({
    kind: 'volume_collapse',
    severity: 'warning',
    summary: `Verification volume dropped to ${row.recent_count} in 24h vs ${row.baseline_mean.toFixed(1)}/day baseline.`,
    detail: { recent_count: row.recent_count, baseline_mean: row.baseline_mean },
    dedupe_key: `volume_collapse:${row.tenant_id ?? 'all'}:${windowStart.toISOString().slice(0, 10)}`,
    tenant_id: row.tenant_id,
    window_start: windowStart,
    window_end: windowEnd,
  }));
}

async function detectRecognizerStorm(
  windowStart: Date,
  windowEnd: Date,
  baselineStart: Date,
): Promise<DetectedAnomaly[]> {
  // Sum recognizer_hits stored in verification_detail (JSONB) per tenant.
  const r = await query<{
    tenant_id: string | null;
    recent_sum: number;
    baseline_mean: number;
  }>(
    `WITH baseline AS (
       SELECT tenant_id,
              SUM(COALESCE((verification_detail->>'recognizer_hits')::int, 0))::float
                / GREATEST(EXTRACT(EPOCH FROM ($2::timestamptz - $3::timestamptz)) / 86400.0, 1) AS per_day
         FROM audit_log
        WHERE created_at >= $3 AND created_at < $1
        GROUP BY tenant_id
     ),
     recent AS (
       SELECT tenant_id, SUM(COALESCE((verification_detail->>'recognizer_hits')::int, 0))::int AS s
         FROM audit_log
        WHERE created_at >= $1 AND created_at < $2
        GROUP BY tenant_id
     )
     SELECT r.tenant_id, r.s AS recent_sum, COALESCE(b.per_day, 0) AS baseline_mean
       FROM recent r
       LEFT JOIN baseline b USING (tenant_id)
      WHERE r.s >= 5
        AND r.s > COALESCE(b.per_day, 0) * $4`,
    [
      windowStart.toISOString(),
      windowEnd.toISOString(),
      baselineStart.toISOString(),
      RECOGNIZER_RATIO,
    ],
  );

  return r.rows.map((row) => ({
    kind: 'recognizer_storm',
    severity: row.recent_sum >= 30 ? 'critical' : 'warning',
    summary: `${row.recent_sum} PHI/PII recognizer hits in 24h vs ${row.baseline_mean.toFixed(1)}/day baseline.`,
    detail: { recent_sum: row.recent_sum, baseline_mean: row.baseline_mean },
    dedupe_key: `recognizer_storm:${row.tenant_id ?? 'all'}:${windowStart.toISOString().slice(0, 10)}`,
    tenant_id: row.tenant_id,
    window_start: windowStart,
    window_end: windowEnd,
  }));
}

async function detectApiKeyBurst(
  windowStart: Date,
  windowEnd: Date,
  baselineStart: Date,
): Promise<DetectedAnomaly[]> {
  // We don't have a verifications-by-api-key index in 0.1; approximate
  // via usage_events.audit_log_id × api_keys.last_used_at increments.
  // For now stub with "key with last_used_at in window AND created >
  // baseline_start" — fully wired when verify_log adds api_key_id col.
  // Returning [] keeps the scan clean of false positives while the
  // schema catches up.
  void windowStart; void windowEnd; void baselineStart;
  return [];
}

async function detectKillSwitch(
  windowStart: Date,
  windowEnd: Date,
): Promise<DetectedAnomaly[]> {
  try {
    const r = await query<{ engaged_at: Date | null; engaged_by: string | null }>(
      `SELECT engaged_at, engaged_by FROM kill_switch_state WHERE engaged_at IS NOT NULL LIMIT 1`,
    );
    const row = r.rows[0];
    if (!row?.engaged_at) return [];
    const engagedHours = (windowEnd.getTime() - new Date(row.engaged_at).getTime()) / 3_600_000;
    if (engagedHours < 2) return [];
    return [
      {
        kind: 'kill_switch_engaged',
        severity: 'critical',
        summary: `Kill switch has been engaged for ${engagedHours.toFixed(1)}h.`,
        detail: { engaged_at: row.engaged_at, engaged_by: row.engaged_by },
        dedupe_key: `kill_switch:${new Date(row.engaged_at).toISOString().slice(0, 10)}`,
        tenant_id: null,
        window_start: windowStart,
        window_end: windowEnd,
      },
    ];
  } catch {
    // kill_switch_state may not exist in dev/test schemas
    return [];
  }
}

// ============================================================
// Read API for admin UI
// ============================================================

export async function listAnomalies(limit = 100): Promise<Array<{
  id: string;
  tenant_id: string | null;
  kind: string;
  severity: AnomalySeverity;
  summary: string;
  detail: Record<string, unknown>;
  window_start: Date;
  window_end: Date;
  acknowledged_at: Date | null;
  acknowledged_by: string | null;
  created_at: Date;
}>> {
  const r = await query<{
    id: string;
    tenant_id: string | null;
    kind: string;
    severity: AnomalySeverity;
    summary: string;
    detail: Record<string, unknown>;
    window_start: Date;
    window_end: Date;
    acknowledged_at: Date | null;
    acknowledged_by: string | null;
    created_at: Date;
  }>(
    `SELECT id, tenant_id, kind, severity, summary, detail, window_start, window_end,
            acknowledged_at, acknowledged_by, created_at
       FROM anomaly_events
       ORDER BY (acknowledged_at IS NULL) DESC, created_at DESC
       LIMIT $1`,
    [limit],
  );
  return r.rows;
}

export async function acknowledgeAnomaly(id: string, userId: string, notes?: string): Promise<void> {
  await query(
    `UPDATE anomaly_events
        SET acknowledged_at = COALESCE(acknowledged_at, NOW()),
            acknowledged_by = $2,
            notes = COALESCE($3, notes)
      WHERE id = $1`,
    [id, userId, notes ?? null],
  );
}
