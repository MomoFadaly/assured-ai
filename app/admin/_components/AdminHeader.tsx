import Link from 'next/link';
import { ShieldCheck, ExternalLink, LogOut, UserCircle2 } from 'lucide-react';
import { signOutAction } from '@/app/sign-in/actions';
import type { UserRole } from '@/lib/db/types';

export function AdminHeader({
  user,
}: {
  user: { name: string | null; email: string | null; role: UserRole };
}) {
  const label = user.name ?? user.email?.split('@')[0] ?? 'Admin';
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
            aria-label="AssuredAI home"
          >
            <ShieldCheck className="h-5 w-5" />
            <span className="font-semibold tracking-tight">AssuredAI</span>
          </Link>
          <span className="ml-2 inline-flex items-center rounded-md border border-border bg-accent/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent md:inline-flex"
          >
            Verifier
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link
            href="/library"
            className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent md:inline-flex"
          >
            Library
            <ExternalLink className="h-3 w-3" />
          </Link>
          <div className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground" title={user.email ?? ''}>
            <UserCircle2 className="h-3.5 w-3.5" />
            <span className="max-w-[140px] truncate">{label}</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {user.role}
            </span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
