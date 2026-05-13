/**
 * POST /api/feedback — record helpful/unhelpful vote for a chat response.
 *
 * Body: { audit_log_id: number, is_helpful: boolean, free_text?: string }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db/client';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const FeedbackSchema = z.object({
  audit_log_id: z.number().int().positive(),
  is_helpful: z.boolean(),
  free_text: z.string().max(2000).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  let body;
  try {
    body = FeedbackSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request', details: err instanceof Error ? err.message : null },
      { status: 400 },
    );
  }

  const sessionId = req.headers.get('x-session-id') ?? null;

  try {
    await query(
      `INSERT INTO feedback_votes (audit_log_id, is_helpful, free_text_report, user_session_id)
       VALUES ($1, $2, $3, $4)`,
      [body.audit_log_id, body.is_helpful, body.free_text ?? null, sessionId],
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'feedback insert failed');
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
  }
}
