/**
 * Transactional email — single sendEmail() entry point for AssuredAI.
 *
 * Routing:
 *   - prod (RESEND_API_KEY set): sends through Resend
 *   - dev (no key): logs the email to the logger and returns success.
 *     The reset/verify link is included in the log so the developer can
 *     click it locally without a mail server.
 *
 * Never throw — auth flows fall through gracefully if email transport
 * is misconfigured. The verification token row still exists; user can
 * still complete the flow with the link from the logs.
 */

import 'server-only';
import { Resend } from 'resend';
import { logger } from '@/lib/logger';

const FROM = process.env.EMAIL_FROM ?? 'AssuredAI <hello@assuredai.online>';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Record<string, string>;
};

export type SendEmailResult =
  | { ok: true; provider: 'resend' | 'log'; id: string }
  | { ok: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text ?? stripHtml(input.html),
        replyTo: input.replyTo,
        tags: input.tags
          ? Object.entries(input.tags).map(([name, value]) => ({ name, value }))
          : undefined,
      });
      if (error) {
        logger.error({ err: error, to: input.to, subject: input.subject }, 'resend send failed');
        return { ok: false, error: String(error.message ?? error) };
      }
      return { ok: true, provider: 'resend', id: data?.id ?? '' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      logger.error({ err: e, to: input.to }, 'resend transport error');
      return { ok: false, error: `resend: ${msg}` };
    }
  }

  // Dev path — log the email so the developer can copy the link from the
  // logs and complete the flow without a mail server.
  logger.info(
    {
      to: input.to,
      subject: input.subject,
      // Log the body too — auth links are inside.
      html_preview: input.html.slice(0, 800),
    },
    '[email:log] (no RESEND_API_KEY) email NOT actually sent',
  );
  return { ok: true, provider: 'log', id: 'dev-log' };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
