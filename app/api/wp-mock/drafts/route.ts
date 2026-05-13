/**
 * Mock WordPress REST API — POST /api/wp-mock/drafts.
 *
 * Stands in for `wp-json/wp/v2/posts?status=draft` so the demo can show the
 * end-to-end flow: verified content lands in a WP draft queue with the audit
 * id stitched in as post metadata. In production this would be a thin proxy
 * around the client's actual headless-WordPress instance.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DraftSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1).max(60_000),
  audit_log_id: z.number().int().positive().optional(),
  scenario: z.string().min(1).max(40).default('healthcare'),
});

export async function POST(req: Request): Promise<NextResponse> {
  let parsed;
  try {
    parsed = DraftSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid body', detail: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }
  const result = await query<{ id: number; created_at: Date }>(
    `INSERT INTO wp_drafts (title, content, audit_log_id, scenario)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [parsed.title, parsed.content, parsed.audit_log_id ?? null, parsed.scenario],
  );
  const row = result.rows[0];
  if (!row) {
    return NextResponse.json({ error: 'insert failed' }, { status: 500 });
  }
  return NextResponse.json(
    {
      id: row.id,
      title: parsed.title,
      status: 'draft',
      created_at: row.created_at,
      audit_log_id: parsed.audit_log_id ?? null,
      _links: {
        self: { href: `/api/wp-mock/drafts/${row.id}` },
        ui: { href: `/wp-mock/drafts/${row.id}` },
      },
    },
    { status: 201 },
  );
}

export async function GET(): Promise<NextResponse> {
  const result = await query<{
    id: number;
    title: string;
    audit_log_id: number | null;
    scenario: string;
    status: string;
    created_at: Date;
  }>(
    `SELECT id, title, audit_log_id, scenario, status, created_at
       FROM wp_drafts
       ORDER BY id DESC
       LIMIT 50`,
  );
  return NextResponse.json({ drafts: result.rows });
}
