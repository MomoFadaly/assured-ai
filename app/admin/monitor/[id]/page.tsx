import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import {
  getMonitoredSite,
  listFindings,
  listPages,
  listScanRuns,
} from '@/lib/admin/queries';
import { Card, StatTile, SeverityBadge, StatusBadge } from '../../_components/Card';
import { RunScanButton } from './RunScanButton';
import { ToggleEnabled } from './ToggleEnabled';
import { FindingRow } from './FindingRow';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ tab?: string }>;

export default async function MonitorDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const active = (tab as 'findings' | 'pages' | 'runs' | undefined) ?? 'findings';

  const site = await getMonitoredSite(id);
  if (!site) notFound();

  const [findings, pages, runs] = await Promise.all([
    listFindings({ siteId: id, status: 'all', severity: 'all', limit: 200 }),
    listPages(id, 500),
    listScanRuns(id, 50),
  ]);

  const newFindings = findings.filter((f) => f.status === 'new').length;
  const crit = findings.filter((f) => f.status === 'new' && f.severity === 'critical').length;
  const high = findings.filter((f) => f.status === 'new' && f.severity === 'high').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/monitor"
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            All sites
          </Link>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight">{site.name}</h1>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
          >
            {site.url}
            <ExternalLink className="h-3 w-3" />
          </a>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            <span className="rounded bg-accent/40 px-1.5 py-0.5">{site.scenario}</span>
            <span className="rounded bg-accent/40 px-1.5 py-0.5">{site.schedule}</span>
            {site.last_scanned_at && (
              <span>
                Last scan {formatDistanceToNow(new Date(site.last_scanned_at), { addSuffix: true })}
              </span>
            )}
            {site.last_run_status && (
              <span
                className={
                  site.last_run_status === 'failed'
                    ? 'text-red-700'
                    : site.last_run_status === 'partial'
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                }
              >
                {site.last_run_status}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToggleEnabled siteId={site.id} enabled={site.enabled} />
          <RunScanButton siteId={site.id} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Pages known" value={site.total_pages_known} />
        <StatTile
          label="Open findings"
          value={newFindings}
          tone={newFindings > 0 ? 'warning' : 'positive'}
        />
        <StatTile
          label="Critical open"
          value={crit}
          tone={crit > 0 ? 'critical' : 'positive'}
        />
        <StatTile
          label="High open"
          value={high}
          tone={high > 0 ? 'warning' : 'positive'}
        />
      </div>

      <div className="flex items-center gap-1 border-b border-border/60">
        <Tab href={`/admin/monitor/${id}?tab=findings`} active={active === 'findings'} count={findings.length}>
          Findings
        </Tab>
        <Tab href={`/admin/monitor/${id}?tab=pages`} active={active === 'pages'} count={pages.length}>
          Pages
        </Tab>
        <Tab href={`/admin/monitor/${id}?tab=runs`} active={active === 'runs'} count={runs.length}>
          Scan history
        </Tab>
      </div>

      {active === 'findings' && (
        <Card title="Findings" subtitle="Sorted critical → low; click to expand." contentClassName="px-0 py-0">
          <div className="divide-y divide-border/60">
            {findings.length === 0 && (
              <div className="px-5 py-10 text-center text-muted-foreground">
                No findings yet — run a scan to populate.
              </div>
            )}
            {findings.map((f) => (
              <FindingRow key={f.id} finding={f} />
            ))}
          </div>
        </Card>
      )}

      {active === 'pages' && (
        <Card title="Pages" subtitle="One row per URL discovered." contentClassName="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-5 py-2.5">Page</th>
                  <th className="px-3 py-2.5">Severity</th>
                  <th className="px-3 py-2.5">Last scanned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {pages.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">
                      No pages yet — run a scan to discover.
                    </td>
                  </tr>
                )}
                {pages.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/30">
                    <td className="px-5 py-2.5">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 truncate font-medium text-foreground hover:underline"
                      >
                        {p.title ?? p.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {p.title && (
                        <div className="text-[11.5px] text-muted-foreground truncate">{p.url}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <SeverityBadge severity={p.last_severity} />
                    </td>
                    <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground">
                      {p.last_scanned_at
                        ? formatDistanceToNow(new Date(p.last_scanned_at), { addSuffix: true })
                        : 'pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {active === 'runs' && (
        <Card title="Scan history" subtitle="Every scan invocation." contentClassName="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-5 py-2.5">Started</th>
                  <th className="px-3 py-2.5">Trigger</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Pages</th>
                  <th className="px-3 py-2.5">New findings</th>
                  <th className="px-3 py-2.5">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                      No runs yet.
                    </td>
                  </tr>
                )}
                {runs.map((r) => {
                  const ms =
                    r.finished_at && r.started_at
                      ? new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
                      : null;
                  return (
                    <tr key={r.id} className="hover:bg-accent/30">
                      <td className="px-5 py-2.5 text-[11.5px] text-muted-foreground">
                        {new Date(r.started_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">
                        {r.triggered_kind}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={
                            r.status === 'failed'
                              ? 'text-red-700'
                              : r.status === 'partial'
                                ? 'text-amber-700'
                                : r.status === 'running'
                                  ? 'text-blue-700'
                                  : 'text-emerald-700'
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-[12px]">
                        {r.pages_scanned}/{r.pages_discovered}
                        {r.pages_skipped_unchanged > 0 && (
                          <span className="ml-1 text-muted-foreground">
                            (+{r.pages_skipped_unchanged} unchanged)
                          </span>
                        )}
                        {r.pages_failed > 0 && (
                          <span className="ml-1 text-red-700">({r.pages_failed} failed)</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-[12px]">{r.new_findings}</td>
                      <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground">
                        {ms !== null ? `${(ms / 1000).toFixed(1)}s` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Tab({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'inline-flex items-center gap-1.5 border-b-2 border-foreground px-3 py-2 text-[13px] font-semibold text-foreground'
          : 'inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-muted-foreground hover:border-border hover:text-foreground'
      }
    >
      {children}
      <span
        className={
          active
            ? 'rounded-full bg-accent/60 px-1.5 py-0.5 text-[10px] tabular-nums'
            : 'rounded-full bg-muted/40 px-1.5 py-0.5 text-[10px] tabular-nums'
        }
      >
        {count}
      </span>
    </Link>
  );
}
