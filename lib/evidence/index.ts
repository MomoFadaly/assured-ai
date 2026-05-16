/**
 * SOC 2 evidence pack builder.
 *
 * Bundles every auditable surface (audit_log, admin_actions,
 * notification_deliveries, usage_events, monitor_findings, login
 * history) for a date window into a single ZIP that compliance can
 * hand to an auditor.
 *
 * Design notes:
 *   - CSVs use a deterministic column order so byte-for-byte
 *     reproducibility is achievable across runs.
 *   - Every export is logged in `evidence_exports` with a sha256
 *     digest so the receiver can verify the bundle wasn't tampered
 *     with after handover.
 *   - We stream-build the zip in memory. For very large tenants
 *     (>500K rows / >50MB), upgrade to S3 multipart + signed URL in
 *     a follow-up — the schema (evidence_exports.storage_url) is
 *     already shaped for it.
 */

import '@/lib/server-only';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';

export { ALL_EVIDENCE_TABLES, type EvidenceTable } from './constants';
import { ALL_EVIDENCE_TABLES, type EvidenceTable } from './constants';

export interface EvidenceExportInput {
  tenantId: string | null;
  windowStart: Date;
  windowEnd: Date;
  requestedBy: string;
  /** Subset of tables to include. Defaults to all SOC 2-relevant tables. */
  includeTables?: EvidenceTable[];
}

export interface EvidenceExportResult {
  id: string;
  bundle_sha256: string;
  bundle_bytes: number;
  /** Plain (uncompressed) bytes — for client filename hints. */
  uncompressed_bytes: number;
  files: Array<{ name: string; bytes: number; rows: number }>;
}

/**
 * Build the evidence bundle synchronously and return the raw gzip
 * bytes. Caller streams them to the client (or to S3 in a future
 * implementation).
 */
export async function buildEvidencePack(
  input: EvidenceExportInput,
): Promise<{ result: EvidenceExportResult; bundle: Buffer }> {
  const tables = input.includeTables ?? ALL_EVIDENCE_TABLES;
  const startISO = input.windowStart.toISOString();
  const endISO = input.windowEnd.toISOString();

  // Insert the row first so we have an audit trail even if generation
  // fails partway. We update with sha + bytes on success.
  const insertRes = await query<{ id: string }>(
    `INSERT INTO evidence_exports
       (tenant_id, requested_by, window_start, window_end, included_tables, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id`,
    [input.tenantId, input.requestedBy, startISO, endISO, tables],
  );
  const id = insertRes.rows[0]!.id;

  const files: Array<{ name: string; bytes: number; rows: number; content: Buffer }> = [];

  try {
    for (const t of tables) {
      const csv = await buildCsvForTable(t, input);
      const buf = Buffer.from(csv.content, 'utf8');
      files.push({ name: `${t}.csv`, bytes: buf.length, rows: csv.rows, content: buf });
    }

    // Cover letter + manifest
    const manifest = buildManifest({
      exportId: id,
      tenantId: input.tenantId,
      windowStart: startISO,
      windowEnd: endISO,
      requestedBy: input.requestedBy,
      files: files.map((f) => ({ name: f.name, rows: f.rows, bytes: f.bytes })),
    });
    const manifestBuf = Buffer.from(manifest, 'utf8');
    files.push({ name: 'MANIFEST.json', bytes: manifestBuf.length, rows: 0, content: manifestBuf });

    const cover = buildCoverLetter({
      exportId: id,
      windowStart: startISO,
      windowEnd: endISO,
      files: files.map((f) => f.name),
    });
    const coverBuf = Buffer.from(cover, 'utf8');
    files.push({ name: 'README.txt', bytes: coverBuf.length, rows: 0, content: coverBuf });

    // Build a minimal tarball-equivalent — a single concatenated
    // body with file headers is robust and dependency-free. We use a
    // simple custom container (newline-delimited headers) since
    // shipping a `zip` lib pulls a dep. For better client UX we may
    // swap to true zip with jszip later. Compress the whole thing
    // with gzip.
    const raw = encodeBundle(files.map((f) => ({ name: f.name, content: f.content })));
    const gz = gzipSync(raw, { level: 9 });
    const sha = createHash('sha256').update(gz).digest('hex');

    await query(
      `UPDATE evidence_exports
          SET status = 'ready', bundle_sha256 = $2, bundle_bytes = $3,
              storage_url = 'inline', completed_at = NOW()
        WHERE id = $1`,
      [id, sha, gz.length],
    );

    const result: EvidenceExportResult = {
      id,
      bundle_sha256: sha,
      bundle_bytes: gz.length,
      uncompressed_bytes: raw.length,
      files: files.map((f) => ({ name: f.name, bytes: f.bytes, rows: f.rows })),
    };

    logger.info(
      { exportId: id, tables: tables.length, bytes: gz.length, sha },
      'evidence pack built',
    );

    return { result, bundle: gz };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await query(
      `UPDATE evidence_exports SET status = 'failed', error = $2, completed_at = NOW() WHERE id = $1`,
      [id, msg],
    );
    logger.error({ err, exportId: id }, 'evidence pack build failed');
    throw err;
  }
}

// ============================================================
// CSV builders — per table
// ============================================================

async function buildCsvForTable(
  table: EvidenceTable,
  input: EvidenceExportInput,
): Promise<{ content: string; rows: number }> {
  switch (table) {
    case 'audit_log':
      return queryToCsv(
        `SELECT id, scenario, outcome, user_session_id, red_flag_category,
                pii_detected_input, pii_detected_output, model_used, latency_ms,
                occurred_at, hash_self, hash_prev
           FROM audit_log
          WHERE occurred_at >= $1 AND occurred_at < $2
            ${input.tenantId ? 'AND tenant_id = $3' : ''}
          ORDER BY id ASC`,
        input,
      );
    case 'admin_actions':
      return queryToCsv(
        `SELECT id, actor_email, actor_role, action, target_kind, target_id,
                reason, occurred_at
           FROM admin_actions
          WHERE occurred_at >= $1 AND occurred_at < $2
            ${input.tenantId ? 'AND tenant_id = $3' : ''}
          ORDER BY id ASC`,
        input,
      );
    case 'notification_deliveries':
      return queryToCsv(
        `SELECT id, channel_id, channel_name, channel_kind, event_kind,
                event_key, status, http_status, error, created_at
           FROM notification_deliveries
          WHERE created_at >= $1 AND created_at < $2
          ORDER BY id ASC`,
        input,
        { skipTenant: true },
      );
    case 'usage_events':
      return queryToCsv(
        `SELECT id, kind, provider, model, input_tokens, output_tokens,
                cost_micro_usd, audit_log_id, source, api_key_id, occurred_at
           FROM usage_events
          WHERE occurred_at >= $1 AND occurred_at < $2
            ${input.tenantId ? 'AND tenant_id = $3' : ''}
          ORDER BY id ASC`,
        input,
      );
    case 'monitor_findings':
      return queryToCsv(
        `SELECT id, site_id, page_url, severity, status, summary, audit_log_id,
                scanned_at, acknowledged_at, resolved_at
           FROM monitor_findings
          WHERE scanned_at >= $1 AND scanned_at < $2
            ${input.tenantId ? 'AND tenant_id = $3' : ''}
          ORDER BY id ASC`,
        input,
      );
    case 'monitor_scan_runs':
      return queryToCsv(
        `SELECT id, site_id, status, started_at, finished_at,
                pages_discovered, pages_scanned, pages_failed, new_findings, error
           FROM monitor_scan_runs
          WHERE started_at >= $1 AND started_at < $2
            ${input.tenantId ? 'AND tenant_id = $3' : ''}
          ORDER BY id ASC`,
        input,
      );
    case 'login_history':
      // login_history is optional — if the table doesn't exist
      // (deployments without auth migration) return an empty CSV.
      try {
        return await queryToCsv(
          `SELECT id, user_email, outcome, ip_hint, user_agent, created_at
             FROM login_history
            WHERE created_at >= $1 AND created_at < $2
            ORDER BY id ASC`,
          input,
          { skipTenant: true },
        );
      } catch {
        return { content: 'id,user_email,outcome,ip_hint,user_agent,created_at\n', rows: 0 };
      }
    case 'api_keys':
      return queryToCsv(
        `SELECT id, name, prefix, scopes, allowed_pack_slugs, last_used_at,
                use_count, created_at, revoked_at
           FROM api_keys
          WHERE created_at < $2
            ${input.tenantId ? 'AND tenant_id = $3' : ''}
          ORDER BY id ASC`,
        // For api_keys, the "since" filter is unusual — we include
        // every key that existed during the window, even if created
        // before it. Reuse $2 as upper-bound and ignore $1.
        { ...input, windowStart: new Date(0) },
      );
    case 'teammate_invites':
      return queryToCsv(
        `SELECT id, email, role, invited_by, expires_at, accepted_at,
                accepted_by, created_at
           FROM teammate_invites
          WHERE created_at >= $1 AND created_at < $2
            ${input.tenantId ? 'AND tenant_id = $3' : ''}
          ORDER BY id ASC`,
        input,
      );
    case 'anomaly_events':
      return queryToCsv(
        `SELECT id, kind, severity, summary, window_start, window_end,
                acknowledged_at, acknowledged_by, created_at
           FROM anomaly_events
          WHERE created_at >= $1 AND created_at < $2
            ${input.tenantId ? 'AND tenant_id = $3' : ''}
          ORDER BY id ASC`,
        input,
      );
  }
}

async function queryToCsv(
  sql: string,
  input: EvidenceExportInput,
  opts?: { skipTenant?: boolean },
): Promise<{ content: string; rows: number }> {
  const args: unknown[] = [input.windowStart.toISOString(), input.windowEnd.toISOString()];
  if (input.tenantId && !opts?.skipTenant) args.push(input.tenantId);

  const r = await query<Record<string, unknown>>(sql, args);
  if (r.rows.length === 0) {
    // Generate a header-only CSV from the SQL column list so the
    // file is still useful (auditors can confirm a query returned 0).
    const colNames = extractColumnNames(sql);
    return { content: colNames.join(',') + '\n', rows: 0 };
  }
  const cols = Object.keys(r.rows[0]!);
  const lines = [cols.join(',')];
  for (const row of r.rows) {
    lines.push(cols.map((c) => csvEscape(row[c])).join(','));
  }
  return { content: lines.join('\n') + '\n', rows: r.rows.length };
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return csvEscape(JSON.stringify(v));
  if (typeof v === 'object') return csvEscape(JSON.stringify(v));
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function extractColumnNames(sql: string): string[] {
  // Very rough — only used for the empty-result header case. Pull
  // the SELECT clause and split on commas, strip newlines + AS.
  const m = sql.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
  if (!m || !m[1]) return ['row'];
  return m[1]
    .split(',')
    .map((c) => c.replace(/\s+AS\s+/i, ' ').trim())
    .map((c) => c.split(/\s+/).pop()!.trim())
    .map((c) => c.replace(/^[a-z_]+\./i, ''));
}

// ============================================================
// Bundle encoder
// ============================================================
//
// Custom container — simpler than zip + works without a dep:
//   ASSUREDAI-BUNDLE/1\n
//   FILE <name> <bytes>\n
//   <content>\n
//   FILE <name> <bytes>\n
//   ...
//
// Compresses with gzip end-to-end. Manifest.json inside the bundle
// lists files + row counts so a receiver can verify completeness.
//
function encodeBundle(files: Array<{ name: string; content: Buffer }>): Buffer {
  const parts: Buffer[] = [Buffer.from('ASSUREDAI-BUNDLE/1\n', 'utf8')];
  for (const f of files) {
    parts.push(Buffer.from(`FILE ${f.name} ${f.content.length}\n`, 'utf8'));
    parts.push(f.content);
    parts.push(Buffer.from('\n', 'utf8'));
  }
  return Buffer.concat(parts);
}

function buildManifest(opts: {
  exportId: string;
  tenantId: string | null;
  windowStart: string;
  windowEnd: string;
  requestedBy: string;
  files: Array<{ name: string; rows: number; bytes: number }>;
}): string {
  return JSON.stringify(
    {
      bundle: 'assuredai-evidence',
      version: 1,
      export_id: opts.exportId,
      tenant_id: opts.tenantId,
      window: { start: opts.windowStart, end: opts.windowEnd },
      requested_by_user_id: opts.requestedBy,
      generated_at: new Date().toISOString(),
      files: opts.files,
    },
    null,
    2,
  );
}

function buildCoverLetter(opts: {
  exportId: string;
  windowStart: string;
  windowEnd: string;
  files: string[];
}): string {
  return [
    'AssuredAI — SOC 2 evidence bundle',
    '',
    `Export ID:  ${opts.exportId}`,
    `Window:     ${opts.windowStart} → ${opts.windowEnd}`,
    `Generated:  ${new Date().toISOString()}`,
    '',
    'Contents:',
    ...opts.files.map((n) => `  - ${n}`),
    '',
    'Verification:',
    '  This bundle is a gzip-compressed AssuredAI container.',
    '  The exporter records a sha256 digest in the `evidence_exports`',
    '  table; you can re-hash this file and compare to confirm no',
    '  tampering after handover. Decompress with `gunzip` and parse',
    '  the line-delimited container per MANIFEST.json.',
    '',
    'Hash-chain note:',
    '  audit_log.csv preserves the hash_self + hash_prev columns. Any',
    '  auditor can re-derive the chain to confirm completeness +',
    '  ordering of the included rows.',
    '',
  ].join('\n');
}

// ============================================================
// Read API
// ============================================================

export async function listEvidenceExports(
  tenantId: string | null,
  limit = 50,
): Promise<Array<{
  id: string;
  tenant_id: string | null;
  requested_by: string;
  requester_email: string | null;
  window_start: Date;
  window_end: Date;
  included_tables: string[];
  bundle_sha256: string | null;
  bundle_bytes: number | null;
  status: string;
  error: string | null;
  created_at: Date;
  completed_at: Date | null;
}>> {
  const args: unknown[] = [limit];
  let where = '';
  if (tenantId) {
    args.push(tenantId);
    where = `WHERE ev.tenant_id = $2`;
  }
  const r = await query<{
    id: string;
    tenant_id: string | null;
    requested_by: string;
    requester_email: string | null;
    window_start: Date;
    window_end: Date;
    included_tables: string[];
    bundle_sha256: string | null;
    bundle_bytes: number | null;
    status: string;
    error: string | null;
    created_at: Date;
    completed_at: Date | null;
  }>(
    `SELECT ev.id, ev.tenant_id, ev.requested_by, u.email AS requester_email,
            ev.window_start, ev.window_end, ev.included_tables,
            ev.bundle_sha256, ev.bundle_bytes, ev.status, ev.error,
            ev.created_at, ev.completed_at
       FROM evidence_exports ev
       LEFT JOIN users u ON u.id = ev.requested_by
       ${where}
       ORDER BY ev.created_at DESC
       LIMIT $1`,
    args,
  );
  return r.rows;
}
