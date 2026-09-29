"use client";

import { useStore } from "@/lib/store";
import { cn, num } from "@/lib/format";
import { FarmMap } from "@/components/farm-map";
import { Swatch, Toggle } from "@/components/market-ui";
import { Card, CardHeader, PageHeader, Table } from "@/components/ui";


export default function FarmListings() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const farm = s.orgs.find((o) => o.id === orgId)!;
  const listings = s.listings.filter((l) => l.farmId === orgId);
  const importers = s.mapFarms.filter((m) => m.farmId === orgId && m.enabled).map((m) => s.orgs.find((o) => o.id === m.wholesalerId)!.name);
  const product = (id: string) => s.products.find((p) => p.id === id)!;

  return (
    <>
      <PageHeader title="My Listings" sub="Your farm prices and stock for the next flight. Your importers add their margin and show it to their florists on the map." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <Table>
            <thead><tr><th>Product</th><th>Box</th><th className="num">Farm price / stem</th><th className="num">Stock next flight</th><th>Listed</th></tr></thead>
            <tbody>
              {listings.map((l) => {
                const p = product(l.productId);
                return (
                  <tr key={l.id} className={cn(!l.listed && "text-muted")}>
                    <td><span className="flex items-center gap-2"><Swatch color={p.color} /><span className="font-medium">{p.species} {p.variety} · {p.color}</span> <span className="text-muted">{p.lengthCm} cm</span></span></td>
                    <td className="whitespace-nowrap">{l.boxType} {num(l.stemsPerBox)}</td>
                    <td className="num">
                      <span className="inline-flex items-center gap-1">$
                        <input
                          type="number" step="0.01" min={0} aria-label={`Price for ${p.variety} ${p.lengthCm} cm`}
                          className="h-8 w-20 rounded-lg border border-line bg-surface px-2 text-right tabular-nums"
                          key={l.farmPriceCents}
                          defaultValue={(l.farmPriceCents / 100).toFixed(2)}
                          onBlur={(e) => s.updateListing(l.id, { farmPriceCents: Math.max(0, Math.round((parseFloat(e.target.value) || 0) * 100)) })}
                        />
                      </span>
                    </td>
                    <td className="num">
                      <input
                        type="number" min={0} aria-label={`Stock for ${p.variety} ${p.lengthCm} cm`}
                        className={cn("h-8 w-16 rounded-lg border border-line bg-surface px-2 text-right tabular-nums", l.stockBoxes <= 2 && "border-warn text-warn")}
                        value={l.stockBoxes}
                        onChange={(e) => s.updateListing(l.id, { stockBoxes: Math.max(0, +e.target.value | 0) })}
                      />{" "}{l.boxType}
                    </td>
                    <td><Toggle on={l.listed} label={`List ${p.variety} ${p.lengthCm} cm`} onChange={(v) => s.updateListing(l.id, { listed: v })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
        <div className="grid h-fit gap-4">
          <Card>
            <CardHeader title="Your pin on the map" />
            <div className="h-56 overflow-hidden border-b border-line">
              <FarmMap compact pins={farm.lat !== undefined ? [{ id: farm.id, lat: farm.lat, lng: farm.lng!, name: farm.name }] : []} selected={farm.id} />
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 text-sm [&_dd]:text-right">
              <dt className="text-muted">Location</dt><dd>{farm.city}</dd>
              <dt className="text-muted">Ships from</dt><dd>{farm.origin}</dd>
              <dt className="text-muted">Sold through</dt><dd>{importers.join(", ") || "No importer yet"}</dd>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Order rules" />
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 text-sm [&_dd]:text-right">
              <dt className="text-muted">Minimum order</dt><dd>1 box</dd>
              <dt className="text-muted">Time to confirm</dt><dd>4 hours</dd>
              <dt className="text-muted">Notify me by</dt><dd>App, email, WhatsApp</dd>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
