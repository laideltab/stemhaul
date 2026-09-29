"use client";

import { use } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { date, money, num, perStem } from "@/lib/format";
import { productName } from "@/lib/selectors";
import { Button, Card, CardHeader, PageHeader, Status, Table, Empty } from "@/components/ui";

const steps = ["draft", "sent", "confirmed", "labeled", "shipped", "received"];

export default function PODetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = useStore();
  const po = s.pos.find((p) => p.id === id);
  if (!po) return <Empty>Purchase order not found. <Link className="text-brand underline" href="/w/purchase-orders">Back</Link></Empty>;
  const farm = s.orgs.find((o) => o.id === po.farmId);
  const boxes = s.boxes.filter((b) => b.poId === po.id);
  const awb = s.awbs.find((a) => a.id === po.awbId);
  const idx = steps.indexOf(po.status);

  return (
    <>
      <PageHeader
        title={po.number}
        sub={<>{farm?.name} · ships {date(po.shipDate)}</>}
        actions={po.status === "draft" ? <Button onClick={() => s.sendPO(po.id)}>Send to farm</Button> : undefined}
      />
      <Card className="mb-6 p-4">
        <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {steps.map((st, i) => (
            <li key={st} className="text-center">
              <div className={`mx-auto h-1.5 rounded-full ${i <= idx ? "bg-brand" : "bg-line"}`} />
              <div className={`mt-1.5 text-xs capitalize ${i <= idx ? "font-medium text-fg" : "text-muted"}`}>{st}</div>
            </li>
          ))}
        </ol>
        {po.status === "sent" && <p className="mt-3 text-sm text-muted">Waiting for {farm?.name} to confirm in the farm portal.</p>}
        {po.status === "confirmed" && <p className="mt-3 text-sm text-muted">Confirmed. The farm prints the labels next.</p>}
        {po.status === "labeled" && <p className="mt-3 text-sm text-muted">Labels printed. Book the freight in <Link className="text-brand underline" href="/w/freight">Freight & AWBs</Link>.</p>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Lines" />
          <Table>
            <thead><tr><th>Product</th><th>Box</th><th className="num">Boxes</th><th className="num">Stems</th><th className="num">$/stem</th><th className="num">Total</th></tr></thead>
            <tbody>
              {po.lines.map((l, i) => (
                <tr key={i}>
                  <td>{productName(s.products.find((p) => p.id === l.productId))}</td>
                  <td>{l.boxType} ({l.stemsPerBox})</td>
                  <td className="num">{l.boxes}</td>
                  <td className="num">{num(l.boxes * l.stemsPerBox)}</td>
                  <td className="num">{perStem(l.pricePerStemCents)}</td>
                  <td className="num">{money(l.boxes * l.stemsPerBox * l.pricePerStemCents)}</td>
                </tr>
              ))}
              <tr className="font-medium"><td colSpan={5}>Total</td><td className="num">{money(po.lines.reduce((a, l) => a + l.boxes * l.stemsPerBox * l.pricePerStemCents, 0))}</td></tr>
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Freight" />
          {awb ? (
            <dl className="grid grid-cols-2 gap-y-2 p-4 text-sm">
              <dt className="text-muted">Master AWB</dt><dd className="font-mono">{awb.number}</dd>
              <dt className="text-muted">House AWB</dt><dd className="font-mono">{awb.houses.find((h) => h.poId === po.id)?.hawb}</dd>
              <dt className="text-muted">Airline</dt><dd>{awb.airline}</dd>
              <dt className="text-muted">Flight</dt><dd>{awb.origin} → MIA · {date(awb.flightDate)}</dd>
              <dt className="text-muted">Agency</dt><dd>{s.contacts.find((c) => c.id === awb.agencyId)?.name ?? "None, booked direct with airline"}</dd>
              <dt className="text-muted">Status</dt><dd><Status value={awb.status} /></dd>
            </dl>
          ) : <Empty>Not booked yet.</Empty>}
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title={`Boxes (${boxes.length})`} sub="One row per label. The label code is what gets scanned in Miami and at the florist." />
          <Table>
            <thead><tr><th>Label</th><th>Product</th><th>Box</th><th className="num">Stems</th><th>Customer</th><th>Status</th></tr></thead>
            <tbody>
              {boxes.map((b) => (
                <tr key={b.id}>
                  <td className="font-mono text-xs">{b.code}</td>
                  <td>{productName(s.products.find((p) => p.id === b.productId))}</td>
                  <td>{b.boxType}</td>
                  <td className="num">{b.stems}</td>
                  <td>{s.contacts.find((c) => c.id === b.customerId)?.name ?? "—"}</td>
                  <td><Status value={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!boxes.length && <Empty>Boxes appear when the farm prints the labels.</Empty>}
        </Card>
      </div>
    </>
  );
}
