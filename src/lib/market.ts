import type { Data } from "./seed";
import type { Listing, MarketLine, MarketOrder, Org, PurchaseOrder } from "./types";

type D = Pick<Data, "contacts" | "orgs" | "mapFarms" | "listings" | "pos" | "boxes" | "awbs">;

/** Rounded to the cent. The markup already covers freight, customs and delivery. */
export const salePrice = (farmPriceCents: number, markupPct: number) => Math.round(farmPriceCents * (1 + markupPct / 100));

/** The importer whose map a florist shops on, and the florist's customer record there. */
export function importerFor(d: D, floristOrgId: string) {
  const customer = d.contacts.find((c) => c.kind === "customer" && c.linkedOrgId === floristOrgId);
  const importer = customer ? d.orgs.find((o) => o.id === customer.ownerOrgId) : undefined;
  return { customer, importer };
}

export interface MapFarmView {
  farm: Org;
  markupPct: number;
  listings: (Listing & { saleCents: number })[];
  fromCents: number;
  species: string[];
  stockBoxes: number;
}

/** Farms an importer shows on its map, with delivered prices. */
export function mapFarmsFor(d: D & Pick<Data, "products">, wholesalerId: string): MapFarmView[] {
  return d.mapFarms
    .filter((m) => m.wholesalerId === wholesalerId && m.enabled)
    .map((m) => {
      const farm = d.orgs.find((o) => o.id === m.farmId)!;
      const listings = d.listings
        .filter((l) => l.farmId === m.farmId && l.listed && l.stockBoxes > 0)
        .map((l) => ({ ...l, saleCents: salePrice(l.farmPriceCents, m.markupPct) }));
      const species = [...new Set(listings.map((l) => d.products.find((p) => p.id === l.productId)!.species))];
      return {
        farm, markupPct: m.markupPct, listings, species,
        fromCents: Math.min(...listings.map((l) => l.saleCents)),
        stockBoxes: listings.reduce((a, l) => a + l.stockBoxes, 0),
      };
    })
    .filter((f) => f.listings.length);
}

export const lineBoxes = (l: MarketLine, confirmed = false) => (confirmed ? l.confirmedBoxes ?? l.boxes : l.boxes);
export function orderTotals(o: Pick<MarketOrder, "lines" | "status">, which: "sale" | "farm", useConfirmed = o.status === "confirmed") {
  let boxes = 0;
  let stems = 0;
  let cents = 0;
  for (const l of o.lines) {
    const n = lineBoxes(l, useConfirmed);
    boxes += n;
    stems += n * l.stemsPerBox;
    cents += n * l.stemsPerBox * (which === "sale" ? l.salePriceCents : l.farmPriceCents);
  }
  return { boxes, stems, cents };
}

/** "7 HB" or "3 HB + 2 QB". */
export function boxSummary(lines: { boxType: string; boxes: number }[]) {
  const by: Record<string, number> = {};
  for (const l of lines) if (l.boxes) by[l.boxType] = (by[l.boxType] ?? 0) + l.boxes;
  return Object.entries(by).map(([t, n]) => `${n} ${t}`).join(" + ") || "0 boxes";
}

export function timeLeft(confirmBy: string, now: number) {
  const mins = Math.round((new Date(confirmBy).getTime() - now) / 60000);
  if (mins <= 0) return { late: true, label: "past the confirm time" };
  const h = Math.floor(mins / 60);
  return { late: false, label: h ? `${h} h ${mins % 60} min` : `${mins} min` };
}

export type Stage = { label: string; done: boolean; sub?: string };
/** Where a marketplace order's boxes are, from the PO and box records the importer keeps. */
export function orderStages(d: D, o: MarketOrder): Stage[] {
  const po: PurchaseOrder | undefined = d.pos.find((p) => p.id === o.poId);
  const boxes = po ? d.boxes.filter((b) => b.poId === po.id) : [];
  const awb = d.awbs.find((a) => a.id === po?.lines.find((l) => l.awbId)?.awbId);
  const confirmed = o.status === "confirmed";
  const flown = !!awb && awb.status !== "open";
  const inMiami = boxes.length > 0 && boxes.every((b) => ["received", "delivered", "damaged", "missing"].includes(b.status));
  const delivered = boxes.length > 0 && boxes.every((b) => b.status === "delivered");
  const origin = d.orgs.find((x) => x.id === o.farmId)?.origin;
  return [
    { label: "Order sent", done: true },
    { label: "Farm confirmed", done: confirmed },
    { label: "Labels printed", done: boxes.length > 0 },
    { label: "On the plane", done: flown, sub: awb ? `${origin} → MIA · AWB ${awb.number}` : `${origin} → MIA` },
    { label: "At your importer", done: inMiami, sub: "after customs" },
    { label: "At your shop", done: delivered, sub: o.delivery === "pickup" ? "you pick up" : "delivered" },
  ];
}
