'use client';

import * as React from 'react';
import { ClipboardPaste, PenLine, ArrowUpRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SampleChips, PASTE_SAMPLES, DRAFT_SAMPLES } from './SampleChips';

const MAX_PASTE_CHARS = 50_000;
const MAX_BRIEF_CHARS = 2_000;

export type DraftFormat = 'qa' | 'handout' | 'faq' | 'social' | 'email';
export type InputMode = 'paste' | 'draft';

const FORMAT_LABEL: Record<DraftFormat, string> = {
  qa: 'Q&A',
  handout: 'Handout',
  faq: 'FAQ',
  social: 'Social',
  email: 'Email',
};

const FORMAT_HINT: Record<DraftFormat, string> = {
  qa: 'Conversational answer · 1–4 paragraphs',
  handout: 'Patient handout · 250–500 words, structured sections',
  faq: '4–6 question/answer pairs',
  social: 'Single short post · 60–110 words',
  email: 'Newsletter blurb · 150–220 words',
};

const PASTE_PLACEHOLDER = `Paste a draft article you want AssuredAI to check.

Anything goes — content from another tool, a writer's draft, a press release, a patient handout. We run it through the same compliance pipeline before it's safe to publish.`;

const DRAFT_PLACEHOLDER = `Describe the article you want AssuredAI to write.

For example: "500-word handout for a weight-loss patient" · "FAQ about flu shots for parents" · "Newsletter blurb on the new telehealth coverage rules."`;

export interface InputPanelProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  article: string;
  onArticleChange: (v: string) => void;
  brief: string;
  onBriefChange: (v: string) => void;
  format: DraftFormat;
  onFormatChange: (f: DraftFormat) => void;
  submitting: boolean;
  onSubmit: () => void;
}

export function InputPanel({
  mode,
  onModeChange,
  article,
  onArticleChange,
  brief,
  onBriefChange,
  format,
  onFormatChange,
  submitting,
  onSubmit,
}: InputPanelProps) {
  const minPaste = 20;
  const minBrief = 5;
  const canSubmit =
    !submitting &&
    (mode === 'paste' ? article.trim().length >= minPaste : brief.trim().length >= minBrief);

  const formRef = React.useRef<HTMLFormElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="flex h-full flex-col"
    >
      {/* Mode tabs */}
      <div className="px-5 pt-5">
        <div className="relative inline-flex rounded-lg border border-border bg-card p-1 text-[13px] font-medium shadow-sm">
          <ModeTab
            active={mode === 'paste'}
            onClick={() => onModeChange('paste')}
            icon={<ClipboardPaste className="h-3.5 w-3.5" />}
            label="Paste an article"
          />
          <ModeTab
            active={mode === 'draft'}
            onClick={() => onModeChange('draft')}
            icon={<PenLine className="h-3.5 w-3.5" />}
            label="Write an article"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 pb-3 pt-4">
        {mode === 'paste' ? (
          <div className="flex flex-1 flex-col">
            {/* One-click sample chips — pre-fill the textarea so reviewers
                don't have to think about what to paste. */}
            <div className="mb-3">
              <SampleChips
                samples={PASTE_SAMPLES}
                disabled={submitting}
                onSelect={(s) => onArticleChange(s.text)}
              />
            </div>
            <label htmlFor="article" className="mb-1.5 text-[12px] font-medium text-muted-foreground">
              Article text
            </label>
            <textarea
              id="article"
              value={article}
              onChange={(e) => onArticleChange(e.target.value.slice(0, MAX_PASTE_CHARS))}
              onKeyDown={handleKeyDown}
              placeholder={PASTE_PLACEHOLDER}
              disabled={submitting}
              spellCheck={false}
              maxLength={MAX_PASTE_CHARS}
              className="flex-1 min-h-[220px] resize-none rounded-lg border border-border bg-card px-4 py-3 text-[14px] leading-[1.65] shadow-sm transition-colors placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span
                className={cn(
                  'tabular-nums transition-colors',
                  article.length >= MAX_PASTE_CHARS
                    ? 'font-medium text-red-600 dark:text-red-400'
                    : article.length > MAX_PASTE_CHARS * 0.9
                      ? 'font-medium text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground',
                )}
              >
                {article.length.toLocaleString()} / {MAX_PASTE_CHARS.toLocaleString()} chars
              </span>
              <span
                className={cn(
                  'text-muted-foreground transition-opacity',
                  article.trim().length >= minPaste ? 'opacity-0' : '',
                )}
              >
                Paste at least a few sentences
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            {/* One-click sample briefs — each sets both the prompt AND the format
                so reviewers see the full draft workflow without configuring. */}
            <div className="mb-3">
              <SampleChips
                samples={DRAFT_SAMPLES}
                disabled={submitting}
                onSelect={(s) => {
                  onBriefChange(s.brief);
                  onFormatChange(s.format);
                }}
              />
            </div>
            <label htmlFor="brief" className="mb-1.5 text-[12px] font-medium text-muted-foreground">
              Editorial brief
            </label>
            <textarea
              id="brief"
              value={brief}
              onChange={(e) => onBriefChange(e.target.value.slice(0, MAX_BRIEF_CHARS))}
              onKeyDown={handleKeyDown}
              placeholder={DRAFT_PLACEHOLDER}
              disabled={submitting}
              rows={4}
              maxLength={MAX_BRIEF_CHARS}
              className="resize-none rounded-lg border border-border bg-card px-4 py-3 text-[14px] leading-[1.65] shadow-sm transition-colors placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span
                className={cn(
                  'tabular-nums transition-colors',
                  brief.length >= MAX_BRIEF_CHARS
                    ? 'font-medium text-red-600 dark:text-red-400'
                    : brief.length > MAX_BRIEF_CHARS * 0.9
                      ? 'font-medium text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground',
                )}
              >
                {brief.length.toLocaleString()} / {MAX_BRIEF_CHARS.toLocaleString()} chars
              </span>
              <span
                className={cn(
                  'text-muted-foreground transition-opacity',
                  brief.trim().length >= minBrief ? 'opacity-0' : '',
                )}
              >
                Describe what to write
              </span>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[12px] font-medium text-muted-foreground">Format</div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(FORMAT_LABEL) as DraftFormat[]).map((k) => {
                  const active = format === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onFormatChange(k)}
                      disabled={submitting}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-[12px] font-medium transition-all',
                        active
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                      )}
                    >
                      {FORMAT_LABEL[k]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{FORMAT_HINT[format]}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t border-border bg-card/30 px-5 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {mode === 'paste'
              ? 'Pasted content stays inside this session.'
              : 'AI drafts run through the same checks as pasted articles.'}
          </p>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Wrapping span keeps the tooltip alive while the button is disabled. */}
                <span tabIndex={canSubmit ? -1 : 0} className="inline-flex">
                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    size="default"
                    className="min-w-[160px]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                      </>
                    ) : mode === 'paste' ? (
                      <>
                        Verify article <Kbd>⌘↵</Kbd>
                      </>
                    ) : (
                      <>
                        Draft &amp; verify <ArrowUpRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canSubmit && !submitting && (
                <TooltipContent side="top">
                  {mode === 'paste'
                    ? `Paste at least ${minPaste} characters to enable verification.`
                    : `Describe the article in at least ${minBrief} characters to enable drafting.`}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </form>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {active && (
        <span className="absolute inset-0 rounded-md bg-background shadow-sm ring-1 ring-border" aria-hidden />
      )}
      <span className="relative flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1 rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1 py-0.5 font-mono text-[10px] text-primary-foreground/80">
      {children}
    </kbd>
  );
}
