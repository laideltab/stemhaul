"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Truck } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, date, money, num, perStem } from "@/lib/format";
import { importerFor, shortName, salePrice } from "@/lib/market";
import { Button, Card, CardHeader, Empty, LinkButton, PageHeader, Qty, Table } from "@/components/ui";

function Choice({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} className={cn("flex items-start gap-3 rounded-xl border p-3 text-left", on ? "border-brand bg-brand-soft/50 ring-1 ring-brand" : "border-line hover:bg-surface-2")}>
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2", on ? "border-brand" : "border-muted/50")}>{on && <span className="size-2 rounded-full bg-brand" />}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
    </button>
  );
}

export default function MarketCart() {
  const s = useStore();
  const router = useRouter();
  const orgId = s.session!.orgId;
  const { importer, customer } = importerFor(s, orgId);
  const [delivery, setDelivery] = useState<"shop" | "pickup">("shop");
  const [payment, setPayment] = useState<"account" | "card">("account");
  if (!importer || !customer) return <Empty>Your shop is not a customer of an importer on Stem Haul yet.</Empty>;

  const rows = s.cart.map((c) => {
    const l = s.listings.find((x) => x.id === c.listingId)!;
    const farm = s.orgs.find((o) => o.id === l.farmId)!;
    const markup = s.mapFarms.find((m) => m.wholesalerId === importer.id && m.farmId === l.farmId)?.markupPct ?? 0;
    const price = salePrice(l.farmPriceCents, markup);
    return { c, l, farm, p: s.products.find((x) => x.id === l.productId)!, price, total: c.boxes * l.stemsPerBox * price };
  });
  const farms = [...new Set(rows.map((r) => r.farm.name))];
  const origins = [...new Set(rows.map((r) => r.farm.origin))].join(" and ");
  const boxes = rows.reduce((a, r) => a + r.c.boxes, 0);
  const stems = rows.reduce((a, r) => a + r.c.boxes * r.l.stemsPerBox, 0);
  const total = rows.reduce((a, r) => a + r.total, 0);
  const ship = new Date();
  ship.setDate(ship.getDate() + 2);
  const arrive = new Date(ship);
  arrive.setDate(arrive.getDate() + 1);
  const send = () => {
    const ids = s.placeMarketOrders(delivery, payment);
    if (ids.length) router.push(`/f/market/orders/${ids[0]}`);
  };

  return (
    <>
      <PageHeader
        title="Review your order"
        sub={farms.length ? `From ${farms.join(", ")} · sold and delivered by ${shortName(importer)}` : `Sold and delivered by ${shortName(importer)}`}
        actions={<LinkButton variant="secondary" href="/f/market">Keep shopping</LinkButton>}
      />
      {!rows.length ? (
        <Card><Empty>Your cart is empty. <Link className="text-brand underline" href="/f/market">Open the farm map</Link></Empty></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid min-w-0 gap-6">
            <Card>
              <Table>
                <thead><tr><th>Product</th><th>Farm</th><th>Box</th><th className="num">Boxes</th><th className="num">Stems</th><th className="num">Per stem</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.l.id}>
                      <td className="font-medium">{r.p.variety} {r.p.color.toLowerCase()} {r.p.lengthCm} cm</td>
                      <td className="text-muted">{r.farm.name}</td>
                      <td>{r.l.boxType} · {r.l.stemsPerBox / r.p.stemsPerBunch} × {r.p.stemsPerBunch}</td>
                      <td className="num"><Qty value={r.c.boxes} max={r.l.stockBoxes} name={`box of ${r.p.variety}`} onChange={(n) => s.setCart(r.l.id, n)} /></td>
                      <td className="num">{num(r.c.boxes * r.l.stemsPerBox)}</td>
                      <td className="num">{perStem(r.price)}</td>
                      <td className="num">{money(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 text-sm">
                <span className="text-muted">Change boxes with − and +, or remove a line with the trash can.</span>
                <Button variant="ghost" className="text-bad" onClick={() => rows.forEach((r) => s.setCart(r.l.id, 0))}><Trash2 size={15} /> Empty cart</Button>
              </div>
            </Card>
            <Card>
              <CardHeader title="How it gets to you" />
              <div className="grid gap-3 p-4">
                <div className="flex gap-3 rounded-xl bg-surface-2 p-3 text-sm">
                  <Truck size={18} className="mt-0.5 shrink-0 text-brand" />
                  <p><b>{shortName(importer)} handles it.</b> They add your boxes to their {origins} → MIA flight on {date(ship.toISOString())}, clear customs and deliver. Freight is already in the price.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Choice on={delivery === "shop"} onClick={() => setDelivery("shop")} title="Deliver to my shop" sub={`${date(arrive.toISOString())} · with ${shortName(importer)}'s route`} />
                  <Choice on={delivery === "pickup"} onClick={() => setDelivery("pickup")} title={`I'll pick up at ${shortName(importer)}`} sub={`From ${date(arrive.toISOString())} after customs`} />
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader title="Payment" />
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <Choice on={payment === "account"} onClick={() => setPayment("account")} title={`My ${shortName(importer)} account`} sub={`${customer.terms ?? "Net 15"} · invoiced for what the farm confirms`} />
                <Choice on={payment === "card"} onClick={() => setPayment("card")} title="Card ending 4242" sub="Charged only after the farm confirms" />
              </div>
            </Card>
          </div>

          <div className="grid h-fit gap-4">
            <Card className="p-4">
              <h2 className="font-display text-base font-semibold">Summary</h2>
              <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
                <dt className="text-muted">Flowers · {boxes} boxes, {num(stems)} stems</dt><dd className="tabular-nums">{money(total)}</dd>
                <dt className="text-muted">Freight, customs, delivery</dt><dd>Included</dd>
                <dt className="border-t border-line pt-2 font-semibold">Total</dt><dd className="border-t border-line pt-2 font-display text-lg font-semibold tabular-nums">{money(total)}</dd>
              </dl>
              <Button className="mt-4 h-11 w-full" onClick={send}>Send order to {farms.length > 1 ? `${farms.length} farms` : "farm"}</Button>
            </Card>
            <Card className="bg-brand-soft/40 p-4">
              <h3 className="text-sm font-semibold">What happens next</h3>
              <ol className="mt-3 grid gap-3 text-sm">
                {[`${farms.join(" and ")} ${farms.length > 1 ? "get" : "gets"} a notification right away.`, `They confirm or adjust each line within 4 hours, and ${shortName(importer)} gets the purchase order.`, `${shortName(importer)} ships your boxes with their flight and delivers to your shop.`].map((t, i) => (
                  <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-fg">{i + 1}</span>{t}</li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
