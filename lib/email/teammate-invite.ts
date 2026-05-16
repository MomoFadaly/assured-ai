/**
 * Teammate invite email — sent when an existing user invites a teammate
 * from /welcome or /admin. Mirrors the auth-emails envelope so brand
 * stays consistent.
 *
 * The plaintext invite token is included once, in the link. The DB
 * stores SHA-256 hash only.
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

export async function sendTeammateInviteEmail(args: {
  to: string;
  inviterName: string;
  inviterEmail: string;
  tenantName: string;
  role: string;
  token: string;
  expiresAt: Date;
}): Promise<SendEmailResult> {
  const acceptUrl = `${APP_URL}/accept-invite/${encodeURIComponent(args.token)}`;
  const expires = args.expiresAt.toUTCString();

  const html = envelope(
    `You're invited to ${args.tenantName} on AssuredAI`,
    `
    <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">
      ${escapeHtml(args.inviterName || args.inviterEmail)} (${escapeHtml(args.inviterEmail)})
      added you as a <strong>${escapeHtml(args.role)}</strong> on
      <strong>${escapeHtml(args.tenantName)}</strong>.
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;color:#374151;">
      AssuredAI is the hash-chained verification layer ${escapeHtml(args.tenantName)} is
      using to govern AI-assisted content. Click below to set up your account.
    </p>
    <p style="margin:24px 0;">
      <a href="${acceptUrl}" style="display:inline-block;background:#0a0a0b;color:#fff;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">
        Accept invite & set password
      </a>
    </p>
    <p style="margin:16px 0 0 0;font-size:12.5px;color:#6b7280;">
      This link expires on ${expires}. If the button doesn't work, paste this URL into your
      browser:<br/>
      <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#374151;word-break:break-all;">${acceptUrl}</span>
    </p>
    <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;">
      Not expecting this? You can safely ignore the email — the invite expires automatically.
    </p>
    `,
  );

  return sendEmail({
    to: args.to,
    subject: `${args.inviterName || args.inviterEmail} invited you to ${args.tenantName} on AssuredAI`,
    html,
    replyTo: args.inviterEmail,
    tags: { type: 'teammate_invite' },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
