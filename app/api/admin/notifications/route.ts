/**
 * /api/admin/notifications
 *
 *   GET  → list channels
 *   POST → create channel
 *
 * Admin only.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { auth } from '@/lib/auth/auth';
import { logAdminAction } from '@/lib/admin/log';
import { createChannel, listChannels } from '@/lib/notifications/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z
  .object({
    name: z.string().min(1).max(120).trim(),
    kind: z.enum(['slack', 'email', 'webhook']),
    // Per-kind config — validated below by kind.
    slack_webhook_url: z.string().url().optional(),
    email_to: z.string().email().optional(),
    webhook_url: z.string().url().optional(),
    webhook_secret: z.string().min(8).max(200).optional(),
    subscribed_events: z
      .array(
        z.enum([
          'monitor_finding',
          'red_flag_escalation',
          'kill_switch_engaged',
          'kill_switch_disengaged',
          'scan_failed',
          'inbound_lead',
          'anomaly_detected',
        ]),
      )
      .default([]),
    min_severity: z.enum(['low', 'medium', 'high', 'critical']).nullable().optional(),
    pack_slugs: z.array(z.string().min(1).max(60)).default([]),
    enabled: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'slack' && !v.slack_webhook_url) {
      ctx.addIssue({ code: 'custom', message: 'slack_webhook_url required for slack channel' });
    }
    if (v.kind === 'email' && !v.email_to) {
      ctx.addIssue({ code: 'custom', message: 'email_to required for email channel' });
    }
    if (v.kind === 'webhook' && !v.webhook_url) {
      ctx.addIssue({ code: 'custom', message: 'webhook_url required for webhook channel' });
    }
  });

export async function GET(): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.code === 'unauthenticated' ? 401 : 403 },
    );
  }
  return NextResponse.json({ channels: await listChannels() });
}

export async function POST(req: Request): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.code === 'unauthenticated' ? 401 : 403 },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid body', detail: e instanceof Error ? e.message : null },
      { status: 400 },
    );
  }

  const config =
    body.kind === 'slack'
      ? { webhook_url: body.slack_webhook_url! }
      : body.kind === 'email'
        ? { to: body.email_to! }
        : { url: body.webhook_url!, secret: body.webhook_secret ?? null };

  const created = await createChannel({
    name: body.name,
    kind: body.kind,
    config,
    subscribed_events: body.subscribed_events,
    min_severity: body.min_severity ?? null,
    pack_slugs: body.pack_slugs,
    enabled: body.enabled,
    createdBy: guard.actor.userId,
  });

  const session = await auth();
  await logAdminAction({
    actor: {
      userId: guard.actor.userId,
      role: guard.actor.role,
      email: session?.user?.email ?? null,
    },
    action: 'notification_channel_created',
    targetKind: 'notification_channel',
    targetId: created.id,
    afterState: {
      name: body.name,
      kind: body.kind,
      subscribed_events: body.subscribed_events,
      pack_slugs: body.pack_slugs,
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
