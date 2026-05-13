# ADR-005: Two Deployment Modes (Vercel + Docker Compose)

**Status:** Accepted
**Date:** 2026-05-06
**Decider:** Project author

## Context

AssuredAI must demonstrate two distinct deployment shapes:
1. **Cloud-managed mode** — an integrator or agency hosts AssuredAI for the client. Clients without their own ops capability use this. Mid-market healthcare and government use cases.
2. **Self-hosted mode** — client runs AssuredAI inside their own VPC / on-prem environment. PHI never leaves their infrastructure. Required for the most-regulated clients (large hospital systems, federal agencies, FedRAMP-aligned deployments).

The temptation is to build only one mode. That would limit the addressable market.

## Decision

Build both modes from day one, sharing the same code:
- **POC cloud mode**: Vercel (frontend + API routes) + Neon (Postgres) + Cloud Run (Presidio sidecar) + Anthropic API
- **POC self-host mode**: Docker Compose bundle that runs everything locally — Postgres, Presidio, Next.js — with model provider configurable

Production deploy modes (out of POC scope):
- **Production cloud mode**: HIPAA-eligible managed hosting, managed vector database, Azure OpenAI
- **Production self-host mode**: Helm chart for K8s; clients run on AWS GovCloud, Azure Government, or on-prem

## Consequences

### Positive
- **Both modes from day one keep the architecture honest.** If there were only a cloud mode, we'd accidentally build dependencies on Vercel-specific features. If there were only a self-host mode, we'd accidentally build dependencies on Postgres-only features that wouldn't survive going to a managed cloud DB.
- **The same code runs in both.** Provider abstraction (env-driven config for LLM, embeddings, vector DB, redaction) is exercised by both deployment shapes.
- **Demo can show both.** The Loom can split-screen: "here's the cloud version at the public URL; here's the self-host version running locally on my laptop. Same code."
- **Sales motion is preserved.** The agency-managed-hosting model and the client-deployed model are both standard engagement shapes in this market. Building both keeps both motions open.

### Negative
- **Two paths to maintain.** CI must run tests against both. Mitigation: matrix CI (`deploy_mode: [vercel, docker]`) tests both on every PR.
- **Some features can't fit both.** Vercel functions have a 60-second timeout; some long-running orchestration steps must use streaming. Self-host has no such constraint. Mitigation: code targets the more constrained mode (Vercel timeouts) so that self-host mode inherits compatibility automatically.
- **Authentication differs.** Vercel POC uses Clerk; production self-host needs SAML/OIDC integration. Mitigation: auth is abstracted behind a `Session` interface; Clerk is the POC implementation, SAML/OIDC is the production implementation.

## Architecture

### POC cloud mode
```
[Browser] → Vercel Edge → Next.js API
                ↓
            Neon Postgres + pgvector
                ↓
            Cloud Run: Presidio sidecar
                ↓
            Anthropic API (Claude)
            Voyage AI API (embeddings)
```

### POC self-host mode
```
[Browser] → docker-compose up
            ├─ next.js (port 3000)
            ├─ postgres + pgvector (port 5432)
            ├─ presidio (port 5001)
            └─ env: ANTHROPIC_API_KEY (or AZURE_OPENAI_*, or OLLAMA_HOST)
```

### Production cloud mode (out of POC)
```
[Browser] → HIPAA-eligible CDN → Next.js (managed hosting)
                ↓
            Managed Postgres + pgvector (with BAA)
                ↓
            Containerized Presidio (HIPAA-eligible)
                ↓
            Azure OpenAI (with Microsoft BAA)
```

### Production self-host mode (out of POC)
```
[Browser] → Client load balancer → K8s Helm chart
                ↓
            Client-managed Postgres + pgvector
                ↓
            K8s sidecar: Presidio
                ↓
            On-prem Ollama OR Azure OpenAI Private Link
```

## Alternatives Considered

### Cloud-only (Vercel + Neon)
- Pros: simpler; faster to demo
- Cons: cuts out the most valuable healthcare and federal clients who require self-host
- Rejected: addressable market too small.

### Self-host-only (Docker Compose)
- Pros: maximum compliance flexibility
- Cons: harder to demo to a panel without on-screen ops complexity; no cloud option for clients without ops capability
- Rejected: limits sales motion.

### Pure SaaS multi-tenant
- Pros: lowest cost to operate
- Cons: every healthcare/government deployment is single-tenant by compliance requirement; multi-tenancy adds complexity without serving the actual market
- Rejected: doesn't fit the customer.

## Compliance implications

Per [COMPLIANCE.md](../COMPLIANCE.md), the deployment mode determines the BAA chain:
- Cloud mode: BAAs needed with Vercel, Neon, Cloud Run, Anthropic (or alternative LLM)
- Self-host mode: client controls all infrastructure; BAAs only needed with the LLM provider (or none if running fully local with Ollama)

Industry guidance for healthcare AI recommends self-hosting or co-locating the vector database so PHI stays inside the client's trust boundary. Our self-host mode is consistent with that guidance; our cloud mode uses Neon, which does not have a HIPAA BAA at the time of writing — POC only, not production-ready for healthcare in cloud mode.
