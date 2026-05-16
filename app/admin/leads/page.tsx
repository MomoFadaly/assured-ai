/**
 * /admin/leads — inbound lead inbox.
 *
 * Reads contact_leads (from /contact, /book-a-demo, /talk-to-sales).
 * Filterable by lead_type + status. Each row expands with notes + a
 * status dropdown so the sales workflow lives next to the platform.
 */

import { Card, StatTile } from '../_components/Card';
import { query } from '@/lib/db/client';
import { LeadsTable } from './LeadsTable';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  type?: string;
  status?: string;
  focus?: string;
}>;

export interface LeadRow {
  id: number;
  lead_type: string | null;
  name: string;
  email: string;
  org: string | null;
  role: string | null;
  segment: string | null;
  pack_interest: string | null;
  plan_interest: string | null;
  volume_estimate: string | null;
  requested_meeting_time: string | null;
  message: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  status: string;
  notes: string | null;
  created_at: Date;
  resolved_at: Date | null;
}

export default async function LeadsIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { type, status, focus } = await searchParams;

  const where: string[] = [];
  const args: unknown[] = [];
  if (type) {
    args.push(type);
    where.push(`lead_type = $${args.length}`);
  }
  if (status) {
    args.push(status);
    where.push(`status = $${args.length}`);
  }
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const [leadsRes, statsRes] = await Promise.all([
    query<LeadRow>(
      `SELECT id, lead_type, name, email, org, role, segment, pack_interest, plan_interest,
              volume_estimate, requested_meeting_time, message,
              utm_source, utm_medium, utm_campaign,
              status, notes, created_at, resolved_at
         FROM contact_leads
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT 200`,
      args,
    ),
    query<{
      total: number;
      new_count: number;
      book_a_demo_count: number;
      talk_to_sales_count: number;
      contact_count: number;
      last_7_days: number;
    }>(
      `SELECT
         COUNT(*)::int                                                     AS total,
         COUNT(*) FILTER (WHERE status = 'new')::int                       AS new_count,
         COUNT(*) FILTER (WHERE lead_type = 'book_a_demo')::int            AS book_a_demo_count,
         COUNT(*) FILTER (WHERE lead_type = 'talk_to_sales')::int          AS talk_to_sales_count,
         COUNT(*) FILTER (WHERE lead_type = 'contact')::int                AS contact_count,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS last_7_days
         FROM contact_leads`,
    ),
  ]);
  const stats = statsRes.rows[0] ?? {
    total: 0,
    new_count: 0,
    book_a_demo_count: 0,
    talk_to_sales_count: 0,
    contact_count: 0,
    last_7_days: 0,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">Inbound leads</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-muted-foreground">
          Every demo request, sales inquiry, and contact form submission lands here.
          Notification channels subscribed to <code className="rounded bg-muted/40 px-1">inbound_lead</code>{' '}
          get a Slack / email / webhook ping in parallel.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total leads" value={stats.total} hint="all time" />
        <StatTile
          label="New (unworked)"
          value={stats.new_count}
          tone={stats.new_count > 0 ? 'warning' : 'positive'}
        />
        <StatTile label="Last 7 days" value={stats.last_7_days} />
        <StatTile
          label="By type"
          value={
            <span className="text-[16px] font-medium">
              {stats.book_a_demo_count} demo · {stats.talk_to_sales_count} sales ·{' '}
              {stats.contact_count} contact
            </span>
          }
        />
      </div>

      <Card
        title="All leads"
        subtitle={`Showing ${leadsRes.rows.length} of ${stats.total}`}
        contentClassName="px-0 py-0"
      >
        <LeadsTable
          rows={leadsRes.rows}
          activeType={type ?? null}
          activeStatus={status ?? null}
          focusId={focus ? Number(focus) : null}
        />
      </Card>
    </div>
  );
}
