#!/usr/bin/env node
/**
 * Admin bootstrap — promote any user whose email is listed in
 * `ADMIN_EMAILS` (comma-separated, case-insensitive) to role = 'admin'.
 *
 * Idempotent. Runs as part of `vercel-build` AFTER schema migrations,
 * so the role enum + users table already exist. To revoke admin from
 * someone listed here, remove them from ADMIN_EMAILS and redeploy
 * (this script only PROMOTES — it doesn't demote, to avoid accidental
 * loss of admin if someone fat-fingers the env var).
 *
 * Why env-driven instead of a one-off SQL hack:
 *   - Pattern Neon / Supabase / Vercel use for SaaS deployments
 *   - Survives DB rebuilds — re-promote on every deploy
 *   - Self-host operators set their own ADMIN_EMAILS at deploy time
 *   - Auditable: every promotion writes an `admin_actions` row tagged
 *     with action = 'admin_bootstrap_promoted'
 *
 * Logs go to stdout so they show up in `vercel logs`.
 */

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const { Pool } = pg;

const raw = (process.env.ADMIN_EMAILS ?? '').trim();
if (!raw) {
  console.log('[promote-admins] ADMIN_EMAILS is empty — nothing to do. Skipping.');
  process.exit(0);
}

const emails = raw
  .split(/[,\s]+/)
  .map((e) => e.trim().toLowerCase())
  .filter((e) => /.+@.+\..+/.test(e));

if (emails.length === 0) {
  console.log('[promote-admins] ADMIN_EMAILS had no valid email addresses. Skipping.');
  process.exit(0);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('[promote-admins] DATABASE_URL is required. Aborting.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  max: 2,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 20_000,
});

try {
  // Promote
  const promoteResult = await pool.query(
    `UPDATE users
        SET role = 'admin',
            onboarded_at = COALESCE(onboarded_at, NOW()),
            updated_at = NOW()
      WHERE LOWER(email) = ANY($1::text[])
        AND role != 'admin'
        AND deleted_at IS NULL
      RETURNING id, email`,
    [emails],
  );

  // Lookup the not-yet-signed-up emails so we can warn but not fail.
  const knownResult = await pool.query(
    `SELECT LOWER(email) AS email FROM users WHERE LOWER(email) = ANY($1::text[])`,
    [emails],
  );
  const known = new Set(knownResult.rows.map((r) => r.email));
  const missing = emails.filter((e) => !known.has(e));

  // Forensic audit row for every newly-promoted user.
  for (const row of promoteResult.rows) {
    await pool
      .query(
        `INSERT INTO admin_actions
            (actor_user_id, actor_email, actor_role, action, target_kind, target_id, after_state, reason)
          VALUES (NULL, $1, 'admin', 'admin_bootstrap_promoted', 'user', $2, $3, $4)`,
        [
          'admin-bootstrap@vercel-build',
          row.id,
          JSON.stringify({ role: 'admin', email: row.email }),
          'Promoted by ADMIN_EMAILS env on vercel-build',
        ],
      )
      .catch((err) => {
        // admin_actions table may not exist on very-early bootstraps;
        // never fail the build over an audit miss.
        console.warn('[promote-admins] audit row failed (non-fatal):', err.message);
      });
  }

  console.log(
    `[promote-admins] configured: ${emails.length}, newly promoted: ${promoteResult.rows.length}, ` +
      `already admin: ${known.size - promoteResult.rows.length}, not yet signed up: ${missing.length}`,
  );
  if (promoteResult.rows.length > 0) {
    console.log('[promote-admins] promoted:', promoteResult.rows.map((r) => r.email).join(', '));
  }
  if (missing.length > 0) {
    console.log(
      `[promote-admins] (not yet signed up — will promote on next deploy after they sign up): ${missing.join(', ')}`,
    );
  }
} catch (err) {
  console.error('[promote-admins] failed:', err);
  process.exit(1);
} finally {
  await pool.end();
}
