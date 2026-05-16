/**
 * POST /api/wizard/sample — STREAMING live verification for the home-page
 * demo and Step 5 of the /get-started wizard.
 *
 * Streams Server-Sent Events as the verification lifecycle runs. The
 * caller (HomeVerifierDemo on the home page) renders each event as a
 * log line in real time — "Checking against HIPAA Privacy Rule…",
 * "Found 3 PHI spans (MRN, EMAIL, PHONE)", "Matched 2 sources: AHA
 * Cardiac Emergency Guide · CDC heart-attack signs", "Audit #72 ·
 * sha256:5f8a… ← prev:8d4c…". Every line corresponds to a real
 * lifecycle checkpoint — we are not faking the cadence.
 *
 * Wire format (text/event-stream):
 *   event: progress
 *   data: { ...VerifyProgressEvent }
 *
 *   event: result
 *   data: { ok: true, audit_log_id, proof_url, verdict, citations: [...],
 *           pii: { entity_types, input_count, output_count },
 *           red_flag: { triggered, category?, severity? }, ...
 *           hash, prev_hash, elapsed_ms }
 *
 *   event: error
 *   data: { error, message }
 *
 *   event: end
 *   data: {}
 *
 * Rate-limited per IP — same 5/min, 50/day ceiling as before. The
 * lifecycle itself is the dominant cost; streaming doesn't change the
 * per-call cost, only the perceived latency.
 *
 * Why SSE over WebSockets: SSE is one-way (server → client), works
 * through proxies and Vercel's edge network without sticky-session
 * handling, and degrades gracefully (the client renders the final
 * `event: result` even if intermediate progress events are dropped).
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import {
  runVerifyLifecycle,
  type VerifyProgressEvent,
  type VerifyResponse,
} from '@/lib/verification/lifecycle';
import { getPackBySlug } from '@/lib/packs/registry';
import { tenantForServiceCall } from '@/lib/tenants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SUPPORTED_INDUSTRIES = ['healthcare', 'finance', 'government', 'legal'] as const;

const RequestSchema = z.object({
  industry: z.enum(SUPPORTED_INDUSTRIES),
  article: z.string().min(80).max(8_000),
  /**
   * 'json'   (default for back-compat) → buffered single JSON object
   *                                      (same shape Step 5 of the wizard
   *                                      already consumes)
   * 'stream' (new home-page demo)      → text/event-stream response
   */
  mode: z.enum(['stream', 'json']).default('json'),
});

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request): Promise<Response> {
  const limit = checkRateLimit(`wizard:sample:${clientKey(req)}`);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'rate-limited',
        message:
          'Too many sample verifications from your IP. Try again in a few minutes.',
        retryAfter: limit.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(limit.retryAfter),
        },
      },
    );
  }

  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'invalid_body',
        detail: err instanceof Error ? err.message : null,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const pack = await getPackBySlug(parsed.industry);
  if (!pack) {
    return new Response(
      JSON.stringify({
        error: 'pack_not_seeded',
        message: `The ${parsed.industry} pack hasn't been seeded on this deployment yet.`,
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const tenant = await tenantForServiceCall({ apiKeyTenantId: null });

  // ============================================================
  // JSON (legacy) — buffered single response, same shape as before.
  // ============================================================
  if (parsed.mode === 'json') {
    try {
      const started = Date.now();
      const result = await runVerifyLifecycle({
        pack,
        tenant_id: tenant.id,
        input_mode: 'paste',
        article: parsed.article,
        user_session_id: `wizard:${clientKey(req)}`,
      });
      const elapsed_ms = Date.now() - started;
      return new Response(JSON.stringify(buildResultPayload(result, elapsed_ms)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err, industry: parsed.industry }, 'wizard sample (json) failed');
      return new Response(
        JSON.stringify({ error: 'verification_failed', message }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  // ============================================================
  // STREAM — SSE for the home-page demo + Step 5.
  // ============================================================
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sse(event, data)));
        } catch {
          // Stream may be closed if the client disconnected mid-flight.
          // Suppress — the lifecycle still completes and writes its audit.
        }
      };

      // Up-front "what we're about to check against" header so the user
      // sees the regulatory frame *before* lifecycle work begins. These
      // come straight from the pack JSON — same data the server uses
      // for the actual checks.
      send('pack_context', {
        pack_slug: pack.slug,
        pack_name: pack.name,
        compliance_framework: pack.config.compliance_framework ?? null,
        regulatory_references: pack.config.regulatory_references ?? [],
        recognizers: pack.config.recognizers,
        red_flag_rule_count: pack.config.red_flag_rules.length,
      });

      const started = Date.now();
      try {
        const result = await runVerifyLifecycle({
          pack,
          tenant_id: tenant.id,
          input_mode: 'paste',
          article: parsed.article,
          user_session_id: `wizard:${clientKey(req)}`,
          onProgress: (event: VerifyProgressEvent) => {
            send('progress', event);
          },
        });
        const elapsed_ms = Date.now() - started;
        send('result', buildResultPayload(result, elapsed_ms));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err, industry: parsed.industry }, 'wizard sample (stream) failed');
        send('error', { error: 'verification_failed', message });
      } finally {
        send('end', {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      // Vercel-specific: opt out of buffering so events flush as they're
      // emitted, not at end of response.
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Map a VerifyResponse into the rich shape the home-page result panel
 * renders. Surfaces citations, redaction summary, red-flag detail, and
 * hash-chain reference — not just count tiles. The /v/<id> page shows
 * the full audit; this is its compact inline mirror.
 */
function buildResultPayload(result: VerifyResponse, elapsed_ms: number) {
  const proof_url = result.audit_log_id
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://assuredai.online'}/v/${result.audit_log_id}`
    : null;

  if (result.kind === 'verified') {
    return {
      ok: true,
      kind: result.kind,
      audit_log_id: result.audit_log_id,
      proof_url,
      verdict: result.kind,
      ready_to_publish: result.report.ready_to_publish,
      latency_ms: result.latency_ms,
      elapsed_ms,
      // RICH fields (consumed by HomeVerifierDemo).
      citations: result.citations.map((c) => ({
        title: c.title,
        url: c.url,
        organization: c.organization,
      })),
      paragraphs: {
        total: result.paragraphs.length,
        supported: result.report.supported_paragraph_count,
        unsourced: result.report.unsourced_paragraph_count,
      },
      pii: {
        input_count: result.report.pii_input_count,
        output_count: result.report.pii_output_count,
      },
      disclaimer: {
        required: result.report.disclaimer_required,
        was_present: result.report.disclaimer_was_present,
        injected: result.report.disclaimer_injected,
      },
      red_flag: { triggered: false as const },
      blocking_issues: result.report.blocking_issues,
      warnings: result.report.warnings,
      // LEGACY scalar fields (consumed by Step5Verify in /get-started —
      // do not remove without updating that caller).
      citations_count: result.citations.length,
      phi_redacted: result.report.pii_input_count,
    };
  }

  if (result.kind === 'red_flag_blocked') {
    return {
      ok: true,
      kind: result.kind,
      audit_log_id: result.audit_log_id,
      proof_url,
      verdict: 'red_flag_blocked' as const,
      ready_to_publish: false,
      latency_ms: result.latency_ms,
      elapsed_ms,
      citations: [],
      paragraphs: { total: 0, supported: 0, unsourced: 0 },
      pii: { input_count: 0, output_count: 0 },
      disclaimer: { required: false, was_present: false, injected: false },
      red_flag: {
        triggered: true as const,
        category: result.category,
        message: result.message,
      },
      blocking_issues: [`Red-flag rule fired: ${result.category}`],
      warnings: [],
      // LEGACY scalar fields.
      citations_count: 0,
      phi_redacted: 0,
    };
  }

  if (result.kind === 'kill_switch') {
    return {
      ok: false,
      kind: result.kind,
      audit_log_id: result.audit_log_id,
      proof_url,
      verdict: 'kill_switch' as const,
      message: result.message,
      latency_ms: result.latency_ms,
      elapsed_ms,
    };
  }

  return {
    ok: false,
    kind: 'error' as const,
    audit_log_id: result.audit_log_id,
    proof_url,
    verdict: 'error' as const,
    message: result.message,
    latency_ms: result.latency_ms,
    elapsed_ms,
  };
}
