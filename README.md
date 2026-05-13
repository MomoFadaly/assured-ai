# AssuredAI

> AI-content compliance layer for healthcare and government publishers.

AssuredAI lets editorial teams use generative AI safely. Writers either **paste an existing draft** or **describe what they want written**, and AssuredAI runs the content through a complete compliance pipeline before it's safe to publish.

The pipeline catches:

- **PHI / PII** — patient names, MRNs, emails, phone numbers, IPs (Microsoft Presidio)
- **Medical red flags** — cardiac, suicidal ideation, overdose, stroke, severe bleeding, anaphylaxis (auto-blocks publishing, surfaces emergency hotlines)
- **Unsourced claims** — every paragraph is matched against a vetted source library (CDC, FDA, NIH, your own published content) and flagged for editor review when the system can't find a match
- **Missing disclaimers** — auto-injects the required disclaimer for the publisher's vertical
- **Operational governance** — kill switch, hash-chained audit log, operator console

The source library is a **fact-check reference**, not a retrieval cage. The model can write any article on any topic; AssuredAI's job is to flag whatever the editor needs to look at before publishing.

---

## What it is, in plain English

**For the writer**, two workflows:

1. *Paste an article* — verify a draft you (or another tool) already wrote.
2. *Write an article* — give a brief, pick a format (handout, FAQ, social, email, Q&A), the system drafts and self-verifies.

Either way the output is the same: an annotated article showing supported vs unsourced paragraphs, all PII redacted, all medical red flags caught, the required disclaimer in place, and an audit ID you can cite later.

**For the compliance officer**, the operator console (`/admin`) shows:

- Source library — what the system fact-checks against
- Audit log — every interaction, hash-chained, exportable
- Kill switch — pull on suspicion, takes effect in <1s
- Quality dashboard — helpful/unhelpful votes, top warnings, escalation queue

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                       OPERATOR CONSOLE (/admin)                      │
│  Source library  ·  Audit viewer  ·  Kill switch  ·  Escalations     │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   VERIFICATION INTERFACE (/chat)                     │
│   Paste article  ·  Write article  ·  Annotated report               │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ POST /api/verify
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       VERIFY LIFECYCLE                               │
│  1. Kill switch                                                      │
│  2. Acquire article (paste or draft)                                 │
│  3. Red-flag scan (auto-block on medical emergency)                  │
│  4. Input PII redaction (Presidio)                                   │
│  5. Paragraph split                                                  │
│  6. Per-paragraph fact-check (pgvector cosine)                       │
│  7. Disclaimer detect / inject                                       │
│  8. Output PII redaction (second pass)                               │
│  9. Audit log write (SHA-256 chained)                                │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   POSTGRES 16 + pgvector                             │
│  sources  ·  source_chunks  ·  audit_log [APPEND-ONLY]               │
│  kill_switch_state  ·  escalations  ·  feedback_votes                │
└──────────────────────────────────────────────────────────────────────┘
```

The corpus inversion is the key idea: instead of "the model can only restate what's in our library," the model writes freely (paste mode = caller writes; draft mode = LLM writes from training) and the library is used **post-hoc** to find supporting evidence per paragraph.

---

## Quick start

```bash
pnpm install
cp .env.example .env       # fill in ANTHROPIC_API_KEY, VOYAGE_API_KEY
docker compose -f deploy/docker-compose.yml up -d   # postgres + presidio
pnpm db:migrate            # apply schema.sql
pnpm corpus:ingest --scenario=healthcare   # ~30s for the seeded sources
pnpm dev                   # localhost:3000
```

Verify it works end-to-end:

```bash
pnpm verify:smoke          # 4 cases: clean paste, paste-with-PII, draft, red-flag
pnpm audit:verify          # walk the SHA-256 chain
```

---

## Pillar coverage

The framework defines twelve governance pillars. AssuredAI implements the publishing-relevant ones; infra pillars are documented for production deployments.

| # | Pillar | Status |
|---|---|---|
| 1 | Secure managed infrastructure | Architectural — Vercel/Neon for POC, Docker Compose for self-host, HIPAA-eligible managed for production |
| 2 | Enterprise-grade security | Basic — TLS, env-based secrets, Clerk auth on operator console |
| 3 | Scalable, compliant infrastructure | Architectural |
| 4 | Rapid rollback | Documented — feature flags + versioned releases |
| 5 | Real-time performance monitoring | Sentry wired in |
| 6 | Headless architecture | Built — Next.js frontend; ready to plug into headless WordPress |
| 7 | Essential AI features (governed content workflow) | **Built — verification engine** |
| 8 | UX: clear labeling | **Built** — annotated paragraphs, disclaimer enforcement, supported/unsourced markers |
| 9 | Human-in-the-loop workflows | **Built** — operator console, source library mgmt, escalation queue |
| 10 | User feedback loops | **Built** — helpful/unhelpful voting, top warnings |
| 11 | Ongoing oversight (Governance Committee) | Documented — committee charter template |
| 12 | Outcome and KPI reporting | **Built** — quality dashboard |

---

## Repository layout

```
assured-ai/
├── app/
│   ├── api/verify/         # POST /api/verify — the main endpoint
│   ├── admin/              # Operator console (Clerk-protected)
│   └── chat/               # Verification UI
├── components/
│   └── verify/             # VerifyInterface (paste / draft tabs + annotated output)
├── lib/
│   ├── verification/       # draft, fact-check, disclaimer, lifecycle (the new core)
│   ├── redaction/          # Presidio HTTP client (PII/PHI)
│   ├── escalation/         # Red-flag detector
│   ├── audit/              # Hash-chained log + verifier
│   ├── corpus/             # Source ingestion pipeline
│   ├── retrieval/          # pgvector cosine (used by fact-check)
│   ├── embeddings/         # Voyage AI provider
│   ├── llm/                # Anthropic provider (Claude Sonnet 4.5 + Haiku 4.5)
│   ├── orchestration/      # Kill switch
│   └── db/                 # pg pool + types
├── packages/db/            # schema.sql + migration runner
├── deploy/
│   ├── docker-compose.yml  # postgres (pgvector) + presidio sidecar
│   └── presidio/           # Python redaction sidecar with custom MRN/HEALTH_PLAN_ID recognizers
├── data/
│   ├── sources.healthcare.ts
│   └── sources.government.ts
├── scripts/
│   ├── corpus-ingest.ts
│   ├── audit-verify.ts
│   └── verify-smoke.ts
└── docs/                   # ARCHITECTURE, COMPLIANCE, ADRs, DEMO_GUIDE
```

---

## Two example interactions

**Paste mode — verify an existing draft:**

```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "healthcare",
    "input_mode": "paste",
    "article": "Patient John Smith, MRN 123456, was diagnosed with Type 2 diabetes. Eating fruits and whole grains can help manage blood sugar."
  }'
```

Response (excerpt):

```json
{
  "kind": "verified",
  "verified_article": "Patient <PERSON_1>, <MRN_1>, was diagnosed with Type 2 diabetes...\n\nThis information is for educational purposes only...",
  "report": {
    "pii_input_count": 2,
    "supported_paragraph_count": 1,
    "unsourced_paragraph_count": 0,
    "disclaimer_injected": true,
    "warnings": ["2 potential PII/PHI items detected and redacted in the input.", ...]
  },
  "audit_log_id": 76
}
```

**Draft mode — write from a brief:**

```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "healthcare",
    "input_mode": "draft",
    "format": "handout",
    "brief": "500-word handout about safe weight loss for adults"
  }'
```

The model drafts the article, then runs through the same verification — every paragraph fact-checked, PII scrubbed, disclaimer injected.

---

## Status

POC quality — architecturally sound, demonstrably working end-to-end, but not yet deployed against the BAAs and audits required for production use in covered entities. See `docs/COMPLIANCE.md` for what we claim and what we explicitly do not.

## License

MIT.
