import { query } from '@/lib/db/client';
import { FileText, ShieldCheck } from 'lucide-react';
import { PageShell } from '@/components/verify/PageShell';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface DraftRow {
  id: number;
  title: string;
  audit_log_id: number | null;
  scenario: string;
  status: string;
  created_at: Date;
}

async function getDrafts(): Promise<DraftRow[]> {
  const r = await query<DraftRow>(
    `SELECT id, title, audit_log_id, scenario, status, created_at
       FROM wp_drafts
       ORDER BY id DESC
       LIMIT 50`,
  );
  return r.rows;
}

export default async function WpMockPage() {
  const drafts = await getDrafts();
  return (
    <PageShell
      activePath="/library"
      title="WordPress draft queue (mock)"
      description={
        <>
          This page stands in for a headless WordPress install&apos;s draft queue. In production the
          verifier POSTs each approved article to the client&apos;s real{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[12px]">wp-json/wp/v2/posts</code> with
          its AssuredAI audit id stitched in as post metadata.
        </>
      }
    >
      {drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <FileText className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" />
          <p className="text-[14px] font-medium">No drafts queued yet</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Verify an article on{' '}
            <a href="/chat" className="text-primary hover:underline">
              /chat
            </a>
            , then click <strong>Send to WordPress</strong> in the action bar.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Scenario</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Proof</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d) => (
                <tr key={d.id} className="border-t border-border/60 align-top transition-colors hover:bg-accent/30">
                  <td className="px-4 py-2.5 font-mono text-[11.5px] tabular-nums text-muted-foreground">
                    #{d.id}
                  </td>
                  <td className="max-w-md px-4 py-2.5">
                    <a href={`/wp-mock/drafts/${d.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                      {d.title}
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] capitalize">{d.scenario}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="muted">{d.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground tabular-nums">
                    {new Date(d.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    {d.audit_log_id ? (
                      <a
                        href={`/v/${d.audit_log_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        Audit #{d.audit_log_id}
                      </a>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">—</span>
                    )}
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
