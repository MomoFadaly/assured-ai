import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowUpRight,
  ShieldOff,
  Power,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  getKpis,
  getSystemStatus,
  listRecentVerifications,
  listRecentAdminActions,
} from '@/lib/admin/queries';
import { Card, StatTile, HealthDot } from './_components/Card';
import { KillSwitchToggle } from './_components/KillSwitchToggle';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const [kpis, status, recentV, recentA] = await Promise.all([
    getKpis(),
    getSystemStatus(),
    listRecentVerifications(8),
    listRecentAdminActions(8),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Real-time posture of the AssuredAI governance platform.
        </p>
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <StatTile
          label="Verifications · 24h"
          value={kpis.verifications_last_24h.toLocaleString()}
          hint={`${kpis.verifications_last_7d.toLocaleString()} in 7d`}
        />
        <StatTile
          label="PHI redacted · 24h"
          value={kpis.pii_redacted_24h.toLocaleString()}
          tone={kpis.pii_redacted_24h > 0 ? 'warning' : 'default'}
          hint="Detected on input"
        />
        <StatTile
          label="Red-flag escalations · 24h"
          value={kpis.red_flags_24h.toLocaleString()}
          tone={kpis.red_flags_24h > 0 ? 'critical' : 'positive'}
          hint="Emergency routing"
        />
        <StatTile
          label="Unsourced answers · 24h"
          value={kpis.unsourced_24h.toLocaleString()}
          hint='Fell back to "I don’t know"'
        />
        <StatTile
          label="Open escalations"
          value={kpis.open_escalations.toLocaleString()}
          tone={kpis.open_escalations > 0 ? 'warning' : 'positive'}
          hint="Awaiting review"
        />
        <StatTile
          label="Open monitor findings"
          value={kpis.open_findings.toLocaleString()}
          tone={kpis.open_findings > 0 ? 'warning' : 'positive'}
          hint="Across all sites"
        />
        <StatTile
          label="Monitored sites"
          value={kpis.monitored_sites.toLocaleString()}
          hint="Enabled"
        />
        <StatTile
          label="Audit chain rows"
          value={kpis.audit_chain_rows.toLocaleString()}
          hint={`Last #${kpis.audit_chain_last_id ?? 0}`}
        />
      </div>

      {/* System health + kill switch */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="System health"
          subtitle="Backbone services checked at page load."
          className="lg:col-span-2"
        >
          <ul className="divide-y divide-border/60">
            <ServiceRow label="Database" status={status.database} />
            <ServiceRow label="Presidio (PHI/PII)" status={status.presidio} />
            <ServiceRow label="LLM provider (Anthropic)" status={status.llm} />
            <ServiceRow label="Embeddings (Voyage)" status={status.embeddings} />
          </ul>
        </Card>

        <Card
          title="Kill switch"
          subtitle="Pull on suspicion — takes effect site-wide within ~1 second."
        >
          <KillSwitchToggle
            engaged={status.kill_switch.engaged}
            reason={status.kill_switch.reason}
            engagedAt={status.kill_switch.engaged_at ? status.kill_switch.engaged_at.toISOString() : null}
          />
        </Card>
      </div>

      {/* Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Recent verifications"
          subtitle="Last 8 events in the audit log."
          action={
            <Link
              href="/audit"
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground hover:underline"
            >
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
          contentClassName="px-0 py-0"
        >
          <ul className="divide-y divide-border/60">
            {recentV.length === 0 && (
              <li className="px-5 py-4 text-[13px] text-muted-foreground">
                No verifications yet.
              </li>
            )}
            {recentV.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <span className="font-mono">#{v.id}</span>
                    <span>·</span>
                    <span>{v.scenario}</span>
                    <span>·</span>
                    <time>{formatDistanceToNow(new Date(v.occurred_at), { addSuffix: true })}</time>
                  </div>
                  <div className="mt-0.5 truncate text-[13.5px] font-medium text-foreground">
                    {prettyOutcome(v.outcome)}
                    {v.pii_detected_input && (
                      <span className="ml-2 inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-amber-800 ring-1 ring-amber-200">
                        PHI
                      </span>
                    )}
                    {v.red_flag_category && (
                      <span className="ml-2 inline-flex items-center rounded bg-red-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-red-700 ring-1 ring-red-200">
                        {v.red_flag_category}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/v/${v.id}`}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11.5px] font-medium text-foreground hover:bg-accent"
                >
                  Proof
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Recent admin actions"
          subtitle="Mutations to users, settings, monitor, kill switch."
          action={
            <Link
              href="/admin/activity"
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground hover:underline"
            >
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
          contentClassName="px-0 py-0"
        >
          <ul className="divide-y divide-border/60">
            {recentA.length === 0 && (
              <li className="px-5 py-4 text-[13px] text-muted-foreground">
                No admin actions yet — they&rsquo;ll appear here the first time anyone mutates state.
              </li>
            )}
            {recentA.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">{a.actor_email ?? 'system'}</span>
                  {a.actor_role && (
                    <span className="rounded bg-accent/50 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em]">
                      {a.actor_role}
                    </span>
                  )}
                  <span>·</span>
                  <time>{formatDistanceToNow(new Date(a.occurred_at), { addSuffix: true })}</time>
                </div>
                <div className="mt-0.5 text-[13.5px] font-medium text-foreground">
                  {prettyAction(a.action)}
                  {a.target_kind && (
                    <span className="ml-2 text-[12.5px] font-normal text-muted-foreground">
                      → {a.target_kind} {a.target_id ?? ''}
                    </span>
                  )}
                </div>
                {a.reason && (
                  <div className="mt-0.5 text-[12.5px] text-muted-foreground">&ldquo;{a.reason}&rdquo;</div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function ServiceRow({
  label,
  status,
}: {
  label: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
}) {
  return (
    <li className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <HealthDot status={status} />
        <span className="text-[13.5px] font-medium text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1 text-[12.5px] text-muted-foreground">
        {status === 'healthy' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
        {status === 'degraded' && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
        {status === 'down' && <ShieldOff className="h-3.5 w-3.5 text-red-600" />}
        {status === 'unknown' && <Power className="h-3.5 w-3.5" />}
        <span className="font-medium capitalize">{status}</span>
      </div>
    </li>
  );
}

function prettyOutcome(o: string): string {
  return o.replaceAll('_', ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function prettyAction(a: string): string {
  return a.replaceAll('_', ' ').replace(/^\w/, (c) => c.toUpperCase());
}
