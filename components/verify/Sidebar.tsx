'use client';

import * as React from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ClipboardPaste,
  PenLine,
  EyeOff,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  MoreHorizontal,
  Star,
  Download,
  Trash2,
  Cloud,
  RefreshCw,
  Pin,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface HistoryEntry {
  id: string;
  audit_log_id: number | null;
  occurred_at: string;
  scenario: 'healthcare' | 'government';
  mode: 'paste' | 'draft';
  outcome: 'verified' | 'red_flag_blocked' | 'kill_switch' | 'error';
  preview: string;
  pii_count: number;
  unsourced_count: number;
  drafted: boolean;
  pinned?: boolean;
  /** Full payload for in-place restore. Null when entry came from server-only sync. */
  payload: unknown | null;
  /** Original request — null for server-only entries. */
  request: unknown | null;
  /** Marks an entry that came from /api/conversations (server-only). */
  source?: 'local' | 'server';
}

const COLLAPSE_KEY = 'assured-ai-sidebar-collapsed';

export function Sidebar({
  history,
  activeId,
  onNew,
  onSelect,
  onDelete,
  onTogglePin,
  onClearAll,
  onSyncServer,
  syncing,
}: {
  history: HistoryEntry[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onClearAll: () => void;
  onSyncServer: () => void;
  syncing: boolean;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [filter, setFilter] = React.useState('');

  React.useEffect(() => {
    try {
      const v = localStorage.getItem(COLLAPSE_KEY);
      if (v === 'true') setCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const filtered = filter.trim().length > 0
    ? history.filter((h) => h.preview.toLowerCase().includes(filter.toLowerCase()))
    : history;

  const pinned = filtered.filter((h) => h.pinned);
  const unpinned = filtered.filter((h) => !h.pinned);
  const grouped = groupByDay(unpinned);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), history }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assured-ai-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmClear = () => {
    if (window.confirm(`Clear all ${history.length} verifications from this browser? This can't be undone.`)) {
      onClearAll();
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col border-r border-border bg-card/40 backdrop-blur-sm transition-[width] duration-200 ease-out',
          collapsed ? 'w-[56px]' : 'w-[280px]',
        )}
      >
        {/* Top: New + collapse + menu */}
        <div className={cn('flex items-center gap-1 px-2 pt-3', collapsed && 'flex-col gap-2')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size={collapsed ? 'icon' : 'sm'}
                onClick={onNew}
                className={cn(
                  collapsed ? 'size-9' : 'flex-1 justify-start gap-2',
                  'shadow-sm',
                )}
              >
                <Plus className="h-4 w-4" />
                {!collapsed && <span>New verify</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">New verify</TooltipContent>}
          </Tooltip>
          {!collapsed && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 text-muted-foreground"
                      aria-label="History menu"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">History menu</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>History</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSyncServer} disabled={syncing}>
                  <RefreshCw className={cn(syncing && 'animate-spin')} />
                  {syncing ? 'Syncing…' : 'Sync from server'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportJson}>
                  <Download /> Export JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={confirmClear}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash2 /> Clear all history
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="size-9 text-muted-foreground"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Expand</TooltipContent>}
          </Tooltip>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search history…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8 w-full rounded-md border border-border bg-card pl-8 pr-2.5 text-[12px] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>
        )}

        {/* History list */}
        <div className="mt-3 flex-1 overflow-y-auto px-2 pb-3">
          {filtered.length === 0 && !collapsed && (
            <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
              <Sparkles className="mx-auto mb-2 h-4 w-4 opacity-50" />
              <p>No history yet.</p>
              <p className="mt-1 text-[11px] opacity-80">
                Verifications you run will show up here for quick recall.
              </p>
            </div>
          )}

          {collapsed
            ? filtered.slice(0, 12).map((h) => (
                <Tooltip key={h.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onSelect(h)}
                      className={cn(
                        'mb-1 flex size-9 items-center justify-center rounded-md transition-colors',
                        activeId === h.id
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <OutcomeIcon entry={h} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[280px]">
                    <p className="font-medium">{h.preview || 'Untitled'}</p>
                    <p className="mt-1 text-muted-foreground">
                      {prettyDate(h.occurred_at)} · {h.scenario}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))
            : (
              <>
                {pinned.length > 0 && (
                  <div className="mb-3">
                    <div className="mb-1 flex items-center gap-1 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      <Pin className="h-2.5 w-2.5" /> Pinned
                    </div>
                    {pinned.map((h) => (
                      <HistoryRow
                        key={h.id}
                        entry={h}
                        active={h.id === activeId}
                        onSelect={() => onSelect(h)}
                        onDelete={() => onDelete(h.id)}
                        onTogglePin={() => onTogglePin(h.id)}
                      />
                    ))}
                  </div>
                )}
                {Object.entries(grouped).map(([day, items]) => (
                  <div key={day} className="mb-3">
                    <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {day}
                    </div>
                    {items.map((h) => (
                      <HistoryRow
                        key={h.id}
                        entry={h}
                        active={h.id === activeId}
                        onSelect={() => onSelect(h)}
                        onDelete={() => onDelete(h.id)}
                        onTogglePin={() => onTogglePin(h.id)}
                      />
                    ))}
                  </div>
                ))}
              </>
            )}
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-border/60 px-3 py-2.5 text-[10.5px] text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>
                {history.length} verification{history.length === 1 ? '' : 's'}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onSyncServer}
                    disabled={syncing}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-accent disabled:opacity-50"
                  >
                    <Cloud className={cn('h-3 w-3', syncing && 'animate-pulse')} />
                    {syncing ? 'Syncing' : 'Sync'}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Pull recent server-side audits into this view.</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}

function HistoryRow({
  entry,
  active,
  onSelect,
  onDelete,
  onTogglePin,
}: {
  entry: HistoryEntry;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const isServerOnly = entry.source === 'server' && entry.payload === null;
  return (
    <div
      className={cn(
        'group relative flex items-start gap-2 rounded-lg pl-2 pr-1 py-1.5 text-[12.5px] leading-snug transition-colors',
        active ? 'bg-accent text-foreground' : 'hover:bg-accent/60',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 items-start gap-2 text-left"
      >
        <span className="mt-0.5 shrink-0">
          <OutcomeIcon entry={entry} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {entry.preview || 'Untitled verification'}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="capitalize">{entry.scenario}</span>
            <span>·</span>
            <ModeChip mode={entry.mode} />
            {entry.audit_log_id !== null && (
              <>
                <span>·</span>
                <span>#{entry.audit_log_id}</span>
              </>
            )}
            {isServerOnly && (
              <>
                <span>·</span>
                <Cloud className="h-2.5 w-2.5" />
              </>
            )}
          </span>
        </span>
      </button>
      <div className="invisible absolute right-1 top-1 flex items-center gap-0.5 group-hover:visible">
        {entry.audit_log_id !== null && (
          <a
            href={`/v/${entry.audit_log_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open public proof page (new tab)"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          title={entry.pinned ? 'Unpin' : 'Pin'}
          className={cn(
            'rounded p-1',
            entry.pinned
              ? 'visible text-amber-500 hover:bg-amber-500/10'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Star className={cn('h-3 w-3', entry.pinned && 'fill-current')} />
        </button>
        {!isServerOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Remove from history"
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        )}
      </div>
      {entry.pinned && (
        <Star
          className="absolute -left-px top-2 h-2.5 w-2.5 fill-amber-500 text-amber-500"
          aria-hidden
        />
      )}
    </div>
  );
}

function ModeChip({ mode }: { mode: 'paste' | 'draft' }) {
  return mode === 'paste' ? (
    <span className="inline-flex items-center gap-0.5">
      <ClipboardPaste className="h-2.5 w-2.5" /> paste
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5">
      <PenLine className="h-2.5 w-2.5" /> draft
    </span>
  );
}

function OutcomeIcon({ entry }: { entry: HistoryEntry }) {
  if (entry.outcome === 'red_flag_blocked') {
    return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
  }
  if (entry.outcome === 'error' || entry.outcome === 'kill_switch') {
    return <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  if (entry.pii_count > 0) {
    return <EyeOff className="h-3.5 w-3.5 text-amber-500" />;
  }
  return <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />;
}

function groupByDay(items: HistoryEntry[]): Record<string, HistoryEntry[]> {
  const out: Record<string, HistoryEntry[]> = {};
  const now = Date.now();
  for (const item of items) {
    const ts = new Date(item.occurred_at).getTime();
    const days = Math.floor((now - ts) / (1000 * 60 * 60 * 24));
    let key: string;
    if (days < 1) key = 'Today';
    else if (days < 2) key = 'Yesterday';
    else if (days < 7) key = 'Earlier this week';
    else if (days < 30) key = 'This month';
    else key = 'Older';
    (out[key] ??= []).push(item);
  }
  return out;
}

function prettyDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
