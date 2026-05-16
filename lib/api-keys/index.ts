/**
 * API key management — generate, validate, record usage, revoke.
 *
 * Key shape: `ak_<8-hex-prefix>_<32-hex-secret>`
 *   - The prefix is a public identifier (safe to display, log, alert on).
 *     It uniquely indexes a row in `api_keys`.
 *   - The secret is the bearer credential. Stored hashed (SHA-256, hex)
 *     in `api_keys.secret_hash`; plaintext is shown to the operator
 *     ONCE at creation, then irrecoverable.
 *
 * Validation is constant-time (`timingSafeEqual`) to defeat hash-extension
 * timing attacks on the secret comparison.
 *
 * Why SHA-256 instead of bcrypt for the secret? The key entropy is 128
 * bits (32 hex chars from a CSPRNG), so the brute-force cost of recovering
 * the secret from the hash is computationally infeasible regardless of
 * the hash function's work factor. Bcrypt's per-key 250ms slowdown would
 * be wasted on every verify call. We trade KDF-level brute-force defense
 * for sub-ms validation latency.
 */

import '@/lib/server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';

export type ApiKeyScope = 'verify' | 'monitor:trigger' | 'monitor:read';

export interface ApiKeyRow {
  id: string;
  prefix: string;
  secret_hash: string;
  name: string;
  description: string | null;
  scopes: ApiKeyScope[];
  allowed_pack_slugs: string[];
  created_by: string | null;
  created_at: Date;
  last_used_at: Date | null;
  use_count: number;
  revoked_at: Date | null;
  expires_at: Date | null;
}

export interface ApiKeyListRow {
  id: string;
  prefix: string;
  name: string;
  description: string | null;
  scopes: ApiKeyScope[];
  allowed_pack_slugs: string[];
  created_by: string | null;
  created_by_email: string | null;
  created_at: Date;
  last_used_at: Date | null;
  use_count: number;
  revoked_at: Date | null;
  expires_at: Date | null;
}

export interface GeneratedKey {
  /** Full plaintext key — `ak_<prefix>_<secret>`. Shown to the operator once. */
  plaintext: string;
  prefix: string;
  id: string;
}

const PREFIX_HEX_BYTES = 4; // 8 hex chars
const SECRET_HEX_BYTES = 16; // 32 hex chars

export function generatePlaintext(): { prefix: string; secret: string; plaintext: string } {
  const prefix = `ak_${randomBytes(PREFIX_HEX_BYTES).toString('hex')}`;
  const secret = randomBytes(SECRET_HEX_BYTES).toString('hex');
  return { prefix, secret, plaintext: `${prefix}_${secret}` };
}

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export interface CreateKeyInput {
  name: string;
  description?: string | null;
  scopes?: ApiKeyScope[];
  allowedPackSlugs?: string[];
  expiresAt?: Date | null;
  createdBy: string;
}

export async function createApiKey(input: CreateKeyInput): Promise<GeneratedKey> {
  const { prefix, secret, plaintext } = generatePlaintext();
  const secretHash = hashSecret(secret);
  const r = await query<{ id: string }>(
    `INSERT INTO api_keys
       (prefix, secret_hash, name, description, scopes, allowed_pack_slugs,
        created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5::TEXT[], $6::TEXT[], $7, $8)
     RETURNING id`,
    [
      prefix,
      secretHash,
      input.name,
      input.description ?? null,
      input.scopes ?? ['verify'],
      input.allowedPackSlugs ?? [],
      input.createdBy,
      input.expiresAt ?? null,
    ],
  );
  return { plaintext, prefix, id: r.rows[0]!.id };
}

export interface ValidatedKey {
  id: string;
  prefix: string;
  scopes: ApiKeyScope[];
  allowedPackSlugs: string[];
}

export type ValidationResult =
  | { ok: true; key: ValidatedKey }
  | { ok: false; reason: 'malformed' | 'unknown' | 'revoked' | 'expired' | 'bad_secret' };

/**
 * Parse a bearer header and validate against the DB. Constant-time
 * secret comparison. Increments use counters as a side effect on success.
 */
export async function validateKey(authHeader: string | null): Promise<ValidationResult> {
  if (!authHeader) return { ok: false, reason: 'malformed' };
  const m = /^Bearer\s+(ak_[a-f0-9]{8})_([a-f0-9]{32})$/i.exec(authHeader.trim());
  if (!m) return { ok: false, reason: 'malformed' };
  const prefix = m[1]!.toLowerCase();
  const secret = m[2]!.toLowerCase();

  const r = await query<{
    id: string;
    secret_hash: string;
    scopes: ApiKeyScope[];
    allowed_pack_slugs: string[];
    revoked_at: Date | null;
    expires_at: Date | null;
  }>(
    `SELECT id, secret_hash, scopes, allowed_pack_slugs, revoked_at, expires_at
       FROM api_keys WHERE prefix = $1 LIMIT 1`,
    [prefix],
  );
  const row = r.rows[0];
  if (!row) return { ok: false, reason: 'unknown' };
  if (row.revoked_at) return { ok: false, reason: 'revoked' };
  if (row.expires_at && row.expires_at.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  // Constant-time hash compare.
  const got = Buffer.from(hashSecret(secret), 'hex');
  const want = Buffer.from(row.secret_hash, 'hex');
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    return { ok: false, reason: 'bad_secret' };
  }

  // Fire-and-forget usage bump (don't block the verify request on it).
  void recordUsage(row.id).catch((err) =>
    logger.warn({ err, keyId: row.id }, 'api_keys: recordUsage failed'),
  );

  return {
    ok: true,
    key: {
      id: row.id,
      prefix,
      scopes: row.scopes,
      allowedPackSlugs: row.allowed_pack_slugs,
    },
  };
}

async function recordUsage(id: string): Promise<void> {
  await query(
    `UPDATE api_keys SET use_count = use_count + 1, last_used_at = NOW() WHERE id = $1`,
    [id],
  );
}

export async function listApiKeys(): Promise<ApiKeyListRow[]> {
  const r = await query<ApiKeyListRow>(
    `SELECT k.id, k.prefix, k.name, k.description, k.scopes,
            k.allowed_pack_slugs, k.created_by,
            u.email AS created_by_email,
            k.created_at, k.last_used_at, k.use_count,
            k.revoked_at, k.expires_at
       FROM api_keys k
       LEFT JOIN users u ON u.id = k.created_by
       ORDER BY (k.revoked_at IS NULL) DESC, k.created_at DESC`,
  );
  return r.rows;
}

export async function revokeApiKey(opts: {
  id: string;
  revokedBy: string;
  reason?: string | null;
}): Promise<void> {
  await query(
    `UPDATE api_keys
        SET revoked_at = NOW(),
            revoked_by = $2,
            revoke_reason = $3
      WHERE id = $1 AND revoked_at IS NULL`,
    [opts.id, opts.revokedBy, opts.reason ?? null],
  );
}

export function keyHasScope(key: ValidatedKey, required: ApiKeyScope): boolean {
  return key.scopes.includes(required);
}

export function keyAllowsPack(key: ValidatedKey, packSlug: string): boolean {
  if (key.allowedPackSlugs.length === 0) return true; // unrestricted
  return key.allowedPackSlugs.includes(packSlug);
}
