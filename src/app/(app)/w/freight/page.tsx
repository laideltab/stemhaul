"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { date } from "@/lib/format";
import { Button, Card, CardHeader, Empty, Field, inputCls, PageHeader, Status, Table } from "@/components/ui";

const airlines = ["Avianca Cargo", "LATAM Cargo", "Atlas Air"];

export default function Freight() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const labeled = s.pos.filter((p) => p.wholesalerId === orgId && p.status === "labeled");
  const agencies = s.contacts.filter((c) => c.ownerOrgId === orgId && c.kind === "agency");
  const [sel, setSel] = useState<string[]>([]);
  const [agencyId, setAgencyId] = useState(agencies[0]?.id ?? "");
  const [direct, setDirect] = useState(false);
  const [master, setMaster] = useState("");
  const [airline, setAirline] = useState(airlines[0]);
  const [flight, setFlight] = useState(new Date().toISOString().slice(0, 10));
  const poIds = new Set(s.pos.filter((p) => p.wholesalerId === orgId).map((p) => p.id));
  const awbs = s.awbs.filter((a) => a.houses.some((h) => poIds.has(h.poId)));

  return (
    <>
      <PageHeader title="Freight & AWBs" sub="Book cargo through a cargo agency or directly with the airline. Each purchase order gets a house AWB under the master AWB." />
      <Card className="mb-6">
        <CardHeader title="Book freight" sub="Purchase orders with labels printed and not booked yet" />
        {labeled.length ? (
          <div className="grid gap-4 p-4">
            <div className="grid gap-2">
              {labeled.map((p) => {
                const n = s.boxes.filter((b) => b.poId === p.id).length;
                return (
                  <label key={p.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                    <input type="checkbox" checked={sel.includes(p.id)} onChange={(e) => setSel(e.target.checked ? [...sel, p.id] : sel.filter((x) => x !== p.id))} />
                    <span className="font-medium">{p.number}</span>
                    <span className="text-muted">{s.orgs.find((o) => o.id === p.farmId)?.name} · {n} boxes · ships {date(p.shipDate)}</span>
                  </label>
                );
              })}
            </div>
            <div className="inline-flex w-fit rounded-lg border border-line bg-surface p-1 text-sm">
              <button onClick={() => setDirect(false)} className={`rounded-md px-3 py-1.5 ${!direct ? "bg-brand text-white" : "text-muted"}`}>Through a cargo agency</button>
              <button onClick={() => setDirect(true)} className={`rounded-md px-3 py-1.5 ${direct ? "bg-brand text-white" : "text-muted"}`}>Direct with the airline</button>
            </div>
            {direct && <p className="text-sm text-muted">No agency: you book the space with the airline yourself and type the master AWB number it gives you. Stemhaul still creates one house reference per purchase order so boxes can be tracked and scanned.</p>}
            <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
              {direct ? (
                <Field label="Master AWB from the airline">
                  <input className={`${inputCls} font-mono`} placeholder="e.g. 729-12345675" value={master} onChange={(e) => setMaster(e.target.value)} />
                </Field>
              ) : (
                <Field label="Cargo agency">
                  <select className={inputCls} value={agencyId} onChange={(e) => setAgencyId(e.target.value)}>
                    {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Airline">
                <select className={inputCls} value={airline} onChange={(e) => setAirline(e.target.value)}>{airlines.map((a) => <option key={a}>{a}</option>)}</select>
              </Field>
              <Field label="Flight date"><input type="date" className={inputCls} value={flight} onChange={(e) => setFlight(e.target.value)} /></Field>
              <Button disabled={!sel.length} onClick={() => { s.bookFreight(sel, direct ? undefined : agencyId, airline, flight, direct ? master : undefined); setSel([]); setMaster(""); }}>Book {sel.length || ""} and issue AWB</Button>
            </div>
          </div>
        ) : <Empty>No purchase orders waiting for freight. Labels come from the farm portal.</Empty>}
      </Card>

      <Card>
        <CardHeader title="Master AWBs" />
        <Table>
          <thead><tr><th>Master AWB</th><th>Booked via</th><th>Airline</th><th>Route</th><th>Flight</th><th>House AWBs</th><th className="num">Pieces</th><th>Status</th></tr></thead>
          <tbody>
            {awbs.map((a) => (
              <tr key={a.id}>
                <td className="font-mono text-xs">{a.number}</td>
                <td>{s.contacts.find((c) => c.id === a.agencyId)?.name ?? <span className="text-muted">Direct</span>}</td>
                <td>{a.airline}</td>
                <td>{a.origin} → MIA</td>
                <td>{date(a.flightDate)}</td>
                <td className="text-xs">{a.houses.map((h) => <div key={h.hawb}><span className="font-mono">{h.hawb}</span> · {s.pos.find((p) => p.id === h.poId)?.number}</div>)}</td>
                <td className="num">{a.houses.reduce((x, h) => x + h.pieces, 0)}</td>
                <td><Status value={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
