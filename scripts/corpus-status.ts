/**
 * CLI: show corpus ingestion status across both scenarios.
 *
 * Usage: pnpm corpus:status
 */

import 'dotenv/config';
import { closePool, query } from '@/lib/db/client';

interface ScenarioRow {
  scenario: string;
  source_count: string;
  active_count: string;
  chunk_count: string;
  last_ingested: Date | null;
}

async function main(): Promise<void> {
  const result = await query<ScenarioRow>(
    `SELECT
       s.scenario,
       COUNT(DISTINCT s.id) AS source_count,
       COUNT(DISTINCT s.id) FILTER (WHERE s.is_active) AS active_count,
       COUNT(c.id) AS chunk_count,
       MAX(s.ingested_at) AS last_ingested
     FROM sources s
     LEFT JOIN source_chunks c ON c.source_id = s.id
     GROUP BY s.scenario
     ORDER BY s.scenario`,
  );

  if (result.rows.length === 0) {
    console.log('No corpus data ingested yet. Run: pnpm corpus:ingest --scenario=healthcare');
    await closePool();
    return;
  }

  console.log('\nCorpus status:');
  console.log('='.repeat(80));
  for (const r of result.rows) {
    console.log(`Scenario: ${r.scenario}`);
    console.log(`  Sources:        ${r.source_count} (active: ${r.active_count})`);
    console.log(`  Chunks:         ${r.chunk_count}`);
    console.log(`  Last ingested:  ${r.last_ingested?.toISOString() ?? 'never'}`);
    console.log('');
  }
  await closePool();
}

main().catch(async (err) => {
  console.error('corpus:status failed:', err);
  await closePool();
  process.exit(1);
});
