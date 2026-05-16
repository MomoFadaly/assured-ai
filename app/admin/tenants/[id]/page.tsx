/**
 * /admin/tenants/[id] — per-tenant Enterprise settings.
 *
 * Three sections:
 *   - Identity & residency  (region, retention, allowed regions)
 *   - SSO / SAML            (IdP metadata + JIT + enforce toggle)
 *   - Danger zone           (disable tenant)
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Card } from '../../_components/Card';
import { query } from '@/lib/db/client';
import { getSsoConfig, spMetadata } from '@/lib/sso';
import { TenantSettingsForm } from './TenantSettingsForm';
import { SsoConfigForm } from './SsoConfigForm';

export const dynamic = 'force-dynamic';

interface TenantDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  deployment_kind: string;
  region: string;
  audit_retention_days: number;
  allowed_regions: string[];
  is_active: boolean;
  is_default: boolean;
  created_at: Date;
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await query<TenantDetail>(
    `SELECT id, slug, name, description, deployment_kind,
            region, audit_retention_days, allowed_regions,
            is_active, is_default, created_at
       FROM tenants
      WHERE id = $1
      LIMIT 1`,
    [id],
  );
  const tenant = r.rows[0];
  if (!tenant) notFound();

  const sso = await getSsoConfig(tenant.id);
  const sp = spMetadata();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/tenants"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tenants
        </Link>
        <h1 className="mt-3 text-[24px] font-semibold tracking-tight">{tenant.name}</h1>
        <p className="mt-1 font-mono text-[12.5px] text-muted-foreground">
          {tenant.slug} · {tenant.id}
        </p>
      </div>

      <Card
        title="Identity, residency & retention"
        subtitle="Where this tenant lives, how long it keeps hot audit data, and which regions a future cross-region move could land in."
      >
        <TenantSettingsForm
          tenantId={tenant.id}
          initial={{
            name: tenant.name,
            description: tenant.description ?? '',
            region: tenant.region,
            audit_retention_days: tenant.audit_retention_days,
            allowed_regions: tenant.allowed_regions,
            is_active: tenant.is_active,
          }}
          isDefault={tenant.is_default}
        />
      </Card>

      <Card
        title="SSO / SAML 2.0"
        subtitle="IdP-initiated single-sign-on. Configure the metadata your IdP needs (below), then paste the IdP's metadata into the form."
      >
        <div className="mb-4 grid gap-3 rounded-lg border border-border bg-muted/20 p-4 text-[12.5px] sm:grid-cols-3">
          <SpField label="SP Entity ID" value={sp.entity_id} />
          <SpField label="ACS URL" value={sp.acs_url} />
          <SpField label="SLO URL" value={sp.slo_url} />
        </div>
        <SsoConfigForm tenantId={tenant.id} initial={sso} />
        <p className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Backend authentication wiring rolls out tenant-by-tenant. Saved configs stay
          inactive until cutover; toggle <strong>Enabled</strong> when your IdP is verified.
        </p>
      </Card>
    </div>
  );
}

function SpField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-all font-mono text-[11.5px] text-foreground/85">{value}</div>
    </div>
  );
}
