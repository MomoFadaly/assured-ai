'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';

/**
 * Lightweight client-side filter for the library page. Hides any list item
 * whose data-search attribute doesn't include the query. Server stays static.
 */
export function LibrarySearch() {
  const [q, setQ] = React.useState('');
  const [visibleCount, setVisibleCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('[data-library-item]');
    const sections = document.querySelectorAll<HTMLElement>('[data-library-section]');
    const needle = q.trim().toLowerCase();
    let visible = 0;
    items.forEach((el) => {
      const hay = (el.dataset.search ?? '').toLowerCase();
      const match = needle.length === 0 || hay.includes(needle);
      el.style.display = match ? '' : 'none';
      if (match) visible += 1;
    });
    sections.forEach((sec) => {
      const inSection = sec.querySelectorAll<HTMLElement>('[data-library-item]');
      const anyVisible = Array.from(inSection).some((el) => el.style.display !== 'none');
      sec.style.display = anyVisible ? '' : 'none';
    });
    setVisibleCount(needle.length === 0 ? null : visible);
  }, [q]);

  return (
    <div className="mb-5">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search sources by title, organization, or host…"
          className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-9 text-[13px] shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
        {q.length > 0 && (
          <button
            type="button"
            onClick={() => setQ('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {visibleCount !== null && (
        <p className="mt-1.5 text-[11.5px] text-muted-foreground">
          {visibleCount === 0
            ? 'No sources match.'
            : `${visibleCount} source${visibleCount === 1 ? '' : 's'} matching “${q.trim()}”`}
        </p>
      )}
    </div>
  );
}
