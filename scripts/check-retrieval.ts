import 'dotenv/config';
import { embedOne } from '@/lib/embeddings/provider';
import { query, toVectorLiteral, closePool } from '@/lib/db/client';

async function main() {
  const queries = [
    'Write a 500-word handout for a weight loss patient.',
    'weight loss',
    'losing weight',
    'How can I lose weight safely?',
    'lifestyle changes for healthy weight',
  ];
  for (const q of queries) {
    const emb = await embedOne(q, 'query');
    const r = await query<{ org: string; title: string; sim: number }>(
      `SELECT s.organization AS org, s.title AS title,
              1 - (sc.embedding <=> $1::vector) AS sim
       FROM source_chunks sc
       JOIN sources s ON s.id = sc.source_id
       WHERE s.scenario = 'healthcare' AND s.is_active = true
       ORDER BY sc.embedding <=> $1::vector ASC
       LIMIT 3`,
      [toVectorLiteral(emb)],
    );
    console.log(`\nQuery: ${q.slice(0, 70)}...`);
    for (const row of r.rows) {
      console.log(`  ${row.sim.toFixed(4)}  ${row.org}: ${row.title}`);
    }
  }
  await closePool();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
