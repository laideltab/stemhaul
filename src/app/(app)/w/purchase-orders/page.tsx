"use client";

import Link from "next/link";
import { boxSummary } from "@/lib/market";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn, date, money, num } from "@/lib/format";
import { fbe } from "@/lib/selectors";
import type { POStatus } from "@/lib/types";
import { Card, Empty, LinkButton, PageHeader, Status, Table } from "@/components/ui";
import { POTabs } from "@/components/po-tabs";

const filters: ("all" | POStatus)[] = ["all", "draft", "sent", "confirmed", "booked", "labeled", "shipped", "received"];

export default function PurchaseOrders() {
  const s = useStore();
  const [f, setF] = useState<(typeof filters)[number]>("all");
  const pos = s.pos
    .filter((p) => p.wholesalerId === s.session!.orgId && (f === "all" || p.status === f))
    .sort((a, b) => b.number.localeCompare(a.number));

  return (
    <>
      <PageHeader title="Purchase Orders" sub="Orders to farms: the farm confirms, you add the lines to an AWB, labels are printed and the AWB flies." actions={<LinkButton href="/w/purchase-orders/new">New purchase order</LinkButton>} />
      <POTabs />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {filters.map((x) => (
          <button key={x} onClick={() => setF(x)} className={cn("rounded-full border px-3 py-1 text-sm capitalize", f === x ? "border-brand bg-brand text-white" : "border-line bg-surface hover:bg-surface-2")}>
            {x}
          </button>
        ))}
      </div>
      <Card>
        <Table>
          <thead><tr><th>PO</th><th>Vendor</th><th>Ship date</th><th className="num">Boxes</th><th className="num">Confirmed</th><th className="num">FBE</th><th className="num">Stems</th><th className="num">Cost</th><th>AWB</th><th>Status</th></tr></thead>
          <tbody>
            {pos.map((p) => {
              const farm = s.orgs.find((o) => o.id === p.farmId);
              const boxes = p.lines.reduce((a, l) => a + l.boxes, 0);
              const confirmed = p.lines.every((l) => l.confirmedBoxes === undefined) ? undefined : p.lines.reduce((a, l) => a + (l.confirmedBoxes ?? 0), 0);
              const stems = p.lines.reduce((a, l) => a + l.boxes * l.stemsPerBox, 0);
              const cost = p.lines.reduce((a, l) => a + (l.confirmedBoxes ?? l.boxes) * l.stemsPerBox * l.pricePerStemCents, 0);
              const awbNums = [...new Set(p.lines.map((l) => s.awbs.find((a) => a.id === l.awbId)?.number).filter(Boolean))];
              return (
                <tr key={p.id} className="hover:bg-surface-2">
                  <td><Link href={`/w/purchase-orders/${p.id}`} className="font-medium text-brand hover:underline">{p.number}</Link></td>
                  <td><span className="font-mono text-xs">{farm?.code}</span> <span className="text-muted">{farm?.name}</span></td>
                  <td>{date(p.shipDate)}</td>
                  <td className="num whitespace-nowrap">{boxes}<div className="text-xs text-muted">{boxSummary(p.lines)}</div></td>
                  <td className={cn("num", confirmed !== undefined && confirmed < boxes && "font-medium text-bad")}>{confirmed ?? "—"}</td>
                  <td className="num">{p.lines.reduce((a, l) => a + fbe(l.boxType, l.confirmedBoxes ?? l.boxes), 0).toFixed(2)}</td>
                  <td className="num">{num(stems)}</td>
                  <td className="num">{money(cost)}</td>
                  <td className="font-mono text-xs">{awbNums.join(", ") || "—"}</td>
                  <td><Status value={p.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {!pos.length && <Empty>No purchase orders here.</Empty>}
      </Card>
    </>
  );
}
