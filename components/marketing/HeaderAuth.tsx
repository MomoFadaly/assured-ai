import Link from 'next/link';
import { LogIn, LogOut, UserCircle2 } from 'lucide-react';
import { auth } from '@/lib/auth/auth';
import { signOutAction } from '@/app/sign-in/actions';

/**
 * Server component: renders the right-side auth chip pair on the
 * marketing header. Signed-out → Sign-in pill. Signed-in → name pill
 * (linking to /library for operators, /chat for customers) + Sign-out
 * form button.
 *
 * Pure SSR — no SessionProvider needed. The sign-out button is a
 * server-action form so it works with JS off too.
 */
export async function HeaderAuthChip() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="hidden h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent sm:inline-flex"
      >
        <LogIn className="h-3.5 w-3.5" />
        Sign in
      </Link>
    );
  }

  const isOperator = user.role === 'admin' || user.role === 'auditor' || user.role === 'operator';
  const dest = isOperator ? '/library' : '/chat';
  const label = user.name ?? user.email?.split('@')[0] ?? 'Account';

  return (
    <div className="hidden items-center gap-1 sm:inline-flex">
      <Link
        href={dest}
        className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
        title={`Signed in as ${user.email ?? ''} (${user.role})`}
      >
        <UserCircle2 className="h-3.5 w-3.5" />
        <span className="max-w-[140px] truncate">{label}</span>
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-card px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
