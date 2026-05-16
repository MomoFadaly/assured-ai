-- AssuredAI Migration 008 — Multi-tenancy
--
-- Until now AssuredAI has been single-tenant (self-host or one SaaS
-- workspace). For the cloud-managed deployment shape — multiple
-- regulated customers sharing infrastructure — every domain table
-- needs a tenant_id, and every authenticated user needs to belong to
-- a tenant.
--
-- Strategy:
--   1. Create `tenants` table.
--   2. Insert a "Default" tenant. All existing rows backfill to its id.
--   3. Add `tenant_id UUID` column to every domain table (additive,
--      nullable, then NOT NULL after backfill).
--   4. Add `users.tenant_id` so sign-ups inherit a tenant.
--   5. Reads in app code thread `tenant_id` through every query;
--      writes always include it. See lib/tenants.
--
-- The hash chain on `audit_log` is unaffected — `tenant_id` is NOT in
-- the canonical hash input. Chain continuity is preserved across the
-- migration. Tenants are a routing concern, not a tamper-evidence one.
--
-- Idempotent.

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  /**
   * Deployment shape — informational only; downstream code keys off
   * `slug` and `id`. Useful for the admin UI to render badges.
   */
  deployment_kind TEXT NOT NULL DEFAULT 'cloud',   -- 'cloud' | 'self-host'
  /**
   * Optional per-tenant overrides for runtime config. Tunable knobs
   * (similarity threshold, retention, billing email) live here so
   * different customers can have different profiles without separate
   * deployments. Empty `{}` = inherit system defaults.
   */
  settings        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  /** Default tenant for legacy + first-signup paths. */
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_one_default ON tenants (is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants (is_active);

-- Seed the default tenant if none exists.
INSERT INTO tenants (slug, name, description, deployment_kind, is_default, is_active)
SELECT 'default', 'Default workspace', 'Initial AssuredAI workspace — all pre-migration data lives here.', 'cloud', true, true
WHERE NOT EXISTS (SELECT 1 FROM tenants);

-- ============================================================
-- Add tenant_id to every domain table.
-- All starts nullable; backfilled below; then ALTER ... SET NOT NULL.
-- ============================================================
ALTER TABLE users               ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE sources             ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE source_chunks       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE audit_log           ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE escalations         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE feedback_votes      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE redaction_rules     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE wp_drafts           ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE voice_profiles      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE contact_leads       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE monitored_sites     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE monitored_pages     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE monitor_findings    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE monitor_scan_runs   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE admin_actions       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE api_keys            ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE notification_channels ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE notification_deliveries ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE usage_events        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE vertical_packs      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- ============================================================
-- BACKFILL — every existing row → default tenant
-- ============================================================
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  SELECT id INTO default_tenant_id FROM tenants WHERE is_default = true LIMIT 1;
  IF default_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No default tenant found; aborting backfill.';
  END IF;

  UPDATE users               SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE sources             SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE source_chunks       SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE audit_log           SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE escalations         SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE feedback_votes      SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE redaction_rules     SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE wp_drafts           SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE voice_profiles      SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE contact_leads       SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE monitored_sites     SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE monitored_pages     SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE monitor_findings    SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE monitor_scan_runs   SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE admin_actions       SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE api_keys            SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE notification_channels SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE notification_deliveries SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE usage_events        SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  -- Vertical packs: built-in packs stay tenant-NULL = available to ALL tenants.
  -- Custom packs (is_built_in = false) get the default tenant.
  UPDATE vertical_packs      SET tenant_id = default_tenant_id WHERE tenant_id IS NULL AND is_built_in = false;
END $$;

-- ============================================================
-- INDEXES — tenant-prefixed for typical filter patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_occurred       ON audit_log (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_sources_tenant_active           ON sources (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_source_chunks_tenant            ON source_chunks (tenant_id);
CREATE INDEX IF NOT EXISTS idx_monitored_sites_tenant          ON monitored_sites (tenant_id, enabled);
CREATE INDEX IF NOT EXISTS idx_monitor_findings_tenant_status  ON monitor_findings (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_active          ON api_keys (tenant_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_channels_tenant    ON notification_channels (tenant_id, enabled);
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_occurred    ON usage_events (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_tenant                    ON users (tenant_id);

-- ============================================================
-- NOTE: not yet promoting to NOT NULL. After a green deploy + 24h of
-- production with these defaults populated, a follow-up migration can
-- run `ALTER ... SET NOT NULL` on each. Keeping nullable here lets
-- pre-tenant-aware code paths still write (with NULL) during the
-- rolling-deploy transition window.
-- ============================================================
