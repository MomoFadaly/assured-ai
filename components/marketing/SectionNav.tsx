'use client';

import { useEffect, useRef, useState } from 'react';

interface NavItem {
  id: string;
  label: string;
}

const ITEMS: NavItem[] = [
  { id: 'hero', label: 'Top' },
  { id: 'audience', label: 'Who it’s for' },
  { id: 'failure-modes', label: 'The problem' },
  { id: 'stakes', label: 'The stakes' },
  { id: 'origin', label: 'Why we built it' },
  { id: 'pipeline', label: 'The solution' },
  { id: 'featured-artifacts', label: 'The evidence' },
  { id: 'architecture', label: 'Under the hood' },
  { id: 'voice', label: 'Voice match' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'category', label: 'The category' },
  { id: 'pricing', label: 'How it deploys' },
  { id: 'faq', label: 'FAQ' },
  { id: 'cta', label: 'Try it' },
];

export function SectionNav() {
  const [activeId, setActiveId] = useState<string>('hero');
  const observersRef = useRef<IntersectionObserver[]>([]);

  useEffect(() => {
    // Clean up old observers
    observersRef.current.forEach((o) => o.disconnect());
    observersRef.current = [];

    const visible = new Map<string, number>();

    ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            visible.set(item.id, entry.isIntersecting ? entry.intersectionRatio : 0);
          });
          // Pick the entry with the highest visibility
          let best = { id: 'hero', ratio: 0 };
          visible.forEach((ratio, id) => {
            if (ratio > best.ratio) best = { id, ratio };
          });
          if (best.ratio > 0) setActiveId(best.id);
        },
        { threshold: [0, 0.2, 0.5, 0.8, 1] },
      );
      obs.observe(el);
      observersRef.current.push(obs);
    });

    return () => observersRef.current.forEach((o) => o.disconnect());
  }, []);

  return (
    <nav
      aria-label="Section navigation"
      className="pointer-events-none fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 lg:block"
    >
      <ul className="pointer-events-auto flex flex-col gap-2 rounded-full border border-border/60 bg-card/70 px-2 py-3 shadow-sm backdrop-blur">
        {ITEMS.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className="group relative">
              <a
                href={`#${item.id}`}
                className="flex h-5 w-5 items-center justify-center rounded-full"
                aria-label={item.label}
                aria-current={active ? 'true' : undefined}
              >
                <span
                  className={
                    'h-1.5 rounded-full transition-all ' +
                    (active
                      ? 'w-4 bg-foreground'
                      : 'w-1.5 bg-foreground/30 group-hover:w-3 group-hover:bg-foreground/60')
                  }
                />
              </a>
              <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
