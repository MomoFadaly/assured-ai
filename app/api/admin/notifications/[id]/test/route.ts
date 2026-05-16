/**
 * POST /api/admin/notifications/[id]/test
 *
 * Send a synthetic event to a single channel so admins can confirm
 * Slack webhook / email To: / generic webhook URL configuration before
 * relying on it for real events.
 *
 * Idempotency on (channel_id, event_key) means the test event uses a
 * fresh UUID each time so it actually delivers.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { query } from '@/lib/db/client';
import { sendOneChannel } from '@/lib/notifications/dispatch';
import { randomUUID } from 'node:crypto';
import type { NotificationChannelRow } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.code === 'unauthenticated' ? 401 : 403 },
    );
  }
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const r = await query<NotificationChannelRow>(
    `SELECT id, name, kind, config, subscribed_events, min_severity,
            pack_slugs, enabled, created_by, created_at, updated_at
       FROM notification_channels WHERE id = $1`,
    [id],
  );
  const channel = r.rows[0];
  if (!channel) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const eventKey = `test:${randomUUID()}`;
  await sendOneChannel(channel, {
    kind: 'monitor_finding',
    event_key: eventKey,
    finding_id: 'test-finding',
    site_id: '00000000-0000-0000-0000-000000000000',
    site_name: 'Test site',
    page_url: 'https://example.com/test',
    severity: 'medium',
    summary: 'AssuredAI notification channel test — if you can read this, the channel is wired up correctly.',
    audit_log_id: null,
    pack_slug: 'healthcare',
  });

  // Read back the delivery so the UI can show success/failure.
  const d = await query<{ status: string; http_status: number | null; error: string | null }>(
    `SELECT status, http_status, error
       FROM notification_deliveries
      WHERE channel_id = $1 AND event_key = $2`,
    [id, eventKey],
  );
  const result = d.rows[0] ?? { status: 'unknown', http_status: null, error: 'no delivery row' };
  return NextResponse.json(result);
}
