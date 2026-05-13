import Link from 'next/link';
import { query } from '@/lib/db/client';
import { ScrollText, Download, ShieldCheck, ExternalLink } from 'lucide-react';
import { PageShell } from '@/components/verify/PageShell';
import { AuditDeepLink } from '@/components/verify/AuditDeepLink';
import { HashCell } from '@/components/verify/HashCell';
import { BackToTop } from '@/components/verify/BackToTop';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Audit log',
  description: 'Append-only, hash-chained audit trail of every verification, kill-switch toggle, and source change.',
};

interface AuditViewRow {
  id: number;
  occurred_at: Date;
  scenario: string;
  outcome: string;
  outcome_reason: string | null;
  query_redacted: string;
  pii_detected_input: boolean;
  pii_detected_output: boolean;
  red_flag_category: string | null;
  latency_ms: number | null;
  hash: string;
}

const PAGE_SIZE = 50;

async function getRecent(): Promise<AuditViewRow[]> {
  const result = await query<AuditViewRow>(
    `SELECT id, occurred_at, scenario, outcome, outcome_reason,
            query_redacted, pii_detected_input, pii_detected_output,
            red_flag_category, latency_ms, hash
       FROM audit_log
       ORDER BY id DESC
       LIMIT $1`,
    [PAGE_SIZE],
  );
  return result.rows;
}

const OUTCOME_TONE: Record<string, 'success' | 'warning' | 'danger' | 'muted' | 'default'> = {
  answered: 'success',
  i_dont_know: 'muted',
  red_flag_escalation: 'danger',
  kill_switch: 'danger',
  citation_violation: 'warning',
  model_error: 'danger',
  redacted_input_rejected: 'warning',
  source_added: 'default',
  source_deactivated: 'muted',
  kill_switch_engaged: 'warning',
  kill_switch_disengaged: 'muted',
};

export default async function AuditPage() {
  const rows = await getRecent();

  return (
    <PageShell
      activePath="/audit"
      title="Audit log"
      description={
        <>
          Append-only, hash-chained. Every verification (and every kill-switch toggle, source change,
          and red-flag escalation) is recorded here with a cryptographic chain back to genesis.
          Postgres-trigger enforced — application code can&apos;t break it.
        </>
      }
      actions={
        <>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/audit/export">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </a>
          </Button>
          {rows[0] && (
            <Button variant="default" size="sm" asChild>
              <Link href={`/v/${rows[0].id}#verify-chain`}>
                <ShieldCheck className="h-3.5 w-3.5" /> Verify chain
              </Link>
            </Button>
          )}
        </>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Scenario</th>
              <th className="px-4 py-3 font-semibold">Outcome</th>
              <th className="px-4 py-3 font-semibold">Query (redacted)</th>
              <th className="px-4 py-3 font-semibold">PII</th>
              <th className="px-4 py-3 font-semibold">Latency</th>
              <th className="px-4 py-3 font-semibold">Hash</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <ScrollText className="mx-auto mb-3 h-6 w-6 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    No interactions logged yet. Run a verification to populate.
                  </p>
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                data-audit-id={r.id}
                className="group cursor-pointer border-t border-border/60 align-top transition-colors hover:bg-accent/30"
              >
                <td className="px-4 py-2.5 font-mono text-[11.5px] tabular-nums">
                  <Link
                    href={`/v/${r.id}`}
                    className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary hover:underline"
                    aria-label={`Open proof page for audit ${r.id}`}
                  >
                    #{r.id}
                    <ExternalLink className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-70" />
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[12px] text-muted-foreground tabular-nums">
                  {new Date(r.occurred_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-4 py-2.5 text-[12px] capitalize">{r.scenario}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={OUTCOME_TONE[r.outcome] ?? 'muted'}>
                    {r.outcome.replace(/_/g, ' ')}
                  </Badge>
                  {r.red_flag_category && (
                    <span className="ml-1.5 text-[10.5px] text-red-600 dark:text-red-400">
                      {r.red_flag_category.replace(/_/g, ' ')}
                    </span>
                  )}
                </td>
                <td className="max-w-md truncate px-4 py-2.5 text-[12.5px]">
                  {r.query_redacted.slice(0, 120)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    {r.pii_detected_input && <Badge variant="warning">in</Badge>}
                    {r.pii_detected_output && <Badge variant="warning">out</Badge>}
                    {!r.pii_detected_input && !r.pii_detected_output && (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[12px] tabular-nums text-muted-foreground">
                  {r.latency_ms ? `${r.latency_ms.toLocaleString()}ms` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <HashCell hash={r.hash} short={12} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 px-1 text-[11.5px] text-muted-foreground">
        Showing {rows.length} most recent entries · enforced via Postgres trigger; the chain breaks
        on any tampering attempt.
      </p>
      <AuditDeepLink />
      <BackToTop />
    </PageShell>
  );
}
