/**
 * CLI: ingest a scenario's source corpus into Postgres.
 *
 * Usage:
 *   pnpm corpus:ingest --scenario=healthcare
 *   pnpm corpus:ingest --scenario=healthcare --limit=5    # cost-minimized demo
 *   pnpm corpus:ingest --scenario=government
 *   pnpm corpus:ingest --scenario=all
 */

import 'dotenv/config';
import { ingestSources } from '@/lib/corpus/ingest';
import { closePool } from '@/lib/db/client';
import { HEALTHCARE_SOURCES } from '@/data/sources.healthcare';
import { GOVERNMENT_SOURCES } from '@/data/sources.government';
import { logger } from '@/lib/logger';

function parseArgs(): {
  scenario: 'healthcare' | 'government' | 'all';
  limit: number | null;
} {
  const args = process.argv.slice(2);
  const scenarioArg = args.find((a) => a.startsWith('--scenario='));
  if (!scenarioArg) {
    console.error('Usage: pnpm corpus:ingest --scenario=healthcare|government|all [--limit=N]');
    process.exit(1);
  }
  const value = scenarioArg.split('=')[1];
  if (value !== 'healthcare' && value !== 'government' && value !== 'all') {
    console.error(`Invalid scenario: ${value}. Must be healthcare|government|all`);
    process.exit(1);
  }
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number.parseInt(limitArg.split('=')[1] ?? '', 10) : null;
  if (limitArg && (!Number.isFinite(limit) || (limit as number) < 1)) {
    console.error(`Invalid --limit: ${limitArg}`);
    process.exit(1);
  }
  return { scenario: value, limit };
}

async function main(): Promise<void> {
  const { scenario, limit } = parseArgs();
  let sources =
    scenario === 'healthcare'
      ? HEALTHCARE_SOURCES
      : scenario === 'government'
        ? GOVERNMENT_SOURCES
        : [...HEALTHCARE_SOURCES, ...GOVERNMENT_SOURCES];
  if (limit !== null) sources = sources.slice(0, limit);

  logger.info({ scenario, count: sources.length, limit }, 'Starting ingestion');
  const startedAt = Date.now();
  const summary = await ingestSources(sources);
  const elapsedMs = Date.now() - startedAt;

  logger.info(
    {
      ...summary,
      elapsed_seconds: Math.round(elapsedMs / 1000),
    },
    'Ingestion complete',
  );

  if (summary.errors.length > 0) {
    console.error('\nFailures:');
    for (const e of summary.errors) {
      console.error(`  ${e.url}: ${e.error}`);
    }
  }

  await closePool();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  logger.error({ err }, 'Ingestion CLI failed');
  await closePool();
  process.exit(1);
});
