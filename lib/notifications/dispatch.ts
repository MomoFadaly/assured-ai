/**
 * Notification dispatch — fan an event out to all matching channels.
 *
 *   notifyEvent(event)         → look up channels, render, deliver, log.
 *   sendOneChannel(channel, e) → single-channel delivery (used by "test send").
 *
 * Idempotency: every delivery row is `UNIQUE(channel_id, event_key)`, so
 * re-delivering the same event to the same channel is a no-op (ON
 * CONFLICT DO NOTHING). This protects against cron / retry double-fires.
 *
 * Failures NEVER throw to the caller — notifications are best-effort
 * around the primary verify / scan / kill-switch path. All failures land
 * in the deliveries log + the runtime logger.
 */

import '@/lib/server-only';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { renderSlack, renderEmail, renderWebhook } from './render';
import type {
  EmailChannelConfig,
  NotificationChannelRow,
  NotificationEvent,
  SlackChannelConfig,
  WebhookChannelConfig,
  FindingSeverity,
} from './types';

const SEVERITY_RANK: Record<FindingSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export async function notifyEvent(event: NotificationEvent): Promise<void> {
  try {
    const channels = await listMatchingChannels(event);
    if (channels.length === 0) return;
    await Promise.all(channels.map((c) => sendOneChannel(c, event)));
  } catch (err) {
    logger.error({ err, event_kind: event.kind }, 'notifyEvent: dispatch failed');
  }
}

export async function sendOneChannel(
  channel: NotificationChannelRow,
  event: NotificationEvent,
): Promise<void> {
  try {
    // Insert delivery row up-front so a re-fire of the same event_key on
    // the same channel is rejected by the UNIQUE constraint.
    const claim = await query<{ id: string }>(
      `INSERT INTO notification_deliveries
         (channel_id, channel_name, channel_kind, event_kind, event_key,
          status)
       VALUES ($1, $2, $3, $4, $5, 'sent')
       ON CONFLICT (channel_id, event_key) DO NOTHING
       RETURNING id`,
      [channel.id, channel.name, channel.kind, event.kind, event.event_key],
    );
    if (claim.rows.length === 0) {
      // Already delivered — idempotent skip.
      return;
    }
    const rowId = claim.rows[0]!.id;

    let httpStatus: number | null = null;
    let responseExcerpt: string | null = null;
    let error: string | null = null;
    let payload: unknown = null;

    if (channel.kind === 'slack') {
      const cfg = channel.config as SlackChannelConfig;
      const slack = renderSlack(event);
      payload = slack;
      const r = await fetchTimeout(cfg.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slack),
      });
      httpStatus = r.status;
      responseExcerpt = (await r.text().catch(() => '')).slice(0, 400);
      if (!r.ok) error = `HTTP ${r.status}: ${responseExcerpt}`;
    } else if (channel.kind === 'email') {
      const cfg = channel.config as EmailChannelConfig;
      const email = renderEmail(event);
      payload = { to: cfg.to, subject: email.subject };
      const result = await sendEmail({
        to: cfg.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: { kind: 'notify', event: event.kind },
      });
      if (!result.ok) error = result.error;
    } else if (channel.kind === 'webhook') {
      const cfg = channel.config as WebhookChannelConfig;
      const wh = renderWebhook(event, cfg.secret ?? null);
      payload = { url: cfg.url, signed: !!cfg.secret };
      const r = await fetchTimeout(cfg.url, {
        method: 'POST',
        headers: wh.headers,
        body: wh.body,
      });
      httpStatus = r.status;
      responseExcerpt = (await r.text().catch(() => '')).slice(0, 400);
      if (!r.ok) error = `HTTP ${r.status}: ${responseExcerpt}`;
    }

    const status = error ? 'failed' : 'sent';
    await query(
      `UPDATE notification_deliveries
          SET status = $2::notification_delivery_status_t,
              http_status = $3,
              response_excerpt = $4,
              error = $5,
              payload_preview = $6
        WHERE id = $1`,
      [
        rowId,
        status,
        httpStatus,
        responseExcerpt,
        error,
        payload ? JSON.stringify(payload).slice(0, 4000) : null,
      ],
    );
    if (error) {
      logger.warn(
        { channel_id: channel.id, kind: channel.kind, error },
        'notification delivery failed',
      );
    }
  } catch (err) {
    logger.error({ err, channel_id: channel.id }, 'sendOneChannel: caught');
  }
}

async function listMatchingChannels(
  event: NotificationEvent,
): Promise<NotificationChannelRow[]> {
  const r = await query<NotificationChannelRow>(
    `SELECT id, name, kind, config, subscribed_events, min_severity,
            pack_slugs, enabled, created_by, created_at, updated_at
       FROM notification_channels
      WHERE enabled = true
        AND (
          subscribed_events IS NULL
          OR cardinality(subscribed_events) = 0
          OR $1::notification_event_kind_t = ANY (subscribed_events)
        )`,
    [event.kind],
  );
  const out: NotificationChannelRow[] = [];
  for (const c of r.rows) {
    // Pack filter
    const packSlug = extractPackSlug(event);
    if (c.pack_slugs.length > 0 && packSlug && !c.pack_slugs.includes(packSlug)) continue;
    // Severity filter for findings
    if (event.kind === 'monitor_finding' && c.min_severity) {
      if (SEVERITY_RANK[event.severity] < SEVERITY_RANK[c.min_severity]) continue;
    }
    out.push(c);
  }
  return out;
}

function extractPackSlug(e: NotificationEvent): string | null {
  if ('pack_slug' in e && typeof e.pack_slug === 'string') return e.pack_slug;
  return null;
}

async function fetchTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 8000,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ============================================================
// Channel-management helpers (used by the admin UI)
// ============================================================

export async function listChannels(): Promise<NotificationChannelRow[]> {
  const r = await query<NotificationChannelRow>(
    `SELECT id, name, kind, config, subscribed_events, min_severity,
            pack_slugs, enabled, created_by, created_at, updated_at
       FROM notification_channels
      ORDER BY created_at DESC`,
  );
  return r.rows;
}

export interface CreateChannelInput {
  name: string;
  kind: 'slack' | 'email' | 'webhook';
  config: SlackChannelConfig | EmailChannelConfig | WebhookChannelConfig;
  subscribed_events?: string[];
  min_severity?: FindingSeverity | null;
  pack_slugs?: string[];
  enabled?: boolean;
  createdBy: string;
}

export async function createChannel(input: CreateChannelInput): Promise<{ id: string }> {
  const r = await query<{ id: string }>(
    `INSERT INTO notification_channels
       (name, kind, config, subscribed_events, min_severity, pack_slugs,
        enabled, created_by)
     VALUES ($1, $2::notification_channel_kind_t, $3, $4::notification_event_kind_t[], $5, $6::TEXT[], $7, $8)
     RETURNING id`,
    [
      input.name,
      input.kind,
      JSON.stringify(input.config),
      input.subscribed_events ?? [],
      input.min_severity ?? null,
      input.pack_slugs ?? [],
      input.enabled ?? true,
      input.createdBy,
    ],
  );
  return { id: r.rows[0]!.id };
}

export async function deleteChannel(id: string): Promise<void> {
  await query(`DELETE FROM notification_channels WHERE id = $1`, [id]);
}

export interface RecentDelivery {
  id: string;
  channel_name: string | null;
  channel_kind: string | null;
  event_kind: string;
  event_key: string;
  status: string;
  http_status: number | null;
  error: string | null;
  delivered_at: Date;
}

export async function listRecentDeliveries(limit = 50): Promise<RecentDelivery[]> {
  const r = await query<RecentDelivery>(
    `SELECT id, channel_name, channel_kind, event_kind, event_key,
            status, http_status, error, delivered_at
       FROM notification_deliveries
      ORDER BY delivered_at DESC
      LIMIT $1`,
    [Math.min(Math.max(limit, 1), 500)],
  );
  return r.rows;
}
