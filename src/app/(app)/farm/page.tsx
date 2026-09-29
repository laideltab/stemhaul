"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { date, money, num } from "@/lib/format";
import { productName } from "@/lib/selectors";
import { Button, Card, CardHeader, Empty, LinkButton, PageHeader, Status, Table } from "@/components/ui";

export default function FarmPortal() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const farm = s.orgs.find((o) => o.id === orgId)!;
  const pos = s.pos.filter((p) => p.farmId === orgId && p.status !== "draft").sort((a, b) => b.number.localeCompare(a.number));
  const [conf, setConf] = useState<Record<string, number>>({});

  return (
    <>
      <PageHeader title="My Orders & Labels" sub={`${farm.name} · vendor code ${farm.code} · ships from ${farm.origin}`} />
      <div className="grid gap-4">
        {pos.map((p) => {
          const buyer = s.orgs.find((o) => o.id === p.wholesalerId)!;
          const boxes = p.lines.reduce((a, l) => a + l.boxes, 0);
          const onAwb = p.lines.some((l) => l.awbId);
          return (
            <Card key={p.id}>
              <CardHeader
                title={<span className="flex items-center gap-2">{p.number} <Status value={p.status} /></span>}
                sub={`${buyer.name} · ship ${date(p.shipDate)} · ${boxes} boxes ordered · ${money(p.lines.reduce((a, l) => a + l.boxes * l.stemsPerBox * l.pricePerStemCents, 0))}`}
                action={
                  <div className="flex gap-2">
                    {p.status === "sent" && <Button onClick={() => s.farmConfirmPO(p.id, p.lines.map((l, i) => conf[`${p.id}:${i}`] ?? l.boxes))}>Confirm order</Button>}
                    {p.status === "confirmed" && !onAwb && <span className="text-sm text-muted">Waiting for {buyer.name} to assign the AWB</span>}
                    {(p.status === "booked" || (p.status === "confirmed" && onAwb)) && <LinkButton href={`/farm/labels/${p.id}`}>Print labels</LinkButton>}
                    {["labeled", "shipped", "received"].includes(p.status) && <LinkButton variant="secondary" href={`/farm/labels/${p.id}`}>Reprint labels</LinkButton>}
                  </div>
                }
              />
              <Table>
                <thead><tr><th>Product</th><th>Box</th><th className="num">Ordered</th><th className="num">You confirm</th><th className="num">Stems</th><th>Customer / mark</th><th>AWB</th></tr></thead>
                <tbody>
                  {p.lines.map((l, i) => {
                    const k = `${p.id}:${i}`;
                    return (
                      <tr key={i}>
                        <td>{productName(s.products.find((x) => x.id === l.productId))}</td>
                        <td>{l.boxType} ({l.stemsPerBox} stems)</td>
                        <td className="num">{l.boxes}</td>
                        <td className="num">
                          {p.status === "sent" ? (
                            <input type="number" min={0} max={l.boxes} aria-label="Boxes you confirm" className="ml-auto h-8 w-16 rounded-lg border border-line px-2 text-right" value={conf[k] ?? l.boxes} onChange={(e) => setConf({ ...conf, [k]: Math.max(0, Math.min(l.boxes, +e.target.value | 0)) })} />
                          ) : l.confirmedBoxes}
                        </td>
                        <td className="num">{num((l.confirmedBoxes ?? l.boxes) * l.stemsPerBox)}</td>
                        <td className="font-mono text-xs">{s.contacts.find((c) => c.id === l.customerId)?.code ?? "STOCK"}</td>
                        <td className="font-mono text-xs">{s.awbs.find((a) => a.id === l.awbId)?.number ?? "—"}{l.hawb && <div className="text-muted">House {l.hawb}</div>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          );
        })}
        {!pos.length && <Card><Empty>No orders yet.</Empty></Card>}
      </div>
    </>
  );
}
