"use client";

import { use } from "react";
import { Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { date } from "@/lib/format";
import { Button, Empty, LinkButton, PageHeader } from "@/components/ui";

// Visual stand-in for a barcode: bar widths derived from the code's characters.
function Bars({ code }: { code: string }) {
  const bars: number[] = [];
  for (const ch of code) {
    const c = ch.charCodeAt(0);
    bars.push(1 + (c % 3), 1 + ((c >> 2) % 2), 1 + ((c >> 3) % 3), 1 + ((c >> 1) % 2));
  }
  let x = 0;
  return (
    <svg viewBox={`0 0 ${bars.reduce((a, b) => a + b, 0) + 4} 40`} className="h-16 w-full" preserveAspectRatio="none" aria-label={`Barcode ${code}`}>
      {bars.map((w, i) => {
        const r = i % 2 === 0 ? <rect key={i} x={x + 2} y={0} width={w} height={40} fill="black" /> : null;
        x += w;
        return r;
      })}
    </svg>
  );
}

export default function Labels({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = useStore();
  const po = s.pos.find((p) => p.id === id);
  if (!po) return <Empty>Order not found.</Empty>;
  const farm = s.orgs.find((o) => o.id === po.farmId)!;
  const buyer = s.orgs.find((o) => o.id === po.wholesalerId)!;
  const boxes = s.boxes.filter((b) => b.poId === po.id);

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={`Labels · ${po.number}`}
          sub="4×6 in thermal labels, one per box. The barcode is what Lucy's scans in Miami and the florist scans at the shop."
          actions={<><LinkButton variant="secondary" href="/farm">Back</LinkButton><Button onClick={() => window.print()}><Printer size={16} /> Print</Button></>}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:block">
        {boxes.map((b, i) => {
          const p = s.products.find((x) => x.id === b.productId)!;
          return (
            <div key={b.id} className="aspect-[4/6] break-after-page border-2 border-black bg-white p-4 font-mono text-black print:mb-0 print:h-[6in] print:w-[4in]">
              <div className="flex justify-between border-b-2 border-black pb-2 text-xs">
                <div><div className="font-bold">{farm.name.toUpperCase()}</div><div>{farm.city}</div></div>
                <div className="text-right"><div>BOX {i + 1}/{boxes.length}</div><div>{date(po.shipDate)}</div></div>
              </div>
              <div className="border-b-2 border-black py-2 text-xs">
                <div>CONSIGNEE</div>
                <div className="text-base font-bold">{buyer.name.toUpperCase()}</div>
                <div>{buyer.city}</div>
              </div>
              <div className="py-3">
                <div className="text-4xl font-bold">{b.boxType}</div>
                <div className="mt-1 text-lg font-bold leading-tight">{p.species.toUpperCase()} {p.variety.toUpperCase()}</div>
                <div className="text-sm">{p.color} · {p.lengthCm} cm · {b.stems} stems</div>
              </div>
              <div className="grid grid-cols-2 border-y-2 border-black py-2 text-xs">
                <div>PO<div className="font-bold">{po.number}</div></div>
                <div>HAWB<div className="font-bold">{b.hawb ?? "—"}</div></div>
              </div>
              <div className="pt-3">
                <Bars code={b.code} />
                <div className="mt-1 text-center text-sm font-bold tracking-widest">{b.code}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
