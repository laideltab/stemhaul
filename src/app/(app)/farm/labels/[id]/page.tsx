"use client";

import { use, useEffect } from "react";
import { Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Empty, LinkButton, PageHeader } from "@/components/ui";
import { BoxLabel } from "@/components/box-label";

export default function Labels({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = useStore();
  const po = s.pos.find((p) => p.id === id);
  const { printLabels } = s;
  // Opening this page is the "print" step: boxes on an AWB get their label codes.
  useEffect(() => {
    if (po && ["confirmed", "booked"].includes(po.status)) printLabels({ poId: id });
  }, [po?.status, po, id, printLabels]);
  if (!po) return <Empty>Order not found.</Empty>;
  const boxes = s.boxes.filter((b) => b.poId === po.id).sort((a, b) => a.lot - b.lot);

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={`Labels · ${po.number}`}
          sub="4x6 in thermal labels, one per box. The barcode is what Lucy's scans in Miami and the florist scans at the shop."
          actions={<><LinkButton variant="secondary" href="/farm">Back</LinkButton>{process.env.NEXT_PUBLIC_STATIC_DEMO !== "1" && <Button onClick={() => window.print()}><Printer size={16} /> Print</Button>}</>}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 print:block">
        {boxes.map((b) => <BoxLabel key={b.id} box={b} />)}
      </div>
      {!boxes.length && <Empty>Labels can be printed once the order is on an AWB.</Empty>}
    </>
  );
}
