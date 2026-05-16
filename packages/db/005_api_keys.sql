-- AssuredAI Migration 005 — API keys
--
-- Programmatic credentials for the WordPress plugin, Chrome extension,
-- CI integrations, and any partner SaaS that calls /api/verify on
-- behalf of an end-user system.
--
-- Each key is `ak_<8-hex-prefix>_<32-hex-secret>`. We store:
--   - the visible prefix (for lookup + display)
--   - a sha256 hash of the secret (constant-time compared on validation)
-- The plaintext secret is shown to the operator ONCE at creation and
-- never persisted. Lose it → rotate.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix          TEXT NOT NULL UNIQUE,          -- ak_<8-hex>, indexed for fast lookup
  secret_hash     TEXT NOT NULL,                 -- sha256(plaintext secret), hex
  name            TEXT NOT NULL,                 -- operator-supplied label
  description     TEXT,
  /**
   * Scopes the key grants. Stored as TEXT[] so the index is straightforward.
   * Initial vocabulary:
   *   - 'verify'            POST /api/verify, POST /api/suggest-fix
   *   - 'monitor:trigger'   POST /api/admin/monitor/sites/[id]/scan
   *   - 'monitor:read'      GET admin monitor APIs (sites, findings)
   */
  scopes          TEXT[] NOT NULL DEFAULT ARRAY['verify']::TEXT[],
  /** Pack restrictions — empty array = all packs. */
  allowed_pack_slugs TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ,
  use_count       BIGINT NOT NULL DEFAULT 0,
  revoked_at      TIMESTAMPTZ,
  revoked_by      UUID REFERENCES users(id),
  revoke_reason   TEXT,
  expires_at      TIMESTAMPTZ                    -- NULL = no expiry
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix      ON api_keys (prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active      ON api_keys (revoked_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used   ON api_keys (last_used_at DESC NULLS LAST);
