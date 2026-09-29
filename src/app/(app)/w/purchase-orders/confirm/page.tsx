"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn, date, perStem } from "@/lib/format";
import { productName } from "@/lib/selectors";
import { Button, Card, Field, inputCls, Notice, PageHeader, Status, Table, Empty } from "@/components/ui";
import { POTabs } from "@/components/po-tabs";

export default function ConfirmPOs() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const [vendor, setVendor] = useState("");
  const [customer, setCustomer] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [toConfirm, setToConfirm] = useState<Record<string, number>>({});
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  const customers = s.contacts.filter((c) => c.ownerOrgId === orgId && c.kind === "customer");
  const farms = s.orgs.filter((o) => o.kind === "farm");

  const rows = s.pos
    .filter((p) => p.wholesalerId === orgId && p.status !== "draft" && (!vendor || p.farmId === vendor) && (!onlyOpen || ["sent", "confirmed", "booked"].includes(p.status)))
    .sort((a, b) => b.number.localeCompare(a.number))
    .flatMap((p) => p.lines.map((l, i) => ({ p, l, i })))
    .filter(({ l }) => !customer || (customer === "stock" ? !l.customerId : l.customerId === customer));

  const sentPOs = [...new Set(rows.filter((r) => r.p.status === "sent").map((r) => r.p.id))];
  const confirmAll = () => {
    for (const poId of sentPOs) {
      const po = s.pos.find((p) => p.id === poId)!;
      s.farmConfirmPO(poId, po.lines.map((l, i) => toConfirm[`${poId}:${i}`] ?? l.boxes));
    }
    setRes({ ok: true, message: `Confirmed ${sentPOs.length} purchase order${sentPOs.length === 1 ? "" : "s"} on behalf of the farm.` });
  };

  return (
    <>
      <PageHeader title="Confirm POs" sub="What each farm confirmed, line by line. Farms confirm from their portal; you can also confirm by phone or WhatsApp here." />
      <POTabs />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-4 sm:items-end">
        <Field label="Vendor">
          <select className={inputCls} value={vendor} onChange={(e) => setVendor(e.target.value)}>
            <option value="">All</option>
            {farms.map((f) => <option key={f.id} value={f.id}>{f.code} · {f.name}</option>)}
          </select>
        </Field>
        <Field label="Customer">
          <select className={inputCls} value={customer} onChange={(e) => setCustomer(e.target.value)}>
            <option value="">All</option>
            <option value="stock">Stock (no customer)</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
          </select>
        </Field>
        <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Only open orders</label>
        <Button disabled={!sentPOs.length} onClick={confirmAll}>Confirm {sentPOs.length || ""} sent PO{sentPOs.length === 1 ? "" : "s"}</Button>
      </Card>
      <div className="mb-3"><Notice result={res} /></div>
      <Card>
        <Table>
          <thead><tr><th>PO #</th><th>Vendor</th><th>Ship</th><th>Product</th><th className="num">Qty PO</th><th className="num">Confirmed</th><th className="num">To confirm</th><th className="num">Missing</th><th>Box</th><th className="num">Units</th><th className="num">Cost</th><th>Customer</th><th>Origin</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(({ p, l, i }) => {
              const farm = s.orgs.find((o) => o.id === p.farmId);
              const cust = s.contacts.find((c) => c.id === l.customerId);
              const key = `${p.id}:${i}`;
              const missing = l.confirmedBoxes === undefined ? 0 : l.boxes - l.confirmedBoxes;
              return (
                <tr key={key}>
                  <td><Link className="font-medium text-brand hover:underline" href={`/w/purchase-orders/${p.id}`}>{p.number}</Link></td>
                  <td className="font-mono text-xs">{farm?.code}</td>
                  <td>{date(p.shipDate)}</td>
                  <td className="whitespace-nowrap">{productName(s.products.find((x) => x.id === l.productId))}</td>
                  <td className="num">{l.boxes}</td>
                  <td className="num">{l.confirmedBoxes ?? "—"}</td>
                  <td className="num">
                    {p.status === "sent" ? (
                      <input type="number" min={0} max={l.boxes} className={`${inputCls} ml-auto h-7 w-16 text-right`} value={toConfirm[key] ?? l.boxes} onChange={(e) => setToConfirm({ ...toConfirm, [key]: Math.max(0, Math.min(l.boxes, +e.target.value | 0)) })} />
                    ) : "—"}
                  </td>
                  <td className={cn("num", missing > 0 && "font-medium text-bad")}>{missing}</td>
                  <td>{l.boxType}</td>
                  <td className="num">{l.stemsPerBox}</td>
                  <td className="num">{perStem(l.pricePerStemCents)}</td>
                  <td className="font-mono text-xs">{cust?.code ?? <span className="font-sans text-muted">Stock</span>}</td>
                  <td className="font-mono text-xs">{farm?.origin}</td>
                  <td><Status value={p.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {!rows.length && <Empty>No lines match these filters.</Empty>}
      </Card>
    </>
  );
}
