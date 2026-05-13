/**
 * TypeScript types matching the Postgres schema in packages/db/schema.sql.
 *
 * These types are the contract between the database and the application.
 * Keep them in sync with schema.sql; mismatches cause runtime errors.
 */

export type Scenario = 'healthcare' | 'government';

export type Outcome =
  | 'answered'
  | 'i_dont_know'
  | 'kill_switch'
  | 'redacted_input_rejected'
  | 'red_flag_escalation'
  | 'citation_violation'
  | 'model_error'
  | 'source_added'
  | 'source_deactivated'
  | 'kill_switch_engaged'
  | 'kill_switch_disengaged';

export type UserRole = 'admin' | 'auditor' | 'operator';

export type RuleType = 'presidio_recognizer' | 'regex' | 'denylist';

export type EscalationSeverity = 'emergency' | 'urgent' | 'review';

export type SourceType =
  | 'government'
  | 'peer-reviewed'
  | 'professional-association'
  | 'client'
  | 'synthetic';

/** Categories of red-flag escalation. */
export type RedFlagCategory =
  | 'cardiac'
  | 'mental_health_crisis'
  | 'overdose'
  | 'severe_bleeding'
  | 'stroke'
  | 'anaphylaxis';

// ============================================================
// TABLE TYPES
// ============================================================

export interface UserRow {
  id: string;
  clerk_id: string;
  email: string;
  role: UserRole;
  created_at: Date;
}

export interface SourceRow {
  id: string;
  organization: string;
  source_type: SourceType;
  url: string;
  title: string;
  publication_date: Date | null;
  ingested_at: Date;
  ingested_by: string | null;
  is_active: boolean;
  scenario: Scenario;
  license_notes: string | null;
}

export interface SourceChunkRow {
  id: string;
  source_id: string;
  chunk_index: number;
  content: string;
  content_hash: string;
  embedding: number[];
  metadata: Record<string, unknown> | null;
}

/** Retrieved chunk joined with its source — what retrieval returns. */
export interface RetrievedChunk {
  id: string;
  source_id: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
  organization: string;
  url: string;
  title: string;
  publication_date: Date | null;
}

export interface AuditLogRow {
  id: number;
  occurred_at: Date;
  scenario: Scenario;
  user_session_id: string | null;
  query_redacted: string;
  response_redacted: string | null;
  retrieved_chunk_ids: string[] | null;
  citations: AuditCitation[] | null;
  confidence_score: number | null;
  outcome: Outcome;
  outcome_reason: string | null;
  pii_detected_input: boolean;
  pii_detected_output: boolean;
  red_flag_category: RedFlagCategory | null;
  latency_ms: number | null;
  model_used: string | null;
  prev_hash: string | null;
  hash: string;
}

export interface AuditCitation {
  chunk_id: string;
  source_id: string;
  url: string;
  title: string;
  organization: string;
}

export interface KillSwitchStateRow {
  id: 1;
  is_engaged: boolean;
  engaged_at: Date | null;
  engaged_by: string | null;
  reason: string | null;
}

export interface RedactionRuleRow {
  id: string;
  scenario: Scenario;
  rule_type: RuleType;
  pattern: string;
  is_enabled: boolean;
  created_at: Date;
  created_by: string | null;
}

export interface FeedbackVoteRow {
  id: string;
  audit_log_id: number;
  voted_at: Date;
  is_helpful: boolean;
  free_text_report: string | null;
  user_session_id: string | null;
}

export interface EscalationRow {
  id: string;
  audit_log_id: number;
  occurred_at: Date;
  category: RedFlagCategory;
  severity: EscalationSeverity;
  triggering_phrase: string | null;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  review_notes: string | null;
}
