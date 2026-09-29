"use client";

import { LinkButton, PageHeader } from "@/components/ui";
import { FloristOrderList } from "@/components/florist-orders";

export default function MyFarmOrders() {
  return (
    <>
      <PageHeader
        title="My Farm Orders"
        sub="Orders you placed on the farm map. Each one ships with your importer and arrives in Receive Boxes."
        actions={<LinkButton href="/f/market">Back to marketplace</LinkButton>}
      />
      <div className="max-w-2xl"><FloristOrderList /></div>
    </>
  );
}
