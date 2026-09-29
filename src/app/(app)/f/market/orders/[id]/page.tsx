"use client";

import { use } from "react";
import Link from "next/link";
import { Check, Clock, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { money, time } from "@/lib/format";
import { orderStages, orderTotals } from "@/lib/market";
import { Tracker } from "@/components/market-ui";
import { FloristOrderList } from "@/components/florist-orders";
import { Badge, Card, CardHeader, Empty, LinkButton, PageHeader, Table } from "@/components/ui";

export default function FloristMarketOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = useStore();
  const o = s.marketOrders.find((x) => x.id === id && x.floristOrgId === s.session!.orgId);
  if (!o) return <Empty>Order not found. <Link className="text-brand underline" href="/f/market/orders">My farm orders</Link></Empty>;
  const farm = s.orgs.find((x) => x.id === o.farmId)!;
  const importer = s.orgs.find((x) => x.id === o.wholesalerId)!;
  const stages = orderStages(s, o);
  const asked = orderTotals(o, "sale", false);
  const got = orderTotals(o, "sale", true);
  const po = s.pos.find((p) => p.id === o.poId);
  const awb = s.awbs.find((a) => a.id === po?.lines.find((l) => l.awbId)?.awbId);
  const short = o.lines.filter((l) => o.status === "confirmed" && (l.confirmedBoxes ?? 0) < l.boxes);

  return (
    <>
      <PageHeader
        title={`Order ${o.number}`}
        sub={`${farm.name} · sold and delivered by ${importer.name}`}
        actions={<LinkButton variant="secondary" href="/f/market">Back to marketplace</LinkButton>}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-6">
          {o.status === "pending" && (
            <Card className="flex gap-4 border-warn/40 bg-warn-soft/60 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warn text-white"><Clock size={20} /></span>
              <div>
                <div className="font-semibold">Waiting for {farm.name} to confirm</div>
                <p className="text-sm text-muted">They got a notification at {time(o.createdAt)} and have until {time(o.confirmBy)}. Nothing is charged until they confirm.</p>
              </div>
            </Card>
          )}
          {o.status === "confirmed" && (
            <Card className="flex gap-4 border-brand/30 bg-brand-soft/60 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-brand-fg"><Check size={20} /></span>
              <div>
                <div className="font-semibold">{farm.name} confirmed your order</div>
                <p className="text-sm text-muted">
                  Confirmed {got.boxes} of {asked.boxes} boxes at {time(o.confirmedAt!)}.
                  {short.map((l) => { const p = s.products.find((x) => x.id === l.productId)!; return ` ${p.variety} ${p.lengthCm} cm is ${l.confirmedBoxes} ${l.boxType} instead of ${l.boxes}.`; }).join("")}
                  {" "}{importer.name} will invoice you {money(got.cents)}.
                </p>
              </div>
            </Card>
          )}
          {o.status === "declined" && (
            <Card className="flex gap-4 border-bad/30 bg-bad-soft/60 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bad text-white"><X size={20} /></span>
              <div>
                <div className="font-semibold">{farm.name} could not take this order</div>
                <p className="text-sm text-muted">Nothing was charged. Try another farm on the map.</p>
              </div>
            </Card>
          )}
          {o.status !== "declined" && (
            <Card>
              <CardHeader title="Where your boxes are" />
              <div className="p-4"><Tracker stages={stages} /></div>
            </Card>
          )}
          <Card>
            <Table>
              <thead><tr><th>Product</th><th className="num">Asked</th><th className="num">Confirmed</th><th className="num">Per stem</th><th className="num">Total</th><th>Status</th></tr></thead>
              <tbody>
                {o.lines.map((l, i) => {
                  const p = s.products.find((x) => x.id === l.productId)!;
                  const c = l.confirmedBoxes;
                  return (
                    <tr key={i}>
                      <td className="font-medium">{p.variety} {p.color.toLowerCase()} {p.lengthCm} cm</td>
                      <td className="num">{l.boxes} {l.boxType}</td>
                      <td className="num">{c === undefined ? "—" : `${c} ${l.boxType}`}</td>
                      <td className="num">{`$${(l.salePriceCents / 100).toFixed(2)}`}</td>
                      <td className="num">{money((c ?? l.boxes) * l.stemsPerBox * l.salePriceCents)}</td>
                      <td>
                        {c === undefined ? <Badge tone="warn">Waiting</Badge> : c === 0 ? <Badge tone="bad">Not available</Badge> : c < l.boxes ? <Badge tone="warn">Partly confirmed</Badge> : <Badge tone="brand">Confirmed</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line">
                  <td colSpan={4} className="px-4 py-3 text-sm text-muted">Delivered price{awb ? ` · ships on ${importer.name}'s AWB ${awb.number}` : ""}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(o.status === "confirmed" ? got.cents : asked.cents)}</td>
                  <td />
                </tr>
              </tfoot>
            </Table>
          </Card>
          {short.length > 0 && <div><LinkButton href="/f/market">Order the missing boxes from another farm</LinkButton></div>}
        </div>
        <div className="h-fit"><FloristOrderList current={o.id} /></div>
      </div>
    </>
  );
}
