/**
 * CLI: drop and recreate all AssuredAI tables.
 *
 * DESTRUCTIVE — wipes the audit log. Only use in dev / before initial
 * production deployment. Disabled if NODE_ENV === 'production'.
 *
 * Usage:
 *   pnpm db:reset --confirm
 */

import 'dotenv/config';
import { closePool, query } from '@/lib/db/client';
import { logger } from '@/lib/logger';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run db:reset with NODE_ENV=production. Aborting.');
    process.exit(2);
  }
  if (!process.argv.includes('--confirm')) {
    console.error('db:reset is destructive. Pass --confirm to proceed.');
    console.error('  pnpm db:reset --confirm');
    process.exit(1);
  }

  const TABLES = [
    'feedback_votes',
    'escalations',
    'audit_log',
    'source_chunks',
    'sources',
    'redaction_rules',
    'kill_switch_state',
    'users',
  ];

  for (const table of TABLES) {
    await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    logger.info({ table }, 'dropped');
  }
  await query(`DROP TYPE IF EXISTS scenario_t CASCADE`);
  await query(`DROP TYPE IF EXISTS outcome_t CASCADE`);
  await query(`DROP TYPE IF EXISTS user_role_t CASCADE`);
  await query(`DROP TYPE IF EXISTS rule_type_t CASCADE`);
  await query(`DROP TYPE IF EXISTS escalation_severity_t CASCADE`);
  await query(`DROP FUNCTION IF EXISTS audit_log_hash_chain() CASCADE`);

  console.log('All AssuredAI tables and types dropped. Run pnpm db:migrate to recreate.');
  await closePool();
}

main().catch(async (err) => {
  logger.error({ err }, 'db:reset failed');
  await closePool();
  process.exit(1);
});
