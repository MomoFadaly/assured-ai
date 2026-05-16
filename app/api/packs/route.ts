/**
 * GET /api/packs — public registry of active vertical packs.
 *
 * Returns a summary (no regex internals). Used by:
 *   - the verifier UI's pack switcher
 *   - the Chrome extension popup's pack picker
 *   - the WordPress plugin's settings panel
 *
 * Cacheable for 1 minute — packs change rarely, the registry layer
 * already caches reads.
 */

import { NextResponse } from 'next/server';
import { listPacks, toSummary } from '@/lib/packs/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(): Promise<Response> {
  const packs = await listPacks({ activeOnly: true });
  return NextResponse.json(
    { packs: packs.map(toSummary) },
    {
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}
