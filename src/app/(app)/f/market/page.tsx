"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, perStem } from "@/lib/format";
import { importerFor, mapFarmsFor } from "@/lib/market";
import { FarmMap } from "@/components/farm-map";
import { Badge, Card, Empty, inputCls, LinkButton, PageHeader } from "@/components/ui";

export default function FarmMarketplace() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const { importer } = importerFor(s, orgId);
  const [q, setQ] = useState("");
  const [flower, setFlower] = useState("");
  const [origin, setOrigin] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  if (!importer) return <Empty>Your shop is not a customer of an importer on Stem Haul yet.</Empty>;

  const all = mapFarmsFor(s, importer.id);
  const product = (id: string) => s.products.find((p) => p.id === id)!;
  const text = q.trim().toLowerCase();
  const farms = all.filter(
    (f) =>
      (!flower || f.species.includes(flower)) &&
      (!origin || f.farm.origin === origin) &&
      (!text ||
        `${f.farm.name} ${f.farm.city}`.toLowerCase().includes(text) ||
        f.listings.some((l) => { const p = product(l.productId); return `${p.species} ${p.variety} ${p.color}`.toLowerCase().includes(text); })),
  );
  const selected = farms.find((f) => f.farm.id === picked) ?? farms[0];
  const cartBoxes = s.cart.reduce((a, c) => a + c.boxes, 0);
  const species = [...new Set(all.flatMap((f) => f.species))].sort();
  const origins = [...new Set(all.map((f) => f.farm.origin!))].sort();

  return (
    <>
      <PageHeader
        title="Farm Marketplace"
        sub={`Pick the farm, ${importer.name} imports and delivers · Ecuador, Colombia and Peru`}
        actions={
          <>
            <LinkButton variant="secondary" href="/f/market/orders">My farm orders</LinkButton>
            <LinkButton href="/f/market/cart">Cart · {cartBoxes} box{cartBoxes === 1 ? "" : "es"}</LinkButton>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-60 flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-muted" />
          <input className={cn(inputCls, "pl-9")} placeholder="Search farms or varieties, e.g. Freedom, hydrangea" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className={cn(inputCls, "w-auto")} value={flower} onChange={(e) => setFlower(e.target.value)} aria-label="Flower">
          <option value="">All flowers</option>
          {species.map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className={cn(inputCls, "w-auto")} value={origin} onChange={(e) => setOrigin(e.target.value)} aria-label="Origin">
          <option value="">All origins</option>
          {origins.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="relative flex flex-col overflow-hidden">
          <div className="relative h-[420px] sm:h-[560px] lg:h-auto lg:min-h-[560px] lg:flex-1">
            <FarmMap className="absolute inset-0" pins={farms.map((f) => ({ id: f.farm.id, lat: f.farm.lat!, lng: f.farm.lng!, name: f.farm.name }))} selected={selected?.farm.id} onSelect={setPicked} />
          </div>
          {selected && (
            <div className="border-t border-line bg-surface p-4 sm:absolute sm:bottom-4 sm:right-4 sm:w-80 sm:rounded-xl sm:border sm:shadow-lg">
              <div className="font-display text-lg font-semibold">{selected.farm.name}</div>
              <div className="text-sm text-muted">{selected.farm.city} · ships from {selected.farm.origin}</div>
              <div className="mt-2 flex flex-wrap gap-1">{selected.species.map((x) => <Badge key={x}>{x}</Badge>)}</div>
              <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted">Delivered from</dt><dd className="font-semibold tabular-nums">{perStem(selected.fromCents)} / stem</dd>
                <dt className="text-muted">Sold and delivered by</dt><dd>{importer.name}</dd>
                <dt className="text-muted">Confirms orders</dt><dd>within 4 h</dd>
              </dl>
              <LinkButton className="mt-3 w-full" href={`/f/market/farm/${selected.farm.id}`}>Shop this farm</LinkButton>
            </div>
          )}
          <div className="absolute left-3 top-3 flex items-center gap-3 rounded-lg bg-surface/90 px-3 py-1.5 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-brand" /> Farm</span>
            <span className="rounded border border-line px-1 font-mono">UIO</span> Export airport
          </div>
        </Card>

        <Card>
          <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
            <h2 className="font-display text-base font-semibold">{farms.length} farms from {importer.name}</h2>
            <span className="text-xs text-muted">Delivered prices</span>
          </div>
          <div className="grid gap-2 p-3">
            {farms.map((f) => (
              <button
                key={f.farm.id}
                onClick={() => setPicked(f.farm.id)}
                className={cn("rounded-xl border p-3 text-left transition-colors hover:bg-surface-2", f.farm.id === selected?.farm.id ? "border-brand ring-1 ring-brand" : "border-line")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold">{f.farm.name}</div>
                  <div className="shrink-0 text-sm tabular-nums">from {perStem(f.fromCents)}</div>
                </div>
                <div className="text-sm text-muted">{f.farm.city} · {f.farm.origin}</div>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {f.species.map((x) => <Badge key={x}>{x}</Badge>)}
                  <span className="ml-auto"><Badge tone="good">{f.stockBoxes} boxes this week</Badge></span>
                </div>
              </button>
            ))}
            {!farms.length && <Empty>No farms match. Try another flower or origin.</Empty>}
          </div>
        </Card>
      </div>
    </>
  );
}
