'use client';

import { useEffect, useState } from 'react';

type TocItem = { id: string; num: string; label: string; sub?: boolean };

const SECTIONS: TocItem[] = [
  { id: 'sec-exec', num: 'TLDR', label: 'Summary' },
  { id: 'sec-01', num: '01', label: 'Problem' },
  { id: 'sec-02', num: '02', label: 'Why now' },
  { id: 'sec-03', num: '03', label: 'Market' },
  { id: 'sec-04', num: '04', label: 'Product' },
  { id: 'sec-05', num: '05', label: 'Traction' },
  { id: 'sec-06', num: '06', label: 'Business model' },
  { id: 'sec-tbc', num: '∙∙∙', label: 'To be continued' },
];

/**
 * Floating right-side navigation that appears after scrolling past the hero.
 * Highlights the current section based on scroll position; click jumps.
 * Hidden on small screens.
 */
export function StickyToc() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 600);

      // Active = the last section whose top has crossed 30% viewport
      const viewportTrigger = window.innerHeight * 0.3;
      let found = 0;
      for (let i = 0; i < SECTIONS.length; i++) {
        const el = document.getElementById(SECTIONS[i].id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top < viewportTrigger) {
          found = i;
        }
      }
      setActiveIdx(found);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`pointer-events-none fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 transition-opacity duration-300 lg:block ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-label="Section navigation"
    >
      <div
        className={`pointer-events-auto flex flex-col gap-0.5 rounded-md border border-foreground/15 bg-background/95 px-2 py-3 backdrop-blur shadow-sm ${
          visible ? '' : 'pointer-events-none'
        }`}
      >
        {SECTIONS.map((s, i) => {
          const isActive = activeIdx === i;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`group flex items-baseline gap-2 rounded font-mono uppercase tracking-[0.16em] transition ${
                s.sub
                  ? 'pl-6 pr-2 py-0.5 text-[10.5px]'
                  : 'px-2 py-1 text-[12px]'
              } ${
                isActive
                  ? 'bg-foreground/[0.05] text-foreground'
                  : 'text-muted-foreground/75 hover:text-foreground'
              }`}
            >
              <span
                className={`min-w-[2ch] text-right ${
                  isActive ? 'text-emerald-700' : s.sub ? 'text-foreground/30' : 'text-foreground/40'
                }`}
              >
                {s.num}
              </span>
              <span>{s.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

