import {
  getSystemStatus,
  getKpis,
} from '@/lib/admin/queries';
import { verifyChain } from '@/lib/audit/verify-chain';
import { getConfig } from '@/lib/config';
import { Card, HealthDot } from '../_components/Card';
import { KillSwitchToggle } from '../_components/KillSwitchToggle';
import { CheckCircle2, ShieldOff, AlertTriangle, Link2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SystemPage() {
  const [status, kpis, chain] = await Promise.all([
    getSystemStatus(),
    getKpis(),
    // Limit to last 200 rows so the chain walk stays inside Vercel's
    // request budget even on a busy install.
    verifyChain({
      startId: Math.max(1, (await getKpis()).audit_chain_last_id! - 200 || 1),
    }).catch((e) => ({
      valid: false,
      rowsChecked: 0,
      firstFailureId: null,
      firstFailureReason: e instanceof Error ? e.message : 'verify failed',
      startedAt: new Date(),
      finishedAt: new Date(),
      durationMs: 0,
    })),
  ]);

  const config = getConfig();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">System</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Backbone services, audit chain integrity, kill switch, and live runtime config.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Service health" className="lg:col-span-2" contentClassName="px-0 py-0">
          <ul className="divide-y divide-border/60">
            <ServiceRow
              label="Postgres + pgvector"
              status={status.database}
              hint="Audit log + sources + vectors"
            />
            <ServiceRow
              label="Presidio sidecar"
              status={status.presidio}
              hint="PHI / PII detection"
            />
            <ServiceRow
              label="Anthropic Claude"
              status={status.llm}
              hint="Synthesis + classifier"
            />
            <ServiceRow
              label="Voyage AI"
              status={status.embeddings}
              hint="voyage-3 embeddings"
            />
          </ul>
        </Card>

        <Card title="Kill switch" subtitle="One click to halt the entire pipeline.">
          <KillSwitchToggle
            engaged={status.kill_switch.engaged}
            reason={status.kill_switch.reason}
            engagedAt={status.kill_switch.engaged_at ? status.kill_switch.engaged_at.toISOString() : null}
          />
        </Card>
      </div>

      <Card
        title="Audit chain integrity"
        subtitle="Last 200 rows of audit_log recomputed against the stored SHA-256 chain."
      >
        <div className="grid gap-3 md:grid-cols-4">
          <Stat
            label="Verdict"
            value={
              chain.valid ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Valid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-700">
                  <ShieldOff className="h-4 w-4" />
                  TAMPERED
                </span>
              )
            }
          />
          <Stat label="Rows checked" value={chain.rowsChecked.toLocaleString()} />
          <Stat label="Walk duration" value={`${chain.durationMs} ms`} />
          <Stat label="Total chain rows" value={kpis.audit_chain_rows.toLocaleString()} />
        </div>
        {!chain.valid && (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-[12.5px] text-red-800 ring-1 ring-red-200">
            First failure at row #{chain.firstFailureId ?? '—'}: {chain.firstFailureReason}
          </div>
        )}
      </Card>

      <Card
        title="Runtime configuration"
        subtitle="Live env-derived settings. Edit via Vercel env vars + redeploy."
        contentClassName="px-0 py-0"
      >
        <dl className="divide-y divide-border/60 text-[13px]">
          <ConfigRow label="LLM provider" value={config.LLM_PROVIDER} />
          <ConfigRow label="Synthesis model" value={config.ANTHROPIC_SYNTHESIS_MODEL} />
          <ConfigRow label="Classifier model" value={config.ANTHROPIC_CLASSIFIER_MODEL} />
          <ConfigRow label="Embedding provider" value={config.EMBEDDING_PROVIDER} />
          <ConfigRow label="Embedding model" value={config.VOYAGE_EMBEDDING_MODEL} />
          <ConfigRow label="Retrieval top-K" value={config.RETRIEVAL_TOP_K} />
          <ConfigRow label="Min similarity" value={config.RETRIEVAL_MIN_SIMILARITY} />
          <ConfigRow label="Synthesis threshold" value={config.SYNTHESIS_CONFIDENCE_THRESHOLD} />
          <ConfigRow label="Emergency: 911" value={config.EMERGENCY_PHONE_911} />
          <ConfigRow label="Emergency: 988" value={config.MENTAL_HEALTH_CRISIS_PHONE} />
          <ConfigRow label="Poison control" value={config.POISON_CONTROL_PHONE} />
          <ConfigRow label="App URL" value={config.NEXT_PUBLIC_APP_URL} />
          <ConfigRow label="Node env" value={config.NODE_ENV} />
        </dl>
      </Card>
    </div>
  );
}

function ServiceRow({
  label,
  status,
  hint,
}: {
  label: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  hint?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3">
        <HealthDot status={status} />
        <div>
          <div className="text-[13.5px] font-medium text-foreground">{label}</div>
          {hint && <div className="text-[11.5px] text-muted-foreground">{hint}</div>}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[12.5px] text-muted-foreground">
        {status === 'healthy' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
        {status === 'degraded' && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
        {status === 'down' && <ShieldOff className="h-3.5 w-3.5 text-red-600" />}
        {status === 'unknown' && <Link2 className="h-3.5 w-3.5" />}
        <span className="font-medium capitalize">{status}</span>
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-[18px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2.5">
      <dt className="text-[13px] text-foreground/80">{label}</dt>
      <dd className="font-mono text-[12.5px] text-foreground">{String(value)}</dd>
    </div>
  );
}
