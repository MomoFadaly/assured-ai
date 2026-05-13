'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { BrandLockup } from '@/components/verify/Brand';
import { ThemeToggle } from '@/components/verify/ThemeToggle';

const NAV_ITEMS = [
  { href: '#audience', label: 'Who it’s for' },
  { href: '#failure-modes', label: 'The problem' },
  { href: '#pipeline', label: 'How it works' },
  { href: '#featured-artifacts', label: 'What you get' },
  { href: '#architecture', label: 'Under the hood' },
  { href: '#pricing', label: 'Deploy' },
] as const;

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route or anchor change + on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between gap-4 px-5">
        <Link
          href="/"
          aria-label="AssuredAI home"
          className="rounded-md transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <BrandLockup />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 text-[13px] font-medium md:flex"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/chat"
            className="hidden h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 sm:inline-flex"
          >
            Try the verifier
            <ArrowRight className="h-3 w-3" />
          </Link>

          {/* Mobile menu trigger */}
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-accent md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu — full-width drawer below the bar */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`md:hidden ${mobileOpen ? 'visible' : 'invisible pointer-events-none'}`}
      >
        <div
          className={`absolute inset-x-0 top-full border-b border-border bg-background/95 backdrop-blur-xl transition-all duration-200 ${
            mobileOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
          }`}
        >
          <div className="mx-auto max-w-[1240px] px-5 py-5">
            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2.5 text-[15px] font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <Link
              href="/chat"
              onClick={() => setMobileOpen(false)}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-[14px] font-medium text-primary-foreground shadow-sm"
            >
              Try the verifier
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
    >
      <span>{children}</span>
      <span className="absolute inset-x-3 bottom-0.5 h-px origin-left scale-x-0 bg-foreground transition-transform duration-300 ease-out group-hover:scale-x-100" />
    </Link>
  );
}
