/**
 * Safe-redirect — defang open-redirect vectors.
 *
 * Without this, a phishing URL like
 *   https://assuredai.online/sign-in?callbackUrl=https://evil.com/login
 * would, after a successful login, bounce the user to evil.com — a
 * classic credential-harvesting flow.
 *
 * Rules:
 *   - The path MUST start with a single "/"
 *   - Reject "//" or "/\\" (protocol-relative URLs)
 *   - Reject "/" followed by a scheme like "/javascript:..." (paranoid)
 *   - Cap length so a callbackUrl can't be used to DoS a redirect chain
 *   - Optional second arg: an explicit fallback the caller wants
 *
 * The fallback is intentional — callers always pass a known-safe default
 * so a malformed callbackUrl never strands the user.
 */

export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback: string,
): string {
  if (!candidate) return fallback;
  if (typeof candidate !== 'string') return fallback;
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback;
  if (/^\/[a-z]+:/i.test(candidate)) return fallback;
  if (candidate.length > 1024) return fallback;
  return candidate;
}
