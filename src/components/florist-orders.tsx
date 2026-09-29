"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { cn, date } from "@/lib/format";
import { boxSummary, lineBoxes, orderStages } from "@/lib/market";
import { FloristOrderBadge } from "@/components/market-ui";
import { Card, Empty } from "@/components/ui";

/** The florist's marketplace orders, newest first. */
export function FloristOrderList({ current }: { current?: string }) {
  const s = useStore();
  const orders = s.marketOrders.filter((o) => o.floristOrgId === s.session!.orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Card>
      <div className="border-b border-line px-4 py-3"><h2 className="font-display text-base font-semibold">My farm orders</h2></div>
      <div className="divide-y divide-line">
        {orders.map((o) => {
          const farm = s.orgs.find((x) => x.id === o.farmId)!;
          const lines = o.lines.map((l) => ({ boxType: l.boxType, boxes: lineBoxes(l, o.status === "confirmed") }));
          const first = s.products.find((p) => p.id === o.lines[0].productId)!;
          return (
            <Link key={o.id} href={`/f/market/orders/${o.id}`} className={cn("block px-4 py-3 hover:bg-surface-2", o.id === current && "bg-brand-soft/50")}>
              <div className="flex justify-between gap-3">
                <span className="font-semibold">{farm.name}</span>
                <span className="font-mono text-xs text-muted">{o.number}</span>
              </div>
              <div className="text-sm text-muted">{boxSummary(lines)} · {first.species.toLowerCase()}{o.lines.length > 1 ? " and more" : ""} · flies {date(o.shipDate)}</div>
              <div className="mt-1.5"><FloristOrderBadge order={o} stages={orderStages(s, o)} /></div>
            </Link>
          );
        })}
        {!orders.length && <Empty>No farm orders yet.</Empty>}
      </div>
    </Card>
  );
}
