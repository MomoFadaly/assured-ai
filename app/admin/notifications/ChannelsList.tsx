'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, Trash2, MessageSquare, Mail, Webhook } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationChannelRow } from '@/lib/notifications/types';

export function ChannelsList({ channels }: { channels: NotificationChannelRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<
    Record<string, { status: string; http_status: number | null; error: string | null }>
  >({});

  async function testSend(id: string) {
    setActingId(id);
    start(async () => {
      try {
        const r = await fetch(`/api/admin/notifications/${id}/test`, { method: 'POST' });
        const data = (await r.json()) as {
          status: string;
          http_status: number | null;
          error: string | null;
        };
        setTestResult((prev) => ({ ...prev, [id]: data }));
        router.refresh();
      } finally {
        setActingId(null);
      }
    });
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete channel "${name}"? Future events will not fire for it.`)) return;
    setActingId(id);
    start(async () => {
      try {
        const r = await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
        if (!r.ok) {
          const t = await r.text();
          alert(t || `HTTP ${r.status}`);
        } else {
          router.refresh();
        }
      } finally {
        setActingId(null);
      }
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <th className="px-5 py-2.5">Channel</th>
            <th className="px-3 py-2.5">Events</th>
            <th className="px-3 py-2.5">Filters</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-5 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {channels.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                No channels configured. Add one above to start receiving alerts.
              </td>
            </tr>
          )}
          {channels.map((c) => {
            const Icon = c.kind === 'slack' ? MessageSquare : c.kind === 'email' ? Mail : Webhook;
            const dest =
              c.kind === 'slack'
                ? 'Slack webhook'
                : c.kind === 'email'
                  ? (c.config as { to: string }).to
                  : (c.config as { url: string }).url;
            const tr = testResult[c.id];
            return (
              <tr key={c.id} className={cn('hover:bg-accent/30', !c.enabled && 'opacity-60')}>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="rounded bg-accent/40 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-foreground/70">
                      {c.kind}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground" title={dest}>
                    {dest}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {c.subscribed_events.length === 0 ? (
                    <span className="text-[11.5px] text-muted-foreground">all events</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {c.subscribed_events.map((ev) => (
                        <span
                          key={ev}
                          className="inline-flex items-center rounded-md bg-accent/40 px-1.5 py-0.5 text-[10.5px] font-medium"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[11.5px]">
                  {c.min_severity && <div>≥ {c.min_severity}</div>}
                  {c.pack_slugs.length > 0 ? (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {c.pack_slugs.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center rounded-md bg-accent/40 px-1.5 py-0.5 text-[10.5px] font-medium"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">all packs</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {c.enabled ? (
                    <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-emerald-700 ring-1 ring-emerald-200">
                      enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-700">
                      disabled
                    </span>
                  )}
                  {tr && (
                    <div
                      className={cn(
                        'mt-1 text-[10.5px]',
                        tr.status === 'sent' ? 'text-emerald-700' : 'text-red-700',
                      )}
                    >
                      Test: {tr.status}
                      {tr.http_status != null ? ` · HTTP ${tr.http_status}` : ''}
                      {tr.error ? ` — ${tr.error.slice(0, 60)}` : ''}
                    </div>
                  )}
                </td>
                <td className="px-5 py-2.5 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => testSend(c.id)}
                      disabled={actingId === c.id}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11.5px] font-medium text-foreground hover:bg-accent disabled:opacity-60"
                    >
                      {actingId === c.id && pending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Test
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c.id, c.name)}
                      disabled={actingId === c.id}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11.5px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
