/**
 * End-to-end smoke test for the AssuredAI verification pipeline.
 *
 * Run AFTER:
 *   1. pnpm db:migrate
 *   2. pnpm corpus:ingest --scenario=healthcare
 *   3. presidio sidecar UP
 *   4. .env populated (Anthropic + Voyage keys)
 *
 * Usage: pnpm verify:smoke
 *
 * Costs ~$0.10–0.30 per run (one Anthropic draft call + Voyage embeddings).
 */

import 'dotenv/config';
import { closePool } from '@/lib/db/client';
import { runVerifyLifecycle } from '@/lib/verification/lifecycle';
import { logger } from '@/lib/logger';
import { getPackBySlug } from '@/lib/packs/registry';
import type { VerifyRequest } from '@/lib/verification/lifecycle';

// Smoke-case shape uses the legacy scenario+session keys; we transform
// into the pack-shaped VerifyRequest inside runCase().
interface SmokeRequest {
  scenario: 'healthcare' | 'government';
  input_mode: 'paste' | 'draft';
  user_session_id: string;
  article?: string;
  brief?: string;
  format?: 'qa' | 'handout' | 'faq' | 'social' | 'email';
}

interface Case {
  label: string;
  request: SmokeRequest;
  expectedKind: 'verified' | 'red_flag_blocked' | 'kill_switch' | 'error';
  /** Optional checks against the verified response. */
  expectMinSupported?: number;
  expectMinPiiInput?: number;
  expectDisclaimerInjected?: boolean;
}

const CASES: Case[] = [
  {
    label: 'paste clean health article — should verify with citations',
    request: {
      scenario: 'healthcare',
      input_mode: 'paste',
      user_session_id: 'verify-smoke',
      article:
        'Eating a healthy diet is one of the best ways to lower blood pressure. The DASH eating plan emphasizes fruits, vegetables, whole grains, and low-fat dairy. Adults should aim for 150 minutes of moderate-intensity physical activity per week, such as brisk walking. Limiting sodium and avoiding excess alcohol also help.',
    },
    expectedKind: 'verified',
    expectMinSupported: 1,
    expectDisclaimerInjected: true,
  },
  {
    label: 'paste WITH PII — should redact PERSON, MRN, EMAIL',
    request: {
      scenario: 'healthcare',
      input_mode: 'paste',
      user_session_id: 'verify-smoke',
      article:
        'Patient John Smith, MRN 123456, was diagnosed with Type 2 diabetes. His doctor recommended lifestyle changes. Eating fruits, vegetables, and whole grains can help manage blood sugar. Contact dr.smith@hospital.org for follow-up.',
    },
    expectedKind: 'verified',
    expectMinPiiInput: 3,
  },
  {
    label: 'draft mode — handout for weight loss',
    request: {
      scenario: 'healthcare',
      input_mode: 'draft',
      user_session_id: 'verify-smoke',
      brief: '300-word handout about safe weight loss for adults',
      format: 'handout',
    },
    expectedKind: 'verified',
    expectMinSupported: 3,
  },
  {
    label: 'paste with cardiac red-flag — should block',
    request: {
      scenario: 'healthcare',
      input_mode: 'paste',
      user_session_id: 'verify-smoke',
      article:
        "If you are having severe chest pain right now along with shortness of breath, call 911 immediately.",
    },
    expectedKind: 'red_flag_blocked',
  },
];

async function runCase(c: Case): Promise<{ passed: boolean; reason: string | null; auditId: number | null; ms: number }> {
  try {
    const pack = await getPackBySlug(c.request.scenario);
    if (!pack) {
      return { passed: false, reason: `pack ${c.request.scenario} not found in DB`, auditId: null, ms: 0 };
    }
    const req: VerifyRequest = {
      pack,
      input_mode: c.request.input_mode,
      user_session_id: c.request.user_session_id,
      article: c.request.article,
      brief: c.request.brief,
      format: c.request.format,
    };
    const result = await runVerifyLifecycle(req);
    if (result.kind !== c.expectedKind) {
      return {
        passed: false,
        reason: `expected kind=${c.expectedKind}, got kind=${result.kind}`,
        auditId: 'audit_log_id' in result ? result.audit_log_id : null,
        ms: result.latency_ms,
      };
    }
    if (result.kind === 'verified') {
      if (c.expectMinSupported !== undefined && result.report.supported_paragraph_count < c.expectMinSupported) {
        return {
          passed: false,
          reason: `expected ≥${c.expectMinSupported} supported paragraphs, got ${result.report.supported_paragraph_count}`,
          auditId: result.audit_log_id,
          ms: result.latency_ms,
        };
      }
      if (c.expectMinPiiInput !== undefined && result.report.pii_input_count < c.expectMinPiiInput) {
        return {
          passed: false,
          reason: `expected ≥${c.expectMinPiiInput} PII detections, got ${result.report.pii_input_count}`,
          auditId: result.audit_log_id,
          ms: result.latency_ms,
        };
      }
      if (c.expectDisclaimerInjected !== undefined && result.report.disclaimer_injected !== c.expectDisclaimerInjected) {
        return {
          passed: false,
          reason: `expected disclaimer_injected=${c.expectDisclaimerInjected}, got ${result.report.disclaimer_injected}`,
          auditId: result.audit_log_id,
          ms: result.latency_ms,
        };
      }
    }
    return {
      passed: true,
      reason: null,
      auditId: 'audit_log_id' in result ? result.audit_log_id : null,
      ms: result.latency_ms,
    };
  } catch (err) {
    return {
      passed: false,
      reason: `threw: ${err instanceof Error ? err.message : String(err)}`,
      auditId: null,
      ms: 0,
    };
  }
}

async function main(): Promise<void> {
  console.log(`AssuredAI verify smoke — ${CASES.length} cases\n`);
  const results: Array<Awaited<ReturnType<typeof runCase>> & { label: string }> = [];

  for (const c of CASES) {
    process.stdout.write(`  • ${c.label} … `);
    const r = await runCase(c);
    results.push({ label: c.label, ...r });
    if (r.passed) {
      console.log(`✓  (${r.ms}ms, audit #${r.auditId ?? '—'})`);
    } else {
      console.log(`✗\n      reason: ${r.reason}`);
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  console.log(`\nResult: ${passed}/${results.length} passed`);

  await closePool();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  logger.error({ err }, 'verify smoke crashed');
  await closePool();
  process.exit(2);
});
