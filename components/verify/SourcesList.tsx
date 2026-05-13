'use client';

import * as React from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import type { AuditCitation } from '@/lib/db/types';
import type { ParagraphCheck } from './AnnotatedArticle';
import {
  paragraphSourceIds,
  sentenceSourceIds,
  type HighlightSelection,
} from './highlight';
import { cn } from '@/lib/utils';

export function SourcesList({
  citations,
  paragraphs,
  highlight,
  setHighlight,
}: {
  citations: AuditCitation[];
  paragraphs: ParagraphCheck[];
  highlight: HighlightSelection | null;
  setHighlight: (h: HighlightSelection | null) => void;
}) {
  if (citations.length === 0) return null;

  // Pre-compute, for each source, which paragraph indices cite it.
  const indexBySource = React.useMemo(() => {
    const map = new Map<string, number[]>();
    for (const p of paragraphs) {
      const ids = paragraphSourceIds(p);
      for (const id of ids) {
        const arr = map.get(id) ?? [];
        arr.push(p.paragraph_index);
        map.set(id, arr);
      }
    }
    return map;
  }, [paragraphs]);

  // Sources cited by the currently-hovered paragraph or sentence (if any).
  const linkedSourceIds: Set<string> = React.useMemo(() => {
    if (highlight?.kind === 'paragraph') {
      const p = paragraphs.find((x) => x.paragraph_index === highlight.paragraphIndex);
      if (!p) return new Set();
      return paragraphSourceIds(p);
    }
    if (highlight?.kind === 'sentence') {
      const p = paragraphs.find((x) => x.paragraph_index === highlight.paragraphIndex);
      if (!p) return new Set();
      const sentences = p.sentences ?? [];
      const s = sentences.find((x) => x.sentence_index === highlight.sentenceIndex);
      if (!s) return new Set();
      return sentenceSourceIds(s);
    }
    return new Set();
  }, [highlight, paragraphs]);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Sources used · {citations.length}
        </h3>
        <span className="text-[10.5px] text-muted-foreground">
          Hover to see what each source supports
        </span>
      </div>
      <ul className="space-y-1.5">
        {citations.map((c) => {
          const isPrimary =
            highlight?.kind === 'source' && highlight.sourceId === c.source_id;
          const isLinked = linkedSourceIds.has(c.source_id);
          const inSet = isPrimary || isLinked;
          const dimmed = highlight !== null && !inSet;
          const supportingParagraphs = indexBySource.get(c.source_id) ?? [];

          return (
            <li
              key={c.url}
              onMouseOver={() =>
                setHighlight({ kind: 'source', sourceId: c.source_id })
              }
              onMouseOut={(e) => {
                const related = e.relatedTarget as Node | null;
                if (related && e.currentTarget.contains(related)) return;
                setHighlight(null);
              }}
              className={cn(
                'rounded-lg transition-all duration-200',
                inSet && 'bg-primary/5 ring-1 ring-primary/40',
                dimmed && 'opacity-40',
              )}
            >
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-[13px]"
              >
                <span
                  className={cn(
                    'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all',
                    inSet
                      ? 'bg-primary text-primary-foreground shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]'
                      : 'bg-primary/10 text-primary',
                  )}
                >
                  {orgInitials(c.organization)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{c.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {c.organization} · {prettyHost(c.url)}
                  </span>
                </span>
                {supportingParagraphs.length > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-all',
                      inSet
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                    aria-label={`${supportingParagraphs.length} paragraph${supportingParagraphs.length === 1 ? '' : 's'} cite this`}
                  >
                    <FileText className="h-2.5 w-2.5" />
                    {supportingParagraphs.length}
                  </span>
                )}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-foreground" />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function orgInitials(org: string): string {
  if (org.includes('/')) {
    return org.split('/')[1]?.slice(0, 3) ?? org.slice(0, 3);
  }
  const words = org.split(' ').filter(Boolean);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0] ?? '') + (words[1][0] ?? '');
  }
  return org.slice(0, 3);
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
