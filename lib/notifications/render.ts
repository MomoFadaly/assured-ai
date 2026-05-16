/**
 * Render a NotificationEvent into per-transport payloads.
 *
 * Slack:    Slack incoming-webhook JSON (text + blocks)
 * Email:    { subject, html, text } for sendEmail()
 * Webhook:  raw event JSON + HMAC signature header
 */

import { createHmac } from 'node:crypto';
import type { NotificationEvent } from './types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://assuredai.online';

// ============================================================
// Slack — Block Kit
// ============================================================

export function renderSlack(event: NotificationEvent): {
  text: string;
  blocks: unknown[];
} {
  const title = headline(event);
  const url = primaryUrl(event);
  const fields = facts(event);

  const blocks: unknown[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: title.slice(0, 150), emoji: true },
    },
    ...(fields.length > 0
      ? [
          {
            type: 'section',
            fields: fields.map((f) => ({
              type: 'mrkdwn',
              text: `*${f.label}*\n${f.value}`,
            })),
          },
        ]
      : []),
  ];

  if (url) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Open AssuredAI', emoji: true },
          url,
          style: severityToButtonStyle(event),
        },
      ],
    });
  }

  return { text: title, blocks };
}

// ============================================================
// Email — minimal HTML
// ============================================================

export function renderEmail(event: NotificationEvent): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = headline(event);
  const url = primaryUrl(event);
  const fields = facts(event);
  const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#fcfcfd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0b;line-height:1.55;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fcfcfd;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:22px 26px 8px;">
          <div style="font-size:11px;letter-spacing:0.18em;font-weight:700;color:#0a0a0b;text-transform:uppercase;">AssuredAI</div>
        </td></tr>
        <tr><td style="padding:6px 26px 24px;">
          <h1 style="margin:0 0 12px 0;font-size:18px;line-height:1.3;color:#0a0a0b;font-weight:600;">${escapeHtml(subject)}</h1>
          ${
            fields.length > 0
              ? `<table style="width:100%;font-size:13px;color:#0a0a0b;">${fields
                  .map(
                    (f) =>
                      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap;">${escapeHtml(f.label)}</td><td style="padding:4px 0;">${escapeHtml(f.value)}</td></tr>`,
                  )
                  .join('')}</table>`
              : ''
          }
          ${
            url
              ? `<p style="margin:18px 0 0;"><a href="${escapeAttr(url)}" style="display:inline-block;background:#0a0a0b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">Open AssuredAI</a></p>`
              : ''
          }
        </td></tr>
      </table>
      <p style="font-size:11px;color:#9ca3af;margin:18px 0 0;">AssuredAI — verification + proof for regulated AI publishing</p>
    </td></tr>
  </table>
</body></html>`.trim();

  const text =
    `${subject}\n` +
    fields.map((f) => `${f.label}: ${f.value}`).join('\n') +
    (url ? `\n\nOpen: ${url}\n` : '');

  return { subject, html, text };
}

// ============================================================
// Webhook — raw event + HMAC signature
// ============================================================

export function renderWebhook(
  event: NotificationEvent,
  secret: string | null | undefined,
): {
  body: string;
  headers: Record<string, string>;
} {
  const body = JSON.stringify({
    type: event.kind,
    event_key: event.event_key,
    delivered_at: new Date().toISOString(),
    payload: event,
  });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'AssuredAI-Webhook/1.0',
    'X-AssuredAI-Event': event.kind,
    'X-AssuredAI-Event-Key': event.event_key,
  };
  if (secret) {
    const sig = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    headers['X-AssuredAI-Signature'] = `sha256=${sig}`;
  }
  return { body, headers };
}

// ============================================================
// Shared formatters
// ============================================================

function headline(e: NotificationEvent): string {
  switch (e.kind) {
    case 'monitor_finding':
      return `[${e.severity.toUpperCase()}] AssuredAI finding on ${e.site_name}`;
    case 'red_flag_escalation':
      return `🚨 Red-flag escalation: ${e.category} (pack: ${e.pack_slug})`;
    case 'kill_switch_engaged':
      return '⛔ AssuredAI kill switch ENGAGED';
    case 'kill_switch_disengaged':
      return '✅ AssuredAI kill switch released';
    case 'scan_failed':
      return `⚠ Scan failed: ${e.site_name}`;
    case 'inbound_lead': {
      const kindLabel =
        e.lead_type === 'book_a_demo'
          ? '📅 Demo requested'
          : e.lead_type === 'talk_to_sales'
            ? '💬 Sales inquiry'
            : '✉ New lead';
      return `${kindLabel}: ${e.name}${e.org ? ' · ' + e.org : ''}`;
    }
    case 'anomaly_detected': {
      const icon = e.severity === 'critical' ? '🚨' : e.severity === 'warning' ? '⚠' : 'ℹ';
      return `${icon} Anomaly detected: ${e.anomaly_kind}`;
    }
  }
}

function facts(e: NotificationEvent): Array<{ label: string; value: string }> {
  switch (e.kind) {
    case 'monitor_finding':
      return [
        { label: 'Severity', value: e.severity },
        { label: 'Pack', value: e.pack_slug },
        { label: 'Page', value: e.page_url },
        { label: 'Summary', value: e.summary },
      ];
    case 'red_flag_escalation':
      return [
        { label: 'Category', value: e.category },
        { label: 'Pack', value: e.pack_slug },
        { label: 'Audit', value: `#${e.audit_log_id}` },
        { label: 'Excerpt', value: e.excerpt },
      ];
    case 'kill_switch_engaged':
    case 'kill_switch_disengaged':
      return [
        { label: 'Actor', value: e.actor_email ?? 'system' },
        ...(e.reason ? [{ label: 'Reason', value: e.reason }] : []),
      ];
    case 'scan_failed':
      return [
        { label: 'Site', value: e.site_name },
        { label: 'Error', value: e.error.slice(0, 240) },
      ];
    case 'inbound_lead': {
      const out: Array<{ label: string; value: string }> = [
        { label: 'Type', value: e.lead_type },
        { label: 'Name', value: e.name },
        { label: 'Email', value: e.email },
      ];
      if (e.org) out.push({ label: 'Org', value: e.org });
      if (e.role) out.push({ label: 'Role', value: e.role });
      if (e.segment) out.push({ label: 'Segment', value: e.segment });
      if (e.pack_interest) out.push({ label: 'Pack interest', value: e.pack_interest });
      if (e.plan_interest) out.push({ label: 'Plan interest', value: e.plan_interest });
      if (e.volume_estimate) out.push({ label: 'Volume', value: e.volume_estimate });
      if (e.requested_meeting_time)
        out.push({ label: 'Requested time', value: e.requested_meeting_time });
      if (e.message_excerpt) out.push({ label: 'Message', value: e.message_excerpt });
      return out;
    }
    case 'anomaly_detected':
      return [
        { label: 'Kind', value: e.anomaly_kind },
        { label: 'Severity', value: e.severity },
        { label: 'Summary', value: e.summary },
        ...(e.tenant_id ? [{ label: 'Tenant', value: e.tenant_id }] : []),
      ];
  }
}

function primaryUrl(e: NotificationEvent): string | null {
  switch (e.kind) {
    case 'monitor_finding':
      return `${APP_URL}/admin/monitor/${e.site_id}?tab=findings`;
    case 'red_flag_escalation':
      return `${APP_URL}/v/${e.audit_log_id}`;
    case 'kill_switch_engaged':
    case 'kill_switch_disengaged':
      return `${APP_URL}/admin/system`;
    case 'scan_failed':
      return `${APP_URL}/admin/monitor/${e.site_id}?tab=runs`;
    case 'inbound_lead':
      return `${APP_URL}/admin/leads?focus=${e.lead_id}`;
    case 'anomaly_detected':
      return `${APP_URL}/admin/anomalies?focus=${e.anomaly_id}`;
  }
}

function severityToButtonStyle(e: NotificationEvent): 'danger' | 'primary' | undefined {
  if (e.kind === 'monitor_finding') {
    return e.severity === 'critical' || e.severity === 'high' ? 'danger' : 'primary';
  }
  if (e.kind === 'red_flag_escalation' || e.kind === 'kill_switch_engaged') return 'danger';
  return 'primary';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
