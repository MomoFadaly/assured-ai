-- AssuredAI Migration 006 — Notification channels + delivery log
--
-- When a monitor scan turns up a critical/high finding, a red-flag fires
-- mid-verification, or the kill switch toggles, operators need to know in
-- the channels they already use (Slack, email, an internal webhook). This
-- migration adds:
--
--   notification_channels   — where to send (kind + config JSONB)
--   notification_deliveries — what was sent, when, response (forensic log,
--                             also gives us idempotency: a delivery row per
--                             (channel_id, event_id) prevents double-fires)
--
-- Idempotent.

DO $$ BEGIN
  CREATE TYPE notification_channel_kind_t AS ENUM ('slack', 'email', 'webhook');
  CREATE TYPE notification_event_kind_t AS ENUM (
    'monitor_finding',
    'red_flag_escalation',
    'kill_switch_engaged',
    'kill_switch_disengaged',
    'scan_failed'
  );
  CREATE TYPE notification_delivery_status_t AS ENUM ('sent', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS notification_channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  kind            notification_channel_kind_t NOT NULL,
  /**
   * Per-kind config shape:
   *   slack:  { "webhook_url": "https://hooks.slack.com/..." }
   *   email:  { "to": "ops@example.com" }
   *   webhook:{ "url": "https://...", "secret": "..." }
   */
  config          JSONB NOT NULL,
  /**
   * Subscriptions — which event kinds fire this channel.
   * NULL or empty = subscribe to all events.
   */
  subscribed_events notification_event_kind_t[] NOT NULL DEFAULT ARRAY[]::notification_event_kind_t[],
  /**
   * Severity filter (for monitor_finding events). Only deliver when the
   * finding severity is >= the lowest value in this array. NULL = all.
   * Stored as TEXT[] (low|medium|high|critical) for flexibility.
   */
  min_severity    TEXT,
  /** Optional pack filter (empty = all). */
  pack_slugs      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_channels_enabled ON notification_channels (enabled);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id      UUID REFERENCES notification_channels(id) ON DELETE SET NULL,
  channel_name    TEXT,                                    -- snapshot for forensics
  channel_kind    notification_channel_kind_t,
  event_kind      notification_event_kind_t NOT NULL,
  /**
   * Stable dedup key per event source:
   *   monitor_finding        → 'finding:<uuid>'
   *   red_flag_escalation    → 'audit:<bigint>'
   *   kill_switch_engaged    → 'killswitch:engaged:<iso-ts>'
   *   kill_switch_disengaged → 'killswitch:disengaged:<iso-ts>'
   *   scan_failed            → 'scanrun:<uuid>'
   */
  event_key       TEXT NOT NULL,
  status          notification_delivery_status_t NOT NULL,
  http_status     INTEGER,
  response_excerpt TEXT,
  error           TEXT,
  payload_preview JSONB,
  delivered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_event  ON notification_deliveries (event_key);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_recent ON notification_deliveries (delivered_at DESC);
