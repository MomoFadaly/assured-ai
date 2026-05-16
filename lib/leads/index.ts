/**
 * Lead capture helper — persists inbound leads and fans the event out
 * to configured notification channels (Slack, email, webhook). Used by
 * /api/leads, /api/contact, and any future capture surface.
 *
 * Single entry point so the dedup + notify discipline can't drift:
 * caller passes a typed input, we write the row, return the id, and
 * fire-and-forget the notification.
 */

import 'server-only';
import { z } from 'zod';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { notifyEvent } from '@/lib/notifications/dispatch';

export const LeadTypeSchema = z.enum(['book_a_demo', 'talk_to_sales', 'contact']);
export type LeadType = z.infer<typeof LeadTypeSchema>;

export const LeadInputSchema = z.object({
  lead_type: LeadTypeSchema,
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  org: z.string().max(200).optional().nullable(),
  role: z.string().max(120).optional().nullable(),
  segment: z
    .enum(['publisher', 'hospital', 'pharma', 'gov', 'agency', 'finance', 'legal', 'other'])
    .optional()
    .nullable(),
  pack_interest: z
    .enum(['healthcare', 'finance', 'government', 'legal'])
    .optional()
    .nullable(),
  plan_interest: z
    .enum(['starter', 'team', 'enterprise'])
    .optional()
    .nullable(),
  volume_estimate: z.string().max(120).optional().nullable(),
  requested_meeting_time: z.string().max(200).optional().nullable(),
  message: z.string().max(4000).optional().nullable(),
  utm: z
    .object({
      source: z.string().max(200).optional().nullable(),
      medium: z.string().max(200).optional().nullable(),
      campaign: z.string().max(200).optional().nullable(),
    })
    .optional(),
  ip_hint: z.string().max(120).optional().nullable(),
});

export type LeadInput = z.infer<typeof LeadInputSchema>;

export async function captureLead(input: LeadInput): Promise<{ id: number }> {
  const r = await query<{ id: number }>(
    `INSERT INTO contact_leads
       (lead_type, name, email, org, role, segment,
        pack_interest, plan_interest, volume_estimate, requested_meeting_time,
        message, utm_source, utm_medium, utm_campaign, ip_hint, status, created_at)
     VALUES ($1, $2, LOWER($3), $4, $5, $6,
             $7, $8, $9, $10,
             $11, $12, $13, $14, $15, 'new', NOW())
     RETURNING id`,
    [
      input.lead_type,
      input.name.trim(),
      input.email.trim(),
      input.org?.trim() || null,
      input.role?.trim() || null,
      input.segment ?? null,
      input.pack_interest ?? null,
      input.plan_interest ?? null,
      input.volume_estimate?.trim() || null,
      input.requested_meeting_time?.trim() || null,
      input.message?.trim() || null,
      input.utm?.source ?? null,
      input.utm?.medium ?? null,
      input.utm?.campaign ?? null,
      input.ip_hint ?? null,
    ],
  );
  const id = r.rows[0]!.id;

  // Fire notifications asynchronously — never block the response.
  void notifyEvent({
    kind: 'inbound_lead',
    event_key: `lead:${id}`,
    lead_id: id,
    lead_type: input.lead_type,
    name: input.name,
    email: input.email,
    org: input.org ?? null,
    role: input.role ?? null,
    segment: input.segment ?? null,
    pack_interest: input.pack_interest ?? null,
    plan_interest: input.plan_interest ?? null,
    volume_estimate: input.volume_estimate ?? null,
    requested_meeting_time: input.requested_meeting_time ?? null,
    message_excerpt: input.message ? input.message.slice(0, 600) : null,
  }).catch((err) => {
    logger.error({ err, leadId: id }, 'lead notification dispatch failed');
  });

  logger.info(
    { leadId: id, leadType: input.lead_type, email: input.email },
    'lead captured',
  );
  return { id };
}
