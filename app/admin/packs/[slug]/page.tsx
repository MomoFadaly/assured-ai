import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getPackBySlug } from '@/lib/packs/registry';
import { Card } from '../../_components/Card';

export const dynamic = 'force-dynamic';

export default async function PackDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pack = await getPackBySlug(slug);
  if (!pack) notFound();

  const c = pack.config;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/packs"
          className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          All packs
        </Link>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight">{pack.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
          <span className="font-mono uppercase tracking-[0.08em]">{pack.slug}</span>
          <span>·</span>
          <span>v{pack.version}</span>
          {c.compliance_framework && (
            <>
              <span>·</span>
              <span>{c.compliance_framework}</span>
            </>
          )}
          {pack.is_built_in && (
            <span className="rounded bg-accent/40 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
              built-in
            </span>
          )}
        </div>
        {pack.description && (
          <p className="mt-2 max-w-3xl text-[14px] text-foreground/80">{pack.description}</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Disclaimer" subtitle="Auto-injected if missing from the article.">
          <p className="rounded-md bg-muted/30 px-3 py-2 text-[13px] italic text-foreground/85">
            &ldquo;{c.disclaimer.canonical}&rdquo;
          </p>
          <details className="mt-3">
            <summary className="cursor-pointer text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Detection patterns ({c.disclaimer.detection_patterns.length})
            </summary>
            <ul className="mt-2 space-y-1 font-mono text-[11.5px] text-foreground/70">
              {c.disclaimer.detection_patterns.map((p, i) => (
                <li key={i} className="break-words">
                  · {p}
                </li>
              ))}
            </ul>
          </details>
        </Card>

        <Card title="Draft voice" subtitle="System prompt the LLM follows when drafting.">
          <p className="whitespace-pre-wrap rounded-md bg-muted/30 px-3 py-2 text-[12.5px] text-foreground/85">
            {c.draft_voice_prompt}
          </p>
        </Card>

        <Card title="PII / PHI recognizers" subtitle="Sent to the Presidio sidecar on every redaction pass." className="lg:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {c.recognizers.map((r) => (
              <span
                key={r}
                className="inline-flex items-center rounded-md bg-accent/40 px-2 py-1 font-mono text-[11px] font-medium text-foreground"
              >
                {r}
              </span>
            ))}
          </div>
        </Card>

        <Card
          title="Red-flag rules"
          subtitle={`${c.red_flag_rules.length} categories. Triggered patterns bypass synthesis and return the escalation immediately.`}
          className="lg:col-span-2"
          contentClassName="px-0 py-0"
        >
          <ul className="divide-y divide-border/60">
            {c.red_flag_rules.map((r) => (
              <li key={r.category} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{r.category}</span>
                  <span
                    className={
                      r.severity === 'emergency'
                        ? 'rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-red-700 ring-1 ring-red-200'
                        : r.severity === 'urgent'
                          ? 'rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-800 ring-1 ring-amber-200'
                          : 'rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-700 ring-1 ring-slate-200'
                    }
                  >
                    {r.severity}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {r.patterns.length} pattern{r.patterns.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1 rounded-md bg-muted/30 px-3 py-2 text-[12.5px] text-foreground/85">
                  {r.escalation}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Trigger patterns
                  </summary>
                  <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-foreground/70">
                    {r.patterns.map((p, i) => (
                      <li key={i} className="break-words">
                        · {p}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Thresholds + retention" contentClassName="px-0 py-0">
          <dl className="divide-y divide-border/60 text-[13px]">
            <Row
              label="Default min similarity"
              value={`${c.default_min_similarity} (sentence-level support threshold)`}
            />
            <Row label="Default top-K" value={String(c.default_top_k)} />
            <Row
              label="Max unsourced publishable"
              value={
                typeof c.max_unsourced_paragraphs_publishable === 'number'
                  ? String(c.max_unsourced_paragraphs_publishable)
                  : '— (no policy)'
              }
            />
            <Row
              label="Max PII publishable"
              value={
                typeof c.max_pii_publishable === 'number'
                  ? String(c.max_pii_publishable)
                  : '— (no policy)'
              }
            />
            <Row
              label="Retention"
              value={`${c.retention_days} days (${Math.round(c.retention_days / 365)} years)`}
            />
          </dl>
        </Card>

        <Card
          title="Regulatory references"
          subtitle="Surfaced on the public proof URL for this pack."
          contentClassName="px-0 py-0"
        >
          <ul className="divide-y divide-border/60">
            {(c.regulatory_references ?? []).map((ref) => (
              <li key={ref.url} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
                <span className="font-medium text-foreground">{ref.name}</span>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground"
                >
                  visit
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
            {(!c.regulatory_references || c.regulatory_references.length === 0) && (
              <li className="px-5 py-4 text-[12.5px] text-muted-foreground">None configured.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card title="JSON config" subtitle="Authoritative form. Edit via SQL until pack-editor UI lands.">
        <pre className="overflow-x-auto rounded-md bg-muted/20 p-4 text-[11px] leading-relaxed">
{JSON.stringify(c, null, 2)}
        </pre>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2.5">
      <dt className="text-foreground/80">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
