"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { isToday, localDay, money, num } from "@/lib/format";
import { productName, stockByProduct } from "@/lib/selectors";
import { Card, CardHeader, LinkButton, PageHeader, Stat, Status, Table, Empty } from "@/components/ui";

function SalesChart({ days }: { days: { label: string; cents: number; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...days.map((d) => d.cents), 1);
  return (
    <div className="px-4 pb-4 pt-6">
      <div className="relative flex h-64 items-end gap-2 border-b border-line">
        {days.map((d, i) => (
          <div key={i} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div className={`w-full rounded-t-[4px] bg-bar transition-opacity ${hover !== null && hover !== i ? "opacity-50" : ""}`} style={{ height: `${(d.cents / max) * 100}%` }} />
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md">
                <div className="font-medium">{d.label}</div>
                <div className="tabular-nums">{money(d.cents)} · {d.count} sales</div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        {days.map((d, i) => <div key={i} className="flex-1 text-center text-xs text-muted">{d.label.split(",")[0]}</div>)}
      </div>
    </div>
  );
}

export default function FloristDashboard() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const sales = s.sales.filter((x) => x.orgId === orgId && !x.voided);
  const todays = sales.filter((x) => isToday(x.at));
  const stock = stockByProduct(s, orgId);
  const linked = s.contacts.filter((c) => c.linkedOrgId === orgId && c.kind === "customer").map((c) => c.id);
  const incoming = s.boxes.filter((b) => b.customerId && linked.includes(b.customerId) && !b.floristReceivedAt);
  const low = s.products.filter((p) => (stock[p.id] ?? 0) < 50).sort((a, b) => (stock[a.id] ?? 0) - (stock[b.id] ?? 0));
  const newWeb = s.onlineOrders.filter((o) => o.orgId === orgId && o.status === "new");
  const openShifts = s.shifts.filter((x) => x.orgId === orgId && !x.closedAt);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const ds = sales.filter((x) => localDay(x.at) === d.toDateString());
    return { label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), cents: ds.reduce((a, x) => a + x.totalCents, 0), count: ds.length };
  });

  return (
    <>
      <PageHeader title="Dashboard" sub="Mari Flowers · florist shop" actions={<><LinkButton variant="secondary" href="/f/receive">Receive boxes</LinkButton><LinkButton href="/f/pos">Open POS</LinkButton></>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales today" value={money(todays.reduce((a, x) => a + x.totalCents, 0))} sub={`${todays.length} tickets`} />
        <Stat label="Boxes to receive" value={incoming.length} sub={incoming.length ? "Delivered by Lucy's Flowers" : "All caught up"} />
        <Stat label="New web orders" value={newWeb.length} sub={`${s.onlineOrders.filter((o) => o.orgId === orgId && o.status !== "delivered").length} not delivered`} />
        <Stat label="Open cash drawers" value={openShifts.length} sub={openShifts.map((x) => s.users.find((u) => u.id === x.cashierId)?.name.split(" ")[0]).join(", ") || "None"} />
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Sales, last 7 days" sub="Store and web, all payment types" />
          <SalesChart days={days} />
        </Card>
        <Card>
          <CardHeader title="Low stock" sub="Under 50 stems" action={<LinkButton variant="secondary" href="/f/inventory">Inventory</LinkButton>} />
          <Table>
            <tbody>
              {low.map((p) => (
                <tr key={p.id}><td>{productName(p)}</td><td className="num font-medium">{num(stock[p.id] ?? 0)}</td></tr>
              ))}
            </tbody>
          </Table>
          {!low.length && <Empty>Stock looks healthy.</Empty>}
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Web orders to prepare" action={<LinkButton variant="secondary" href="/f/online">Online orders</LinkButton>} />
          <Table>
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th className="num">Total</th><th>Status</th></tr></thead>
            <tbody>
              {s.onlineOrders.filter((o) => o.orgId === orgId && o.status !== "delivered").map((o) => (
                <tr key={o.id}>
                  <td className="font-medium">{o.number}</td>
                  <td>{o.customer}</td>
                  <td className="text-muted">{o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</td>
                  <td className="num">{money(o.totalCents)}</td>
                  <td><Status value={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
