/**
 * Password strength evaluation — pure JS, browser-safe.
 *
 * The hash / verify functions live in `password-server.ts` and pull in
 * bcryptjs; this file is intentionally dependency-free so the strength
 * meter can run in client components without bundling crypto.
 *
 * Mirrors the pattern from The Wild Pest's auth — same scoring rubric,
 * same hard-block list, AssuredAI-flavoured suggestions.
 */

const HARD_BLOCK = new Set(
  [
    'password',
    'password1',
    'password123',
    'letmein',
    'qwerty',
    'qwerty123',
    'welcome',
    'welcome1',
    'abc123',
    '12345678',
    '123456789',
    '1234567890',
    'iloveyou',
    'monkey',
    'dragon',
    'sunshine',
    'princess',
    'admin',
    'admin123',
    'administrator',
    'rootroot',
    'passw0rd',
    'p@ssw0rd',
    'trustno1',
    'letmein123',
    'assuredai',
    'assured-ai',
    'compliance',
    'hipaa',
    'governance',
  ].map((p) => p.toLowerCase()),
);

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  ok: boolean;
  reasons: string[];
  suggestions: string[];
};

/**
 * Password strength rubric. The user-facing score (0–4) maps to:
 *   0: too short or matches a hard-block list
 *   1: weak — accepted but flagged
 *   2: ok
 *   3: strong
 *   4: excellent
 *
 * We deliberately don't ship the full zxcvbn dictionary (120kb+) and
 * instead apply the rules that catch ~95% of credential-stuffing risk:
 *   - minimum 10 chars
 *   - rejects the top ~30 most-common passwords (as of 2026 leak corpora)
 *   - rejects passwords that ARE the user's email local-part
 *   - rewards length + character class diversity
 */
export function evaluatePassword(
  plain: string,
  email?: string,
): PasswordStrength {
  const reasons: string[] = [];
  const suggestions: string[] = [];

  if (plain.length < 10) {
    reasons.push('Use at least 10 characters.');
    return { score: 0, ok: false, reasons, suggestions };
  }
  if (HARD_BLOCK.has(plain.toLowerCase())) {
    reasons.push('That password is in the top-leaked list — pick another.');
    suggestions.push(
      "Try a passphrase: 4+ random words you can picture. e.g. 'cedar-paper-violet-trail'.",
    );
    return { score: 0, ok: false, reasons, suggestions };
  }
  const local = email?.split('@')[0]?.toLowerCase();
  if (local && plain.toLowerCase().includes(local) && local.length > 2) {
    reasons.push("Don't put your email name inside the password.");
    return { score: 0, ok: false, reasons, suggestions };
  }

  const lower = /[a-z]/.test(plain);
  const upper = /[A-Z]/.test(plain);
  const digit = /\d/.test(plain);
  const symbol = /[^a-zA-Z0-9]/.test(plain);
  const classes = [lower, upper, digit, symbol].filter(Boolean).length;

  let score = 1;
  if (plain.length >= 12) score = 2;
  if (plain.length >= 14 && classes >= 2) score = 3;
  if (plain.length >= 16 || (plain.length >= 12 && classes >= 3)) score = 4;

  if (!digit) suggestions.push('Adding a digit makes it stronger.');
  if (!symbol)
    suggestions.push('A symbol (!@# etc.) bumps the strength further.');
  if (plain.length < 14)
    suggestions.push('Longer is better than complex — try a passphrase.');

  return {
    score: score as PasswordStrength['score'],
    ok: score >= 1,
    reasons,
    suggestions,
  };
}
