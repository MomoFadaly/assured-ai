import Link from 'next/link';
import { query } from '@/lib/db/client';
import { AlertTriangle, Bell, ExternalLink } from 'lucide-react';
import { PageShell } from '@/components/verify/PageShell';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Escalations',
  description: 'Red-flag escalations: every emergency-detection event the verifier auto-blocked.',
};

interface EscalationViewRow {
  id: string;
  audit_log_id: number;
  occurred_at: Date;
  category: string;
  severity: string;
  triggering_phrase: string | null;
  reviewed_at: Date | null;
  query_redacted: string;
}

async function getEscalations(): Promise<EscalationViewRow[]> {
  const result = await query<EscalationViewRow>(
    `SELECT e.id, e.audit_log_id, e.occurred_at, e.category, e.severity,
            e.triggering_phrase, e.reviewed_at, al.query_redacted
       FROM escalations e
       JOIN audit_log al ON al.id = e.audit_log_id
       ORDER BY e.reviewed_at NULLS FIRST, e.occurred_at DESC
       LIMIT 50`,
  );
  return result.rows;
}

const CATEGORY_LABEL: Record<string, string> = {
  cardiac: 'Cardiac',
  mental_health_crisis: 'Mental health crisis',
  overdose: 'Overdose',
  severe_bleeding: 'Severe bleeding',
  stroke: 'Stroke',
  anaphylaxis: 'Anaphylaxis',
};

export default async function EscalationsPage() {
  const rows = await getEscalations();
  const unreviewed = rows.filter((r) => r.reviewed_at === null).length;

  return (
    <PageShell
      activePath="/escalations"
      title="Red-flag escalations"
      description="Every emergency-detection event the verifier auto-blocked. Governance committees review these on a defined cadence."
    >
      {unreviewed > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
          <div className="flex size-9 items-center justify-center rounded-lg bg-red-500 text-white">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-[13.5px]">
            <span className="font-semibold">
              {unreviewed} unreviewed escalation{unreviewed === 1 ? '' : 's'}
            </span>{' '}
            <span className="text-muted-foreground">pending governance committee review.</span>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <Bell className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" />
          <p className="text-[14px] font-medium">No escalations yet</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            When the verifier auto-blocks content for a medical red flag, you&apos;ll see it here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Trigger</th>
                <th className="px-4 py-3 font-semibold">Query (redacted)</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Audit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60 align-top transition-colors hover:bg-accent/30">
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground tabular-nums">
                    {new Date(r.occurred_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="danger">
                      {CATEGORY_LABEL[r.category] ?? r.category.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11.5px]">
                    {r.triggering_phrase ?? <span className="text-muted-foreground italic">LLM-only</span>}
                  </td>
                  <td className="max-w-md truncate px-4 py-2.5 text-[12.5px]">
                    {r.query_redacted.slice(0, 200)}
                  </td>
                  <td className="px-4 py-2.5 text-[12px]">
                    {r.reviewed_at ? (
                      <Badge variant="muted">
                        Reviewed {new Date(r.reviewed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </Badge>
                    ) : (
                      <Badge variant="warning">Pending review</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/audit?id=${r.audit_log_id}`}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-primary hover:underline"
                      aria-label={`Jump to audit log entry ${r.audit_log_id}`}
                    >
                      #{r.audit_log_id}
                      <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
