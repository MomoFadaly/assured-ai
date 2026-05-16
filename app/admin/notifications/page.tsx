import { listChannels, listRecentDeliveries } from '@/lib/notifications/dispatch';
import { listPacks } from '@/lib/packs/registry';
import { Card } from '../_components/Card';
import { ChannelsList } from './ChannelsList';
import { CreateChannelForm } from './CreateChannelForm';
import { DeliveriesList } from './DeliveriesList';

export const dynamic = 'force-dynamic';

export default async function NotificationsIndex() {
  const [channels, deliveries, packs] = await Promise.all([
    listChannels(),
    listRecentDeliveries(50),
    listPacks({ activeOnly: true }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-muted-foreground">
          Slack, email, and outbound webhook channels for findings, escalations, and
          kill-switch events. Every delivery is logged with response code and signature for
          forensic review.
        </p>
      </header>

      <Card title="Add a channel" subtitle="Test sends after create to confirm reachability.">
        <CreateChannelForm packs={packs.map((p) => ({ slug: p.slug, name: p.name }))} />
      </Card>

      <Card title="Channels" subtitle={`${channels.length} configured`} contentClassName="px-0 py-0">
        <ChannelsList channels={channels} />
      </Card>

      <Card
        title="Recent deliveries"
        subtitle="Last 50 — full forensic record kept in notification_deliveries."
        contentClassName="px-0 py-0"
      >
        <DeliveriesList deliveries={deliveries} />
      </Card>
    </div>
  );
}
