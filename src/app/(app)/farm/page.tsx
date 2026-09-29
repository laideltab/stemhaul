"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn, date, money, num, time } from "@/lib/format";
import { productName } from "@/lib/selectors";
import { Button, Card, CardHeader, Empty, inputCls, LinkButton, Notice, PageHeader, Status, Table } from "@/components/ui";

// The farm's side of a Komet order, in order.
const STEPS = ["Confirm", "AWB assigned", "Print labels", "Dispatch", "Flying", "In Miami"];
function stepOf(p: { status: string; dispatchedAt?: string; lines: { awbId?: string }[] }) {
  if (p.status === "sent") return 0;
  if (p.status === "confirmed" && !p.lines.some((l) => l.awbId)) return 1;
  if (p.status === "confirmed" || p.status === "booked") return 2;
  if (p.status === "labeled") return p.dispatchedAt ? 4 : 3;
  if (p.status === "shipped") return 4;
  return 6;
}

export default function FarmPortal() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const farm = s.orgs.find((o) => o.id === orgId)!;
  const pos = s.pos.filter((p) => p.farmId === orgId && p.status !== "draft").sort((a, b) => b.number.localeCompare(a.number));
  const [conf, setConf] = useState<Record<string, number>>({});
  const [invNo, setInvNo] = useState<Record<string, string>>({});
  const [res, setRes] = useState<{ id: string; ok: boolean; message: string } | null>(null);
  const newMap = s.marketOrders.filter((o) => o.farmId === orgId && o.status === "pending").length;

  return (
    <>
      <PageHeader title="My Orders & Labels" sub={`${farm.name} · vendor code ${farm.code} · ships from ${farm.origin}`} />
      {newMap > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-warn-soft/60 px-4 py-3 text-sm">
          <span><b>{newMap} new order{newMap > 1 ? "s" : ""} from the farm map</b> waiting for you to confirm.</span>
          <LinkButton href="/farm/map-orders">Review map orders</LinkButton>
        </div>
      )}
      <div className="grid gap-4">
        {pos.map((p) => {
          const buyer = s.orgs.find((o) => o.id === p.wholesalerId)!;
          const boxes = p.lines.reduce((a, l) => a + l.boxes, 0);
          const onAwb = p.lines.some((l) => l.awbId);
          const step = stepOf(p);
          const awbNo = s.awbs.find((a) => a.id === p.lines.find((l) => l.awbId)?.awbId)?.number;
          return (
            <Card key={p.id}>
              <CardHeader
                title={<span className="flex items-center gap-2">{p.number} <Status value={p.status} /></span>}
                sub={`${buyer.name}${p.marketOrderId ? ` · map order ${s.marketOrders.find((m) => m.id === p.marketOrderId)?.number}` : ""}${p.prebookId ? " · prebook" : ""} · ship ${date(p.shipDate)} · ${boxes} boxes ordered · ${money(p.lines.reduce((a, l) => a + l.boxes * l.stemsPerBox * l.pricePerStemCents, 0))}`}
                action={
                  <div className="flex gap-2">
                    {p.status === "sent" && <Button onClick={() => s.farmConfirmPO(p.id, p.lines.map((l, i) => conf[`${p.id}:${i}`] ?? l.boxes))}>Confirm order</Button>}
                    {p.status === "confirmed" && !onAwb && <span className="text-sm text-muted">Waiting for {buyer.name} to assign the AWB</span>}
                    {(p.status === "booked" || (p.status === "confirmed" && onAwb)) && <LinkButton href={`/farm/labels/${p.id}`}>Print labels</LinkButton>}
                    {["labeled", "shipped", "received"].includes(p.status) && <LinkButton variant="secondary" href={`/farm/labels/${p.id}`}>Reprint labels</LinkButton>}
                  </div>
                }
              />
              <div className="grid gap-3 border-b border-line px-4 py-3">
                <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {STEPS.map((label, i) => (
                    <li key={label} className="text-center">
                      <div className={cn("mx-auto h-1.5 rounded-full", i < step ? "bg-brand" : i === step ? "bg-accent" : "bg-line")} />
                      <div className={cn("mt-1 text-xs", i === step ? "font-semibold text-fg" : i < step ? "text-fg" : "text-muted")}>{label}</div>
                    </li>
                  ))}
                </ol>
                {step === 0 && <p className="text-sm text-muted"><b className="text-fg">Next:</b> check the boxes you can send and press Confirm order.</p>}
                {step === 1 && <p className="text-sm text-muted"><b className="text-fg">Next:</b> {buyer.name} books the flight and assigns the AWB. You will be able to print labels then.</p>}
                {step === 2 && <p className="text-sm text-muted"><b className="text-fg">Next:</b> print one label per box (AWB {awbNo}) and stick it on the box.</p>}
                {step === 3 && (
                  <div className="grid gap-2 rounded-lg bg-warn-soft/60 p-3 text-sm">
                    <p><b>Next: dispatch.</b> When the labeled boxes leave for the cargo agency, type your invoice number and press Dispatch. {buyer.name} gets the invoice and sees the boxes are on the way to the airport.</p>
                    <div className="flex flex-wrap gap-2">
                      <input className={cn(inputCls, "w-48 bg-surface")} placeholder="Your invoice #, e.g. F-20531" aria-label="Farm invoice number" value={invNo[p.id] ?? ""} onChange={(e) => setInvNo({ ...invNo, [p.id]: e.target.value })} />
                      <Button onClick={() => setRes({ id: p.id, ...s.farmDispatchPO(p.id, invNo[p.id] ?? "") })}>Dispatch boxes</Button>
                    </div>
                  </div>
                )}
                {step === 4 && p.status === "labeled" && <p className="text-sm text-muted">Dispatched {date(p.dispatchedAt!)} {time(p.dispatchedAt!)} · invoice {p.farmInvoice}. {buyer.name} closes AWB {awbNo} when the flight leaves. Nothing else to do.</p>}
                {(p.status === "shipped" || step === 6) && <p className="text-sm text-muted">{p.status === "shipped" ? `Flying on AWB ${awbNo}.` : "Received in Miami."}{p.farmInvoice ? ` Invoice ${p.farmInvoice}.` : ""} Nothing else to do.</p>}
                {res?.id === p.id && <Notice result={res} />}
              </div>
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
