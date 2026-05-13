/**
 * GET /api/health — lightweight liveness probe.
 *
 * Used by the header status indicator. Doesn't hit any expensive paths;
 * just confirms the Next.js process is up. Returns 200 if alive.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ status: 'ok', ts: new Date().toISOString() });
}
