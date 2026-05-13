'use client';

import * as React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'assured-ai-theme';

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>('system');

  // Apply on mount and on change
  React.useEffect(() => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setTheme(stored);
      apply(stored);
    } else {
      apply('system');
    }
  }, []);

  // Listen for system change while in system mode
  React.useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => apply('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const change = (t: Theme) => {
    setTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    apply(t);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => change('light')} className={theme === 'light' ? 'bg-accent' : ''}>
          <Sun /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => change('dark')} className={theme === 'dark' ? 'bg-accent' : ''}>
          <Moon /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => change('system')} className={theme === 'system' ? 'bg-accent' : ''}>
          <Monitor /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function apply(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

/**
 * No-flash inline script. Renders the right theme on first paint by reading
 * localStorage before React hydrates. Mounted from app/layout.tsx.
 */
export function ThemeScript() {
  const code = `
    try {
      var t = localStorage.getItem('${STORAGE_KEY}') || 'system';
      var d = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (d) document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = d ? 'dark' : 'light';
    } catch (e) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
