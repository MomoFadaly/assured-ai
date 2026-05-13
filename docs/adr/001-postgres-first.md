# ADR-001: Postgres-First Architecture (vs. dedicated vector DB)

**Status:** Accepted
**Date:** 2026-05-06
**Decider:** Project author

## Context

AssuredAI needs three things from its data layer:
1. Operational tables (users, sources, kill switch state, redaction rules)
2. An immutable, hash-chained audit log
3. Vector storage for embeddings (governed RAG)

The choice is between:
- **Postgres-first** — single Postgres instance with `pgvector` extension handles all three
- **Two databases** — Postgres for operational + audit, Pinecone/Weaviate/Turbopuffer for vectors

## Decision

Use Postgres-first with `pgvector` for the POC and most production deployments. Provide a configuration toggle to use Turbopuffer for client deployments at corpus scale > 5M chunks.

## Consequences

### Positive
- **One database to operate, back up, secure, and audit.** Critical for regulated deployments — fewer surfaces for the security team to evaluate.
- **Atomic transactions across operational and vector data.** When a source is deactivated, its chunks become invisible to retrieval in the same transaction.
- **Cheaper at POC and small-mid production scale.** No second SaaS subscription. Neon's free tier covers the POC; self-host has no licensing.
- **Familiar ops.** Every healthcare IT team already runs Postgres. Adding `pgvector` is a CREATE EXTENSION away.
- **Hash-chained audit log lives next to the data it audits.** No cross-database verification problem.

### Negative
- **HNSW indexing in Postgres is younger than dedicated vector DBs.** Performance characteristics differ. We mitigate by capping POC corpus at ~1500 chunks; production deployments at 100K+ chunks should benchmark before committing.
- **Postgres connection pool can become a bottleneck if vector queries are slow.** Mitigation: separate read replica for retrieval; PgBouncer for connection pooling.
- **Migration to dedicated vector DB later is non-trivial.** We mitigate by abstracting retrieval behind a `Retriever` interface in `packages/core/retrieval/`; switching backends changes one file.

## Alternatives Considered

### Pinecone
- Pros: best-in-class vector performance, mature managed service
- Cons: separate vendor + BAA + audit surface; no atomic transactions with operational data; cost adds up at scale; requires sending content to a third-party service — adds a network of compliance surface area
- Rejected because: managed in-house vector storage keeps PHI inside a single trust boundary. For healthcare workloads this dramatically simplifies the compliance posture.

### Turbopuffer
- Pros: cheap at scale, S3-backed storage, clean API
- Cons: still a separate service; less battle-tested in healthcare deployments
- Status: kept as a config toggle for deployments above ~5M chunks where pgvector HNSW becomes slow

### Embedded vector DBs (LanceDB, Chroma)
- Pros: no separate service
- Cons: not battle-tested for production; limited concurrent-write story
- Rejected: maturity risk for a system in regulated environments

## Compliance implications

Per the white paper page 16: *"Assured AI encourages using vector database that are managed in-house... there's no need to send content to external third-party AI services for indexing, reducing exposure and maintaining control."* Postgres-first is consistent with this guidance — vectors live in the same managed Postgres instance the client controls.

## Verification

- POC run: 1500 chunks @ voyage-3 (1024-dim), HNSW index, average retrieval latency 80-200ms — within latency budget.
- Re-evaluate at production scale per client.
