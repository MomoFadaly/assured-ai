'use client';

import * as React from 'react';
import { Sparkles, Loader2, Check, ArrowRight, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SupportingCitation } from './AnnotatedArticle';

interface SuggestFixResponse {
  rewrite: string;
  notes?: string;
  source: {
    chunk_id: string;
    organization: string;
    title: string;
    url: string;
  };
  model: string;
  latency_ms: number;
}

export function SuggestFixDialog({
  open,
  onOpenChange,
  originalSentence,
  bestMatch,
  scenario,
  surroundingParagraph,
  onAccept,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  originalSentence: string;
  bestMatch: SupportingCitation;
  scenario: string;
  surroundingParagraph?: string;
  onAccept: (rewrite: string) => void;
}) {
  const [state, setState] = React.useState<
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'ready'; data: SuggestFixResponse }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState({ kind: 'loading' });
    (async () => {
      try {
        const r = await fetch('/api/suggest-fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentence: originalSentence,
            chunk_id: bestMatch.chunk_id,
            vertical_pack_slug: scenario,
            scenario,
            paragraph: surroundingParagraph,
          }),
        });
        if (!r.ok) {
          const detail = await r.json().catch(() => ({}));
          throw new Error((detail as { detail?: string }).detail ?? `HTTP ${r.status}`);
        }
        const data = (await r.json()) as SuggestFixResponse;
        if (!cancelled) setState({ kind: 'ready', data });
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Suggestion failed',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, originalSentence, bestMatch.chunk_id, scenario, surroundingParagraph]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Suggest a sourced rewrite
          </DialogTitle>
          <DialogDescription>
            AssuredAI revises this sentence so it&apos;s fully supported by the closest match in
            your source library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[13.5px] leading-relaxed">
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Original (unsourced)
            </div>
            <p>{originalSentence}</p>
          </div>

          <div className="flex items-center justify-center text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
          </div>

          {state.kind === 'loading' && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-6 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Drafting a sourced rewrite…
            </div>
          )}

          {state.kind === 'error' && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              Could not produce a rewrite: {state.message}
            </div>
          )}

          {state.kind === 'ready' && (
            <>
              <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 px-3 py-2.5 text-[13.5px] leading-relaxed dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                  <Check className="h-3 w-3" /> Suggested rewrite (sourced)
                </div>
                <p>{state.data.rewrite}</p>
                {state.data.notes && (
                  <p className="mt-2 text-[12px] italic text-emerald-800 dark:text-emerald-300">
                    Editor note: {state.data.notes}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2 text-[12px]">
                <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                <span>
                  Anchored to{' '}
                  <a
                    href={state.data.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {state.data.source.organization}: {state.data.source.title}
                  </a>
                </span>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {state.kind === 'ready' && (
            <Button
              onClick={() => {
                onAccept(state.data.rewrite);
                onOpenChange(false);
              }}
            >
              <Check className="h-4 w-4" /> Apply rewrite
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
