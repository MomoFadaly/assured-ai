/**
 * GET /api/admin/audit/export — export audit log as CSV.
 * For compliance review; preserves full forensic record.
 */

import { query } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ExportRow {
  id: number;
  occurred_at: Date;
  scenario: string;
  outcome: string;
  outcome_reason: string | null;
  query_redacted: string;
  response_redacted: string | null;
  pii_detected_input: boolean;
  pii_detected_output: boolean;
  red_flag_category: string | null;
  latency_ms: number | null;
  model_used: string | null;
  prev_hash: string | null;
  hash: string;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(): Promise<Response> {
  const result = await query<ExportRow>(
    `SELECT id, occurred_at, scenario, outcome, outcome_reason,
            query_redacted, response_redacted,
            pii_detected_input, pii_detected_output,
            red_flag_category, latency_ms, model_used,
            prev_hash, hash
       FROM audit_log
       ORDER BY id ASC`,
  );

  const headers = [
    'id',
    'occurred_at',
    'scenario',
    'outcome',
    'outcome_reason',
    'query_redacted',
    'response_redacted',
    'pii_detected_input',
    'pii_detected_output',
    'red_flag_category',
    'latency_ms',
    'model_used',
    'prev_hash',
    'hash',
  ];

  const lines: string[] = [headers.join(',')];
  for (const row of result.rows) {
    lines.push(
      [
        csvEscape(row.id),
        csvEscape(row.occurred_at.toISOString()),
        csvEscape(row.scenario),
        csvEscape(row.outcome),
        csvEscape(row.outcome_reason),
        csvEscape(row.query_redacted),
        csvEscape(row.response_redacted),
        csvEscape(row.pii_detected_input),
        csvEscape(row.pii_detected_output),
        csvEscape(row.red_flag_category),
        csvEscape(row.latency_ms),
        csvEscape(row.model_used),
        csvEscape(row.prev_hash),
        csvEscape(row.hash),
      ].join(','),
    );
  }

  const csv = lines.join('\n');
  const filename = `assured-ai-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
