import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { listTenants } from '@/lib/tenants';
import { query } from '@/lib/db/client';
import { Card, StatTile } from '../_components/Card';
import { CreateTenantForm } from './CreateTenantForm';

export const dynamic = 'force-dynamic';

export default async function TenantsIndex() {
  const tenants = await listTenants();

  // Per-tenant headline counts — small enough to do per-page-load. If
  // this gets slow at scale, move to a daily-rollup table.
  const counts = await Promise.all(
    tenants.map(async (t) => {
      const r = await query<{ users: string; sites: string; v24: string; v7: string }>(
        `SELECT
            (SELECT COUNT(*) FROM users WHERE tenant_id = $1)::text AS users,
            (SELECT COUNT(*) FROM monitored_sites WHERE tenant_id = $1)::text AS sites,
            (SELECT COUNT(*) FROM audit_log WHERE tenant_id = $1 AND occurred_at > NOW() - INTERVAL '24 hours')::text AS v24,
            (SELECT COUNT(*) FROM audit_log WHERE tenant_id = $1 AND occurred_at > NOW() - INTERVAL '7 days')::text AS v7`,
        [t.id],
      );
      const row = r.rows[0]!;
      return {
        ...t,
        users: Number(row.users),
        sites: Number(row.sites),
        v24: Number(row.v24),
        v7: Number(row.v7),
      };
    }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">Tenants</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-muted-foreground">
          A tenant is an isolated workspace within this AssuredAI deployment. The default
          tenant holds all pre-migration data. Add a tenant per customer for the cloud-managed
          SaaS deployment shape; self-host deployments typically run with one.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Tenants" value={tenants.length} />
        <StatTile
          label="Active"
          value={tenants.filter((t) => t.is_active).length}
          tone="positive"
        />
        <StatTile
          label="Total users"
          value={counts.reduce((s, t) => s + t.users, 0)}
        />
        <StatTile
          label="Verifications · 24h"
          value={counts.reduce((s, t) => s + t.v24, 0).toLocaleString()}
        />
      </div>

      <Card title="Add a tenant" subtitle="Cloud or self-host workspace.">
        <CreateTenantForm />
      </Card>

      <Card title="All tenants" subtitle={`${tenants.length} total`} contentClassName="px-0 py-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-2.5">Tenant</th>
                <th className="px-3 py-2.5">Kind</th>
                <th className="px-3 py-2.5 text-right">Users</th>
                <th className="px-3 py-2.5 text-right">Monitored sites</th>
                <th className="px-3 py-2.5 text-right">Verifications · 24h</th>
                <th className="px-3 py-2.5 text-right">Verifications · 7d</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-5 py-2.5">Created</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {counts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                    No tenants — migration 008 didn&rsquo;t run?
                  </td>
                </tr>
              )}
              {counts.map((t) => (
                <tr key={t.id} className="hover:bg-accent/30">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{t.name}</span>
                      {t.is_default && (
                        <span className="rounded bg-accent/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]">
                          default
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">{t.slug}</div>
                    {t.description && (
                      <div className="mt-0.5 text-[11.5px] text-muted-foreground line-clamp-1">
                        {t.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">
                    {t.deployment_kind}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{t.users}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{t.sites}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{t.v24.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{t.v7.toLocaleString()}</td>
                  <td className="px-3 py-2.5">
                    {t.is_active ? (
                      <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-emerald-700 ring-1 ring-emerald-200">
                        active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-700">
                        disabled
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-[11.5px] text-muted-foreground">
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground/70 hover:text-foreground"
                    >
                      Settings
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
