// What the assistant may see for the signed-in account, built in the browser from the demo data.
// Only records this org can already see on its own screens go in, with the fields it may see:
// a farm never gets sale prices or customer names, a florist never gets farm cost or importer margin.
// In production this filtering is done by the database (row level security), not by the client.

import type { Data } from "../seed";
import type { Box, Org, POLine, PurchaseOrder } from "../types";
import { money, perStem } from "../format";

export interface Viewer {
  org: string;
  kind: "wholesaler" | "florist" | "farm" | "wholesaler+florist";
  user: string;
  role: string;
  today: string;
}

export interface ShipmentRow {
  awb: string;
  airline: string;
  agency: string;
  origin: string;
  flightDate: string;
  /** open: still loading, closed: flown, arrived: every box scanned in Miami. */
  status: string;
  houses: string[];
  link?: string;
}

export interface OrderRow {
  type: "Purchase order" | "Map order" | "Prebook";
  number: string;
  status: string;
  farm?: string;
  customer?: string;
  createdAt: string;
  shipDate?: string;
  neededBy?: string;
  confirmedAt?: string;
  dispatchedAt?: string;
  farmInvoice?: string;
  awb?: string;
  hawb?: string;
  lines: string[];
  note?: string;
  link?: string;
}

export interface BoxRow {
  code: string;
  product: string;
  boxType: string;
  stems: number;
  status: string;
  po: string;
  farm: string;
  customer?: string;
  awb?: string;
  hawb?: string;
  flightDate?: string;
  invoice?: string;
  receivedAt?: string;
  deliveredAt?: string;
  floristReceivedAt?: string;
  price?: string;
  link?: string;
}

export interface MoneyRow {
  kind: "Invoice to customer" | "Bill to pay" | "Payment due from importer" | "Invoice from importer";
  number: string;
  party: string;
  date: string;
  dueDate: string;
  total: string;
  paid: string;
  balance: string;
  status: "paid" | "partial" | "open" | "overdue";
  payments: string[];
  lines?: string[];
  link?: string;
}

export interface AssistantData {
  viewer: Viewer;
  shipments: ShipmentRow[];
  orders: OrderRow[];
  boxes: BoxRow[];
  money: MoneyRow[];
  stock: { product: string; stems: number }[];
}

type D = Pick<Data, "orgs" | "users" | "products" | "contacts" | "pos" | "boxes" | "awbs" | "invoices" | "bills" | "marketOrders" | "prebooks" | "movements">;

export function buildAssistantData(d: D, orgId: string, userId: string): AssistantData | null {
  const org = d.orgs.find((o) => o.id === orgId);
  if (!org) return null;
  const user = d.users.find((u) => u.id === userId);
  const today = new Date().toISOString().slice(0, 10);
  const isWholesale = org.kind === "wholesaler";
  const isFarm = org.kind === "farm";
  const isFlorist = org.modules.includes("florist");

  const pname = (id?: string) => {
    const p = d.products.find((x) => x.id === id);
    return p ? `${p.species} ${p.variety} ${p.color} ${p.lengthCm}cm` : "Unknown product";
  };
  const orgName = (id?: string) => d.orgs.find((o) => o.id === id)?.name ?? "";
  const contact = (id?: string) => d.contacts.find((c) => c.id === id);
  const awbOf = (id?: string) => d.awbs.find((a) => a.id === id);
  const agencyName = (id?: string) => contact(id)?.name ?? "Direct with airline";
  const status = (total: number, paid: number, due: string): MoneyRow["status"] =>
    paid >= total ? "paid" : due < today ? "overdue" : paid > 0 ? "partial" : "open";
  const pays = (ps: { date: string; amountCents: number; method: string; reference: string }[] = []) =>
    ps.map((p) => `${p.date} ${money(p.amountCents)} by ${p.method}${p.reference ? ` (${p.reference})` : ""}`);

  // Florist accounts are customers of one or more importers.
  const myCustomerIds = new Set(d.contacts.filter((c) => c.kind === "customer" && c.linkedOrgId === orgId).map((c) => c.id));

  const shipments = new Map<string, ShipmentRow>();
  const addShipment = (awbId: string | undefined, hawb: string | undefined, link?: string) => {
    const a = awbOf(awbId);
    if (!a) return;
    const row = shipments.get(a.id) ?? {
      awb: a.number, airline: a.airline, agency: agencyName(a.agencyId), origin: a.origin, flightDate: a.flightDate, status: a.status, houses: [], link,
    };
    if (hawb && !row.houses.includes(hawb)) row.houses.push(hawb);
    shipments.set(a.id, row);
  };

  const orders: OrderRow[] = [];
  const boxes: BoxRow[] = [];
  const moneyRows: MoneyRow[] = [];

  const lineText = (l: POLine, withPrice: "cost" | "none") =>
    `${l.confirmedBoxes ?? l.boxes}${l.confirmedBoxes !== undefined && l.confirmedBoxes !== l.boxes ? ` of ${l.boxes} requested` : ""} ${l.boxType} ${pname(l.productId)} (${l.stemsPerBox} stems/box)` +
    (withPrice === "cost" ? ` at ${perStem(l.pricePerStemCents)}/stem` : "");

  const boxRow = (b: Box, po: PurchaseOrder | undefined, view: "wholesale" | "farm" | "florist", link?: string): BoxRow => {
    const a = awbOf(b.awbId);
    const cust = contact(b.customerId);
    return {
      code: b.code, product: pname(b.productId), boxType: b.boxType, stems: b.stems, status: b.status,
      po: po?.number ?? "", farm: orgName(po?.farmId),
      customer: view === "farm" ? cust?.code : view === "wholesale" ? cust?.name ?? "Warehouse stock" : undefined,
      awb: a?.number, hawb: b.hawb, flightDate: a?.flightDate,
      invoice: view === "farm" ? undefined : d.invoices.find((i) => i.id === b.invoiceId)?.number,
      receivedAt: view === "florist" ? undefined : b.receivedAt,
      deliveredAt: b.deliveredAt, floristReceivedAt: view === "farm" ? undefined : b.floristReceivedAt,
      price: view === "wholesale" ? `cost ${perStem(b.costPerStemCents)}/stem${b.salePriceCents ? `, sold at ${perStem(b.salePriceCents)}/stem` : ""}` : undefined,
      link,
    };
  };

  if (isWholesale) {
    for (const po of d.pos.filter((p) => p.wholesalerId === orgId)) {
      const l0 = po.lines.find((l) => l.awbId);
      orders.push({
        type: "Purchase order", number: po.number, status: po.status, farm: orgName(po.farmId),
        customer: [...new Set(po.lines.map((l) => contact(l.customerId)?.name ?? "Warehouse stock"))].join(", "),
        createdAt: po.createdAt, shipDate: po.shipDate, dispatchedAt: po.dispatchedAt, farmInvoice: po.farmInvoice,
        awb: awbOf(l0?.awbId)?.number, hawb: l0?.hawb, lines: po.lines.map((l) => `${lineText(l, "cost")} for ${contact(l.customerId)?.name ?? "stock"}`),
        link: `/w/purchase-orders/${po.id}`,
      });
      for (const l of po.lines) addShipment(l.awbId, l.hawb, "/w/freight");
    }
    for (const b of d.boxes) {
      const po = d.pos.find((p) => p.id === b.poId);
      if (po?.wholesalerId === orgId) boxes.push(boxRow(b, po, "wholesale", "/w/receiving"));
    }
    for (const m of d.marketOrders.filter((o) => o.wholesalerId === orgId)) {
      orders.push({
        type: "Map order", number: m.number, status: m.status, farm: orgName(m.farmId), customer: orgName(m.floristOrgId),
        createdAt: m.createdAt, shipDate: m.shipDate, confirmedAt: m.confirmedAt,
        lines: m.lines.map((l) => `${l.confirmedBoxes ?? l.boxes} ${l.boxType} ${pname(l.productId)}, farm ${perStem(l.farmPriceCents)} / sale ${perStem(l.salePriceCents)} per stem`),
        note: m.poId ? `Became ${d.pos.find((p) => p.id === m.poId)?.number}` : undefined, link: "/w/marketplace",
      });
    }
    for (const p of d.prebooks.filter((x) => x.wholesalerId === orgId)) {
      orders.push({
        type: "Prebook", number: p.number, status: p.status, customer: orgName(p.floristOrgId), createdAt: p.createdAt, neededBy: p.neededBy,
        confirmedAt: p.answeredAt, note: [p.note, p.answerNote].filter(Boolean).join(" · ") || undefined,
        lines: p.lines.map((l) => `${l.confirmedBoxes ?? l.boxes} ${l.boxType} ${l.sourcedProductId ? pname(l.sourcedProductId) : [l.species, l.color, l.lengthCm && `${l.lengthCm}cm`].filter(Boolean).join(" ")}` +
          (l.source ? ` from ${l.source === "stock" ? "Miami stock" : orgName(l.farmId)}` : "") + (l.priceCents ? ` at ${perStem(l.priceCents)}/stem` : "")),
        link: "/w/prebooks",
      });
    }
    for (const i of d.invoices.filter((x) => x.wholesalerId === orgId)) {
      moneyRows.push({
        kind: "Invoice to customer", number: i.number, party: contact(i.customerId)?.name ?? "", date: i.date, dueDate: i.dueDate,
        total: money(i.totalCents), paid: money(i.paidCents), balance: money(i.totalCents - i.paidCents), status: status(i.totalCents, i.paidCents, i.dueDate),
        payments: pays(i.payments), lines: i.lines.map((l) => `${l.description}, ${l.stems} stems at ${perStem(l.pricePerStemCents)}`), link: `/w/invoices/${i.id}`,
      });
    }
    for (const b of d.bills.filter((x) => x.ownerOrgId === orgId)) {
      moneyRows.push({
        kind: "Bill to pay", number: b.reference, party: b.vendor, date: b.date, dueDate: b.dueDate,
        total: money(b.totalCents), paid: money(b.paidCents), balance: money(b.totalCents - b.paidCents), status: status(b.totalCents, b.paidCents, b.dueDate),
        payments: pays(b.payments), link: "/w/accounts",
      });
    }
  }

  if (isFarm) {
    for (const po of d.pos.filter((p) => p.farmId === orgId && p.status !== "draft")) {
      const l0 = po.lines.find((l) => l.awbId);
      orders.push({
        type: "Purchase order", number: po.number, status: po.status, customer: orgName(po.wholesalerId),
        createdAt: po.createdAt, shipDate: po.shipDate, dispatchedAt: po.dispatchedAt, farmInvoice: po.farmInvoice,
        awb: awbOf(l0?.awbId)?.number, hawb: l0?.hawb,
        lines: po.lines.map((l) => `${lineText(l, "cost")}${contact(l.customerId)?.code ? `, mark ${contact(l.customerId)!.code}` : ""}`),
        link: `/farm/labels/${po.id}`,
      });
      for (const l of po.lines) addShipment(l.awbId, l.hawb);
      for (const b of d.boxes.filter((x) => x.poId === po.id)) boxes.push(boxRow(b, po, "farm", `/farm/labels/${po.id}`));
      // What the importer owes the farm for this PO.
      const bill = d.bills.find((b) => b.vendor === org.name && b.reference.includes(po.number));
      if (bill) {
        moneyRows.push({
          kind: "Payment due from importer", number: po.farmInvoice ?? po.number, party: orgName(po.wholesalerId), date: bill.date, dueDate: bill.dueDate,
          total: money(bill.totalCents), paid: money(bill.paidCents), balance: money(bill.totalCents - bill.paidCents), status: status(bill.totalCents, bill.paidCents, bill.dueDate),
          payments: pays(bill.payments),
        });
      }
    }
    for (const m of d.marketOrders.filter((o) => o.farmId === orgId)) {
      orders.push({
        type: "Map order", number: m.number, status: m.status, customer: `${orgName(m.wholesalerId)} (for one of its florists)`,
        createdAt: m.createdAt, shipDate: m.shipDate, confirmedAt: m.confirmedAt,
        lines: m.lines.map((l) => `${l.confirmedBoxes ?? l.boxes} ${l.boxType} ${pname(l.productId)} at ${perStem(l.farmPriceCents)}/stem`),
        note: m.status === "pending" ? `Confirm by ${m.confirmBy}` : m.poId ? `Became ${d.pos.find((p) => p.id === m.poId)?.number}` : undefined,
        link: "/farm/map-orders",
      });
    }
  }

  if (isFlorist) {
    for (const b of d.boxes.filter((x) => x.customerId && myCustomerIds.has(x.customerId))) {
      const po = d.pos.find((p) => p.id === b.poId);
      boxes.push(boxRow(b, po, "florist", "/f/receive"));
      addShipment(b.awbId, b.hawb);
    }
    for (const m of d.marketOrders.filter((o) => o.floristOrgId === orgId)) {
      const po = d.pos.find((p) => p.id === m.poId);
      const l0 = po?.lines.find((l) => l.awbId);
      orders.push({
        type: "Map order", number: m.number, status: m.status, farm: orgName(m.farmId), createdAt: m.createdAt, shipDate: m.shipDate,
        confirmedAt: m.confirmedAt, awb: awbOf(l0?.awbId)?.number, hawb: l0?.hawb,
        lines: m.lines.map((l) => `${l.confirmedBoxes ?? l.boxes}${l.confirmedBoxes !== undefined && l.confirmedBoxes !== l.boxes ? ` of ${l.boxes} ordered` : ""} ${l.boxType} ${pname(l.productId)} at ${perStem(l.salePriceCents)}/stem delivered`),
        note: m.status === "pending" ? `Farm must confirm by ${m.confirmBy}` : undefined, link: `/f/market/orders/${m.id}`,
      });
    }
    for (const p of d.prebooks.filter((x) => x.floristOrgId === orgId)) {
      orders.push({
        type: "Prebook", number: p.number, status: p.status, customer: orgName(p.wholesalerId), createdAt: p.createdAt, neededBy: p.neededBy,
        confirmedAt: p.answeredAt, note: [p.note, p.answerNote].filter(Boolean).join(" · ") || undefined,
        lines: p.lines.map((l) => `${l.confirmedBoxes ?? l.boxes} ${l.boxType} ${l.sourcedProductId ? pname(l.sourcedProductId) : [l.species, l.color, l.lengthCm && `${l.lengthCm}cm`].filter(Boolean).join(" ")}` +
          (l.priceCents ? ` at ${perStem(l.priceCents)}/stem` : "")),
        link: "/f/prebooks",
      });
    }
    for (const i of d.invoices.filter((x) => myCustomerIds.has(x.customerId))) {
      moneyRows.push({
        kind: "Invoice from importer", number: i.number, party: orgName(i.wholesalerId), date: i.date, dueDate: i.dueDate,
        total: money(i.totalCents), paid: money(i.paidCents), balance: money(i.totalCents - i.paidCents), status: status(i.totalCents, i.paidCents, i.dueDate),
        payments: pays(i.payments), lines: i.lines.map((l) => `${l.description}, ${l.stems} stems at ${perStem(l.pricePerStemCents)}`),
      });
    }
  }

  const stock: AssistantData["stock"] = [];
  if (isFlorist) {
    const by: Record<string, number> = {};
    for (const m of d.movements) if (m.orgId === orgId) by[m.productId] = (by[m.productId] ?? 0) + m.stems;
    for (const [pid, stems] of Object.entries(by)) if (stems > 0) stock.push({ product: pname(pid), stems });
  }

  return {
    viewer: {
      org: org.name, kind: kindOf(org), user: user?.name ?? "", role: user?.role ?? "", today,
    },
    shipments: [...shipments.values()], orders, boxes, money: moneyRows, stock,
  };
}

const kindOf = (o: Org): Viewer["kind"] =>
  o.kind === "farm" ? "farm" : o.kind === "florist" ? "florist" : o.modules.includes("florist") ? "wholesaler+florist" : "wholesaler";
