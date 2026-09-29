"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { date, money, num } from "@/lib/format";
import type { POStatus } from "@/lib/types";
import { Card, LinkButton, PageHeader, Status, Table, Empty } from "@/components/ui";
import { cn } from "@/lib/format";

const filters: ("all" | POStatus)[] = ["all", "draft", "sent", "confirmed", "labeled", "shipped", "received"];

export default function PurchaseOrders() {
  const s = useStore();
  const [f, setF] = useState<(typeof filters)[number]>("all");
  const pos = s.pos
    .filter((p) => p.wholesalerId === s.session!.orgId && (f === "all" || p.status === f))
    .sort((a, b) => b.number.localeCompare(a.number));

  return (
    <>
      <PageHeader title="Purchase Orders" sub="Orders to farms. The farm sees them in its portal and prints the labels." actions={<LinkButton href="/w/purchase-orders/new">New purchase order</LinkButton>} />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {filters.map((x) => (
          <button key={x} onClick={() => setF(x)} className={cn("rounded-full border px-3 py-1 text-sm capitalize", f === x ? "border-brand bg-brand text-white" : "border-line bg-surface hover:bg-surface-2")}>
            {x}
          </button>
        ))}
      </div>
      <Card>
        <Table>
          <thead><tr><th>PO</th><th>Farm</th><th>Ship date</th><th className="num">Boxes</th><th className="num">Stems</th><th className="num">Cost</th><th>Status</th></tr></thead>
          <tbody>
            {pos.map((p) => {
              const boxes = p.lines.reduce((a, l) => a + l.boxes, 0);
              const stems = p.lines.reduce((a, l) => a + l.boxes * l.stemsPerBox, 0);
              const cost = p.lines.reduce((a, l) => a + l.boxes * l.stemsPerBox * l.pricePerStemCents, 0);
              return (
                <tr key={p.id} className="hover:bg-surface-2">
                  <td><Link href={`/w/purchase-orders/${p.id}`} className="font-medium text-brand hover:underline">{p.number}</Link></td>
                  <td>{s.orgs.find((o) => o.id === p.farmId)?.name}</td>
                  <td>{date(p.shipDate)}</td>
                  <td className="num">{boxes}</td>
                  <td className="num">{num(stems)}</td>
                  <td className="num">{money(cost)}</td>
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
