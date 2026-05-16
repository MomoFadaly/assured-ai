'use client';

import * as React from 'react';
import { Header } from './Header';

/**
 * Shared chrome for the non-chat workspace pages (Library, Audit, Escalations).
 *
 * Renders the polished header without the scenario switcher (those pages
 * span both scenarios), keeps the gradient-mesh background, and gives each
 * page its own H1 + body slot.
 */
export function PageShell({
  activePath,
  title,
  description,
  actions,
  children,
}: {
  activePath: '/library' | '/audit' | '/escalations';
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  // We don't actually use scenario on these pages but the Header still needs the prop.
  const [scenario, setScenario] = React.useState<string>('healthcare');

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 gradient-mesh" aria-hidden />
      <div className="relative">
        <Header
          scenario={scenario}
          onScenarioChange={setScenario}
          activePath={activePath}
          showScenarioSwitcher={false}
        />
        <main className="mx-auto max-w-[1200px] px-5 py-8">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
              {description && (
                <p className="mt-1.5 max-w-2xl text-[14px] text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
