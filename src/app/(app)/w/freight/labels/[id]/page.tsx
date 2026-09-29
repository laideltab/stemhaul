"use client";

import { use, useEffect } from "react";
import { Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Empty, LinkButton, PageHeader } from "@/components/ui";
import { BoxLabel } from "@/components/box-label";

export default function AwbLabels({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = useStore();
  const awb = s.awbs.find((a) => a.id === id);
  const { printLabels } = s;
  // Opening this page is the "print" step: boxes get their label codes.
  useEffect(() => {
    if (awb?.status === "open") printLabels({ awbId: id });
  }, [awb?.status, id, printLabels]);
  if (!awb) return <Empty>AWB not found.</Empty>;
  const boxes = s.boxes.filter((b) => b.awbId === id).sort((a, b) => a.lot - b.lot);

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={`Labels · AWB ${awb.number}`}
          sub={`${boxes.length} labels, one per box, 4x6 in thermal.`}
          actions={<><LinkButton variant="secondary" href="/w/freight">Back to AWB Summary</LinkButton>{process.env.NEXT_PUBLIC_STATIC_DEMO !== "1" && <Button onClick={() => window.print()}><Printer size={16} /> Print</Button>}</>}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 print:block">
        {boxes.map((b) => <BoxLabel key={b.id} box={b} />)}
      </div>
    </>
  );
}
