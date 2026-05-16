/**
 * Tenant resolution + helpers.
 *
 * Every authenticated request resolves a `tenant_id` BEFORE any domain
 * write. Sources of tenant context, in priority order:
 *
 *   1. `users.tenant_id` (set at signup, immutable thereafter
 *      without an admin tenant-move)
 *   2. Default tenant (`is_default = true`) for pre-migration callers
 *
 * Server actions and API handlers call `requireTenantContext()` which
 * returns the tenant id + slug for the current session, or fails closed
 * if no tenant can be resolved.
 */

import 'server-only';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth/auth';

export interface TenantRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  deployment_kind: string;
  settings: Record<string, unknown>;
  is_active: boolean;
  is_default: boolean;
  created_at: Date;
}

// Short cache for getDefault — every verify call hits it.
let defaultTenantCache: { id: string; slug: string; fetchedAt: number } | null = null;
const DEFAULT_CACHE_TTL_MS = 60_000;

export async function getDefaultTenant(): Promise<{ id: string; slug: string }> {
  const now = Date.now();
  if (defaultTenantCache && now - defaultTenantCache.fetchedAt < DEFAULT_CACHE_TTL_MS) {
    return defaultTenantCache;
  }
  const r = await query<{ id: string; slug: string }>(
    `SELECT id, slug FROM tenants WHERE is_default = true AND is_active = true LIMIT 1`,
  );
  const row = r.rows[0];
  if (!row) {
    throw new Error(
      'No default tenant found. Run migration 008 + ensure exactly one tenant has is_default = true.',
    );
  }
  defaultTenantCache = { id: row.id, slug: row.slug, fetchedAt: now };
  return defaultTenantCache;
}

/** Look up the tenant a user belongs to (defaults to the default tenant). */
export async function getTenantForUser(userId: string): Promise<{ id: string; slug: string }> {
  const r = await query<{ id: string; slug: string }>(
    `SELECT t.id, t.slug
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
      WHERE u.id = $1`,
    [userId],
  );
  if (r.rows[0]) return r.rows[0];
  return getDefaultTenant();
}

/**
 * Resolve the current request's tenant. Server actions + admin API
 * handlers call this once at the top.
 */
export async function requireTenantContext(): Promise<
  | { ok: true; tenant: { id: string; slug: string } }
  | { ok: false; reason: 'unauthenticated' | 'no_tenant' }
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, reason: 'unauthenticated' };
  try {
    const t = await getTenantForUser(session.user.id);
    return { ok: true, tenant: t };
  } catch (err) {
    logger.error({ err, userId: session.user.id }, 'tenant resolution failed');
    return { ok: false, reason: 'no_tenant' };
  }
}

/**
 * For service paths (verify API called via API key, cron, public chat)
 * the tenant comes from a different source:
 *   - API key path → `api_keys.tenant_id`
 *   - Cron path    → default tenant (cron is global by design)
 *   - Public chat  → default tenant (unauth verifier writes against it)
 */
export async function tenantForServiceCall(opts: {
  apiKeyTenantId?: string | null;
}): Promise<{ id: string; slug: string }> {
  if (opts.apiKeyTenantId) {
    const r = await query<{ id: string; slug: string }>(
      `SELECT id, slug FROM tenants WHERE id = $1`,
      [opts.apiKeyTenantId],
    );
    if (r.rows[0]) return r.rows[0];
  }
  return getDefaultTenant();
}

// ============================================================
// Admin operations
// ============================================================

export async function listTenants(): Promise<TenantRow[]> {
  const r = await query<TenantRow>(
    `SELECT id, slug, name, description, deployment_kind, settings,
            is_active, is_default, created_at
       FROM tenants
       ORDER BY is_default DESC, name ASC`,
  );
  return r.rows;
}

export interface CreateTenantInput {
  slug: string;
  name: string;
  description?: string | null;
  deploymentKind?: 'cloud' | 'self-host';
  createdBy: string;
}

export async function createTenant(input: CreateTenantInput): Promise<{ id: string }> {
  const r = await query<{ id: string }>(
    `INSERT INTO tenants (slug, name, description, deployment_kind, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      input.slug.toLowerCase().trim(),
      input.name.trim(),
      input.description ?? null,
      input.deploymentKind ?? 'cloud',
      input.createdBy,
    ],
  );
  // Bust the default cache in case this insert later becomes default.
  defaultTenantCache = null;
  return { id: r.rows[0]!.id };
}

export async function setTenantActive(id: string, isActive: boolean): Promise<void> {
  await query(
    `UPDATE tenants SET is_active = $2, updated_at = NOW() WHERE id = $1`,
    [id, isActive],
  );
  defaultTenantCache = null;
}
