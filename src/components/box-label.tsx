"use client";

import type { Box } from "@/lib/types";
import { useStore } from "@/lib/store";
import { BOX_SIZE } from "@/lib/selectors";

// Visual stand-in for a barcode: bar widths derived from the code's characters.
function Bars({ code, className, vertical }: { code: string; className?: string; vertical?: boolean }) {
  const bars: number[] = [];
  for (const ch of code) {
    const c = ch.charCodeAt(0);
    bars.push(1 + (c % 3), 1 + ((c >> 2) % 2), 1 + ((c >> 3) % 3), 1 + ((c >> 1) % 2));
  }
  let x = 0;
  const len = bars.reduce((a, b) => a + b, 0) + 4;
  return (
    <svg viewBox={vertical ? `0 0 40 ${len}` : `0 0 ${len} 40`} className={className} preserveAspectRatio="none" aria-label={`Barcode ${code}`}>
      {bars.map((w, i) => {
        const r =
          i % 2 !== 0 ? null : vertical ? (
            <rect key={i} x={0} y={x + 2} width={40} height={w} fill="black" />
          ) : (
            <rect key={i} x={x + 2} y={0} width={w} height={40} fill="black" />
          );
        x += w;
        return r;
      })}
    </svg>
  );
}

/** 4x6 box label laid out like the ones Komet prints. */
export function BoxLabel({ box }: { box: Box }) {
  const s = useStore();
  const po = s.pos.find((p) => p.id === box.poId)!;
  const farm = s.orgs.find((o) => o.id === po.farmId)!;
  const buyer = s.orgs.find((o) => o.id === po.wholesalerId)!;
  const p = s.products.find((x) => x.id === box.productId)!;
  const awb = s.awbs.find((a) => a.id === box.awbId);
  const cust = s.contacts.find((c) => c.id === box.customerId);

  return (
    <div className="grid aspect-[3/2] w-full max-w-md grid-cols-[1fr_auto] border-2 border-black bg-white font-sans text-black print:mb-4 print:break-inside-avoid">
      <div className="grid grid-rows-[auto_auto_1fr_auto] border-r-2 border-black">
        <div className="flex items-baseline gap-2 border-b border-black px-2 py-1 text-[10px]">
          MAWB <span className="font-mono text-base font-bold">{awb?.number ?? "—"}</span>
          <span className="ml-auto">House <b className="font-mono">{box.hawb ?? "—"}</b></span>
        </div>
        <div className="border-b border-black px-2 py-1 leading-tight">
          <div className="text-sm font-bold uppercase">{buyer.name}</div>
          <div className="text-[10px]">{buyer.address} · {buyer.phone}</div>
        </div>
        <div className="grid grid-cols-[1fr_auto]">
          <div className="grid place-items-center px-2 text-center">
            <div className="text-xl font-bold uppercase leading-tight">{p.species} {p.variety}<div className="text-sm">{p.color} {p.lengthCm} cm</div></div>
          </div>
          <div className="grid border-l border-black text-center text-[9px]">
            <div className="border-b border-black px-2 py-1">Vendor code<div className="text-lg font-bold">{farm.code}</div></div>
            <div className="px-2 py-1">Customer code<div className="text-lg font-bold">{cust?.code ?? "STOCK"}</div></div>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end border-t border-black px-2 py-1">
          <div>
            <Bars code={box.code} className="h-9 w-full" />
            <div className="font-mono text-base font-bold tracking-wider">{box.code}</div>
          </div>
          <div className="pl-2 text-right text-[10px] leading-tight">
            <div className="font-bold">{box.boxType} {box.stems} St ({p.stemsPerBunch} St/Bu)</div>
            <div>{BOX_SIZE[box.boxType]}</div>
            <div>LOT # <span className="text-2xl font-bold leading-none">{box.lot}</span></div>
            <div>PO {po.number}</div>
          </div>
        </div>
      </div>
      <div className="flex w-12 items-center justify-center">
        <Bars code={box.code} vertical className="h-[90%] w-8" />
      </div>
    </div>
  );
}
