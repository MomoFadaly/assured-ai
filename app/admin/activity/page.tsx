import { formatDistanceToNow } from 'date-fns';
import { listRecentAdminActions } from '@/lib/admin/queries';
import { Card } from '../_components/Card';

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const actions = await listRecentAdminActions(200);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">Activity log</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Every admin mutation across the system. Forensic record kept alongside (but separate from)
          the verification audit log.
        </p>
      </header>

      <Card
        title="Admin actions"
        subtitle={`Most recent ${actions.length}`}
        contentClassName="px-0 py-0"
      >
        <ul className="divide-y divide-border/60">
          {actions.length === 0 && (
            <li className="px-5 py-10 text-center text-muted-foreground">
              No admin actions yet — they appear here the first time anyone mutates state.
            </li>
          )}
          {actions.map((a) => (
            <li key={a.id} className="px-5 py-3">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <span className="font-mono">#{a.id}</span>
                <span>·</span>
                <span className="font-medium text-foreground">{a.actor_email ?? 'system'}</span>
                {a.actor_role && (
                  <span className="rounded bg-accent/50 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em]">
                    {a.actor_role}
                  </span>
                )}
                <span>·</span>
                <time title={new Date(a.occurred_at).toISOString()}>
                  {formatDistanceToNow(new Date(a.occurred_at), { addSuffix: true })}
                </time>
              </div>
              <div className="mt-0.5 text-[13.5px] font-medium text-foreground">
                {a.action.replaceAll('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
                {a.target_kind && (
                  <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                    → {a.target_kind} <span className="font-mono">{a.target_id ?? ''}</span>
                  </span>
                )}
              </div>
              {a.reason && (
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                  &ldquo;{a.reason}&rdquo;
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
