/**
 * /welcome — onboarding wizard for new tenants/users.
 *
 * 4-step flow:
 *   1. Pick your vertical pack
 *   2. See a sample verification (linked out to /chat?scenario=<slug>)
 *   3. Invite teammates (optional — multi-invite, server-action backed)
 *   4. Done — links to verifier, admin (if applicable), and proof URLs
 *
 * The page is gated behind auth (proxy redirects unauthenticated to
 * /sign-in). After completion, `users.onboarded_at` is set and future
 * sign-ins skip /welcome and go straight to /chat.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { listPacks } from '@/lib/packs/registry';
import { getUserPrefs } from '@/lib/onboarding';
import { requireTenantContext } from '@/lib/tenants';
import { query } from '@/lib/db/client';
import { OnboardingWizard } from './OnboardingWizard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Welcome · AssuredAI',
  robots: { index: false, follow: false },
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ replay?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in?callbackUrl=/welcome');
  }
  const userId = session.user.id;
  const { replay } = await searchParams;

  const [prefs, packs, ctx, tenantRow] = await Promise.all([
    getUserPrefs(userId),
    listPacks({ activeOnly: true }),
    requireTenantContext(),
    query<{ name: string; slug: string }>(
      `SELECT t.name, t.slug FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.id = $1`,
      [userId],
    ),
  ]);

  // If the user is already onboarded and not explicitly replaying,
  // shortcut to /chat.
  if (prefs?.onboarded_at && replay !== '1') {
    redirect('/chat');
  }

  const tenantName = tenantRow.rows[0]?.name ?? 'your workspace';
  const userEmail = session.user.email ?? '';
  const userName = session.user.name ?? '';
  const userRole = (session.user.role as string | undefined) ?? 'customer';

  const summaries = packs.map((p) => ({
    slug: p.slug,
    name: p.name,
    description: p.description,
    icon: p.config.icon ?? null,
    compliance_framework: p.config.compliance_framework ?? null,
    recognizer_count: p.config.recognizers.length,
    red_flag_category_count: p.config.red_flag_rules.length,
  }));

  return (
    <OnboardingWizard
      tenantName={tenantName}
      userName={userName}
      userEmail={userEmail}
      userRole={userRole}
      packs={summaries}
      initialPackSlug={prefs?.preferred_pack_slug ?? null}
      canInviteAdmins={userRole === 'admin'}
      alreadyOnboarded={!!prefs?.onboarded_at}
      tenantContextOk={ctx.ok}
    />
  );
}
