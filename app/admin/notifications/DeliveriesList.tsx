import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { RecentDelivery } from '@/lib/notifications/dispatch';

export function DeliveriesList({ deliveries }: { deliveries: RecentDelivery[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <th className="px-5 py-2.5">When</th>
            <th className="px-3 py-2.5">Channel</th>
            <th className="px-3 py-2.5">Event</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Response</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {deliveries.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                No deliveries yet.
              </td>
            </tr>
          )}
          {deliveries.map((d) => (
            <tr key={d.id} className="hover:bg-accent/30">
              <td className="px-5 py-2.5 text-[11.5px] text-muted-foreground">
                <time title={new Date(d.delivered_at).toISOString()}>
                  {formatDistanceToNow(new Date(d.delivered_at), { addSuffix: true })}
                </time>
              </td>
              <td className="px-3 py-2.5">
                <div className="text-[12.5px] font-medium text-foreground">
                  {d.channel_name ?? '—'}
                </div>
                <div className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                  {d.channel_kind ?? ''}
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className="text-[12px] text-foreground">{d.event_kind}</div>
                <div className="font-mono text-[10.5px] text-muted-foreground">{d.event_key}</div>
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    'inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] ring-1',
                    d.status === 'sent' && 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                    d.status === 'failed' && 'bg-red-50 text-red-700 ring-red-200',
                    d.status === 'skipped' && 'bg-slate-100 text-slate-700 ring-slate-200',
                  )}
                >
                  {d.status}
                </span>
                {d.http_status != null && (
                  <span className="ml-2 text-[10.5px] text-muted-foreground">
                    HTTP {d.http_status}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground">
                {d.error ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
