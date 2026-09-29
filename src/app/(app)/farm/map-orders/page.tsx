"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, date, money, num, perStem, time } from "@/lib/format";
import { boxSummary, orderTotals, shortName, timeLeft } from "@/lib/market";
import { productName } from "@/lib/selectors";
import { Badge, Button, Card, Empty, LinkButton, PageHeader, Table } from "@/components/ui";

const tabs = [["pending", "New"], ["confirmed", "Confirmed"], ["declined", "Declined"]] as const;

export default function FarmMapOrders() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const [now] = useState(() => Date.now());
  const all = s.marketOrders.filter((o) => o.farmId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [tab, setTab] = useState<(typeof tabs)[number][0]>(all.some((o) => o.status === "pending") ? "pending" : "confirmed");
  const [pick, setPick] = useState<string | null>(null);
  const [conf, setConf] = useState<Record<string, number>>({});
  const [done, setDone] = useState<string | null>(null);
  const [hideToast, setHideToast] = useState(false);
  const list = all.filter((o) => o.status === tab);
  const o = all.find((x) => x.id === pick) ?? list[0];
  const newest = all.find((x) => x.status === "pending");
  const name = (id: string) => { const o = s.orgs.find((x) => x.id === id); return o ? shortName(o) : ""; };
  const stockOf = (lid: string) => s.listings.find((l) => l.id === lid)?.stockBoxes ?? 0;

  const confirmed = o ? o.lines.map((l, i) => (o.status === "pending" ? conf[`${o.id}:${i}`] ?? Math.min(l.boxes, stockOf(l.listingId)) : l.confirmedBoxes ?? 0)) : [];
  const confBoxes = confirmed.reduce((a, n) => a + n, 0);
  const confCents = o ? o.lines.reduce((a, l, i) => a + confirmed[i] * l.stemsPerBox * l.farmPriceCents, 0) : 0;
  const customer = o && s.contacts.find((c) => c.id === o.customerId);
  const po = o && s.pos.find((p) => p.id === o.poId);

  return (
    <>
      <PageHeader title="Map Orders" sub="Florists buy your flowers on your importers' maps. You confirm each line and the importer gets the purchase order." actions={<LinkButton variant="secondary" href="/farm/listings">My listings</LinkButton>} />

      {newest && !hideToast && (
        <Card className="mb-6 flex items-start gap-3 border-accent/40 p-4 shadow-sm">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warn-soft text-accent"><Bell size={18} /></span>
          <div className="flex-1 text-sm">
            <div className="font-semibold">New order from {name(newest.wholesalerId)}</div>
            <div>For {name(newest.floristOrgId)} · {boxSummary(newest.lines)} · {money(orderTotals(newest, "farm").cents)}</div>
            <div className="text-muted">Confirm by {time(newest.confirmBy)} · also sent by email and WhatsApp</div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="h-8" onClick={() => { setTab("pending"); setPick(newest.id); }}>Open</Button>
            <button className="text-muted" aria-label="Dismiss" onClick={() => setHideToast(true)}>×</button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="grid h-fit gap-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map(([k, label]) => (
              <button key={k} onClick={() => { setTab(k); setPick(null); }} className={cn("rounded-full px-3 py-1 text-sm", tab === k ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted")}>
                {label} · {all.filter((x) => x.status === k).length}
              </button>
            ))}
          </div>
          {list.map((x) => {
            const left = timeLeft(x.confirmBy, now);
            return (
              <button key={x.id} onClick={() => setPick(x.id)} className={cn("rounded-xl border bg-surface p-3 text-left", x.id === o?.id ? "border-accent ring-1 ring-accent" : "border-line hover:bg-surface-2")}>
                <div className="flex justify-between gap-2"><span className="font-semibold">{name(x.wholesalerId)}</span><span className="font-mono text-xs text-muted">{x.number}</span></div>
                <div className="text-sm text-muted">For {name(x.floristOrgId)} · {boxSummary(x.lines.map((l) => ({ boxType: l.boxType, boxes: x.status === "pending" ? l.boxes : l.confirmedBoxes ?? 0 })))} · {money(orderTotals(x, "farm").cents)}</div>
                <div className="mt-1 text-sm">
                  {x.status === "pending" ? <span className={cn("font-semibold", left.late ? "text-bad" : "text-accent")}>{left.late ? "Past the confirm time" : `${left.label} left to confirm`}</span> : x.status === "confirmed" ? <Badge tone="brand">Confirmed</Badge> : <Badge tone="bad">Declined</Badge>}
                </div>
              </button>
            );
          })}
          {!list.length && <Card><Empty>Nothing here.</Empty></Card>}
        </div>

        {o ? (
          <div className="grid min-w-0 gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-sm text-muted">Order {o.number} · placed {date(o.createdAt)} {time(o.createdAt)}</div>
                <h2 className="font-display text-2xl font-semibold">{name(o.wholesalerId)} wants {boxSummary(o.lines)} for {name(o.floristOrgId)}</h2>
              </div>
              {o.status === "pending" && (
                <div className="text-right">
                  <div className="text-xs text-muted">Time left to confirm</div>
                  <div className="font-display text-2xl font-semibold text-accent">{timeLeft(o.confirmBy, now).label}</div>
                </div>
              )}
            </div>
            {done === o.id && po && (
              <div className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">Confirmed. {name(o.wholesalerId)} got {po.number} and will assign the AWB; print the labels from My Orders &amp; Labels when it is on the AWB.</div>
            )}
            <Card>
              <Table>
                <thead><tr><th>Product</th><th className="num">Asked</th><th className="num">You confirm</th><th className="num">Per stem</th><th className="num">Line total</th><th className="num">In stock</th></tr></thead>
                <tbody>
                  {o.lines.map((l, i) => {
                    const stock = stockOf(l.listingId);
                    const low = o.status === "pending" && stock < l.boxes;
                    return (
                      <tr key={i} className={low ? "bg-warn-soft/50" : undefined}>
                        <td>
                          <div className="font-medium">{productName(s.products.find((p) => p.id === l.productId))}</div>
                          {low && <div className="text-xs text-warn">Only {stock} {l.boxType} left · buyer will be told</div>}
                        </td>
                        <td className="num">{l.boxes} {l.boxType}</td>
                        <td className="num">
                          {o.status === "pending" ? (
                            <input
                              type="number" min={0} max={l.boxes} aria-label={`Boxes you confirm, line ${i + 1}`}
                              className="ml-auto h-9 w-16 rounded-lg border border-line bg-surface px-2 text-right"
                              value={confirmed[i]}
                              onChange={(e) => setConf({ ...conf, [`${o.id}:${i}`]: Math.max(0, Math.min(l.boxes, +e.target.value | 0)) })}
                            />
                          ) : `${confirmed[i]} ${l.boxType}`}
                        </td>
                        <td className="num">{perStem(l.farmPriceCents)}</td>
                        <td className="num">{money(confirmed[i] * l.stemsPerBox * l.farmPriceCents)}</td>
                        <td className="num"><Badge tone={stock <= 2 ? "warn" : "good"}>{stock} {l.boxType}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line">
                    <td colSpan={4} className="px-4 py-3 text-sm text-muted">{o.status === "pending" ? "Confirming" : "Confirmed"} {confBoxes} of {o.lines.reduce((a, l) => a + l.boxes, 0)} boxes · {num(o.lines.reduce((a, l, i) => a + confirmed[i] * l.stemsPerBox, 0))} stems</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(confCents)}</td>
                    <td />
                  </tr>
                </tfoot>
              </Table>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4 text-sm">
                <h3 className="font-semibold">Buyer</h3>
                <p>{name(o.wholesalerId)} · Miami, FL · your importer</p>
                <p className="text-muted">Label customer: {name(o.floristOrgId)} ({customer?.code})</p>
                <p className="text-muted">Ships on {name(o.wholesalerId)}&apos;s AWB, {s.orgs.find((x) => x.id === orgId)?.origin} → MIA {date(o.shipDate)} · paid on {name(o.wholesalerId)}&apos;s terms</p>
              </Card>
              <Card className="p-4 text-sm">
                <h3 className="font-semibold">After you confirm</h3>
                <p>{name(o.wholesalerId)} gets the purchase order and assigns the AWB. {name(o.floristOrgId)} is told it is confirmed.</p>
                <p className="text-muted">Print the labels from My Orders &amp; Labels once the order is on an AWB.</p>
              </Card>
            </div>
            {o.status === "pending" && (
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" className="h-11" onClick={() => s.farmDeclineMarketOrder(o.id)}>Decline order</Button>
                <Button className="h-11" disabled={!confBoxes} onClick={() => { s.farmConfirmMarketOrder(o.id, confirmed); setDone(o.id); setPick(o.id); setTab("confirmed"); }}>
                  Confirm {boxSummary(o.lines.map((l, i) => ({ boxType: l.boxType, boxes: confirmed[i] })))} · {money(confCents)}
                </Button>
              </div>
            )}
            {o.status === "confirmed" && po && (
              <div className="flex justify-end"><LinkButton variant="secondary" href="/farm">Open {po.number} in My Orders &amp; Labels</LinkButton></div>
            )}
          </div>
        ) : (
          <Card><Empty>No map orders yet. Florists see your listings on your importers&apos; maps.</Empty></Card>
        )}
      </div>
    </>
  );
}
