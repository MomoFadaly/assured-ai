import Link from 'next/link';
import { ExternalLink, Settings as SettingsIcon } from 'lucide-react';
import { Card } from '../_components/Card';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          System-wide settings live as Vercel environment variables until the vertical-pack
          refactor lands. The live values are visible on the{' '}
          <Link href="/admin/system" className="underline">
            System
          </Link>{' '}
          page.
        </p>
      </header>

      <Card title="Tunable knobs" contentClassName="text-[13.5px] leading-relaxed">
        <ul className="list-disc space-y-2 pl-5 text-foreground/85">
          <li>
            <code className="rounded bg-muted/40 px-1">RETRIEVAL_MIN_SIMILARITY</code> — cosine
            threshold for paragraph support (default 0.55 in production). Higher = stricter, more
            unsourced flags. Lower = more permissive, risks letting fabrications through.
          </li>
          <li>
            <code className="rounded bg-muted/40 px-1">RETRIEVAL_TOP_K</code> — number of chunks
            retrieved per sentence (default 8).
          </li>
          <li>
            <code className="rounded bg-muted/40 px-1">SYNTHESIS_CONFIDENCE_THRESHOLD</code> —
            below this top-1 similarity, the system returns &ldquo;I don&rsquo;t know&rdquo;
            instead of attempting synthesis (default 0.72).
          </li>
          <li>
            <code className="rounded bg-muted/40 px-1">EMERGENCY_PHONE_911</code> /{' '}
            <code className="rounded bg-muted/40 px-1">MENTAL_HEALTH_CRISIS_PHONE</code> /{' '}
            <code className="rounded bg-muted/40 px-1">POISON_CONTROL_PHONE</code> — region overrides
            for red-flag escalation messages.
          </li>
          <li>
            <code className="rounded bg-muted/40 px-1">LLM_PROVIDER</code> — currently
            <code className="rounded bg-muted/40 px-1">anthropic</code>. Path C v2 will surface
            <code className="rounded bg-muted/40 px-1">azure-openai</code> and
            <code className="rounded bg-muted/40 px-1">ollama</code> here so deployments with BAA
            requirements or zero-egress mandates can swap without code changes.
          </li>
        </ul>
      </Card>

      <Card title="Coming next" contentClassName="text-[13.5px] leading-relaxed">
        <ul className="list-disc space-y-2 pl-5 text-foreground/85">
          <li>
            <span className="font-medium">Vertical packs</span> — replace the hard-coded
            <code className="rounded bg-muted/40 px-1">scenario_t</code> enum with JSON-defined
            packs (healthcare / government / finance / legal). Disclaimers, recognizers, voice
            prompts, red-flag patterns, and retention all live in the pack config.
          </li>
          <li>
            <span className="font-medium">Notification webhooks</span> — Slack / email when a
            scan produces critical/high findings.
          </li>
          <li>
            <span className="font-medium">Retention policy</span> — automatic
            <code className="rounded bg-muted/40 px-1">audit_log</code> aging per pack rules (6 years
            HIPAA, 7 years SOX, etc.).
          </li>
          <li>
            <span className="font-medium">Cost dashboard</span> — Anthropic + Voyage spend per
            scenario, per day.
          </li>
        </ul>
        <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2 text-[12.5px] text-muted-foreground">
          <SettingsIcon className="h-3.5 w-3.5" />
          See the audit doc for the full Path C v2 vertical-pack plan:
          <code className="rounded bg-background px-1">Fueled — Investigation/06_Synthesis/PATH C v2…</code>
        </div>
      </Card>
    </div>
  );
}
