import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, Radar, Power } from 'lucide-react';
import { listMonitoredSites } from '@/lib/admin/queries';
import { Card } from '../_components/Card';
import { AddSiteForm } from './AddSiteForm';

export const dynamic = 'force-dynamic';

export default async function MonitorIndex() {
  const sites = await listMonitoredSites();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Site monitor</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-muted-foreground">
            Continuously scan any public site for PHI leaks, fabricated claims, missing
            disclaimers, and red-flag content. Findings land in the dashboard for review.
          </p>
        </div>
      </header>

      <Card
        title="Monitored sites"
        subtitle={`${sites.length} ${sites.length === 1 ? 'site' : 'sites'}`}
        contentClassName="px-0 py-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-2.5">Site</th>
                <th className="px-3 py-2.5">Vertical</th>
                <th className="px-3 py-2.5">Schedule</th>
                <th className="px-3 py-2.5">Pages known</th>
                <th className="px-3 py-2.5">Open findings</th>
                <th className="px-3 py-2.5">Last scan</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sites.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                    <Radar className="mx-auto mb-2 h-5 w-5 opacity-60" />
                    No monitored sites yet. Add one below to start continuous scanning.
                  </td>
                </tr>
              )}
              {sites.map((s) => (
                <tr key={s.id} className="hover:bg-accent/30">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      {!s.enabled && (
                        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                          paused
                        </span>
                      )}
                      <span className="font-medium text-foreground">{s.name}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {s.url}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">
                    {s.scenario}
                  </td>
                  <td className="px-3 py-2.5 text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">
                    {s.schedule}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{s.total_pages_known}</td>
                  <td className="px-3 py-2.5">
                    {s.total_findings_open > 0 ? (
                      <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-amber-800 ring-1 ring-amber-200">
                        {s.total_findings_open}
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground">
                    {s.last_scanned_at
                      ? formatDistanceToNow(new Date(s.last_scanned_at), { addSuffix: true })
                      : 'never'}
                  </td>
                  <td className="px-3 py-2.5 text-[11.5px]">
                    {s.last_run_status ? (
                      <span
                        className={
                          s.last_run_status === 'failed'
                            ? 'text-red-700'
                            : s.last_run_status === 'partial'
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }
                      >
                        {s.last_run_status}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <Link
                      href={`/admin/monitor/${s.id}`}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11.5px] font-medium text-foreground hover:bg-accent"
                    >
                      Open
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Add a site"
        subtitle="The monitor will discover pages via sitemap.xml (or a BFS crawl if absent), then verify each one through the pipeline."
      >
        <AddSiteForm />
      </Card>

      <Card title="How it works" contentClassName="text-[13.5px] leading-relaxed">
        <ul className="list-disc space-y-1.5 pl-5 text-foreground/85">
          <li>
            <span className="font-medium">Discovery.</span> We fetch the site&rsquo;s
            sitemap.xml (or probe <code className="rounded bg-muted/40 px-1">/sitemap.xml</code>).
            If neither is reachable, fall back to a depth-2 BFS crawl from the homepage.
          </li>
          <li>
            <span className="font-medium">Content hashing.</span> We extract the main body of
            every page via Readability and SHA-256 hash it. Subsequent scans skip pages whose
            hash hasn&rsquo;t changed — only re-verify what changed.
          </li>
          <li>
            <span className="font-medium">Verification.</span> Each changed page runs through
            the full lifecycle: PHI redaction → red-flag detection → per-sentence sourcing →
            disclaimer enforcement → audit write.
          </li>
          <li>
            <span className="font-medium">Severity.</span> Findings are graded clean / low /
            medium / high / critical. PHI on a public page is high by default; an emergency
            phrase is critical.
          </li>
          <li>
            <span className="font-medium">Audit trail.</span> Every scanned page becomes an
            audit_log row, hash-chained alongside on-demand verifications. The public proof URL
            at <code className="rounded bg-muted/40 px-1">/v/[id]</code> works the same way.
          </li>
        </ul>
      </Card>
    </div>
  );
}
