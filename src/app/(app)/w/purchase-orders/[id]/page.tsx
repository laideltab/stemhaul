"use client";

import { use } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { date, money, num, perStem } from "@/lib/format";
import { fbe, productName } from "@/lib/selectors";
import { Button, Card, CardHeader, Empty, LinkButton, PageHeader, Status, Table } from "@/components/ui";

const steps = ["draft", "sent", "confirmed", "booked", "labeled", "shipped", "received"];
const stepLabel: Record<string, string> = { booked: "on AWB" };

export default function PODetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = useStore();
  const po = s.pos.find((p) => p.id === id);
  if (!po) return <Empty>Purchase order not found. <Link className="text-brand underline" href="/w/purchase-orders">Back</Link></Empty>;
  const farm = s.orgs.find((o) => o.id === po.farmId);
  const boxes = s.boxes.filter((b) => b.poId === po.id);
  const idx = steps.indexOf(po.status);
  const awbIds = [...new Set(po.lines.map((l) => l.awbId).filter(Boolean))];

  return (
    <>
      <PageHeader
        title={po.number}
        sub={<>{farm?.name} ({farm?.code}) · ships {date(po.shipDate)} from {farm?.origin}{po.marketOrderId && <> · created from map order {s.marketOrders.find((m) => m.id === po.marketOrderId)?.number}</>}{po.prebookId && <> · created from prebook {s.prebooks.find((m) => m.id === po.prebookId)?.number}</>}</>}
        actions={
          <>
            <LinkButton variant="secondary" href="/w/purchase-orders">All POs</LinkButton>
            {po.status === "draft" && <Button onClick={() => s.sendPO(po.id)}>Send to farm</Button>}
            {po.status === "confirmed" && <LinkButton href="/w/freight/add">Add to AWB</LinkButton>}
          </>
        }
      />
      <Card className="mb-6 p-4">
        <ol className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {steps.map((st, i) => (
            <li key={st} className="text-center">
              <div className={`mx-auto h-1.5 rounded-full ${i <= idx ? "bg-brand" : "bg-line"}`} />
              <div className={`mt-1.5 text-xs capitalize ${i <= idx ? "font-medium text-fg" : "text-muted"}`}>{stepLabel[st] ?? st}</div>
            </li>
          ))}
        </ol>
        {po.status === "sent" && <p className="mt-3 text-sm text-muted">Waiting for {farm?.name} to confirm quantities in the farm portal, or confirm them yourself in Confirm POs.</p>}
        {po.status === "confirmed" && <p className="mt-3 text-sm text-muted">Confirmed. Add the lines to a master AWB in Add AWB.</p>}
        {po.status === "booked" && <p className="mt-3 text-sm text-muted">On the AWB. Labels get printed by the farm or from AWB Summary.</p>}
        {po.status === "labeled" && <p className="mt-3 text-sm text-muted">Labels printed. Close the AWB in AWB Summary when the flight leaves.</p>}
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardHeader title="Lines" />
          <Table>
            <thead><tr><th>Product</th><th>Box</th><th className="num">Ordered</th><th className="num">Confirmed</th><th className="num">FBE</th><th className="num">Stems</th><th className="num">$/stem</th><th className="num">Total</th><th>Customer</th><th>AWB / House</th></tr></thead>
            <tbody>
              {po.lines.map((l, i) => {
                const n = l.confirmedBoxes ?? l.boxes;
                const cust = s.contacts.find((c) => c.id === l.customerId);
                return (
                  <tr key={i}>
                    <td className="whitespace-nowrap">{productName(s.products.find((p) => p.id === l.productId))}</td>
                    <td>{l.boxType} ({l.stemsPerBox})</td>
                    <td className="num">{l.boxes}</td>
                    <td className={`num ${l.confirmedBoxes !== undefined && l.confirmedBoxes < l.boxes ? "font-medium text-bad" : ""}`}>{l.confirmedBoxes ?? "—"}</td>
                    <td className="num">{fbe(l.boxType, n).toFixed(2)}</td>
                    <td className="num">{num(n * l.stemsPerBox)}</td>
                    <td className="num">{perStem(l.pricePerStemCents)}</td>
                    <td className="num">{money(n * l.stemsPerBox * l.pricePerStemCents)}</td>
                    <td>{cust ? <><span className="font-mono text-xs">{cust.code}</span> {cust.name}</> : <span className="text-muted">Stock</span>}</td>
                    <td className="font-mono text-xs">{s.awbs.find((a) => a.id === l.awbId)?.number ?? "—"}{l.hawb && <div className="text-muted">{l.hawb}</div>}</td>
                  </tr>
                );
              })}
              <tr className="font-medium"><td colSpan={7}>Total</td><td className="num">{money(po.lines.reduce((a, l) => a + (l.confirmedBoxes ?? l.boxes) * l.stemsPerBox * l.pricePerStemCents, 0))}</td><td colSpan={2} /></tr>
            </tbody>
          </Table>
        </Card>
        {awbIds.length > 0 && (
          <Card>
            <CardHeader title="Freight" />
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              {awbIds.map((aid) => {
                const awb = s.awbs.find((a) => a.id === aid)!;
                return (
                  <dl key={aid} className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-muted">Master AWB</dt><dd className="font-mono">{awb.number}</dd>
                    <dt className="text-muted">Airline</dt><dd>{awb.airline}</dd>
                    <dt className="text-muted">Flight</dt><dd>{awb.origin} → MIA · {date(awb.flightDate)}</dd>
                    <dt className="text-muted">Agency</dt><dd>{s.contacts.find((c) => c.id === awb.agencyId)?.name ?? "None, booked direct with airline"}</dd>
                    <dt className="text-muted">Status</dt><dd><Status value={awb.status} /></dd>
                  </dl>
                );
              })}
            </div>
          </Card>
        )}
        <Card>
          <CardHeader title={`Boxes (${boxes.length})`} sub="One row per label. The label code is what gets scanned in Miami and at the florist." />
          <Table>
            <thead><tr><th>Label</th><th className="num">Lot</th><th>Product</th><th>Box</th><th className="num">Stems</th><th>Customer</th><th>Status</th></tr></thead>
            <tbody>
              {boxes.map((b) => (
                <tr key={b.id}>
                  <td className="font-mono text-xs">{b.code}</td>
                  <td className="num">{b.lot}</td>
                  <td>{productName(s.products.find((p) => p.id === b.productId))}</td>
                  <td>{b.boxType}</td>
                  <td className="num">{b.stems}</td>
                  <td className="font-mono text-xs">{s.contacts.find((c) => c.id === b.customerId)?.code ?? "STOCK"}</td>
                  <td><Status value={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!boxes.length && <Empty>Boxes appear when the labels are printed.</Empty>}
        </Card>
      </div>
    </>
  );
}
