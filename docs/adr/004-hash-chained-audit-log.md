# ADR-004: Hash-Chained Audit Log (vs. Append-Only Alone)

**Status:** Accepted
**Date:** 2026-05-06
**Decider:** Project author

## Context

The audit log is the single most important table in AssuredAI. It is what compliance officers, regulators, and auditors actually want to see. Three levels of integrity protection are possible:

1. **Application-level append-only** — application code only ever INSERTs, never UPDATEs or DELETEs
2. **Database-level append-only** — UPDATE and DELETE permissions revoked from the application role
3. **Hash-chained** — each row contains a SHA-256 hash of (its own canonical content + the previous row's hash), making any tampering with historical rows detectable

## Decision

Implement all three levels. Application code uses INSERT only. Database role permissions deny UPDATE and DELETE. A trigger computes the hash chain on every INSERT. A `verify-chain` utility walks the chain end-to-end to detect tampering.

## Consequences

### Positive
- **Tamper-evidence at the database layer.** Even a privileged actor with database access cannot quietly modify a historical row without breaking the chain — which the verifier will detect.
- **Defense in depth.** The application could have a bug; the database ACLs could be misconfigured; the trigger could be bypassed by a different connection. The combination of all three makes silent tampering very difficult.
- **Compliance-ready out of the box.** *"Tamper-evident audit log with cryptographic chain verification"* is language that resonates in compliance reviews.
- **Cheap to implement.** ~30 lines of plpgsql for the trigger; ~50 lines of verifier utility; no external dependencies.

### Negative
- **Hash chain breaks on bulk import.** If we ever need to import a historical batch of audit records, the chain has to be recomputed. Mitigation: bulk imports are a maintenance operation; they're recorded with their own audit entry noting the chain break.
- **Hash chain ordering depends on insertion order.** If two audit writes happen concurrently with the same timestamp, ordering is determined by insertion order, which is what we want — but it means the chain is not parallelizable. Acceptable: audit writes are not the throughput-critical path.
- **Hash verification is O(n).** For a year of audit logs at production scale, verification takes minutes. Mitigation: verifier supports start/end ID ranges; checkpoint hashes can be exported periodically for fast partial verification.

## Implementation

The hash function (in `packages/db/schema.sql`):

```sql
CREATE OR REPLACE FUNCTION audit_log_hash_chain()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  last_hash TEXT;
  canonical TEXT;
BEGIN
  SELECT hash INTO last_hash FROM audit_log
    ORDER BY id DESC LIMIT 1;
  NEW.prev_hash := COALESCE(last_hash, 'genesis');
  canonical := NEW.scenario::text || '|' ||
               COALESCE(NEW.query_redacted, '') || '|' ||
               COALESCE(NEW.response_redacted, '') || '|' ||
               NEW.outcome::text || '|' ||
               COALESCE(NEW.outcome_reason, '') || '|' ||
               NEW.occurred_at::text || '|' ||
               NEW.prev_hash;
  NEW.hash := encode(digest(canonical, 'sha256'), 'hex');
  RETURN NEW;
END;
$$;
```

The verifier (in `packages/core/audit/verify-chain.ts`):

1. Walk the table in id-ascending order
2. For each row, recompute the canonical and the SHA-256
3. Compare to the stored `hash`
4. Compare `prev_hash` to the previous row's `hash`
5. Exit non-zero on first mismatch

## Alternatives Considered

### Append-only without hash chain
- Pros: simpler; no trigger
- Cons: a privileged actor with UPDATE permissions (e.g., an attacker who escalates) could silently modify historical rows
- Rejected: insufficient for compliance language we want to use.

### External tamper-evident log (Honeycomb, AWS QLDB, blockchain)
- Pros: stronger cryptographic guarantees in some cases
- Cons: extra dependency; QLDB is AWS-only; blockchain adds complexity for marginal gain
- Rejected: hash-chained Postgres gets us 95% of the value with 5% of the complexity.

### Cryptographic signing (sign each row with a private key)
- Pros: signatures verify without a chain walk
- Cons: key management; key rotation requires re-signing or a key history table; complicates the demo
- Rejected for v1; revisit if compliance teams demand it.

## Verification

CI test: `pnpm audit:verify` runs against a populated test database and must exit 0. A separate adversarial test attempts to UPDATE an audit row and confirms the database rejects it; another attempts to DELETE and confirms rejection.
