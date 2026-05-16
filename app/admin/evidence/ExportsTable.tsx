'use client';

interface ExportRow {
  id: string;
  tenant_id: string | null;
  requested_by: string;
  requester_email: string | null;
  window_start: Date;
  window_end: Date;
  included_tables: string[];
  bundle_sha256: string | null;
  bundle_bytes: number | null;
  status: string;
  error: string | null;
  created_at: Date;
  completed_at: Date | null;
}

const STATUS_TONE: Record<string, string> = {
  ready: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  failed: 'bg-red-50 text-red-700 ring-red-200',
};

function fmtBytes(n: number | null): string {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function ExportsTable({ rows }: { rows: ExportRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">
        No evidence exports yet. Build one above — it&rsquo;ll appear here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-[12.5px]">
        <thead className="bg-muted/30 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foreground/65">
          <tr>
            <th className="px-4 py-3 text-left">When</th>
            <th className="px-4 py-3 text-left">By</th>
            <th className="px-4 py-3 text-left">Window</th>
            <th className="px-4 py-3 text-left">Tables</th>
            <th className="px-4 py-3 text-left">Bundle</th>
            <th className="px-4 py-3 text-left">SHA-256</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 align-top">
                <div className="font-mono text-[11px] text-muted-foreground">
                  #{r.id.slice(0, 8)}
                </div>
                <div>{new Date(r.created_at).toLocaleString()}</div>
              </td>
              <td className="px-4 py-3 align-top text-foreground/80">
                {r.requester_email ?? r.requested_by.slice(0, 8)}
              </td>
              <td className="px-4 py-3 align-top tabular-nums text-foreground/80">
                {new Date(r.window_start).toISOString().slice(0, 10)}
                <br />
                <span className="text-muted-foreground">→</span>{' '}
                {new Date(r.window_end).toISOString().slice(0, 10)}
              </td>
              <td className="px-4 py-3 align-top">
                <span className="font-mono text-[10.5px] text-foreground/70">
                  {r.included_tables.length}
                </span>{' '}
                <span className="text-muted-foreground">tables</span>
              </td>
              <td className="px-4 py-3 align-top tabular-nums text-foreground/80">
                {fmtBytes(r.bundle_bytes)}
              </td>
              <td className="px-4 py-3 align-top">
                {r.bundle_sha256 ? (
                  <span className="font-mono text-[10.5px] text-foreground/65" title={r.bundle_sha256}>
                    {r.bundle_sha256.slice(0, 12)}…{r.bundle_sha256.slice(-4)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 align-top">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] ring-1 ${
                    STATUS_TONE[r.status] ?? 'bg-slate-50 text-slate-700 ring-slate-200'
                  }`}
                >
                  {r.status}
                </span>
                {r.error && (
                  <div className="mt-1 text-[10.5px] text-red-700">{r.error.slice(0, 80)}</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
