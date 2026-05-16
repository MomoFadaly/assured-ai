import { cn } from '@/lib/utils';

export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-card shadow-[0_1px_0_rgba(15,23,42,0.03)]',
        className,
      )}
    >
      {(title || subtitle || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
          <div>
            {title && (
              <h2 className="text-[14px] font-semibold tracking-tight text-foreground">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn('px-5 py-4', contentClassName)}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  trend,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: React.ReactNode;
  tone?: 'default' | 'positive' | 'warning' | 'critical';
}) {
  const toneRing =
    tone === 'critical'
      ? 'ring-red-500/20'
      : tone === 'warning'
        ? 'ring-amber-500/20'
        : tone === 'positive'
          ? 'ring-emerald-500/20'
          : 'ring-border';
  const valueTone =
    tone === 'critical'
      ? 'text-red-700'
      : tone === 'warning'
        ? 'text-amber-700'
        : tone === 'positive'
          ? 'text-emerald-700'
          : 'text-foreground';
  return (
    <div className={cn('rounded-xl bg-card p-4 ring-1', toneRing)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className={cn('mt-2 text-[28px] font-semibold tabular-nums leading-none', valueTone)}>
        {value}
      </div>
      {(hint || trend) && (
        <div className="mt-2 flex items-baseline justify-between gap-2 text-[12px] text-muted-foreground">
          {hint && <span>{hint}</span>}
          {trend && <span className="font-medium text-foreground/80">{trend}</span>}
        </div>
      )}
    </div>
  );
}

export function SeverityBadge({
  severity,
}: {
  severity: 'clean' | 'low' | 'medium' | 'high' | 'critical' | null;
}) {
  const s = severity ?? 'clean';
  const style: Record<typeof s, string> = {
    clean: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    low: 'bg-slate-50 text-slate-700 ring-slate-200',
    medium: 'bg-amber-50 text-amber-800 ring-amber-200',
    high: 'bg-orange-50 text-orange-800 ring-orange-200',
    critical: 'bg-red-50 text-red-700 ring-red-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ring-1',
        style[s],
      )}
    >
      {s}
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: 'new' | 'acknowledged' | 'resolved' | 'dismissed';
}) {
  const style: Record<typeof status, string> = {
    new: 'bg-blue-50 text-blue-700 ring-blue-200',
    acknowledged: 'bg-amber-50 text-amber-800 ring-amber-200',
    resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dismissed: 'bg-slate-50 text-slate-600 ring-slate-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ring-1',
        style[status],
      )}
    >
      {status}
    </span>
  );
}

export function HealthDot({
  status,
}: {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
}) {
  const color =
    status === 'healthy'
      ? 'bg-emerald-500'
      : status === 'degraded'
        ? 'bg-amber-500'
        : status === 'down'
          ? 'bg-red-500'
          : 'bg-slate-400';
  return <span className={cn('inline-block size-2 rounded-full', color)} aria-hidden />;
}
