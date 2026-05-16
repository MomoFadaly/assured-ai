/**
 * Client-safe types for the anomaly surface. Separate from
 * `lib/anomaly/index.ts` (which imports `pg`) so client components
 * can import these without dragging the DB driver into their bundle.
 */

export type AnomalyKind =
  | 'red_flag_spike'
  | 'volume_collapse'
  | 'recognizer_storm'
  | 'api_key_burst'
  | 'kill_switch_engaged';

export type AnomalySeverity = 'info' | 'warning' | 'critical';

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
