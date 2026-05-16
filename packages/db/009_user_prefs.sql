-- AssuredAI Migration 009 — User preferences & onboarding state
--
-- Tracks per-user UX state needed by the /welcome onboarding wizard:
--   - `preferred_pack_slug` — the vertical pack the user picked during
--     onboarding. Used to pre-select scenario in /chat, default API key
--     pack, and tailor /demo links. Falls back to NULL → no pre-select.
--   - `onboarded_at` — the timestamp the user completed onboarding. NULL
--     means /welcome has never been completed; proxy / sign-in flow
--     redirects new users here.
--   - `invited_by` — UUID of the user who invited them (for tracking
--     teammate-invite flows from /welcome and admin).
--
-- All additive, all idempotent. No backfill required — existing users
-- get NULL onboarded_at and the next sign-in pushes them through the
-- wizard. (Operators already-bootstrapped via ADMIN_EMAILS are
-- considered already onboarded — set in the bootstrap script.)

ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_pack_slug TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at        TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by          UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_users_onboarded_at ON users (onboarded_at);

-- One-time backfill: anyone with admin / operator / auditor role is
-- platform staff and shouldn't be bounced through the customer
-- onboarding wizard on their next sign-in. New signups land at
-- customer role and get walked through /welcome the first time.
UPDATE users
   SET onboarded_at = COALESCE(onboarded_at, created_at, NOW())
 WHERE role IN ('admin', 'operator', 'auditor')
   AND onboarded_at IS NULL;

-- ============================================================
-- TEAMMATE INVITES — single-use, expiring, tied to inviter + tenant
-- ============================================================
--
-- Sent from the /welcome wizard or admin → 'Invite teammate' panel.
-- A row is created when the invite email goes out; consumed and
-- deleted when the invitee completes signup. Expires after 14 days.

CREATE TABLE IF NOT EXISTS teammate_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            user_role_t NOT NULL DEFAULT 'operator',
  /** Hashed token (SHA-256). Plaintext goes out in the email only. */
  token_hash      TEXT NOT NULL UNIQUE,
  invited_by      UUID NOT NULL REFERENCES users(id),
  expires_at      TIMESTAMPTZ NOT NULL,
  accepted_at     TIMESTAMPTZ,
  accepted_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teammate_invites_email_lower
  ON teammate_invites (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_teammate_invites_tenant
  ON teammate_invites (tenant_id);
CREATE INDEX IF NOT EXISTS idx_teammate_invites_pending
  ON teammate_invites (expires_at) WHERE accepted_at IS NULL;
