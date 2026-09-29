"use client";

import { useStore } from "@/lib/store";
import { date } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, Stat, Status, Table } from "@/components/ui";

export default function LicenseAdmin() {
  const s = useStore();
  const licensed = s.orgs.filter((o) => o.kind !== "farm");
  const farms = s.orgs.filter((o) => o.kind === "farm");

  return (
    <>
      <PageHeader title="License Admin" sub="Every business on Stemhaul. Only the platform owner sees this. Plan prices are not set yet." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Licensed accounts" value={licensed.length} />
        <Stat label="Wholesale module" value={licensed.filter((o) => o.modules.includes("wholesale")).length} />
        <Stat label="Florist module" value={licensed.filter((o) => o.modules.includes("florist")).length} />
        <Stat label="Past due" value={licensed.filter((o) => o.billing === "past_due").length} tone={licensed.some((o) => o.billing === "past_due") ? "bad" : undefined} />
      </div>
      <Card className="mb-6">
        <CardHeader title="Licensed accounts" />
        <Table>
          <thead><tr><th>Business</th><th>City</th><th>Modules</th><th>Plan</th><th className="num">Users</th><th>Since</th><th>Billing</th></tr></thead>
          <tbody>
            {licensed.map((o) => (
              <tr key={o.id}>
                <td className="font-medium">{o.name}</td>
                <td className="text-muted">{o.city}</td>
                <td className="space-x-1">{o.modules.map((m) => <Badge key={m} tone={m === "wholesale" ? "info" : "brand"}>{m}</Badge>)}</td>
                <td>{o.plan}</td>
                <td className="num">{s.users.filter((u) => u.orgId === o.id).length}</td>
                <td>{date(o.since)}</td>
                <td><Status value={o.billing} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card>
        <CardHeader title="Farms (free portal access)" sub="Farms join when a wholesaler sends them a purchase order." />
        <Table>
          <thead><tr><th>Farm</th><th>Location</th><th className="num">Orders received</th><th>Since</th></tr></thead>
          <tbody>
            {farms.map((o) => (
              <tr key={o.id}>
                <td className="font-medium">{o.name}</td>
                <td className="text-muted">{o.city}</td>
                <td className="num">{s.pos.filter((p) => p.farmId === o.id && p.status !== "draft").length}</td>
                <td>{date(o.since)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
