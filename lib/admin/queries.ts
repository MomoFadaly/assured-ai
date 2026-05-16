/**
 * Server-only query helpers for the admin dashboard.
 *
 * Pages render these as direct reads; the admin proxy already verifies
 * the caller is role='admin' before any of this is reached. Still, every
 * read is parameter-safe.
 */

import 'server-only';
import { query } from '@/lib/db/client';
import { getKillSwitchState } from '@/lib/orchestration/kill-switch';
import type { UserRole } from '@/lib/db/types';

// ============================================================
// USERS
// ============================================================

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  has_password: boolean;
  email_verified: Date | null;
  failed_login_count: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  oauth_providers: string[];
}

export async function listUsers(opts: {
  search?: string;
  limit?: number;
}): Promise<AdminUserRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const search = opts.search?.trim();
  const params: unknown[] = [limit];
  let whereClause = '';
  if (search && search.length > 0) {
    params.push(`%${search.toLowerCase()}%`);
    whereClause = `WHERE LOWER(u.email) LIKE $2 OR LOWER(u.name) LIKE $2`;
  }
  const r = await query<AdminUserRow>(
    `SELECT u.id, u.email, u.name, u.role,
            (u.password_hash IS NOT NULL) AS has_password,
            u.email_verified, u.failed_login_count, u.locked_until,
            u.last_login_at, u.deleted_at, u.created_at,
            COALESCE(
              (SELECT array_agg(DISTINCT a.provider ORDER BY a.provider)
                 FROM accounts a WHERE a."userId" = u.id),
              ARRAY[]::TEXT[]
            ) AS oauth_providers
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $1`,
    params,
  );
  return r.rows;
}

export async function countUsers(): Promise<{ total: number; admins: number; operators: number; auditors: number; customers: number }> {
  const r = await query<{ role: UserRole; n: string }>(
    `SELECT role, COUNT(*)::text AS n FROM users WHERE deleted_at IS NULL GROUP BY role`,
  );
  let total = 0;
  let admins = 0;
  let operators = 0;
  let auditors = 0;
  let customers = 0;
  for (const row of r.rows) {
    const n = Number(row.n);
    total += n;
    if (row.role === 'admin') admins = n;
    if (row.role === 'operator') operators = n;
    if (row.role === 'auditor') auditors = n;
    if (row.role === 'customer') customers = n;
  }
  return { total, admins, operators, auditors, customers };
}

// ============================================================
// KPIs
// ============================================================

export interface AdminKpis {
  verifications_last_24h: number;
  verifications_last_7d: number;
  pii_redacted_24h: number;
  red_flags_24h: number;
  unsourced_24h: number;
  open_escalations: number;
  open_findings: number;
  monitored_sites: number;
  audit_chain_rows: number;
  audit_chain_last_id: number | null;
  users_total: number;
}

export async function getKpis(): Promise<AdminKpis> {
  const [auditAgg, escalations, findings, monSites, auditChain, users] = await Promise.all([
    query<{
      v24: string;
      v7d: string;
      pii: string;
      red: string;
      uns: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE occurred_at > NOW() - INTERVAL '24 hours')::text AS v24,
         COUNT(*) FILTER (WHERE occurred_at > NOW() - INTERVAL '7 days')::text AS v7d,
         COUNT(*) FILTER (WHERE pii_detected_input = true AND occurred_at > NOW() - INTERVAL '24 hours')::text AS pii,
         COUNT(*) FILTER (WHERE outcome = 'red_flag_escalation' AND occurred_at > NOW() - INTERVAL '24 hours')::text AS red,
         COUNT(*) FILTER (WHERE outcome = 'i_dont_know' AND occurred_at > NOW() - INTERVAL '24 hours')::text AS uns
       FROM audit_log`,
    ),
    query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM escalations WHERE reviewed_at IS NULL`,
    ),
    query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM monitor_findings WHERE status = 'new'`,
    ),
    query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM monitored_sites WHERE enabled = true`),
    query<{ rows: string; last_id: number | null }>(
      `SELECT COUNT(*)::text AS rows, MAX(id) AS last_id FROM audit_log`,
    ),
    query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM users WHERE deleted_at IS NULL`),
  ]);

  const a = auditAgg.rows[0]!;
  return {
    verifications_last_24h: Number(a.v24),
    verifications_last_7d: Number(a.v7d),
    pii_redacted_24h: Number(a.pii),
    red_flags_24h: Number(a.red),
    unsourced_24h: Number(a.uns),
    open_escalations: Number(escalations.rows[0]!.n),
    open_findings: Number(findings.rows[0]!.n),
    monitored_sites: Number(monSites.rows[0]!.n),
    audit_chain_rows: Number(auditChain.rows[0]!.rows),
    audit_chain_last_id: auditChain.rows[0]!.last_id,
    users_total: Number(users.rows[0]!.n),
  };
}

// ============================================================
// SYSTEM HEALTH
// ============================================================

export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface SystemStatus {
  database: ServiceStatus;
  presidio: ServiceStatus;
  llm: ServiceStatus;
  embeddings: ServiceStatus;
  kill_switch: { engaged: boolean; reason: string | null; engaged_at: Date | null };
  uptime_ms: number;
}

const startedAt = Date.now();

export async function getSystemStatus(): Promise<SystemStatus> {
  const [db, presidio, llm, emb, ks] = await Promise.all([
    probeDatabase(),
    probePresidio(),
    probeLlm(),
    probeEmbeddings(),
    getKillSwitchState(),
  ]);
  return {
    database: db,
    presidio,
    llm,
    embeddings: emb,
    kill_switch: { engaged: ks.is_engaged, reason: ks.reason, engaged_at: ks.engaged_at },
    uptime_ms: Date.now() - startedAt,
  };
}

async function probeDatabase(): Promise<ServiceStatus> {
  try {
    const r = await query<{ ok: number }>(`SELECT 1::int AS ok`);
    return r.rows[0]?.ok === 1 ? 'healthy' : 'degraded';
  } catch {
    return 'down';
  }
}

async function probePresidio(): Promise<ServiceStatus> {
  try {
    const url = (process.env.PRESIDIO_ANALYZER_URL ?? '').replace(/\/analyze$/, '/health');
    if (!url) return 'unknown';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      return r.ok ? 'healthy' : 'degraded';
    } finally {
      clearTimeout(t);
    }
  } catch {
    return 'down';
  }
}

async function probeLlm(): Promise<ServiceStatus> {
  // Cheap reachability — DNS + TCP only, no API call (don't burn budget on a probe).
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'OPTIONS',
        signal: ctrl.signal,
      });
      return r.status < 500 ? 'healthy' : 'degraded';
    } finally {
      clearTimeout(t);
    }
  } catch {
    return 'down';
  }
}

async function probeEmbeddings(): Promise<ServiceStatus> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    try {
      const r = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'OPTIONS',
        signal: ctrl.signal,
      });
      return r.status < 500 ? 'healthy' : 'degraded';
    } finally {
      clearTimeout(t);
    }
  } catch {
    return 'down';
  }
}

// ============================================================
// RECENT ACTIVITY
// ============================================================

export interface RecentVerification {
  id: number;
  occurred_at: Date;
  scenario: string;
  outcome: string;
  pii_detected_input: boolean;
  red_flag_category: string | null;
  latency_ms: number | null;
}

export async function listRecentVerifications(limit = 10): Promise<RecentVerification[]> {
  const r = await query<RecentVerification>(
    `SELECT id, occurred_at, scenario, outcome, pii_detected_input, red_flag_category, latency_ms
       FROM audit_log
      ORDER BY id DESC
      LIMIT $1`,
    [Math.min(Math.max(limit, 1), 100)],
  );
  return r.rows;
}

export interface RecentAdminAction {
  id: number;
  occurred_at: Date;
  actor_email: string | null;
  actor_role: UserRole | null;
  action: string;
  target_kind: string | null;
  target_id: string | null;
  reason: string | null;
}

export async function listRecentAdminActions(limit = 20): Promise<RecentAdminAction[]> {
  const r = await query<RecentAdminAction>(
    `SELECT id, occurred_at, actor_email, actor_role, action, target_kind, target_id, reason
       FROM admin_actions
      ORDER BY id DESC
      LIMIT $1`,
    [Math.min(Math.max(limit, 1), 200)],
  );
  return r.rows;
}

// ============================================================
// MONITOR
// ============================================================

export interface MonitoredSiteRow {
  id: string;
  name: string;
  url: string;
  scenario: 'healthcare' | 'government';
  enabled: boolean;
  schedule: 'manual' | 'hourly' | 'daily' | 'weekly';
  last_scanned_at: Date | null;
  next_scan_at: Date | null;
  total_pages_known: number;
  total_findings_open: number;
  last_run_status: 'running' | 'completed' | 'failed' | 'cancelled' | 'partial' | null;
  created_at: Date;
}

export async function listMonitoredSites(): Promise<MonitoredSiteRow[]> {
  const r = await query<MonitoredSiteRow>(
    `SELECT id, name, url, scenario, enabled, schedule, last_scanned_at, next_scan_at,
            total_pages_known, total_findings_open, last_run_status, created_at
       FROM monitored_sites
      ORDER BY created_at DESC`,
  );
  return r.rows;
}

export async function getMonitoredSite(id: string): Promise<MonitoredSiteRow | null> {
  const r = await query<MonitoredSiteRow>(
    `SELECT id, name, url, scenario, enabled, schedule, last_scanned_at, next_scan_at,
            total_pages_known, total_findings_open, last_run_status, created_at
       FROM monitored_sites WHERE id = $1 LIMIT 1`,
    [id],
  );
  return r.rows[0] ?? null;
}

export interface MonitorFindingRow {
  id: string;
  page_url: string;
  scanned_at: Date;
  audit_log_id: number | null;
  severity: 'clean' | 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'acknowledged' | 'resolved' | 'dismissed';
  summary: string;
  pii_count: number;
  unsourced_count: number;
  supported_count: number;
  disclaimer_missing: boolean;
  red_flag_category: string | null;
}

export async function listFindings(opts: {
  siteId?: string;
  status?: 'new' | 'acknowledged' | 'resolved' | 'dismissed' | 'all';
  severity?: 'low' | 'medium' | 'high' | 'critical' | 'all';
  limit?: number;
}): Promise<MonitorFindingRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const conds: string[] = [];
  const params: unknown[] = [];
  if (opts.siteId) {
    params.push(opts.siteId);
    conds.push(`site_id = $${params.length}`);
  }
  if (opts.status && opts.status !== 'all') {
    params.push(opts.status);
    conds.push(`status = $${params.length}::monitor_finding_status_t`);
  }
  if (opts.severity && opts.severity !== 'all') {
    params.push(opts.severity);
    conds.push(`severity = $${params.length}::monitor_severity_t`);
  }
  params.push(limit);
  const r = await query<MonitorFindingRow>(
    `SELECT id, page_url, scanned_at, audit_log_id, severity, status, summary,
            pii_count, unsourced_count, supported_count, disclaimer_missing, red_flag_category
       FROM monitor_findings
       ${conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : ''}
       ORDER BY
         CASE severity
           WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2
           WHEN 'low' THEN 3 WHEN 'clean' THEN 4
         END,
         scanned_at DESC
       LIMIT $${params.length}`,
    params,
  );
  return r.rows;
}

export interface ScanRunRow {
  id: string;
  site_id: string;
  triggered_kind: string;
  started_at: Date;
  finished_at: Date | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'partial';
  pages_discovered: number;
  pages_scanned: number;
  pages_skipped_unchanged: number;
  pages_failed: number;
  new_findings: number;
  error: string | null;
}

export async function listScanRuns(siteId: string, limit = 20): Promise<ScanRunRow[]> {
  const r = await query<ScanRunRow>(
    `SELECT id, site_id, triggered_kind, started_at, finished_at, status,
            pages_discovered, pages_scanned, pages_skipped_unchanged,
            pages_failed, new_findings, error
       FROM monitor_scan_runs
      WHERE site_id = $1
      ORDER BY started_at DESC
      LIMIT $2`,
    [siteId, Math.min(Math.max(limit, 1), 100)],
  );
  return r.rows;
}

export interface MonitoredPageRow {
  id: string;
  url: string;
  title: string | null;
  last_scanned_at: Date | null;
  last_severity: 'clean' | 'low' | 'medium' | 'high' | 'critical' | null;
}

export async function listPages(siteId: string, limit = 200): Promise<MonitoredPageRow[]> {
  const r = await query<MonitoredPageRow>(
    `SELECT id, url, title, last_scanned_at, last_severity
       FROM monitored_pages
      WHERE site_id = $1
      ORDER BY
        CASE last_severity
          WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2
          WHEN 'low' THEN 3 ELSE 4
        END,
        last_scanned_at DESC NULLS LAST
      LIMIT $2`,
    [siteId, Math.min(Math.max(limit, 1), 1000)],
  );
  return r.rows;
}
