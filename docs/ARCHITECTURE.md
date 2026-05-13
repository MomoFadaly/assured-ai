# AssuredAI — Architecture

This document describes the AssuredAI POC at the level of detail a senior engineer needs to verify, extend, or critique the design.

## 1. Design principles

These are not optional. Every decision below traces back to one of these.

1. **Governance is non-bypassable.** The 9-step request lifecycle is not a configuration; it is the request. There is no path through the system that skips redaction, citation validation, or audit logging.
2. **Failure is observable, not silent.** Every failure mode produces an audit record. A query that errors generates the same kind of log entry as a query that succeeds.
3. **The audit log is the product.** It is the artifact compliance officers care about. Tamper-evidence is enforced at the database layer, not the application layer.
4. **No hidden retries on paid model calls.** A failed model call is a logged failure, not a silent loop. Cost and behavior must be predictable.
5. **Architecture portable across deployments.** Same code runs in the POC's Vercel/Neon environment and in a self-host Docker Compose stack. Production deployment changes infrastructure, not code.

## 2. Component map

```
┌─────────────────────────────────────────────────────────────────────┐
│                      OPERATOR CONSOLE                               │
│  Next.js, Clerk-authenticated, /admin                               │
│  • Source library mgmt   • Audit viewer (search + verify + export)  │
│  • Kill switch           • Quality dashboard (helpful/unhelpful)    │
│  • Redaction rules       • Compliance reports                       │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CONTENT INTERFACE                               │
│  Next.js, /chat                                                     │
│  • Self-introducing chatbot ("I'm HealthBot, an AI assistant…")     │
│  • Inline citations w/ hover preview & "view source" links          │
│  • "Powered by AI — answers cite our official pages" footer         │
│  • Disclaimer on health-related answers                             │
│  • 👍/👎 voting on every response                                   │
│  • Red-flag escalation banner (911 / 988) when triggered            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ POST /api/query  {question, scenario}
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  ORCHESTRATION SERVICE  (Next.js API)               │
│                                                                     │
│  STEP 1 — KILL SWITCH CHECK                                         │
│    if engaged → return 503 + audit                                  │
│                                                                     │
│  STEP 2 — RED-FLAG DETECTION                                        │
│    classify input for emergency patterns (chest pain, ideation,     │
│    overdose, severe bleeding) → if matched, bypass AI, return       │
│    immediate emergency response with 911/988, audit with            │
│    high-priority flag                                               │
│                                                                     │
│  STEP 3 — INPUT REDACTION (Presidio sidecar, HTTP)                  │
│    PHONE, EMAIL, SSN, MRN, NAME, etc. → tokens                      │
│    if PII detected → flag in audit                                  │
│                                                                     │
│  STEP 4 — RETRIEVAL (pgvector, source-filtered, top-K=8)            │
│    embed query (Voyage voyage-3) → cosine search → return chunks    │
│    with similarity scores                                           │
│                                                                     │
│  STEP 5 — CONFIDENCE GATE                                           │
│    if top-1 similarity < 0.72 → return "I don't have a verified     │
│    source for that" + tangential references                         │
│                                                                     │
│  STEP 6 — SYNTHESIS (Claude Sonnet 4.6, JSON-schema constrained)    │
│    prompt structured so model MUST output                           │
│    {answer_paragraphs:[{text, citation_ids[]}], confidence,         │
│     uncertainty_notes}                                              │
│    citation_ids restricted to provided chunks                       │
│                                                                     │
│  STEP 7 — CITATION VALIDATION                                       │
│    every paragraph must have ≥1 citation_id                         │
│    every citation_id must match a provided chunk                    │
│    if violation → strip paragraph or return "I don't know"          │
│                                                                     │
│  STEP 8 — OUTPUT REDACTION (Presidio second pass)                   │
│    scan response for any leaked PII → scrub                         │
│                                                                     │
│  STEP 9 — AUDIT WRITE (hash-chained, append-only)                   │
│    if write fails → entire request fails                            │
│    no silent loss of audit records                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  POSTGRES 16  +  pgvector  (Neon)                   │
│                                                                     │
│  sources              (vetted library)                              │
│  source_chunks        (chunked + embedded; HNSW index)              │
│  audit_log      [APPEND-ONLY, HASH-CHAINED] - tamper-evident        │
│  kill_switch_state    (single-row config)                           │
│  redaction_rules      (config)                                      │
│  feedback_votes       (👍/👎 + free-text reports)                   │
│  escalations          (red-flag events for governance review)       │
│  users                (operators only; Clerk-synced)                │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. The request lifecycle, in detail

Every query follows the same nine-step path. Latency budget is enforced; the demo will feel deliberate rather than fast, and the deliberateness is part of the product story.

| Step | Operation | Latency budget | Failure → |
|---|---|---|---|
| 1 | Kill switch check | <10ms | 503 + audit |
| 2 | Red-flag detection | <100ms | bypass AI, return emergency response, high-priority audit |
| 3 | Input redaction | <300ms | reject if Presidio errors |
| 4 | Retrieval (pgvector top-K) | <500ms | "I don't know" if zero results above threshold |
| 5 | Confidence gate | <50ms | "I don't know" if below 0.72 |
| 6 | Synthesis (Claude) | <8000ms | retry once on Haiku, then fail |
| 7 | Citation validation | <500ms | strip paragraph or "I don't know" |
| 8 | Output redaction | <300ms | scrub + flag |
| 9 | Audit write | <100ms | **fail entire request** (no silent audit loss) |

End-to-end target: ~10 seconds. End-to-end ceiling: 15 seconds.

## 4. Data model

See [`packages/db/schema.sql`](../packages/db/schema.sql) for the full schema. Key invariants:

**`audit_log` is the product.** It is APPEND-ONLY at the database level (UPDATE and DELETE permissions revoked from the application role) and HASH-CHAINED via a BEFORE INSERT trigger. Each row's `hash` is `sha256(canonical(row) || prev_row.hash)`. The chain root is the literal string `'genesis'`. A `verify-chain` utility walks the chain end-to-end to detect tampering.

**`sources`** holds the vetted library. Sources are tagged by `scenario` so a single deployment can serve multiple use cases without leaking content between them.

**`source_chunks`** holds embeddings. `voyage-3` is 1024-dim. We use HNSW indexing for cosine similarity. Re-ingestion is idempotent via `content_hash`.

**`kill_switch_state`** is a single-row table (CHECK constraint enforces this). Engaging the kill switch is an UPDATE that the orchestration service reads on every request.

**`feedback_votes`** captures helpful/unhelpful per response, plus optional free-text "what was wrong?" reports. Aggregated into the operator console quality dashboard.

**`escalations`** records red-flag events separately from `audit_log` for governance review. Every escalation also produces a row in `audit_log`; the separate table makes review faster.

## 5. Synthesis prompt structure (the heart of citation enforcement)

The synthesis prompt forces the model to emit JSON matching a schema that *contains the citation_ids as data fields, not narrative footnotes.* This is the single most important architectural decision in the system.

```typescript
// Schema (Zod)
const SynthesisResponse = z.object({
  answer_paragraphs: z.array(z.object({
    text: z.string().min(1),
    citation_ids: z.array(z.string().uuid()).min(1)  // ≥1 citation per paragraph
  })),
  confidence: z.enum(['high', 'medium', 'low']),
  uncertainty_notes: z.string().optional()
});
```

The prompt explicitly instructs:
- Answer ONLY using information from the provided chunks
- Every paragraph must have at least one citation_id
- Do not invent citation_ids — use only IDs from the provided chunks
- If the chunks do not contain enough information, return empty `answer_paragraphs` with `confidence: 'low'` and `uncertainty_notes` explaining what's missing

After the model returns, we run `validateCitations()`:
1. Every `citation_id` is checked against the provided chunks; hallucinated IDs throw `CitationViolation`
2. Every paragraph is checked for ≥1 valid citation; violations strip the paragraph
3. If too many paragraphs are stripped, we return the "I don't know" response

The model is never trusted to cite voluntarily. The schema is the contract; the validator is the enforcement.

## 6. Red-flag escalation

The white paper specifically calls out that healthcare chatbots must escalate emergency scenarios to hotlines (page 9: *"Safety: Chatbots must be scoped. They should clearly disclose they are not clinicians and escalate red-flag scenarios."*).

Red-flag categories the POC handles:
- **Cardiac**: chest pain, heart attack symptoms, severe shortness of breath
- **Mental health crisis**: suicidal ideation, self-harm, plans to harm
- **Overdose / poisoning**: accidental or intentional ingestion
- **Severe bleeding / trauma**
- **Stroke symptoms**: face droop, arm weakness, speech difficulty
- **Anaphylaxis**: severe allergic reaction

Detection runs as Step 2 of the lifecycle, BEFORE the input even reaches retrieval. A small Claude Haiku 4.5 classifier evaluates the input and returns category + severity. If severity is "emergency", the AI response is bypassed entirely and replaced with:

```
🚨 If this is a medical emergency, please:

  CALL 911 immediately
  
For mental health crisis:
  CALL or TEXT 988 (Suicide & Crisis Lifeline)
  
For poison emergencies:
  CALL 1-800-222-1222 (Poison Help)

I'm an AI assistant trained on this site's published content.
I cannot provide emergency medical guidance.
```

The escalation is logged to both `audit_log` and `escalations` tables for governance review.

## 7. PII redaction

Two-pass redaction using Microsoft Presidio in a Python sidecar (called via HTTP).

**Why Presidio:** It is the industry-standard PII detection library, actively maintained by Microsoft, recognized by federal compliance teams, and supports custom recognizers. JS-native alternatives are immature.

**Why a sidecar:** Presidio is Python. Running it in a sidecar avoids Python-in-Node hacks and gives us a clean container boundary for production.

**Recognizers used:**
- Built-in: `PHONE_NUMBER`, `EMAIL_ADDRESS`, `US_SSN`, `PERSON`, `US_DRIVER_LICENSE`, `CREDIT_CARD`, `MEDICAL_LICENSE`, `IP_ADDRESS`, `DATE_TIME`, `LOCATION`
- Custom: `MRN` (medical record number), `HEALTH_PLAN_ID`

**Two-pass:**
- **Input pass** — before the model sees the prompt, PII is detected and replaced with type tokens (`<PERSON_1>`, `<MRN_2>`, etc.). The audit log records that PII was detected on input but stores only the redacted version.
- **Output pass** — after the model returns, the response is scanned again. If anything leaked through (e.g., the model paraphrased a name from a chunk), it is scrubbed.

## 8. Deployment topology

Two modes, same code:

**POC mode (this repo):**
- Vercel (frontend + API routes)
- Neon (Postgres + pgvector)
- Cloud Run (Presidio sidecar)
- Anthropic API (Claude)
- Voyage AI API (embeddings)

**Self-host mode (production target for HIPAA):**
- Docker Compose bundle (Next.js, Postgres, Presidio)
- Client-controlled cloud (AWS GovCloud, Azure Government, on-prem)
- Anthropic API or Azure OpenAI (provider abstraction allows swap)
- Voyage AI or local embedding model (provider abstraction)

The Docker Compose bundle is in [`deploy/docker-compose.yml`](../deploy/docker-compose.yml). Production roll-out adds a Helm chart; that's V2.

## 9. Architectural Decision Records

See [`docs/adr/`](./adr/) for the full set. Six ADRs are committed at v1:

| ID | Decision |
|---|---|
| ADR-001 | Postgres-first (vs. dedicated vector DB) |
| ADR-002 | Anthropic Claude as default model (vs. OpenAI) |
| ADR-003 | Presidio in a Python sidecar (vs. JS-native) |
| ADR-004 | Hash-chained audit log (vs. append-only alone) |
| ADR-005 | Two deployment modes (Vercel + Docker Compose) |

## 10. What this POC does NOT do

Honesty up front prevents over-claiming during review.

- **Does not provide HIPAA certification.** The architecture is HIPAA-aware; certification requires BAAs with model providers, formal audit, and HHS review. See [COMPLIANCE.md](./COMPLIANCE.md).
- **Does not provide FedRAMP authorization.** Same pattern.
- **Does not implement multi-tenancy.** Single tenant in POC; production is per-deployment.
- **Does not include SSO.** Clerk handles auth on the operator console; production uses SAML/OIDC.
- **Does not auto-scale.** Vercel and Neon defaults handle demo load; real production needs capacity planning.
- **Does not implement WP integration in code.** Headless WordPress integration is documented; the POC simulates the API surface to demonstrate portability.
- **Does not ingest at production-scale corpus.** ~30 carefully chosen documents demonstrate the architecture; real deployments ingest the client's full content library.
