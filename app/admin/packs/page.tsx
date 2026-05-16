import Link from 'next/link';
import { ArrowUpRight, Layers, Plus } from 'lucide-react';
import { listPacks } from '@/lib/packs/registry';
import { Card } from '../_components/Card';

export const dynamic = 'force-dynamic';

export default async function PacksIndex() {
  const packs = await listPacks({ activeOnly: false });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Vertical packs</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-muted-foreground">
            Each pack is a self-contained policy bundle: PII recognizers,
            red-flag rules, disclaimer text, draft voice, retention. Add a
            pack to onboard a new regulated vertical without code changes.
          </p>
        </div>
        <div className="text-[12px] text-muted-foreground">
          {packs.length} pack{packs.length === 1 ? '' : 's'} ·{' '}
          {packs.filter((p) => p.is_active).length} active
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {packs.map((p) => (
          <Link
            key={p.id}
            href={`/admin/packs/${p.slug}`}
            className="group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {p.slug}
                  </span>
                  {p.is_built_in && (
                    <span className="rounded bg-accent/40 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
                      built-in
                    </span>
                  )}
                  {!p.is_active && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                      inactive
                    </span>
                  )}
                </div>
                <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-foreground">
                  {p.name}
                </h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground line-clamp-2">
                  {p.description}
                </p>
              </div>
              <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-[11.5px]">
              <Mini
                label="Recognizers"
                value={String(p.config.recognizers.length)}
              />
              <Mini
                label="Red flags"
                value={String(p.config.red_flag_rules.length)}
              />
              <Mini
                label="Retention"
                value={`${Math.round(p.config.retention_days / 365)}y`}
              />
            </div>
            {p.config.compliance_framework && (
              <div className="mt-3 inline-flex items-center rounded-md bg-accent/30 px-2 py-1 text-[11px] font-medium text-foreground/80">
                {p.config.compliance_framework}
              </div>
            )}
          </Link>
        ))}
      </div>

      <Card title="Onboarding a new regulated vertical" contentClassName="text-[13.5px] leading-relaxed">
        <ol className="list-decimal space-y-2 pl-5 text-foreground/85">
          <li>
            Author a JSON config matching the shape in{' '}
            <code className="rounded bg-muted/40 px-1">lib/packs/types.ts</code> — disclaimer,
            recognizers, red-flag rules, retention, default thresholds.
          </li>
          <li>
            Insert into <code className="rounded bg-muted/40 px-1">vertical_packs</code>{' '}
            via SQL (admin UI for create/edit lands in the next iteration).
            Pack registry picks the change up within 60 seconds.
          </li>
          <li>
            Ingest a starter source library for the vertical (CDC for healthcare,
            SEC EDGAR for finance, ABA Model Rules for legal, etc.). Sources
            tagged with the pack&rsquo;s <code className="rounded bg-muted/40 px-1">vertical_pack_id</code>{' '}
            are visible to verification calls made under that pack.
          </li>
          <li>
            Add custom Presidio recognizers to{' '}
            <code className="rounded bg-muted/40 px-1">deploy/presidio/recognizers.py</code>{' '}
            for vertical-specific identifiers (account numbers, matter IDs,
            student IDs, etc.) and bump the sidecar.
          </li>
          <li>
            Test via <code className="rounded bg-muted/40 px-1">POST /api/verify</code>{' '}
            with <code className="rounded bg-muted/40 px-1">vertical_pack_slug: &quot;your-pack&quot;</code>.
            Every call lands in the audit log tagged to the pack.
          </li>
        </ol>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/30 px-2 py-1.5">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-medium text-foreground tabular-nums">{value}</div>
    </div>
  );
}
