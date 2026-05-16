-- AssuredAI Migration 003 — Admin Dashboard + Site Monitor
--
-- Two feature areas:
--   1. ADMIN ACTIONS — forensic log of every admin mutation (role changes,
--      kill-switch toggles, monitor settings edits, etc.). Separate from the
--      verification `audit_log` so the two surfaces have distinct retention
--      + search semantics.
--
--   2. SITE MONITOR — proactive scanning: register a public site, crawl its
--      pages on a schedule (or on demand), run each page through the
--      verification pipeline, flag findings by severity for human review.
--
-- All statements IDEMPOTENT — safe to re-run.

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE monitor_schedule_t AS ENUM ('manual', 'hourly', 'daily', 'weekly');
  CREATE TYPE monitor_severity_t AS ENUM ('clean', 'low', 'medium', 'high', 'critical');
  CREATE TYPE monitor_finding_status_t AS ENUM ('new', 'acknowledged', 'resolved', 'dismissed');
  CREATE TYPE monitor_run_status_t AS ENUM ('running', 'completed', 'failed', 'cancelled', 'partial');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- ADMIN_ACTIONS — every admin mutation, forever
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id              BIGSERIAL PRIMARY KEY,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id   UUID REFERENCES users(id),
  actor_email     TEXT,                       -- snapshot for forensics if user deleted
  actor_role      user_role_t,
  action          TEXT NOT NULL,              -- e.g. 'user_role_changed', 'kill_switch_engaged'
  target_kind     TEXT,                       -- 'user' | 'monitored_site' | 'finding' | 'kill_switch' | …
  target_id       TEXT,                       -- UUID / int / slug serialized
  before_state    JSONB,
  after_state     JSONB,
  reason          TEXT,
  ip_hint         TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_occurred ON admin_actions (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_actor    ON admin_actions (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action   ON admin_actions (action);

-- ============================================================
-- MONITORED_SITES — proactive scanning targets
-- ============================================================
CREATE TABLE IF NOT EXISTS monitored_sites (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT NOT NULL,
  url                      TEXT NOT NULL UNIQUE,
  scenario                 scenario_t NOT NULL DEFAULT 'healthcare',
  enabled                  BOOLEAN NOT NULL DEFAULT true,
  schedule                 monitor_schedule_t NOT NULL DEFAULT 'manual',

  -- Discovery
  sitemap_url              TEXT,
  include_paths            TEXT[],            -- regex allowlist, null = include all
  exclude_paths            TEXT[],            -- regex denylist
  max_pages                INTEGER NOT NULL DEFAULT 100,
  crawl_concurrency        INTEGER NOT NULL DEFAULT 3,

  -- Cached operational state
  last_scanned_at          TIMESTAMPTZ,
  next_scan_at             TIMESTAMPTZ,
  total_pages_known        INTEGER NOT NULL DEFAULT 0,
  total_findings_open      INTEGER NOT NULL DEFAULT 0,
  last_run_status          monitor_run_status_t,

  -- Provenance
  created_by               UUID REFERENCES users(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitored_sites_enabled  ON monitored_sites (enabled, next_scan_at);
CREATE INDEX IF NOT EXISTS idx_monitored_sites_schedule ON monitored_sites (schedule)
  WHERE enabled = true;

-- ============================================================
-- MONITORED_PAGES — pages discovered on each site
-- ============================================================
CREATE TABLE IF NOT EXISTS monitored_pages (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id                  UUID NOT NULL REFERENCES monitored_sites(id) ON DELETE CASCADE,
  url                      TEXT NOT NULL,
  title                    TEXT,
  first_seen_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_scanned_at          TIMESTAMPTZ,
  last_content_hash        TEXT,                -- sha256 of cleaned article text
  last_severity            monitor_severity_t,  -- denormalised for fast listing
  UNIQUE (site_id, url)
);

CREATE INDEX IF NOT EXISTS idx_monitored_pages_site         ON monitored_pages (site_id);
CREATE INDEX IF NOT EXISTS idx_monitored_pages_severity     ON monitored_pages (site_id, last_severity);
CREATE INDEX IF NOT EXISTS idx_monitored_pages_last_scanned ON monitored_pages (last_scanned_at);

-- ============================================================
-- MONITOR_FINDINGS — one row per page-scan that produces a flag
-- (clean scans do NOT write a finding row; they just update monitored_pages)
-- ============================================================
CREATE TABLE IF NOT EXISTS monitor_findings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id                  UUID NOT NULL REFERENCES monitored_sites(id) ON DELETE CASCADE,
  page_id                  UUID REFERENCES monitored_pages(id) ON DELETE CASCADE,
  page_url                 TEXT NOT NULL,
  scanned_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  audit_log_id             BIGINT REFERENCES audit_log(id),
  severity                 monitor_severity_t NOT NULL,
  status                   monitor_finding_status_t NOT NULL DEFAULT 'new',
  summary                  TEXT NOT NULL,        -- human-friendly headline
  pii_count                INTEGER NOT NULL DEFAULT 0,
  unsourced_count          INTEGER NOT NULL DEFAULT 0,
  supported_count          INTEGER NOT NULL DEFAULT 0,
  disclaimer_missing       BOOLEAN NOT NULL DEFAULT false,
  red_flag_category        TEXT,
  detail                   JSONB,                -- full verification report
  acknowledged_at          TIMESTAMPTZ,
  acknowledged_by          UUID REFERENCES users(id),
  resolved_at              TIMESTAMPTZ,
  resolved_by              UUID REFERENCES users(id),
  resolution_notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_monitor_findings_site_status     ON monitor_findings (site_id, status);
CREATE INDEX IF NOT EXISTS idx_monitor_findings_scanned         ON monitor_findings (scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitor_findings_severity_status ON monitor_findings (severity, status);
CREATE INDEX IF NOT EXISTS idx_monitor_findings_open_severity   ON monitor_findings (severity)
  WHERE status = 'new';

-- ============================================================
-- MONITOR_SCAN_RUNS — observability for every scan invocation
-- ============================================================
CREATE TABLE IF NOT EXISTS monitor_scan_runs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id                  UUID NOT NULL REFERENCES monitored_sites(id) ON DELETE CASCADE,
  triggered_by_user_id     UUID REFERENCES users(id),
  triggered_kind           TEXT NOT NULL,        -- 'manual' | 'cron' | 'webhook'
  started_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at              TIMESTAMPTZ,
  pages_discovered         INTEGER NOT NULL DEFAULT 0,
  pages_scanned            INTEGER NOT NULL DEFAULT 0,
  pages_skipped_unchanged  INTEGER NOT NULL DEFAULT 0,
  pages_failed             INTEGER NOT NULL DEFAULT 0,
  new_findings             INTEGER NOT NULL DEFAULT 0,
  status                   monitor_run_status_t NOT NULL DEFAULT 'running',
  error                    TEXT
);

CREATE INDEX IF NOT EXISTS idx_monitor_scan_runs_site ON monitor_scan_runs (site_id, started_at DESC);

-- ============================================================
-- DONE
-- ============================================================
