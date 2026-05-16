/**
 * POST /api/admin/evidence — build a SOC 2 evidence pack.
 *
 * Returns a binary gzip stream containing the bundled CSVs +
 * MANIFEST.json + README.txt for the requested window. Always
 * audit-logged via `evidence_exports` so we can prove who pulled what,
 * when, even if the bundle is mis-handled downstream.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import {
  ALL_EVIDENCE_TABLES,
  buildEvidencePack,
  type EvidenceTable,
} from '@/lib/evidence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RequestSchema = z.object({
  tenant_id: z.string().uuid().nullable().optional(),
  window_start: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  window_end:   z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  include_tables: z
    .array(z.enum(ALL_EVIDENCE_TABLES as [EvidenceTable, ...EvidenceTable[]]))
    .optional(),
});

export async function POST(req: Request): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.code === 'unauthenticated' ? 401 : 403 },
    );
  }

  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid body', detail: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const start = new Date(parsed.window_start);
  const end = new Date(parsed.window_end);
  // Make end exclusive: caller passes inclusive date; bump to next-day boundary.
  end.setUTCDate(end.getUTCDate() + 1);
  if (end <= start) {
    return NextResponse.json({ error: 'window_end must be on/after window_start' }, { status: 400 });
  }
  const span = (end.getTime() - start.getTime()) / 86_400_000;
  if (span > 366) {
    return NextResponse.json({ error: 'window cannot exceed 366 days per export' }, { status: 400 });
  }

  const { result, bundle } = await buildEvidencePack({
    tenantId: parsed.tenant_id ?? null,
    windowStart: start,
    windowEnd: end,
    requestedBy: guard.actor.userId,
    includeTables: parsed.include_tables,
  });

  // Stream the bundle straight to the client. We attach the
  // export-id + sha256 in headers so the receiver can record them
  // alongside their copy.
  const filename = `assuredai-evidence-${result.id}.bundle.gz`;
  // Wrap in Blob — Web Response's BodyInit types accept Blob, ReadableStream,
  // ArrayBuffer, but not Node Buffer/Uint8Array under Next's stricter typings.
  // Copy into a fresh ArrayBuffer so we satisfy BlobPart's ArrayBuffer (not
  // ArrayBufferLike/SharedArrayBuffer) bound.
  const ab = new ArrayBuffer(bundle.length);
  new Uint8Array(ab).set(bundle);
  const body = new Blob([ab], { type: 'application/gzip' });
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(bundle.length),
      'X-AssuredAI-Export-Id': result.id,
      'X-AssuredAI-Bundle-SHA256': result.bundle_sha256,
      'X-AssuredAI-Bundle-Bytes': String(result.bundle_bytes),
      'Cache-Control': 'no-store',
    },
  });
}
