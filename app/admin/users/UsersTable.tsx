'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminUserRow } from '@/lib/admin/queries';
import type { UserRole } from '@/lib/db/types';

const ROLE_OPTIONS: UserRole[] = ['admin', 'auditor', 'operator', 'customer'];

export function UsersTable({
  initialUsers,
  initialQuery,
}: {
  initialUsers: AdminUserRow[];
  initialQuery: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitSearch(next: string) {
    const params = new URLSearchParams(search.toString());
    if (next.trim()) params.set('q', next.trim());
    else params.delete('q');
    startTransition(() => {
      router.push('/admin/users' + (params.toString() ? `?${params}` : ''));
      router.refresh();
    });
  }

  async function changeRole(userId: string, role: UserRole) {
    setSavingId(userId);
    try {
      const r = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) {
        const t = await r.text();
        alert(t || `HTTP ${r.status}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed.');
    } finally {
      setSavingId(null);
    }
  }

  async function toggleActive(userId: string, currentlyDeleted: boolean) {
    setSavingId(userId);
    try {
      const r = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivated: !currentlyDeleted }),
      });
      if (!r.ok) {
        const t = await r.text();
        alert(t || `HTTP ${r.status}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitSearch(q);
            }}
            placeholder="Search by email or name"
            className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-[13px] focus:border-foreground focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => submitSearch(q)}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12.5px] font-medium text-foreground hover:bg-accent disabled:opacity-60"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Search
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-5 py-2.5">User</th>
              <th className="px-3 py-2.5">Role</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Sign-in</th>
              <th className="px-3 py-2.5">Last login</th>
              <th className="px-3 py-2.5">Created</th>
              <th className="px-5 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {initialUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                  No users match.
                </td>
              </tr>
            )}
            {initialUsers.map((u) => (
              <tr key={u.id} className={cn('hover:bg-accent/30', u.deleted_at && 'opacity-60')}>
                <td className="px-5 py-2.5">
                  <div className="font-medium text-foreground">{u.name ?? '—'}</div>
                  <div className="text-[12px] text-muted-foreground">{u.email}</div>
                </td>
                <td className="px-3 py-2.5">
                  <select
                    value={u.role}
                    disabled={savingId === u.id || !!u.deleted_at}
                    onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                    className="h-8 rounded-md border border-border bg-card px-2 text-[12px] font-medium uppercase tracking-[0.06em] focus:border-foreground focus:outline-none"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5">
                  {u.deleted_at ? (
                    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-700">
                      deactivated
                    </span>
                  ) : u.locked_until && new Date(u.locked_until) > new Date() ? (
                    <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-amber-800 ring-1 ring-amber-200">
                      locked
                    </span>
                  ) : u.email_verified ? (
                    <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-emerald-700 ring-1 ring-emerald-200">
                      active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-amber-800 ring-1 ring-amber-200">
                      unverified
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground">
                  <div className="flex flex-col">
                    {u.has_password && <span>email + password</span>}
                    {u.oauth_providers.map((p) => (
                      <span key={p}>{p}</span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => toggleActive(u.id, !!u.deleted_at)}
                    disabled={savingId === u.id}
                    className="inline-flex h-7 items-center rounded-md border border-border bg-card px-2 text-[11.5px] font-medium text-foreground hover:bg-accent disabled:opacity-60"
                  >
                    {savingId === u.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    {u.deleted_at ? 'Restore' : 'Deactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
