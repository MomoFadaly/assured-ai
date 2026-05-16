/**
 * /forbidden — landing for authenticated users who hit a route they
 * don't have the role for. Friendlier than bouncing to /sign-in (which
 * looks like the platform forgot they were signed in).
 *
 * The proxy redirects insufficient-role requests here with ?path=<orig>
 * + ?required=<role> so we can render the right message + the right
 * follow-up action.
 */

import Link from 'next/link';
import { ShieldOff, LogOut, UserCircle2 } from 'lucide-react';
import { auth } from '@/lib/auth/auth';
import { signOutAction } from '@/app/sign-in/actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Permission required · AssuredAI',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ path?: string; required?: string }>;

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { path, required } = await searchParams;
  const session = await auth();
  const user = session?.user;
  const currentRole = user?.role ?? null;
  const requiredLabel = required ?? 'higher-privileged';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100">
          <ShieldOff className="w-7 h-7 text-amber-700" />
        </div>
        <h1 className="font-semibold text-2xl md:text-3xl leading-tight tracking-tight text-foreground mb-2">
          Permission required.
        </h1>
        <p className="text-foreground/70 text-sm leading-relaxed mb-1">
          You&rsquo;re signed in
          {user?.email ? (
            <>
              {' '}as <span className="font-semibold">{user.email}</span>
              {currentRole && (
                <>
                  {' '}with role{' '}
                  <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em]">
                    {currentRole}
                  </span>
                </>
              )}
            </>
          ) : null}
          {path ? (
            <>
              , but <span className="font-mono text-[12px]">{path}</span> requires a{' '}
              <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em]">
                {requiredLabel}
              </span>
              {' '}role.
            </>
          ) : (
            <>, but this page needs a {requiredLabel} role.</>
          )}
        </p>
        {currentRole === 'customer' && (
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            If you were just granted operator or admin access, your session needs to refresh —
            sign out and back in to pick up the new role.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center gap-2 h-11 rounded-md border border-border bg-card px-4 text-[13px] font-medium text-foreground hover:bg-accent"
          >
            <UserCircle2 className="h-4 w-4" />
            Back to verifier
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 h-11 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background hover:opacity-90"
            >
              <LogOut className="h-4 w-4" />
              Sign out and sign back in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
