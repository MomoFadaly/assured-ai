/**
 * Seed-showcase — run every curated showcase verification through the
 * LIVE pipeline so the marketing site has real `audit_log_id`s to link
 * to.
 *
 * Idempotent: each entry is tracked by `slug` in `showcase_verifications`;
 * only re-runs a verification when the source article text has changed
 * (sha256 hash compare). Re-running with no changes is a no-op.
 *
 * Runs in `vercel-build` AFTER migrations + admin-bootstrap so the
 * pipeline is fully wired before we exercise it.
 *
 * Skips silently when ANTHROPIC_API_KEY or VOYAGE_API_KEY is missing
 * (e.g. preview builds without prod secrets). Skips individual entries
 * whose pack hasn't been seeded with sources (fact-check would return
 * all-unsourced; not useful for a showcase) but still creates the row
 * so the marketing page can decide whether to surface it.
 */

import 'dotenv/config';
import { createHash } from 'node:crypto';
import { query, closePool } from '@/lib/db/client';
import { getPackBySlug } from '@/lib/packs/registry';
import { runVerifyLifecycle } from '@/lib/verification/lifecycle';
import { getDefaultTenant } from '@/lib/tenants';
import { SHOWCASE_VERIFICATIONS } from '@/lib/demo/showcase';
import { logger } from '@/lib/logger';

async function main(): Promise<void> {
  const required = ['DATABASE_URL', 'ANTHROPIC_API_KEY', 'VOYAGE_API_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    logger.info({ missing }, '[seed-showcase] skipping — missing env vars');
    return;
  }

  // Idempotent CREATE — avoids a separate migration file just for this.
  await query(`
    CREATE TABLE IF NOT EXISTS showcase_verifications (
      slug              TEXT PRIMARY KEY,
      pack_slug         TEXT NOT NULL,
      article_hash      TEXT NOT NULL,
      audit_log_id      BIGINT REFERENCES audit_log(id),
      title             TEXT NOT NULL,
      blurb             TEXT NOT NULL,
      expected_kind     TEXT NOT NULL,
      tone              TEXT NOT NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_showcase_pack ON showcase_verifications (pack_slug)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_showcase_audit ON showcase_verifications (audit_log_id)`);

  const defaultTenant = await getDefaultTenant();

  let attempted = 0;
  let regenerated = 0;
  let skippedUnchanged = 0;
  let skippedNoPack = 0;
  let failed = 0;

  for (const entry of SHOWCASE_VERIFICATIONS) {
    attempted++;
    const articleHash = createHash('sha256').update(entry.article, 'utf8').digest('hex');

    const existing = await query<{
      article_hash: string;
      audit_log_id: number | null;
    }>(
      `SELECT article_hash, audit_log_id FROM showcase_verifications WHERE slug = $1`,
      [entry.slug],
    );
    const row = existing.rows[0];
    if (row && row.article_hash === articleHash && row.audit_log_id) {
      skippedUnchanged++;
      continue;
    }

    const pack = await getPackBySlug(entry.pack);
    if (!pack) {
      logger.warn({ slug: entry.slug, pack: entry.pack }, '[seed-showcase] pack not in DB');
      skippedNoPack++;
      continue;
    }

    logger.info({ slug: entry.slug, pack: entry.pack }, '[seed-showcase] verifying');
    try {
      const result = await runVerifyLifecycle({
        pack,
        tenant_id: defaultTenant.id,
        input_mode: 'paste',
        article: entry.article,
        user_session_id: `seed-showcase:${entry.slug}`,
      });
      const auditLogId = 'audit_log_id' in result ? result.audit_log_id : null;
      if (!auditLogId) {
        logger.warn({ slug: entry.slug, kind: result.kind }, '[seed-showcase] no audit id');
        failed++;
        continue;
      }
      await query(
        `INSERT INTO showcase_verifications
           (slug, pack_slug, article_hash, audit_log_id, title, blurb, expected_kind, tone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (slug) DO UPDATE
           SET pack_slug = EXCLUDED.pack_slug,
               article_hash = EXCLUDED.article_hash,
               audit_log_id = EXCLUDED.audit_log_id,
               title = EXCLUDED.title,
               blurb = EXCLUDED.blurb,
               expected_kind = EXCLUDED.expected_kind,
               tone = EXCLUDED.tone,
               updated_at = NOW()`,
        [
          entry.slug,
          entry.pack,
          articleHash,
          auditLogId,
          entry.title,
          entry.blurb,
          entry.expectedKind,
          entry.tone,
        ],
      );
      regenerated++;
      logger.info({ slug: entry.slug, auditLogId, kind: result.kind }, '[seed-showcase] persisted');
    } catch (err) {
      logger.error({ err, slug: entry.slug }, '[seed-showcase] verification failed');
      failed++;
    }
  }

  logger.info(
    { attempted, regenerated, skippedUnchanged, skippedNoPack, failed },
    '[seed-showcase] done',
  );
}

main()
  .then(async () => {
    await closePool();
  })
  .catch(async (err) => {
    logger.error({ err }, '[seed-showcase] fatal');
    await closePool();
    process.exit(1);
  });
