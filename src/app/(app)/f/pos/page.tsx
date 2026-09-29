"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useStore, type CartLine } from "@/lib/store";
import { cn, money, time } from "@/lib/format";
import { shiftTotals, stockByProduct } from "@/lib/selectors";
import type { Payment } from "@/lib/types";
import { Button, Card, CardHeader, Field, inputCls, Notice, PageHeader } from "@/components/ui";

export default function POS() {
  const s = useStore();
  const { orgId, userId } = s.session!;
  const me = s.users.find((u) => u.id === userId)!;
  const shift = s.shifts.find((x) => x.orgId === orgId && x.cashierId === userId && !x.closedAt);
  const [float, setFloat] = useState("150.00");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ctype, setCtype] = useState<"retail" | "wholesale">("retail");
  const [customerName, setCustomerName] = useState("");
  const [tendered, setTendered] = useState("");
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);

  const stock = stockByProduct(s, orgId);
  const items = s.saleItems.filter((i) => i.orgId === orgId);
  const unit = (id: string) => {
    const it = items.find((i) => i.id === id)!;
    return ctype === "wholesale" ? it.wholesaleCents : it.retailCents;
  };
  const total = cart.reduce((a, c) => a + c.qty * unit(c.itemId), 0);
  const add = (id: string, d = 1) =>
    setCart((c) => {
      const ex = c.find((x) => x.itemId === id);
      if (!ex) return d > 0 ? [...c, { itemId: id, qty: d }] : c;
      return c.map((x) => (x.itemId === id ? { ...x, qty: x.qty + d } : x)).filter((x) => x.qty > 0);
    });
  const pay = (p: Payment) => {
    const r = s.checkout(cart, ctype, p, customerName || undefined);
    const change = p === "cash" && tendered ? Math.round(+tendered * 100) - total : 0;
    setRes(r.ok && change > 0 ? { ok: true, message: `${r.message} Change due: ${money(change)}.` } : r);
    if (r.ok) { setCart([]); setTendered(""); setCustomerName(""); }
  };

  if (!shift) {
    return (
      <>
        <PageHeader title="Point of Sale" sub={`Signed in as ${me.name}`} />
        <Card className="mx-auto max-w-md p-6">
          <h2 className="font-display text-lg font-semibold">Open your cash drawer</h2>
          <p className="mt-1 text-sm text-muted">Every sale is tied to your shift, so the drawer can be counted and closed per cashier at the end of the day.</p>
          <Field label="Opening float (cash in drawer)" className="mt-4">
            <input className={inputCls} type="number" step="0.01" value={float} onChange={(e) => setFloat(e.target.value)} />
          </Field>
          <Button className="mt-4 w-full" onClick={() => s.openShift(userId, Math.round(+float * 100))}>Open shift</Button>
        </Card>
      </>
    );
  }
  const t = shiftTotals(s, shift);

  return (
    <>
      <PageHeader title="Point of Sale" sub={`${me.name} · shift opened ${time(shift.openedAt)} · ${t.count} sales · ${money(t.total)}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-3 inline-flex rounded-lg border border-line bg-surface p-1">
            {(["retail", "wholesale"] as const).map((c) => (
              <button key={c} onClick={() => setCtype(c)} className={cn("rounded-md px-3 py-1.5 text-sm capitalize", ctype === c ? "bg-brand text-white" : "text-muted hover:text-fg")}>{c} customer</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {items.filter((i) => ctype === "wholesale" || i.kind !== "box").map((it) => {
              const makeable = Math.min(...it.recipe.map((r) => Math.floor((stock[r.productId] ?? 0) / r.stems)));
              const avail = it.ready + makeable;
              return (
                <button key={it.id} disabled={avail <= 0} onClick={() => add(it.id)} className="rounded-xl border border-line bg-surface p-3 text-left transition hover:border-brand hover:shadow-sm disabled:opacity-40">
                  <div className="text-xs uppercase tracking-wide text-muted">{it.kind}</div>
                  <div className="mt-0.5 font-medium leading-snug">{it.name}</div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="font-display text-lg font-semibold">{money(ctype === "wholesale" ? it.wholesaleCents : it.retailCents)}</span>
                    <span className="text-xs text-muted">{it.ready} ready{makeable ? ` +${makeable}` : ""}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader title="Ticket" sub={ctype === "wholesale" ? "Wholesale prices" : "Retail prices"} />
          <div className="divide-y divide-line">
            {cart.map((c) => {
              const it = items.find((i) => i.id === c.itemId)!;
              return (
                <div key={c.itemId} className="flex items-center gap-2 px-4 py-2 text-sm">
                  <div className="flex-1"><div>{it.name}</div><div className="text-xs text-muted">{money(unit(c.itemId))} each</div></div>
                  <button className="rounded p-1 hover:bg-surface-2" onClick={() => add(c.itemId, -1)} aria-label="Less"><Minus size={14} /></button>
                  <span className="w-5 text-center tabular-nums">{c.qty}</span>
                  <button className="rounded p-1 hover:bg-surface-2" onClick={() => add(c.itemId)} aria-label="More"><Plus size={14} /></button>
                  <button className="rounded p-1 text-muted hover:bg-surface-2" onClick={() => add(c.itemId, -c.qty)} aria-label="Remove"><Trash2 size={14} /></button>
                </div>
              );
            })}
            {!cart.length && <div className="px-4 py-8 text-center text-sm text-muted">Tap a product to add it.</div>}
          </div>
          <div className="grid gap-3 border-t border-line p-4">
            <div className="flex justify-between font-display text-xl font-semibold"><span>Total</span><span className="tabular-nums">{money(total)}</span></div>
            {ctype === "wholesale" && <input className={inputCls} placeholder="Customer name (e.g. Hotel Brisas)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />}
            <input className={inputCls} type="number" step="0.01" placeholder="Cash received (optional)" value={tendered} onChange={(e) => setTendered(e.target.value)} />
            <div className={cn("grid gap-2", ctype === "wholesale" ? "grid-cols-3" : "grid-cols-2")}>
              <Button disabled={!cart.length} onClick={() => pay("cash")}>Cash</Button>
              <Button disabled={!cart.length} onClick={() => pay("card")}>Card</Button>
              {ctype === "wholesale" && <Button variant="secondary" disabled={!cart.length || !customerName} onClick={() => pay("account")}>On account</Button>}
            </div>
            <Notice result={res} />
          </div>
        </Card>
      </div>
    </>
  );
}
