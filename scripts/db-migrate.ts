/**
 * CLI: apply schema.sql to the configured DATABASE_URL.
 *
 * Usage: pnpm db:migrate
 *
 * Idempotent — schema uses CREATE EXTENSION/TABLE IF NOT EXISTS.
 */

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { closePool, query } from '@/lib/db/client';
import { logger } from '@/lib/logger';

async function main(): Promise<void> {
  const schemaPath = resolve(process.cwd(), 'packages/db/schema.sql');
  const sql = await readFile(schemaPath, 'utf-8');
  logger.info({ path: schemaPath, bytes: sql.length }, 'Applying schema');

  // Postgres can take the full schema as a single multi-statement string.
  await query(sql);

  logger.info({}, 'Schema applied');
  await closePool();
}

main().catch(async (err) => {
  logger.error({ err }, 'db:migrate failed');
  await closePool();
  process.exit(1);
});
