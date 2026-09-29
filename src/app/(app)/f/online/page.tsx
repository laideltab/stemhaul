"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { date, dateTime, money } from "@/lib/format";
import { Button, Card, CardHeader, LinkButton, Notice, PageHeader, Status, Table } from "@/components/ui";

const nextLabel = { new: "Start preparing", preparing: "Mark ready", ready: "Mark delivered", delivered: "" };

export default function OnlineOrders() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  const orders = s.onlineOrders.filter((o) => o.orgId === orgId).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <PageHeader
        title="Online Orders"
        sub="Orders from your web shop. The shop only offers what is in stock; starting an order takes the flowers out of inventory."
        actions={<LinkButton variant="secondary" href="/shop/mari-flowers" target="_blank">Open web shop</LinkButton>}
      />
      <div className="mb-4"><Notice result={res} /></div>
      <Card>
        <CardHeader title={`${orders.filter((o) => o.status !== "delivered").length} open orders`} />
        <Table>
          <thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th>Deliver</th><th>Items</th><th className="num">Total</th><th>Status</th><th /></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="font-medium">{o.number}</td>
                <td className="whitespace-nowrap">{dateTime(o.at)}</td>
                <td>{o.customer}<div className="text-xs text-muted">{o.address}</div></td>
                <td>{date(o.deliveryDate)}</td>
                <td className="text-muted">{o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</td>
                <td className="num">{money(o.totalCents)}</td>
                <td><Status value={o.status} /></td>
                <td className="text-right">{o.status !== "delivered" && <Button variant="secondary" className="h-7 px-2 text-xs" onClick={() => setRes(s.advanceOnlineOrder(o.id))}>{nextLabel[o.status]}</Button>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
