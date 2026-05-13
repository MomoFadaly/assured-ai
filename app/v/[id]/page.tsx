import { notFound } from 'next/navigation';
import { query } from '@/lib/db/client';
import { ProofPage } from '@/components/verify/ProofPage';
import type { AuditCitation } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

interface AuditRow {
  id: number;
  occurred_at: Date;
  scenario: string;
  query_redacted: string;
  response_redacted: string | null;
  citations: AuditCitation[] | null;
  verification_detail: unknown;
  outcome: string;
  outcome_reason: string | null;
  pii_detected_input: boolean;
  pii_detected_output: boolean;
  red_flag_category: string | null;
  latency_ms: number | null;
  model_used: string | null;
  prev_hash: string | null;
  hash: string;
}

export default async function VerifyProofPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId < 1) notFound();

  const result = await query<AuditRow>(
    `SELECT id, occurred_at, scenario, query_redacted, response_redacted,
            citations, verification_detail, outcome, outcome_reason,
            pii_detected_input, pii_detected_output,
            red_flag_category, latency_ms, model_used, prev_hash, hash
       FROM audit_log
       WHERE id = $1`,
    [numericId],
  );
  const row = result.rows[0];
  if (!row) notFound();

  return (
    <ProofPage
      audit={{
        id: row.id,
        occurred_at: row.occurred_at.toISOString(),
        scenario: row.scenario,
        outcome: row.outcome,
        outcome_reason: row.outcome_reason,
        article: row.response_redacted ?? '',
        citations: row.citations ?? [],
        verification_detail: row.verification_detail,
        pii_input: row.pii_detected_input,
        pii_output: row.pii_detected_output,
        red_flag_category: row.red_flag_category,
        latency_ms: row.latency_ms ?? 0,
        model_used: row.model_used,
        prev_hash: row.prev_hash ?? 'genesis',
        hash: row.hash,
      }}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Verified by AssuredAI · #${id}`,
    description:
      'Cryptographic proof that this content was verified by AssuredAI, including the full hash chain back to genesis.',
  };
}
