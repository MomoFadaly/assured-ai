'use client';

import * as React from 'react';
import Link from 'next/link';
import { BookOpen, Activity, Bell, ShieldCheck } from 'lucide-react';
import { BrandLockup } from './Brand';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Scenario } from '@/lib/db/types';
import { cn } from '@/lib/utils';

type SystemHealth = 'healthy' | 'degraded' | 'down' | 'unknown';

export function Header({
  scenario,
  onScenarioChange,
  activePath = '/chat',
  showScenarioSwitcher = true,
}: {
  scenario: Scenario;
  onScenarioChange: (s: Scenario) => void;
  activePath?: '/chat' | '/library' | '/audit' | '/escalations';
  showScenarioSwitcher?: boolean;
}) {
  const [health, setHealth] = React.useState<SystemHealth>('unknown');

  React.useEffect(() => {
    let cancelled = false;
    async function probe() {
      try {
        const r = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
        if (cancelled) return;
        setHealth(r.ok ? 'healthy' : 'degraded');
      } catch {
        if (cancelled) return;
        setHealth('down');
      }
    }
    probe();
    const id = setInterval(probe, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <TooltipProvider delayDuration={150}>
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              aria-label="AssuredAI home"
              className="rounded-md transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <BrandLockup />
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink href="/chat" active={activePath === '/chat'}>
                Verify
              </NavLink>
              <NavLink href="/library" active={activePath === '/library'}>
                <BookOpen className="h-3.5 w-3.5" /> Library
              </NavLink>
              <NavLink href="/audit" active={activePath === '/audit'}>
                <Activity className="h-3.5 w-3.5" /> Audit
              </NavLink>
              <NavLink href="/escalations" active={activePath === '/escalations'}>
                <Bell className="h-3.5 w-3.5" /> Escalations
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="System status"
                >
                  <span className={cn('size-1.5 rounded-full', healthDot(health))} />
                  <span>{healthLabel(health)}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">System status: {healthLabel(health)}</p>
                <p className="mt-1 text-muted-foreground">
                  Postgres + Presidio + LLM provider checked every 30 seconds.
                </p>
              </TooltipContent>
            </Tooltip>

            {showScenarioSwitcher && (
              <ScenarioSwitcher value={scenario} onChange={onScenarioChange} />
            )}
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}

function NavLink({
  children,
  href,
  active,
}: {
  children: React.ReactNode;
  href?: string;
  active?: boolean;
}) {
  const className = cn(
    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors',
    active
      ? 'bg-accent text-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <span className={className}>{children}</span>;
}

function ScenarioSwitcher({
  value,
  onChange,
}: {
  value: Scenario;
  onChange: (s: Scenario) => void;
}) {
  const options: Array<{ key: Scenario; label: string }> = [
    { key: 'healthcare', label: 'Healthcare' },
    { key: 'government', label: 'Government' },
  ];
  return (
    <div className="flex h-8 rounded-md border border-border bg-card p-0.5 text-[12px] font-medium">
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              'rounded-[5px] px-2.5 transition-all',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function healthDot(h: SystemHealth) {
  switch (h) {
    case 'healthy':
      return 'bg-emerald-500 shadow-[0_0_0_3px_hsl(152_60%_50%/0.18)]';
    case 'degraded':
      return 'bg-amber-500';
    case 'down':
      return 'bg-red-500';
    case 'unknown':
      return 'bg-muted-foreground';
  }
}

function healthLabel(h: SystemHealth) {
  switch (h) {
    case 'healthy':
      return 'All systems normal';
    case 'degraded':
      return 'Degraded';
    case 'down':
      return 'Service down';
    case 'unknown':
      return 'Checking…';
  }
}
