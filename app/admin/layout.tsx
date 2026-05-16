/**
 * Admin shell layout — sticky left sidebar, fluid main column.
 *
 * Auth gate: `proxy.ts` (NextAuth middleware) already returns the user
 * to /sign-in if they're not signed in, and refuses non-admin users via
 * `authConfig.authorized`. This layout therefore assumes a valid admin
 * session — we still call `auth()` to render the actor identity, and to
 * defend-in-depth against any future routing config drift.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { AdminNav } from './_components/AdminNav';
import { AdminHeader } from './_components/AdminHeader';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/sign-in?callbackUrl=/admin');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader
        user={{
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          role: session.user.role,
        }}
      />
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card/30 px-3 py-6 md:block">
          <AdminNav />
        </aside>
        <main className="min-h-[calc(100vh-3.5rem)] flex-1 px-5 py-8 md:px-10 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
