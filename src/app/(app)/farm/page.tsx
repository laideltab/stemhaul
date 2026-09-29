"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { date, money, num } from "@/lib/format";
import { productName } from "@/lib/selectors";
import { Button, Card, CardHeader, Empty, LinkButton, PageHeader, Status, Table } from "@/components/ui";

export default function FarmPortal() {
  const s = useStore();
  const router = useRouter();
  const orgId = s.session!.orgId;
  const farm = s.orgs.find((o) => o.id === orgId)!;
  const pos = s.pos.filter((p) => p.farmId === orgId && p.status !== "draft").sort((a, b) => b.number.localeCompare(a.number));

  return (
    <>
      <PageHeader title="My Orders & Labels" sub={`${farm.name} · orders from your Stemhaul customers`} />
      <div className="grid gap-4">
        {pos.map((p) => {
          const buyer = s.orgs.find((o) => o.id === p.wholesalerId)!;
          const boxes = p.lines.reduce((a, l) => a + l.boxes, 0);
          return (
            <Card key={p.id}>
              <CardHeader
                title={<span className="flex items-center gap-2">{p.number} <Status value={p.status} /></span>}
                sub={`${buyer.name} · ship ${date(p.shipDate)} · ${boxes} boxes · ${money(p.lines.reduce((a, l) => a + l.boxes * l.stemsPerBox * l.pricePerStemCents, 0))}`}
                action={
                  <div className="flex gap-2">
                    {p.status === "sent" && <Button onClick={() => s.farmConfirmPO(p.id)}>Confirm order</Button>}
                    {p.status === "confirmed" && <Button onClick={() => { s.farmPrintLabels(p.id); router.push(`/farm/labels/${p.id}`); }}>Print labels</Button>}
                    {["labeled", "shipped", "received"].includes(p.status) && <LinkButton variant="secondary" href={`/farm/labels/${p.id}`}>Reprint labels</LinkButton>}
                  </div>
                }
              />
              <Table>
                <thead><tr><th>Product</th><th>Box</th><th className="num">Boxes</th><th className="num">Stems</th></tr></thead>
                <tbody>
                  {p.lines.map((l, i) => (
                    <tr key={i}>
                      <td>{productName(s.products.find((x) => x.id === l.productId))}</td>
                      <td>{l.boxType} ({l.stemsPerBox} stems)</td>
                      <td className="num">{l.boxes}</td>
                      <td className="num">{num(l.boxes * l.stemsPerBox)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          );
        })}
        {!pos.length && <Card><Empty>No orders yet.</Empty></Card>}
      </div>
    </>
  );
}
