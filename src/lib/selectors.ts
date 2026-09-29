import type { Data } from "./seed";
import type { Product, Shift } from "./types";

export function stockByProduct(d: Pick<Data, "movements">, orgId: string) {
  const out: Record<string, number> = {};
  for (const m of d.movements) if (m.orgId === orgId) out[m.productId] = (out[m.productId] ?? 0) + m.stems;
  return out;
}

export const productName = (p: Product | undefined) => (p ? `${p.species} ${p.variety} ${p.lengthCm}cm` : "—");

export function shiftTotals(d: Pick<Data, "sales">, shift: Shift) {
  const sales = d.sales.filter((s) => s.shiftId === shift.id && !s.voided);
  const by = { cash: 0, card: 0, account: 0 };
  for (const s of sales) by[s.payment] += s.totalCents;
  const expectedCash = shift.openingFloatCents + by.cash;
  const diff = shift.countedCashCents === undefined ? undefined : shift.countedCashCents - expectedCash;
  return { count: sales.length, ...by, total: by.cash + by.card + by.account, expectedCash, diff };
}
