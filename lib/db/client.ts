/**
 * Postgres connection pool.
 *
 * The pool is module-scoped; one pool per process. Importers should never
 * create their own clients — always go through this module.
 *
 * pgvector embeddings are passed as JSON arrays and converted to vector
 * literals in SQL. See `toVectorLiteral` below.
 */

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { getConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool === null) {
    const config = getConfig();
    _pool = new Pool({
      connectionString: config.DATABASE_URL,
      // Reasonable defaults for serverless and self-host alike.
      // Neon serverless cold-start can exceed 10s; bumped to 30s to absorb
      // first-connect latency without breaking app startup.
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 30_000,
    });

    _pool.on('error', (err) => {
      logger.error({ err }, 'Postgres pool error');
    });
  }
  return _pool;
}

/**
 * Execute a parameterized query.
 *
 * Always parameterize. Never interpolate into the SQL string.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = performance.now();
  try {
    const result = await pool.query<T>(text, params);
    const elapsed = Math.round(performance.now() - start);
    if (elapsed > 1000) {
      logger.warn({ elapsed_ms: elapsed, text: text.slice(0, 80) }, 'slow query');
    }
    return result;
  } catch (err) {
    logger.error(
      { err, text: text.slice(0, 200), params_count: params?.length ?? 0 },
      'query failed',
    );
    throw err;
  }
}

/**
 * Run a function inside a transaction. Commits on resolve, rolls back on throw.
 */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Convert a number[] embedding to a pgvector literal.
 *
 * pgvector accepts the textual form `[1.0,2.0,3.0]`. We do not use the
 * pgvector npm bindings because pg-native dependencies cause issues in
 * serverless environments.
 */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/** Close the pool. For tests and graceful shutdown only. */
export async function closePool(): Promise<void> {
  if (_pool !== null) {
    await _pool.end();
    _pool = null;
  }
}
