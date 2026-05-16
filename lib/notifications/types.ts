/**
 * Notification primitives — typed event shapes that callers emit, and the
 * channel-config shape that admins configure.
 */

export type NotificationChannelKind = 'slack' | 'email' | 'webhook';

export type NotificationEventKind =
  | 'monitor_finding'
  | 'red_flag_escalation'
  | 'kill_switch_engaged'
  | 'kill_switch_disengaged'
  | 'scan_failed'
  | 'inbound_lead'
  | 'anomaly_detected';

export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SlackChannelConfig {
  webhook_url: string;
}
export interface EmailChannelConfig {
  to: string;
}
export interface WebhookChannelConfig {
  url: string;
  /** Shared secret signed into `X-AssuredAI-Signature: sha256=<hex>` header. */
  secret?: string | null;
}

export type ChannelConfig =
  | { kind: 'slack'; config: SlackChannelConfig }
  | { kind: 'email'; config: EmailChannelConfig }
  | { kind: 'webhook'; config: WebhookChannelConfig };

export interface NotificationChannelRow {
  id: string;
  name: string;
  kind: NotificationChannelKind;
  config: SlackChannelConfig | EmailChannelConfig | WebhookChannelConfig;
  subscribed_events: NotificationEventKind[];
  min_severity: FindingSeverity | null;
  pack_slugs: string[];
  enabled: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================
// Event payloads — discriminated by `kind`
// ============================================================

export interface FindingEvent {
  kind: 'monitor_finding';
  event_key: string; // 'finding:<uuid>'
  finding_id: string;
  site_id: string;
  site_name: string;
  page_url: string;
  severity: FindingSeverity;
  summary: string;
  audit_log_id: number | null;
  pack_slug: string;
}

export interface RedFlagEvent {
  kind: 'red_flag_escalation';
  event_key: string; // 'audit:<bigint>'
  audit_log_id: number;
  category: string;
  pack_slug: string;
  /** Sanitised excerpt of the input. */
  excerpt: string;
}

export interface KillSwitchEvent {
  kind: 'kill_switch_engaged' | 'kill_switch_disengaged';
  event_key: string; // 'killswitch:engaged:<iso>'
  reason: string | null;
  actor_email: string | null;
}

export interface ScanFailedEvent {
  kind: 'scan_failed';
  event_key: string; // 'scanrun:<uuid>'
  scan_run_id: string;
  site_id: string;
  site_name: string;
  error: string;
}

export interface InboundLeadEvent {
  kind: 'inbound_lead';
  event_key: string; // 'lead:<bigint>'
  lead_id: number;
  /** 'book_a_demo' | 'talk_to_sales' | 'contact' */
  lead_type: string;
  name: string;
  email: string;
  org: string | null;
  role: string | null;
  segment: string | null;
  pack_interest: string | null;
  plan_interest: string | null;
  volume_estimate: string | null;
  requested_meeting_time: string | null;
  /** Truncated to 600 chars for notification surface. */
  message_excerpt: string | null;
}

export interface AnomalyDetectedEvent {
  kind: 'anomaly_detected';
  event_key: string; // 'anomaly:<uuid>'
  anomaly_id: string;
  anomaly_kind: string;
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  tenant_id: string | null;
}

export type NotificationEvent =
  | FindingEvent
  | RedFlagEvent
  | KillSwitchEvent
  | ScanFailedEvent
  | InboundLeadEvent
  | AnomalyDetectedEvent;
