"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildSeed, stemsPerBox, type Data } from "./seed";
import type { Box, InvoicePayment, Listing, MapFarm, MarketOrder, OnlineOrder, Org, Payment, POLine, Prebook, PrebookLine, PurchaseOrder, QBBatch, Receipt, Sale } from "./types";
import { importerFor, salePrice } from "./market";
import { stockByProduct } from "./selectors";

export interface Session {
  orgId: string;
  userId: string;
}

export interface AwbInput {
  origin: string;
  shipDate: string;
  number: string;
  airline: string;
  agencyId?: string;
}
export interface LineRef {
  poId: string;
  lineIndex: number;
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
  farmConfirmPO: (poId: string, confirmed: number[]) => void;
  farmDispatchPO: (poId: string, invoiceNumber: string) => Result;
  assignAwb: (awb: AwbInput, lines: LineRef[]) => Result;
  removeFromAwb: (lines: LineRef[]) => void;
  printLabels: (opts: { poId?: string; awbId?: string }) => void;
  closeAwb: (awbId: string) => void;
  scanReceive: (code: string) => Result;
  markBox: (boxId: string, status: "missing" | "damaged" | "received") => void;
  deliverBoxes: (customerId: string, boxIds: string[], pricePerStemCents: Record<string, number>) => string;
  recordPayment: (invoiceId: string, payment: Omit<InvoicePayment, "id">) => void;
  payBill: (billId: string, payment: Omit<InvoicePayment, "id">) => void;

  setCart: (listingId: string, boxes: number) => void;
  placeMarketOrders: (delivery: MarketOrder["delivery"], payment: MarketOrder["payment"]) => string[];
  farmConfirmMarketOrder: (orderId: string, confirmed: number[]) => string | undefined;
  farmDeclineMarketOrder: (orderId: string) => void;
  updateListing: (listingId: string, patch: Partial<Pick<Listing, "farmPriceCents" | "stockBoxes" | "listed">>) => void;
  setMapFarm: (farmId: string, patch: Partial<Pick<MapFarm, "markupPct" | "enabled">>) => void;

  editMarketOrder: (orderId: string, boxes: number[]) => void;
  cancelMarketOrder: (orderId: string) => void;
  editPrebook: (prebookId: string, lines: PrebookLine[]) => void;
  cancelPrebook: (prebookId: string) => void;
  editPO: (poId: string, boxes: number[]) => void;
  deletePO: (poId: string) => void;
  cancelOnlineOrder: (orderId: string) => Result;

  createPrebook: (input: Pick<Prebook, "neededBy" | "note" | "weekly" | "lines">) => string | undefined;
  repeatPrebook: (prebookId: string) => string | undefined;
  confirmPrebook: (prebookId: string, lines: PrebookLine[], note: string) => Result;
  declinePrebook: (prebookId: string, note: string) => void;
  addVendorFarm: (farm: { name: string; city: string; country: string; origin: string; code: string }) => string;

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
        farmConfirmPO: (poId, confirmed) =>
          set((s) => ({
            pos: s.pos.map((p) =>
              p.id === poId ? { ...p, status: "confirmed", lines: p.lines.map((l, i) => ({ ...l, confirmedBoxes: Math.max(0, Math.min(l.boxes, confirmed[i] ?? l.boxes)) })) } : p,
            ),
          })),
        // Last farm step: boxes are at the cargo agency and the farm invoice goes to the importer's payables.
        farmDispatchPO: (poId, invoiceNumber) => {
          const s = get();
          const po = s.pos.find((p) => p.id === poId);
          if (!po || po.status !== "labeled" || po.dispatchedAt) return { ok: false, message: "Print every label before dispatching." };
          const inv = invoiceNumber.trim();
          if (!inv) return { ok: false, message: "Type your invoice number." };
          const farm = s.orgs.find((o) => o.id === po.farmId)!;
          const total = po.lines.reduce((a, l) => a + (l.confirmedBoxes ?? 0) * l.stemsPerBox * l.pricePerStemCents, 0);
          const at = now();
          const due = new Date();
          due.setDate(due.getDate() + 15);
          set((st) => ({
            pos: st.pos.map((p) => (p.id === poId ? { ...p, dispatchedAt: at, farmInvoice: inv } : p)),
            bills: [...st.bills, { id: `bill_${next("bill")}`, ownerOrgId: po.wholesalerId, vendor: farm.name, reference: `Farm invoice ${inv} · ${po.number}`, date: today(), dueDate: due.toISOString().slice(0, 10), totalCents: total, paidCents: 0 }],
          }));
          const buyer = s.orgs.find((o) => o.id === po.wholesalerId);
          return { ok: true, message: `${po.number} dispatched. ${buyer?.shortName ?? buyer?.name} got invoice ${inv} for ${(total / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}.` };
        },
        assignAwb: (input, refs) => {
          if (!refs.length) return { ok: false, message: "Select at least one line." };
          const number = input.number.trim();
          if (!/^\d{3}-?\d{4}-?\d{4}$/.test(number)) return { ok: false, message: "Type the master AWB as 11 digits, e.g. 992-0111-3151." };
          const s = get();
          let awb = s.awbs.find((a) => a.number === number);
          if (awb && awb.status !== "open") return { ok: false, message: `AWB ${number} is already closed.` };
          if (!awb) {
            awb = { id: `awb_${next("awb")}`, number, airline: input.airline, agencyId: input.agencyId, flightDate: input.shipDate, origin: input.origin, status: "open" };
          }
          const awbId = awb.id;
          // One house AWB per purchase order inside this master.
          const houses: Record<string, string> = {};
          for (const r of refs) {
            const existing = s.pos.find((p) => p.id === r.poId)!.lines.find((l) => l.awbId === awbId)?.hawb;
            houses[r.poId] ??= existing ?? `${new Date().getFullYear()}-${String(next("hawb")).padStart(6, "0")}`;
          }
          const created = awb;
          set((st) => {
            const pos = st.pos.map((p) => {
              const mine = refs.filter((r) => r.poId === p.id).map((r) => r.lineIndex);
              if (!mine.length) return p;
              const lines = p.lines.map((l, i) => (mine.includes(i) ? { ...l, awbId, hawb: houses[p.id] } : l));
              const allBooked = lines.every((l) => (l.confirmedBoxes ?? 0) === 0 || l.awbId);
              return { ...p, lines, status: allBooked && p.status === "confirmed" ? ("booked" as const) : p.status };
            });
            return { pos, awbs: st.awbs.some((a) => a.id === awbId) ? st.awbs : [created, ...st.awbs] };
          });
          return { ok: true, message: `Added ${refs.length} line${refs.length > 1 ? "s" : ""} to AWB ${number}.` };
        },
        removeFromAwb: (refs) =>
          set((st) => ({
            pos: st.pos.map((p) => {
              const mine = refs.filter((r) => r.poId === p.id).map((r) => r.lineIndex);
              if (!mine.length) return p;
              if (st.boxes.some((b) => b.poId === p.id && mine.includes(b.lineIndex))) return p; // labels already printed
              return { ...p, status: p.status === "booked" ? "confirmed" : p.status, lines: p.lines.map((l, i) => (mine.includes(i) ? { ...l, awbId: undefined, hawb: undefined } : l)) };
            }),
          })),
        printLabels: ({ poId, awbId }) => {
          const s = get();
          const targets = s.pos.flatMap((p) =>
            p.lines
              .map((l, li) => ({ p, l, li }))
              .filter(({ p: po, l }) => l.awbId && (poId ? po.id === poId : l.awbId === awbId)),
          );
          const newBoxes: Box[] = [];
          for (const { p, l, li } of targets) {
            const have = s.boxes.filter((b) => b.poId === p.id && b.lineIndex === li).length;
            for (let i = have; i < (l.confirmedBoxes ?? 0); i++) {
              const n = next("box");
              newBoxes.push({
                id: `bx_${n}`, code: `IT${558465000 + n * 7}`, poId: p.id, lineIndex: li, productId: l.productId, boxType: l.boxType,
                stems: l.stemsPerBox, costPerStemCents: l.pricePerStemCents, status: "labeled", hawb: l.hawb, awbId: l.awbId,
                lot: next("lot"), customerId: l.customerId,
              });
            }
          }
          set((st) => {
            const boxes = [...st.boxes, ...newBoxes];
            const pos = st.pos.map((p) => {
              if (p.status !== "booked") return p;
              const done = p.lines.every((l, li) => boxes.filter((b) => b.poId === p.id && b.lineIndex === li).length >= (l.confirmedBoxes ?? 0));
              return done ? { ...p, status: "labeled" as const } : p;
            });
            return { boxes, pos };
          });
        },
        closeAwb: (awbId) =>
          set((st) => {
            const poIds = new Set(st.boxes.filter((b) => b.awbId === awbId).map((b) => b.poId));
            return {
              awbs: st.awbs.map((a) => (a.id === awbId ? { ...a, status: "closed" } : a)),
              boxes: st.boxes.map((b) => (b.awbId === awbId && b.status === "labeled" ? { ...b, status: "in_transit" } : b)),
              pos: st.pos.map((p) => (poIds.has(p.id) && p.status === "labeled" ? { ...p, status: "shipped" } : p)),
            };
          }),
        scanReceive: (code) => {
          const s = get();
          const box = s.boxes.find((b) => b.code === code.trim().toUpperCase());
          if (!box) return { ok: false, message: `No box with label ${code}.` };
          if (box.status === "received" || box.status === "delivered") return { ok: false, message: `${box.code} was already scanned.` };
          if (box.status === "labeled") return { ok: false, message: `${box.code} is not on a closed AWB yet.` };
          set((st) => {
            const boxes = st.boxes.map((b) => (b.id === box.id ? { ...b, status: "received" as const, receivedAt: now() } : b));
            const poPending = boxes.some((b) => b.poId === box.poId && b.status === "in_transit");
            const awbPending = boxes.some((b) => b.awbId === box.awbId && b.status === "in_transit");
            return {
              boxes,
              pos: poPending ? st.pos : st.pos.map((p) => (p.id === box.poId ? { ...p, status: "received" } : p)),
              awbs: awbPending ? st.awbs : st.awbs.map((a) => (a.id === box.awbId ? { ...a, status: "arrived" } : a)),
            };
          });
          const p = s.products.find((x) => x.id === box.productId)!;
          const cust = s.contacts.find((c) => c.id === box.customerId);
          return { ok: true, message: `${box.code} · ${box.boxType} ${p.species} ${p.variety} ${p.lengthCm}cm · ${box.stems} stems · ${cust ? `for ${cust.name}` : "stock"}` };
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
              { id, number: `INV-${n}`, wholesalerId: me().orgId, customerId, date: today(), dueDate: due.toISOString().slice(0, 10), lines, totalCents: lines.reduce((a, l) => a + l.stems * l.pricePerStemCents, 0), paidCents: 0, payments: [] },
              ...st.invoices,
            ],
            boxes: st.boxes.map((b) => (boxIds.includes(b.id) ? { ...b, status: "delivered", customerId, invoiceId: id, deliveredAt: now() } : b)),
          }));
          return id;
        },
        recordPayment: (invoiceId, payment) => {
          const pay = { ...payment, id: `pay_${next("pay")}` };
          set((s) => ({
            invoices: s.invoices.map((i) =>
              i.id === invoiceId ? { ...i, payments: [...i.payments, pay], paidCents: Math.min(i.totalCents, i.paidCents + payment.amountCents) } : i,
            ),
          }));
        },
        payBill: (billId, payment) => {
          const pay = { ...payment, id: `pay_${next("pay")}` };
          set((s) => ({
            bills: s.bills.map((b) => (b.id === billId ? { ...b, payments: [...(b.payments ?? []), pay], paidCents: Math.min(b.totalCents, b.paidCents + payment.amountCents) } : b)),
          }));
        },

        setCart: (listingId, boxes) =>
          set((s) => {
            const max = s.listings.find((l) => l.id === listingId)?.stockBoxes ?? 0;
            const n = Math.max(0, Math.min(max, Math.round(boxes)));
            // Keep each line where it is so the cart does not jump while editing.
            if (!n) return { cart: s.cart.filter((c) => c.listingId !== listingId) };
            return { cart: s.cart.some((c) => c.listingId === listingId) ? s.cart.map((c) => (c.listingId === listingId ? { ...c, boxes: n } : c)) : [...s.cart, { listingId, boxes: n }] };
          }),
        placeMarketOrders: (delivery, payment) => {
          const s = get();
          const floristOrgId = me().orgId;
          const { customer, importer } = importerFor(s, floristOrgId);
          if (!customer || !importer || !s.cart.length) return [];
          const createdAt = now();
          const ship = new Date();
          ship.setDate(ship.getDate() + 2);
          const byFarm = new Map<string, typeof s.cart>();
          for (const c of s.cart) {
            const farmId = s.listings.find((l) => l.id === c.listingId)!.farmId;
            byFarm.set(farmId, [...(byFarm.get(farmId) ?? []), c]);
          }
          const orders: MarketOrder[] = [...byFarm].map(([farmId, items]) => {
            const n = next("mk");
            const markupPct = s.mapFarms.find((m) => m.wholesalerId === importer.id && m.farmId === farmId)?.markupPct ?? 0;
            return {
              id: `mk_${n}`, number: `MK-${n}`, wholesalerId: importer.id, floristOrgId, customerId: customer.id, farmId, createdAt,
              confirmBy: new Date(Date.now() + 4 * 3600000).toISOString(), shipDate: ship.toISOString().slice(0, 10),
              delivery, payment, status: "pending",
              lines: items.map((c) => {
                const l = s.listings.find((x) => x.id === c.listingId)!;
                return { listingId: l.id, productId: l.productId, boxType: l.boxType, boxes: c.boxes, stemsPerBox: l.stemsPerBox, farmPriceCents: l.farmPriceCents, salePriceCents: salePrice(l.farmPriceCents, markupPct) };
              }),
            };
          });
          set((st) => ({ marketOrders: [...orders, ...st.marketOrders], cart: [] }));
          return orders.map((o) => o.id);
        },
        farmConfirmMarketOrder: (orderId, confirmed) => {
          const s = get();
          const o = s.marketOrders.find((x) => x.id === orderId);
          if (!o || o.status !== "pending") return;
          const lines = o.lines.map((l, i) => ({ ...l, confirmedBoxes: Math.max(0, Math.min(l.boxes, confirmed[i] ?? l.boxes)) }));
          const at = now();
          if (lines.every((l) => !l.confirmedBoxes)) {
            set((st) => ({ marketOrders: st.marketOrders.map((x) => (x.id === orderId ? { ...x, lines, status: "declined", confirmedAt: at } : x)) }));
            return;
          }
          // Confirming creates the importer's purchase order, customer already on every line; from here it is the regular PO flow.
          const n = next("po");
          const poId = `po_${n}`;
          const po = {
            id: poId, number: `PO-${n}`, wholesalerId: o.wholesalerId, farmId: o.farmId, shipDate: o.shipDate, status: "confirmed" as const, createdAt: at, marketOrderId: o.id,
            lines: lines.map((l) => ({ productId: l.productId, boxType: l.boxType, boxes: l.boxes, stemsPerBox: l.stemsPerBox, pricePerStemCents: l.farmPriceCents, salePriceCents: l.salePriceCents, customerId: o.customerId, confirmedBoxes: l.confirmedBoxes })),
          };
          set((st) => ({
            pos: [po, ...st.pos],
            marketOrders: st.marketOrders.map((x) => (x.id === orderId ? { ...x, lines, status: "confirmed", confirmedAt: at, poId } : x)),
            listings: st.listings.map((l) => {
              const used = lines.filter((x) => x.listingId === l.id).reduce((a, x) => a + (x.confirmedBoxes ?? 0), 0);
              return used ? { ...l, stockBoxes: Math.max(0, l.stockBoxes - used) } : l;
            }),
          }));
          return po.number;
        },
        farmDeclineMarketOrder: (orderId) =>
          set((st) => ({
            marketOrders: st.marketOrders.map((x) => (x.id === orderId && x.status === "pending" ? { ...x, status: "declined", confirmedAt: now(), lines: x.lines.map((l) => ({ ...l, confirmedBoxes: 0 })) } : x)),
          })),
        updateListing: (listingId, patch) => set((st) => ({ listings: st.listings.map((l) => (l.id === listingId ? { ...l, ...patch } : l)) })),
        setMapFarm: (farmId, patch) =>
          set((st) => ({ mapFarms: st.mapFarms.map((m) => (m.wholesalerId === me().orgId && m.farmId === farmId ? { ...m, ...patch } : m)) })),

        // Florists can change or cancel an order until the farm (or the importer) answers it.
        editMarketOrder: (orderId, boxes) =>
          set((st) => ({
            marketOrders: st.marketOrders.map((o) => {
              if (o.id !== orderId || o.status !== "pending") return o;
              const lines = o.lines
                .map((l, i) => ({ ...l, boxes: Math.max(0, Math.min(st.listings.find((x) => x.id === l.listingId)?.stockBoxes ?? l.boxes, Math.round(boxes[i] ?? l.boxes))) }))
                .filter((l) => l.boxes > 0);
              return lines.length ? { ...o, lines } : { ...o, status: "cancelled", confirmedAt: now() };
            }),
          })),
        cancelMarketOrder: (orderId) =>
          set((st) => ({ marketOrders: st.marketOrders.map((o) => (o.id === orderId && o.status === "pending" ? { ...o, status: "cancelled", confirmedAt: now() } : o)) })),
        editPrebook: (prebookId, lines) =>
          set((st) => ({
            prebooks: st.prebooks.map((p) => {
              if (p.id !== prebookId || p.status !== "requested") return p;
              const kept = lines.filter((l) => l.boxes > 0);
              return kept.length ? { ...p, lines: kept } : { ...p, status: "cancelled", answeredAt: now() };
            }),
          })),
        cancelPrebook: (prebookId) =>
          set((st) => ({ prebooks: st.prebooks.map((p) => (p.id === prebookId && p.status === "requested" ? { ...p, status: "cancelled", answeredAt: now() } : p)) })),
        // Purchase orders stay editable until the farm confirms them.
        editPO: (poId, boxes) =>
          set((st) => {
            const po = st.pos.find((p) => p.id === poId);
            if (!po || !["draft", "sent"].includes(po.status)) return {};
            const lines = po.lines.map((l, i) => ({ ...l, boxes: Math.max(0, Math.round(boxes[i] ?? l.boxes)) })).filter((l) => l.boxes > 0);
            return { pos: lines.length ? st.pos.map((p) => (p.id === poId ? { ...p, lines } : p)) : st.pos.filter((p) => p.id !== poId) };
          }),
        deletePO: (poId) => set((st) => ({ pos: st.pos.filter((p) => p.id !== poId || !["draft", "sent"].includes(p.status)) })),
        cancelOnlineOrder: (orderId) => {
          const o = get().onlineOrders.find((x) => x.id === orderId);
          if (!o || o.status !== "new") return { ok: false, message: "Only new orders can be cancelled; the flowers are already out of inventory." };
          set((st) => ({ onlineOrders: st.onlineOrders.map((x) => (x.id === orderId ? { ...x, status: "cancelled" } : x)) }));
          return { ok: true, message: `${o.number} cancelled.` };
        },

        createPrebook: (input) => {
          const s = get();
          const floristOrgId = me().orgId;
          const { customer, importer } = importerFor(s, floristOrgId);
          const lines = input.lines.filter((l) => l.boxes > 0);
          if (!customer || !importer || !lines.length) return;
          const n = next("pb");
          const id = `pb_${n}`;
          set((st) => ({
            prebooks: [{ id, number: `PB-${n}`, wholesalerId: importer.id, floristOrgId, customerId: customer.id, createdAt: now(), neededBy: input.neededBy, note: input.note, weekly: input.weekly, status: "requested", lines }, ...st.prebooks],
          }));
          return id;
        },
        repeatPrebook: (prebookId) => {
          const pb = get().prebooks.find((x) => x.id === prebookId);
          if (!pb) return;
          const d = new Date(`${pb.neededBy}T12:00:00`);
          d.setDate(d.getDate() + 7);
          const soonest = new Date(Date.now() + 2 * 86400000);
          const neededBy = (d < soonest ? soonest : d).toISOString().slice(0, 10);
          const lines = pb.lines.map((l) => ({ species: l.species, color: l.color, lengthCm: l.lengthCm, productId: l.productId, boxType: l.boxType, boxes: l.boxes, targetCents: l.targetCents }));
          return get().createPrebook({ neededBy, note: pb.note, weekly: pb.weekly, lines });
        },
        confirmPrebook: (prebookId, answers, note) => {
          const s = get();
          const pb = s.prebooks.find((x) => x.id === prebookId);
          if (!pb || pb.status !== "requested") return { ok: false, message: "This prebook was already answered." };
          const lines = answers.map((l) => (l.confirmedBoxes ? l : { ...l, confirmedBoxes: 0 }));
          const used = lines.filter((l) => l.confirmedBoxes);
          if (!used.length) return { ok: false, message: "Confirm at least one box, or use Can't source." };
          for (const l of used) {
            if (!l.sourcedProductId) return { ok: false, message: `Pick the variety for ${l.species}.` };
            if (!l.priceCents) return { ok: false, message: `Set the price per stem for ${l.species}.` };
            if (l.source === "farm" && !l.farmId) return { ok: false, message: `Pick the farm for ${l.species}.` };
          }
          // Stock lines take boxes already in the Miami cooler that nobody has bought.
          const takeBoxes: Record<string, { ids: string[]; price: number }> = {};
          const taken = new Set<string>();
          for (const [i, l] of lines.entries()) {
            if (l.source !== "stock" || !l.confirmedBoxes) continue;
            const free = s.boxes.filter(
              (b) => b.status === "received" && !b.customerId && !taken.has(b.id) && b.productId === l.sourcedProductId && b.boxType === l.boxType && s.pos.find((p) => p.id === b.poId)?.wholesalerId === pb.wholesalerId,
            );
            if (free.length < l.confirmedBoxes) return { ok: false, message: `Only ${free.length} ${l.boxType} of that variety in stock.` };
            const ids = free.slice(0, l.confirmedBoxes).map((b) => b.id);
            ids.forEach((b) => taken.add(b));
            takeBoxes[i] = { ids, price: l.priceCents! };
          }
          // Farm lines become one purchase order per farm, already confirmed and with the florist on every line.
          const at = now();
          const ship = new Date(`${pb.neededBy}T12:00:00`);
          ship.setDate(ship.getDate() - 3);
          const tomorrow = new Date(Date.now() + 86400000);
          const shipDate = (ship < tomorrow ? tomorrow : ship).toISOString().slice(0, 10);
          const newPos: PurchaseOrder[] = [];
          const byFarm = new Map<string, number[]>();
          lines.forEach((l, i) => l.source === "farm" && l.confirmedBoxes && byFarm.set(l.farmId!, [...(byFarm.get(l.farmId!) ?? []), i]));
          const poOf: Record<number, string> = {};
          for (const [farmId, idx] of byFarm) {
            const n = next("po");
            const id = `po_${n}`;
            newPos.push({
              id, number: `PO-${n}`, wholesalerId: pb.wholesalerId, farmId, shipDate, status: "confirmed", createdAt: at, prebookId: pb.id,
              lines: idx.map((i) => {
                const l = lines[i];
                const p = s.products.find((x) => x.id === l.sourcedProductId)!;
                return { productId: p.id, boxType: l.boxType, boxes: l.confirmedBoxes!, stemsPerBox: stemsPerBox(p.species, l.boxType), pricePerStemCents: l.farmCents ?? 0, salePriceCents: l.priceCents, customerId: pb.customerId, confirmedBoxes: l.confirmedBoxes };
              }),
            });
            idx.forEach((i) => (poOf[i] = id));
          }
          const done = lines.map((l, i) => ({ ...l, poId: poOf[i], boxIds: takeBoxes[i]?.ids }));
          set((st) => ({
            pos: [...newPos, ...st.pos],
            boxes: st.boxes.map((b) => (taken.has(b.id) ? { ...b, customerId: pb.customerId, salePriceCents: Object.values(takeBoxes).find((t) => t.ids.includes(b.id))!.price } : b)),
            prebooks: st.prebooks.map((x) => (x.id === pb.id ? { ...x, lines: done, status: "confirmed", answeredAt: at, answerNote: note || undefined } : x)),
          }));
          const parts = [newPos.length ? `${newPos.map((p) => p.number).join(", ")} created` : "", taken.size ? `${taken.size} box${taken.size > 1 ? "es" : ""} from Miami stock set aside` : ""].filter(Boolean);
          return { ok: true, message: `${pb.number} confirmed. ${parts.join(" and ")}.` };
        },
        declinePrebook: (prebookId, note) =>
          set((st) => ({
            prebooks: st.prebooks.map((x) => (x.id === prebookId && x.status === "requested" ? { ...x, status: "declined", answeredAt: now(), answerNote: note || undefined, lines: x.lines.map((l) => ({ ...l, confirmedBoxes: 0 })) } : x)),
          })),
        addVendorFarm: (f) => {
          const n = next("org");
          const id = `org_farm${n}`;
          const org: Org = { id, name: f.name, kind: "farm", city: f.city, code: f.code.toUpperCase().slice(0, 6), origin: f.origin, modules: [], plan: "Farm (free)", billing: "trial", since: today() };
          set((st) => ({
            orgs: [...st.orgs, org],
            contacts: [...st.contacts, { id: `c_farm${n}`, ownerOrgId: me().orgId, kind: "farm", name: f.name, country: f.country, linkedOrgId: id, terms: "Net 15" }],
          }));
          return id;
        },

        floristScanBox: (code) => {
          const s = get();
          const orgId = me().orgId;
          const box = s.boxes.find((b) => b.code === code.trim().toUpperCase());
          const linked = s.contacts.filter((c) => c.linkedOrgId === orgId && c.kind === "customer").map((c) => c.id);
          if (!box || box.status !== "delivered" || !box.customerId || !linked.includes(box.customerId)) return { ok: false, message: `${code} is not on any delivery to your shop.` };
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
    { name: "stemhaul-demo-v8" },
  ),
);
