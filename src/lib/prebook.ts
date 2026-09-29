import type { Data } from "./seed";
import type { Box, Prebook, PrebookLine, Product } from "./types";

type D = Pick<Data, "products" | "pos" | "boxes" | "orgs" | "users" | "contacts" | "listings">;

/** "Rose · Red · 50 cm", with "any" for what the florist left open. */
export function askLabel(l: PrebookLine, products?: Product[]) {
  const p = l.productId ? products?.find((x) => x.id === l.productId) : undefined;
  if (p) return `${p.species} ${p.variety} · ${p.color} · ${p.lengthCm} cm`;
  return [l.species, l.color || "any color", l.lengthCm ? `${l.lengthCm} cm` : "any length"].join(" · ");
}

/** Varieties that fit what the florist asked, closest first. */
export function matchingProducts(products: Product[], l: PrebookLine) {
  const color = l.color?.toLowerCase();
  const score = (p: Product) =>
    (p.id === l.productId ? 8 : 0) + (color && p.color.toLowerCase().includes(color) ? 4 : 0) + (l.lengthCm && p.lengthCm === l.lengthCm ? 2 : 0);
  return products.filter((p) => p.species === l.species).sort((a, b) => score(b) - score(a));
}

/** Boxes the importer has received in Miami that nobody has bought yet. */
export function freeStock(d: D, wholesalerId: string): Box[] {
  return d.boxes.filter((b) => b.status === "received" && !b.customerId && d.pos.find((p) => p.id === b.poId)?.wholesalerId === wholesalerId);
}

export const stockCount = (stock: Box[], productId: string, boxType: string) => stock.filter((b) => b.productId === productId && b.boxType === boxType).length;

/** The importer's farms: its farm contacts, flagged when the farm uses the Stem Haul portal. */
export function farmsOf(d: D, wholesalerId: string) {
  return d.contacts
    .filter((c) => c.ownerOrgId === wholesalerId && c.kind === "farm" && c.linkedOrgId)
    .map((c) => {
      const org = d.orgs.find((o) => o.id === c.linkedOrgId)!;
      return { org, onPortal: d.users.some((u) => u.orgId === org.id && u.active) };
    })
    .sort((a, b) => a.org.name.localeCompare(b.org.name));
}

export function prebookTotals(pb: Prebook, stems: (l: PrebookLine) => number) {
  const asked = pb.lines.reduce((a, l) => a + l.boxes, 0);
  const confirmed = pb.lines.reduce((a, l) => a + (l.confirmedBoxes ?? 0), 0);
  const cents = pb.lines.reduce((a, l) => a + (l.confirmedBoxes ?? 0) * stems(l) * (l.priceCents ?? 0), 0);
  return { asked, confirmed, cents };
}

/** Where a confirmed line is now, in the florist's words. */
export function lineStage(d: D, l: PrebookLine): { label: string; tone: "brand" | "good" | "warn" | "bad" | "neutral" } {
  if (l.confirmedBoxes === 0) return { label: "Not available", tone: "bad" };
  if (l.confirmedBoxes === undefined) return { label: "Waiting for an answer", tone: "warn" };
  if (l.source === "stock") {
    const boxes = d.boxes.filter((b) => l.boxIds?.includes(b.id));
    return boxes.length && boxes.every((b) => b.status === "delivered") ? { label: "Delivered", tone: "good" } : { label: "In Miami, set aside for you", tone: "brand" };
  }
  const po = d.pos.find((p) => p.id === l.poId);
  const boxes = d.boxes.filter((b) => b.poId === po?.id && b.productId === l.sourcedProductId);
  if (boxes.length && boxes.every((b) => b.status === "delivered")) return { label: "Delivered", tone: "good" };
  switch (po?.status) {
    case "received": return { label: "Arrived in Miami", tone: "brand" };
    case "shipped": return { label: "Flying to Miami", tone: "brand" };
    case "booked":
    case "labeled": return { label: "Packed, on the AWB", tone: "brand" };
    default: return { label: "Farm is cutting", tone: "brand" };
  }
}
