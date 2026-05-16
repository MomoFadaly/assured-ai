import {
  getUsageKpis,
  getDailyRollup,
  getProviderRollup,
  getPackRollup,
} from '@/lib/usage';
import { Card, StatTile } from '../_components/Card';

export const dynamic = 'force-dynamic';

const fmtUsd = (n: number) =>
  n >= 100 ? `$${n.toFixed(0)}` : n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;

export default async function UsagePage() {
  const [kpis, daily, byProvider, byPack] = await Promise.all([
    getUsageKpis(),
    getDailyRollup(14),
    getProviderRollup(30),
    getPackRollup(30),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">Usage &amp; cost</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-muted-foreground">
          Every paid LLM and embedding call is metered with model, token counts, and an
          estimated dollar cost. Numbers are list-price upper bounds — actual invoice prices
          vary by region and committed-use discount.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Calls · 24h"
          value={kpis.total_calls_24h.toLocaleString()}
          hint={`${kpis.total_calls_7d.toLocaleString()} in 7d`}
        />
        <StatTile
          label="Spend · 24h"
          value={fmtUsd(kpis.total_cost_usd_24h)}
          tone={kpis.total_cost_usd_24h > 10 ? 'warning' : 'default'}
        />
        <StatTile
          label="Spend · 7d"
          value={fmtUsd(kpis.total_cost_usd_7d)}
          tone={kpis.total_cost_usd_7d > 50 ? 'warning' : 'default'}
        />
        <StatTile
          label="Spend · 30d"
          value={fmtUsd(kpis.total_cost_usd_30d)}
          hint={`all-time ${fmtUsd(kpis.total_cost_usd_all)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="By provider (30 days)" contentClassName="px-0 py-0">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-2.5">Provider</th>
                <th className="px-3 py-2.5 text-right">Calls</th>
                <th className="px-3 py-2.5 text-right">Input tokens</th>
                <th className="px-3 py-2.5 text-right">Output tokens</th>
                <th className="px-5 py-2.5 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {byProvider.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    No usage tracked yet.
                  </td>
                </tr>
              )}
              {byProvider.map((p) => (
                <tr key={p.provider} className="hover:bg-accent/30">
                  <td className="px-5 py-2.5 font-mono text-[12px]">{p.provider}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.calls.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {p.input_tokens.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {p.output_tokens.toLocaleString()}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                    {fmtUsd(p.cost_usd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="By pack (30 days)" contentClassName="px-0 py-0">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-2.5">Pack</th>
                <th className="px-3 py-2.5 text-right">Calls</th>
                <th className="px-5 py-2.5 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {byPack.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">
                    No usage tracked yet.
                  </td>
                </tr>
              )}
              {byPack.map((p) => (
                <tr key={p.pack_slug} className="hover:bg-accent/30">
                  <td className="px-5 py-2.5 font-mono text-[12px]">{p.pack_slug}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.calls.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                    {fmtUsd(p.cost_usd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card title="Daily rollup (last 14 days)" contentClassName="px-0 py-0">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-5 py-2.5">Day</th>
              <th className="px-3 py-2.5">Pack</th>
              <th className="px-3 py-2.5">Provider</th>
              <th className="px-3 py-2.5">Kind</th>
              <th className="px-3 py-2.5 text-right">Calls</th>
              <th className="px-3 py-2.5 text-right">In tokens</th>
              <th className="px-3 py-2.5 text-right">Out tokens</th>
              <th className="px-5 py-2.5 text-right">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {daily.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">
                  No usage tracked yet.
                </td>
              </tr>
            )}
            {daily.map((row, i) => (
              <tr key={i} className="hover:bg-accent/30">
                <td className="px-5 py-2.5 text-[11.5px] text-muted-foreground">{row.day}</td>
                <td className="px-3 py-2.5 font-mono text-[12px]">{row.pack_slug || '—'}</td>
                <td className="px-3 py-2.5 font-mono text-[12px]">{row.provider}</td>
                <td className="px-3 py-2.5 text-[11.5px] text-muted-foreground">{row.kind}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.calls.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {row.input_tokens.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {row.output_tokens.toLocaleString()}
                </td>
                <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                  {fmtUsd(row.cost_usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
