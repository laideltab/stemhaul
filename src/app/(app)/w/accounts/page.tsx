"use client";

import { useStore } from "@/lib/store";
import { date, money } from "@/lib/format";
import { Button, Card, CardHeader, PageHeader, Stat, Status, Table } from "@/components/ui";

export default function Accounts() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const today = new Date().toISOString().slice(0, 10);
  const invoices = s.invoices.filter((i) => i.wholesalerId === orgId && i.paidCents < i.totalCents).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const bills = s.bills.filter((b) => b.ownerOrgId === orgId && b.paidCents < b.totalCents).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const ar = invoices.reduce((a, i) => a + i.totalCents - i.paidCents, 0);
  const ap = bills.reduce((a, b) => a + b.totalCents - b.paidCents, 0);
  const overdue = invoices.filter((i) => i.dueDate < today).reduce((a, i) => a + i.totalCents - i.paidCents, 0);

  const byCustomer = new Map<string, number>();
  for (const i of invoices) byCustomer.set(i.customerId, (byCustomer.get(i.customerId) ?? 0) + i.totalCents - i.paidCents);

  return (
    <>
      <PageHeader title="Receivables & Payables" sub="What customers owe you and what you owe farms and cargo agencies." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Receivable (A/R)" value={money(ar)} sub={`${invoices.length} open invoices`} />
        <Stat label="Overdue A/R" value={money(overdue)} tone={overdue ? "bad" : undefined} />
        <Stat label="Payable (A/P)" value={money(ap)} sub={`${bills.length} open bills`} />
        <Stat label="Net position" value={money(ar - ap)} tone={ar - ap >= 0 ? "good" : "bad"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Customers owe you" sub={[...byCustomer].map(([c, v]) => `${s.contacts.find((x) => x.id === c)?.name} ${money(v)}`).join(" · ")} />
          <Table>
            <thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th className="num">Balance</th><th /></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className="font-medium">{i.number}</td>
                  <td>{s.contacts.find((c) => c.id === i.customerId)?.name}</td>
                  <td>{date(i.dueDate)} {i.dueDate < today && <Status value="overdue" />}</td>
                  <td className="num">{money(i.totalCents - i.paidCents)}</td>
                  <td className="text-right"><Button variant="secondary" className="h-7 px-2 text-xs" onClick={() => s.recordPayment(i.id, i.totalCents - i.paidCents)}>Record payment</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="You owe" />
          <Table>
            <thead><tr><th>Vendor</th><th>Reference</th><th>Due</th><th className="num">Balance</th><th /></tr></thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.vendor}</td>
                  <td className="text-muted">{b.reference}</td>
                  <td>{date(b.dueDate)} {b.dueDate < today && <Status value="overdue" />}</td>
                  <td className="num">{money(b.totalCents - b.paidCents)}</td>
                  <td className="text-right"><Button variant="secondary" className="h-7 px-2 text-xs" onClick={() => s.payBill(b.id)}>Pay</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
