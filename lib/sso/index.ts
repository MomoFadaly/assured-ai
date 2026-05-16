/**
 * SSO/SAML — per-tenant config CRUD.
 *
 * Phase 3A ships the config surface (storage + admin UI). The
 * back-end authentication flow (IdP-initiated SAML, JIT
 * provisioning, attribute mapping) lands incrementally — wiring
 * NextAuth to consume `sso_configs` happens behind the same admin UI
 * with no schema change.
 *
 * Until that's live, `enabled = false` rows still live in the DB so
 * Enterprise prospects can stage their IdP metadata ahead of cutover.
 */

import '@/lib/server-only';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';

export interface SsoConfigRow {
  id: string;
  tenant_id: string;
  idp_entity_id: string;
  idp_sso_url: string;
  idp_slo_url: string | null;
  idp_x509_cert: string;
  attribute_map: Record<string, string>;
  jit_provisioning: boolean;
  enforce_sso: boolean;
  default_role: 'admin' | 'auditor' | 'operator' | 'customer';
  enabled: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function getSsoConfig(tenantId: string): Promise<SsoConfigRow | null> {
  const r = await query<SsoConfigRow>(
    `SELECT id, tenant_id, idp_entity_id, idp_sso_url, idp_slo_url, idp_x509_cert,
            attribute_map, jit_provisioning, enforce_sso, default_role, enabled,
            created_by, created_at, updated_at
       FROM sso_configs
      WHERE tenant_id = $1
      LIMIT 1`,
    [tenantId],
  );
  return r.rows[0] ?? null;
}

export interface UpsertSsoInput {
  tenantId: string;
  idp_entity_id: string;
  idp_sso_url: string;
  idp_slo_url?: string | null;
  idp_x509_cert: string;
  attribute_map?: Record<string, string>;
  jit_provisioning?: boolean;
  enforce_sso?: boolean;
  default_role?: 'admin' | 'auditor' | 'operator' | 'customer';
  enabled?: boolean;
  createdBy: string;
}

export async function upsertSsoConfig(input: UpsertSsoInput): Promise<SsoConfigRow> {
  const r = await query<SsoConfigRow>(
    `INSERT INTO sso_configs
       (tenant_id, idp_entity_id, idp_sso_url, idp_slo_url, idp_x509_cert,
        attribute_map, jit_provisioning, enforce_sso, default_role, enabled, created_by)
     VALUES ($1, $2, $3, $4, $5,
             COALESCE($6, '{}'::jsonb),
             COALESCE($7, true),
             COALESCE($8, false),
             COALESCE($9, 'customer'),
             COALESCE($10, false),
             $11)
     ON CONFLICT (tenant_id) DO UPDATE
       SET idp_entity_id    = EXCLUDED.idp_entity_id,
           idp_sso_url      = EXCLUDED.idp_sso_url,
           idp_slo_url      = EXCLUDED.idp_slo_url,
           idp_x509_cert    = EXCLUDED.idp_x509_cert,
           attribute_map    = COALESCE(EXCLUDED.attribute_map, sso_configs.attribute_map),
           jit_provisioning = EXCLUDED.jit_provisioning,
           enforce_sso      = EXCLUDED.enforce_sso,
           default_role     = EXCLUDED.default_role,
           enabled          = EXCLUDED.enabled,
           updated_at       = NOW()
     RETURNING id, tenant_id, idp_entity_id, idp_sso_url, idp_slo_url, idp_x509_cert,
               attribute_map, jit_provisioning, enforce_sso, default_role, enabled,
               created_by, created_at, updated_at`,
    [
      input.tenantId,
      input.idp_entity_id.trim(),
      input.idp_sso_url.trim(),
      input.idp_slo_url?.trim() || null,
      input.idp_x509_cert.trim(),
      input.attribute_map ? JSON.stringify(input.attribute_map) : null,
      input.jit_provisioning,
      input.enforce_sso,
      input.default_role,
      input.enabled,
      input.createdBy,
    ],
  );
  const row = r.rows[0]!;
  logger.info({ tenantId: input.tenantId, ssoConfigId: row.id }, 'sso config upserted');
  return row;
}

export async function disableSsoConfig(tenantId: string): Promise<void> {
  await query(
    `UPDATE sso_configs SET enabled = false, enforce_sso = false, updated_at = NOW() WHERE tenant_id = $1`,
    [tenantId],
  );
}

/** Computed values the operator needs to give to their IdP. */
export function spMetadata(): { entity_id: string; acs_url: string; slo_url: string } {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://assuredai.online';
  return {
    entity_id: base + '/api/auth/saml/metadata',
    acs_url:   base + '/api/auth/saml/callback',
    slo_url:   base + '/api/auth/saml/logout',
  };
}
