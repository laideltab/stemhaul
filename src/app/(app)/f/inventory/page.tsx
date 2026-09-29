"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { dateTime, num } from "@/lib/format";
import { productName, stockByProduct } from "@/lib/selectors";
import { Badge, Button, Card, CardHeader, Field, inputCls, Notice, PageHeader, Table } from "@/components/ui";

const halfBox: Record<string, number> = { Rose: 250, Carnation: 250, Alstroemeria: 150, Hydrangea: 30, Gypsophila: 100, Eucalyptus: 100 };
const typeTone = { receive: "good", bunch: "brand", sale: "info", waste: "bad", adjust: "neutral" } as const;

export default function Inventory() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const stock = stockByProduct(s, orgId);
  const [pid, setPid] = useState(s.products[0].id);
  const [stems, setStems] = useState(10);
  const [note, setNote] = useState("");
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  const items = s.saleItems.filter((i) => i.orgId === orgId);
  const moves = s.movements.filter((m) => m.orgId === orgId).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 25);

  return (
    <>
      <PageHeader title="Inventory" sub="Everything is counted in stems. Bunches and boxes are shown as equivalents." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Loose stock" />
          <Table>
            <thead><tr><th>Product</th><th>Color</th><th className="num">Stems</th><th className="num">Farm bunches</th><th className="num">≈ Half boxes</th></tr></thead>
            <tbody>
              {s.products.map((p) => {
                const st = stock[p.id] ?? 0;
                return (
                  <tr key={p.id}>
                    <td className="font-medium">{productName(p)}</td>
                    <td className="text-muted">{p.color}</td>
                    <td className={`num font-medium ${st < 50 ? "text-bad" : ""}`}>{num(st)}</td>
                    <td className="num">{(st / p.stemsPerBunch).toFixed(1)} <span className="text-xs text-muted">of {p.stemsPerBunch}</span></td>
                    <td className="num">{(st / halfBox[p.species]).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
        <div className="grid h-fit gap-6">
          <Card>
            <CardHeader title="Ready to sell" sub="Made-up bunches and arrangements" />
            <Table>
              <tbody>
                {items.filter((i) => i.kind !== "box").map((i) => (
                  <tr key={i.id}><td>{i.name}</td><td className="num font-medium">{i.ready}</td></tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Card>
            <CardHeader title="Record waste" sub="Damaged or wilted flowers leave the stock here" />
            <div className="grid gap-3 p-4">
              <Field label="Product">
                <select className={inputCls} value={pid} onChange={(e) => setPid(e.target.value)}>
                  {s.products.map((p) => <option key={p.id} value={p.id}>{productName(p)}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Stems"><input type="number" min={1} className={inputCls} value={stems} onChange={(e) => setStems(Math.max(1, +e.target.value | 0))} /></Field>
                <Field label="Reason"><input className={inputCls} value={note} placeholder="Wilted" onChange={(e) => setNote(e.target.value)} /></Field>
              </div>
              <Notice result={res} />
              <Button variant="danger" onClick={() => { setRes(s.recordWaste(pid, stems, note)); setNote(""); }}>Record waste</Button>
            </div>
          </Card>
        </div>
        <Card className="lg:col-span-3">
          <CardHeader title="Stock movements" sub="Latest 25" />
          <Table>
            <thead><tr><th>When</th><th>Type</th><th>Product</th><th className="num">Stems</th><th>Note</th><th>By</th></tr></thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{dateTime(m.at)}</td>
                  <td><Badge tone={typeTone[m.type]}>{m.type}</Badge></td>
                  <td>{productName(s.products.find((p) => p.id === m.productId))}</td>
                  <td className={`num font-medium ${m.stems < 0 ? "text-bad" : "text-good"}`}>{m.stems > 0 ? "+" : ""}{m.stems}</td>
                  <td className="text-muted">{m.note}</td>
                  <td className="text-muted">{s.users.find((u) => u.id === m.userId)?.name.split(" ")[0]}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
