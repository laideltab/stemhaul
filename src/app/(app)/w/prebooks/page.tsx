"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Repeat, Warehouse, Sprout } from "lucide-react";
import { useStore } from "@/lib/store";
import { stemsPerBox } from "@/lib/seed";
import { cn, date, money, num, perStem, time } from "@/lib/format";
import { salePrice, shortName } from "@/lib/market";
import { askLabel, farmsOf, freeStock, lineStage, matchingProducts, prebookTotals, stockCount } from "@/lib/prebook";
import type { PrebookLine } from "@/lib/types";
import { Badge, Button, Card, Empty, Field, inputCls, Notice, PageHeader, Table } from "@/components/ui";

const tabs = [["requested", "New"], ["confirmed", "Confirmed"], ["declined", "Declined"]] as const;
const NEW_FARM = "__new";

/** Dollar input that only commits on blur, so typing "0.4" is not reformatted mid-way. */
function PriceInput({ cents, onChange, label }: { cents?: number; onChange: (c: number | undefined) => void; label: string }) {
  return (
    <input
      key={cents ?? "none"} type="number" step="0.01" min={0} aria-label={label} className={inputCls}
      defaultValue={cents ? (cents / 100).toFixed(2) : ""} onBlur={(e) => onChange(Math.round(+e.target.value * 100) || undefined)}
    />
  );
}

export default function ImporterPrebooks() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const all = s.prebooks.filter((p) => p.wholesalerId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [tab, setTab] = useState<(typeof tabs)[number][0]>(all.some((p) => p.status === "requested") ? "requested" : "confirmed");
  const [pick, setPick] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PrebookLine[]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [newFarm, setNewFarm] = useState<{ line: number; name: string; city: string; country: string; origin: string; code: string } | null>(null);
  const [result, setResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);

  const list = all.filter((p) => p.status === tab);
  const pb = all.find((x) => x.id === pick) ?? list[0];
  const stock = freeStock(s, orgId);
  const farms = farmsOf(s, orgId);
  const product = (id?: string) => s.products.find((p) => p.id === id);
  const stems = (l: PrebookLine) => stemsPerBox(product(l.sourcedProductId)?.species ?? l.species, l.boxType);
  const org = (id?: string) => s.orgs.find((o) => o.id === id);
  const name = (id: string) => { const o = org(id); return o ? shortName(o) : ""; };
  const costOf = (productId: string, boxType: string) => stock.find((b) => b.productId === productId && b.boxType === boxType)?.costPerStemCents ?? 0;

  // First guess for each line: boxes already in the cooler, else a farm that lists it, else the closest variety with no farm yet.
  const suggest = (l: PrebookLine): PrebookLine => {
    const matches = matchingProducts(s.products, l);
    const inStock = matches.find((p) => stockCount(stock, p.id, l.boxType) > 0);
    const priceFrom = (cost: number) => Math.max(l.targetCents ?? 0, Math.round(cost * 1.35));
    if (inStock && stockCount(stock, inStock.id, l.boxType) >= l.boxes) {
      return { ...l, source: "stock", sourcedProductId: inStock.id, confirmedBoxes: l.boxes, priceCents: priceFrom(costOf(inStock.id, l.boxType)) };
    }
    const listing = s.listings
      .filter((x) => x.listed && x.boxType === l.boxType && matches.some((p) => p.id === x.productId) && farms.some((f) => f.org.id === x.farmId))
      .sort((a, b) => Number(b.stockBoxes >= l.boxes) - Number(a.stockBoxes >= l.boxes) || matches.findIndex((p) => p.id === a.productId) - matches.findIndex((p) => p.id === b.productId))[0];
    if (listing) {
      const markup = s.mapFarms.find((m) => m.wholesalerId === orgId && m.farmId === listing.farmId)?.markupPct ?? 40;
      return { ...l, source: "farm", farmId: listing.farmId, sourcedProductId: listing.productId, farmCents: listing.farmPriceCents, confirmedBoxes: l.boxes, priceCents: Math.max(l.targetCents ?? 0, salePrice(listing.farmPriceCents, markup)) };
    }
    return { ...l, source: "farm", sourcedProductId: matches[0]?.id, confirmedBoxes: l.boxes, priceCents: l.targetCents };
  };
  const draft = pb ? drafts[pb.id] ?? pb.lines.map(suggest) : [];
  const edit = (i: number, patch: Partial<PrebookLine>) => pb && setDrafts({ ...drafts, [pb.id]: draft.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const shown = pb?.status === "requested" ? draft : pb?.lines ?? [];
  const total = shown.reduce((a, l) => a + (l.confirmedBoxes ?? 0) * stems(l) * (l.priceCents ?? 0), 0);
  const cost = shown.reduce((a, l) => {
    // Boxes already set aside keep their own cost; otherwise use what is free in the cooler.
    const c = l.source === "stock" ? s.boxes.find((x) => l.boxIds?.includes(x.id))?.costPerStemCents ?? costOf(l.sourcedProductId ?? "", l.boxType) : l.farmCents ?? 0;
    return a + (l.confirmedBoxes ?? 0) * stems(l) * c;
  }, 0);
  const florist = pb && org(pb.floristOrgId);
  const customer = pb && s.contacts.find((c) => c.id === pb.customerId);

  const saveFarm = () => {
    if (!newFarm || !newFarm.name.trim() || !newFarm.code.trim()) return;
    const id = s.addVendorFarm({ name: newFarm.name.trim(), city: newFarm.city.trim(), country: newFarm.country, origin: newFarm.origin, code: newFarm.code.trim() });
    edit(newFarm.line, { farmId: id });
    setNewFarm(null);
  };

  return (
    <>
      <PageHeader title="Prebooks" sub="Florists ask you for flowers without picking a farm. Source each line from your Miami stock or any farm, set the price, and confirm. The purchase order is created for you." />
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="grid h-fit gap-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map(([k, label]) => (
              <button key={k} onClick={() => { setTab(k); setPick(null); }} className={cn("rounded-full px-3 py-1 text-sm", tab === k ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted")}>
                {label} · {all.filter((x) => x.status === k).length}
              </button>
            ))}
          </div>
          {list.map((x) => (
            <button key={x.id} onClick={() => setPick(x.id)} className={cn("rounded-xl border bg-surface p-3 text-left", x.id === pb?.id ? "border-accent ring-1 ring-accent" : "border-line hover:bg-surface-2")}>
              <div className="flex justify-between gap-2"><span className="font-semibold">{name(x.floristOrgId)}</span><span className="font-mono text-xs text-muted">{x.number}</span></div>
              <div className="text-sm text-muted">{x.lines.map((l) => `${l.boxes} ${l.boxType} ${l.species.toLowerCase()}`).join(" + ")}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                Needed {date(x.neededBy)}{x.weekly && <span className="inline-flex items-center gap-1"><Repeat size={12} /> weekly</span>}
                {x.status !== "requested" && <span className="ml-auto font-medium text-fg">{money(prebookTotals(x, stems).cents)}</span>}
              </div>
            </button>
          ))}
          {!list.length && <Card><Empty>Nothing here.</Empty></Card>}
        </div>

        {pb ? (
          <div className="grid min-w-0 gap-4">
            <div>
              <div className="text-sm text-muted">{pb.number} · asked {date(pb.createdAt)} {time(pb.createdAt)}</div>
              <h2 className="font-display text-2xl font-semibold">{florist?.name} needs {pb.lines.map((l) => `${l.boxes} ${l.boxType}`).join(" + ")} by {date(pb.neededBy)}</h2>
              <div className="mt-1 flex flex-wrap gap-2 text-sm">
                <Badge>Mark code {customer?.code}</Badge>
                {pb.weekly && <Badge tone="info">Standing order · every week</Badge>}
                {pb.status === "confirmed" && <Badge tone="brand">Confirmed {pb.answeredAt && `${date(pb.answeredAt)} ${time(pb.answeredAt)}`}</Badge>}
                {pb.status === "declined" && <Badge tone="bad">Could not source</Badge>}
              </div>
              {pb.note && <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm"><span className="text-muted">Note from {name(pb.floristOrgId)}:</span> {pb.note}</p>}
            </div>

            {result?.id === pb.id && <Notice result={result} />}

            {pb.status === "requested" ? (
              <>
                {draft.map((l, i) => {
                  const matches = matchingProducts(s.products, l);
                  const n = l.confirmedBoxes ?? 0;
                  const lineCost = l.source === "stock" ? costOf(l.sourcedProductId ?? "", l.boxType) : l.farmCents;
                  const free = l.sourcedProductId ? stockCount(stock, l.sourcedProductId, l.boxType) : 0;
                  const farm = farms.find((f) => f.org.id === l.farmId);
                  return (
                    <Card key={i}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
                        <div className="font-semibold">{l.boxes} {l.boxType} · {askLabel(l)}</div>
                        <div className="text-sm text-muted">{l.targetCents ? `Target ${perStem(l.targetCents)}/stem` : "No target price"}</div>
                      </div>
                      <div className="grid gap-4 p-4">
                        <div className="flex flex-wrap gap-2" role="group" aria-label={`Source for line ${i + 1}`}>
                          {([["stock", "From my Miami stock", Warehouse], ["farm", "Buy from a farm", Sprout]] as const).map(([k, label, Icon]) => (
                            <button key={k} onClick={() => {
                              // Switching to stock jumps to the variety with the most free boxes.
                              const best = [...matches].sort((x, y) => stockCount(stock, y.id, l.boxType) - stockCount(stock, x.id, l.boxType))[0];
                              edit(i, k === "stock" && !free && best ? { source: k, sourcedProductId: best.id } : { source: k });
                            }} className={cn("inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm", l.source === k ? "border-brand bg-brand-soft font-medium text-brand" : "border-line hover:bg-surface-2")}>
                              <Icon size={16} /> {label}
                            </button>
                          ))}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Field label="Variety" className="sm:col-span-2">
                            <select className={inputCls} value={l.sourcedProductId ?? ""} onChange={(e) => edit(i, { sourcedProductId: e.target.value })}>
                              {matches.map((p) => {
                                const c = stockCount(stock, p.id, l.boxType);
                                return <option key={p.id} value={p.id}>{p.variety} · {p.color} · {p.lengthCm} cm{l.source === "stock" ? ` · ${c} ${l.boxType} in Miami` : ""}</option>;
                              })}
                            </select>
                          </Field>
                          {l.source === "farm" ? (
                            <>
                              <Field label="Farm" className="sm:col-span-2">
                                <select
                                  className={inputCls} value={l.farmId ?? ""}
                                  onChange={(e) => (e.target.value === NEW_FARM ? setNewFarm({ line: i, name: "", city: "", country: "Ecuador", origin: "UIO", code: "" }) : edit(i, { farmId: e.target.value }))}
                                >
                                  <option value="" disabled>Pick a farm</option>
                                  {farms.map((f) => <option key={f.org.id} value={f.org.id}>{f.org.name} ({f.org.code}){f.onPortal ? " · on Stem Haul" : ""}</option>)}
                                  <option value={NEW_FARM}>+ Add a farm not in the system</option>
                                </select>
                              </Field>
                              <Field label="Farm price $/stem"><PriceInput label={`Farm price line ${i + 1}`} cents={l.farmCents} onChange={(c) => edit(i, { farmCents: c })} /></Field>
                            </>
                          ) : (
                            <div className="flex items-end text-sm text-muted sm:col-span-2">{free} {l.boxType} of this variety free in the cooler · cost {perStem(lineCost ?? 0)}</div>
                          )}
                          <Field label="Boxes you confirm">
                            <input
                              type="number" min={0} max={l.source === "stock" ? Math.min(l.boxes, free) : undefined} className={inputCls} value={n} aria-label={`Boxes you confirm, line ${i + 1}`}
                              onChange={(e) => edit(i, { confirmedBoxes: Math.max(0, +e.target.value | 0) })}
                            />
                          </Field>
                          <Field label={`Price to ${name(pb.floristOrgId)} $/stem`}><PriceInput label={`Sale price line ${i + 1}`} cents={l.priceCents} onChange={(c) => edit(i, { priceCents: c })} /></Field>
                        </div>
                        {newFarm?.line === i && (
                          <div className="grid gap-3 rounded-lg border border-dashed border-brand/50 bg-brand-soft/30 p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1.4fr_1fr]">
                            <Field label="Farm name"><input className={inputCls} value={newFarm.name} onChange={(e) => setNewFarm({ ...newFarm, name: e.target.value })} /></Field>
                            <Field label="Town"><input className={inputCls} value={newFarm.city} onChange={(e) => setNewFarm({ ...newFarm, city: e.target.value })} /></Field>
                            <Field label="Country / airport">
                              <select className={inputCls} value={`${newFarm.country}|${newFarm.origin}`} onChange={(e) => { const [country, origin] = e.target.value.split("|"); setNewFarm({ ...newFarm, country, origin }); }}>
                                <option value="Ecuador|UIO">Ecuador · UIO</option>
                                <option value="Colombia|BOG">Colombia · BOG</option>
                                <option value="Colombia|MDE">Colombia · MDE</option>
                                <option value="Peru|LIM">Peru · LIM</option>
                              </select>
                            </Field>
                            <Field label="Vendor code"><input className={`${inputCls} uppercase`} maxLength={6} value={newFarm.code} onChange={(e) => setNewFarm({ ...newFarm, code: e.target.value })} /></Field>
                            <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2 lg:col-span-4">
                              <span className="mr-auto min-w-0 flex-1 basis-64 text-xs text-muted">Added to your farms. They can print labels once you invite them to the free farm portal; until then you enter their boxes.</span>
                              <Button variant="ghost" onClick={() => setNewFarm(null)}>Cancel</Button>
                              <Button disabled={!newFarm.name.trim() || !newFarm.code.trim()} onClick={saveFarm}>Add farm</Button>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap justify-between gap-2 text-sm">
                          <span className="text-muted">
                            {num(n * stems(l))} stems
                            {l.source === "farm" && farm && ` · ${farm.onPortal ? `${farm.org.name} sees the PO in its portal` : `send the PO to ${farm.org.name} by email`}`}
                            {l.source === "farm" && l.farmId && !farm && ` · ${org(l.farmId)?.name}`}
                          </span>
                          <span>
                            {money(n * stems(l) * (l.priceCents ?? 0))}
                            {lineCost && l.priceCents ? <span className={cn("ml-2", l.priceCents > lineCost ? "text-good" : "text-bad")}>margin {Math.round(((l.priceCents - lineCost) / l.priceCents) * 100)}%</span> : null}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                <Field label={`Message to ${name(pb.floristOrgId)} (optional)`}>
                  <textarea className={`${inputCls} h-16 py-2`} placeholder="e.g. Freedom from Cayambe, flying Thursday" value={notes[pb.id] ?? ""} onChange={(e) => setNotes({ ...notes, [pb.id]: e.target.value })} />
                </Field>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="mr-auto text-sm text-muted">Sale {money(total)} · cost {money(cost)} · margin {money(total - cost)}</span>
                  <Button variant="secondary" className="h-11" onClick={() => { s.declinePrebook(pb.id, notes[pb.id] ?? ""); setResult({ id: pb.id, ok: true, message: `Told ${name(pb.floristOrgId)} you can't source ${pb.number}.` }); setTab("declined"); setPick(pb.id); }}>
                    Can&apos;t source
                  </Button>
                  <Button
                    className="h-11" disabled={!total}
                    onClick={() => {
                      const r = s.confirmPrebook(pb.id, draft, notes[pb.id] ?? "");
                      setResult({ id: pb.id, ...r });
                      if (r.ok) { setTab("confirmed"); setPick(pb.id); }
                    }}
                  >
                    Confirm to {name(pb.floristOrgId)} · {money(total)}
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <Table>
                  <thead><tr><th>Asked</th><th>Sourced</th><th className="num">Boxes</th><th className="num">Per stem</th><th className="num">Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {pb.lines.map((l, i) => {
                      const p = product(l.sourcedProductId);
                      const po = s.pos.find((x) => x.id === l.poId);
                      const stage = lineStage(s, l);
                      return (
                        <tr key={i}>
                          <td>{l.boxes} {l.boxType} · {askLabel(l)}</td>
                          <td>
                            {p && l.confirmedBoxes ? <div>{p.variety} {p.lengthCm} cm</div> : "—"}
                            {!!l.confirmedBoxes && (
                              <div className="text-xs text-muted">
                                {l.source === "stock" ? "Miami stock" : org(l.farmId)?.name}
                                {po && <> · <Link className="text-brand underline" href={`/w/purchase-orders/${po.id}`}>{po.number}</Link></>}
                              </div>
                            )}
                          </td>
                          <td className="num">{l.confirmedBoxes ?? 0} {l.boxType}</td>
                          <td className="num">{l.priceCents && l.confirmedBoxes ? perStem(l.priceCents) : "—"}</td>
                          <td className="num">{money((l.confirmedBoxes ?? 0) * stems(l) * (l.priceCents ?? 0))}</td>
                          <td><Badge tone={stage.tone}>{stage.label}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line">
                      <td colSpan={4} className="px-4 py-3 text-sm text-muted">{pb.answerNote ? `You wrote: "${pb.answerNote}"` : "Billed when you deliver the boxes"} · margin {money(total - cost)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </Table>
              </Card>
            )}
          </div>
        ) : (
          <Card className="grid place-items-center gap-2 p-10 text-center text-sm text-muted">
            <Bell size={20} />
            No prebooks here. Florists send them from their Stem Haul account.
          </Card>
        )}
      </div>
    </>
  );
}
