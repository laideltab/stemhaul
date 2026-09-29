// Tools the assistant can call. They run on the server and only ever read the AssistantData
// they are given, which already holds just what the signed-in account may see.

import type Anthropic from "@anthropic-ai/sdk";
import type { AssistantData, BoxRow, OrderRow, ShipmentRow } from "./scope";

type Tool = Anthropic.Beta.BetaTool;

const str = (desc: string) => ({ type: "string" as const, description: desc });

export const TOOLS: Tool[] = [
  {
    name: "find",
    description:
      "Search everything this account can see (shipments/AWBs, orders, boxes, invoices, bills) for a text: an AWB or house AWB number, PO/order/prebook/invoice number, box label code, farm, customer, flower or color. Use it first when the user mentions any number or name. Returns short matches.",
    input_schema: { type: "object", properties: { text: str("Text to look for, e.g. '729-4958', 'PO-1044', 'IT558465014', 'Freedom', 'La Esperanza'.") }, required: ["text"], additionalProperties: false },
  },
  {
    name: "list_shipments",
    description: "List master AWBs (air waybills) with airline, cargo agency, origin, flight date, status and house AWBs, plus box counts by status. Optional filter by status.",
    input_schema: {
      type: "object",
      properties: { status: { type: "string", enum: ["open", "closed", "arrived", "any"], description: "open = still loading at origin, closed = flown / in transit, arrived = all boxes scanned in Miami." } },
      additionalProperties: false,
    },
  },
  {
    name: "shipment_detail",
    description: "Everything about one master AWB or house AWB: flight, agency, houses, the orders on it, and every box with its status (labeled, in_transit, received, delivered, missing, damaged).",
    input_schema: { type: "object", properties: { awb: str("Master AWB or house AWB number, full or partial.") }, required: ["awb"], additionalProperties: false },
  },
  {
    name: "order_detail",
    description: "One purchase order, map (marketplace) order or prebook by number, with lines, status, dates, AWB and the status of its boxes.",
    input_schema: { type: "object", properties: { number: str("Order number, e.g. PO-1044, MK-10481, PB-2042.") }, required: ["number"], additionalProperties: false },
  },
  {
    name: "list_orders",
    description: "List orders (purchase orders, map orders, prebooks) this account can see, newest first. Optional filters.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["Purchase order", "Map order", "Prebook", "any"] },
        status: str("Optional status, e.g. pending, requested, confirmed, labeled, shipped, received."),
      },
      additionalProperties: false,
    },
  },
  {
    name: "box_history",
    description: "The story of one box by its label code: ordered, confirmed, labeled, flown, scanned in Miami, delivered, received at the florist, or flagged missing/damaged. Use for 'what happened with this box/load'.",
    input_schema: { type: "object", properties: { code: str("Box label barcode, e.g. IT558465014.") }, required: ["code"], additionalProperties: false },
  },
  {
    name: "money",
    description: "Invoices, bills and payments this account can see: invoices to customers, bills to pay, payments a farm is owed, invoices a florist owes. Filter by status and/or party name.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "overdue", "partial", "paid", "unpaid", "any"], description: "unpaid = open, partial or overdue." },
        party: str("Optional customer, vendor or importer name."),
        number: str("Optional invoice or reference number."),
      },
      additionalProperties: false,
    },
  },
  {
    name: "flight_status",
    description: "Flight status for a master AWB: departed or not, expected arrival in Miami. In this demo it is simulated from the AWB status and flight date.",
    input_schema: { type: "object", properties: { awb: str("Master AWB or house AWB number.") }, required: ["awb"], additionalProperties: false },
  },
  {
    name: "stock",
    description: "Stems in stock at the florist shop, by product.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[\s-]/g, "");
const has = (hay: (string | undefined)[], needle: string) => hay.some((h) => h && norm(h).includes(needle));

function boxCounts(boxes: BoxRow[]) {
  const c: Record<string, number> = {};
  for (const b of boxes) c[b.status] = (c[b.status] ?? 0) + 1;
  return c;
}

function findShipment(d: AssistantData, q: string): ShipmentRow | undefined {
  const n = norm(q);
  return d.shipments.find((s) => norm(s.awb) === n) ?? d.shipments.find((s) => norm(s.awb).includes(n) || s.houses.some((h) => norm(h).includes(n)));
}

function findOrder(d: AssistantData, q: string): OrderRow | undefined {
  const n = norm(q);
  return d.orders.find((o) => norm(o.number) === n) ?? d.orders.find((o) => norm(o.number).endsWith(n));
}

const cap = <T,>(xs: T[], n = 40) => (xs.length > n ? { total: xs.length, showing: n, items: xs.slice(0, n) } : { total: xs.length, items: xs });

function flight(s: ShipmentRow, today: string) {
  // Simulated, deterministic flight number from the AWB.
  const code = s.airline.startsWith("Avianca") ? "AV" : "LA";
  const flightNo = `${code} ${1500 + (parseInt(s.awb.replace(/\D/g, "").slice(-3), 10) % 400)}`;
  const route = `${s.origin} → MIA`;
  if (s.status === "open")
    return { flight: flightNo, route, scheduled: s.flightDate, state: s.flightDate < today ? "Not closed yet (flight date passed; boxes still being loaded)" : "Scheduled, not departed" };
  if (s.status === "arrived") return { flight: flightNo, route, departed: s.flightDate, state: "Landed in Miami; all boxes scanned at the warehouse" };
  if (s.flightDate > today) return { flight: flightNo, route, scheduled: s.flightDate, state: "Closed and booked, waiting to depart" };
  return { flight: flightNo, route, departed: s.flightDate, state: "Departed; landed or in customs in Miami, boxes not all scanned yet" };
}

function history(d: AssistantData, b: BoxRow) {
  const o = d.orders.find((x) => x.number === b.po);
  const s = d.shipments.find((x) => x.awb === b.awb);
  const ev: { when: string; what: string }[] = [];
  if (o) ev.push({ when: o.createdAt.slice(0, 10), what: `${o.number} created${o.farm ? ` with ${o.farm}` : ""}` });
  if (o?.dispatchedAt) ev.push({ when: o.dispatchedAt.slice(0, 10), what: `Farm handed the boxes to the cargo agency${o.farmInvoice ? `, farm invoice ${o.farmInvoice}` : ""}` });
  if (s) ev.push({ when: s.flightDate, what: `On master AWB ${s.awb} (${s.airline}, ${s.agency}), house ${b.hawb ?? "-"}; AWB status ${s.status}` });
  if (b.receivedAt) ev.push({ when: b.receivedAt, what: "Scanned in at the Miami warehouse" });
  if (b.status === "missing") ev.push({ when: "", what: "Flagged MISSING at Miami receiving (did not arrive with the AWB)" });
  if (b.status === "damaged") ev.push({ when: "", what: "Flagged DAMAGED at Miami receiving" });
  if (b.deliveredAt) ev.push({ when: b.deliveredAt, what: `Delivered to the customer${b.invoice ? ` on invoice ${b.invoice}` : ""}` });
  else if (b.invoice) ev.push({ when: "", what: `Delivered to the customer on invoice ${b.invoice}` });
  if (b.floristReceivedAt) ev.push({ when: b.floristReceivedAt, what: "Scanned in at the florist shop" });
  return { box: b, currentStatus: b.status, events: ev };
}

export function runTool(d: AssistantData, name: string, input: Record<string, unknown>): unknown {
  const s = (k: string) => (typeof input[k] === "string" ? (input[k] as string).trim() : "");
  switch (name) {
    case "find": {
      const n = norm(s("text"));
      if (n.length < 2) return { error: "Give at least 2 characters." };
      return {
        shipments: d.shipments.filter((x) => has([x.awb, x.airline, x.agency, x.origin, ...x.houses], n)).slice(0, 10),
        orders: d.orders.filter((x) => has([x.number, x.farm, x.customer, x.awb, x.hawb, ...x.lines], n)).slice(0, 10)
          .map((o) => ({ type: o.type, number: o.number, status: o.status, farm: o.farm, customer: o.customer, shipDate: o.shipDate, link: o.link })),
        boxes: cap(d.boxes.filter((x) => has([x.code, x.product, x.po, x.farm, x.customer, x.awb, x.hawb, x.invoice], n)), 25),
        money: d.money.filter((x) => has([x.number, x.party], n)).slice(0, 10)
          .map((m) => ({ kind: m.kind, number: m.number, party: m.party, balance: m.balance, status: m.status, link: m.link })),
      };
    }
    case "list_shipments": {
      const st = s("status");
      const rows = d.shipments.filter((x) => !st || st === "any" || x.status === st);
      return cap(rows.map((x) => ({ ...x, boxes: boxCounts(d.boxes.filter((b) => b.awb === x.awb)) })));
    }
    case "shipment_detail": {
      const sh = findShipment(d, s("awb"));
      if (!sh) return { error: `No AWB matching "${s("awb")}" that this account can see.` };
      const bx = d.boxes.filter((b) => b.awb === sh.awb);
      const ords = d.orders.filter((o) => o.awb === sh.awb).map((o) => ({ type: o.type, number: o.number, status: o.status, farm: o.farm, customer: o.customer, link: o.link }));
      return { shipment: sh, flight: flight(sh, d.viewer.today), orders: ords, boxCounts: boxCounts(bx), boxes: cap(bx, 60) };
    }
    case "order_detail": {
      const o = findOrder(d, s("number"));
      if (!o) return { error: `No order numbered "${s("number")}" that this account can see.` };
      const bx = d.boxes.filter((b) => b.po === o.number || (o.awb && b.hawb === o.hawb && o.type !== "Purchase order"));
      return { order: o, boxCounts: boxCounts(bx), boxes: cap(bx, 40) };
    }
    case "list_orders": {
      const t = s("type");
      const st = s("status").toLowerCase();
      const rows = d.orders
        .filter((o) => (!t || t === "any" || o.type === t) && (!st || o.status === st))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((o) => ({ type: o.type, number: o.number, status: o.status, farm: o.farm, customer: o.customer, shipDate: o.shipDate, neededBy: o.neededBy, awb: o.awb, link: o.link }));
      return cap(rows);
    }
    case "box_history": {
      const n = norm(s("code"));
      const b = d.boxes.find((x) => norm(x.code) === n) ?? d.boxes.find((x) => norm(x.code).includes(n));
      if (!b) return { error: `No box labeled "${s("code")}" that this account can see.` };
      return history(d, b);
    }
    case "money": {
      const st = s("status");
      const party = norm(s("party"));
      const num = norm(s("number"));
      const rows = d.money.filter(
        (m) =>
          (!st || st === "any" || (st === "unpaid" ? m.status !== "paid" : m.status === st)) &&
          (!party || norm(m.party).includes(party)) &&
          (!num || norm(m.number).includes(num)),
      );
      return cap(rows, 30);
    }
    case "flight_status": {
      const sh = findShipment(d, s("awb"));
      if (!sh) return { error: `No AWB matching "${s("awb")}" that this account can see.` };
      return { awb: sh.awb, airline: sh.airline, simulated: true, ...flight(sh, d.viewer.today) };
    }
    case "stock":
      return d.stock.length ? d.stock.sort((a, b) => b.stems - a.stems) : { note: "This account has no florist stock." };
    default:
      return { error: `Unknown tool ${name}` };
  }
}
