-- AssuredAI Migration 002 — Auth.js v5 (NextAuth) Schema
--
-- Adds password-credentials + OAuth (Google) auth on top of the existing
-- `users` table. Pattern matches The Wild Pest's auth schema 1:1, ported
-- from Drizzle to raw SQL. Auth.js's @auth/pg-adapter writes the
-- accounts / sessions / verification_token tables directly; our domain
-- code only touches the extended `users` columns.
--
-- IDEMPOTENT: every statement uses IF NOT EXISTS or its DO-block equivalent.
-- Safe to re-run against an existing DB.

-- ============================================================
-- USER_ROLE_T — extend with 'customer' for self-signup default
-- ============================================================
-- Postgres ENUM values can be added but never removed; this is safe to
-- run multiple times because ADD VALUE IF NOT EXISTS is idempotent.

ALTER TYPE user_role_t ADD VALUE IF NOT EXISTS 'customer';

-- ============================================================
-- USERS — extend with credentials + throttle + profile columns
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- email_verified is the canonical "is this account real" column used by
-- the sign-in path. clerk_id stays for backwards compat but is nullable
-- now that Clerk is no longer the source of truth.
ALTER TABLE users ALTER COLUMN clerk_id DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
-- Re-add the unique constraint on email if it doesn't exist (it's
-- still NOT NULL in practice — set by adapter on first sign-in).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users (locked_until) WHERE locked_until IS NOT NULL;

-- ============================================================
-- ACCOUNTS — Auth.js linked-provider table
-- (column names MUST match @auth/pg-adapter expectations exactly)
-- ============================================================

CREATE TABLE IF NOT EXISTS accounts (
  "userId"              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "type"                TEXT NOT NULL,
  "provider"            TEXT NOT NULL,
  "providerAccountId"   TEXT NOT NULL,
  "refresh_token"       TEXT,
  "access_token"        TEXT,
  "expires_at"          INTEGER,
  "token_type"          TEXT,
  "scope"               TEXT,
  "id_token"            TEXT,
  "session_state"       TEXT,
  PRIMARY KEY ("provider", "providerAccountId")
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts ("userId");

-- ============================================================
-- SESSIONS — Auth.js (used only with database sessions; we use JWT
-- but the adapter still creates the table on first contact)
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  "sessionToken" TEXT PRIMARY KEY,
  "userId"       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "expires"      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions ("userId");

-- ============================================================
-- VERIFICATION_TOKEN — Auth.js single-use tokens for email
-- verification + password reset. We piggyback two flows on the
-- `identifier` prefix:
--   "verify:user@example.com"  — confirm email
--   "reset:user@example.com"   — forgot-password
-- ============================================================

CREATE TABLE IF NOT EXISTS verification_token (
  "identifier" TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "expires"    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

CREATE INDEX IF NOT EXISTS idx_verification_token_expires ON verification_token ("expires");

-- ============================================================
-- DONE
-- ============================================================
-- Verify with:
--   \d users
--   \d accounts
--   \d sessions
--   \d verification_token
