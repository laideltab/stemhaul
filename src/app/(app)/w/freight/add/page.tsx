"use client";

import { useState } from "react";
import { useStore, type LineRef } from "@/lib/store";
import { cn, date } from "@/lib/format";
import { fbe, productName } from "@/lib/selectors";
import { Button, Card, CardHeader, Empty, Field, inputCls, Notice, PageHeader, Table } from "@/components/ui";
import { POTabs } from "@/components/po-tabs";

const ports = [
  { code: "UIO", name: "Quito, Ecuador", airline: "Avianca Cargo", prefix: "729" },
  { code: "BOG", name: "Bogotá, Colombia", airline: "LATAM Cargo", prefix: "045" },
  { code: "MDE", name: "Medellín, Colombia", airline: "Avianca Cargo", prefix: "729" },
  { code: "LIM", name: "Lima, Peru", airline: "LATAM Cargo", prefix: "992" },
];

export default function AddAWB() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const agencies = s.contacts.filter((c) => c.ownerOrgId === orgId && c.kind === "agency");
  const [origin, setOrigin] = useState("UIO");
  const [shipDate, setShipDate] = useState(new Date().toISOString().slice(0, 10));
  const [number, setNumber] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  const port = ports.find((p) => p.code === origin)!;
  const openAwbs = s.awbs.filter((a) => a.status === "open" && a.origin === origin);

  // Confirmed lines from this origin that are not on an AWB yet.
  const rows = s.pos
    .filter((p) => p.wholesalerId === orgId && ["confirmed", "booked"].includes(p.status) && s.orgs.find((o) => o.id === p.farmId)?.origin === origin)
    .flatMap((p) => p.lines.map((l, i) => ({ p, l, i })))
    .filter(({ l }) => !l.awbId && (l.confirmedBoxes ?? 0) > 0);
  const key = (r: LineRef) => `${r.poId}:${r.lineIndex}`;
  const refs: LineRef[] = sel.map((k) => ({ poId: k.split(":")[0], lineIndex: +k.split(":")[1] }));
  const selFbe = rows.filter(({ p, i }) => sel.includes(`${p.id}:${i}`)).reduce((a, { l }) => a + fbe(l.boxType, l.confirmedBoxes ?? 0), 0);

  const save = () => {
    const r = s.assignAwb({ origin, shipDate, number, airline: port.airline, agencyId: agencyId || undefined }, refs);
    setRes(r);
    if (r.ok) setSel([]);
  };

  return (
    <>
      <PageHeader title="Add AWB" sub="Type the master AWB the airline or agency gave you, then add the confirmed lines that fly on it. Stemhaul gives each PO a house AWB." />
      <POTabs />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-5 sm:items-end">
        <Field label="Port of origin">
          <select className={inputCls} value={origin} onChange={(e) => { setOrigin(e.target.value); setSel([]); }}>
            {ports.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
          </select>
        </Field>
        <Field label="Ship date"><input type="date" className={inputCls} value={shipDate} onChange={(e) => setShipDate(e.target.value)} /></Field>
        <Field label="Master AWB">
          <input className={`${inputCls} font-mono`} placeholder={`${port.prefix}-0111-3151`} value={number} onChange={(e) => setNumber(e.target.value)} list="open-awbs" />
          <datalist id="open-awbs">{openAwbs.map((a) => <option key={a.id} value={a.number} />)}</datalist>
        </Field>
        <Field label="Cargo agency">
          <select className={inputCls} value={agencyId} onChange={(e) => setAgencyId(e.target.value)}>
            <option value="">None, booked direct with the airline</option>
            {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Button disabled={!sel.length || !number.trim()} onClick={save}>Save {sel.length ? `${sel.length} line${sel.length > 1 ? "s" : ""}` : ""}</Button>
      </Card>
      {openAwbs.length > 0 && <p className="mb-3 text-sm text-muted">Open AWBs from {origin}: {openAwbs.map((a) => a.number).join(", ")}. Type one of them to add more lines to it.</p>}
      <div className="mb-3"><Notice result={res} /></div>
      <Card>
        <CardHeader title={`Confirmed lines from ${origin} without AWB`} sub={sel.length ? `${sel.length} selected · ${selFbe.toFixed(2)} FBE` : "Select the lines that go on this AWB"} />
        <Table>
          <thead><tr><th><input type="checkbox" aria-label="Select all" checked={!!rows.length && sel.length === rows.length} onChange={(e) => setSel(e.target.checked ? rows.map(({ p, i }) => `${p.id}:${i}`) : [])} /></th><th>PO #</th><th>Vendor code</th><th>Ship date</th><th>Product</th><th className="num">Quantity</th><th className="num">FBE</th><th>Customer</th><th>Mark code</th></tr></thead>
          <tbody>
            {rows.map(({ p, l, i }) => {
              const k = key({ poId: p.id, lineIndex: i });
              const cust = s.contacts.find((c) => c.id === l.customerId);
              return (
                <tr key={k} className={cn(sel.includes(k) && "bg-brand-soft/60")}>
                  <td><input type="checkbox" aria-label={`Select ${p.number} line ${i + 1}`} checked={sel.includes(k)} onChange={(e) => setSel(e.target.checked ? [...sel, k] : sel.filter((x) => x !== k))} /></td>
                  <td className="font-medium">{p.number}</td>
                  <td className="font-mono text-xs">{s.orgs.find((o) => o.id === p.farmId)?.code}</td>
                  <td>{date(p.shipDate)}</td>
                  <td className="whitespace-nowrap">{productName(s.products.find((x) => x.id === l.productId))}</td>
                  <td className="num">{l.confirmedBoxes} {l.boxType}</td>
                  <td className="num">{fbe(l.boxType, l.confirmedBoxes ?? 0).toFixed(2)}</td>
                  <td>{cust?.name ?? <span className="text-muted">Stock</span>}</td>
                  <td className="font-mono text-xs">{cust?.code ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {!rows.length && <Empty>No confirmed lines from {origin} waiting for an AWB.</Empty>}
      </Card>
    </>
  );
}
