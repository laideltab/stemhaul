"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { cn, date, money, num, perStem } from "@/lib/format";
import { importerFor, shortName, mapFarmsFor } from "@/lib/market";
import { FlowerBand, Stepper } from "@/components/market-ui";
import { Badge, Card, Empty, LinkButton } from "@/components/ui";

export default function FarmShop({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = useStore();
  const { importer } = importerFor(s, s.session!.orgId);
  const view = importer ? mapFarmsFor(s, importer.id).find((f) => f.farm.id === id) : undefined;
  const [tab, setTab] = useState<string | null>(null);
  const [len, setLen] = useState<Record<string, string>>({});
  if (!importer || !view) return <Empty>This farm is not on your importer&apos;s map. <Link className="text-brand underline" href="/f/market">Back to map</Link></Empty>;

  const product = (pid: string) => s.products.find((p) => p.id === pid)!;
  const species = tab && view.species.includes(tab) ? tab : view.species[0];
  // One card per variety and color; each length is its own listing.
  const groups = new Map<string, typeof view.listings>();
  for (const l of view.listings) {
    const p = product(l.productId);
    if (p.species !== species) continue;
    const k = `${p.variety}|${p.color}`;
    groups.set(k, [...(groups.get(k) ?? []), l].sort((a, b) => product(a.productId).lengthCm - product(b.productId).lengthCm));
  }
  const inCart = (lid: string) => s.cart.find((c) => c.listingId === lid)?.boxes ?? 0;
  const mine = view.listings.filter((l) => inCart(l.id) > 0);
  const total = mine.reduce((a, l) => a + inCart(l.id) * l.stemsPerBox * l.saleCents, 0);
  const cartBoxes = s.cart.reduce((a, c) => a + c.boxes, 0);
  const tight = mine.filter((l) => l.stockBoxes <= 2);
  const ship = new Date();
  ship.setDate(ship.getDate() + 2);
  const arrive = new Date(ship);
  arrive.setDate(arrive.getDate() + 1);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-sidebar px-5 py-5 text-sidebar-fg sm:px-7">
        <div>
          <Link href="/f/market" className="text-sm text-sidebar-fg/80 underline">← Back to map</Link>
          <h1 className="mt-1 font-display text-3xl font-semibold text-white">{view.farm.name}</h1>
          <p className="text-sm text-sidebar-fg/80">{view.farm.city} · {view.farm.tagline}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div><dt className="text-sidebar-fg/70">Sold and delivered by</dt><dd className="font-semibold text-white">{shortName(importer)}</dd></div>
          <div><dt className="text-sidebar-fg/70">Flies</dt><dd className="font-semibold text-white">{date(ship.toISOString())} · {view.farm.origin} → MIA</dd></div>
          <div><dt className="text-sidebar-fg/70">At your shop</dt><dd className="font-semibold text-white">{date(arrive.toISOString())}</dd></div>
          <div><dt className="text-sidebar-fg/70">Confirms</dt><dd className="font-semibold text-white">within 4 h</dd></div>
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
            {view.species.map((sp) => (
              <button key={sp} onClick={() => setTab(sp)} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm", sp === species ? "border-brand font-semibold text-fg" : "border-transparent text-muted hover:text-fg")}>
                {sp} ({view.listings.filter((l) => product(l.productId).species === sp).length})
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...groups].map(([k, ls]) => {
              const p0 = product(ls[0].productId);
              const cur = ls.find((l) => l.id === len[k]) ?? ls.find((l) => inCart(l.id)) ?? ls[0];
              const n = inCart(cur.id);
              return (
                <Card key={k} className="overflow-hidden">
                  <FlowerBand color={p0.color}>{p0.variety}</FlowerBand>
                  <div className="grid gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold">{p0.variety} · {p0.color}</div>
                      <Badge tone={cur.stockBoxes <= 2 ? "warn" : "good"}>{cur.stockBoxes <= 2 ? `Only ${cur.stockBoxes} ${cur.boxType}` : `${cur.stockBoxes} ${cur.boxType}`}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ls.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setLen({ ...len, [k]: l.id })}
                          className={cn("rounded-lg border px-2.5 py-1 text-center text-xs", l.id === cur.id ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-line hover:bg-surface-2")}
                        >
                          <div className="font-medium">{product(l.productId).lengthCm} cm</div>
                          <div className="tabular-nums text-muted">{perStem(l.saleCents)}</div>
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-muted">{p0.stemsPerBunch} stems/bunch · {cur.boxType} = {num(cur.stemsPerBox)} stems · {money(cur.stemsPerBox * cur.saleCents)} a box</div>
                    <div className="flex items-center justify-between gap-2">
                      <Stepper value={n} max={cur.stockBoxes} unit={cur.boxType} onChange={(v) => s.setCart(cur.id, v)} />
                      {n > 0 && <span className="text-sm text-good">In cart</span>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-display text-base font-semibold">Your order</h2>
            <p className="text-xs text-muted">{view.farm.name} · delivered by {shortName(importer)} {date(arrive.toISOString())}</p>
          </div>
          <div className="grid gap-3 p-4">
            {mine.map((l) => {
              const p = product(l.productId);
              const b = inCart(l.id);
              return (
                <div key={l.id} className="flex justify-between gap-3 text-sm">
                  <div>
                    <div>{p.variety} {p.color.toLowerCase()} {p.lengthCm} cm</div>
                    <div className="text-xs text-muted">{b} {l.boxType} · {num(b * l.stemsPerBox)} stems</div>
                  </div>
                  <div className="font-semibold tabular-nums">{money(b * l.stemsPerBox * l.saleCents)}</div>
                </div>
              );
            })}
            {!mine.length && <p className="text-sm text-muted">Pick a length and add boxes.</p>}
            {mine.length > 0 && (
              <div className="flex justify-between border-t border-line pt-3 text-sm">
                <span className="text-muted">Delivered to your shop</span>
                <span className="font-semibold tabular-nums">{money(total)}</span>
              </div>
            )}
            {tight.map((l) => {
              const p = product(l.productId);
              return (
                <p key={l.id} className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
                  {p.variety} {p.lengthCm} cm has {l.stockBoxes} {l.boxType} left. The farm may confirm less than you ask for, and you only pay for what they confirm.
                </p>
              );
            })}
            <LinkButton href="/f/market/cart" className={cn(!cartBoxes && "pointer-events-none opacity-50")}>Review order · {cartBoxes} box{cartBoxes === 1 ? "" : "es"}</LinkButton>
          </div>
        </Card>
      </div>
    </>
  );
}
