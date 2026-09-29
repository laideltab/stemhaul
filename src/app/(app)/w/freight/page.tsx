"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { date, money } from "@/lib/format";
import { fbe, productName } from "@/lib/selectors";
import { Button, Card, Empty, LinkButton, PageHeader, Status, Table } from "@/components/ui";
import { POTabs } from "@/components/po-tabs";

export default function AWBSummary() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const [open, setOpen] = useState<string | null>(null);
  const myPos = s.pos.filter((p) => p.wholesalerId === orgId);
  const awbs = s.awbs
    .filter((a) => myPos.some((p) => p.lines.some((l) => l.awbId === a.id)))
    .sort((a, b) => b.flightDate.localeCompare(a.flightDate));

  return (
    <>
      <PageHeader
        title="AWB Summary"
        sub="Every master AWB, how full it is and whether its labels are printed. Close an AWB when it flies; its boxes then show up in Scan Receiving."
        actions={<LinkButton href="/w/freight/add"><Plus size={16} /> Create new AWB shipment</LinkButton>}
      />
      <POTabs />
      <Card>
        <Table>
          <thead><tr><th /><th>AWB</th><th>Origin</th><th>Ship date</th><th>Booked via</th><th className="num">Quantity</th><th className="num">FBE</th><th>Status</th><th className="num">Printed</th><th className="num">Not printed</th><th /></tr></thead>
          <tbody>
            {awbs.map((a) => {
              const lines = myPos.flatMap((p) => p.lines.map((l, i) => ({ p, l, i }))).filter(({ l }) => l.awbId === a.id);
              const qty = lines.reduce((x, { l }) => x + (l.confirmedBoxes ?? 0), 0);
              const f = lines.reduce((x, { l }) => x + fbe(l.boxType, l.confirmedBoxes ?? 0), 0);
              const printed = s.boxes.filter((b) => b.awbId === a.id).length;
              const isOpen = open === a.id;
              // Liquidation: farm cost per customer on this AWB.
              const byCustomer = new Map<string, { boxes: number; fbe: number; cost: number }>();
              for (const { l } of lines) {
                const k = l.customerId ?? "stock";
                const cur = byCustomer.get(k) ?? { boxes: 0, fbe: 0, cost: 0 };
                const n = l.confirmedBoxes ?? 0;
                byCustomer.set(k, { boxes: cur.boxes + n, fbe: cur.fbe + fbe(l.boxType, n), cost: cur.cost + n * l.stemsPerBox * l.pricePerStemCents });
              }
              return (
                <Fragment key={a.id}>
                  <tr className="cursor-pointer hover:bg-surface-2" onClick={() => setOpen(isOpen ? null : a.id)}>
                    <td className="w-6 text-muted">{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                    <td className="font-mono text-xs font-medium text-brand">{a.number}</td>
                    <td className="font-mono text-xs">{a.origin}</td>
                    <td>{date(a.flightDate)}</td>
                    <td className="text-muted">{s.contacts.find((c) => c.id === a.agencyId)?.name ?? `Direct · ${a.airline}`}</td>
                    <td className="num">{qty}</td>
                    <td className="num">{f.toFixed(2)}</td>
                    <td><Status value={a.status} /></td>
                    <td className="num">{printed}</td>
                    <td className={`num ${qty - printed > 0 ? "font-medium text-warn" : ""}`}>{qty - printed}</td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {a.status === "open" && <LinkButton variant="secondary" className="h-7 px-2 text-xs" href={`/w/freight/labels/${a.id}`}>Print labels</LinkButton>}
                        {a.status === "open" && <Button className="h-7 px-2 text-xs" disabled={!printed || qty - printed > 0} title={qty - printed > 0 ? "Print every label first" : ""} onClick={() => s.closeAwb(a.id)}>Close &amp; fly</Button>}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={11} className="bg-surface-2/60">
                        <div className="grid gap-4 py-2 lg:grid-cols-[2fr_1fr]">
                          <div className="overflow-x-auto">
                            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Lines</div>
                            <table className="w-full text-xs">
                              <thead><tr className="text-left text-muted"><th className="py-1 pr-3">House AWB</th><th className="pr-3">PO #</th><th className="pr-3">Vendor</th><th className="pr-3">Product</th><th className="pr-3">Qty</th><th className="pr-3">Customer</th><th className="pr-3">Farm</th></tr></thead>
                              <tbody>
                                {lines.map(({ p, l, i }) => (
                                  <tr key={`${p.id}:${i}`} className="border-t border-line">
                                    <td className="py-1 pr-3 font-mono">{l.hawb}</td>
                                    <td className="pr-3">{p.number}</td>
                                    <td className="pr-3 font-mono">{s.orgs.find((o) => o.id === p.farmId)?.code}</td>
                                    <td className="pr-3">{productName(s.products.find((x) => x.id === l.productId))}</td>
                                    <td className="pr-3">{l.confirmedBoxes} {l.boxType}</td>
                                    <td className="pr-3 font-mono">{s.contacts.find((c) => c.id === l.customerId)?.code ?? "STOCK"}</td>
                                    <td className="pr-3">{p.dispatchedAt ? <span className="text-good">Dispatched · {p.farmInvoice}</span> : <span className="text-muted">Not dispatched</span>}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div>
                            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Liquidation by customer</div>
                            <table className="w-full text-xs">
                              <thead><tr className="text-left text-muted"><th className="py-1">Customer</th><th className="text-right">Boxes</th><th className="text-right">FBE</th><th className="text-right">Farm cost</th></tr></thead>
                              <tbody>
                                {[...byCustomer].map(([k, v]) => (
                                  <tr key={k} className="border-t border-line">
                                    <td className="py-1">{s.contacts.find((c) => c.id === k)?.name ?? "Stock"}</td>
                                    <td className="text-right tabular-nums">{v.boxes}</td>
                                    <td className="text-right tabular-nums">{v.fbe.toFixed(2)}</td>
                                    <td className="text-right tabular-nums">{money(v.cost)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
        {!awbs.length && <Empty>No AWBs yet. Create one from Add AWB.</Empty>}
      </Card>
    </>
  );
}
