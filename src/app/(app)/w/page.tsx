"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { money, num, date } from "@/lib/format";
import { productName } from "@/lib/selectors";
import { Card, CardHeader, LinkButton, PageHeader, Stat, Status, Table, Empty } from "@/components/ui";

export default function WholesaleDashboard() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const pos = s.pos.filter((p) => p.wholesalerId === orgId);
  const poIds = new Set(pos.map((p) => p.id));
  const boxes = s.boxes.filter((b) => poIds.has(b.poId));
  const inTransit = boxes.filter((b) => b.status === "in_transit");
  const inWarehouse = boxes.filter((b) => b.status === "received");
  const invoices = s.invoices.filter((i) => i.wholesalerId === orgId).sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number));
  const ar = invoices.reduce((a, i) => a + i.totalCents - i.paidCents, 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = invoices.filter((i) => i.paidCents < i.totalCents && i.dueDate < today).reduce((a, i) => a + i.totalCents - i.paidCents, 0);
  const openPOs = pos.filter((p) => !["received"].includes(p.status));
  const farm = (id: string) => s.orgs.find((o) => o.id === id)?.name;
  const customer = (id: string) => s.contacts.find((c) => c.id === id)?.name;

  return (
    <>
      <PageHeader title="Dashboard" sub="Lucy's Flowers · wholesale" actions={<LinkButton href="/w/purchase-orders/new">New purchase order</LinkButton>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open purchase orders" value={openPOs.length} sub={`${pos.filter((p) => p.status === "sent").length} waiting on farm`} />
        <Stat label="Boxes in transit" value={inTransit.length} sub={`${num(inTransit.reduce((a, b) => a + b.stems, 0))} stems`} />
        <Stat label="In warehouse to deliver" value={inWarehouse.length} sub={`${num(inWarehouse.reduce((a, b) => a + b.stems, 0))} stems`} />
        <Stat label="Receivables" value={money(ar)} sub={overdue ? `${money(overdue)} overdue` : "Nothing overdue"} tone={overdue ? "bad" : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Arriving in Miami" sub="Shipped purchase orders" action={<LinkButton variant="secondary" href="/w/receiving">Scan receiving</LinkButton>} />
          <Table>
            <thead><tr><th>PO</th><th>Farm</th><th>AWB</th><th className="num">Boxes</th></tr></thead>
            <tbody>
              {pos.filter((p) => p.status === "shipped").map((p) => {
                const awb = s.awbs.find((a) => a.id === p.awbId);
                return (
                  <tr key={p.id}>
                    <td><Link className="font-medium text-brand hover:underline" href={`/w/purchase-orders/${p.id}`}>{p.number}</Link></td>
                    <td>{farm(p.farmId)}</td>
                    <td className="font-mono text-xs">{awb?.number} · {date(awb?.flightDate ?? p.shipDate)}</td>
                    <td className="num">{boxes.filter((b) => b.poId === p.id && b.status === "in_transit").length}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {!pos.some((p) => p.status === "shipped") && <Empty>Nothing in the air right now.</Empty>}
        </Card>

        <Card>
          <CardHeader title="Ready to deliver" sub="Received and not assigned to a customer" action={<LinkButton variant="secondary" href="/w/deliveries">Deliver</LinkButton>} />
          <Table>
            <thead><tr><th>Box</th><th>Product</th><th className="num">Stems</th></tr></thead>
            <tbody>
              {inWarehouse.slice(0, 8).map((b) => (
                <tr key={b.id}>
                  <td className="font-mono text-xs">{b.code}</td>
                  <td>{b.boxType} · {productName(s.products.find((p) => p.id === b.productId))}</td>
                  <td className="num">{b.stems}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!inWarehouse.length && <Empty>The warehouse is empty.</Empty>}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Latest invoices" action={<LinkButton variant="secondary" href="/w/accounts">Receivables</LinkButton>} />
          <Table>
            <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Due</th><th className="num">Total</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.slice(0, 6).map((i) => (
                <tr key={i.id}>
                  <td className="font-medium">{i.number}</td>
                  <td>{customer(i.customerId)}</td>
                  <td>{date(i.date)}</td>
                  <td>{date(i.dueDate)}</td>
                  <td className="num">{money(i.totalCents)}</td>
                  <td><Status value={i.paidCents >= i.totalCents ? "paid" : i.dueDate < today ? "overdue" : i.paidCents > 0 ? "partial" : "open"} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
