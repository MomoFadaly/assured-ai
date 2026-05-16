/**
 * Client-safe constants + types for the evidence pack surface.
 *
 * Separated from `lib/evidence/index.ts` (which imports server-only
 * code like `pg`) so the admin form can import the table list without
 * dragging the DB driver into the client bundle.
 */

export type EvidenceTable =
  | 'audit_log'
  | 'admin_actions'
  | 'notification_deliveries'
  | 'usage_events'
  | 'monitor_findings'
  | 'monitor_scan_runs'
  | 'login_history'
  | 'api_keys'
  | 'teammate_invites'
  | 'anomaly_events';

export const ALL_EVIDENCE_TABLES: EvidenceTable[] = [
  'audit_log',
  'admin_actions',
  'notification_deliveries',
  'usage_events',
  'monitor_findings',
  'monitor_scan_runs',
  'login_history',
  'api_keys',
  'teammate_invites',
  'anomaly_events',
];
