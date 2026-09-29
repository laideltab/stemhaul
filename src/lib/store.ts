"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildSeed, type Data } from "./seed";
import type { BoxType, OnlineOrder, Payment, POLine, QBBatch, Receipt, Sale } from "./types";
import { stockByProduct } from "./selectors";

export interface Session {
  orgId: string;
  userId: string;
}

export interface CartLine {
  itemId: string;
  qty: number;
}

type Result = { ok: true; message: string } | { ok: false; message: string };

interface Actions {
  signIn: (orgId: string, userId: string) => void;
  signOut: () => void;
  resetDemo: () => void;

  createPO: (farmId: string, shipDate: string, lines: POLine[], send: boolean) => string;
  sendPO: (poId: string) => void;
  farmConfirmPO: (poId: string) => void;
  farmPrintLabels: (poId: string) => void;
  bookFreight: (poIds: string[], agencyId: string | undefined, airline: string, flightDate: string, masterNumber?: string) => void;
  scanReceive: (code: string) => Result;
  markBox: (boxId: string, status: "missing" | "damaged" | "received") => void;
  deliverBoxes: (customerId: string, boxIds: string[], pricePerStemCents: Record<string, number>) => string;
  recordPayment: (invoiceId: string, cents: number) => void;
  payBill: (billId: string) => void;

  floristScanBox: (code: string) => Result;
  receiveManual: (supplier: string, lines: Receipt["lines"]) => void;
  makeBunches: (itemId: string, qty: number) => Result;
  recordWaste: (productId: string, stems: number, note: string) => Result;
  openShift: (cashierId: string, floatCents: number) => void;
  checkout: (cart: CartLine[], customerType: Sale["customerType"], payment: Payment, customerName?: string) => Result;
  closeShift: (shiftId: string, countedCents: number, note: string) => void;
  advanceOnlineOrder: (orderId: string) => Result;
  placeWebOrder: (orgId: string, customer: string, address: string, deliveryDate: string, cart: CartLine[]) => string;

  syncQuickBooks: () => number;
}

export type Store = Data & { session: Session | null } & Actions;

const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const next = (key: string) => {
        const n = (get().counters[key] ?? 0) + 1;
        set((s) => ({ counters: { ...s.counters, [key]: n } }));
        return n;
      };
      const me = () => get().session!;

      // Consume items for a sale: ready units first, then stems straight from stock.
      const consume = (orgId: string, cart: CartLine[], note: string) => {
        const s = get();
        const stock = stockByProduct(s, orgId);
        const need: Record<string, number> = {};
        const useReady: Record<string, number> = {};
        for (const c of cart) {
          const it = s.saleItems.find((i) => i.id === c.itemId)!;
          const fromReady = Math.min(it.ready, c.qty);
          useReady[it.id] = fromReady;
          for (const r of it.recipe) need[r.productId] = (need[r.productId] ?? 0) + r.stems * (c.qty - fromReady);
        }
        for (const [pid, stems] of Object.entries(need)) {
          if (stems > (stock[pid] ?? 0)) {
            const p = s.products.find((x) => x.id === pid)!;
            return { ok: false as const, message: `Not enough ${p.species} ${p.variety}: need ${stems} stems, have ${stock[pid] ?? 0}.` };
          }
        }
        const at = now();
        const mvs = Object.entries(need)
          .filter(([, stems]) => stems > 0)
          .map(([productId, stems]) => ({
            id: `mv_${next("mv")}`, orgId, at, productId, stems: -stems, type: "sale" as const, note, userId: me().userId,
          }));
        set((st) => ({
          movements: [...st.movements, ...mvs],
          saleItems: st.saleItems.map((i) => (useReady[i.id] ? { ...i, ready: i.ready - useReady[i.id] } : i)),
        }));
        return { ok: true as const, message: "" };
      };

      return {
        ...buildSeed(),
        session: null,

        signIn: (orgId, userId) => set({ session: { orgId, userId } }),
        signOut: () => set({ session: null }),
        resetDemo: () => set({ ...buildSeed() }),

        createPO: (farmId, shipDate, lines, send) => {
          const n = next("po");
          const id = `po_${n}`;
          set((s) => ({
            pos: [
              { id, number: `PO-${n}`, wholesalerId: me().orgId, farmId, shipDate, lines, status: send ? "sent" : "draft", createdAt: now() },
              ...s.pos,
            ],
          }));
          return id;
        },
        sendPO: (poId) => set((s) => ({ pos: s.pos.map((p) => (p.id === poId ? { ...p, status: "sent" } : p)) })),
        farmConfirmPO: (poId) => set((s) => ({ pos: s.pos.map((p) => (p.id === poId ? { ...p, status: "confirmed" } : p)) })),
        farmPrintLabels: (poId) => {
          const po = get().pos.find((p) => p.id === poId)!;
          if (get().boxes.some((b) => b.poId === poId)) return;
          const num = po.number.replace("PO-", "");
          const newBoxes = po.lines.flatMap((l, li) =>
            Array.from({ length: l.boxes }, () => {
              const n = next("box");
              return {
                id: `bx_${n}`, code: `LF${num}${String(n).padStart(4, "0")}`, poId, lineIndex: li,
                productId: l.productId, boxType: l.boxType as BoxType, stems: l.stemsPerBox,
                costPerStemCents: l.pricePerStemCents, status: "labeled" as const,
              };
            }),
          );
          set((s) => ({
            boxes: [...s.boxes, ...newBoxes],
            pos: s.pos.map((p) => (p.id === poId ? { ...p, status: "labeled" } : p)),
          }));
        },
        bookFreight: (poIds, agencyId, airline, flightDate, masterNumber) => {
          const n = next("awb");
          const id = `awb_${n}`;
          const houses = poIds.map((poId) => ({
            hawb: `HAWB-${next("hawb")}`,
            poId,
            pieces: get().boxes.filter((b) => b.poId === poId).length,
          }));
          const prefix = airline.startsWith("Avianca") ? "729" : airline.startsWith("LATAM") ? "045" : "406";
          set((s) => ({
            awbs: [
              { id, number: masterNumber?.trim() || `${prefix}-${48300000 + n * 173}`, airline, agencyId, flightDate, origin: airline.startsWith("Avianca") ? "UIO" : "BOG", status: "booked", houses },
              ...s.awbs,
            ],
            pos: s.pos.map((p) => (poIds.includes(p.id) ? { ...p, status: "shipped", awbId: id } : p)),
            boxes: s.boxes.map((b) => {
              const h = houses.find((x) => x.poId === b.poId);
              return h ? { ...b, status: "in_transit", hawb: h.hawb } : b;
            }),
          }));
        },
        scanReceive: (code) => {
          const s = get();
          const box = s.boxes.find((b) => b.code === code.trim().toUpperCase());
          if (!box) return { ok: false, message: `No box with label ${code}.` };
          if (box.status === "received" || box.status === "delivered") return { ok: false, message: `${box.code} was already scanned.` };
          if (box.status === "labeled") return { ok: false, message: `${box.code} has not been shipped yet.` };
          set((st) => {
            const boxes = st.boxes.map((b) => (b.id === box.id ? { ...b, status: "received" as const } : b));
            const pending = boxes.filter((b) => b.poId === box.poId && b.status === "in_transit").length;
            const po = st.pos.find((p) => p.id === box.poId)!;
            return {
              boxes,
              pos: pending === 0 ? st.pos.map((p) => (p.id === po.id ? { ...p, status: "received" } : p)) : st.pos,
              awbs: st.awbs.map((a) => (a.id === po.awbId ? { ...a, status: "arrived" } : a)),
            };
          });
          const p = s.products.find((x) => x.id === box.productId)!;
          return { ok: true, message: `${box.code} · ${box.boxType} ${p.species} ${p.variety} ${p.lengthCm}cm · ${box.stems} stems` };
        },
        markBox: (boxId, status) => set((s) => ({ boxes: s.boxes.map((b) => (b.id === boxId ? { ...b, status } : b)) })),
        deliverBoxes: (customerId, boxIds, price) => {
          const n = next("inv");
          const id = `inv_${n}`;
          const s = get();
          const lines = boxIds.map((bid) => {
            const b = s.boxes.find((x) => x.id === bid)!;
            const p = s.products.find((x) => x.id === b.productId)!;
            return { boxId: b.id, description: `${b.boxType} ${p.species} ${p.variety} ${p.lengthCm}cm`, stems: b.stems, pricePerStemCents: price[b.productId] };
          });
          const due = new Date();
          due.setDate(due.getDate() + 15);
          set((st) => ({
            invoices: [
              { id, number: `INV-${n}`, wholesalerId: me().orgId, customerId, date: today(), dueDate: due.toISOString().slice(0, 10), lines, totalCents: lines.reduce((a, l) => a + l.stems * l.pricePerStemCents, 0), paidCents: 0 },
              ...st.invoices,
            ],
            boxes: st.boxes.map((b) => (boxIds.includes(b.id) ? { ...b, status: "delivered", customerId, invoiceId: id } : b)),
          }));
          return id;
        },
        recordPayment: (invoiceId, cents) =>
          set((s) => ({ invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, paidCents: Math.min(i.totalCents, i.paidCents + cents) } : i)) })),
        payBill: (billId) => set((s) => ({ bills: s.bills.map((b) => (b.id === billId ? { ...b, paidCents: b.totalCents } : b)) })),

        floristScanBox: (code) => {
          const s = get();
          const orgId = me().orgId;
          const box = s.boxes.find((b) => b.code === code.trim().toUpperCase());
          const linked = s.contacts.filter((c) => c.linkedOrgId === orgId && c.kind === "customer").map((c) => c.id);
          if (!box || !box.customerId || !linked.includes(box.customerId)) return { ok: false, message: `${code} is not on any delivery to your shop.` };
          if (box.floristReceivedAt) return { ok: false, message: `${box.code} was already received.` };
          const inv = s.invoices.find((i) => i.id === box.invoiceId)!;
          const line = inv.lines.find((l) => l.boxId === box.id)!;
          const supplier = s.orgs.find((o) => o.id === inv.wholesalerId)!.name;
          const at = now();
          set((st) => ({
            boxes: st.boxes.map((b) => (b.id === box.id ? { ...b, floristReceivedAt: at } : b)),
            receipts: [
              { id: `rc_${st.receipts.length + 1}`, orgId, at, source: "stemhaul", supplier, lines: [{ productId: box.productId, stems: box.stems, costPerStemCents: line.pricePerStemCents, boxCode: box.code }], totalCents: box.stems * line.pricePerStemCents },
              ...st.receipts,
            ],
            movements: [...st.movements, { id: `mv_${next("mv")}`, orgId, at, productId: box.productId, stems: box.stems, type: "receive", note: `Box ${box.code} from ${supplier}`, userId: me().userId }],
          }));
          const p = s.products.find((x) => x.id === box.productId)!;
          return { ok: true, message: `${box.code} · ${p.species} ${p.variety} ${p.lengthCm}cm · +${box.stems} stems` };
        },
        receiveManual: (supplier, lines) => {
          const orgId = me().orgId;
          const at = now();
          set((st) => ({
            receipts: [{ id: `rc_${st.receipts.length + 1}`, orgId, at, source: "manual", supplier, lines, totalCents: lines.reduce((a, l) => a + l.stems * l.costPerStemCents, 0) }, ...st.receipts],
            movements: [...st.movements, ...lines.map((l) => ({ id: `mv_${next("mv")}`, orgId, at, productId: l.productId, stems: l.stems, type: "receive" as const, note: `Bought at ${supplier}`, userId: me().userId }))],
          }));
        },
        makeBunches: (itemId, qty) => {
          const s = get();
          const orgId = me().orgId;
          const it = s.saleItems.find((i) => i.id === itemId)!;
          const stock = stockByProduct(s, orgId);
          for (const r of it.recipe) {
            if (r.stems * qty > (stock[r.productId] ?? 0)) {
              const p = s.products.find((x) => x.id === r.productId)!;
              return { ok: false, message: `Not enough ${p.species} ${p.variety}: need ${r.stems * qty}, have ${stock[r.productId] ?? 0}.` };
            }
          }
          const at = now();
          set((st) => ({
            movements: [...st.movements, ...it.recipe.map((r) => ({ id: `mv_${next("mv")}`, orgId, at, productId: r.productId, stems: -r.stems * qty, type: "bunch" as const, note: `Made ${qty} × ${it.name}`, userId: me().userId }))],
            saleItems: st.saleItems.map((i) => (i.id === itemId ? { ...i, ready: i.ready + qty } : i)),
          }));
          return { ok: true, message: `Made ${qty} × ${it.name}.` };
        },
        recordWaste: (productId, stems, note) => {
          const orgId = me().orgId;
          const have = stockByProduct(get(), orgId)[productId] ?? 0;
          if (stems > have) return { ok: false, message: `Only ${have} stems in stock.` };
          set((st) => ({ movements: [...st.movements, { id: `mv_${next("mv")}`, orgId, at: now(), productId, stems: -stems, type: "waste", note: note || "Waste", userId: me().userId }] }));
          return { ok: true, message: `Recorded ${stems} stems of waste.` };
        },
        openShift: (cashierId, floatCents) =>
          set((s) => ({ shifts: [...s.shifts, { id: `sh_${next("shift")}`, orgId: me().orgId, cashierId, openedAt: now(), openingFloatCents: floatCents }] })),
        checkout: (cart, customerType, payment, customerName) => {
          const s = get();
          const { orgId, userId } = me();
          const shift = s.shifts.find((x) => x.orgId === orgId && x.cashierId === userId && !x.closedAt);
          if (!shift) return { ok: false, message: "Open your shift before selling." };
          const n = s.counters.sale + 1;
          const res = consume(orgId, cart, `S-${n}`);
          if (!res.ok) return res;
          next("sale");
          const lines = cart.map((c) => {
            const it = s.saleItems.find((i) => i.id === c.itemId)!;
            return { itemId: it.id, name: it.name, qty: c.qty, unitCents: customerType === "wholesale" ? it.wholesaleCents : it.retailCents };
          });
          const total = lines.reduce((a, l) => a + l.qty * l.unitCents, 0);
          set((st) => ({
            sales: [...st.sales, { id: `sale_${n}`, orgId, number: `S-${n}`, at: now(), channel: "store", customerType, customerName, cashierId: userId, shiftId: shift.id, payment, lines, totalCents: total }],
          }));
          return { ok: true, message: `Sale S-${n} saved.` };
        },
        closeShift: (shiftId, countedCents, note) =>
          set((s) => ({ shifts: s.shifts.map((x) => (x.id === shiftId ? { ...x, closedAt: now(), countedCashCents: countedCents, note } : x)) })),
        advanceOnlineOrder: (orderId) => {
          const s = get();
          const o = s.onlineOrders.find((x) => x.id === orderId)!;
          const flow: OnlineOrder["status"][] = ["new", "preparing", "ready", "delivered"];
          const nextStatus = flow[flow.indexOf(o.status) + 1];
          if (!nextStatus) return { ok: false, message: "Already delivered." };
          if (nextStatus === "preparing") {
            const n = s.counters.sale + 1;
            const res = consume(o.orgId, o.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })), `S-${n} · web ${o.number}`);
            if (!res.ok) return res;
            next("sale");
            set((st) => ({
              sales: [...st.sales, { id: `sale_${n}`, orgId: o.orgId, number: `S-${n}`, at: now(), channel: "web", customerType: "retail", customerName: o.customer, cashierId: me().userId, payment: "card", lines: o.lines, totalCents: o.totalCents }],
              onlineOrders: st.onlineOrders.map((x) => (x.id === orderId ? { ...x, status: nextStatus, saleId: `sale_${n}` } : x)),
            }));
            return { ok: true, message: `${o.number} is being prepared; stock was taken out.` };
          }
          set((st) => ({ onlineOrders: st.onlineOrders.map((x) => (x.id === orderId ? { ...x, status: nextStatus } : x)) }));
          return { ok: true, message: `${o.number} marked ${nextStatus}.` };
        },
        placeWebOrder: (orgId, customer, address, deliveryDate, cart) => {
          const n = next("web");
          const s = get();
          const lines = cart.map((c) => {
            const it = s.saleItems.find((i) => i.id === c.itemId)!;
            return { itemId: it.id, name: it.name, qty: c.qty, unitCents: it.retailCents };
          });
          set((st) => ({
            onlineOrders: [{ id: `oo_${n}`, orgId, number: `W-${n}`, at: now(), customer, address, deliveryDate, lines, totalCents: lines.reduce((a, l) => a + l.qty * l.unitCents, 0), status: "new" }, ...st.onlineOrders],
          }));
          return `W-${n}`;
        },

        syncQuickBooks: () => {
          const s = get();
          const orgId = me().orgId;
          const batches: QBBatch[] = [];
          const synced = new Set(s.qb.filter((q) => q.orgId === orgId).map((q) => q.description));
          if (s.orgs.find((o) => o.id === orgId)!.modules.includes("florist")) {
            const days = [...new Set(s.sales.filter((x) => x.orgId === orgId).map((x) => x.at.slice(0, 10)))].sort();
            for (const d of days) {
              const desc = `Daily sales summary ${d}`;
              const failed = s.qb.find((q) => q.orgId === orgId && q.description === desc && q.status === "error");
              if (synced.has(desc) && !failed) continue;
              const ds = s.sales.filter((x) => x.orgId === orgId && x.at.slice(0, 10) === d);
              batches.push({ id: `qb_${orgId}_${d}_${Date.now()}`, orgId, at: now(), kind: "sales" as const, description: desc, count: ds.length, totalCents: ds.reduce((a, x) => a + x.totalCents, 0), status: "sent" as const });
            }
          }
          for (const inv of s.invoices.filter((i) => i.wholesalerId === orgId)) {
            const desc = `${inv.number} (A/R)`;
            if (!synced.has(desc)) batches.push({ id: `qb_${inv.id}_${Date.now()}`, orgId, at: now(), kind: "invoices" as const, description: desc, count: 1, totalCents: inv.totalCents, status: "sent" as const });
          }
          for (const b of s.bills.filter((x) => x.ownerOrgId === orgId)) {
            const desc = `${b.vendor}: ${b.reference} (A/P)`;
            if (!synced.has(desc)) batches.push({ id: `qb_${b.id}_${Date.now()}`, orgId, at: now(), kind: "bills" as const, description: desc, count: 1, totalCents: b.totalCents, status: "sent" as const });
          }
          const retried = new Set(batches.map((b) => b.description));
          set((st) => ({ qb: [...batches, ...st.qb.filter((q) => !(q.orgId === orgId && q.status === "error" && retried.has(q.description)))] }));
          return batches.length;
        },
      };
    },
    { name: "stemhaul-demo-v1" },
  ),
);
