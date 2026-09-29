"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { date, money, num, perStem } from "@/lib/format";
import { productName } from "@/lib/selectors";
import { Badge, Button, Card, CardHeader, Empty, Field, inputCls, Notice, PageHeader, Status, Table } from "@/components/ui";

const markup: Record<string, number> = { Rose: 1.55, Carnation: 1.7, Alstroemeria: 1.6, Hydrangea: 1.45, Gypsophila: 1.6, Eucalyptus: 1.6 };

export default function Deliveries() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const customers = s.contacts.filter((c) => c.ownerOrgId === orgId && c.kind === "customer");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [sel, setSel] = useState<string[]>(() => s.boxes.filter((b) => b.status === "received" && b.customerId === (customers[0]?.id ?? "")).map((b) => b.id));
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const poIds = new Set(s.pos.filter((p) => p.wholesalerId === orgId).map((p) => p.id));
  const inWarehouse = s.boxes.filter((b) => poIds.has(b.poId) && b.status === "received");
  const presoldFor = (cid: string) => inWarehouse.filter((b) => b.customerId === cid).map((b) => b.id);
  // Boxes bought for this customer, plus unsold stock that can be added.
  const available = inWarehouse
    .filter((b) => b.customerId === customerId || !b.customerId)
    .sort((a, b) => Number(!!b.customerId) - Number(!!a.customerId));
  const waiting = customers.map((c) => ({ c, n: presoldFor(c.id).length })).filter((x) => x.n > 0);
  const selected = available.filter((b) => sel.includes(b.id));

  const defaults: Record<string, number> = {};
  for (const b of available) {
    const p = s.products.find((x) => x.id === b.productId)!;
    defaults[b.productId] ??= Math.round(b.costPerStemCents * markup[p.species]);
  }
  const price = (pid: string) => prices[pid] ?? defaults[pid];
  const total = selected.reduce((a, b) => a + b.stems * price(b.productId), 0);
  const cust = customers.find((c) => c.id === customerId);
  const invoices = s.invoices.filter((i) => i.wholesalerId === orgId).sort((a, b) => b.number.localeCompare(a.number));

  const deliver = () => {
    const p: Record<string, number> = {};
    for (const b of selected) p[b.productId] = price(b.productId);
    s.deliverBoxes(customerId, sel, p);
    setMsg({ ok: true, message: `Delivered ${sel.length} boxes to ${cust?.name}. Invoice created${cust?.linkedOrgId ? "; the boxes now show up in their Stem Haul receiving." : "."}` });
    setSel([]);
  };

  return (
    <>
      <PageHeader title="Deliveries & Invoices" sub="Boxes bought for a customer come pre-selected; you can add stock boxes. Delivering creates the invoice (accounts receivable)." />
      <Card className="mb-6">
        <CardHeader title="New delivery" />
        <div className="grid gap-4 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Customer" className="min-w-64">
              <select className={inputCls} value={customerId} onChange={(e) => { setCustomerId(e.target.value); setSel(presoldFor(e.target.value)); setMsg(null); }}>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}{c.linkedOrgId ? " (on Stem Haul)" : ""}</option>)}
              </select>
            </Field>
            {cust?.linkedOrgId && <Badge tone="brand">Boxes will appear in {cust.name}&apos;s Receive Boxes</Badge>}
          </div>
          {waiting.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="text-muted">Pre-sold boxes waiting:</span>
              {waiting.map(({ c, n }) => (
                <button key={c.id} onClick={() => { setCustomerId(c.id); setSel(presoldFor(c.id)); setMsg(null); }} className={`rounded-full border px-2.5 py-0.5 ${c.id === customerId ? "border-brand bg-brand-soft text-brand" : "border-line hover:bg-surface-2"}`}>
                  {c.name} · {n}
                </button>
              ))}
            </div>
          )}
          <Notice result={msg} />
          {available.length ? (
            <Table className="rounded-lg border border-line">
              <thead><tr><th><input type="checkbox" checked={sel.length === available.length} onChange={(e) => setSel(e.target.checked ? available.map((b) => b.id) : [])} aria-label="Select all" /></th><th>Label</th><th>For</th><th>Product</th><th>Box</th><th className="num">Stems</th><th className="num">Cost/stem</th><th className="num">Price/stem</th></tr></thead>
              <tbody>
                {available.map((b) => (
                  <tr key={b.id}>
                    <td><input type="checkbox" checked={sel.includes(b.id)} onChange={(e) => setSel(e.target.checked ? [...sel, b.id] : sel.filter((x) => x !== b.id))} aria-label={`Select ${b.code}`} /></td>
                    <td className="font-mono text-xs">{b.code}</td>
                    <td>{b.customerId ? <Badge tone="brand">Pre-sold</Badge> : <Badge>Stock</Badge>}</td>
                    <td>{productName(s.products.find((p) => p.id === b.productId))}</td>
                    <td>{b.boxType}</td>
                    <td className="num">{b.stems}</td>
                    <td className="num text-muted">{perStem(b.costPerStemCents)}</td>
                    <td className="num">
                      <input type="number" step="0.01" className={`${inputCls} ml-auto h-8 w-24 text-right`} value={(price(b.productId) / 100).toFixed(2)} onChange={(e) => setPrices({ ...prices, [b.productId]: Math.round(+e.target.value * 100) })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : <Empty>Nothing in the warehouse for this customer. Scan boxes in at Scan Receiving first.</Empty>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted">{selected.length} boxes · {num(selected.reduce((a, b) => a + b.stems, 0))} stems · <b className="text-fg">{money(total)}</b></span>
            <Button disabled={!selected.length || !customerId} onClick={deliver}>Deliver and invoice</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Invoices" />
        <Table>
          <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th className="num">Boxes</th><th className="num">Total</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <td className="font-medium">{i.number}</td>
                <td>{s.contacts.find((c) => c.id === i.customerId)?.name}</td>
                <td>{date(i.date)}</td>
                <td className="num">{i.lines.length}</td>
                <td className="num">{money(i.totalCents)}</td>
                <td><Status value={i.paidCents >= i.totalCents ? "paid" : i.paidCents > 0 ? "partial" : "open"} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
