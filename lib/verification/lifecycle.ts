/**
 * The AssuredAI verification lifecycle.
 *
 * Replaces the old governed-RAG `runLifecycle` from
 * lib/orchestration/lifecycle.ts. The new flow accepts either a pasted
 * article or a free-form brief, runs every governance check, and returns
 * an annotated report. The corpus is a fact-check reference, not a
 * retrieval cage.
 *
 *   1. KILL SWITCH ─────── if engaged → 503 + audit
 *   2. ACQUIRE ARTICLE ─── paste mode: use input directly
 *                           draft mode: call free-form synthesis
 *   3. RED-FLAG SCAN ───── any emergency phrase → escalation, no publish
 *   4. INPUT REDACTION ─── PII/PHI detected and replaced
 *   5. PARAGRAPH SPLIT ─── article → paragraph[]
 *   6. FACT-CHECK ──────── per paragraph, find supporting chunks
 *   7. DISCLAIMER ──────── detect or inject
 *   8. OUTPUT REDACTION ── second pass over the final, disclaimed article
 *   9. AUDIT WRITE ─────── hash-chained; failure → fail entire request
 */

import { logger } from '@/lib/logger';
import type { AuditCitation, RedFlagCategory, Scenario } from '@/lib/db/types';
import { getKillSwitchState, KILL_SWITCH_MESSAGE } from '@/lib/orchestration/kill-switch';
import { detectRedFlag } from '@/lib/escalation/red-flag';
import { redact, PresidioError } from '@/lib/redaction/presidio-client';
import { writeAudit, writeAuditWithEscalation } from '@/lib/audit/write';
import { JsonSchemaViolation, LlmTransportError } from '@/lib/llm/provider';
import { draftArticle, type DraftFormat } from './draft';
import {
  factCheckParagraphs,
  splitParagraphs,
  type ParagraphCheckResult,
} from './fact-check';
import { checkDisclaimer, ensureDisclaimer } from './disclaimer';

// ============================================================
// Public types
// ============================================================

export type InputMode = 'paste' | 'draft';

export interface VerifyRequest {
  scenario: Scenario;
  user_session_id: string | null;
  /** 'paste' = caller provides article directly; 'draft' = system writes from brief. */
  input_mode: InputMode;
  /** Required when input_mode === 'paste'. */
  article?: string;
  /** Required when input_mode === 'draft'. */
  brief?: string;
  /** Required when input_mode === 'draft'. Defaults to 'qa'. */
  format?: DraftFormat;
}

export interface ParagraphIssue {
  paragraph_index: number;
  text: string;
  pii_redactions: Array<{ entity_type: string; original_excerpt: string }>;
  red_flag_phrases: Array<{ category: RedFlagCategory; phrase: string }>;
  unsourced: boolean;
  best_match_url: string | null;
  best_match_similarity: number;
}

export interface VerificationReport {
  pii_input_count: number;
  pii_output_count: number;
  red_flag_blocked: boolean;
  red_flag_category: RedFlagCategory | null;
  unsourced_paragraph_count: number;
  supported_paragraph_count: number;
  unique_supporting_sources: number;
  disclaimer_required: boolean;
  disclaimer_was_present: boolean;
  disclaimer_injected: boolean;
  ready_to_publish: boolean;
  blocking_issues: string[];
  warnings: string[];
}

export type VerifyResponse =
  | {
      kind: 'verified';
      verified_article: string;
      paragraphs: ParagraphCheckResult[];
      issues: ParagraphIssue[];
      citations: AuditCitation[];
      report: VerificationReport;
      draft_metadata: { model: string; format: DraftFormat } | null;
      audit_log_id: number;
      latency_ms: number;
    }
  | {
      kind: 'red_flag_blocked';
      message: string;
      category: RedFlagCategory;
      audit_log_id: number;
      latency_ms: number;
    }
  | {
      kind: 'kill_switch';
      message: string;
      audit_log_id: number;
      latency_ms: number;
    }
  | {
      kind: 'error';
      message: string;
      audit_log_id: number | null;
      latency_ms: number;
    };

const REDACTED_INPUT_MAX_AUDIT_CHARS = 20_000;

export async function runVerifyLifecycle(req: VerifyRequest): Promise<VerifyResponse> {
  const start = performance.now();
  const ms = () => Math.round(performance.now() - start);

  // ---------- Step 1: Kill switch ----------
  const ks = await getKillSwitchState();
  if (ks.is_engaged) {
    const audit = await writeAudit({
      scenario: req.scenario,
      user_session_id: req.user_session_id,
      query_redacted: '<KILL_SWITCH_ENGAGED>',
      response_redacted: KILL_SWITCH_MESSAGE,
      retrieved_chunk_ids: null,
      citations: null,
      confidence_score: null,
      outcome: 'kill_switch',
      outcome_reason: ks.reason,
      pii_detected_input: false,
      pii_detected_output: false,
      red_flag_category: null,
      latency_ms: ms(),
      model_used: null,
    });
    return {
      kind: 'kill_switch',
      message: KILL_SWITCH_MESSAGE,
      audit_log_id: audit.audit_log_id,
      latency_ms: ms(),
    };
  }

  // ---------- Step 2: Acquire article ----------
  let article: string;
  let draftMeta: { model: string; format: DraftFormat } | null = null;

  if (req.input_mode === 'paste') {
    if (!req.article || req.article.trim().length < 20) {
      return failError(req, ms(), 'paste_input_too_short', null);
    }
    article = req.article.trim();
  } else {
    if (!req.brief || req.brief.trim().length < 5) {
      return failError(req, ms(), 'draft_brief_too_short', null);
    }
    const format = req.format ?? 'qa';
    try {
      const draft = await draftArticle({
        brief: req.brief.trim(),
        scenario: req.scenario,
        format,
      });
      draftMeta = { model: draft.model, format };
      article = draft.response.paragraphs.map((p) => p.text).join('\n\n');
    } catch (err) {
      if (err instanceof JsonSchemaViolation || err instanceof LlmTransportError) {
        return failError(req, ms(), `draft_failed:${err.name}`, err);
      }
      throw err;
    }
  }

  // ---------- Step 3: Red-flag scan ----------
  // Paste mode: someone may paste an article that mentions emergencies.
  // Draft mode: we explicitly told the model not to do this, but verify.
  let redFlag;
  try {
    redFlag = await detectRedFlag(article);
  } catch (err) {
    return failError(req, ms(), 'red_flag_detector_failed', err);
  }

  if (redFlag.triggered && redFlag.category && redFlag.severity) {
    let auditQuery: string;
    try {
      const r = await redact(article);
      auditQuery = r.redacted.slice(0, REDACTED_INPUT_MAX_AUDIT_CHARS);
    } catch {
      auditQuery = '<REDACTION_UNAVAILABLE>';
    }
    const audit = await writeAuditWithEscalation(
      {
        scenario: req.scenario,
        user_session_id: req.user_session_id,
        query_redacted: auditQuery,
        response_redacted: redFlag.emergencyResponse,
        retrieved_chunk_ids: null,
        citations: null,
        confidence_score: null,
        outcome: 'red_flag_escalation',
        outcome_reason: `Category: ${redFlag.category}; severity: ${redFlag.severity}`,
        pii_detected_input: false,
        pii_detected_output: false,
        red_flag_category: redFlag.category,
        latency_ms: ms(),
        model_used: draftMeta?.model ?? null,
      },
      {
        category: redFlag.category,
        severity: redFlag.severity,
        triggering_phrase: redFlag.triggeringPhrase,
      },
    );
    return {
      kind: 'red_flag_blocked',
      message: redFlag.emergencyResponse ?? '',
      category: redFlag.category,
      audit_log_id: audit.audit_log_id,
      latency_ms: ms(),
    };
  }

  // ---------- Step 4: Input redaction ----------
  let inputRedacted;
  try {
    inputRedacted = await redact(article);
  } catch (err) {
    if (err instanceof PresidioError) {
      return failError(req, ms(), 'redaction_unavailable', err);
    }
    throw err;
  }

  // The redacted article is what we publish (and what we fact-check).
  let workingArticle = inputRedacted.redacted;
  const piiInputCount = inputRedacted.entities.length;

  // ---------- Step 5: Paragraph split ----------
  const paragraphs = splitParagraphs(workingArticle);

  // ---------- Step 6: Fact-check ----------
  const factCheck = await factCheckParagraphs(paragraphs, req.scenario);

  // ---------- Step 7: Disclaimer ----------
  const disclaimerCheck = checkDisclaimer(workingArticle, req.scenario);
  let disclaimerInjected = false;
  if (!disclaimerCheck.present && disclaimerCheck.required) {
    const result = ensureDisclaimer(workingArticle, req.scenario);
    workingArticle = result.article;
    disclaimerInjected = result.injected;
  }

  // ---------- Step 8: Output redaction (second pass) ----------
  let outputPiiCount = 0;
  try {
    const out = await redact(workingArticle);
    if (out.entities.length > 0) {
      outputPiiCount = out.entities.length;
      workingArticle = out.redacted;
    }
  } catch (err) {
    return failError(req, ms(), 'output_redaction_failed', err);
  }

  // ---------- Build per-paragraph issue list (for UI annotations) ----------
  const issues: ParagraphIssue[] = factCheck.paragraphs.map((pc) => {
    const isUnsourced = pc.support.kind === 'unsourced';
    const bestMatchUrl =
      pc.support.kind === 'unsourced'
        ? pc.support.best_match?.url ?? null
        : pc.support.citations[0]?.url ?? null;
    const bestMatchSim =
      pc.support.kind === 'unsourced'
        ? pc.support.top_similarity
        : pc.support.top_similarity;
    return {
      paragraph_index: pc.paragraph_index,
      text: pc.text,
      pii_redactions: [], // PII is tracked at article level; per-paragraph attribution is future work
      red_flag_phrases: [],
      unsourced: isUnsourced,
      best_match_url: bestMatchUrl,
      best_match_similarity: bestMatchSim,
    };
  });

  // ---------- Citation summary ----------
  const citationsByUrl = new Map<string, AuditCitation>();
  for (const pc of factCheck.paragraphs) {
    if (pc.support.kind === 'supported') {
      for (const c of pc.support.citations) {
        if (!citationsByUrl.has(c.url)) {
          citationsByUrl.set(c.url, {
            chunk_id: c.chunk_id,
            source_id: c.source_id,
            url: c.url,
            title: c.title,
            organization: c.organization,
          });
        }
      }
    }
  }
  const citations: AuditCitation[] = [...citationsByUrl.values()];

  // ---------- Verification report ----------
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  if (factCheck.unsourced_count > 0) {
    warnings.push(
      `${factCheck.unsourced_count} paragraph${factCheck.unsourced_count === 1 ? '' : 's'} not supported by the source library — editor review recommended.`,
    );
  }
  if (piiInputCount > 0) {
    warnings.push(
      `${piiInputCount} potential PII/PHI item${piiInputCount === 1 ? '' : 's'} detected and redacted in the input.`,
    );
  }
  if (disclaimerInjected) {
    warnings.push('Required disclaimer was missing; injected automatically.');
  }

  const report: VerificationReport = {
    pii_input_count: piiInputCount,
    pii_output_count: outputPiiCount,
    red_flag_blocked: false,
    red_flag_category: null,
    unsourced_paragraph_count: factCheck.unsourced_count,
    supported_paragraph_count: factCheck.supported_count,
    unique_supporting_sources: factCheck.unique_sources_used,
    disclaimer_required: disclaimerCheck.required,
    disclaimer_was_present: disclaimerCheck.present,
    disclaimer_injected: disclaimerInjected,
    ready_to_publish: blockingIssues.length === 0,
    blocking_issues: blockingIssues,
    warnings,
  };

  // ---------- Step 9: Audit write ----------
  const auditOutcome = factCheck.unsourced_count > 0 ? 'i_dont_know' : 'answered';
  const audit = await writeAudit({
    scenario: req.scenario,
    user_session_id: req.user_session_id,
    query_redacted:
      req.input_mode === 'draft'
        ? `<DRAFT_BRIEF> ${(req.brief ?? '').slice(0, 2000)}`
        : inputRedacted.redacted.slice(0, REDACTED_INPUT_MAX_AUDIT_CHARS),
    response_redacted: workingArticle.slice(0, REDACTED_INPUT_MAX_AUDIT_CHARS),
    retrieved_chunk_ids: factCheck.paragraphs
      .flatMap((p) => (p.support.kind === 'supported' ? p.support.citations.map((c) => c.chunk_id) : []))
      .slice(0, 50),
    citations: citations.length > 0 ? citations : null,
    verification_detail: {
      paragraphs: factCheck.paragraphs,
      report,
      draft_metadata: draftMeta,
      input_mode: req.input_mode,
    },
    confidence_score:
      factCheck.paragraphs.length === 0
        ? null
        : factCheck.paragraphs.reduce(
            (sum, p) =>
              sum +
              (p.support.kind === 'supported'
                ? p.support.top_similarity
                : p.support.top_similarity),
            0,
          ) / factCheck.paragraphs.length,
    outcome: auditOutcome,
    outcome_reason:
      factCheck.unsourced_count > 0
        ? `${factCheck.unsourced_count}_unsourced_paragraphs`
        : null,
    pii_detected_input: piiInputCount > 0,
    pii_detected_output: outputPiiCount > 0,
    red_flag_category: null,
    latency_ms: ms(),
    model_used: draftMeta?.model ?? null,
  });

  logger.info(
    {
      mode: req.input_mode,
      paragraphs: factCheck.paragraphs.length,
      supported: factCheck.supported_count,
      unsourced: factCheck.unsourced_count,
      pii_in: piiInputCount,
      pii_out: outputPiiCount,
      disclaimer_injected: disclaimerInjected,
    },
    'verify lifecycle complete',
  );

  return {
    kind: 'verified',
    verified_article: workingArticle,
    paragraphs: factCheck.paragraphs,
    issues,
    citations,
    report,
    draft_metadata: draftMeta,
    audit_log_id: audit.audit_log_id,
    latency_ms: ms(),
  };
}

async function failError(
  req: VerifyRequest,
  latency: number,
  reason: string,
  err: unknown,
): Promise<VerifyResponse> {
  if (err) logger.error({ err, reason }, 'verify lifecycle failed');
  let auditId: number | null = null;
  try {
    const a = await writeAudit({
      scenario: req.scenario,
      user_session_id: req.user_session_id,
      query_redacted:
        req.input_mode === 'draft'
          ? `<DRAFT_BRIEF> ${(req.brief ?? '').slice(0, 2000)}`
          : (req.article ?? '').slice(0, REDACTED_INPUT_MAX_AUDIT_CHARS),
      response_redacted: null,
      retrieved_chunk_ids: null,
      citations: null,
      confidence_score: null,
      outcome: 'model_error',
      outcome_reason: reason,
      pii_detected_input: false,
      pii_detected_output: false,
      red_flag_category: null,
      latency_ms: latency,
      model_used: null,
    });
    auditId = a.audit_log_id;
  } catch (auditErr) {
    logger.error({ auditErr }, 'audit write also failed in failError');
  }
  return {
    kind: 'error',
    message:
      reason === 'paste_input_too_short'
        ? 'The pasted article is too short. Please paste at least a few sentences.'
        : reason === 'draft_brief_too_short'
          ? 'The brief is too short. Please describe what you want written.'
          : "Something went wrong on our end. The interaction has been logged.",
    audit_log_id: auditId,
    latency_ms: latency,
  };
}
