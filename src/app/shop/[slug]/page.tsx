"use client";

import { use, useState } from "react";
import { Flower2, ShoppingBag } from "lucide-react";
import { LOGO_ICON } from "@/lib/brand";
import { useStore, type CartLine } from "@/lib/store";
import { money } from "@/lib/format";
import { stockByProduct } from "@/lib/selectors";
import { useHydrated } from "@/components/shell";
import { Button, Card, Field, inputCls } from "@/components/ui";

const shops: Record<string, string> = { "mari-flowers": "org_mari" };

export default function WebShop({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const hydrated = useHydrated();
  const s = useStore();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [done, setDone] = useState<string | null>(null);
  if (!hydrated) return null;
  const orgId = shops[slug];
  const org = s.orgs.find((o) => o.id === orgId);
  if (!org) return <div className="p-10 text-center">Shop not found.</div>;

  const stock = stockByProduct(s, orgId);
  // Reserve what is already in open web orders so the shop never oversells.
  const items = s.saleItems.filter((i) => i.orgId === orgId && i.onWeb).map((i) => {
    const makeable = Math.min(...i.recipe.map((r) => Math.floor((stock[r.productId] ?? 0) / r.stems)));
    const reserved = s.onlineOrders.filter((o) => o.orgId === orgId && o.status === "new").flatMap((o) => o.lines).filter((l) => l.itemId === i.id).reduce((a, l) => a + l.qty, 0);
    return { ...i, available: Math.max(0, i.ready + makeable - reserved) };
  });
  const total = cart.reduce((a, c) => a + c.qty * items.find((i) => i.id === c.itemId)!.retailCents, 0);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="min-h-screen bg-[#fbf8f4]">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-4">
          <Flower2 className="text-accent" />
          <span className="font-display text-xl font-semibold">{org.name}</span>
          <span className="ml-auto hidden text-sm text-muted sm:inline">Same-day delivery in Miami</span>
          {s.session && <a href={process.env.NEXT_PUBLIC_STATIC_DEMO === "1" ? "#/f/online" : "/f/online"} className="ml-auto text-sm text-brand underline sm:ml-4">Back to the shop admin</a>}
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((i) => (
            <Card key={i.id} className="overflow-hidden">
              <div className="grid h-36 place-items-center bg-gradient-to-br from-rose-100 to-amber-50"><Flower2 size={48} className="text-accent/60" /></div>
              <div className="p-4">
                <div className="font-display text-lg font-semibold">{i.name}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-medium">{money(i.retailCents)}</span>
                  <span className="text-xs text-muted">{i.available ? `${i.available} available` : "Sold out today"}</span>
                </div>
                <Button className="mt-3 w-full" disabled={(cart.find((c) => c.itemId === i.id)?.qty ?? 0) >= i.available} onClick={() => setCart((c) => (c.some((x) => x.itemId === i.id) ? c.map((x) => (x.itemId === i.id ? { ...x, qty: x.qty + 1 } : x)) : [...c, { itemId: i.id, qty: 1 }]))}>
                  Add to bag
                </Button>
              </div>
            </Card>
          ))}
        </div>
        <Card className="h-fit p-4">
          <div className="flex items-center gap-2 font-display text-lg font-semibold"><ShoppingBag size={18} /> Your bag</div>
          {done ? (
            <p className="mt-3 text-sm">Thank you! Order <b>{done}</b> was placed. It now shows in the shop&apos;s Online Orders.</p>
          ) : (
            <>
              <ul className="mt-3 space-y-1 text-sm">
                {cart.map((c) => { const it = items.find((i) => i.id === c.itemId)!; return <li key={c.itemId} className="flex justify-between"><span>{c.qty}× {it.name}</span><span>{money(c.qty * it.retailCents)}</span></li>; })}
                {!cart.length && <li className="text-muted">Empty</li>}
              </ul>
              <div className="mt-3 flex justify-between border-t border-line pt-3 font-medium"><span>Total</span><span>{money(total)}</span></div>
              <div className="mt-3 grid gap-2">
                <Field label="Your name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <Field label="Delivery address"><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
                <Button disabled={!cart.length || !name || !address} onClick={() => setDone(s.placeWebOrder(orgId, name, address, tomorrow.toISOString().slice(0, 10), cart))}>Place order (demo, no payment)</Button>
              </div>
            </>
          )}
        </Card>
      </main>
      <footer className="mx-auto flex max-w-5xl items-center gap-2 px-4 pb-8 text-xs text-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_ICON} alt="" className="size-5 rounded" /> Online shop powered by Stem Haul
      </footer>
    </div>
  );
}
