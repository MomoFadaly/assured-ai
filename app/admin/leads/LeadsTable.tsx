'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Loader2, Mail, Save } from 'lucide-react';
import type { LeadRow } from './page';
import { updateLeadAction } from './actions';

const TYPES = [
  { v: '', l: 'All types' },
  { v: 'book_a_demo', l: 'Demo requests' },
  { v: 'talk_to_sales', l: 'Sales inquiries' },
  { v: 'contact', l: 'Contact form' },
];

const STATUSES = [
  { v: '', l: 'All statuses' },
  { v: 'new', l: 'New' },
  { v: 'contacted', l: 'Contacted' },
  { v: 'qualified', l: 'Qualified' },
  { v: 'closed_won', l: 'Closed (won)' },
  { v: 'closed_lost', l: 'Closed (lost)' },
];

const STATUS_TONE: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 ring-blue-200',
  contacted: 'bg-amber-50 text-amber-800 ring-amber-200',
  qualified: 'bg-violet-50 text-violet-800 ring-violet-200',
  closed_won: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  closed_lost: 'bg-slate-50 text-slate-700 ring-slate-200',
};

export function LeadsTable({
  rows,
  activeType,
  activeStatus,
  focusId,
}: {
  rows: LeadRow[];
  activeType: string | null;
  activeStatus: string | null;
  focusId: number | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(focusId ? [focusId] : []),
  );

  const focusRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    if (focusId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusId]);

  function setFilter(name: 'type' | 'status', value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(name, value);
    else sp.delete(name);
    sp.delete('focus');
    router.push(`/admin/leads?${sp.toString()}`);
  }

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 text-[12.5px]">
        <select
          value={activeType ?? ''}
          onChange={(e) => setFilter('type', e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-[12px]"
        >
          {TYPES.map((t) => (
            <option key={t.v} value={t.v}>
              {t.l}
            </option>
          ))}
        </select>
        <select
          value={activeStatus ?? ''}
          onChange={(e) => setFilter('status', e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-[12px]"
        >
          {STATUSES.map((s) => (
            <option key={s.v} value={s.v}>
              {s.l}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-[12.5px]">
          <thead className="bg-muted/30 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foreground/65">
            <tr>
              <th className="w-6 px-4 py-3" />
              <th className="px-4 py-3 text-left">Received</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Name / Org</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Pack / Plan</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No leads match the current filters.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const open = expanded.has(r.id);
              const isFocus = focusId === r.id;
              return (
                <Row
                  key={r.id}
                  row={r}
                  open={open}
                  onToggle={() => toggle(r.id)}
                  isFocus={isFocus}
                  ref={isFocus ? focusRef : undefined}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { forwardRef } from 'react';

const Row = forwardRef<
  HTMLTableRowElement,
  { row: LeadRow; open: boolean; onToggle: () => void; isFocus: boolean }
>(function Row({ row, open, onToggle, isFocus }, ref) {
  const created = useMemo(() => new Date(row.created_at), [row.created_at]);

  return (
    <>
      <tr
        ref={ref}
        onClick={onToggle}
        className={`cursor-pointer hover:bg-accent/40 ${isFocus ? 'bg-blue-50/40' : ''}`}
      >
        <td className="px-4 py-3 align-top">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </td>
        <td className="px-4 py-3 align-top text-foreground/85">
          <div className="font-mono text-[11px] text-muted-foreground">#{row.id}</div>
          <div>{created.toLocaleString()}</div>
        </td>
        <td className="px-4 py-3 align-top">
          <span className="inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-foreground/80">
            {row.lead_type ?? 'contact'}
          </span>
        </td>
        <td className="px-4 py-3 align-top text-foreground/85">
          <div className="font-medium text-foreground">{row.name}</div>
          {row.org && <div className="text-[11.5px] text-muted-foreground">{row.org}</div>}
        </td>
        <td className="px-4 py-3 align-top">
          <a
            href={`mailto:${row.email}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-foreground/85 underline-offset-2 hover:underline"
          >
            <Mail className="h-3 w-3" />
            {row.email}
          </a>
        </td>
        <td className="px-4 py-3 align-top text-foreground/80">
          {row.pack_interest && (
            <span className="mr-1 rounded-md bg-muted/40 px-1.5 py-0.5 font-mono text-[10.5px] uppercase">
              {row.pack_interest}
            </span>
          )}
          {row.plan_interest && (
            <span className="rounded-md bg-muted/40 px-1.5 py-0.5 font-mono text-[10.5px] uppercase">
              {row.plan_interest}
            </span>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] ring-1 ${
              STATUS_TONE[row.status] ?? STATUS_TONE.new
            }`}
          >
            {row.status}
          </span>
        </td>
      </tr>
      {open && <DetailRow row={row} />}
    </>
  );
});

function DetailRow({ row }: { row: LeadRow }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(row.notes ?? '');
  const [status, setStatus] = useState(row.status);

  function save() {
    setError(null);
    const fd = new FormData();
    fd.set('id', String(row.id));
    fd.set('status', status);
    fd.set('notes', notes);
    start(async () => {
      const res = await updateLeadAction(fd);
      if (!res.ok) setError(res.error ?? 'Failed.');
    });
  }

  return (
    <tr className="bg-muted/15">
      <td />
      <td colSpan={6} className="px-4 py-5">
        <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 text-[12.5px] leading-relaxed">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Message
              </div>
              <p className="mt-1 whitespace-pre-wrap text-foreground/85">
                {row.message?.trim() || (
                  <span className="text-muted-foreground italic">No message.</span>
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">{row.role || '—'}</Field>
              <Field label="Segment">{row.segment || '—'}</Field>
              <Field label="Volume estimate">{row.volume_estimate || '—'}</Field>
              <Field label="Meeting time">{row.requested_meeting_time || '—'}</Field>
              <Field label="UTM source">{row.utm_source || '—'}</Field>
              <Field label="UTM campaign">{row.utm_campaign || '—'}</Field>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Workflow
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/65">
                Status
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-[12.5px]"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="closed_won">Closed (won)</option>
                <option value="closed_lost">Closed (lost)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/65">
                Internal notes
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Disposition, next steps, links to threads…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-[12.5px] focus:border-foreground focus:outline-none"
              />
            </label>
            {error && (
              <p className="text-[12px] text-red-700 dark:text-red-300">{error}</p>
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-foreground px-3 text-[12.5px] font-semibold text-background hover:opacity-90 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save changes
            </button>
            {row.resolved_at && (
              <p className="text-[11px] text-muted-foreground">
                Resolved {new Date(row.resolved_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-foreground/85">{children}</div>
    </div>
  );
}
