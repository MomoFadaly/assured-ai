-- AssuredAI Schema
-- Postgres 16 + pgvector
-- Run this against a fresh database to bootstrap.

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE scenario_t AS ENUM ('healthcare', 'government');
  CREATE TYPE outcome_t  AS ENUM (
    'answered',
    'i_dont_know',
    'kill_switch',
    'redacted_input_rejected',
    'red_flag_escalation',
    'citation_violation',
    'model_error',
    'source_added',
    'source_deactivated',
    'kill_switch_engaged',
    'kill_switch_disengaged'
  );
  CREATE TYPE user_role_t AS ENUM ('admin', 'auditor', 'operator');
  CREATE TYPE rule_type_t AS ENUM ('presidio_recognizer', 'regex', 'denylist');
  CREATE TYPE escalation_severity_t AS ENUM ('emergency', 'urgent', 'review');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- USERS — Clerk-synced
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id    TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL,
  role        user_role_t NOT NULL DEFAULT 'operator',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SOURCES — the vetted library (mutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS sources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization      TEXT NOT NULL,
  source_type       TEXT NOT NULL,            -- 'government' | 'peer-reviewed' | 'professional-association' | 'client'
  url               TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  publication_date  DATE,
  ingested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingested_by       UUID REFERENCES users(id),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  scenario          scenario_t NOT NULL,
  license_notes     TEXT
);

CREATE INDEX IF NOT EXISTS idx_sources_scenario_active
  ON sources (scenario, is_active);

-- ============================================================
-- SOURCE_CHUNKS — chunked + embedded; 1024-dim (Voyage voyage-3)
-- ============================================================
CREATE TABLE IF NOT EXISTS source_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  content       TEXT NOT NULL,
  content_hash  TEXT NOT NULL,
  embedding     vector(1024) NOT NULL,
  metadata      JSONB,
  UNIQUE (source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON source_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_chunks_content_hash
  ON source_chunks (content_hash);

-- ============================================================
-- KILL SWITCH — single-row config, mutable
-- ============================================================
CREATE TABLE IF NOT EXISTS kill_switch_state (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  is_engaged    BOOLEAN NOT NULL DEFAULT false,
  engaged_at    TIMESTAMPTZ,
  engaged_by    UUID REFERENCES users(id),
  reason        TEXT,
  CONSTRAINT only_one_row CHECK (id = 1)
);

INSERT INTO kill_switch_state (id, is_engaged)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- REDACTION RULES — config
-- ============================================================
CREATE TABLE IF NOT EXISTS redaction_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario    scenario_t NOT NULL,
  rule_type   rule_type_t NOT NULL,
  pattern     TEXT NOT NULL,
  is_enabled  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES users(id)
);

-- ============================================================
-- AUDIT LOG — APPEND-ONLY, HASH-CHAINED
-- This is the most important table in the system.
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id                      BIGSERIAL PRIMARY KEY,
  occurred_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scenario                scenario_t NOT NULL,
  user_session_id         TEXT,
  query_redacted          TEXT NOT NULL,
  response_redacted       TEXT,
  retrieved_chunk_ids     UUID[],
  citations               JSONB,
  -- Full paragraph + sentence verification detail (sentences[], support,
  -- best_match, etc.) used to render the /v/[id] public proof page without
  -- having to re-run the embedding pipeline. NOT part of the hash chain.
  verification_detail     JSONB,
  confidence_score        DOUBLE PRECISION,
  outcome                 outcome_t NOT NULL,
  outcome_reason          TEXT,
  pii_detected_input      BOOLEAN NOT NULL DEFAULT false,
  pii_detected_output     BOOLEAN NOT NULL DEFAULT false,
  red_flag_category       TEXT,
  latency_ms              INTEGER,
  model_used              TEXT,
  prev_hash               TEXT,
  hash                    TEXT NOT NULL
);

-- ============================================================
-- audit_log forward-compatibility — additive columns for tables
-- created before these columns were introduced. CREATE TABLE IF NOT EXISTS
-- only initializes a NEW table; existing tables need explicit ALTER.
-- ============================================================
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS verification_detail JSONB;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_session_id     TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS retrieved_chunk_ids UUID[];
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS pii_detected_input  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS pii_detected_output BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS red_flag_category   TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS model_used          TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_log_occurred_at
  ON audit_log (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_outcome
  ON audit_log (outcome);

-- Tamper-evidence: revoke UPDATE and DELETE from application role
-- (Adjust the role name as appropriate for your environment.)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_role') THEN
    REVOKE UPDATE, DELETE ON audit_log FROM app_role;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- role may not exist yet; that's fine in fresh dev environments
  NULL;
END $$;

-- Hash-chain trigger
CREATE OR REPLACE FUNCTION audit_log_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  last_hash TEXT;
  canonical TEXT;
BEGIN
  SELECT hash INTO last_hash
    FROM audit_log
    ORDER BY id DESC
    LIMIT 1;

  NEW.prev_hash := COALESCE(last_hash, 'genesis');

  -- Canonical serialization for hashing
  canonical :=
       NEW.scenario::text
    || '|' || COALESCE(NEW.query_redacted, '')
    || '|' || COALESCE(NEW.response_redacted, '')
    || '|' || NEW.outcome::text
    || '|' || COALESCE(NEW.outcome_reason, '')
    || '|' || NEW.occurred_at::text
    || '|' || NEW.prev_hash;

  NEW.hash := encode(digest(canonical, 'sha256'), 'hex');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_hash_chain_trigger ON audit_log;
CREATE TRIGGER audit_log_hash_chain_trigger
BEFORE INSERT ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_log_hash_chain();

-- ============================================================
-- FEEDBACK VOTES — helpful/unhelpful + free-text reports
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_votes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id        BIGINT REFERENCES audit_log(id),
  voted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_helpful          BOOLEAN NOT NULL,
  free_text_report    TEXT,
  user_session_id     TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedback_audit_log
  ON feedback_votes (audit_log_id);

-- ============================================================
-- ESCALATIONS — red-flag events for governance review
-- (Audit log also records these, but a separate table makes review faster.)
-- ============================================================
CREATE TABLE IF NOT EXISTS escalations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id        BIGINT REFERENCES audit_log(id),
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category            TEXT NOT NULL,    -- 'cardiac' | 'mental_health_crisis' | 'overdose' | etc.
  severity            escalation_severity_t NOT NULL,
  triggering_phrase   TEXT,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES users(id),
  review_notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_escalations_unreviewed
  ON escalations (occurred_at DESC) WHERE reviewed_at IS NULL;

-- ============================================================
-- WP DRAFTS — mock WordPress draft queue for the publish integration demo
-- ============================================================
CREATE TABLE IF NOT EXISTS wp_drafts (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  audit_log_id    BIGINT REFERENCES audit_log(id),
  scenario        TEXT NOT NULL DEFAULT 'healthcare',
  status          TEXT NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wp_drafts_created
  ON wp_drafts (created_at DESC);

-- ============================================================
-- VOICE PROFILES — brand-voice signatures built from archive samples
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  scenario        TEXT,                          -- healthcare | government | null
  sample_count    INTEGER NOT NULL DEFAULT 0,
  metrics         JSONB NOT NULL,                -- { aggregated: VoiceMetrics, samples: VoiceMetrics[] }
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_profiles_created
  ON voice_profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_profiles_scenario
  ON voice_profiles (scenario);

-- ============================================================
-- CONTACT LEADS — inbound from /api/contact (marketing site)
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_leads (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  org             TEXT,
  role            TEXT,
  segment         TEXT,                          -- publisher | hospital | pharma | gov | other
  message         TEXT,
  ip_hint         TEXT,                          -- coarse fingerprint for dedupe; not PII
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_leads_created
  ON contact_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_leads_email
  ON contact_leads (email);

-- ============================================================
-- DONE
-- ============================================================
-- Verify with:
--   SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto','vector');
--   SELECT table_name FROM information_schema.tables
--     WHERE table_schema='public' ORDER BY table_name;
--   SELECT * FROM kill_switch_state;
