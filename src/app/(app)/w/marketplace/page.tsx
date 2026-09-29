"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { cn, money } from "@/lib/format";
import { boxSummary, orderTotals, timeLeft } from "@/lib/market";
import { Toggle } from "@/components/market-ui";
import { Badge, Card, CardHeader, Empty, LinkButton, PageHeader, Stat, Table } from "@/components/ui";

export default function WholesaleMarketplace() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const [now] = useState(() => Date.now());
  const orders = s.marketOrders.filter((o) => o.wholesalerId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const name = (id: string) => s.orgs.find((x) => x.id === id)?.name ?? "";
  const pending = orders.filter((o) => o.status === "pending");
  const confirmed = orders.filter((o) => o.status === "confirmed");
  const oldest = pending.at(-1);
  const boxes = confirmed.reduce((a, o) => a + orderTotals(o, "sale").boxes, 0);
  const margin = confirmed.reduce((a, o) => a + orderTotals(o, "sale").cents - orderTotals(o, "farm").cents, 0);
  const latest = [...confirmed].sort((a, b) => (b.confirmedAt ?? "").localeCompare(a.confirmedAt ?? ""))[0];
  const latestPo = latest && s.pos.find((p) => p.id === latest.poId);
  const onMap = s.mapFarms.filter((m) => m.wholesalerId === orgId);
  const buyers = s.contacts.filter((c) => c.ownerOrgId === orgId && c.kind === "customer" && c.linkedOrgId).length;

  return (
    <>
      <PageHeader title="Farm Marketplace" sub="Your farm map. Florists buy on it; every order a farm confirms becomes a PO with the customer on each line." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Map orders" value={orders.length} sub={`from ${new Set(orders.map((o) => o.floristOrgId)).size} florists`} />
        <Stat label="Waiting on a farm" value={pending.length} sub={oldest ? `oldest placed ${Math.round((now - new Date(oldest.createdAt).getTime()) / 60000)} min ago` : "none"} />
        <Stat label="Boxes confirmed" value={boxes} sub="waiting for your AWB or on the way" />
        <Stat label="Your margin" value={money(margin)} sub="sale minus farm price, confirmed orders" tone="good" />
      </div>

      {latest && latestPo && (
        <Card className="mb-6 flex flex-wrap items-center gap-4 border-brand/30 bg-brand-soft/50 p-4">
          <p className="min-w-0 flex-1 text-sm">
            <b>{latestPo.number} was created from map order {latest.number}.</b> {name(latest.farmId)} confirmed {boxSummary(latest.lines.map((l) => ({ boxType: l.boxType, boxes: l.confirmedBoxes ?? 0 })))} and {name(latest.floristOrgId)} is on every line.
          </p>
          <div className="flex gap-2">
            <LinkButton variant="secondary" href={`/w/purchase-orders/${latestPo.id}`}>Open {latestPo.number}</LinkButton>
            {latestPo.status === "confirmed" && <LinkButton href="/w/freight/add">Add AWB</LinkButton>}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader title="Orders from the map" sub="Sale is what the florist pays you; cost is the farm price." />
          <Table>
            <thead><tr><th>Order</th><th>Florist</th><th>Farm</th><th className="num">Boxes</th><th className="num">Sale</th><th className="num">Cost</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => {
                const asked = o.lines.reduce((a, l) => a + l.boxes, 0);
                const got = o.lines.reduce((a, l) => a + (l.confirmedBoxes ?? 0), 0);
                const po = s.pos.find((p) => p.id === o.poId);
                return (
                  <tr key={o.id}>
                    <td className="font-mono text-xs">{o.number}</td>
                    <td className="font-medium">{name(o.floristOrgId)}</td>
                    <td>{name(o.farmId)}</td>
                    <td className="num">{o.status === "confirmed" && got !== asked ? `${got} / ${asked}` : asked}</td>
                    <td className="num">{money(orderTotals(o, "sale").cents)}</td>
                    <td className="num text-muted">{money(orderTotals(o, "farm").cents)}</td>
                    <td>
                      {po ? <Link href={`/w/purchase-orders/${po.id}`}><Badge tone="brand">{po.number}</Badge></Link>
                        : o.status === "pending" ? <Badge tone="warn">{timeLeft(o.confirmBy, now).late ? "Late" : "Waiting on farm"}</Badge>
                        : <Badge tone="bad">Declined</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {!orders.length && <Empty>No orders from the map yet.</Empty>}
        </Card>

        <Card className="h-fit">
          <CardHeader title="Farms on your map" sub="Your markup over the farm price. It covers freight, customs and delivery." />
          <div className="divide-y divide-line">
            {onMap.map((m) => (
              <div key={m.farmId} className={cn("flex items-center gap-3 px-4 py-2.5", !m.enabled && "text-muted")}>
                <span className="min-w-0 flex-1 text-sm">{name(m.farmId)}</span>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="number" min={0} max={200} aria-label={`Markup for ${name(m.farmId)}`}
                    className="h-8 w-14 rounded-lg border border-line bg-surface px-2 text-right tabular-nums"
                    value={m.markupPct}
                    onChange={(e) => s.setMapFarm(m.farmId, { markupPct: Math.max(0, Math.min(200, +e.target.value | 0)) })}
                  />%
                </label>
                <Toggle on={m.enabled} label={`Show ${name(m.farmId)} on the map`} onChange={(v) => s.setMapFarm(m.farmId, { enabled: v })} />
              </div>
            ))}
          </div>
          <p className="border-t border-line px-4 py-3 text-xs text-muted">{buyers} of your customers use Stem Haul and can buy from this map.</p>
        </Card>
      </div>
    </>
  );
}
