import { query } from '@/lib/db/client';
import { ExternalLink, BookOpen, Database } from 'lucide-react';
import { PageShell } from '@/components/verify/PageShell';
import { LibrarySearch } from '@/components/verify/LibrarySearch';
import { BackToTop } from '@/components/verify/BackToTop';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Source library',
  description: 'Vetted sources AssuredAI checks every published claim against.',
};

interface SourceRow {
  id: string;
  organization: string;
  source_type: string;
  url: string;
  title: string;
  scenario: string;
  is_active: boolean;
  ingested_at: Date;
  chunk_count: string;
}

async function getSources(): Promise<SourceRow[]> {
  const result = await query<SourceRow>(
    `SELECT s.id, s.organization, s.source_type, s.url, s.title,
            s.scenario, s.is_active, s.ingested_at,
            COUNT(c.id)::text AS chunk_count
       FROM sources s
       LEFT JOIN source_chunks c ON c.source_id = s.id
       GROUP BY s.id
       ORDER BY s.scenario, s.organization, s.title`,
  );
  return result.rows;
}

const SCENARIO_LABEL: Record<string, string> = {
  healthcare: 'Healthcare',
  government: 'Government',
};

export default async function LibraryPage() {
  const sources = await getSources();
  const byScenario = sources.reduce<Record<string, SourceRow[]>>((acc, s) => {
    (acc[s.scenario] ??= []).push(s);
    return acc;
  }, {});

  const totalChunks = sources.reduce((sum, s) => sum + Number(s.chunk_count || 0), 0);

  return (
    <PageShell
      activePath="/library"
      title="Source library"
      description="Vetted sources AssuredAI checks every published claim against. The library is a fact-check reference, not a retrieval cage — paragraphs without a match are flagged for editor review, never auto-rejected."
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sources" value={sources.length.toLocaleString()} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard label="Active" value={sources.filter((s) => s.is_active).length.toLocaleString()} />
        <StatCard label="Chunks" value={totalChunks.toLocaleString()} icon={<Database className="h-4 w-4" />} />
        <StatCard label="Scenarios" value={Object.keys(byScenario).length.toLocaleString()} />
      </div>

      <LibrarySearch />

      {Object.entries(byScenario).map(([scenario, items]) => (
        <section key={scenario} data-library-section className="mb-8 rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border/80 px-5 py-3">
            <div>
              <h2 className="text-[15px] font-semibold">
                {SCENARIO_LABEL[scenario] ?? scenario}
              </h2>
              <p className="text-[12px] text-muted-foreground">
                {items.length} source{items.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <ul className="divide-y divide-border/60">
            {items.map((s) => (
              <li
                key={s.id}
                data-library-item
                data-search={`${s.title} ${s.organization} ${prettyHost(s.url)}`}
                className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-accent/40"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10.5px] font-semibold uppercase tracking-wide text-primary">
                  {orgInitials(s.organization)}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[14px] font-medium text-foreground transition-colors hover:text-primary hover:underline"
                  >
                    <span className="truncate">{s.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  </a>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    <span>{s.organization}</span>
                    <span>·</span>
                    <span>{prettyHost(s.url)}</span>
                    <span>·</span>
                    <span>
                      Ingested{' '}
                      {new Date(s.ingested_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={Number(s.chunk_count) > 0 ? 'success' : 'muted'}>
                    {s.chunk_count} chunks
                  </Badge>
                  {s.is_active ? (
                    <Badge variant="outline">Active</Badge>
                  ) : (
                    <Badge variant="muted">Inactive</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {sources.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
          No sources ingested yet. Run <code className="rounded bg-muted px-1 py-0.5">pnpm corpus:ingest --scenario=healthcare</code>.
        </div>
      )}
      <BackToTop />
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[20px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function orgInitials(org: string): string {
  if (org.includes('/')) {
    return org.split('/')[1]?.slice(0, 3) ?? org.slice(0, 3);
  }
  const words = org.split(' ').filter(Boolean);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0] ?? '') + (words[1][0] ?? '');
  }
  return org.slice(0, 3);
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
