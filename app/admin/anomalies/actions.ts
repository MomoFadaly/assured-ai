'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/scoped-actor';
import { acknowledgeAnomaly, runAnomalyScan, type ScanReport } from '@/lib/anomaly';

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export async function acknowledgeAnomalyAction(
  formData: FormData,
): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const id = String(formData.get('id') ?? '');
  const notes = String(formData.get('notes') ?? '');
  if (!id) return { ok: false, error: 'Missing anomaly id.' };
  await acknowledgeAnomaly(id, guard.actor.userId, notes || undefined);
  revalidatePath('/admin/anomalies');
  return { ok: true };
}

export async function runAnomalyScanAction(): Promise<Result<ScanReport>> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const report = await runAnomalyScan();
  revalidatePath('/admin/anomalies');
  return { ok: true, data: report };
}
