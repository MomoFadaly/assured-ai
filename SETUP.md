# AssuredAI — Setup Guide

The exact, in-order steps to go from a fresh clone to a running, demoable AssuredAI deployment. Estimated total: **~75 minutes** the first time, plus ingestion runtime (~10 minutes).

If a step fails, fix before moving on. Most issues caught early are configuration; later issues are infrastructure.

---

## Prerequisites

- Node 20+
- pnpm 9+
- Docker Desktop (for the Presidio sidecar)
- A Neon Postgres account ([free tier](https://neon.tech))
- An Anthropic API key
- A Voyage AI API key
- A Clerk account ([free tier](https://clerk.com)) — operator console only

---

## Step 1 — Install dependencies (~3 min)

```bash
cd assured-ai
pnpm install
```

If pnpm complains about peer deps, that's typically fine — the lockfile resolves them.

## Step 2 — Provision Neon Postgres (~5 min)

1. Go to https://neon.tech → New project
2. Project name: `assured-ai`
3. Region: closest to you
4. Postgres version: 16 or later
5. Once created, go to **Extensions** in the left nav → enable `pgvector`
6. Go to **Connection Details** → copy the connection string

If pgvector isn't visible in the Extensions UI, run this in Neon's SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

## Step 3 — Configure environment (~5 min)

```bash
cp .env.example .env
```

Open `.env` in your editor and set, at minimum:

```env
DATABASE_URL=postgresql://...   # from Neon
ANTHROPIC_API_KEY=sk-ant-...    # from console.anthropic.com
VOYAGE_API_KEY=pa-...           # from voyageai.com
```

For the operator console:

```env
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/admin/sign-in
```

## Step 4 — Apply the schema (~30 sec)

```bash
pnpm db:migrate
```

Verify the audit log denies UPDATE/DELETE — paste this into Neon's SQL editor:

```sql
INSERT INTO audit_log (scenario, query_redacted, outcome, hash)
VALUES ('healthcare', 'test', 'answered', 'manual_test');

UPDATE audit_log SET hash = 'tampered' WHERE id = 1;
-- Expected: ERROR: permission denied
```

If `UPDATE` succeeds, the role grants are wrong — see `packages/db/schema.sql` and adjust the role name in the REVOKE block.

## Step 5 — Start the Presidio sidecar (~2 min, slow first time)

```bash
pnpm presidio:up
```

This builds the Python container (~2 min first time, instant on subsequent runs) and starts it on port 5001.

Verify it's healthy:

```bash
curl http://localhost:5001/health
# Expected: {"status":"ok"}
```

## Step 6 — Ingest the corpus (~10 min, ~$1 in Voyage costs)

```bash
pnpm corpus:ingest --scenario=healthcare
pnpm corpus:status
```

The status command should show ~600-1000 chunks across 15 sources for the healthcare scenario. Run again for government:

```bash
pnpm corpus:ingest --scenario=government
```

If a URL 404s during ingestion, the failure is logged but doesn't abort. Check `pnpm corpus:status` for the count and remove the dead source from `data/sources.healthcare.ts` if needed.

## Step 7 — Run the smoke test (~30 sec, ~$1 in Anthropic costs)

```bash
pnpm smoke
```

This runs 8 curated test cases through the full orchestrator end-to-end:
- 4 should produce cited answers
- 2 should produce "I don't have a verified source"
- 2 should produce red-flag escalation (911/988)

If any fail, the output explains why. Common causes:
- Corpus not ingested → "I don't know" responses for valid questions
- Confidence threshold too high → adjust `SYNTHESIS_CONFIDENCE_THRESHOLD` in `.env`
- Presidio sidecar down → all queries fail closed

## Step 8 — Verify the audit chain

```bash
pnpm audit:verify
```

Should report `Chain valid` and a row count. After the smoke test, expect ~8-12 rows.

## Step 9 — Run the dev server

```bash
pnpm dev
```

Open:
- **Public chat**: http://localhost:3000/chat
- **Operator console**: http://localhost:3000/admin

The operator console will redirect to Clerk sign-in on first visit. Create an account; it will then become an authenticated user with default `operator` role (see `lib/db/types.ts`).

---

## What good looks like

After Step 9, you should be able to:

✅ Type "What lifestyle changes help lower high blood pressure?" in /chat and see a cited response in <10s
✅ Type "What's a good appetizer recipe?" and see "I don't have a verified source for that"
✅ Type "I'm having severe chest pain" and see the emergency banner with 911 / 988 numbers
✅ Open /admin/audit and see all those interactions in the log
✅ Open /admin/audit/verify and see "Chain valid"
✅ Open /admin/kill-switch, engage it, then see the chat return a maintenance message

If all six work, you're ready to record the Loom and ship the package.

---

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `Invalid configuration: ANTHROPIC_API_KEY: Required` | Missing key | Set in `.env`, restart dev server |
| `Postgres pool error: relation "sources" does not exist` | Schema not applied | `pnpm db:migrate` |
| `Voyage embedding count mismatch` | Voyage API rate-limited | Wait 60s and re-run |
| `PresidioError: sidecar unreachable` | Sidecar down | `pnpm presidio:up` |
| `JsonSchemaViolation: Model did not invoke the required tool` | Anthropic model returned text instead of tool use | Usually transient; re-run. If repeating, the Anthropic model may be down. |
| Clerk redirect loop | Clerk URLs misconfigured | Check `NEXT_PUBLIC_CLERK_SIGN_IN_URL` matches the file path |
| Chat returns "I don't know" for known questions | Corpus not ingested or threshold too high | `pnpm corpus:status`; adjust `RETRIEVAL_MIN_SIMILARITY` if needed |

---

## Cost expectations

- **Neon free tier**: $0 for the POC
- **Voyage embeddings (initial ingestion)**: ~$0.50-1.50 one-time
- **Anthropic per query**: ~$0.005-0.02 with Claude Sonnet 4.5
- **Anthropic for the smoke test**: ~$1
- **Vercel hobby tier**: $0 for the demo
- **Clerk free tier**: $0 for the operator console

Total to first working demo: **~$3-5.**

---

## Production-grade hardening (out of scope for POC)

When you're ready to deploy AssuredAI for a real client, see:

- `docs/COMPLIANCE.md` — what to claim, what not to claim, BAA execution checklist
- `docs/PILLARS_ROADMAP.md` — the 11 pillars we documented but didn't build (rapid rollback, APM, governance committee, etc.)
- `docs/adr/005-two-deployment-modes.md` — moving from Vercel/Neon to production managed hosting + self-host
- `docs/adr/002-anthropic-claude-default.md` — swapping to Azure OpenAI (HIPAA BAA path) or Ollama (zero data egress)

## Verifier strictness

`RETRIEVAL_MIN_SIMILARITY` (default 0.65) controls how strictly the fact-check
demands a match against the source corpus. Lower values (~0.30-0.45) mark more
content as "supported" but let fabricated stats slip through inside otherwise-
clean paragraphs. Higher values (~0.60-0.75) catch fabrications loudly but mark
out-of-corpus clean content as "unsourced".

**Production is set to 0.55** as the empirically-tuned sweet spot:
- Clean DASH-eating-plan paragraph → marked supported ✓
- PHI-containing paragraph → still supported (PII handled separately) ✓
- Fabricated "green tea reduces cholesterol 47%" → marked unsourced ✓ (catches fabrication)
- Cardiac emergency content → blocked by red-flag scan, doesn't reach fact-check ✓

Lower the value (e.g. 0.45) to be more permissive on edge-of-corpus content;
raise it (e.g. 0.65) to catch more fabrications at the cost of some false flags.
