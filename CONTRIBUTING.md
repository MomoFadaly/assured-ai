# Contributing to AssuredAI

Thanks for considering a contribution. AssuredAI is the reference
implementation of the trust-centric AI framework for healthcare and
government publishers. Production deployments depend on this code being
correct, so the bar is high — but every contribution that holds the bar
is welcome.

---

## Before you open a PR

1. **Read the [BUILD_PLAN.md](./BUILD_PLAN.md)** to understand which
   primitives are intentional and which are deliberate non-goals.
2. **Run the test suite locally:** `pnpm test`. All 22 tests must pass.
3. **Run the build:** `pnpm build`. Must compile clean with no warnings
   you introduced.
4. **Run typecheck:** `pnpm typecheck`. Strict TS — no `any`, no
   `@ts-ignore` without a comment explaining why.

If you're touching the verification pipeline (`lib/verification/*`):
5. **Run the smoke test:** `pnpm verify:smoke` — costs ~$0.20 in API
   credits per run; only do this when the change is real.

---

## What's in scope

**In scope** (we want PRs for these):

- Bug fixes anywhere in the pipeline.
- New PII recognizers for Presidio (`deploy/presidio/recognizers.py`).
- Additional red-flag categories (`lib/redaction/red-flags.ts`).
- Source-corpus ingest improvements (`scripts/corpus-ingest.ts`).
- Audit-log proof-URL UX improvements (`app/v/[id]`).
- Compliance PDF template improvements (`lib/compliance-pdf`).
- Performance — faster retrieval, smaller bundle, lower LLM token cost.
- Tests. Always tests.

**Out of scope** (please don't open these — they will be closed):

- Replacing Postgres with anything else. The hash chain is a Postgres
  trigger; the schema is the audit-evidentiary substrate.
- Replacing Presidio with a different redactor. Presidio is the audited
  layer; alternatives need a separate evaluation.
- New LLM provider abstraction without a concrete second provider.
- Anything that weakens the audit log's append-only enforcement.

---

## Style

- TypeScript: prefer **explicit types over inference for exports**, use
  `interface` for public shapes, `type` for unions/intersections.
- React components: server-by-default; only `'use client'` when you
  actually need browser APIs / state.
- CSS: Tailwind classes. Avoid inline styles except for dynamic values
  (e.g., `style={{ width: \`${pct}%\` }}`).
- Comments: explain **why**, not **what**. The code already says what.
- Commits: imperative present tense (`add streaming verify response`,
  not `added` or `adds`).

---

## Security disclosures

If you find a security issue — particularly anything affecting PHI
redaction, audit-log integrity, or the proof URL's hash chain —
**please do not open a public issue.** Email `security@assuredai.online`
(or open a private security advisory on GitHub if the repo is hosted
there). We'll respond within 48 hours.

---

## Tests we expect

- New API route: integration test that hits the route with valid +
  invalid input.
- New pipeline step: unit test of the step's pure-function logic.
- New corpus chunking strategy: unit test on `tests/corpus/chunk.test.ts`.
- Touching `audit_log` schema or hash chain: extend
  `tests/audit/verify-chain.test.ts`.

---

## Code review

We aim to respond to PRs within 3 business days. Substantive PRs may
take longer if they require running paid smoke tests on our infrastructure.

Thanks for shipping with us.
