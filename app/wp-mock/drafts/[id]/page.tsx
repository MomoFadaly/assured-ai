import { notFound } from 'next/navigation';
import { query } from '@/lib/db/client';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { PageShell } from '@/components/verify/PageShell';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface DraftRow {
  id: number;
  title: string;
  content: string;
  audit_log_id: number | null;
  scenario: string;
  status: string;
  created_at: Date;
}

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();
  const r = await query<DraftRow>(
    `SELECT id, title, content, audit_log_id, scenario, status, created_at
       FROM wp_drafts WHERE id = $1`,
    [numericId],
  );
  const d = r.rows[0];
  if (!d) notFound();
  return (
    <PageShell
      activePath="/library"
      title={d.title}
      description={
        <span className="text-[12px]">
          Draft #{d.id} · {d.scenario} · created{' '}
          {new Date(d.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge variant="muted">{d.status}</Badge>
        {d.audit_log_id && (
          <a
            href={`/v/${d.audit_log_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11.5px] font-medium text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200"
          >
            <ShieldCheck className="h-3 w-3" />
            Verified · Audit #{d.audit_log_id}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
      <article className="rounded-2xl border border-border bg-card p-8 text-[15px] leading-[1.7] shadow-sm">
        {d.content.split(/\n\s*\n/).map((p, i) => (
          <p key={i} className="mb-4 last:mb-0">
            {p}
          </p>
        ))}
      </article>
    </PageShell>
  );
}
