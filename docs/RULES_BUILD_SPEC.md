# AssuredAI — Build Spec for the 6 New Game Rules

> **Status:** Implementation-ready specification
> **Owner:** Mo (+ John)
> **Companion document:** [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md)
> **Codebase state assumed:** as of 2026-05-16, Next.js 16.2.5 App Router, Postgres 16 + pgvector on port 5434, Auth.js v5 (next-auth 5.0.0-beta.31), 11 migrations through `011_enterprise.sql`, `app/v/[id]/page.tsx` is the existing tenant-scoped proof URL, `app/api/wizard/sample/route.ts` is the existing SSE-streaming verifier with `VerifyProgressEvent` schema.

---

## 0. OVERVIEW

### The 6 rules (recap)

| # | Rule | Old → New | Effort |
|---|---|---|---|
| 1 | Verification is PUBLIC | Private dashboards → Public `/p/[hash]` proof URLs anyone can audit | **5–7 days** |
| 2 | Compliance FIXES the article | Flag for human → Auto-rewrite with diff approval | **8–12 days** |
| 3 | Verification is ADVERSARIAL | Find supporting RAG hits → Find supporting AND contradicting | **6–8 days** |
| 4 | Verification is EVERYWHERE | One CMS plugin → Universal textarea injection + tool-specific deep integrations | **8–10 days** |
| 5 | Compliance is PROGRAMMABLE | Buy a pack → Build, version, share, marketplace your packs | **10–14 days** |
| 6 | Verification is FREE for individuals | $50K enterprise minimum → Free tier + $29 / $99 / $999 / Enterprise | **5–7 days** |

**Total realistic effort for 1 senior engineer: ~45–60 working days (~9–12 weeks).** Roughly half can be parallelized between two engineers.

### Build order (with dependencies)

```
WEEK 1-2     RULE 1 (Public Proof URLs)  ──┐
                                            ├──→ RULE 6 (Free Tier) needs Rule 1 done
WEEK 2-3     RULE 6 (Free Tier Pricing)    ─┘
                                            
WEEK 3-5     RULE 2 (Fix-Not-Flag)         ──┐
                                              ├──→ RULE 3 reuses Rule 2's rewrite infra
WEEK 5-7     RULE 3 (Adversarial)          ──┘

WEEK 7-9     RULE 5 (Pack Marketplace)     ←── parallelizable with Rule 2/3

WEEK 9-11    RULE 4 (Extension Universal)  ←── needs Rule 1 for proof URL routing
```

### Dependency map

- **RULE 1** is the foundation. Everything else builds on the public `/p/[hash]` route, the anonymous rate-limited endpoint, and the new `public_proofs` table.
- **RULE 6** depends on Rule 1 (the free tier needs public verification working).
- **RULE 4** depends on Rule 1 (every extension verification produces a public proof URL).
- **RULE 2** is independent — can ship before Rule 1 if needed but loses share-ability.
- **RULE 3** extends Rule 2's rewrite infrastructure with counter-evidence.
- **RULE 5** is independent — can be built in parallel by a second engineer.

### Critical risks (read first)

| Risk | Severity | Mitigation |
|---|---|---|
| `audit_log` schema changes break hash chain | **CRITICAL** | NEVER alter columns inside `audit_log_hash_chain()` canonical. Add `public_proofs` as separate table that *references* `audit_log.id` |
| Anonymous public endpoint becomes free LLM-cost vector | **HIGH** | Strict IP rate-limit (already exists in `/api/wizard/sample`), Voyage embedding cache, cap input to 8K chars |
| Auto-rewrite (Rule 2) introduces hallucinations into "fixed" output | **HIGH** | Every rewrite must re-pass fact-check; reject if score drops; mark as `requires-editor-judgment` |
| Public pack marketplace becomes attack surface for malicious packs | **HIGH** | All packs sandbox-validated; recognizers run inside Presidio sidecar; LLM prompts schema-checked; community packs require human review before "Verified" flag |
| Pricing reorg breaks existing customer entitlements | **MEDIUM** | Grandfather all existing users into a `legacy_unlimited` tier; new tiers apply only to new signups |
| Extension cross-site script collides with host-page CSP | **MEDIUM** | Shadow DOM for all extension UI; never modify host page styles |

### Feature flag matrix (all rules ship behind flags)

| Flag | Rule | Default | Promotion criteria |
|---|---|---|---|
| `FEATURE_PUBLIC_PROOFS` | 1 | OFF in prod, ON in staging | 100 successful verifications, no PII leakage detected |
| `FEATURE_ANONYMOUS_VERIFIER` | 1 | OFF | After rate-limit load test passes |
| `FEATURE_AUTO_REWRITE` | 2 | OFF | After 50 internal QA passes, re-fact-check score never drops |
| `FEATURE_COUNTER_EVIDENCE` | 3 | OFF | After counter-search latency stays under 2s p95 |
| `FEATURE_EXTENSION_UNIVERSAL` | 4 | OFF | After v2 extension passes Chrome Web Store review |
| `FEATURE_PACK_MARKETPLACE` | 5 | OFF | After 5 internal packs roundtrip-export/import successfully |
| `FEATURE_PRICING_V2` | 6 | OFF | After Stripe webhook idempotency verified end-to-end |

Flag wiring: extend `lib/config.ts` to read these from env (`FEATURE_*=true|false`). Default `false`.

---

## 1. CROSS-CUTTING INFRASTRUCTURE

These primitives are used by multiple rules. Build them once.

### 1.1. Hash canonicalization for public proofs

The existing audit hash (Postgres trigger `audit_log_hash_chain()` at `packages/db/schema.sql:176-210`) is the source of truth. **Do not change it.** For public proof routing we expose `audit_log.hash` (lower-case 64-char hex SHA-256) as the public identifier.

**Public URL format:** `/p/<short>` where `<short>` is the first 12 chars of the hash (sufficient entropy for ~10^14 verifications; collisions resolved by appending `?v=<full>`).

**Edge case:** two different verifications could share the first 12 chars. The route handler does `SELECT id, hash FROM audit_log WHERE hash LIKE $1||'%' LIMIT 2`. If two rows: redirect to `/p/<short>?v=<full-of-correct>`.

### 1.2. Anonymous rate limiting

Pattern already exists in `lib/rate-limit.ts` (`checkRateLimit`, `clientKey`). Extend with two tiers:

```typescript
// lib/rate-limit.ts — add these export'd constants
export const RATE_LIMITS = {
  ANONYMOUS_VERIFY_PER_MIN: 2,
  ANONYMOUS_VERIFY_PER_DAY: 10,
  ANONYMOUS_VERIFY_MAX_CHARS: 8_000,
  FREE_ACCOUNT_VERIFY_PER_MIN: 5,
  FREE_ACCOUNT_VERIFY_PER_MONTH: 100,
  SOLO_TIER_VERIFY_PER_MIN: 20,
  TEAM_TIER_VERIFY_PER_MIN: 60,
  // ...
} as const;
```

Backed by Redis when `REDIS_URL` set, otherwise in-memory LRU (acceptable for early traffic).

### 1.3. Public-vs-private toggle on every verification

Every `verify` call gets a new optional input: `visibility: 'public' | 'private'`. Default = `'private'` for authenticated users, `'public'` for anonymous (anonymous can't choose private — that's the deal for the free tier).

Schema impact: `public_proofs` table (see Rule 1) stores `visibility` separately so the *proof URL* can be public even when the *tenant audit_log row* is private. This lets paid customers explicitly share specific verifications without sharing their whole audit history.

### 1.4. Telemetry events (PostHog or self-host)

Every rule emits standardized events. Add `lib/telemetry.ts`:

```typescript
export type TelemetryEvent =
  | { name: 'verify.started'; props: { mode: 'anonymous'|'free'|'paid'; pack_slug: string; input_chars: number } }
  | { name: 'verify.completed'; props: { audit_log_id: number; verdict: string; latency_ms: number; visibility: 'public'|'private' } }
  | { name: 'proof.viewed'; props: { hash_prefix: string; referrer: string|null; viewer_authenticated: boolean } }
  | { name: 'proof.shared'; props: { hash_prefix: string; channel: 'copy_link'|'embed'|'social' } }
  | { name: 'autofix.applied'; props: { audit_log_id: number; fix_count: number; rejected_count: number } }
  | { name: 'counter_evidence.found'; props: { audit_log_id: number; contradiction_score: number } }
  | { name: 'extension.injected'; props: { host: string; editor_type: string } }
  | { name: 'pack.created'; props: { pack_slug: string; tenant_id: string; from_template: string|null } }
  | { name: 'pack.installed'; props: { pack_slug: string; tenant_id: string; source: 'marketplace'|'import'|'fork' } }
  | { name: 'pricing.viewed'; props: { tier_clicked: string|null; source: 'home'|'admin'|'verify_limit' } };

export function track(event: TelemetryEvent, ctx?: { ip?: string; user_id?: string }): void;
```

---

## 2. RULE 1 — Public Verification + Proof URLs

### 2.1. Goal

Anyone, signed-out, can paste any URL or text into a public form and receive a cryptographically-anchored, shareable, third-party-verifiable proof URL. Every embedded "Verified by AssuredAI" badge on the web links back to a proof URL.

### 2.2. Effort

**5–7 days** for a single engineer. Two days for schema + backend, two days for routes + components, one day for the embed widget JS, one day for OG-image generation, half-day for SEO/JSON-LD, half-day for rollout/feature flag.

### 2.3. Schema changes

**Migration:** `packages/db/012_public_proofs.sql`

```sql
-- Migration 012: Public proof URLs

-- Tracks which audit_log rows are publicly viewable + accessed via /p/[hash].
-- Separate from audit_log so we never alter the hash-chain canonical.
CREATE TABLE IF NOT EXISTS public_proofs (
  id               BIGSERIAL PRIMARY KEY,
  audit_log_id     BIGINT NOT NULL REFERENCES audit_log(id) ON DELETE CASCADE,
  -- Denormalized from audit_log.hash for fast prefix lookup; immutable.
  hash             TEXT NOT NULL,
  hash_short       TEXT GENERATED ALWAYS AS (SUBSTRING(hash FROM 1 FOR 12)) STORED,
  -- 'anonymous' = created by anon endpoint, 'opt_in' = paid user explicitly shared.
  source           TEXT NOT NULL CHECK (source IN ('anonymous', 'opt_in')),
  -- Visibility distinct from source. Anonymous is always public; opt_in is public until revoked.
  visibility       TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'revoked')),
  -- For anonymous: stores hashed IP for abuse triage. Never store raw IP.
  ip_hash          TEXT,
  user_agent_hash  TEXT,
  -- For opt-in (paid users): which user opted in. NULL for anonymous.
  shared_by_user   UUID REFERENCES users(id) ON DELETE SET NULL,
  view_count       INTEGER NOT NULL DEFAULT 0,
  last_viewed_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_proofs_hash_short ON public_proofs (hash_short);
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_proofs_audit_log_id ON public_proofs (audit_log_id);
CREATE INDEX IF NOT EXISTS idx_public_proofs_created_at ON public_proofs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_proofs_visibility ON public_proofs (visibility) WHERE visibility = 'public';

-- Atomic view-count increment that also updates last_viewed_at.
CREATE OR REPLACE FUNCTION increment_proof_view(p_hash_short TEXT)
RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
BEGIN
  UPDATE public_proofs
     SET view_count = view_count + 1,
         last_viewed_at = NOW()
   WHERE hash_short = p_hash_short
     AND visibility = 'public'
   RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Anonymous verifications rate-limit table (also used by Rule 6).
CREATE TABLE IF NOT EXISTS anonymous_verifications (
  id             BIGSERIAL PRIMARY KEY,
  ip_hash        TEXT NOT NULL,
  user_agent_hash TEXT,
  audit_log_id   BIGINT REFERENCES audit_log(id) ON DELETE SET NULL,
  outcome        TEXT NOT NULL,
  input_chars    INTEGER NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anon_verify_ip_created
  ON anonymous_verifications (ip_hash, created_at DESC);

-- For RULE 1.5: aggregate stats for the public threat-intel dashboard.
CREATE MATERIALIZED VIEW IF NOT EXISTS public_proof_stats AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) AS total_verifications,
  COUNT(*) FILTER (WHERE audit_log_id IN
    (SELECT id FROM audit_log WHERE outcome = 'red_flag_escalation')) AS red_flag_count,
  COUNT(DISTINCT hash_short) AS unique_proofs,
  SUM(view_count) AS total_views
FROM public_proofs
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_public_proof_stats_day
  ON public_proof_stats (day);
```

**Migration safety:** This adds tables; it does NOT alter `audit_log`. Zero risk to existing hash chain. The materialized view refreshes via cron in Rule 1.5 (see below).

### 2.4. Backend: API endpoints

#### 2.4.1. `POST /api/verify/public` — anonymous verification

New file: `app/api/verify/public/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientKey, RATE_LIMITS } from '@/lib/rate-limit';
import { runVerifyLifecycle } from '@/lib/verification/lifecycle';
import { getPackBySlug } from '@/lib/packs/registry';
import { tenantForServiceCall } from '@/lib/tenants';
import { createPublicProof } from '@/lib/public-proofs';
import { hashIp, hashUserAgent } from '@/lib/utils';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RequestSchema = z.object({
  industry: z.enum(['healthcare', 'finance', 'government', 'legal']),
  // Either article text OR url. URL flow fetches + extracts with @mozilla/readability.
  article: z.string().min(80).max(RATE_LIMITS.ANONYMOUS_VERIFY_MAX_CHARS).optional(),
  url: z.string().url().optional(),
}).refine(d => d.article || d.url, { message: 'article or url required' });

export async function POST(req: NextRequest) {
  const config = getConfig();
  if (!config.FEATURE_ANONYMOUS_VERIFIER) {
    return NextResponse.json({ error: 'feature_disabled' }, { status: 503 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? clientKey(req);
  const ua = req.headers.get('user-agent') ?? '';

  // Two-tier rate limit
  const minOk = await checkRateLimit(`anon:min:${ip}`, RATE_LIMITS.ANONYMOUS_VERIFY_PER_MIN, 60);
  if (!minOk) return NextResponse.json({ error: 'rate_limit_minute' }, { status: 429 });

  const dayOk = await checkRateLimit(`anon:day:${ip}`, RATE_LIMITS.ANONYMOUS_VERIFY_PER_DAY, 86_400);
  if (!dayOk) return NextResponse.json({ error: 'rate_limit_day' }, { status: 429 });

  const body = RequestSchema.parse(await req.json());

  // If URL: fetch + extract (use existing scripts/check-light.mjs pattern via lib/url-fetch.ts)
  const article = body.article ?? await fetchArticleText(body.url!);
  if (article.length > RATE_LIMITS.ANONYMOUS_VERIFY_MAX_CHARS) {
    return NextResponse.json({ error: 'article_too_long' }, { status: 400 });
  }

  // Anonymous always uses the public-default tenant (a singleton 'anonymous' tenant
  // with no admin access). Create this tenant via migration.
  const tenant = await tenantForServiceCall('anonymous');
  const pack = await getPackBySlug(body.industry);
  if (!pack) return NextResponse.json({ error: 'unknown_pack' }, { status: 400 });

  const result = await runVerifyLifecycle({
    pack,
    tenant_id: tenant.id,
    user_session_id: null,
    input_mode: 'paste',
    article,
  });

  if (!result.ok) {
    return NextResponse.json({ error: 'verification_failed', detail: result }, { status: 502 });
  }

  // Always create a public proof for anonymous verifications.
  const proof = await createPublicProof({
    audit_log_id: result.audit_log_id,
    source: 'anonymous',
    ip_hash: hashIp(ip),
    user_agent_hash: hashUserAgent(ua),
  });

  return NextResponse.json({
    ok: true,
    proof_url: `${config.NEXT_PUBLIC_APP_URL}/p/${proof.hash_short}`,
    hash: proof.hash,
    verdict: result.verdict,
    summary: {
      paragraphs_total: result.report.paragraph_count,
      paragraphs_supported: result.report.supported_paragraph_count,
      paragraphs_unsourced: result.report.unsourced_paragraph_count,
      pii_redacted_input: result.report.pii_input_count,
      red_flag_triggered: result.report.red_flag_triggered ?? false,
      disclaimer_injected: result.report.disclaimer_injected,
    },
  });
}
```

**Reuses:** `runVerifyLifecycle`, `getPackBySlug`, `tenantForServiceCall`, `checkRateLimit`. Adds new `lib/public-proofs.ts` and `lib/url-fetch.ts`.

#### 2.4.2. `POST /api/verify/public/stream` — SSE variant for the home-page UI

Copy `app/api/wizard/sample/route.ts` to `app/api/verify/public/stream/route.ts`. Same SSE protocol, same `VerifyProgressEvent` events. Two changes:
1. Final `result` event includes `proof_url`.
2. Uses the `anonymous` tenant + `RATE_LIMITS.ANONYMOUS_*`.

The existing `/api/wizard/sample` keeps working for the wizard; the new endpoint is for the public hero. They share the underlying lifecycle.

#### 2.4.3. `POST /api/proofs/[hash]/share` — paid users opt-in

New file: `app/api/proofs/[hash]/share/route.ts`

```typescript
// POST {visibility: 'public'|'unlisted'|'revoked'}
// Auth required. Resolves audit_log by hash, checks tenant ownership, upserts public_proofs.
```

This is how paid users (Solo/Team/Publisher tiers) explicitly share a specific verification. The audit row stays private; only the chosen proof is exposed.

#### 2.4.4. `lib/public-proofs.ts` — helpers

```typescript
import '@/lib/server-only';
import { query } from '@/lib/db/client';

export interface PublicProofRow {
  id: number;
  audit_log_id: number;
  hash: string;
  hash_short: string;
  source: 'anonymous' | 'opt_in';
  visibility: 'public' | 'unlisted' | 'revoked';
  view_count: number;
  created_at: Date;
}

export async function createPublicProof(params: {
  audit_log_id: number;
  source: 'anonymous' | 'opt_in';
  ip_hash?: string;
  user_agent_hash?: string;
  shared_by_user?: string;
}): Promise<PublicProofRow> { /* ... */ }

export async function resolvePublicProofByShort(short: string): Promise<
  | { kind: 'found'; proof: PublicProofRow; audit: AuditRow }
  | { kind: 'collision'; matches: PublicProofRow[] }
  | { kind: 'not_found' }
> { /* SELECT ... WHERE hash_short = $1 LIMIT 2 */ }

export async function incrementProofView(short: string): Promise<void> {
  await query(`SELECT increment_proof_view($1)`, [short]);
}

export async function revokeProof(short: string, userId: string): Promise<void> { /* ... */ }
```

### 2.5. Frontend: public routes

#### 2.5.1. `app/p/[hash]/page.tsx` — the public proof page

```typescript
import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { resolvePublicProofByShort, incrementProofView } from '@/lib/public-proofs';
import { ProofPage } from '@/components/verify/ProofPage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ hash: string }> }): Promise<Metadata> {
  const { hash } = await params;
  const result = await resolvePublicProofByShort(hash);
  if (result.kind !== 'found') return { title: 'Verification not found · AssuredAI' };
  const { audit, proof } = result;
  const title = `Verified · ${audit.outcome === 'answered' ? 'Compliant' : 'Issues Found'} · AssuredAI`;
  const description = describeAudit(audit);
  return {
    title,
    description,
    openGraph: {
      title, description,
      images: [`/api/og/proof/${proof.hash_short}`],
      type: 'article',
    },
    twitter: { card: 'summary_large_image', images: [`/api/og/proof/${proof.hash_short}`] },
    other: {
      // JSON-LD for Google structured-data
      'application/ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ClaimReview',
        datePublished: audit.occurred_at.toISOString(),
        url: `https://assuredai.online/p/${proof.hash_short}`,
        author: { '@type': 'Organization', name: 'AssuredAI', url: 'https://assuredai.online' },
        // ...
      }),
    },
  };
}

export default async function PublicProofPage({ params, searchParams }: {
  params: Promise<{ hash: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { hash } = await params;
  const { v } = await searchParams;
  const result = await resolvePublicProofByShort(hash);

  if (result.kind === 'not_found') notFound();
  if (result.kind === 'collision') {
    // Need full hash to disambiguate
    if (!v) return <CollisionResolutionPage matches={result.matches} />;
    const exact = result.matches.find(m => m.hash === v);
    if (!exact) notFound();
    // Continue with exact
  }

  // Fire-and-forget view increment
  incrementProofView(hash).catch(() => {});

  return <ProofPage audit={...} proof={...} variant="public" />;
}
```

**Reuse:** existing `components/verify/ProofPage.tsx` (renders the audit). Add a `variant: 'public' | 'tenant'` prop. Public variant: no tenant chrome, shows "Verified by AssuredAI" branding strip, hides redacted-but-private fields.

#### 2.5.2. `app/api/og/proof/[hash]/route.tsx` — OG image generator

Uses Next.js's `ImageResponse` from `next/og`. Returns 1200×630 PNG showing:
- Big checkmark / cross icon based on outcome
- "Verified · Compliant" or "Verified · 3 issues" headline
- "X paragraphs sourced · Y redactions · Z citations"
- "AssuredAI" wordmark + chain icon
- Proof URL at bottom

```typescript
import { ImageResponse } from 'next/og';
import { resolvePublicProofByShort } from '@/lib/public-proofs';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

export default async function OGImage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const result = await resolvePublicProofByShort(hash);
  if (result.kind !== 'found') return new ImageResponse(<DefaultCard />, size);
  return new ImageResponse(<ProofCard audit={result.audit} proof={result.proof} />, size);
}
```

#### 2.5.3. Home-page hero rewire

Edit `components/marketing/Hero.tsx` — the existing live mini-verifier. Two changes:
1. After the SSE result event, show a prominent "Share this verification" with the proof URL.
2. Replace the demo CTA "Verify now" with a freeform input that accepts URL OR text.

The hero should also gain a 4th tab: **Verify a URL** (in addition to existing healthcare/finance/government/legal samples). Pasting any URL triggers `/api/verify/public/stream`.

#### 2.5.4. Embed widget — `public/verified.js`

Pure-JS, zero dependencies, ~3 KB minified. Customers drop into article footers:

```html
<script src="https://assuredai.online/verified.js" data-hash="0x4a7e8b" async></script>
```

Behavior:
1. On load, fetches `https://assuredai.online/api/proofs/<short>/summary` (lightweight JSON: outcome, date, view count, no PII).
2. Injects a Shadow-DOM-isolated badge: `✓ Verified by AssuredAI · 482 views`.
3. Click → opens `/p/<short>` in a new tab.
4. Hover → tooltip with one-line summary.

Implementation skeleton in `public/verified.js`:

```javascript
(function () {
  const tag = document.currentScript;
  const short = tag.getAttribute('data-hash');
  if (!short) return;

  const host = document.createElement('div');
  host.style.display = 'inline-block';
  tag.parentNode.insertBefore(host, tag.nextSibling);

  const shadow = host.attachShadow({ mode: 'closed' });
  // Inline CSS in shadow to avoid host-page conflict
  shadow.innerHTML = `<style>...</style><div class="loading">Loading...</div>`;

  fetch(`https://assuredai.online/api/proofs/${encodeURIComponent(short)}/summary`)
    .then(r => r.json())
    .then(data => render(shadow, data))
    .catch(() => render(shadow, { error: true }));

  function render(shadow, data) { /* swap innerHTML to badge */ }
})();
```

Also add the corresponding `app/api/proofs/[short]/summary/route.ts` — cheap GET that returns a tiny JSON for the widget.

### 2.6. RULE 1.5 — Public threat-intel dashboard (extension of Rule 1)

New route `app/threat-intel/page.tsx` showing aggregate, anonymized stats from `public_proof_stats` view:
- "X verifications today"
- "Top hallucinated topics this week" (cluster paragraph rejection reasons)
- "Y red-flag escalations triggered this month"

Cron at `app/api/cron/refresh-stats/route.ts` runs `REFRESH MATERIALIZED VIEW CONCURRENTLY public_proof_stats;` every hour. Add to `vercel.json` crons.

### 2.7. Tests

- **Unit:** `lib/public-proofs.test.ts` — create, resolve (found/collision/not_found), increment_view, revoke.
- **Integration:** `tests/api/verify-public.test.ts` — rate-limit ladders, URL-fetch path, malformed input, proof URL roundtrip.
- **E2E:** Playwright script that pastes a URL into the home hero, asserts SSE events stream, asserts the result includes a proof URL, follows the URL, asserts the proof page renders.
- **Visual:** OG image generation for 5 outcome variants (clean, unsourced, PHI-detected, red-flag, kill-switch).

### 2.8. Rollout

1. **Day 1:** Migration 012 applied to staging. `FEATURE_PUBLIC_PROOFS=true`. Internal team smoke-tests via staging URL.
2. **Day 2-3:** Backend endpoints + lib/public-proofs.ts. Internal CI tests pass.
3. **Day 4-5:** Frontend public route + OG image route + embed widget.
4. **Day 6:** Home-page hero rewire + threat-intel dashboard.
5. **Day 7:** Production cutover. `FEATURE_PUBLIC_PROOFS=true`, `FEATURE_ANONYMOUS_VERIFIER=true`. Monitor for 24 hours.

**Rollback:** Set both feature flags to `false`. Anonymous endpoint returns 503. Public proof URLs become 404. No data loss; tables remain.

### 2.9. Acceptance criteria

- [ ] Anonymous user can paste an article and receive a public proof URL in <30 seconds.
- [ ] Public proof URL renders without authentication, includes audit ID, hash, prev_hash, all citations, all redactions, paragraph annotations.
- [ ] OG image renders for every proof URL when shared on LinkedIn / Twitter / Slack.
- [ ] Embed widget loads <100ms, renders in Shadow DOM, doesn't conflict with host CSS.
- [ ] Rate limits enforce: 2/minute, 10/day per IP, 8K char max.
- [ ] Authenticated user can opt-in share a specific proof (and revoke later).
- [ ] Threat-intel dashboard refreshes hourly with non-zero data.
- [ ] Zero leakage of unredacted PII into public proof URL.

---

## 3. RULE 2 — Fix-Not-Flag Auto-Rewrite

### 3.1. Goal

Every detected compliance issue ships with a pre-computed fix the writer accepts with one click. Default state of compliance is "already fixed." Writers approve diffs, not problems.

### 3.2. Effort

**8–12 days.** Three days for the rewrite engine architecture, two days for the re-verification loop (so fixes don't introduce new hallucinations), three days for the diff UI, one day for the accept/undo trail, one day for tests.

### 3.3. Schema changes

**Migration:** `packages/db/013_auto_fix.sql`

```sql
-- Suggested fixes for an audit log entry. Computed at verify-time (Rule 2)
-- and surfaced in the diff UI.
CREATE TABLE IF NOT EXISTS suggested_fixes (
  id                  BIGSERIAL PRIMARY KEY,
  audit_log_id        BIGINT NOT NULL REFERENCES audit_log(id) ON DELETE CASCADE,
  -- Which paragraph in the original article (0-indexed).
  paragraph_index     INTEGER NOT NULL,
  -- What kind of issue this fixes.
  fix_kind            TEXT NOT NULL CHECK (fix_kind IN (
    'unsourced_paragraph',
    'pii_redaction',
    'missing_disclaimer',
    'red_flag_softening',
    'challenged_paragraph',   -- from Rule 3
    'plain_language',          -- from Rule 5 packs
    'section_508_alt_text'     -- from Rule 5 federal pack
  )),
  -- The verbatim text being replaced.
  original_text       TEXT NOT NULL,
  -- The suggested replacement.
  suggested_text      TEXT NOT NULL,
  -- For sourced fixes: which chunk_id was used as evidence.
  source_chunk_id     UUID REFERENCES source_chunks(id) ON DELETE SET NULL,
  -- LLM-generated explanation shown in the UI.
  rationale           TEXT,
  -- Confidence the fix is valid (0..1). Below 0.5 = surface as "review-required".
  confidence          NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  -- Did the rewrite re-pass fact-check? NULL = not yet re-checked.
  reverified_at       TIMESTAMPTZ,
  reverified_passed   BOOLEAN,
  -- Tracking the editor's choice.
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'rejected', 'modified', 'expired'
  )),
  accepted_by_user    UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at         TIMESTAMPTZ,
  final_text          TEXT,    -- Captures any user-edited final text
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggested_fixes_audit
  ON suggested_fixes (audit_log_id, paragraph_index);
CREATE INDEX IF NOT EXISTS idx_suggested_fixes_status
  ON suggested_fixes (status) WHERE status = 'pending';
```

### 3.4. Backend: rewrite engine

#### 3.4.1. `lib/verification/auto-rewrite.ts`

New file. The single rewrite engine, called from `lifecycle.ts`.

```typescript
import '@/lib/server-only';
import { logger } from '@/lib/logger';
import { getLlmProvider } from '@/lib/llm/provider';
import { embedQuery, vectorSearch } from '@/lib/retrieval';
import type { VerticalPackRow } from '@/lib/packs/types';
import type { ParagraphCheckResult } from './fact-check';
import { suggestFix as suggestUnsourcedFix } from './suggest-fix';
import { redact } from '@/lib/redaction/presidio-client';

export interface AutoRewriteParams {
  audit_log_id: number;
  pack: VerticalPackRow;
  paragraphs: string[];
  factCheck: ParagraphCheckResult[];
  piiResult: { entities: Array<{ start: number; end: number; type: string }> };
  redFlagResult: { triggered: boolean; phrase?: string; severity?: string };
  disclaimerResult: { present: boolean; injected: boolean; canonical_text: string };
}

export interface SuggestedFix {
  paragraph_index: number;
  fix_kind: 'unsourced_paragraph' | 'pii_redaction' | 'missing_disclaimer' | 'red_flag_softening' | 'challenged_paragraph';
  original_text: string;
  suggested_text: string;
  source_chunk_id?: string;
  rationale?: string;
  confidence: number;
  reverified_passed?: boolean;
}

export async function computeAutoRewrites(p: AutoRewriteParams): Promise<SuggestedFix[]> {
  const fixes: SuggestedFix[] = [];

  // 1. Unsourced paragraphs → suggest sourced rewrite (reuse existing suggest-fix.ts)
  for (const [i, check] of p.factCheck.entries()) {
    if (check.status === 'unsourced' && check.nearest_chunk_id) {
      const fix = await suggestUnsourcedFix({
        sentence: p.paragraphs[i],
        chunkId: check.nearest_chunk_id,
        pack: p.pack,
      });
      fixes.push({
        paragraph_index: i,
        fix_kind: 'unsourced_paragraph',
        original_text: p.paragraphs[i],
        suggested_text: fix.rewrite,
        source_chunk_id: fix.source.chunk_id,
        rationale: fix.notes ?? null,
        confidence: 0.85,
      });
    }
  }

  // 2. PII → suggest redacted version (Presidio already gives this for free)
  if (p.piiResult.entities.length > 0) {
    // For each paragraph containing PII, generate redacted version
    for (const [i, para] of p.paragraphs.entries()) {
      const paraStart = computeParagraphOffset(p.paragraphs, i);
      const paraEnd = paraStart + para.length;
      const inThisPara = p.piiResult.entities.filter(e => e.start >= paraStart && e.end <= paraEnd);
      if (inThisPara.length === 0) continue;

      const redacted = await redact({
        text: para,
        recognizers: p.pack.config.recognizers,
      });
      fixes.push({
        paragraph_index: i,
        fix_kind: 'pii_redaction',
        original_text: para,
        suggested_text: redacted.text,
        rationale: `Detected ${inThisPara.length} PII entities: ${inThisPara.map(e => e.type).join(', ')}`,
        confidence: 0.99,
      });
    }
  }

  // 3. Missing disclaimer → inject canonical text
  if (!p.disclaimerResult.present && !p.disclaimerResult.injected) {
    fixes.push({
      paragraph_index: p.paragraphs.length, // append as new paragraph
      fix_kind: 'missing_disclaimer',
      original_text: '',
      suggested_text: p.pack.config.disclaimer.canonical_text,
      rationale: `Required disclaimer for ${p.pack.name} content`,
      confidence: 1.0,
    });
  }

  // 4. Red-flag softening (only in non-emergency context, e.g. educational
  //    article about cardiac arrest that should NOT trigger 911 emergency
  //    block but DOES need careful framing)
  if (p.redFlagResult.triggered && p.redFlagResult.severity === 'review') {
    // For 'emergency' severity we hard-block earlier in the lifecycle.
    // 'review' = the article mentions a serious topic in an educational way.
    const para_idx = findParagraphContaining(p.paragraphs, p.redFlagResult.phrase!);
    const softened = await llmSoftenRedFlag({
      pack: p.pack,
      paragraph: p.paragraphs[para_idx],
      red_flag_phrase: p.redFlagResult.phrase!,
    });
    fixes.push({
      paragraph_index: para_idx,
      fix_kind: 'red_flag_softening',
      original_text: p.paragraphs[para_idx],
      suggested_text: softened.text,
      rationale: 'Softened phrasing around a medical red-flag topic per pack guidance',
      confidence: softened.confidence,
    });
  }

  // 5. Re-verify each rewrite. Fixes that introduce new hallucinations get marked.
  await Promise.all(fixes.map(async (fix) => {
    if (fix.fix_kind === 'pii_redaction' || fix.fix_kind === 'missing_disclaimer') {
      fix.reverified_passed = true;  // these are deterministic
      return;
    }
    const reCheck = await reverifyParagraph(fix.suggested_text, p.pack);
    fix.reverified_passed = reCheck.supported;
    if (!reCheck.supported) {
      // Demote confidence; surface in UI as "may need editor judgment"
      fix.confidence = Math.min(fix.confidence, 0.4);
      fix.rationale = (fix.rationale ?? '') +
        ' [WARNING: rewrite did not pass automatic re-verification — please review manually]';
    }
  }));

  return fixes;
}

async function reverifyParagraph(text: string, pack: VerticalPackRow): Promise<{ supported: boolean; score: number }> {
  const embedding = await embedQuery(text);
  const hits = await vectorSearch({
    embedding,
    top_k: 3,
    min_similarity: pack.config.default_min_similarity,
    pack_id: pack.id,
  });
  return { supported: hits.length > 0, score: hits[0]?.similarity ?? 0 };
}
```

#### 3.4.2. Integration into `lib/verification/lifecycle.ts`

In the lifecycle, after audit write succeeds, kick off auto-rewrite computation. Two modes:

**Mode A (synchronous, default for short articles):** rewrites computed inline before returning to the client. Latency cost: 3-8 seconds depending on number of fixes.

**Mode B (async, for long articles or batch):** lifecycle returns immediately; rewrites computed in background; client polls `/api/audits/[id]/fixes` for status.

Add to `VerifyRequest`:

```typescript
export interface VerifyRequest {
  // ...existing fields
  auto_rewrite_mode?: 'sync' | 'async' | 'off'; // default: 'sync' if FEATURE_AUTO_REWRITE
}
```

Lifecycle change (pseudo):

```typescript
// After audit write
if (request.auto_rewrite_mode !== 'off' && getConfig().FEATURE_AUTO_REWRITE) {
  if (request.auto_rewrite_mode === 'async' || article.length > 4000) {
    queueAutoRewrite({ audit_log_id, pack, paragraphs, factCheck, piiResult, ... });
    response.auto_rewrite_status = 'pending';
  } else {
    const fixes = await computeAutoRewrites({ /* ... */ });
    await persistFixes(audit_log_id, fixes);
    response.auto_rewrite_status = 'computed';
    response.fixes = fixes;
  }
}
```

#### 3.4.3. `POST /api/audits/[id]/fixes/[fixId]/accept` — accept an individual fix

New file: `app/api/audits/[id]/fixes/[fixId]/accept/route.ts`

Body: `{ final_text?: string }` — optional editor override. If provided, stored as `final_text` and `status = 'modified'`. Otherwise `status = 'accepted'` and `final_text = suggested_text`.

Also `POST /api/audits/[id]/fixes/bulk` — accept multiple in one call.

#### 3.4.4. `POST /api/audits/[id]/finalize` — generate the publish-ready output

Once all fixes are accepted/rejected, this endpoint generates:
- Final article text (with all accepted fixes applied)
- A NEW audit_log entry referencing the original via `verification_detail.original_audit_id`
- A new public proof URL for the finalized version

The chain captures: original → fixes applied → finalized. The proof URL shows both states with diff highlighting.

### 3.5. Frontend: diff UI

#### 3.5.1. Extend `components/verify/VerifyInterface.tsx`

After result renders, when fixes exist, show a new section: **"AssuredAI can fix 7 of 12 issues automatically."**

#### 3.5.2. New component: `components/verify/FixDiffPanel.tsx`

```tsx
interface Props {
  audit_log_id: number;
  paragraphs: string[];
  fixes: SuggestedFix[];
  onAcceptAll: () => Promise<void>;
  onAccept: (fixId: number, finalText?: string) => Promise<void>;
  onReject: (fixId: number) => Promise<void>;
  onFinalize: () => Promise<{ proof_url: string }>;
}
```

UI:
- Per-fix card: left column shows original text (red strike-through), right column shows suggested text (green). Inline diff for shorter fixes.
- "Accept" / "Reject" / "Edit" buttons per fix.
- "Edit" opens an inline textarea; saving sends `final_text` to the accept endpoint.
- Sticky footer: "Accept all" (only for high-confidence fixes ≥0.7), "Finalize & Publish."
- Live counter at top: "5 accepted / 1 rejected / 1 edited / 5 pending."
- Banner if any fix has `reverified_passed === false`: "⚠ 1 fix needs your judgment — automatic re-verification couldn't confirm the rewrite."

#### 3.5.3. Library: diff rendering

Use `diff-match-patch` (lightweight, deterministic). Render at word-level granularity. Fall back to paragraph-level for fixes that are full rewrites.

### 3.6. Tests

- **Unit:** `lib/verification/auto-rewrite.test.ts` — each fix kind, re-verification logic, paragraph-offset math.
- **Integration:** `tests/api/auto-rewrite.test.ts` — full lifecycle with auto-rewrite on, assert fixes persist, accept/reject/finalize flows.
- **Safety:** dedicated test that feeds an article designed to trip auto-rewrite into hallucination (e.g., medical claim with no library support). Assert `reverified_passed = false` and confidence ≤0.4.
- **E2E:** Playwright — verify article → see fix panel → accept all → finalize → land on proof URL.

### 3.7. Rollout

1. **Day 1-3:** Migration 013 + `lib/verification/auto-rewrite.ts` + integration into lifecycle.
2. **Day 4-5:** API endpoints (accept, bulk, finalize).
3. **Day 6-8:** `FixDiffPanel.tsx` + integration with `VerifyInterface.tsx`.
4. **Day 9:** Re-verification safety tests + soak test on internal corpus.
5. **Day 10-11:** Internal QA — staff verifies 50 articles, reviews every auto-fix manually. Track false-fix rate. Block release if > 5%.
6. **Day 12:** `FEATURE_AUTO_REWRITE=true` in production. Monitor.

**Rollback:** Set flag false. Existing fixes data remains; just stops computing new ones. UI gracefully hides the panel when no fixes exist.

### 3.8. Acceptance criteria

- [ ] Every detected issue with a deterministic remediation (PHI, missing disclaimer) generates a fix.
- [ ] Every LLM-generated rewrite is re-verified; failures are marked confidence ≤0.4.
- [ ] Editor can accept, reject, edit, or bulk-accept fixes.
- [ ] Finalize generates a new audit + proof URL chained to the original.
- [ ] No accepted fix ever introduces an unsourced claim (enforced by re-verification gate).
- [ ] Diff UI handles articles up to 8K words without performance degradation.

---

## 4. RULE 3 — Adversarial Counter-Evidence

### 4.1. Goal

Every claim runs through TWO retrievals: one for supporting evidence, one for contradicting. Both get cited. The editor sees both. The audit captures both.

### 4.2. Effort

**6–8 days.** Two days for the counter-evidence retrieval primitive, two days for the schema + scoring, two days for the UI (challenged tier + claim/counter cards), one day for the weekly cron + public dashboard, one day for tests.

### 4.3. Schema changes

**Migration:** `packages/db/014_counter_evidence.sql`

```sql
-- Per-paragraph contradiction findings from Rule 3.
CREATE TABLE IF NOT EXISTS paragraph_contradictions (
  id                  BIGSERIAL PRIMARY KEY,
  audit_log_id        BIGINT NOT NULL REFERENCES audit_log(id) ON DELETE CASCADE,
  paragraph_index     INTEGER NOT NULL,
  -- The chunk that contradicts the claim.
  contradicting_chunk_id UUID NOT NULL REFERENCES source_chunks(id) ON DELETE CASCADE,
  -- Cosine similarity of the NEGATED-paragraph embedding against this chunk.
  contradiction_score NUMERIC(5,4) NOT NULL,
  -- LLM-generated 1-line explanation: "Your claim says X; this 2024 source says Y."
  explanation         TEXT NOT NULL,
  -- Editor's resolution: which source won. NULL = unresolved.
  editor_resolution   TEXT CHECK (editor_resolution IN ('claim_wins', 'counter_wins', 'both_cited', 'unresolved')),
  resolved_by_user    UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_para_contradictions_audit
  ON paragraph_contradictions (audit_log_id);
CREATE INDEX IF NOT EXISTS idx_para_contradictions_score
  ON paragraph_contradictions (contradiction_score DESC);

-- Aggregate of contradictions across all tenants (anonymized). Powers RULE 3.5
-- public contradictions database.
CREATE MATERIALIZED VIEW IF NOT EXISTS public_contradictions_stats AS
SELECT
  DATE_TRUNC('week', pc.created_at) AS week,
  s.organization AS contradicting_organization,
  -- Topic clustering: derived from the chunk's title/section.
  -- For Phase 1, just group by chunk topic_tag (if set).
  COALESCE(s.topic_tag, 'other') AS topic,
  COUNT(*) AS contradiction_count,
  AVG(pc.contradiction_score) AS avg_score
FROM paragraph_contradictions pc
JOIN source_chunks sc ON sc.id = pc.contradicting_chunk_id
JOIN sources s ON s.id = sc.source_id
WHERE pc.created_at > NOW() - INTERVAL '90 days'
GROUP BY 1, 2, 3;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pub_contradictions_idx
  ON public_contradictions_stats (week, contradicting_organization, topic);
```

Note: `sources.topic_tag` may not exist; add it in this migration if absent:
```sql
ALTER TABLE sources ADD COLUMN IF NOT EXISTS topic_tag TEXT;
```

### 4.4. Backend: counter-evidence retrieval

#### 4.4.1. `lib/verification/counter-evidence.ts`

```typescript
import '@/lib/server-only';
import { logger } from '@/lib/logger';
import { getLlmProvider } from '@/lib/llm/provider';
import { embedQuery, vectorSearch } from '@/lib/retrieval';
import type { VerticalPackRow } from '@/lib/packs/types';

export interface CounterEvidence {
  paragraph_index: number;
  contradicting_chunk_id: string;
  contradiction_score: number;
  explanation: string;
}

export async function findCounterEvidence(params: {
  paragraphs: string[];
  pack: VerticalPackRow;
  /** Skip paragraphs where this index returned status='supported' to save cost. */
  supportedIndices?: Set<number>;
}): Promise<CounterEvidence[]> {
  const llm = getLlmProvider();
  const results: CounterEvidence[] = [];

  for (let i = 0; i < params.paragraphs.length; i++) {
    if (params.supportedIndices?.has(i)) {
      // For supported paragraphs we STILL search for counters — that's the whole point.
      // But skip for cost reasons if pack config opts out.
      if (!params.pack.config.counter_evidence_for_supported) continue;
    }

    const negated = await generateNegation(llm, params.paragraphs[i]);
    const negEmbedding = await embedQuery(negated);
    const hits = await vectorSearch({
      embedding: negEmbedding,
      top_k: 3,
      min_similarity: params.pack.config.default_min_similarity,
      pack_id: params.pack.id,
      // exclude the same chunk that supports the claim (avoid spurious self-contradictions)
      exclude_chunk_ids: getSupportingChunkIds(i),
    });

    for (const hit of hits) {
      // Use a fast classifier to verify it actually contradicts (not just similar).
      const verdict = await classifyContradiction(llm, params.paragraphs[i], hit.content);
      if (verdict.is_contradiction && verdict.confidence > 0.6) {
        results.push({
          paragraph_index: i,
          contradicting_chunk_id: hit.chunk_id,
          contradiction_score: hit.similarity * verdict.confidence,
          explanation: verdict.explanation,
        });
      }
    }
  }
  return results;
}

async function generateNegation(llm: LlmProvider, text: string): Promise<string> {
  // Prompt: "Restate this in the form a contradicting study would phrase it.
  //         Output only the restatement, no preamble."
  const out = await llm.complete({
    model: getConfig().ANTHROPIC_CLASSIFIER_MODEL,
    max_tokens: 200,
    prompt: NEGATION_PROMPT.replace('{text}', text),
  });
  return out.trim();
}

async function classifyContradiction(llm: LlmProvider, claim: string, candidate: string): Promise<{
  is_contradiction: boolean;
  confidence: number;
  explanation: string;
}> {
  // Structured-output prompt that returns JSON schema-validated result.
  // Reuses the same JsonSchemaViolation gate the lifecycle already uses.
}
```

#### 4.4.2. Integration into lifecycle

After fact-check, add the counter-evidence pass (behind feature flag):

```typescript
// In lib/verification/lifecycle.ts, after factCheck
if (getConfig().FEATURE_COUNTER_EVIDENCE && pack.config.counter_evidence_enabled !== false) {
  emitProgress({ phase: 'counter_evidence_begin', paragraphs: paragraphs.length });
  const counter = await findCounterEvidence({ paragraphs, pack, supportedIndices });
  emitProgress({ phase: 'counter_evidence_complete', contradictions_found: counter.length });
  await persistContradictions(audit_log_id, counter);

  // Promote paragraphs with contradictions to status='challenged' in the report.
  for (const c of counter) {
    factCheck[c.paragraph_index].status = 'challenged';
    factCheck[c.paragraph_index].contradicting_chunk_id = c.contradicting_chunk_id;
    factCheck[c.paragraph_index].contradiction_explanation = c.explanation;
  }
}
```

Extend `ParagraphCheckResult.status` to include `'challenged'`. Update `VerifyProgressEvent` to include the new `counter_evidence_*` phases. SSE clients (home hero, wizard) receive them automatically.

#### 4.4.3. Pack config addition

Extend `VerticalPackConfig` in `lib/packs/types.ts`:

```typescript
export interface VerticalPackConfig {
  // ...existing fields
  counter_evidence_enabled?: boolean;         // default true
  counter_evidence_for_supported?: boolean;    // default false (cost)
  contradiction_min_confidence?: number;       // default 0.6
}
```

#### 4.4.4. `POST /api/audits/[id]/contradictions/[contradictionId]/resolve` — editor resolves

Body: `{ resolution: 'claim_wins' | 'counter_wins' | 'both_cited' }`. Updates `paragraph_contradictions` row. If `both_cited`, the next finalize will inject both citations into the article.

### 4.5. Frontend: 3-tier color + claim/counter cards

#### 4.5.1. Extend `components/verify/ProofPage.tsx` and `VerifyInterface.tsx`

The paragraph annotation today has two states (sourced/unsourced). Add third:
- `green` = sourced, no contradictions
- `yellow` = unsourced
- `red` = **challenged** (contradicting evidence found)

For `red` paragraphs, render a `ChallengedCard`:

```tsx
<ChallengedCard
  claim={paragraph.text}
  counter={{
    chunk_id,
    source_organization: 'Lancet',
    source_title: 'Lifestyle vs Metformin in Mild T2D',
    source_url: 'https://...',
    excerpt: '...the relevant 2024 finding...',
    explanation: 'Your claim recommends immediate metformin; this source supports lifestyle-first.',
  }}
  resolution={paragraph.contradiction.editor_resolution}
  onResolve={(r) => api.resolveContradiction(audit_log_id, contradiction_id, r)}
/>
```

Three buttons: "My claim is right" (claim_wins), "The counter is right" (counter_wins), "Cite both" (both_cited).

#### 4.5.2. Counter-evidence in the Fix Panel (Rule 2 integration)

`challenged` paragraphs get a new fix kind: `challenged_paragraph`. The fix is the rewrite that reconciles both sources or defers to the newer one.

### 4.6. RULE 3.5 — Public contradictions database

New route `app/contradictions/page.tsx` (and `app/contradictions/[topic]/page.tsx`):

```
This week: 847 AI-generated paragraphs found to contradict newer evidence.

Top contradictions by topic:
- Weight-loss medications (231 instances) — most cited counter-source: 2024 NEJM
- Cardiovascular guidelines (148) — most cited counter-source: 2024 AHA update
- Diabetes T2D management (94) — most cited counter-source: 2024 Lancet
```

Each link drills into anonymized examples (paragraph text only, no tenant attribution). Refreshed by cron at `app/api/cron/contradictions-refresh/route.ts`.

### 4.7. Tests

- **Unit:** negation prompt produces sensible negations; classifier rejects false-positive contradictions; cosine-on-negation retrieves expected chunks for a hand-crafted corpus.
- **Integration:** verify article designed to have BOTH supporting AND contradicting library hits, assert challenged status, assert paragraph_contradictions row created.
- **Cost:** load test that counter-evidence pass adds <2s p95 to verify latency and <2× embedding spend.

### 4.8. Rollout

1. **Day 1-2:** Migration 014 + `lib/verification/counter-evidence.ts`.
2. **Day 3-4:** Lifecycle integration + pack config additions.
3. **Day 5-6:** Frontend `ChallengedCard` + resolve API + ProofPage updates.
4. **Day 7:** Public contradictions database + cron.
5. **Day 8:** Internal QA + production rollout behind `FEATURE_COUNTER_EVIDENCE=true`.

### 4.9. Acceptance criteria

- [ ] Every paragraph receives both supporting AND counter-evidence search.
- [ ] Contradictions persist with explanation + score + source citation.
- [ ] Editor can resolve contradictions (3 ways) and resolution persists.
- [ ] Public contradictions database refreshes weekly with non-zero data once 50+ verifications exist.
- [ ] Counter-evidence pass adds < 2s p95 to lifecycle latency.
- [ ] Per-verification cost increase < 2× (limit: 1 negation LLM call + N classification calls).

---

## 5. RULE 4 — Universal Browser Extension

### 5.1. Goal

The extension verifies wherever a person writes: Google Docs, Notion, ChatGPT, Claude.ai, Substack, Medium, LinkedIn, Word Online, Outlook compose, Slack, any textarea anywhere. Verification is ambient.

### 5.2. Effort

**8–10 days.** Two days for universal textarea injection, three days for tool-specific deep integrations (5 priority sites), one day for the bookmarklet, two days for passive background verification, one day for the Chrome Web Store v2 review submission, one day for tests.

### 5.3. Extension manifest changes

Edit `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "AssuredAI Verifier",
  "version": "0.2.0",
  "description": "Verify any AI-generated content for compliance — directly in Google Docs, ChatGPT, Claude, Notion, Substack, WordPress, or any web editor.",
  "permissions": ["storage", "activeTab", "scripting", "contextMenus", "tabs"],
  "host_permissions": [
    "http://localhost:3030/*",
    "https://assuredai.online/*",
    "https://*/*"
  ],
  "background": { "service_worker": "background.js", "type": "module" },
  "action": {
    "default_popup": "popup.html",
    "default_title": "Verify with AssuredAI"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    },
    {
      "matches": [
        "https://chat.openai.com/*",
        "https://chatgpt.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*"
      ],
      "js": ["adapters/assistants.js"],
      "run_at": "document_end"
    },
    {
      "matches": ["https://docs.google.com/document/*"],
      "js": ["adapters/google-docs.js"],
      "run_at": "document_end"
    },
    {
      "matches": ["https://www.notion.so/*", "https://notion.so/*"],
      "js": ["adapters/notion.js"],
      "run_at": "document_end"
    },
    {
      "matches": [
        "https://*.wordpress.com/wp-admin/*",
        "https://substack.com/*",
        "https://*.substack.com/*",
        "https://medium.com/*",
        "https://*.linkedin.com/*"
      ],
      "js": ["adapters/cms.js"],
      "run_at": "document_end"
    }
  ],
  "web_accessible_resources": [{
    "resources": ["sidebar.html", "assets/*"],
    "matches": ["<all_urls>"]
  }],
  "commands": {
    "verify_selection": {
      "suggested_key": { "default": "Ctrl+Shift+V", "mac": "Command+Shift+V" },
      "description": "Verify highlighted text with AssuredAI"
    },
    "verify_page": {
      "suggested_key": { "default": "Ctrl+Shift+P", "mac": "Command+Shift+P" },
      "description": "Verify the entire current page or document"
    }
  }
}
```

Key change: `"matches": ["<all_urls>"]` for the universal content script. This requires Chrome Web Store review — be ready to justify in submission ("verification of user-selected text on any page, with explicit user opt-in").

### 5.4. Universal textarea injection

New file: `extension/content.js` (rewrite).

```javascript
(function () {
  if (window.__assuredAiInjected) return;
  window.__assuredAiInjected = true;

  const MIN_CHARS = 200;
  const POLL_MS = 1500;
  let floatingTrigger = null;
  let sidebarFrame = null;

  // 1. Detect active editor on the page.
  // Strategy: poll for focused [contenteditable] or textarea with > MIN_CHARS.
  let lastDetected = null;
  setInterval(detectActiveEditor, POLL_MS);

  function detectActiveEditor() {
    const focused = document.activeElement;
    if (!focused) return hideFloatingTrigger();

    const text = extractEditorText(focused);
    if (!text || text.length < MIN_CHARS) return hideFloatingTrigger();

    if (lastDetected === focused) return;  // already showing
    lastDetected = focused;
    showFloatingTrigger(focused, text);
  }

  function extractEditorText(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value;
    if (el.isContentEditable) return el.innerText;
    return null;
  }

  // 2. Floating "Verify" button anchored to the editor.
  function showFloatingTrigger(editor, text) {
    // ... Shadow-DOM-isolated <div> with Verify button + char count
  }

  // 3. Sidebar that streams verification results.
  function openSidebar(text) {
    if (!sidebarFrame) {
      sidebarFrame = document.createElement('iframe');
      sidebarFrame.src = chrome.runtime.getURL('sidebar.html');
      sidebarFrame.style.cssText = `
        position: fixed; top: 0; right: 0; width: 420px; height: 100vh;
        border: none; z-index: 2147483647; box-shadow: -4px 0 12px rgba(0,0,0,0.1);
      `;
      document.body.appendChild(sidebarFrame);
    }
    // Post message with text to verify
    sidebarFrame.contentWindow.postMessage({
      type: 'assured-ai/verify',
      text,
      origin: window.location.origin,
    }, '*');
  }

  // 4. Selection-based trigger (existing behavior, preserved).
  document.addEventListener('mouseup', handleSelection, true);
  document.addEventListener('keyup', handleSelection, true);

  function handleSelection(e) { /* ... existing logic ... */ }
})();
```

New file: `extension/sidebar.html` + `extension/sidebar.js` + `extension/sidebar.css`.

The sidebar is a Shadow-DOM-isolated iframe that:
1. Receives text via postMessage.
2. Calls `https://assuredai.online/api/verify/public/stream` (anonymous SSE).
3. Streams progress events into a live log.
4. On result, shows verdict + proof URL with copy-to-clipboard + "Open report" button.
5. If user is signed in (extension stores their session token in `chrome.storage.local`), uses the authenticated endpoint instead, gets the higher rate limit.

### 5.5. Tool-specific deep integrations

Each adapter is a small content script with site-specific selectors. Examples:

#### 5.5.1. `extension/adapters/assistants.js` — ChatGPT, Claude, Gemini

```javascript
// Observe DOM for new assistant messages. Inject a "Verify" badge under each one.

const ADAPTERS = {
  'chatgpt.com': {
    messageSelector: '[data-message-author-role="assistant"]',
    textExtractor: (el) => el.querySelector('.markdown')?.innerText ?? '',
  },
  'claude.ai': {
    messageSelector: '[data-testid="claude-message"]',
    textExtractor: (el) => el.innerText,
  },
  'gemini.google.com': {
    messageSelector: 'model-response',
    textExtractor: (el) => el.innerText,
  },
};

const adapter = ADAPTERS[window.location.host];
if (!adapter) return;

const observer = new MutationObserver(() => {
  document.querySelectorAll(adapter.messageSelector).forEach(injectBadge);
});
observer.observe(document.body, { childList: true, subtree: true });

function injectBadge(el) {
  if (el.dataset.assuredAiBadged) return;
  el.dataset.assuredAiBadged = '1';

  const badge = document.createElement('div');
  badge.className = 'assured-ai-badge';
  badge.innerHTML = '✓ Verify with AssuredAI';
  badge.onclick = () => openSidebar(adapter.textExtractor(el));
  el.appendChild(badge);
}
```

Each assistant adapter pattern is small (~50 LOC). Add one per priority site.

#### 5.5.2. `extension/adapters/google-docs.js`

Google Docs runs in a complex iframe-heavy SPA. Use the Docs API offscreen approach:
1. Detect doc ID from URL.
2. Show a sidebar button "Verify this doc."
3. On click, ask user to grant docs.googleapis.com OAuth (one-time), use Docs API to fetch full document text.
4. Verify via standard endpoint.

If Google Docs API integration is too heavy for v0.2.0, fall back to: user selects all text manually (Ctrl+A), uses the keyboard shortcut Ctrl+Shift+V, sidebar verifies the selection.

#### 5.5.3. `extension/adapters/notion.js`

Notion has a public Web Clipper pattern that works: poll the active block, use `document.activeElement` of `.notion-page-content`. Use the same textarea-injection logic as the universal script, but tuned to Notion's selectors.

#### 5.5.4. `extension/adapters/cms.js` — WordPress, Substack, Medium, LinkedIn

Editor selectors per host:
- WordPress: `#postdivrich textarea`, or Block Editor `.block-editor-rich-text__editable`
- Substack: `[contenteditable].editor`
- Medium: `[contenteditable].section-content`
- LinkedIn: `[contenteditable].editor-content`

Same pattern: detect editor, show inject button, on click send text to sidebar.

### 5.6. Bookmarklet

For users on browsers without extension support (Safari mobile, locked corporate laptops):

```javascript
// Add to /bookmarklet page on the marketing site.
javascript:(function(){
  const text = window.getSelection().toString() || document.body.innerText.slice(0, 8000);
  const w = window.open(
    'https://assuredai.online/verify?bookmarklet=1&text=' + encodeURIComponent(text),
    '_blank',
    'width=600,height=800'
  );
})();
```

Add `app/verify/page.tsx` to handle the `?bookmarklet=1` query param: pre-populate the verifier and start verification immediately.

### 5.7. Passive background verification

Optional feature (off by default; user opts in via popup): the extension silently verifies the AI-generated content the user *views* (not just writes).

Approach:
1. When user lands on a page detected as AI-generated content (heuristic: meta tags, presence of "Written by AI" footer, or known publisher URL pattern), check the local extension cache.
2. If the page URL has been verified before (by ANYONE on the public registry), show the badge.
3. Cache is local Bloom filter synced from a public endpoint `GET /api/proofs/registry/bloom` daily.

This compounds the network effect: every public verification benefits every extension user.

### 5.8. Chrome Web Store submission

Update store listing v0.2.0 with:
- New screenshots (sidebar, ChatGPT badge, contradiction view)
- Privacy disclosure: "Sends text user has explicitly selected or that they've explicitly clicked Verify on. Never reads pages passively without user action (unless passive mode is enabled in extension settings)."
- New permissions justification for `<all_urls>` and `tabs`.

Allow 7–10 days for Chrome Web Store review. Submit to staging build first.

### 5.9. Tests

- **Unit:** adapter selectors against snapshots of each target site's DOM.
- **Manual QA matrix:** verify a 200-word draft in each of: ChatGPT, Claude.ai, Gemini, Google Docs, Notion, Substack, Medium, LinkedIn, WordPress Block Editor, Outlook Web, Gmail compose, plain `<textarea>` on a test page.
- **Performance:** sidebar opens in <300ms; verification completes in <10s for typical short article.
- **Security:** Shadow DOM isolation tested against host pages with hostile CSS overrides.

### 5.10. Rollout

1. **Day 1-2:** Universal `content.js` + `sidebar.html`/sidebar.js.
2. **Day 3-5:** Adapters for ChatGPT, Claude, Gemini, Notion, CMS sites.
3. **Day 6:** Google Docs adapter (or fallback selection-based path).
4. **Day 7:** Bookmarklet + `/verify?bookmarklet=1` route.
5. **Day 8-9:** Passive mode + bloom-filter registry endpoint.
6. **Day 10:** Submit v0.2.0 to Chrome Web Store. Soft-launch on staging URL meanwhile.

### 5.11. Acceptance criteria

- [ ] Extension v0.2.0 reviewed and live in Chrome Web Store.
- [ ] Verifier injects on all 10 priority editors with correct text extraction.
- [ ] Sidebar opens, streams SSE progress, shows proof URL with copy-to-clipboard.
- [ ] Keyboard shortcut Ctrl+Shift+V always works regardless of host page.
- [ ] Passive mode (off by default) correctly identifies pre-verified pages.
- [ ] Zero CSP violations on top 100 web destinations.
- [ ] Extension popup shows daily verification count + free-tier remaining.

---

## 6. RULE 5 — Pack Editor + Marketplace

### 6.1. Goal

Customers build their own packs in a visual editor. Packs are versioned, shareable, importable, exportable. The best community packs are open. Marketplace optional Phase 2.

### 6.2. Effort

**10–14 days.** Three days for pack versioning + the new tables, four days for the visual editor UI (recognizers, red-flag rules, disclaimer, source library, voice prompt, thresholds tabs), two days for import/export, two days for the public `/packs` registry, one day for the "Build with AI" assistant, one day for tests, one day for polish.

### 6.3. Schema changes

**Migration:** `packages/db/015_pack_versions.sql`

```sql
-- Pack version history. Every change to vertical_packs.config creates a row here.
CREATE TABLE IF NOT EXISTS vertical_pack_versions (
  id              BIGSERIAL PRIMARY KEY,
  pack_id         UUID NOT NULL REFERENCES vertical_packs(id) ON DELETE CASCADE,
  version         TEXT NOT NULL,        -- semver: 1.0.0, 1.0.1, 1.1.0, 2.0.0
  config          JSONB NOT NULL,
  config_hash     TEXT GENERATED ALWAYS AS (encode(digest(config::text, 'sha256'), 'hex')) STORED,
  changelog       TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pack_id, version)
);
CREATE INDEX IF NOT EXISTS idx_pack_versions_pack_created
  ON vertical_pack_versions (pack_id, created_at DESC);

-- The marketplace (Phase 1 = read-only curated, Phase 2 = community-submittable).
CREATE TABLE IF NOT EXISTS pack_marketplace (
  id              BIGSERIAL PRIMARY KEY,
  pack_id         UUID NOT NULL REFERENCES vertical_packs(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  vertical        TEXT NOT NULL,
  -- 'verified' = curated by AssuredAI, 'community' = submitted by user, 'official' = from a recognized authority (CDC, FDA, etc.)
  curation_status TEXT NOT NULL DEFAULT 'community' CHECK (curation_status IN ('verified', 'community', 'official')),
  author_name     TEXT,
  author_url      TEXT,
  install_count   INTEGER NOT NULL DEFAULT 0,
  fork_count      INTEGER NOT NULL DEFAULT 0,
  is_public       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pack_marketplace_vertical ON pack_marketplace (vertical);
CREATE INDEX IF NOT EXISTS idx_pack_marketplace_curation ON pack_marketplace (curation_status);

-- Track installs (so tenants can fork the latest version of a marketplace pack).
CREATE TABLE IF NOT EXISTS pack_installations (
  id                  BIGSERIAL PRIMARY KEY,
  marketplace_pack_id BIGINT NOT NULL REFERENCES pack_marketplace(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  forked_pack_id      UUID REFERENCES vertical_packs(id) ON DELETE SET NULL,
  installed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (marketplace_pack_id, tenant_id)
);

-- Auto-create a version row on every vertical_packs update.
CREATE OR REPLACE FUNCTION vertical_packs_version_capture()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.config IS DISTINCT FROM NEW.config THEN
    INSERT INTO vertical_pack_versions (pack_id, version, config, changelog, created_by)
    VALUES (NEW.id, NEW.version, NEW.config,
            COALESCE(current_setting('app.changelog', true), 'auto-versioned'),
            COALESCE(NULLIF(current_setting('app.user_id', true), '')::uuid, NULL));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vertical_packs_version_trigger ON vertical_packs;
CREATE TRIGGER vertical_packs_version_trigger
  AFTER UPDATE ON vertical_packs
  FOR EACH ROW EXECUTE FUNCTION vertical_packs_version_capture();
```

### 6.4. Backend: pack APIs

#### 6.4.1. `lib/packs/versioning.ts`

```typescript
export async function publishVersion(packId: string, changelog: string): Promise<{ version: string }>;
export async function getVersionHistory(packId: string): Promise<PackVersion[]>;
export async function getVersion(packId: string, version: string): Promise<PackVersion | null>;
export async function diffVersions(packId: string, v1: string, v2: string): Promise<PackDiff>;
export async function rollbackToVersion(packId: string, version: string, userId: string): Promise<void>;
```

#### 6.4.2. `lib/packs/import-export.ts`

```typescript
import { z } from 'zod';
import yaml from 'yaml';
import type { VerticalPackConfig } from './types';

// Schema validation for imported packs — same schema used by the admin UI.
export const PackImportSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(64),
  name: z.string().min(2).max(120),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(500).optional(),
  config: VerticalPackConfigSchema, // shared with admin form
});

export function exportPack(pack: VerticalPackRow): string {
  return yaml.stringify({
    slug: pack.slug, name: pack.name, version: pack.version,
    description: pack.description, config: pack.config,
  });
}

export async function importPack(yamlText: string, tenantId: string, userId: string): Promise<VerticalPackRow> {
  const parsed = yaml.parse(yamlText);
  const validated = PackImportSchema.parse(parsed);
  // Sandbox-validate recognizers (no eval-style code), red-flag rules (regex compile-check),
  // voice prompt (length limit, no injected commands).
  await sandboxValidate(validated.config);
  // INSERT new pack row scoped to this tenant.
  return await createPackForTenant(tenantId, validated, userId);
}

async function sandboxValidate(config: VerticalPackConfig): Promise<void> {
  // 1. Recognizers: each must be one of the allowlisted Presidio recognizers or a regex-only custom.
  // 2. Red-flag rules: each phrase compile-check; reject if regex DoS pattern detected (catastrophic backtracking).
  // 3. Voice prompt: ≤4000 tokens, must not contain ${...} interpolation that could break out of the prompt context.
  // 4. Source list: URLs must be HTTPS, domain not blocklisted.
}
```

#### 6.4.3. API endpoints

- `GET /api/admin/packs/[id]/versions` — list version history
- `POST /api/admin/packs/[id]/versions` — publish a new version (body: `{ changelog }`)
- `GET /api/admin/packs/[id]/versions/[version]/diff/[other]` — diff two versions
- `POST /api/admin/packs/[id]/rollback` — body: `{ version }`
- `GET /api/admin/packs/[id]/export` — returns YAML
- `POST /api/admin/packs/import` — multipart YAML upload
- `POST /api/admin/packs/[id]/publish-to-marketplace` — body: `{ slug, description, is_public }`
- `GET /api/marketplace/packs?vertical=healthcare&curation=verified` — list marketplace packs
- `GET /api/marketplace/packs/[slug]` — single pack detail
- `POST /api/marketplace/packs/[slug]/install` — body: `{ tenant_id }` — forks pack to tenant

### 6.5. Frontend: visual editor

#### 6.5.1. Extend `app/admin/packs/[slug]/page.tsx`

Today it's likely a single read-only view. Expand to tabbed editor:

```
[ Recognizers ] [ Red Flags ] [ Disclaimer ] [ Sources ] [ Voice ] [ Thresholds ] [ Versions ]
```

Each tab is a client component in `app/admin/packs/[slug]/_components/`.

#### 6.5.2. New components

- `RecognizersTab.tsx` — drag-drop from a library palette + custom regex builder with live test input.
- `RedFlagsTab.tsx` — visual rule builder (if-phrase-matches-then-severity-routes-to). Live test field accepts arbitrary text and shows what would be triggered.
- `DisclaimerTab.tsx` — rich-text editor (TipTap or similar) for canonical text + regex builder for "is disclaimer present" detection + placement-rule selector ("at end" / "after first paragraph" / "before first medical claim").
- `SourcesTab.tsx` — upload PDFs, paste URLs, add RSS feeds. Shows ingestion status (embedded? chunked? indexed?). Per-source weight slider (0..1).
- `VoiceTab.tsx` — textarea for draft-mode voice prompt + live "Generate sample" button.
- `ThresholdsTab.tsx` — sliders + numeric inputs for min-similarity, top-K, max unsourced paragraphs publishable, kill-switch sensitivity.
- `VersionsTab.tsx` — table of version history with diff view + rollback button.

Top of page: **"Test this pack"** button → opens an inline verifier that runs the current (saved or unsaved) pack against an article. Side-by-side: pasted article ←→ verification report.

#### 6.5.3. New route: `app/packs/page.tsx` (public registry)

Anonymous-accessible. Browse:
- Filter by vertical, curation status, popularity
- Each pack card shows: name, author, install count, last updated, "Install" button (signed-in only)
- Detail page `app/packs/[slug]/page.tsx` shows full config (read-only), install button, sample articles using the pack

#### 6.5.4. "Build with AI" assistant

Component: `components/admin/PackBuilderAI.tsx`

User inputs a natural-language description:
> "I need to verify content for a state Medicaid plan publishing patient-ed content. Emphasize Section 508 accessibility, plain language (8th grade reading level), and our state-specific Medicaid disclaimer."

Behind the scenes: a single Claude call with a structured-output schema that returns a complete `VerticalPackConfig`. User reviews each tab; saves as new pack.

System prompt template stored in `lib/packs/builder-prompt.ts`. Generated config goes through the same `sandboxValidate()` before persistence.

### 6.6. Curated seed packs (Phase 1)

Ship these as `data/packs/*.yaml`:
- `cdc-patient-education-2026.yaml` — current CDC patient-ed pack (already exists in code; export as YAML)
- `fda-medical-device-marketing.yaml` — new
- `hipaa-safe-harbor-strict.yaml` — new, with full 18-identifier recognizer coverage
- `section-508-federal-content.yaml` — new
- `eu-ai-act-article-50.yaml` — new
- `finra-investment-advisor-blog.yaml` — new (financial)
- `aba-attorney-marketing.yaml` — new (legal)

Seeded on database migration via `scripts/seed-marketplace.ts`. All marked `curation_status = 'verified'`.

### 6.7. Tests

- **Unit:** Pack import-export roundtrip (every existing pack exports + re-imports identically). Sandbox validation rejects malicious patterns (regex DoS, prompt injection).
- **Integration:** `tests/admin/pack-editor.test.ts` — full editor flow: edit recognizers, publish version, rollback.
- **E2E:** Build a pack with AI assistant from natural-language input; verify an article with the new pack; confirm output matches expectations.

### 6.8. Rollout

1. **Day 1-3:** Migration 015 + version-capture trigger + lib/packs/versioning.ts + import/export.
2. **Day 4-7:** Admin editor tabs (recognizers, red flags, disclaimer, sources, voice, thresholds, versions).
3. **Day 8-9:** Public `/packs` registry + install/fork flow.
4. **Day 10-11:** "Build with AI" assistant + Pack QA on internal corpus.
5. **Day 12:** Seed 7 curated packs in marketplace.
6. **Day 13:** Soft-launch behind `FEATURE_PACK_MARKETPLACE=true` for internal team + early-access tenants.
7. **Day 14:** Public launch + announcement on marketing site.

### 6.9. Acceptance criteria

- [ ] Tenant admin can edit every aspect of their pack visually without writing code.
- [ ] Every save creates a versioned snapshot; rollback works.
- [ ] Import/export roundtrips losslessly for all seeded packs.
- [ ] Sandbox validation rejects: regex DoS, prompt-injection attempts, non-HTTPS sources.
- [ ] Public registry shows ≥7 curated packs at launch.
- [ ] "Build with AI" generates a syntactically valid, sandbox-passing pack from a 50-word brief.

---

## 7. RULE 6 — Free Tier + Pricing Reorganization

### 7.1. Goal

Reverse the funnel: anyone can verify anything for free. Pricing only kicks in for workflow integration.

### 7.2. Effort

**5–7 days.** Two days for Stripe + entitlement plumbing, one day for the new pricing page, one day for usage enforcement in the lifecycle, one day for the signup/upgrade UX, one day for grandfathering existing customers, one day for tests.

### 7.3. Schema changes

**Migration:** `packages/db/016_pricing_v2.sql`

```sql
-- New tier enum
DO $$ BEGIN
  CREATE TYPE pricing_tier_t AS ENUM (
    'anonymous',
    'free',
    'solo',
    'team',
    'publisher',
    'enterprise',
    'legacy_unlimited'  -- grandfather existing customers
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tenant-level tier + entitlements (overrides user-level for shared tenants).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pricing_tier pricing_tier_t NOT NULL DEFAULT 'free';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

-- Per-tenant usage rollup (cheap to query for the dashboard).
CREATE TABLE IF NOT EXISTS tenant_usage_monthly (
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_month  DATE NOT NULL,
  verifications INTEGER NOT NULL DEFAULT 0,
  api_calls     INTEGER NOT NULL DEFAULT 0,
  llm_tokens    BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, period_month)
);

-- Grandfather all existing tenants before this migration runs.
UPDATE tenants SET pricing_tier = 'legacy_unlimited' WHERE created_at < NOW();
```

Note the last UPDATE — every existing tenant is grandfathered into `legacy_unlimited` (unlimited usage at no charge, forever). New signups start on `free` tier.

### 7.4. Backend: entitlements

#### 7.4.1. `lib/billing/entitlements.ts`

```typescript
export interface TierLimits {
  verifications_per_month: number | null;  // null = unlimited
  api_calls_per_min: number;
  custom_packs: number;
  seats: number;
  public_proofs_default_visibility: 'public' | 'private';
  features: {
    auto_rewrite: boolean;
    counter_evidence: boolean;
    pack_marketplace_install: boolean;
    custom_disclaimer: boolean;
    sso: boolean;
    audit_export: boolean;
    white_label_proof_urls: boolean;
  };
}

export const TIER_LIMITS: Record<PricingTier, TierLimits> = {
  anonymous: {
    verifications_per_month: 10, api_calls_per_min: 2, custom_packs: 0, seats: 0,
    public_proofs_default_visibility: 'public',
    features: { auto_rewrite: false, counter_evidence: false, pack_marketplace_install: false, custom_disclaimer: false, sso: false, audit_export: false, white_label_proof_urls: false },
  },
  free: {
    verifications_per_month: 100, api_calls_per_min: 5, custom_packs: 0, seats: 1,
    public_proofs_default_visibility: 'public',
    features: { auto_rewrite: true, counter_evidence: false, pack_marketplace_install: true, custom_disclaimer: false, sso: false, audit_export: false, white_label_proof_urls: false },
  },
  solo: { /* $29/mo: unlimited verifications, 1 custom pack, no SSO */ },
  team: { /* $99/mo: 5 seats, 5 custom packs, API access */ },
  publisher: { /* $999/mo: unlimited seats, unlimited packs, SSO, audit export */ },
  enterprise: { /* custom: on-prem, FedRAMP path, dedicated support */ },
  legacy_unlimited: { /* same as enterprise, no charge */ },
};

export async function checkEntitlement(tenant_id: string, feature: keyof TierLimits['features']): Promise<boolean>;
export async function checkVerificationQuota(tenant_id: string): Promise<{ allowed: boolean; reason?: 'monthly_cap' | 'rate_limit' }>;
export async function incrementUsage(tenant_id: string, kind: 'verification' | 'api_call' | 'llm_tokens', amount: number): Promise<void>;
```

#### 7.4.2. Integration into lifecycle

At the top of `runVerifyLifecycle`:

```typescript
const quota = await checkVerificationQuota(tenant_id);
if (!quota.allowed) {
  return { ok: false, reason: 'quota_exceeded', detail: quota };
}
// ...run lifecycle...
await incrementUsage(tenant_id, 'verification', 1);
await incrementUsage(tenant_id, 'llm_tokens', total_tokens);
```

For anonymous calls, `tenant_id = 'anonymous-singleton'` — quota is enforced per-IP via the rate-limit infrastructure from Rule 1.

#### 7.4.3. Stripe integration

New files:
- `lib/billing/stripe.ts` — Stripe SDK wrapper
- `app/api/billing/checkout/route.ts` — POST creates Stripe Checkout Session
- `app/api/billing/portal/route.ts` — POST creates Stripe Customer Portal Session
- `app/api/billing/webhooks/stripe/route.ts` — webhook handler for subscription events

Webhook events to handle:
- `checkout.session.completed` → set tenant tier, store stripe_customer_id
- `customer.subscription.updated` → update subscription_status, current_period_end
- `customer.subscription.deleted` → downgrade to free
- `invoice.payment_failed` → notify tenant, grace period 7 days

**Idempotency:** Use Stripe's `event.id` as the dedupe key in a `stripe_events_processed` table.

### 7.5. Frontend: new pricing page

#### 7.5.1. Edit `app/pricing/page.tsx`

Five tier cards: Free / Solo $29 / Team $99 / Publisher $999 / Enterprise (contact). For each:
- Headline price
- Verifications/month
- Seats
- Feature checklist (✓/—)
- CTA: Free → "Start free" (goes to `/sign-up`); paid → "Upgrade" (goes to Stripe Checkout); Enterprise → "Talk to sales"

Below the tiers: comparison table with every feature row.

#### 7.5.2. New: signup-to-paid flow

- `/sign-up` → existing flow, lands on `/welcome`.
- `/welcome` → new component: shows current tier (Free), usage so far, prominent "Upgrade to Solo" CTA.
- In-app upsell: when free user hits 80% of monthly cap, show banner "You've used 80 of 100 free verifications this month — upgrade for unlimited."
- At 100% cap: verify endpoint returns 402 Payment Required with helpful "Upgrade now" link.

#### 7.5.3. Admin billing panel

`app/admin/billing/page.tsx`:
- Current plan + status
- Usage chart (verifications/month for last 6 months)
- Stripe Customer Portal button (manages payment method, cancels subscription)
- Upgrade/downgrade buttons (calls checkout/portal endpoints)

### 7.6. Anonymous tier mechanics

The "anonymous" tier is a special singleton tenant. Already created in Rule 1. The pricing page's "Free" tier (vs "Anonymous") differs by:

| Capability | Anonymous (no signup) | Free (signup) |
|---|---|---|
| Verifications/month | 10 (per IP/day) | 100 |
| Persistent history | No | Yes |
| Public default | Always public | Choose per verification |
| Auto-rewrite (Rule 2) | No (read-only verdict) | Yes |
| Custom packs | No | No (only marketplace install) |
| API access | No | Read-only (10K tokens/day) |
| Audit retention | 30 days | 365 days |

The anonymous→free conversion is the primary funnel optimization.

### 7.7. Grandfathering

Migration sets all existing tenants to `legacy_unlimited`. They retain everything they have, indefinitely, at no charge. Show a banner in their admin: "You're on the AssuredAI Founders' Plan — thank you for being an early customer. Your plan includes [feature list] forever."

This is critical for trust. No one gets surprise-billed.

### 7.8. Tests

- **Unit:** `lib/billing/entitlements.test.ts` — tier limit lookups, quota checks, increment.
- **Integration:** Stripe webhook handler idempotency, subscription state transitions.
- **E2E:** Sign up → free tier → verify 5 articles → upgrade to Solo → hit Stripe Checkout (test mode) → return → tier upgraded → unlimited verifications.

### 7.9. Rollout

1. **Day 1:** Migration 016 with grandfathering UPDATE.
2. **Day 2-3:** `lib/billing/entitlements.ts` + lifecycle integration + Stripe plumbing.
3. **Day 4:** Webhook handler + Customer Portal route.
4. **Day 5:** New pricing page + signup-to-paid UX + admin billing panel.
5. **Day 6:** Internal QA — every transition (anonymous → free → solo → team → cancel → grace → downgrade).
6. **Day 7:** Production cutover with `FEATURE_PRICING_V2=true`. Monitor for 48 hours.

**Rollback:** Set flag false; all checks pass through (legacy unlimited behavior). No data loss.

### 7.10. Acceptance criteria

- [ ] Every existing tenant grandfathered to `legacy_unlimited` with no service interruption.
- [ ] New signup lands on free tier with 100 verifications/month.
- [ ] Anonymous endpoint enforces 10/day per IP.
- [ ] Stripe Checkout test mode roundtrip works for all 3 paid tiers.
- [ ] Webhook idempotency: replaying the same event twice doesn't double-charge or duplicate state.
- [ ] At 80% / 100% usage, user sees appropriate upgrade prompts.
- [ ] Customer Portal lets users self-serve cancel / change card.
- [ ] Downgrade flow gracefully handles tier downgrade mid-cycle.

---

## 8. CROSS-CUTTING CONCERNS

### 8.1. Observability

Every new endpoint emits structured logs via existing `lib/logger.ts`. Key dashboards to add (Sentry or self-host):

1. **Anonymous funnel:** anonymous verifications/day, anonymous → free conversion rate, free → paid conversion rate.
2. **Auto-rewrite quality:** % of fixes accepted vs rejected, % flagged `requires-editor-judgment`, re-verification failure rate.
3. **Counter-evidence:** contradictions found per verification, average contradiction score, % resolved by editor.
4. **Marketplace:** packs created, packs installed, top installed packs by week.
5. **Extension:** daily-active extensions, verifications per extension/day, popular host sites.

### 8.2. Performance budgets

| Path | p50 latency | p95 latency | Notes |
|---|---|---|---|
| `POST /api/verify/public` | 6s | 15s | Existing lifecycle dominates |
| `GET /p/[hash]` | 200ms | 500ms | Single audit_log SELECT + render |
| `GET /api/og/proof/[hash]` | 500ms | 1.5s | First request cold; cached at CDN after |
| `POST /api/audits/[id]/fixes/bulk` | 1s | 3s | DB update only; rewrite already computed |
| `GET /api/marketplace/packs` | 100ms | 300ms | Cacheable for 60s |
| Counter-evidence add to lifecycle | +1.5s | +2s | Budget; abort with warning if exceeded |

### 8.3. Security

- All public endpoints: strict input validation (Zod schemas as shown); no path traversal in `[hash]`; max input size enforced.
- Embed widget: Shadow DOM isolation; no eval; no document.write.
- Pack import: `sandboxValidate()` is the only gate keeping malicious packs out of the marketplace.
- Extension: requests authenticated via signed session token in `chrome.storage.local`; anonymous calls use the same rate-limited path as the public endpoint.
- Stripe webhooks: signature verification with `STRIPE_WEBHOOK_SECRET`.
- Anonymous IP hashing: SHA-256 with a server-side salt; raw IPs never stored.

### 8.4. SEO / category-defining surface

The public proof URLs + threat-intel dashboard + contradictions database + public packs registry are all SEO-positive:

- Every proof URL is a fresh indexable page (ClaimReview structured data).
- The contradictions database surfaces unique pages per topic per week.
- The packs registry has a page per pack + per vertical.
- The threat-intel dashboard has a permanent canonical URL with weekly data.

This is a content moat that compounds. After 6 months of consistent verification volume, AssuredAI will rank for queries like "is [topic] accurate AI content," "how to verify medical AI claims," "HIPAA AI compliance audit."

### 8.5. Pricing implications

Verifying anonymous users costs real LLM money. Rough estimate per verification at current pack sizes:
- Voyage embedding: ~$0.0005
- Claude Haiku fact-check classification: ~$0.001
- Claude Sonnet rewrite (if Rule 2): ~$0.01
- Counter-evidence (if Rule 3): ~$0.005 extra

So per anonymous verification: ~$0.02 worst case. At 10/day/IP × 100 unique IPs/day = $20/day = $600/month early. Manageable.

At scale (1000 unique IPs/day): $6K/month. Justifies the free tier as marketing spend.

---

## 9. APPENDIX A — NEW ENDPOINTS INVENTORY

| Method | Path | Rule | Auth | Description |
|---|---|---|---|---|
| POST | `/api/verify/public` | 1 | none | Anonymous one-shot verify |
| POST | `/api/verify/public/stream` | 1 | none | Anonymous SSE-streaming verify |
| GET | `/api/proofs/[short]/summary` | 1 | none | Lightweight JSON for embed widget |
| POST | `/api/proofs/[short]/share` | 1 | required | Paid user opt-in shares a proof |
| GET | `/api/og/proof/[short]` | 1 | none | OG image generator |
| GET | `/api/proofs/registry/bloom` | 4 | none | Bloom filter for extension passive mode |
| POST | `/api/audits/[id]/fixes/[fixId]/accept` | 2 | required | Accept individual fix |
| POST | `/api/audits/[id]/fixes/bulk` | 2 | required | Accept multiple fixes |
| POST | `/api/audits/[id]/finalize` | 2 | required | Apply accepted fixes + new audit |
| GET | `/api/audits/[id]/fixes` | 2 | required | Poll status (async mode) |
| POST | `/api/audits/[id]/contradictions/[cid]/resolve` | 3 | required | Editor resolution |
| GET | `/api/admin/packs/[id]/versions` | 5 | admin | Version history |
| POST | `/api/admin/packs/[id]/versions` | 5 | admin | Publish new version |
| GET | `/api/admin/packs/[id]/versions/[v]/diff/[other]` | 5 | admin | Diff two versions |
| POST | `/api/admin/packs/[id]/rollback` | 5 | admin | Roll back to version |
| GET | `/api/admin/packs/[id]/export` | 5 | admin | YAML export |
| POST | `/api/admin/packs/import` | 5 | admin | YAML import |
| POST | `/api/admin/packs/[id]/publish-to-marketplace` | 5 | admin | List in marketplace |
| GET | `/api/marketplace/packs` | 5 | none | Browse marketplace |
| GET | `/api/marketplace/packs/[slug]` | 5 | none | Pack detail |
| POST | `/api/marketplace/packs/[slug]/install` | 5 | required | Fork to tenant |
| POST | `/api/billing/checkout` | 6 | required | Stripe Checkout Session |
| POST | `/api/billing/portal` | 6 | required | Stripe Customer Portal |
| POST | `/api/billing/webhooks/stripe` | 6 | webhook-sig | Stripe webhook handler |
| GET | `/api/cron/refresh-stats` | 1, 3 | cron-secret | Refresh materialized views |

---

## 10. APPENDIX B — NEW FILES INVENTORY

### lib/
- `lib/public-proofs.ts`
- `lib/verification/auto-rewrite.ts`
- `lib/verification/counter-evidence.ts`
- `lib/packs/versioning.ts`
- `lib/packs/import-export.ts`
- `lib/packs/builder-prompt.ts`
- `lib/billing/entitlements.ts`
- `lib/billing/stripe.ts`
- `lib/url-fetch.ts`
- `lib/telemetry.ts`

### app/
- `app/p/[hash]/page.tsx`
- `app/api/verify/public/route.ts`
- `app/api/verify/public/stream/route.ts`
- `app/api/proofs/[short]/summary/route.ts`
- `app/api/proofs/[short]/share/route.ts`
- `app/api/og/proof/[short]/route.tsx`
- `app/api/audits/[id]/fixes/[fixId]/accept/route.ts`
- `app/api/audits/[id]/fixes/bulk/route.ts`
- `app/api/audits/[id]/finalize/route.ts`
- `app/api/audits/[id]/contradictions/[cid]/resolve/route.ts`
- `app/api/admin/packs/[id]/versions/...` (multiple)
- `app/api/admin/packs/[id]/export/route.ts`
- `app/api/admin/packs/import/route.ts`
- `app/api/marketplace/packs/route.ts`
- `app/api/marketplace/packs/[slug]/route.ts`
- `app/api/marketplace/packs/[slug]/install/route.ts`
- `app/api/billing/checkout/route.ts`
- `app/api/billing/portal/route.ts`
- `app/api/billing/webhooks/stripe/route.ts`
- `app/api/cron/refresh-stats/route.ts`
- `app/api/cron/contradictions-refresh/route.ts`
- `app/threat-intel/page.tsx`
- `app/contradictions/page.tsx`
- `app/contradictions/[topic]/page.tsx`
- `app/packs/page.tsx`
- `app/packs/[slug]/page.tsx`
- `app/admin/billing/page.tsx`

### components/
- `components/verify/FixDiffPanel.tsx`
- `components/verify/ChallengedCard.tsx`
- `components/verify/ProofPage.tsx` (extend with `variant` prop)
- `components/admin/PackBuilderAI.tsx`
- `app/admin/packs/[slug]/_components/RecognizersTab.tsx`
- `app/admin/packs/[slug]/_components/RedFlagsTab.tsx`
- `app/admin/packs/[slug]/_components/DisclaimerTab.tsx`
- `app/admin/packs/[slug]/_components/SourcesTab.tsx`
- `app/admin/packs/[slug]/_components/VoiceTab.tsx`
- `app/admin/packs/[slug]/_components/ThresholdsTab.tsx`
- `app/admin/packs/[slug]/_components/VersionsTab.tsx`

### public/
- `public/verified.js` (embed widget)
- `public/bookmarklet.js`

### extension/
- `extension/manifest.json` (modify)
- `extension/content.js` (rewrite)
- `extension/sidebar.html`
- `extension/sidebar.js`
- `extension/sidebar.css`
- `extension/adapters/assistants.js`
- `extension/adapters/google-docs.js`
- `extension/adapters/notion.js`
- `extension/adapters/cms.js`

### packages/db/
- `packages/db/012_public_proofs.sql`
- `packages/db/013_auto_fix.sql`
- `packages/db/014_counter_evidence.sql`
- `packages/db/015_pack_versions.sql`
- `packages/db/016_pricing_v2.sql`

### data/
- `data/packs/cdc-patient-education-2026.yaml`
- `data/packs/fda-medical-device-marketing.yaml`
- `data/packs/hipaa-safe-harbor-strict.yaml`
- `data/packs/section-508-federal-content.yaml`
- `data/packs/eu-ai-act-article-50.yaml`
- `data/packs/finra-investment-advisor-blog.yaml`
- `data/packs/aba-attorney-marketing.yaml`

### scripts/
- `scripts/seed-marketplace.ts`
- `scripts/stripe-products-setup.ts`

### tests/
- `tests/api/verify-public.test.ts`
- `tests/api/auto-rewrite.test.ts`
- `tests/api/counter-evidence.test.ts`
- `tests/admin/pack-editor.test.ts`
- `tests/billing/entitlements.test.ts`
- `tests/billing/stripe-webhooks.test.ts`
- `tests/public-proofs/share-revoke.test.ts`

---

## 11. APPENDIX C — FEATURE FLAG MATRIX

| Flag | Env Var | Default | Type | Read by |
|---|---|---|---|---|
| `FEATURE_PUBLIC_PROOFS` | `FEATURE_PUBLIC_PROOFS` | false | boolean | Rule 1 routes + ProofPage |
| `FEATURE_ANONYMOUS_VERIFIER` | `FEATURE_ANONYMOUS_VERIFIER` | false | boolean | Rule 1 anonymous endpoints |
| `FEATURE_AUTO_REWRITE` | `FEATURE_AUTO_REWRITE` | false | boolean | Lifecycle (skip auto-rewrite when off) |
| `FEATURE_COUNTER_EVIDENCE` | `FEATURE_COUNTER_EVIDENCE` | false | boolean | Lifecycle (skip counter-evidence when off) |
| `FEATURE_EXTENSION_UNIVERSAL` | n/a (extension only) | true in v0.2.0+ | n/a | Extension code only |
| `FEATURE_PACK_MARKETPLACE` | `FEATURE_PACK_MARKETPLACE` | false | boolean | Marketplace routes; admin UI tabs |
| `FEATURE_PRICING_V2` | `FEATURE_PRICING_V2` | false | boolean | Entitlement checks (legacy_unlimited otherwise) |
| `FEATURE_PASSIVE_VERIFICATION` | n/a (extension setting) | off by default | n/a | Extension popup toggle |

All flags read via `getConfig()` in `lib/config.ts`. Add to the schema.

---

## 12. APPENDIX D — RISK REGISTER (FULL)

| # | Risk | Severity | Mitigation | Owner |
|---|---|---|---|---|
| 1 | audit_log schema changes break hash chain | CRITICAL | New tables reference audit_log.id; never alter canonical | Mo |
| 2 | Anonymous endpoint becomes free LLM-cost vector | HIGH | IP rate limits 2/min, 10/day, 8K char cap | Mo |
| 3 | Auto-rewrite introduces hallucinations | HIGH | Re-verify every rewrite; reject if score drops; cap confidence | Mo |
| 4 | Public pack marketplace = attack surface | HIGH | sandboxValidate() gate; community packs unverified by default | Mo |
| 5 | Pricing reorg breaks existing entitlements | MEDIUM | Grandfather all to legacy_unlimited; new pricing applies to new signups | Mo |
| 6 | Extension content script collides with host CSP | MEDIUM | Shadow DOM; no inline scripts in host context | Mo |
| 7 | Chrome Web Store rejects v0.2.0 (`<all_urls>`) | MEDIUM | Clear privacy disclosure; passive mode off by default; manual user action required for verification | Mo |
| 8 | Stripe webhook race condition double-charges | MEDIUM | Event-ID idempotency table | Mo |
| 9 | Public proof URL leaks unredacted PII | CRITICAL | Two-pass redaction already in lifecycle; add a final scan before render in ProofPage variant='public' | Mo |
| 10 | Counter-evidence adds untenable latency | MEDIUM | Async option for long articles; pack opt-out flag | Mo |
| 11 | Marketplace pack with malicious regex causes DoS | HIGH | Regex compile-check + complexity heuristic during sandboxValidate | Mo |
| 12 | "Build with AI" generates inconsistent / unsafe packs | MEDIUM | Structured-output schema gate; sandbox-validate before save; require human review | Mo |
| 13 | Embed widget JS breaks on customer pages | LOW | Strict Shadow DOM; defensive error handling; fail-closed (no badge) | Mo |
| 14 | Threat-intel dashboard de-anonymizes a small-volume tenant | LOW | Suppress any aggregate with < 5 tenants contributing | Mo |
| 15 | OG image generation costs scale unpredictably | LOW | Edge runtime + Vercel cache; max generation rate 100/min | Mo |

---

## 13. APPENDIX E — POST-BUILD VALIDATION CHECKLIST

After all 6 rules ship, run this end-to-end script:

### As anonymous user
- [ ] Visit assuredai.online — see hero with live verifier
- [ ] Paste a Healthline URL → see SSE progress events → land on proof URL with `/p/<short>`
- [ ] Open proof URL in incognito → renders without auth
- [ ] Share proof URL on LinkedIn → OG card renders correctly
- [ ] Visit `/threat-intel` → see aggregate stats from your verification
- [ ] Visit `/contradictions` → see public counter-evidence patterns

### As newly-signed-up free user
- [ ] Sign up → land on `/welcome` showing free tier with 100/month
- [ ] Verify a draft → see auto-rewrite suggestions → accept all → finalize → get new proof URL
- [ ] Hit `/packs` → install "CDC Patient Education 2026" pack → see in admin
- [ ] Edit pack → see version capture → roll back → see config restored

### As Solo paid user
- [ ] Upgrade from free → Stripe Checkout → return → see unlimited verifications
- [ ] Verify content with counter-evidence on → see challenged paragraphs → resolve

### As browser extension user
- [ ] Install extension v0.2.0
- [ ] Open ChatGPT → ask "what's the safe daily dose of acetaminophen for adults?" → see Verify badge → click → sidebar streams → result shows
- [ ] Open Google Docs → write 200+ words → see floating Verify button → click → sidebar shows
- [ ] Use Ctrl+Shift+V on selected text on any page → sidebar verifies
- [ ] Hit free-tier monthly cap → see upgrade prompt in extension popup

### As marketplace contributor
- [ ] Create new pack from "Build with AI" assistant ("I need a state Medicaid patient-ed verifier")
- [ ] Generated pack passes sandbox validation
- [ ] Publish to marketplace → see listed
- [ ] Another user installs your pack → fork appears in their admin

If all checks pass, the 6 rules are live.

---

**END OF SPEC**

*Companion document: [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md) — the strategic analysis this spec implements.*
