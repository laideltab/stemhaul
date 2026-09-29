"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { date, money } from "@/lib/format";
import type { Invoice, PaymentMethod } from "@/lib/types";
import { Button, Card, CardHeader, Field, inputCls, PageHeader, Stat, Status, Table } from "@/components/ui";

const METHODS: PaymentMethod[] = ["Cash", "Check", "Zelle", "Wire", "Credit card", "Cash shipping"];

function PaymentForm({ invoice, customer, onDone }: { invoice: Invoice; customer: string; onDone: () => void }) {
  const recordPayment = useStore((s) => s.recordPayment);
  const balance = invoice.totalCents - invoice.paidCents;
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState((balance / 100).toFixed(2));
  const [method, setMethod] = useState<PaymentMethod>("Zelle");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const cents = Math.max(0, Math.round((parseFloat(amount) || 0) * 100));
  const applied = Math.min(cents, balance);
  return (
    <form
      className="grid gap-3 border-t border-line bg-surface-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!applied) return;
        recordPayment(invoice.id, { date: day, amountCents: applied, method, reference, note: note || undefined });
        onDone();
      }}
    >
      <div className="text-sm font-semibold">Record payment · {invoice.number} · {customer}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Date"><input type="date" className={inputCls} value={day} onChange={(e) => setDay(e.target.value)} /></Field>
        <Field label="Amount to collect"><input inputMode="decimal" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Method">
          <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Reference"><input className={inputCls} placeholder="Check # / confirmation" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
      </div>
      <Field label="Internal note"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-muted">Collectible balance</div><div className="num font-semibold">{money(balance)}</div></div>
        <div><div className="text-muted">Applied to invoice</div><div className="num font-semibold">{money(applied)}</div></div>
        <div><div className="text-muted">Remaining balance</div><div className="num font-semibold">{money(balance - applied)}</div></div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={!applied}>Save payment</Button>
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export default function Accounts() {
  const s = useStore();
  const [paying, setPaying] = useState<string | null>(null);
  const orgId = s.session!.orgId;
  const today = new Date().toISOString().slice(0, 10);
  const invoices = s.invoices.filter((i) => i.wholesalerId === orgId && i.paidCents < i.totalCents).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const bills = s.bills.filter((b) => b.ownerOrgId === orgId && b.paidCents < b.totalCents).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const ar = invoices.reduce((a, i) => a + i.totalCents - i.paidCents, 0);
  const ap = bills.reduce((a, b) => a + b.totalCents - b.paidCents, 0);
  const overdue = invoices.filter((i) => i.dueDate < today).reduce((a, i) => a + i.totalCents - i.paidCents, 0);

  const payments = s.invoices
    .filter((i) => i.wholesalerId === orgId)
    .flatMap((i) => i.payments.map((p) => ({ ...p, invoice: i })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);
  const payingInvoice = invoices.find((i) => i.id === paying);

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
                  <td className="text-right"><Button variant="secondary" className="h-7 px-2 text-xs" onClick={() => setPaying(i.id)}>Record payment</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
          {payingInvoice && (
            <PaymentForm
              key={payingInvoice.id}
              invoice={payingInvoice}
              customer={s.contacts.find((c) => c.id === payingInvoice.customerId)?.name ?? ""}
              onDone={() => setPaying(null)}
            />
          )}
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
      <Card className="mt-6">
        <CardHeader title="Payments received" sub="Latest customer payments with method and reference." />
        <Table>
          <thead><tr><th>Date</th><th>Customer</th><th>Invoice</th><th>Method</th><th>Reference</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{date(p.date)}</td>
                <td>{s.contacts.find((c) => c.id === p.invoice.customerId)?.name}</td>
                <td className="font-medium">{p.invoice.number}</td>
                <td>{p.method}</td>
                <td className="text-muted">{p.reference || "—"}{p.note ? ` · ${p.note}` : ""}</td>
                <td className="num">{money(p.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
