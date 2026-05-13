# ADR-003: Microsoft Presidio in a Python Sidecar (vs. JS-native)

**Status:** Accepted
**Date:** 2026-05-06
**Decider:** Project author

## Context

AssuredAI must detect and redact PII at both the input (before any model call) and output (before any user-visible response) boundaries. The white paper specifies (page 6-7):

> *"Minimize data collection. Use only what's essential and avoid linking identifiers unless necessary. Keep personalization first-party... Maintain logs and data architecture that allow users' data to be retrieved or purged on demand."*

The choice is between:
1. JS-native PII detection (custom regex + small NER model)
2. Microsoft Presidio (Python) called via HTTP from a sidecar container
3. Cloud APIs (AWS Comprehend Medical, Google DLP, Azure AI Language)

## Decision

Use Microsoft Presidio in a Python sidecar container, called from the Next.js orchestration service via HTTP.

## Consequences

### Positive
- **Industry standard.** Presidio is recognized by federal compliance teams and frequently appears in healthcare AI vendor questionnaires. Choosing it shortcuts compliance review.
- **Maintained by Microsoft.** Active updates, regular new recognizers, broad coverage of US/EU PII.
- **Custom recognizer support.** We can add MRN (medical record number) and HEALTH_PLAN_ID recognizers without forking the library.
- **Sidecar pattern is production-friendly.** Self-host deployments add one container to the Docker Compose; production can deploy it to Cloud Run, K8s, or ECS.
- **Auditability.** Every detection is logged with the recognizer that fired, the entity type, and the redaction action — exportable for compliance review.

### Negative
- **Adds Python to a TypeScript stack.** Mitigation: Python lives only in the sidecar; the application code never imports Python. Operationally, it's "another service to start" — the Docker Compose handles this.
- **Network hop adds latency.** ~50-150ms per redaction call. Mitigation: latency budget of 300ms per redaction step accommodates this; sidecar is co-located on the same network as the orchestration service.
- **Sidecar must be secured.** It must not be exposed publicly. Mitigation: Docker Compose puts it on a private network; Cloud Run deployment uses authenticated invocation; production K8s puts it behind ClusterIP only.

## Alternatives Considered

### JS-native (custom regex + JS NER)
- Pros: no Python; single deployment artifact
- Cons: building a comprehensive PII detector from scratch is a multi-month effort; regex alone misses many entity types; no community recognition for compliance review
- Rejected: maturity gap is too large.

### AWS Comprehend Medical
- Pros: HIPAA-eligible by default with AWS BAA; medical-specific entity types
- Cons: AWS-specific; per-call cost adds up; data egress to AWS for every redaction
- Status: kept as a configuration toggle for AWS-aligned clients; not default.

### Google DLP
- Pros: HIPAA-eligible with Google BAA; comprehensive recognizers
- Cons: Google-specific; data egress
- Status: kept as a configuration toggle; not default.

### Azure AI Language
- Pros: HIPAA-eligible with Microsoft BAA; integrates well with Azure-aligned clients
- Cons: Azure-specific; data egress
- Status: kept as a configuration toggle; not default.

## Architecture

```
┌──────────────────────────────────────┐
│      ORCHESTRATION (Node/TS)         │
│  Step 3 — Input redaction:           │
│    POST http://presidio:5001/analyze │
│  Step 8 — Output redaction:          │
│    POST http://presidio:5001/anonymize│
└──────────────────────────────────────┘
                  │ HTTP
                  ▼
┌──────────────────────────────────────┐
│    PRESIDIO SIDECAR (Python)         │
│  /analyze    → entity detection      │
│  /anonymize  → token replacement     │
│  Built-in: PHONE, EMAIL, US_SSN,     │
│  PERSON, MRN (custom), etc.          │
└──────────────────────────────────────┘
```

## Compliance implications

The white paper specifies (page 7): *"Use cookie banners or preference centers to let users opt in or out of health-sensitive tracking. Support export/erase workflows..."* Presidio's logged detections enable both:
- Right-to-export: every redaction is recorded; users can request a list of every detection on their inputs
- Right-to-erase: redacted-only audit logs mean no raw PII to erase from logs in the first place

## Verification

- 50 adversarial PII test cases in `packages/core/redaction/__tests__/`
- Each test must produce at least one detection of the expected type
- Run as part of CI; merge blocked if any test regresses
