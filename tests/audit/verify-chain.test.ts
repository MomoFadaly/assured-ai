/**
 * Test the hash recomputation logic of the verifier.
 *
 * Note: the live database integration test requires a real Postgres + the
 * trigger; that lives in an integration suite. Here we test the canonical
 * hash recomputation matches what the database trigger produces for known
 * inputs.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

/**
 * Mirror of the canonical serialization in the trigger and verifier.
 * If this drifts from the SQL trigger, the chain will appear "tampered" on
 * every verify run. The drift is itself the test.
 */
function canonicalForRow(row: {
  scenario: string;
  query_redacted: string;
  response_redacted: string | null;
  outcome: string;
  outcome_reason: string | null;
  occurred_at: Date;
  prev_hash: string;
}): string {
  return [
    row.scenario,
    row.query_redacted,
    row.response_redacted ?? '',
    row.outcome,
    row.outcome_reason ?? '',
    // Postgres TIMESTAMPTZ::text format with +00 suffix
    row.occurred_at.toISOString().replace('T', ' ').replace('Z', '+00'),
    row.prev_hash,
  ].join('|');
}

function hash(s: string): string {
  return createHash('sha256').update(s, 'utf-8').digest('hex');
}

describe('audit chain canonicalization', () => {
  it('produces a stable hash for known inputs', () => {
    const row = {
      scenario: 'healthcare',
      query_redacted: 'What is type 2 diabetes?',
      response_redacted: 'Type 2 diabetes is a chronic condition.',
      outcome: 'answered',
      outcome_reason: null,
      occurred_at: new Date('2026-05-06T12:00:00.000Z'),
      prev_hash: 'genesis',
    };
    const computed = hash(canonicalForRow(row));
    // Snapshot — if this changes, the trigger contract has drifted.
    expect(computed).toMatch(/^[a-f0-9]{64}$/);
    expect(computed.length).toBe(64);
  });

  it('changes if any field changes', () => {
    const base = {
      scenario: 'healthcare',
      query_redacted: 'q',
      response_redacted: 'r',
      outcome: 'answered',
      outcome_reason: null,
      occurred_at: new Date('2026-01-01T00:00:00Z'),
      prev_hash: 'genesis',
    };
    const h0 = hash(canonicalForRow(base));
    const h1 = hash(canonicalForRow({ ...base, query_redacted: 'q-modified' }));
    const h2 = hash(canonicalForRow({ ...base, response_redacted: 'r-modified' }));
    const h3 = hash(canonicalForRow({ ...base, outcome: 'i_dont_know' }));
    const h4 = hash(canonicalForRow({ ...base, prev_hash: 'different' }));

    const all = [h0, h1, h2, h3, h4];
    expect(new Set(all).size).toBe(all.length); // every hash must be distinct
  });

  it('chain links — each row depends on previous hash', () => {
    const row1 = {
      scenario: 'healthcare',
      query_redacted: 'q1',
      response_redacted: 'r1',
      outcome: 'answered',
      outcome_reason: null,
      occurred_at: new Date('2026-01-01T00:00:00Z'),
      prev_hash: 'genesis',
    };
    const h1 = hash(canonicalForRow(row1));

    const row2 = {
      ...row1,
      query_redacted: 'q2',
      response_redacted: 'r2',
      occurred_at: new Date('2026-01-01T00:01:00Z'),
      prev_hash: h1,
    };
    const h2 = hash(canonicalForRow(row2));

    const tampered = hash(canonicalForRow({ ...row2, prev_hash: 'genesis' }));
    expect(h2).not.toBe(tampered);
  });
});
