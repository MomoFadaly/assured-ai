'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Inline hash chip: shows a truncated hash, tooltip reveals the full value,
 * and clicking copies the full hash to the clipboard with a brief check-mark
 * confirmation. Used in /audit and other tables where 64-char hashes need
 * to be visible without breaking the row layout.
 */
export function HashCell({
  hash,
  short = 12,
  className,
}: {
  hash: string;
  short?: number;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const handle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handle}
            className={cn(
              'inline-flex items-center gap-1 rounded font-mono text-[10.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              'px-1 py-0.5',
              className,
            )}
            aria-label={copied ? 'Copied' : 'Copy full hash'}
          >
            {hash.slice(0, short)}…
            {copied ? (
              <Check className="h-2.5 w-2.5 text-emerald-500" />
            ) : (
              <Copy className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-60" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[420px]">
          <p className="font-medium">{copied ? 'Copied' : 'Click to copy full hash'}</p>
          <p className="mt-1 break-all font-mono text-[10.5px] text-muted-foreground">{hash}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
