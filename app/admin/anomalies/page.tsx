/**
 * /admin/anomalies — anomaly inbox.
 *
 * Lists every anomaly_events row, surfaces severity / window /
 * dedupe context, and lets operators acknowledge with a note. New /
 * unacknowledged rows float to the top. Notification channels
 * subscribed to `anomaly_detected` get a Slack/email/webhook ping
 * in parallel.
 */

import { Card, StatTile } from '../_components/Card';
import { listAnomalies } from '@/lib/anomaly';
import { AnomalyManualScan } from './AnomalyManualScan';
import { AnomaliesTable } from './AnomaliesTable';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ focus?: string }>;

export default async function AnomaliesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { focus } = await searchParams;
  const anomalies = await listAnomalies(200);

  const open = anomalies.filter((a) => !a.acknowledged_at).length;
  const critical = anomalies.filter((a) => !a.acknowledged_at && a.severity === 'critical').length;
  const last7 = anomalies.filter(
    (a) => new Date(a.created_at).getTime() > Date.now() - 7 * 86_400_000,
  ).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">Anomaly detection</h1>
        <p className="mt-1 max-w-3xl text-[14px] text-muted-foreground">
          Detectors compare the last 24h to a 14-day baseline per tenant. Red-flag spikes,
          volume collapse, recognizer storms, and kill-switch-stuck-engaged events land
          here. Cron runs hourly; trigger an extra scan from this page when you&rsquo;ve
          just changed a pack or rule.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Open"
          value={open}
          tone={open > 0 ? 'warning' : 'positive'}
          hint="unacknowledged"
        />
        <StatTile
          label="Critical (open)"
          value={critical}
          tone={critical > 0 ? 'critical' : 'positive'}
        />
        <StatTile label="Last 7 days" value={last7} />
        <StatTile label="Total tracked" value={anomalies.length} hint="recent 200" />
      </div>

      <Card
        title="Run a scan now"
        subtitle="Cron runs hourly; this triggers an extra one immediately."
      >
        <AnomalyManualScan />
      </Card>

      <Card
        title="Anomalies"
        subtitle={open > 0 ? `${open} open, ${anomalies.length - open} acknowledged` : 'All clear'}
        contentClassName="px-0 py-0"
      >
        <AnomaliesTable rows={anomalies} focusId={focus ?? null} />
      </Card>
    </div>
  );
}
