'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { query } from '@/lib/db/client';

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'closed_won', 'closed_lost'] as const;

const UpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().max(4000).optional(),
});

export async function updateLeadAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const parsed = UpdateSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status') ?? undefined,
    notes: formData.get('notes') ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }
  const { id, status, notes } = parsed.data;

  // Only update what was actually sent.
  const fields: string[] = [];
  const args: unknown[] = [id];
  if (status !== undefined) {
    args.push(status);
    fields.push(`status = $${args.length}`);
    if (status === 'closed_won' || status === 'closed_lost') {
      fields.push(`resolved_at = COALESCE(resolved_at, NOW())`);
    } else {
      fields.push(`resolved_at = NULL`);
    }
  }
  if (notes !== undefined) {
    args.push(notes);
    fields.push(`notes = $${args.length}`);
  }
  if (fields.length === 0) return { ok: true };

  await query(
    `UPDATE contact_leads SET ${fields.join(', ')} WHERE id = $1`,
    args,
  );

  revalidatePath('/admin/leads');
  return { ok: true };
}
