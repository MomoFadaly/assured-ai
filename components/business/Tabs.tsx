'use client';

import { useState } from 'react';

interface Tab {
  label: string;
  sublabel?: string;
  content: React.ReactNode;
  accentColor?: string;
}

/**
 * Compact horizontal tabs — replaces stacked-card grids in dense sections.
 * Used in §08 Strategic Observations and §05 ICP to collapse 4 parallel
 * panels into a single click-to-reveal view.
 */
export function Tabs({
  tabs,
  variant = 'light',
}: {
  tabs: Tab[];
  variant?: 'light' | 'dark';
}) {
  const [active, setActive] = useState(0);
  const isDark = variant === 'dark';

  return (
    <div>
      {/* Tab strip */}
      <div
        className={`flex flex-wrap gap-x-1 gap-y-2 border-b ${
          isDark ? 'border-background/15' : 'border-foreground/15'
        }`}
        role="tablist"
      >
        {tabs.map((t, i) => {
          const isActive = active === i;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className={`relative -mb-px flex items-baseline gap-2 border-b-2 px-4 py-3 font-mono text-[12px] uppercase tracking-[0.16em] transition ${
                isActive
                  ? `${
                      isDark
                        ? 'border-emerald-400 text-background'
                        : 'border-emerald-700 text-foreground'
                    }`
                  : `border-transparent ${
                      isDark
                        ? 'text-background/55 hover:text-background/85'
                        : 'text-muted-foreground hover:text-foreground'
                    }`
              }`}
              style={
                t.accentColor && isActive
                  ? { borderColor: t.accentColor, color: t.accentColor }
                  : undefined
              }
            >
              <span>{t.label}</span>
              {t.sublabel ? (
                <span
                  className={`hidden text-[12px] tracking-[0.16em] sm:inline ${
                    isActive
                      ? isDark
                        ? 'text-background/65'
                        : 'text-foreground/55'
                      : isDark
                        ? 'text-background/30'
                        : 'text-muted-foreground/65'
                  }`}
                >
                  {t.sublabel}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <div
        role="tabpanel"
        className="mt-8 animate-in fade-in slide-in-from-bottom-1 duration-200"
      >
        {tabs[active].content}
      </div>
    </div>
  );
}
