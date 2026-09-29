"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { money } from "@/lib/format";
import { stockByProduct } from "@/lib/selectors";
import { Badge, Button, Card, Notice, PageHeader } from "@/components/ui";

export default function MakeBunches() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const stock = stockByProduct(s, orgId);
  const items = s.saleItems.filter((i) => i.orgId === orgId && i.kind !== "box");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <>
      <PageHeader title="Make Bunches" sub="Turn loose stems into bunches and arrangements. The recipe takes the stems out of inventory." />
      <div className="mb-4"><Notice result={res} /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => {
          const canMake = Math.min(...it.recipe.map((r) => Math.floor((stock[r.productId] ?? 0) / r.stems)));
          const q = qty[it.id] ?? 1;
          return (
            <Card key={it.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-semibold">{it.name}</h3>
                  <div className="text-sm text-muted">{money(it.retailCents)} retail · {money(it.wholesaleCents)} wholesale</div>
                </div>
                <Badge tone={it.ready ? "good" : "warn"}>{it.ready} ready</Badge>
              </div>
              <ul className="mt-3 flex-1 space-y-1 text-sm">
                {it.recipe.map((r) => {
                  const p = s.products.find((x) => x.id === r.productId)!;
                  return (
                    <li key={r.productId} className="flex justify-between">
                      <span>{r.stems} × {p.species} {p.variety}</span>
                      <span className="text-xs text-muted">{stock[r.productId] ?? 0} in stock</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex items-center gap-2">
                <input type="number" min={1} value={q} onChange={(e) => setQty({ ...qty, [it.id]: Math.max(1, +e.target.value | 0) })} className="h-9 w-20 rounded-lg border border-line px-2 text-sm" aria-label="Quantity" />
                <Button className="flex-1" disabled={canMake < q} onClick={() => setRes(s.makeBunches(it.id, q))}>Make {q}</Button>
              </div>
              <div className="mt-1 text-xs text-muted">Stock allows up to {canMake}.</div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
