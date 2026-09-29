"use client";

import { useRef, useState } from "react";
import { Plus, ScanLine, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, dateTime, money } from "@/lib/format";
import { productName } from "@/lib/selectors";
import { Badge, Button, Card, CardHeader, Empty, Field, inputCls, Notice, PageHeader, Table } from "@/components/ui";
import type { Receipt } from "@/lib/types";

export default function ReceiveBoxes() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const [code, setCode] = useState("");
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const linked = s.contacts.filter((c) => c.linkedOrgId === orgId && c.kind === "customer").map((c) => c.id);
  const incoming = s.boxes.filter((b) => b.customerId && linked.includes(b.customerId) && !b.floristReceivedAt);
  const vendors = s.contacts.filter((c) => c.ownerOrgId === orgId && c.kind === "vendor" && !c.linkedOrgId);
  const [supplier, setSupplier] = useState(vendors[0]?.name ?? "");
  const [lines, setLines] = useState<Receipt["lines"]>([{ productId: "p_gyp", stems: 50, costPerStemCents: 35 }]);
  const receipts = s.receipts.filter((r) => r.orgId === orgId).sort((a, b) => b.at.localeCompare(a.at));

  const scan = (c: string) => {
    if (!c.trim()) return;
    setRes(s.floristScanBox(c));
    setCode("");
    ref.current?.focus();
  };

  return (
    <>
      <PageHeader title="Receive Boxes" sub="Boxes delivered by a wholesaler on Stemhaul arrive already loaded: just scan them. Purchases from other Miami suppliers are entered by hand." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="From Lucy's Flowers" sub={`${incoming.length} boxes on the way to your shop`} />
          <div className="grid gap-3 p-4">
            <form onSubmit={(e) => { e.preventDefault(); scan(code); }} className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input ref={ref} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Scan box label" className={cn(inputCls, "h-11 pl-10 font-mono")} />
              </div>
              <Button className="h-11">Receive</Button>
            </form>
            <Notice result={res} />
          </div>
          <Table>
            <thead><tr><th>Label</th><th>Product</th><th className="num">Stems</th><th>Invoice</th><th /></tr></thead>
            <tbody>
              {incoming.map((b) => (
                <tr key={b.id}>
                  <td className="font-mono text-xs">{b.code}</td>
                  <td>{b.boxType} · {productName(s.products.find((p) => p.id === b.productId))}</td>
                  <td className="num">{b.stems}</td>
                  <td className="text-xs text-muted">{s.invoices.find((i) => i.id === b.invoiceId)?.number}</td>
                  <td className="text-right"><Button variant="secondary" className="h-7 px-2 text-xs" onClick={() => scan(b.code)} title="Simulate a scan">Scan</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!incoming.length && <Empty>Nothing pending from Lucy&apos;s Flowers.</Empty>}
        </Card>

        <Card>
          <CardHeader title="Other supplier (manual)" sub="Bought at a Miami market or another wholesaler not on Stemhaul" />
          <div className="grid gap-3 p-4">
            <Field label="Supplier">
              <select className={inputCls} value={supplier} onChange={(e) => setSupplier(e.target.value)}>
                {vendors.map((v) => <option key={v.id}>{v.name}</option>)}
              </select>
            </Field>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-2">
                <Field label="Product">
                  <select className={inputCls} value={l.productId} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)))}>
                    {s.products.map((p) => <option key={p.id} value={p.id}>{productName(p)}</option>)}
                  </select>
                </Field>
                <Field label="Stems"><input type="number" min={1} className={inputCls} value={l.stems} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, stems: Math.max(1, +e.target.value | 0) } : x)))} /></Field>
                <Field label="$ / stem"><input type="number" step="0.01" className={inputCls} value={(l.costPerStemCents / 100).toFixed(2)} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, costPerStemCents: Math.round(+e.target.value * 100) } : x)))} /></Field>
                <Button variant="ghost" aria-label="Remove" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={16} /></Button>
              </div>
            ))}
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="secondary" onClick={() => setLines([...lines, { productId: s.products[0].id, stems: 25, costPerStemCents: 50 }])}><Plus size={16} /> Add line</Button>
              <Button disabled={!lines.length} onClick={() => { s.receiveManual(supplier, lines); setRes({ ok: true, message: `Received ${lines.reduce((a, l) => a + l.stems, 0)} stems from ${supplier}.` }); setLines([]); }}>
                Receive {money(lines.reduce((a, l) => a + l.stems * l.costPerStemCents, 0))}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Receiving history" />
          <Table>
            <thead><tr><th>When</th><th>Supplier</th><th>Source</th><th>Lines</th><th className="num">Cost</th></tr></thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{dateTime(r.at)}</td>
                  <td>{r.supplier}</td>
                  <td>{r.source === "stemhaul" ? <Badge tone="brand">Scanned</Badge> : <Badge>Manual</Badge>}</td>
                  <td className="text-xs text-muted">{r.lines.map((l) => `${l.stems} ${s.products.find((p) => p.id === l.productId)?.variety}`).join(", ")}</td>
                  <td className="num">{money(r.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
