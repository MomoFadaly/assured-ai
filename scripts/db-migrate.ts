/**
 * CLI: apply all SQL migrations in packages/db/ to the configured DATABASE_URL.
 *
 * Usage: pnpm db:migrate
 *
 * Runs files in lexicographic order:
 *   schema.sql       → baseline (always first)
 *   002_auth.sql     → next-auth + credentials
 *   003_*.sql        → future migrations
 *
 * Idempotent — every migration uses CREATE EXTENSION/TABLE IF NOT EXISTS
 * and DO-block guards on ALTER statements. Safe to re-run.
 */

import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { closePool, query } from '@/lib/db/client';
import { logger } from '@/lib/logger';

async function main(): Promise<void> {
  const dir = resolve(process.cwd(), 'packages/db');
  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => {
      // schema.sql always first, then numeric prefix order
      if (a === 'schema.sql') return -1;
      if (b === 'schema.sql') return 1;
      return a.localeCompare(b);
    });

  if (files.length === 0) {
    logger.error({ dir }, 'No .sql migrations found');
    process.exit(1);
  }

  for (const file of files) {
    const path = join(dir, file);
    const sql = await readFile(path, 'utf-8');
    logger.info({ file, bytes: sql.length }, 'Applying migration');
    try {
      await query(sql);
      logger.info({ file }, 'Migration applied');
    } catch (err) {
      logger.error({ err, file }, 'Migration failed');
      throw err;
    }
  }

  logger.info({ count: files.length }, 'All migrations applied');
  await closePool();
}

main().catch(async (err) => {
  logger.error({ err }, 'db:migrate failed');
  await closePool();
  process.exit(1);
});
