-- AssuredAI Migration 011 — Enterprise hardening
--
-- Schema for Phase 3:
--   SSO/SAML       sso_configs        per-tenant IdP metadata
--   Cold storage   audit_archives     refs to exported audit batches
--   Anomalies      anomaly_events     detected unusual patterns
--   Residency      tenants.region     per-tenant region pin
--   Retention      tenants.audit_retention_days
--                  + audit_log.archived_at
--   Evidence       evidence_exports   audit trail of SOC 2 evidence pulls
--
-- All additive, all idempotent. NO destructive change to audit_log —
-- retention is enforced at archive time (rows are copied to cold
-- storage, original row marked archived_at, never DELETED). The
-- hash chain stays unbroken.

-- ============================================================
-- TENANT EXTENSIONS — residency + retention
-- ============================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'us-east-1';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS audit_retention_days INTEGER NOT NULL DEFAULT 2555; -- 7y HIPAA
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS allowed_regions TEXT[] NOT NULL DEFAULT ARRAY['us-east-1']::TEXT[];

COMMENT ON COLUMN tenants.region IS
  'Region the tenant is currently pinned to. Routing layer reads this to select the regional DB pool. Stub today; real cross-region routing ships with the Neon EU + APAC clusters.';
COMMENT ON COLUMN tenants.audit_retention_days IS
  'How long audit_log rows stay in hot storage before being archived to cold storage. Default 7 years (HIPAA). Set to NULL to disable archive.';

-- ============================================================
-- SSO / SAML — per-tenant
-- ============================================================
CREATE TABLE IF NOT EXISTS sso_configs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  /** SAML 2.0 identity provider metadata. */
  idp_entity_id      TEXT NOT NULL,
  idp_sso_url        TEXT NOT NULL,
  idp_slo_url        TEXT,
  idp_x509_cert      TEXT NOT NULL,
  /** Attribute mapping: SAML response → user fields. JSON map keyed by AssuredAI attribute. */
  attribute_map      JSONB NOT NULL DEFAULT '{
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "name":  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    "role":  "https://assuredai.online/saml/role"
  }'::jsonb,
  /** Auto-create users on first SAML login. */
  jit_provisioning   BOOLEAN NOT NULL DEFAULT true,
  /** Force SAML for tenant — disables password + Google fall-back. */
  enforce_sso        BOOLEAN NOT NULL DEFAULT false,
  /** When set, sets the default role for JIT-provisioned users. */
  default_role       user_role_t NOT NULL DEFAULT 'customer',
  enabled            BOOLEAN NOT NULL DEFAULT false,
  created_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sso_configs_one_per_tenant ON sso_configs (tenant_id);

-- ============================================================
-- AUDIT COLD STORAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_archives (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID REFERENCES tenants(id) ON DELETE SET NULL,
  /** ID range archived in this batch (inclusive). */
  audit_id_first       BIGINT NOT NULL,
  audit_id_last        BIGINT NOT NULL,
  row_count            BIGINT NOT NULL,
  /** sha256 of the gzipped batch — re-import verification. */
  archive_sha256       TEXT NOT NULL,
  /** Storage location URL (s3://bucket/key or do-spaces://...). */
  storage_url          TEXT NOT NULL,
  storage_kind         TEXT NOT NULL DEFAULT 's3', -- s3 | gcs | spaces | filesystem
  storage_bytes        BIGINT,
  archived_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_by          TEXT NOT NULL DEFAULT 'cron'   -- 'cron' | user email | 'admin'
);

CREATE INDEX IF NOT EXISTS idx_audit_archives_tenant ON audit_archives (tenant_id, archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_archives_range ON audit_archives (audit_id_first, audit_id_last);

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_audit_log_archived ON audit_log (archived_at) WHERE archived_at IS NOT NULL;

-- ============================================================
-- ANOMALY DETECTION
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'anomaly_severity_t') THEN
    CREATE TYPE anomaly_severity_t AS ENUM ('info','warning','critical');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS anomaly_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  /** Stable kind so dedupe + filtering work. */
  kind            TEXT NOT NULL,
  severity        anomaly_severity_t NOT NULL DEFAULT 'warning',
  summary         TEXT NOT NULL,
  detail          JSONB NOT NULL DEFAULT '{}'::jsonb,
  /** Dedupe key — re-detections in the same window collapse into one row. */
  dedupe_key      TEXT NOT NULL,
  /** Window the anomaly was detected in. */
  window_start    TIMESTAMPTZ NOT NULL,
  window_end      TIMESTAMPTZ NOT NULL,
  /** Operator acknowledgement workflow. */
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_anomaly_events_dedupe
  ON anomaly_events (dedupe_key, window_start);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_tenant_severity
  ON anomaly_events (tenant_id, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_open
  ON anomaly_events (created_at DESC) WHERE acknowledged_at IS NULL;

-- Extend the notification event enum so anomalies route through the
-- existing Slack/email/webhook system.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
     WHERE enumlabel = 'anomaly_detected'
       AND enumtypid = 'notification_event_kind_t'::regtype
  ) THEN
    ALTER TYPE notification_event_kind_t ADD VALUE 'anomaly_detected';
  END IF;
END $$;

-- ============================================================
-- SOC 2 EVIDENCE EXPORTS — audit-trail of every pull
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence_exports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  requested_by      UUID NOT NULL REFERENCES users(id),
  /** ISO date strings (inclusive). */
  window_start      DATE NOT NULL,
  window_end        DATE NOT NULL,
  /** Tables included in the export, e.g. {audit_log, admin_actions, usage_events}. */
  included_tables   TEXT[] NOT NULL,
  /** sha256 of the gzipped zip — receiver can re-verify. */
  bundle_sha256     TEXT,
  /** Total bytes of the zip. */
  bundle_bytes      BIGINT,
  /** Storage location (signed URL, S3 key, or 'inline' when streamed). */
  storage_url       TEXT,
  status            TEXT NOT NULL DEFAULT 'pending', -- pending | ready | failed
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_evidence_exports_tenant
  ON evidence_exports (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_exports_status
  ON evidence_exports (status, created_at DESC);
