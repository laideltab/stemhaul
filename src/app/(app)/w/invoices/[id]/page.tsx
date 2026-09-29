"use client";

import { use } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { date, money, num, perStem } from "@/lib/format";
import { Button, Card, Empty, LinkButton, Status, Table } from "@/components/ui";

export default function InvoiceView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = useStore();
  const inv = s.invoices.find((i) => i.id === id && i.wholesalerId === s.session!.orgId);
  if (!inv) return <Empty>Invoice not found. <Link className="text-brand underline" href="/w/deliveries">Back to Deliveries &amp; Invoices</Link></Empty>;
  const seller = s.orgs.find((o) => o.id === inv.wholesalerId)!;
  const cust = s.contacts.find((c) => c.id === inv.customerId);
  const buyer = s.orgs.find((o) => o.id === cust?.linkedOrgId);
  const balance = inv.totalCents - inv.paidCents;
  const status = inv.paidCents >= inv.totalCents ? "paid" : inv.paidCents > 0 ? "partial" : new Date(inv.dueDate) < new Date() ? "overdue" : "open";
  const boxes = inv.lines.map((l) => s.boxes.find((b) => b.id === l.boxId));

  return (
    <>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-2">
        <LinkButton variant="secondary" href="/w/deliveries">Back to invoices</LinkButton>
        <div className="flex flex-wrap gap-2">
          {balance > 0 && <LinkButton variant="secondary" href="/w/accounts">Record a payment</LinkButton>}
          <Button onClick={() => window.print()}><Printer size={16} /> Print or save PDF</Button>
        </div>
      </div>
      <Card className="mx-auto max-w-4xl p-6 print:border-0 print:p-0 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="font-display text-xl font-semibold">{seller.name}</div>
            <div className="text-sm text-muted">{seller.address}<br />{seller.phone}</div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-semibold tracking-tight">INVOICE</div>
            <div className="font-mono text-sm">{inv.number}</div>
            <div className="mt-1"><Status value={status} /></div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 border-y border-line py-4 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">Bill to</div>
            <div className="font-medium">{cust?.name}</div>
            <div className="text-muted">Customer code {cust?.code}{buyer?.address ? <><br />{buyer.address}</> : buyer?.city ? <><br />{buyer.city}</> : null}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">Invoice date</div>
            <div>{date(inv.date)}</div>
            <div className="mt-2 text-xs uppercase tracking-wide text-muted">Due date</div>
            <div>{date(inv.dueDate)} · {cust?.terms ?? "Net 15"}</div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs uppercase tracking-wide text-muted">Balance due</div>
            <div className="font-display text-2xl font-semibold tabular-nums">{money(balance)}</div>
          </div>
        </div>
        <Table className="-mx-4 mt-4">
          <thead><tr><th>Box label</th><th>Description</th><th className="num">Stems</th><th className="num">Per stem</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={l.boxId}>
                <td className="font-mono text-xs">{boxes[i]?.code ?? "—"}</td>
                <td>{l.description}{boxes[i]?.hawb && <div className="text-xs text-muted">House AWB {boxes[i]!.hawb}</div>}</td>
                <td className="num">{num(l.stems)}</td>
                <td className="num">{perStem(l.pricePerStemCents)}</td>
                <td className="num">{money(l.stems * l.pricePerStemCents)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <dl className="ml-auto mt-4 grid max-w-xs grid-cols-[1fr_auto] gap-y-1.5 text-sm">
          <dt className="text-muted">{inv.lines.length} box{inv.lines.length === 1 ? "" : "es"} · {num(inv.lines.reduce((a, l) => a + l.stems, 0))} stems</dt><dd className="tabular-nums">{money(inv.totalCents)}</dd>
          {inv.payments.map((p) => (
            <div key={p.id} className="contents text-muted">
              <dt>Paid {date(p.date)} · {p.method}{p.reference ? ` ${p.reference}` : ""}</dt><dd className="tabular-nums">−{money(p.amountCents)}</dd>
            </div>
          ))}
          {!inv.payments.length && inv.paidCents > 0 && <><dt className="text-muted">Paid</dt><dd className="tabular-nums">−{money(inv.paidCents)}</dd></>}
          <dt className="border-t border-line pt-2 font-semibold">Balance due</dt><dd className="border-t border-line pt-2 font-semibold tabular-nums">{money(balance)}</dd>
        </dl>
        <p className="mt-8 text-xs text-muted">Flowers delivered in Miami. Freight, customs and delivery included. Thank you for your business.</p>
      </Card>
    </>
  );
}
