/**
 * The AssuredAI verification lifecycle — PACK-AWARE.
 *
 * Replaces the prior scenario-based orchestrator. The pack supplies:
 *   - PII recognizer set            (lib/redaction/presidio-client.ts)
 *   - Red-flag rules + escalations  (lib/escalation/red-flag.ts)
 *   - Disclaimer text + detection   (lib/verification/disclaimer.ts)
 *   - Draft voice prompt            (lib/verification/draft.ts)
 *   - Default min-similarity        (lib/verification/fact-check.ts)
 *
 *   1. KILL SWITCH ─────── if engaged → 503 + audit
 *   2. ACQUIRE ARTICLE ─── paste mode: use input directly
 *                          draft mode: call free-form synthesis with pack voice
 *   3. RED-FLAG SCAN ───── pack rules → emergency response, no publish
 *   4. INPUT REDACTION ─── PII/PHI detected via pack recognizers
 *   5. PARAGRAPH SPLIT ─── article → paragraph[]
 *   6. FACT-CHECK ──────── per paragraph, find supporting chunks
 *                          (scoped to sources in the same pack)
 *   7. DISCLAIMER ──────── detect or inject pack's canonical text
 *   8. OUTPUT REDACTION ── second pass with pack recognizers
 *   9. AUDIT WRITE ─────── hash-chained, includes pack id + scenario alias
 */

import { logger } from '@/lib/logger';
import type { AuditCitation, Scenario } from '@/lib/db/types';
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
import { notifyEvent } from '@/lib/notifications/dispatch';
import { recordUsage } from '@/lib/usage';
import { getConfig } from '@/lib/config';
import type { VerticalPackRow } from '@/lib/packs/types';

function providerName(): string {
  return getConfig().LLM_PROVIDER;
}

// ============================================================
// Public types
// ============================================================

export type InputMode = 'paste' | 'draft';

export interface VerifyRequest {
  /** The resolved vertical pack — caller fetches via lib/packs/registry. */
  pack: VerticalPackRow;
  /** The tenant the verification runs under. Caller resolves via lib/tenants. */
  tenant_id?: string | null;
  user_session_id: string | null;
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
  red_flag_phrases: Array<{ category: string; phrase: string }>;
  unsourced: boolean;
  best_match_url: string | null;
  best_match_similarity: number;
}

export interface VerificationReport {
  pii_input_count: number;
  pii_output_count: number;
  red_flag_blocked: boolean;
  red_flag_category: string | null;
  unsourced_paragraph_count: number;
  supported_paragraph_count: number;
  unique_supporting_sources: number;
  disclaimer_required: boolean;
  disclaimer_was_present: boolean;
  disclaimer_injected: boolean;
  ready_to_publish: boolean;
  blocking_issues: string[];
  warnings: string[];
  pack: { id: string; slug: string; name: string; version: string };
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
      category: string;
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
  const pack = req.pack;
  // Best-effort scenario alias for audit-chain canonical-text continuity
  // (the trigger hashes `scenario::text`). New packs default to 'healthcare'
  // for canonical purposes; the source-of-truth is vertical_pack_id.
  const scenarioAlias: Scenario =
    pack.slug === 'government' ? 'government' : 'healthcare';

  // ---------- Step 1: Kill switch ----------
  const ks = await getKillSwitchState();
  if (ks.is_engaged) {
    const audit = await writeAudit({
      scenario: scenarioAlias,
      vertical_pack_id: pack.id,
      tenant_id: req.tenant_id ?? null,
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
      return failError(req, ms(), 'paste_input_too_short', null, scenarioAlias);
    }
    article = req.article.trim();
  } else {
    if (!req.brief || req.brief.trim().length < 5) {
      return failError(req, ms(), 'draft_brief_too_short', null, scenarioAlias);
    }
    const format = req.format ?? 'qa';
    try {
      const draft = await draftArticle({
        brief: req.brief.trim(),
        pack,
        format,
      });
      draftMeta = { model: draft.model, format };
      article = draft.response.paragraphs.map((p) => p.text).join('\n\n');
      void recordUsage({
        kind: 'llm.synthesis',
        provider: providerName(),
        model: draft.model,
        inputTokens: draft.inputTokens ?? null,
        outputTokens: draft.outputTokens ?? null,
        latencyMs: draft.latencyMs,
        packId: pack.id,
        packSlug: pack.slug,
        source: 'verify:draft',
      });
    } catch (err) {
      if (err instanceof JsonSchemaViolation || err instanceof LlmTransportError) {
        return failError(req, ms(), `draft_failed:${err.name}`, err, scenarioAlias);
      }
      throw err;
    }
  }

  // ---------- Step 3: Red-flag scan ----------
  let redFlag;
  try {
    redFlag = await detectRedFlag(article, pack);
  } catch (err) {
    return failError(req, ms(), 'red_flag_detector_failed', err, scenarioAlias);
  }

  if (redFlag.triggered && redFlag.category && redFlag.severity) {
    let auditQuery: string;
    try {
      const r = await redact(article, pack.config.recognizers);
      auditQuery = r.redacted.slice(0, REDACTED_INPUT_MAX_AUDIT_CHARS);
    } catch {
      auditQuery = '<REDACTION_UNAVAILABLE>';
    }
    // Escalations table uses red_flag_category enum — pass the string;
    // unknown categories are stored in audit_log.red_flag_category (TEXT).
    const audit = await writeAuditWithEscalation(
      {
        scenario: scenarioAlias,
        vertical_pack_id: pack.id,
        tenant_id: req.tenant_id ?? null,
        user_session_id: req.user_session_id,
        query_redacted: auditQuery,
        response_redacted: redFlag.emergencyResponse,
        retrieved_chunk_ids: null,
        citations: null,
        confidence_score: null,
        outcome: 'red_flag_escalation',
        outcome_reason: `Pack: ${pack.slug}; category: ${redFlag.category}; severity: ${redFlag.severity}`,
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
    // Fire-and-forget notification fan-out. Don't await — we never want
    // a webhook timeout to slow the user-visible response.
    const excerpt = (inputRedactSnippet(article) ?? '').slice(0, 280);
    void notifyEvent({
      kind: 'red_flag_escalation',
      event_key: `audit:${audit.audit_log_id}`,
      audit_log_id: audit.audit_log_id,
      category: redFlag.category,
      pack_slug: pack.slug,
      excerpt,
    });

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
    inputRedacted = await redact(article, pack.config.recognizers);
  } catch (err) {
    if (err instanceof PresidioError) {
      return failError(req, ms(), 'redaction_unavailable', err, scenarioAlias);
    }
    throw err;
  }

  let workingArticle = inputRedacted.redacted;
  const piiInputCount = inputRedacted.entities.length;

  // ---------- Step 5: Paragraph split ----------
  const paragraphs = splitParagraphs(workingArticle);

  // ---------- Step 6: Fact-check ----------
  // Sources are scoped to the same vertical pack — the legacy scenario_t
  // column on `sources` is in sync via the backfill in migration 004.
  const factCheck = await factCheckParagraphs(paragraphs, scenarioAlias, {
    minSimilarity: pack.config.default_min_similarity,
    topK: pack.config.default_top_k,
  });

  // ---------- Step 7: Disclaimer ----------
  const disclaimerCheck = checkDisclaimer(workingArticle, pack);
  let disclaimerInjected = false;
  if (!disclaimerCheck.present && disclaimerCheck.required) {
    const result = ensureDisclaimer(workingArticle, pack);
    workingArticle = result.article;
    disclaimerInjected = result.injected;
  }

  // ---------- Step 8: Output redaction (second pass) ----------
  let outputPiiCount = 0;
  try {
    const out = await redact(workingArticle, pack.config.recognizers);
    if (out.entities.length > 0) {
      outputPiiCount = out.entities.length;
      workingArticle = out.redacted;
    }
  } catch (err) {
    return failError(req, ms(), 'output_redaction_failed', err, scenarioAlias);
  }

  // ---------- Per-paragraph issue list ----------
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
      pii_redactions: [],
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

  // ---------- Report ----------
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
    warnings.push(`Required ${pack.slug} disclaimer was missing; injected automatically.`);
  }

  // Pack-level publishability hints
  const maxUnsourced = pack.config.max_unsourced_paragraphs_publishable;
  if (typeof maxUnsourced === 'number' && factCheck.unsourced_count > maxUnsourced) {
    blockingIssues.push(
      `${pack.name} pack policy: at most ${maxUnsourced} unsourced paragraph${maxUnsourced === 1 ? '' : 's'} allowed (found ${factCheck.unsourced_count}).`,
    );
  }
  const maxPii = pack.config.max_pii_publishable;
  if (typeof maxPii === 'number' && piiInputCount + outputPiiCount > maxPii) {
    blockingIssues.push(
      `${pack.name} pack policy: zero PII/PHI allowed in publishable content (found ${piiInputCount + outputPiiCount}).`,
    );
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
    pack: { id: pack.id, slug: pack.slug, name: pack.name, version: pack.version },
  };

  // ---------- Step 9: Audit write ----------
  const auditOutcome = factCheck.unsourced_count > 0 ? 'i_dont_know' : 'answered';
  const audit = await writeAudit({
    scenario: scenarioAlias,
    vertical_pack_id: pack.id,
    tenant_id: req.tenant_id ?? null,
    user_session_id: req.user_session_id,
    query_redacted:
      req.input_mode === 'draft'
        ? `<DRAFT_BRIEF> ${(req.brief ?? '').slice(0, 2000)}`
        : inputRedacted.redacted.slice(0, REDACTED_INPUT_MAX_AUDIT_CHARS),
    response_redacted: workingArticle.slice(0, REDACTED_INPUT_MAX_AUDIT_CHARS),
    retrieved_chunk_ids: factCheck.paragraphs
      .flatMap((p) =>
        p.support.kind === 'supported' ? p.support.citations.map((c) => c.chunk_id) : [],
      )
      .slice(0, 50),
    citations: citations.length > 0 ? citations : null,
    verification_detail: {
      paragraphs: factCheck.paragraphs,
      report,
      draft_metadata: draftMeta,
      input_mode: req.input_mode,
      pack: { id: pack.id, slug: pack.slug, version: pack.version },
    },
    confidence_score:
      factCheck.paragraphs.length === 0
        ? null
        : factCheck.paragraphs.reduce(
            (sum, p) =>
              sum +
              (p.support.kind === 'supported' ? p.support.top_similarity : p.support.top_similarity),
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
      pack: pack.slug,
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

/**
 * Light-weight excerpt of the article for notification payloads. We do
 * NOT run Presidio here — we'd have already redacted before this point
 * in the lifecycle if the request reached the red-flag-block branch.
 * The few hundred chars sent to notifications channels are post-redact.
 */
function inputRedactSnippet(input: string): string | null {
  return input ? input.slice(0, 280).replace(/\s+/g, ' ').trim() : null;
}

async function failError(
  req: VerifyRequest,
  latency: number,
  reason: string,
  err: unknown,
  scenarioAlias: Scenario,
): Promise<VerifyResponse> {
  if (err) logger.error({ err, reason, pack: req.pack.slug }, 'verify lifecycle failed');
  let auditId: number | null = null;
  try {
    const a = await writeAudit({
      scenario: scenarioAlias,
      vertical_pack_id: req.pack.id,
      tenant_id: req.tenant_id ?? null,
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
