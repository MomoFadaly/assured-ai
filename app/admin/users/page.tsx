import { listUsers, countUsers } from '@/lib/admin/queries';
import { Card, StatTile } from '../_components/Card';
import { UsersTable } from './UsersTable';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ q?: string }>;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const [users, counts] = await Promise.all([
    listUsers({ search: q, limit: 200 }),
    countUsers(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Promote, demote, deactivate. Every change is logged to the admin-action audit.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Total" value={counts.total} />
        <StatTile label="Admin" value={counts.admins} />
        <StatTile label="Operator" value={counts.operators} />
        <StatTile label="Auditor" value={counts.auditors} />
        <StatTile label="Customer" value={counts.customers} />
      </div>

      <Card
        title="All users"
        subtitle={
          q
            ? `Filtering by "${q}" — ${users.length} matches`
            : `${users.length} most recent`
        }
        contentClassName="px-0 py-0"
      >
        <UsersTable initialUsers={users} initialQuery={q ?? ''} />
      </Card>
    </div>
  );
}
