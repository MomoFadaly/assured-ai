'use client';

import * as React from 'react';
import {
  Copy,
  FileDown,
  RotateCcw,
  Check,
  RefreshCw,
  Link2,
  Send,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ActionBar({
  article,
  auditLogId,
  scenario,
  onReset,
  onRegenerate,
}: {
  article: string;
  auditLogId: number;
  scenario?: string;
  onReset: () => void;
  onRegenerate?: () => void;
}) {
  const [copiedKey, setCopiedKey] = React.useState<'plain' | 'md' | 'url' | null>(null);
  const [wpStatus, setWpStatus] = React.useState<
    | { kind: 'idle' }
    | { kind: 'sending' }
    | { kind: 'sent'; draftId: number }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  const proofUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/v/${auditLogId}` : `/v/${auditLogId}`;

  const copyPlain = async () => {
    await navigator.clipboard.writeText(article);
    setCopiedKey('plain');
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const copyMarkdown = async () => {
    const md = `<!-- AssuredAI verified · audit #${auditLogId} · ${proofUrl} -->\n\n${article}\n`;
    await navigator.clipboard.writeText(md);
    setCopiedKey('md');
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const copyProofUrl = async () => {
    await navigator.clipboard.writeText(proofUrl);
    setCopiedKey('url');
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const sendToWordPress = async () => {
    if (wpStatus.kind === 'sending') return;
    setWpStatus({ kind: 'sending' });
    const firstLine = article.split('\n').find((l) => l.trim().length > 0) ?? `Verified article #${auditLogId}`;
    const title = firstLine.slice(0, 120);
    try {
      const r = await fetch('/api/wp-mock/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: article,
          audit_log_id: auditLogId,
          scenario: scenario ?? 'healthcare',
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { id: number };
      setWpStatus({ kind: 'sent', draftId: data.id });
      setTimeout(() => setWpStatus({ kind: 'idle' }), 4500);
    } catch (err) {
      setWpStatus({ kind: 'error', message: err instanceof Error ? err.message : 'failed' });
      setTimeout(() => setWpStatus({ kind: 'idle' }), 4500);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" size="sm" onClick={copyPlain}>
            {copiedKey === 'plain' ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy text
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={copyMarkdown}>
            {copiedKey === 'md' ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
              </>
            ) : (
              <>
                <FileDown className="h-3.5 w-3.5" /> Copy as Markdown
              </>
            )}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={copyProofUrl}>
                {copiedKey === 'url' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5" /> Share proof URL
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Anyone can visit this URL to re-verify the proof chain back to genesis.
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={`/api/audit/${auditLogId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileDown className="h-3.5 w-3.5" /> Compliance PDF
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Download the audit + verification report as a polished PDF (file this with your
              CISO).
            </TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="sm" asChild>
            <a href={`/v/${auditLogId}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Public proof
            </a>
          </Button>
          {onRegenerate && (
            <Button variant="outline" size="sm" onClick={onRegenerate}>
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" /> New article
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-card/50 px-3 py-2">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>
            Ready to publish? Push the verified article straight to your headless WordPress draft
            queue.
          </span>
        </div>
        <div className="flex items-center gap-2">
          {wpStatus.kind === 'sent' && (
            <Badge variant="success" className="gap-1">
              <Check className="h-2.5 w-2.5" /> Draft #{wpStatus.draftId} created
            </Badge>
          )}
          {wpStatus.kind === 'error' && (
            <Badge variant="danger">Failed: {wpStatus.message}</Badge>
          )}
          {wpStatus.kind === 'sent' ? (
            <Button variant="default" size="sm" asChild>
              <a href="/wp-mock" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> View in WP
              </a>
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={sendToWordPress}
              disabled={wpStatus.kind === 'sending'}
            >
              {wpStatus.kind === 'sending' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Send to WordPress
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
