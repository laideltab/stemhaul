"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { dateTime, money } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Notice, PageHeader, Status, Table } from "@/components/ui";

export default function QuickBooks() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const org = s.orgs.find((o) => o.id === orgId)!;
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  const batches = s.qb.filter((q) => q.orgId === orgId).sort((a, b) => b.at.localeCompare(a.at));
  const errors = batches.filter((b) => b.status === "error").length;

  return (
    <>
      <PageHeader
        title="QuickBooks Sync"
        sub={org.modules.includes("florist") ? "Sales go to QuickBooks Online as one summary per day." : "Invoices (A/R) and farm and freight bills (A/P) go to QuickBooks Online."}
        actions={<Button onClick={() => { const n = s.syncQuickBooks(); setRes({ ok: true, message: n ? `Sent ${n} records to QuickBooks.` : "Everything is already in QuickBooks." }); }}>Sync now</Button>}
      />
      <Card className="mb-6 flex flex-wrap items-center gap-3 p-4">
        <CheckCircle2 className="text-good" size={20} />
        <div className="flex-1">
          <div className="font-medium">Connected to QuickBooks Online</div>
          <div className="text-sm text-muted">Company: {org.name} LLC (sandbox, demo)</div>
        </div>
        {errors > 0 && <Badge tone="bad">{errors} failed</Badge>}
      </Card>
      <div className="mb-4"><Notice result={res} /></div>
      <Card>
        <CardHeader title="Sync history" />
        <Table>
          <thead><tr><th>Sent</th><th>Type</th><th>Description</th><th className="num">Records</th><th className="num">Amount</th><th>Status</th></tr></thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td className="whitespace-nowrap">{dateTime(b.at)}</td>
                <td className="capitalize">{b.kind}</td>
                <td>{b.description}{b.status === "error" && <div className="text-xs text-bad">QuickBooks rejected it: tax code missing. Sync again to retry.</div>}</td>
                <td className="num">{b.count}</td>
                <td className="num">{money(b.totalCents)}</td>
                <td><Status value={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
