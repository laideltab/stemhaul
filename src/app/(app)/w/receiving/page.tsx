"use client";

import { useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { useStore } from "@/lib/store";
import { productName } from "@/lib/selectors";
import { cn, time } from "@/lib/format";
import { Button, Card, CardHeader, Empty, inputCls, PageHeader, Status, Table } from "@/components/ui";

export default function ScanReceiving() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const [code, setCode] = useState("");
  const [log, setLog] = useState<{ ok: boolean; message: string; at: string }[]>([]);
  const ref = useRef<HTMLInputElement>(null);
  const myPoIds = new Set(s.pos.filter((p) => p.wholesalerId === orgId).map((p) => p.id));
  const pending = s.awbs.filter((a) => s.boxes.some((b) => b.awbId === a.id && myPoIds.has(b.poId) && b.status === "in_transit"));

  const scan = (c: string) => {
    if (!c.trim()) return;
    const r = s.scanReceive(c);
    setLog((l) => [{ ...r, at: new Date().toISOString() }, ...l].slice(0, 12));
    setCode("");
    ref.current?.focus();
  };

  return (
    <>
      <PageHeader title="Scan Receiving" sub="Scan each box as it comes off the truck in Miami. A USB or Bluetooth scanner types the label code and presses Enter." />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-6">
          <Card className="p-4">
            <form onSubmit={(e) => { e.preventDefault(); scan(code); }} className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input ref={ref} autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Scan or type a box label, e.g. LF558465007" className={cn(inputCls, "h-11 pl-10 font-mono text-base")} />
              </div>
              <Button className="h-11">Receive</Button>
            </form>
          </Card>

          {pending.map((awb) => {
            const boxes = s.boxes.filter((b) => b.awbId === awb.id);
            const done = boxes.filter((b) => b.status !== "in_transit" && b.status !== "labeled").length;
            return (
              <Card key={awb.id}>
                <CardHeader
                  title={<>AWB <span className="font-mono text-sm">{awb.number}</span></>}
                  sub={`${awb.origin} → MIA · ${awb.airline} · ${done} of ${boxes.length} boxes checked`}
                />
                <div className="h-1.5 bg-line"><div className="h-full bg-brand transition-all" style={{ width: `${(done / boxes.length) * 100}%` }} /></div>
                <Table>
                  <thead><tr><th>Label</th><th>House</th><th>Product</th><th>Box</th><th>Customer</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {boxes.map((b) => (
                      <tr key={b.id}>
                        <td className="font-mono text-xs">{b.code}</td>
                        <td className="font-mono text-xs">{b.hawb}</td>
                        <td>{productName(s.products.find((x) => x.id === b.productId))}</td>
                        <td>{b.boxType} · {b.stems}</td>
                        <td className="font-mono text-xs">{s.contacts.find((c) => c.id === b.customerId)?.code ?? "STOCK"}</td>
                        <td><Status value={b.status} /></td>
                        <td className="text-right">
                          {b.status === "in_transit" && (
                            <div className="flex justify-end gap-1">
                              <Button variant="secondary" className="h-7 px-2 text-xs" onClick={() => scan(b.code)} title="Simulate a scan">Scan</Button>
                              <Button variant="ghost" className="h-7 px-2 text-xs text-bad" onClick={() => s.markBox(b.id, "missing")}>Missing</Button>
                            </div>
                          )}
                          {b.status === "received" && <Button variant="ghost" className="h-7 px-2 text-xs text-bad" onClick={() => s.markBox(b.id, "damaged")}>Damaged</Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            );
          })}
          {!pending.length && <Card><Empty>No boxes in the air. Close an AWB in AWB Summary to see its boxes here.</Empty></Card>}
        </div>

        <Card className="h-fit">
          <CardHeader title="Scan log" />
          <ul className="divide-y divide-line">
            {log.map((l, i) => (
              <li key={i} className={cn("px-4 py-2 text-sm", l.ok ? "text-fg" : "text-bad")}>
                <span className="mr-2 text-xs text-muted">{time(l.at)}</span>{l.ok ? "✓ " : "✕ "}{l.message}
              </li>
            ))}
          </ul>
          {!log.length && <Empty>Scans show up here.</Empty>}
        </Card>
      </div>
    </>
  );
}
