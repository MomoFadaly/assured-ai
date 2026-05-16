'use client';

import * as React from 'react';
import { CheckCircle2, AlertTriangle, ExternalLink, Sparkles, RotateCcw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HighlightSelection } from './highlight';
import { SuggestFixDialog } from './SuggestFixDialog';

export interface SupportingCitation {
  chunk_id: string;
  source_id: string;
  url: string;
  title: string;
  organization: string;
  similarity: number;
}

export interface SentenceCheck {
  sentence_index: number;
  text: string;
  start: number;
  end: number;
  citations: SupportingCitation[];
  best_match: SupportingCitation | null;
  top_similarity: number;
}

export interface ParagraphCheck {
  paragraph_index: number;
  text: string;
  sentences: SentenceCheck[];
  support:
    | { kind: 'supported'; citations: SupportingCitation[]; top_similarity: number }
    | {
        kind: 'unsourced';
        best_match: SupportingCitation | null;
        top_similarity: number;
        reason: 'below_threshold' | 'corpus_empty';
      };
}

interface SuggestFixTarget {
  paragraphIndex: number;
  sentenceIndex: number;
  sentenceText: string;
  bestMatch: SupportingCitation;
  paragraphText: string;
}

export function AnnotatedArticle({
  paragraphs,
  disclaimerInjected,
  highlight,
  setHighlight,
  scenario = 'healthcare',
}: {
  paragraphs: ParagraphCheck[];
  disclaimerInjected: boolean;
  highlight: HighlightSelection | null;
  setHighlight: (h: HighlightSelection | null) => void;
  scenario?: string;
}) {
  const [fixTarget, setFixTarget] = React.useState<SuggestFixTarget | null>(null);
  // Client-only accepted rewrites: paragraphIndex:sentenceIndex → new text.
  const [rewrites, setRewrites] = React.useState<Map<string, string>>(new Map());

  const requestFix = React.useCallback(
    (
      paragraphIndex: number,
      sentenceIndex: number,
      sentenceText: string,
      bestMatch: SupportingCitation,
      paragraphText: string,
    ) => {
      setFixTarget({ paragraphIndex, sentenceIndex, sentenceText, bestMatch, paragraphText });
    },
    [],
  );

  const acceptRewrite = React.useCallback((rewrite: string) => {
    if (!fixTarget) return;
    const key = `${fixTarget.paragraphIndex}:${fixTarget.sentenceIndex}`;
    setRewrites((prev) => {
      const next = new Map(prev);
      next.set(key, rewrite);
      return next;
    });
  }, [fixTarget]);

  const revertRewrite = React.useCallback((paragraphIndex: number, sentenceIndex: number) => {
    const key = `${paragraphIndex}:${sentenceIndex}`;
    setRewrites((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  return (
    <article className="prose-article">
      {paragraphs.map((p) => {
        const paragraphCitesSet = paragraphCitesAnyOf(p, highlight);
        const isParagraphPrimary =
          highlight?.kind === 'paragraph' && highlight.paragraphIndex === p.paragraph_index;
        const sentenceInThisPara =
          highlight?.kind === 'sentence' && highlight.paragraphIndex === p.paragraph_index;
        const inSet = paragraphCitesSet || isParagraphPrimary || sentenceInThisPara;
        const dimmed = highlight !== null && !inSet;
        return (
          <ParagraphRow
            key={p.paragraph_index}
            paragraph={p}
            highlight={highlight}
            setHighlight={setHighlight}
            dimmed={dimmed}
            rewrites={rewrites}
            onRequestFix={requestFix}
            onRevertRewrite={revertRewrite}
          />
        );
      })}
      {disclaimerInjected && (
        <div className="mt-3 rounded-lg border-l-2 border-primary bg-primary/5 px-4 py-2 text-[12.5px] italic text-muted-foreground">
          ↑ Disclaimer auto-injected by AssuredAI
        </div>
      )}

      {fixTarget && (
        <SuggestFixDialog
          open={fixTarget !== null}
          onOpenChange={(v) => {
            if (!v) setFixTarget(null);
          }}
          originalSentence={fixTarget.sentenceText}
          bestMatch={fixTarget.bestMatch}
          scenario={scenario}
          surroundingParagraph={fixTarget.paragraphText}
          onAccept={acceptRewrite}
        />
      )}
    </article>
  );
}

/**
 * True iff this paragraph contains any sentence that cites the source the
 * user is currently hovering. Used to decide whether to dim the paragraph as
 * a whole.
 */
function paragraphCitesAnyOf(
  p: ParagraphCheck,
  highlight: HighlightSelection | null,
): boolean {
  if (highlight === null) return false;
  if (highlight.kind === 'source') {
    const sentences = p.sentences ?? [];
    if (sentences.length > 0) {
      return sentences.some((s) =>
        s.citations.some((c) => c.source_id === highlight.sourceId),
      );
    }
    // Older history entries (pre-sentence-refactor) only carry paragraph-level
    // citations; fall back to those so we keep working when the user restores
    // a stored result.
    if (p.support.kind === 'supported') {
      return p.support.citations.some((c) => c.source_id === highlight.sourceId);
    }
    return false;
  }
  return false;
}

function ParagraphRow({
  paragraph,
  highlight,
  setHighlight,
  dimmed,
  rewrites,
  onRequestFix,
  onRevertRewrite,
}: {
  paragraph: ParagraphCheck;
  highlight: HighlightSelection | null;
  setHighlight: (h: HighlightSelection | null) => void;
  dimmed: boolean;
  rewrites: Map<string, string>;
  onRequestFix: (
    paragraphIndex: number,
    sentenceIndex: number,
    sentenceText: string,
    bestMatch: SupportingCitation,
    paragraphText: string,
  ) => void;
  onRevertRewrite: (paragraphIndex: number, sentenceIndex: number) => void;
}) {
  const supported = paragraph.support.kind === 'supported';
  const sim = paragraph.support.top_similarity;
  const isParagraphHovered =
    highlight?.kind === 'paragraph' && highlight.paragraphIndex === paragraph.paragraph_index;

  return (
    <div
      onMouseOver={(e) => {
        // Only fire if pointer is in the paragraph row's "gutter" area, not on
        // a sentence span (sentence spans handle their own hover). React's
        // synthetic event system reliably handles mouseover/mouseout, unlike
        // onMouseEnter/Leave which can miss programmatic dispatches.
        if (
          e.target instanceof HTMLElement &&
          !e.target.closest('span[data-sentence-index]')
        ) {
          setHighlight({ kind: 'paragraph', paragraphIndex: paragraph.paragraph_index });
        }
      }}
      onMouseOut={(e) => {
        const related = e.relatedTarget as Node | null;
        if (related && e.currentTarget.contains(related)) return;
        if (
          highlight?.kind === 'paragraph' &&
          highlight.paragraphIndex === paragraph.paragraph_index
        ) {
          setHighlight(null);
        }
      }}
      className={cn(
        'group relative -mx-2 rounded-md px-2 py-1 transition-all duration-200',
        isParagraphHovered && 'bg-muted/30',
        dimmed && 'opacity-40',
      )}
    >
      <div className="absolute left-0 top-2 flex h-full w-1 flex-col">
        <span
          className={cn(
            'mt-1.5 inline-block size-2 rounded-full transition-all',
            supported ? 'bg-emerald-500' : 'bg-amber-500',
            (isParagraphHovered || (!dimmed && highlight?.kind === 'source' && supported)) &&
              'shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] scale-110',
          )}
        />
      </div>
      <div className="pl-3">
        <p>
          {renderParagraphContent(
            paragraph,
            highlight,
            rewrites,
            (sentenceIndex) => {
              setHighlight({
                kind: 'sentence',
                paragraphIndex: paragraph.paragraph_index,
                sentenceIndex,
              });
            },
            (sentenceIndex) => {
              if (
                highlight?.kind === 'sentence' &&
                highlight.paragraphIndex === paragraph.paragraph_index &&
                highlight.sentenceIndex === sentenceIndex
              ) {
                setHighlight(null);
              }
            },
            (sentenceIndex, sentenceText, bestMatch) => {
              onRequestFix(
                paragraph.paragraph_index,
                sentenceIndex,
                sentenceText,
                bestMatch,
                paragraph.text,
              );
            },
            (sentenceIndex) => {
              onRevertRewrite(paragraph.paragraph_index, sentenceIndex);
            },
          )}
        </p>
        <div
          className={cn(
            'mt-1.5 flex items-center gap-2 transition-opacity',
            !dimmed ? 'opacity-100' : 'opacity-0',
          )}
        >
          {supported ? (
            <SupportTag
              citations={
                (paragraph.support as Extract<ParagraphCheck['support'], { kind: 'supported' }>)
                  .citations
              }
              sim={sim}
            />
          ) : (
            <UnsourcedTag
              bestMatch={
                (paragraph.support as Extract<ParagraphCheck['support'], { kind: 'unsourced' }>)
                  .best_match
              }
              sim={sim}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Walk the paragraph by character offset, emitting:
 *   - sentence spans (interactive — hover targets)
 *   - PII token chips (when the paragraph contains <TYPE_N> markers)
 *   - plain text (everything between sentences and around tokens)
 */
function renderParagraphContent(
  paragraph: ParagraphCheck,
  highlight: HighlightSelection | null,
  rewrites: Map<string, string>,
  onSentenceEnter: (sentenceIndex: number) => void,
  onSentenceLeave: (sentenceIndex: number) => void,
  onRequestFix: (
    sentenceIndex: number,
    sentenceText: string,
    bestMatch: SupportingCitation,
  ) => void,
  onRevertRewrite: (sentenceIndex: number) => void,
): React.ReactNode {
  const out: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  // Older history entries may not have `sentences`. In that case, just render
  // the paragraph text with PII tokens — no sentence-level interactivity.
  const rawSentences = paragraph.sentences;
  if (!rawSentences || rawSentences.length === 0) {
    return renderInline(paragraph.text, 'whole-');
  }
  const sentences = [...rawSentences].sort((a, b) => a.start - b.start);
  for (const s of sentences) {
    if (s.start > cursor) {
      out.push(...renderInline(paragraph.text.slice(cursor, s.start), `gap-${key++}-`));
    }
    const originalSentenceText = paragraph.text.slice(s.start, s.end);
    const rewriteKey = `${paragraph.paragraph_index}:${s.sentence_index}`;
    const rewriteText = rewrites.get(rewriteKey);
    const sentenceText = rewriteText ?? originalSentenceText;
    const isRewritten = rewriteText !== undefined;
    const isSentencePrimary =
      highlight?.kind === 'sentence' &&
      highlight.paragraphIndex === paragraph.paragraph_index &&
      highlight.sentenceIndex === s.sentence_index;
    const sentenceCitesHovered =
      highlight?.kind === 'source' &&
      s.citations.some((c) => c.source_id === highlight.sourceId);
    const inSet = isSentencePrimary || sentenceCitesHovered;
    const isSourceLevelHover = highlight?.kind === 'source';
    const isSentenceLevelHover = highlight?.kind === 'sentence';
    const showBaseline =
      highlight === null && (s.citations.length > 0 || isRewritten);
    const showFaintBaseline =
      highlight === null && s.citations.length === 0 && s.best_match !== null && !isRewritten;
    out.push(
      <Tooltip key={`s-${s.sentence_index}`} disableHoverableContent>
        <TooltipTrigger asChild>
          <span
            data-sentence-index={s.sentence_index}
            onMouseOver={(e) => {
              e.stopPropagation();
              onSentenceEnter(s.sentence_index);
            }}
            onMouseOut={(e) => {
              const related = e.relatedTarget as Node | null;
              if (related && e.currentTarget.contains(related)) return;
              onSentenceLeave(s.sentence_index);
            }}
            className={cn(
              'rounded-[3px] transition-colors duration-150',
              s.citations.length > 0 || isRewritten ? 'cursor-help' : '',
              inSet &&
                'bg-primary/20 text-foreground shadow-[inset_0_-2px_0_hsl(var(--primary)/0.5)]',
              !inSet && showBaseline && 'bg-emerald-500/10',
              !inSet && showFaintBaseline && 'bg-amber-500/10',
              !inSet &&
                (isSourceLevelHover || isSentenceLevelHover) &&
                'bg-transparent',
            )}
          >
            {renderInline(sentenceText, `s-${s.sentence_index}-`)}
            {isRewritten && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRevertRewrite(s.sentence_index);
                }}
                className="ml-1 inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1 py-px text-[9.5px] font-semibold uppercase tracking-wider text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200"
                title="Revert to original sentence"
              >
                <Sparkles className="h-2 w-2" /> rewritten · undo
              </button>
            )}
            {!isRewritten && s.citations.length === 0 && s.best_match !== null && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (s.best_match) {
                    onRequestFix(s.sentence_index, originalSentenceText, s.best_match);
                  }
                }}
                className="ml-1 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-px text-[9.5px] font-semibold uppercase tracking-wider text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200"
                title="Get a sourced rewrite of this sentence"
              >
                <Sparkles className="h-2 w-2" /> suggest fix
              </button>
            )}
          </span>
        </TooltipTrigger>
        {s.citations.length > 0 ? (
          <TooltipContent>
            <p className="font-medium">
              Supported · {s.top_similarity.toFixed(2)}
            </p>
            <ul className="mt-1.5 space-y-1">
              {s.citations.slice(0, 4).map((c) => (
                <li key={c.chunk_id} className="flex items-start gap-1">
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {c.organization}: {c.title}
                  </a>
                </li>
              ))}
            </ul>
          </TooltipContent>
        ) : s.best_match ? (
          <TooltipContent>
            <p className="font-medium">Unsourced — editor review recommended</p>
            <p className="mt-1 text-muted-foreground">
              No chunk in the library matched this sentence above the support threshold.
            </p>
            <p className="mt-2">
              Closest:{' '}
              <a
                href={s.best_match.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {s.best_match.organization}: {s.best_match.title}
              </a>{' '}
              <span className="text-muted-foreground">
                ({s.top_similarity.toFixed(2)})
              </span>
            </p>
          </TooltipContent>
        ) : null}
      </Tooltip>,
    );
    cursor = s.end;
  }
  if (cursor < paragraph.text.length) {
    out.push(...renderInline(paragraph.text.slice(cursor), `tail-${key}-`));
  }
  return out;
}

/** Render a stretch of text, replacing `<TYPE_N>` PII tokens with styled chips. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /<([A-Z_]+_\d+)>/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <Tooltip key={`${keyPrefix}tok-${key++}`}>
        <TooltipTrigger asChild>
          <span className="pii-token cursor-help">{match[1]}</span>
        </TooltipTrigger>
        <TooltipContent>
          PII redaction · {entityLabel(match[1] ?? '')} replaced before this article was logged or
          sent to the model.
        </TooltipContent>
      </Tooltip>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function entityLabel(token: string): string {
  const type = token.replace(/_\d+$/, '');
  const map: Record<string, string> = {
    PERSON: 'Personal name',
    EMAIL_ADDRESS: 'Email address',
    PHONE_NUMBER: 'Phone number',
    US_SSN: 'Social Security number',
    MRN: 'Medical record number',
    HEALTH_PLAN_ID: 'Health plan ID',
    CREDIT_CARD: 'Credit card',
    US_DRIVER_LICENSE: 'Driver license',
    MEDICAL_LICENSE: 'Medical license',
    IP_ADDRESS: 'IP address',
  };
  return map[type] ?? type.toLowerCase().replace(/_/g, ' ');
}

function SupportTag({ citations, sim }: { citations: SupportingCitation[]; sim: number }) {
  const orgs = [...new Set(citations.map((c) => c.organization))];
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900">
      <CheckCircle2 className="h-3 w-3" />
      Supported · {orgs.join(', ')} · {sim.toFixed(2)}
    </span>
  );
}

function UnsourcedTag({ bestMatch, sim }: { bestMatch: SupportingCitation | null; sim: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900"
        >
          <AlertTriangle className="h-3 w-3" />
          Unsourced · {sim.toFixed(2)}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">Editor review recommended</p>
        <p className="mt-1 text-muted-foreground">
          No paragraph in the source library matched this claim above the support threshold.
        </p>
        {bestMatch && (
          <p className="mt-2">
            Closest match:{' '}
            <a
              href={bestMatch.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {bestMatch.organization}: {bestMatch.title}
            </a>{' '}
            <span className="text-muted-foreground">({sim.toFixed(2)})</span>
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
