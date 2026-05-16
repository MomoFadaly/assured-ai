/**
 * /admin/evidence — SOC 2 evidence pack export UI.
 *
 * Operators pick a date window (and optionally a single tenant), the
 * server bundles every auditable surface into a gzip container, and
 * the browser receives it as a download. Every pull writes a row to
 * `evidence_exports` so the surface itself is auditable.
 */

import { Card, StatTile } from '../_components/Card';
import { listEvidenceExports } from '@/lib/evidence';
import { listTenants } from '@/lib/tenants';
import { ExportForm } from './ExportForm';
import { ExportsTable } from './ExportsTable';

export const dynamic = 'force-dynamic';

export default async function EvidencePage() {
  const [tenants, exports] = await Promise.all([
    listTenants(),
    listEvidenceExports(null, 50),
  ]);

  const total = exports.length;
  const lastSuccess = exports.find((e) => e.status === 'ready');
  const lastFailed = exports.find((e) => e.status === 'failed');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">SOC 2 evidence pack</h1>
        <p className="mt-1 max-w-3xl text-[14px] text-muted-foreground">
          Bundle the audit log, admin actions, notification deliveries, usage events, monitor
          findings, login history, API key inventory, and anomaly events into a single
          tamper-evident archive your auditor can read. Every pull is itself audit-logged.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Exports (recent)" value={total} hint="last 50" />
        <StatTile
          label="Last successful"
          value={lastSuccess ? new Date(lastSuccess.created_at).toLocaleDateString() : '—'}
          hint={lastSuccess ? `#${lastSuccess.id.slice(0, 8)}` : 'no exports yet'}
        />
        <StatTile
          label="Last failed"
          value={lastFailed ? new Date(lastFailed.created_at).toLocaleDateString() : '—'}
          tone={lastFailed ? 'warning' : 'positive'}
          hint={lastFailed?.error?.slice(0, 60) ?? 'all green'}
        />
        <StatTile
          label="Hash chain"
          value="sha256"
          hint="every bundle headers + tail digest"
        />
      </div>

      <Card
        title="Build a new evidence pack"
        subtitle="Pick a window and (optionally) restrict to a single tenant. The browser receives an .bundle.gz download."
      >
        <ExportForm
          tenants={tenants.map((t) => ({ id: t.id, name: t.name, slug: t.slug, is_default: t.is_default }))}
        />
      </Card>

      <Card
        title="Recent exports"
        subtitle="Audit trail of every evidence pull — who, when, what."
        contentClassName="px-0 py-0"
      >
        <ExportsTable rows={exports} />
      </Card>
    </div>
  );
}
