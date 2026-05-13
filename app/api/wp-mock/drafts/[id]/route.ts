import { NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const r = await query(
    `SELECT id, title, content, audit_log_id, scenario, status, created_at
       FROM wp_drafts WHERE id = $1`,
    [numericId],
  );
  if (r.rows.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(r.rows[0]);
}
