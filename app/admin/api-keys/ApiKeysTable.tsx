'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, KeyRound, XCircle } from 'lucide-react';
import type { ApiKeyListRow } from '@/lib/api-keys';
import { cn } from '@/lib/utils';

export function ApiKeysTable({ initialKeys }: { initialKeys: ApiKeyListRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function revoke(id: string, name: string) {
    if (!confirm(`Revoke "${name}"? This is irreversible — clients using this key will start getting 401s.`)) {
      return;
    }
    setRevokingId(id);
    start(async () => {
      try {
        const r = await fetch(`/api/admin/api-keys/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'admin revoke from /admin/api-keys' }),
        });
        if (!r.ok) {
          const t = await r.text();
          alert(t || `HTTP ${r.status}`);
        } else {
          router.refresh();
        }
      } finally {
        setRevokingId(null);
      }
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <th className="px-5 py-2.5">Key</th>
            <th className="px-3 py-2.5">Scopes</th>
            <th className="px-3 py-2.5">Pack restriction</th>
            <th className="px-3 py-2.5">Created</th>
            <th className="px-3 py-2.5">Last used</th>
            <th className="px-3 py-2.5">Use count</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-5 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {initialKeys.length === 0 && (
            <tr>
              <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                <KeyRound className="mx-auto mb-2 h-5 w-5 opacity-60" />
                No keys yet — issue one above to start authenticating programmatic verify calls.
              </td>
            </tr>
          )}
          {initialKeys.map((k) => {
            const isRevoked = !!k.revoked_at;
            const isExpired = k.expires_at && new Date(k.expires_at) < new Date();
            return (
              <tr key={k.id} className={cn('hover:bg-accent/30', isRevoked && 'opacity-60')}>
                <td className="px-5 py-2.5">
                  <div className="font-medium text-foreground">{k.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{k.prefix}_…</div>
                  {k.description && (
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground line-clamp-1">
                      {k.description}
                    </div>
                  )}
                  {k.created_by_email && (
                    <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                      issued by {k.created_by_email}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center rounded-md bg-accent/40 px-1.5 py-0.5 text-[10.5px] font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {k.allowed_pack_slugs.length === 0 ? (
                    <span className="text-[11.5px] text-muted-foreground">any pack</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {k.allowed_pack_slugs.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center rounded-md bg-accent/40 px-1.5 py-0.5 text-[10.5px] font-medium"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground">
                  {formatDistanceToNow(new Date(k.created_at), { addSuffix: true })}
                </td>
                <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground">
                  {k.last_used_at
                    ? formatDistanceToNow(new Date(k.last_used_at), { addSuffix: true })
                    : '—'}
                </td>
                <td className="px-3 py-2.5 tabular-nums">{Number(k.use_count).toLocaleString()}</td>
                <td className="px-3 py-2.5">
                  {isRevoked ? (
                    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-700">
                      revoked
                    </span>
                  ) : isExpired ? (
                    <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-amber-800 ring-1 ring-amber-200">
                      expired
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-emerald-700 ring-1 ring-emerald-200">
                      active
                    </span>
                  )}
                </td>
                <td className="px-5 py-2.5 text-right">
                  {!isRevoked && (
                    <button
                      type="button"
                      onClick={() => revoke(k.id, k.name)}
                      disabled={revokingId === k.id || pending}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11.5px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {revokingId === k.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
