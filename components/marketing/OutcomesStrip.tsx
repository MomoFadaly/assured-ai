import Link from 'next/link';
import { ShieldCheck, FileCheck2, Clock, Link2 } from 'lucide-react';
import type { GlobalMetrics } from '@/lib/marketing/global-metrics';

/**
 * OutcomesStrip — quantified outcomes anchored in live audit-log data.
 *
 * The Vanta / Drata move: hard numbers + sector-bound trust signals
 * positioned right below the hero so the page reads "trusted at scale"
 * before the visitor finishes scrolling. Ours is anchored in real
 * data pulled from the production audit_log (with honest fallbacks
 * on fresh deployments) — not made-up customer counts.
 *
 * Pulled into app/page.tsx between Hero and Audience.
 */
export function OutcomesStrip({ metrics }: { metrics: GlobalMetrics }) {
  const stats: Array<{
    label: string;
    value: string;
    sub: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      label: 'Verifications shipped',
      value: metrics.total_verifications.toLocaleString(),
      sub: `${metrics.verifications_24h} in last 24h`,
      icon: ShieldCheck,
    },
    {
      label: 'Sources cited',
      value: metrics.total_citations.toLocaleString(),
      sub: 'across all published pieces',
      icon: FileCheck2,
    },
    {
      label: 'Audit-chain integrity',
      value: `${metrics.chain_integrity_pct}%`,
      sub: 'Postgres trigger · SHA-256 · genesis → head',
      icon: Link2,
    },
    {
      label: 'Median verification',
      value: metrics.median_latency_ms ? `${(metrics.median_latency_ms / 1000).toFixed(1)}s` : '—',
      sub: 'pipeline end-to-end',
      icon: Clock,
    },
  ];

  return (
    <section
      aria-label="Platform metrics"
      className="relative border-y border-border bg-muted/15"
    >
      <div className="mx-auto max-w-[1320px] px-5 py-10 sm:py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
              The audit log
            </div>
            <h2 className="mt-2 text-balance text-[22px] sm:text-[28px] font-semibold leading-tight tracking-[-0.018em]">
              <span className="font-serif italic font-normal text-primary">Every number on this strip</span>{' '}
              comes from a live SQL query.
            </h2>
          </div>
          {metrics.latest_audit_id && (
            <Link
              href={`/v/${metrics.latest_audit_id}`}
              target="_blank"
              className="group inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:bg-accent"
            >
              Latest proof
              <span className="font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
                /v/{metrics.latest_audit_id}
              </span>
              <span aria-hidden>↗</span>
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card px-5 py-6">
                <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {s.label}
                </div>
                <div className="mt-3 text-[32px] font-semibold tracking-[-0.022em] tabular-nums leading-none sm:text-[40px]">
                  {s.value}
                </div>
                <div className="mt-2 text-[11.5px] text-muted-foreground">{s.sub}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          These aren&rsquo;t marketing numbers. Every count comes from the same{' '}
          <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[10.5px]">audit_log</code>{' '}
          table that produces the public{' '}
          <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[10.5px]">/v/&lt;id&gt;</code>{' '}
          proof URLs. Run a verification on the hero above and you&rsquo;ll see this strip update.
        </p>
      </div>
    </section>
  );
}
