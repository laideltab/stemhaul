"use client";

import { useStore } from "@/lib/store";
import { Badge, Card, CardHeader, PageHeader, Table } from "@/components/ui";
import type { Role } from "@/lib/types";

const perms: Record<Role, string> = {
  owner: "Everything, including reports and cash close for all cashiers",
  purchasing: "Purchase orders, farms, freight",
  warehouse: "Receiving, scanning, inventory, waste",
  cashier: "Point of sale and their own cash drawer",
  accountant: "Receivables, payables and QuickBooks",
  farm: "Farm portal",
};

export default function UsersRoles() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const users = s.users.filter((u) => u.orgId === orgId);
  const roles = [...new Set(users.map((u) => u.role))];

  return (
    <>
      <PageHeader title="Users & Roles" sub="Who can do what in this account." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`${users.length} users`} />
          <Table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td className="text-muted">{u.email}</td>
                  <td className="capitalize">{u.role}</td>
                  <td>{u.active ? <Badge tone="good">Active</Badge> : <Badge>Disabled</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Roles" />
          <ul className="divide-y divide-line text-sm">
            {roles.map((r) => <li key={r} className="px-4 py-2.5"><div className="font-medium capitalize">{r}</div><div className="text-muted">{perms[r]}</div></li>)}
          </ul>
        </Card>
      </div>
    </>
  );
}
