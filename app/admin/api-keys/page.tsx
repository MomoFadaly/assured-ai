import { listApiKeys } from '@/lib/api-keys';
import { listPacks } from '@/lib/packs/registry';
import { Card } from '../_components/Card';
import { ApiKeysTable } from './ApiKeysTable';
import { CreateKeyForm } from './CreateKeyForm';

export const dynamic = 'force-dynamic';

export default async function ApiKeysIndex() {
  const [keys, packs] = await Promise.all([listApiKeys(), listPacks({ activeOnly: true })]);
  const activeCount = keys.filter((k) => !k.revoked_at).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">API keys</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-muted-foreground">
          Bearer credentials for the WordPress plugin, Chrome extension, CI pipelines, and
          partner integrations. Each key is shown <em>once</em> at creation — store it
          somewhere safe.
        </p>
      </header>

      <Card
        title="Create a key"
        subtitle="Issue a new credential. Scope and pack-restrict it on creation; revoke instantly."
      >
        <CreateKeyForm packs={packs.map((p) => ({ slug: p.slug, name: p.name }))} />
      </Card>

      <Card
        title="All keys"
        subtitle={`${keys.length} total · ${activeCount} active`}
        contentClassName="px-0 py-0"
      >
        <ApiKeysTable initialKeys={keys} />
      </Card>

      <Card title="Using a key" contentClassName="text-[13.5px] leading-relaxed">
        <p>
          Add an <code className="rounded bg-muted/40 px-1">Authorization: Bearer ak_…</code>{' '}
          header to <code className="rounded bg-muted/40 px-1">/api/verify</code> or{' '}
          <code className="rounded bg-muted/40 px-1">/api/suggest-fix</code>. Without a key,
          requests fall through to the unauthenticated rate-limited path (kept open for the
          public verifier UI). With a key, the rate-limit headers reflect the key&rsquo;s usage
          + pack restrictions are enforced.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted/20 p-3 text-[11.5px]">
{`curl -sX POST https://assuredai.online/api/verify \\
  -H "Authorization: Bearer ak_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "vertical_pack_slug": "healthcare",
    "input_mode": "paste",
    "article": "Eating fruits and whole grains can help manage blood sugar."
  }'`}
        </pre>
      </Card>
    </div>
  );
}
