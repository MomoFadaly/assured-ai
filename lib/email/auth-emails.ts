/**
 * Auth-flow transactional emails for AssuredAI.
 *
 * - Email verification: sent right after signup. The user must click
 *   the link before they can sign in. Token TTL is 24h.
 * - Password reset: sent on demand from /forgot-password. Token TTL is 1h.
 *   We always render a generic "if there's an account, we sent a link"
 *   UX so we don't disclose which emails are registered.
 *
 * Both reuse the brand-styled HTML envelope below. Plain-text fallback
 * is generated automatically by sendEmail().
 */

import 'server-only';
import { sendEmail, type SendEmailResult } from './index';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://assuredai.online';

function envelope(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#fcfcfd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0b;line-height:1.6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fcfcfd;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:32px 32px 8px 32px;">
            <div style="font-size:11px;letter-spacing:0.22em;font-weight:700;color:#0a0a0b;text-transform:uppercase;">AssuredAI</div>
          </td></tr>
          <tr><td style="padding:8px 32px 32px 32px;">
            <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.25;color:#0a0a0b;font-weight:600;letter-spacing:-0.02em;">${title}</h1>
            ${bodyHtml}
            <p style="margin:32px 0 0 0;font-size:13px;color:#6b7280;">
              — The AssuredAI team
            </p>
          </td></tr>
        </table>
        <p style="font-size:11px;color:#9ca3af;margin:24px 0 0 0;">
          AssuredAI · The proof layer for regulated AI publishing
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}

const buttonHtml = (label: string, href: string) => `
<p style="margin:24px 0;">
  <a href="${href}" style="display:inline-block;background:#0a0a0b;color:#fff;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">${label}</a>
</p>
<p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">
  Or paste this link into your browser:<br>
  <span style="word-break:break-all;color:#0a0a0b;">${href}</span>
</p>`;

export async function sendVerificationEmail(input: {
  to: string;
  token: string;
  name?: string | null;
}): Promise<SendEmailResult> {
  const link = `${APP_URL}/verify-email?token=${encodeURIComponent(input.token)}`;
  const greeting = input.name ? `Hi ${input.name},` : 'Hi,';

  const html = envelope(
    'Confirm your email',
    `<p style="margin:0 0 16px 0;font-size:16px;">${greeting}</p>
     <p style="margin:0 0 16px 0;font-size:16px;">
       Click the button below to confirm this is your email and finish setting up your AssuredAI
       account. The link works once and expires in 24 hours.
     </p>
     ${buttonHtml('Confirm my email', link)}
     <p style="margin:0;font-size:14px;color:#6b7280;">
       If you didn't ask to create an AssuredAI account, you can ignore this — no account becomes
       active until the link is clicked.
     </p>`,
  );

  return sendEmail({
    to: input.to,
    subject: 'Confirm your email — AssuredAI',
    html,
    tags: { kind: 'auth_verify_email' },
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  token: string;
  name?: string | null;
}): Promise<SendEmailResult> {
  const link = `${APP_URL}/reset-password?token=${encodeURIComponent(input.token)}`;
  const greeting = input.name ? `Hi ${input.name},` : 'Hi,';

  const html = envelope(
    'Reset your password',
    `<p style="margin:0 0 16px 0;font-size:16px;">${greeting}</p>
     <p style="margin:0 0 16px 0;font-size:16px;">
       Someone asked to reset the password on your AssuredAI account. Click below to set a new
       one — the link works once and expires in <strong>1 hour</strong>.
     </p>
     ${buttonHtml('Set a new password', link)}
     <p style="margin:0;font-size:14px;color:#6b7280;">
       If this wasn't you, ignore this email — your current password is still valid and nothing
       changes.
     </p>`,
  );

  return sendEmail({
    to: input.to,
    subject: 'Reset your AssuredAI password',
    html,
    tags: { kind: 'auth_password_reset' },
  });
}
