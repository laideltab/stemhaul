"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { money, num } from "@/lib/format";
import { productName } from "@/lib/selectors";
import type { BoxType, POLine } from "@/lib/types";
import { Button, Card, CardHeader, Field, inputCls, PageHeader } from "@/components/ui";

const defaultStems: Record<BoxType, number> = { FB: 500, HB: 250, QB: 100, EB: 50 };

export default function NewPO() {
  const s = useStore();
  const router = useRouter();
  const farms = s.contacts.filter((c) => c.ownerOrgId === s.session!.orgId && c.kind === "farm");
  const [farmId, setFarmId] = useState(farms[0]?.linkedOrgId ?? "");
  const d = new Date();
  d.setDate(d.getDate() + 4);
  const [shipDate, setShipDate] = useState(d.toISOString().slice(0, 10));
  const [lines, setLines] = useState<POLine[]>([{ productId: "p_freedom50", boxType: "HB", boxes: 4, stemsPerBox: 250, pricePerStemCents: 32 }]);

  const upd = (i: number, patch: Partial<POLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = lines.reduce((a, l) => a + l.boxes * l.stemsPerBox * l.pricePerStemCents, 0);
  const save = (send: boolean) => {
    const id = s.createPO(farmId, shipDate, lines.filter((l) => l.boxes > 0), send);
    router.push(`/w/purchase-orders/${id}`);
  };

  return (
    <>
      <PageHeader title="New purchase order" sub="The farm will see it in its portal as soon as you send it." />
      <Card className="mb-4 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Farm">
            <select className={inputCls} value={farmId} onChange={(e) => setFarmId(e.target.value)}>
              {farms.map((f) => <option key={f.id} value={f.linkedOrgId}>{f.name} ({f.country})</option>)}
            </select>
          </Field>
          <Field label="Ship date (farm)">
            <input type="date" className={inputCls} value={shipDate} onChange={(e) => setShipDate(e.target.value)} />
          </Field>
        </div>
      </Card>
      <Card>
        <CardHeader title="Lines" action={<Button variant="secondary" onClick={() => setLines([...lines, { productId: s.products[0].id, boxType: "QB", boxes: 1, stemsPerBox: 100, pricePerStemCents: 30 }])}><Plus size={16} /> Add line</Button>} />
        <div className="grid gap-3 p-4">
          {lines.map((l, i) => (
            <div key={i} className="grid items-end gap-3 rounded-lg border border-line p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
              <Field label="Product">
                <select className={inputCls} value={l.productId} onChange={(e) => upd(i, { productId: e.target.value })}>
                  {s.products.map((p) => <option key={p.id} value={p.id}>{productName(p)} · {p.color}</option>)}
                </select>
              </Field>
              <Field label="Box type">
                <select className={inputCls} value={l.boxType} onChange={(e) => { const bt = e.target.value as BoxType; upd(i, { boxType: bt, stemsPerBox: defaultStems[bt] }); }}>
                  {(["FB", "HB", "QB", "EB"] as BoxType[]).map((b) => <option key={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Boxes"><input type="number" min={0} className={inputCls} value={l.boxes} onChange={(e) => upd(i, { boxes: Math.max(0, +e.target.value | 0) })} /></Field>
              <Field label="Stems / box"><input type="number" min={1} className={inputCls} value={l.stemsPerBox} onChange={(e) => upd(i, { stemsPerBox: Math.max(1, +e.target.value | 0) })} /></Field>
              <Field label="$ / stem"><input type="number" step="0.01" min={0} className={inputCls} value={(l.pricePerStemCents / 100).toFixed(2)} onChange={(e) => upd(i, { pricePerStemCents: Math.round(+e.target.value * 100) })} /></Field>
              <Button variant="ghost" aria-label="Remove line" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={16} /></Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <div className="text-sm text-muted">
            {lines.reduce((a, l) => a + l.boxes, 0)} boxes · {num(lines.reduce((a, l) => a + l.boxes * l.stemsPerBox, 0))} stems · <b className="text-fg">{money(total)}</b>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => save(false)} disabled={!lines.length}>Save draft</Button>
            <Button onClick={() => save(true)} disabled={!lines.length}>Send to farm</Button>
          </div>
        </div>
      </Card>
    </>
  );
}
