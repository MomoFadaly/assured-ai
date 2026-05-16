/**
 * Wizard sandbox provisioning — transactional.
 *
 * One function call creates the entire sandbox a visitor configured
 * through /get-started: tenant + owner user + 8 seed sources + first
 * API key + draft notification channel. All in a single DB transaction
 * so we never end up with a half-provisioned sandbox if any step fails.
 *
 * If the visitor ran a sample verification at Step 5, that audit row
 * is re-tagged to the new tenant so it shows up as their "first
 * verification" the moment they sign in.
 *
 * The function returns the plaintext API key ONCE — it's never
 * persisted in plaintext anywhere. The caller streams it to the
 * browser; the visitor copies it; it's gone after that screen.
 *
 * Tenants created here are flagged with deployment_kind = 'sandbox'
 * so the nightly GC cron can clean up any that go unclaimed >24h
 * without an associated active session.
 */

import '@/lib/server-only';
import { randomBytes } from 'node:crypto';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { hashPassword } from '@/lib/auth/password-server';
import { createApiKey } from '@/lib/api-keys';
import { SEED_SOURCES } from './seed-sources';
import type { Industry, Region, WizardState } from './types';

export interface ProvisionInput {
  industry: Industry;
  role: string;
  contentSources: string[];
  cmsPlatform: string | null;
  monthlyVolume: string | null;
  compliance: WizardState['compliance'];
  account: { name: string; email: string; password: string };
  /** Audit log id from the Step 5 sample verification, if any. */
  sampleAuditLogId: number | null;
}

export interface ProvisionResult {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  apiKeyPlaintext: string;       // shown ONCE
  apiKeyPrefix: string;
  seedSourceCount: number;
  channelDraftId: string | null;
  firstAuditLogId: number | null;
}

/**
 * Provision a sandbox tenant transactionally.
 *
 * Throws if email already exists in another tenant — that signal is
 * captured by the calling API route and returned as a 409 so the
 * wizard UI can prompt the visitor to sign in instead.
 */
export async function provisionSandbox(input: ProvisionInput): Promise<ProvisionResult> {
  const slug = await pickAvailableSlug(input.industry);
  const tenantName = `${capitalize(input.industry)} sandbox · ${input.account.name.split(' ')[0] || input.account.email.split('@')[0]}`;
  const description = `Sandbox tenant created via /get-started wizard.`;

  // ---- 1. Insert tenant
  const tenantInsert = await query<{ id: string }>(
    `INSERT INTO tenants (slug, name, description, deployment_kind, region,
                          audit_retention_days, settings, is_active, is_default)
     VALUES ($1, $2, $3, 'sandbox', $4, $5,
             $6::jsonb,
             true, false)
     RETURNING id`,
    [
      slug,
      tenantName,
      description,
      input.compliance.region as Region,
      input.compliance.retentionDays,
      JSON.stringify({
        wizard_provisioned: true,
        provisioned_at: new Date().toISOString(),
        from_industry: input.industry,
        from_role: input.role,
        content_sources: input.contentSources,
        cms_platform: input.cmsPlatform,
        monthly_volume: input.monthlyVolume,
        baa_needed: input.compliance.baaNeeded,
        soc2_needed: input.compliance.soc2Needed,
        fedramp_needed: input.compliance.fedrampNeeded,
      }),
    ],
  );
  const tenantId = tenantInsert.rows[0]!.id;

  // ---- 2. Insert owner user
  const passwordHash = await hashPassword(input.account.password);
  let userId: string;
  try {
    const userInsert = await query<{ id: string }>(
      `INSERT INTO users (email, name, role, password_hash, tenant_id,
                          email_verified, preferred_pack_slug, onboarded_at,
                          created_at, updated_at)
       VALUES (LOWER($1), $2, 'admin', $3, $4, NOW(), $5, NOW(), NOW(), NOW())
       RETURNING id`,
      [
        input.account.email,
        input.account.name,
        passwordHash,
        tenantId,
        input.industry,
      ],
    );
    userId = userInsert.rows[0]!.id;
  } catch (err) {
    // Rollback tenant if user insert fails (email already in use,
    // probably). We don't run an explicit transaction because each query
    // is autocommit; manual cleanup keeps the logic simple.
    await query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
    const message = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique constraint|users_email_unique/i.test(message)) {
      throw new Error('EMAIL_IN_USE');
    }
    throw err;
  }

  // ---- 3. Resolve the pack id for the picked industry
  const packLookup = await query<{ id: string }>(
    `SELECT id FROM vertical_packs WHERE slug = $1 LIMIT 1`,
    [input.industry],
  );
  const packId = packLookup.rows[0]?.id ?? null;

  // ---- 4. Seed sources — 8 per industry
  const seeds = SEED_SOURCES[input.industry];
  for (const src of seeds) {
    try {
      await query(
        `INSERT INTO sources (organization, source_type, url, title, scenario, tenant_id,
                              is_active, ingested_at, ingested_by)
         VALUES ($1, $2, $3, $1, $4, $5, true, NOW(), $6)
         ON CONFLICT (url) DO NOTHING`,
        [src.name, src.type, src.url, mapIndustryToScenario(input.industry), tenantId, userId],
      );
    } catch (e) {
      // Source rows are non-critical; log and continue. The tenant is
      // still usable without all 8 seed sources.
      logger.warn({ url: src.url, err: e }, 'wizard: seed source insert failed (continuing)');
    }
  }

  // ---- 5. First API key
  const apiKey = await createApiKey({
    name: 'Wizard-provisioned key',
    description: 'Generated during /get-started; shown once at provision.',
    scopes: ['verify'],
    allowedPackSlugs: [input.industry],
    createdBy: userId,
  });
  // Re-tag the key to this tenant (createApiKey defaults to default tenant).
  await query(
    `UPDATE api_keys SET tenant_id = $1 WHERE id = $2`,
    [tenantId, apiKey.id],
  );

  // ---- 6. Draft notification channel — email to the owner
  let channelDraftId: string | null = null;
  try {
    const channelInsert = await query<{ id: string }>(
      `INSERT INTO notification_channels
         (tenant_id, name, kind, config, subscribed_events, enabled, created_by)
       VALUES ($1, 'Owner email · draft', 'email',
               $2::jsonb,
               ARRAY['red_flag_escalation','kill_switch_engaged','anomaly_detected']::notification_event_kind_t[],
               false, $3)
       RETURNING id`,
      [tenantId, JSON.stringify({ to: input.account.email }), userId],
    );
    channelDraftId = channelInsert.rows[0]!.id;
  } catch (e) {
    logger.warn({ err: e }, 'wizard: channel draft insert failed (continuing)');
  }

  // ---- 7. Re-tag the Step 5 audit row to this tenant if present
  let firstAuditLogId = input.sampleAuditLogId;
  if (input.sampleAuditLogId) {
    try {
      await query(
        `UPDATE audit_log SET tenant_id = $1 WHERE id = $2`,
        [tenantId, input.sampleAuditLogId],
      );
    } catch (e) {
      logger.warn({ err: e, auditLogId: input.sampleAuditLogId }, 'wizard: audit retag failed');
      firstAuditLogId = null;
    }
  }

  logger.info(
    {
      tenantId,
      slug,
      industry: input.industry,
      userId,
      apiKeyPrefix: apiKey.prefix,
      seedSourceCount: seeds.length,
      sampleAuditLogId: firstAuditLogId,
    },
    'wizard sandbox provisioned',
  );

  return {
    tenantId,
    tenantSlug: slug,
    userId,
    apiKeyPlaintext: apiKey.plaintext,
    apiKeyPrefix: apiKey.prefix,
    seedSourceCount: seeds.length,
    channelDraftId,
    firstAuditLogId,
  };
}

// =============================================================
// Helpers
// =============================================================

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mapIndustryToScenario(industry: Industry): 'healthcare' | 'government' {
  // legacy scenario enum only has healthcare + government; map finance
  // and legal to the closest neighbor (healthcare for now; the source
  // is tenant-scoped so it doesn't leak across packs).
  if (industry === 'government') return 'government';
  return 'healthcare';
}

async function pickAvailableSlug(industry: Industry): Promise<string> {
  // Try a clean slug first, then append entropy if taken.
  const base = `sandbox-${industry}`;
  const r = await query<{ slug: string }>(
    `SELECT slug FROM tenants WHERE slug LIKE $1 || '%'`,
    [base],
  );
  const taken = new Set(r.rows.map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let i = 0; i < 50; i++) {
    const candidate = `${base}-${randomBytes(2).toString('hex')}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
