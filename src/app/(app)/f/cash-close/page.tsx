"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { dateTime, money, time } from "@/lib/format";
import { shiftTotals } from "@/lib/selectors";
import { Badge, Button, Card, CardHeader, Empty, Field, inputCls, PageHeader, Stat, Table } from "@/components/ui";

const denoms = [10000, 5000, 2000, 1000, 500, 100, 25, 10, 5, 1];

function CloseForm({ shiftId }: { shiftId: string }) {
  const s = useStore();
  const shift = s.shifts.find((x) => x.id === shiftId)!;
  const t = shiftTotals(s, shift);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [note, setNote] = useState("");
  const counted = denoms.reduce((a, d) => a + d * (counts[d] ?? 0), 0);
  const diff = counted - t.expectedCash;
  const who = s.users.find((u) => u.id === shift.cashierId)!;

  return (
    <Card>
      <CardHeader title={`${who.name}'s drawer`} sub={`Opened ${time(shift.openedAt)} · ${t.count} sales`} />
      <div className="grid gap-6 p-4 md:grid-cols-2">
        <div>
          <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-muted">Opening float</dt><dd className="text-right tabular-nums">{money(shift.openingFloatCents)}</dd>
            <dt className="text-muted">Cash sales</dt><dd className="text-right tabular-nums">{money(t.cash)}</dd>
            <dt className="font-medium">Cash expected</dt><dd className="text-right font-medium tabular-nums">{money(t.expectedCash)}</dd>
            <dt className="mt-2 text-muted">Card sales</dt><dd className="mt-2 text-right tabular-nums">{money(t.card)}</dd>
            <dt className="text-muted">On account</dt><dd className="text-right tabular-nums">{money(t.account)}</dd>
          </dl>
          <div className={`mt-4 rounded-lg p-3 text-sm ${counted === 0 ? "bg-surface-2" : diff === 0 ? "bg-good-soft text-good" : diff < 0 ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"}`}>
            <div className="flex justify-between font-medium"><span>Counted</span><span className="tabular-nums">{money(counted)}</span></div>
            <div className="flex justify-between"><span>Difference</span><span className="tabular-nums">{counted === 0 ? "—" : `${diff > 0 ? "+" : ""}${money(diff)}`}</span></div>
          </div>
        </div>
        <div>
          <div className="grid grid-cols-2 gap-2">
            {denoms.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <span className="w-14 text-right text-muted">{d >= 100 ? `$${d / 100}` : `${d}¢`}</span>
                <input type="number" min={0} className={`${inputCls} h-8`} value={counts[d] ?? ""} placeholder="0" onChange={(e) => setCounts({ ...counts, [d]: Math.max(0, +e.target.value | 0) })} />
              </label>
            ))}
          </div>
          <Field label="Note" className="mt-3"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder={diff < 0 ? "Explain the difference" : ""} /></Field>
          <Button className="mt-3 w-full" disabled={counted === 0} onClick={() => s.closeShift(shift.id, counted, note)}>Close drawer</Button>
        </div>
      </div>
    </Card>
  );
}

export default function CashClose() {
  const s = useStore();
  const orgId = s.session!.orgId;
  const open = s.shifts.filter((x) => x.orgId === orgId && !x.closedAt);
  const closed = s.shifts.filter((x) => x.orgId === orgId && x.closedAt).sort((a, b) => b.closedAt!.localeCompare(a.closedAt!));
  const cashiers = [...new Set(closed.map((x) => x.cashierId))];
  const summary = cashiers.map((c) => {
    const shifts = closed.filter((x) => x.cashierId === c);
    const diffs = shifts.map((x) => shiftTotals(s, x).diff ?? 0);
    return { c, shifts: shifts.length, short: diffs.filter((d) => d < 0).length, net: diffs.reduce((a, d) => a + d, 0) };
  });
  const totalShort = summary.reduce((a, x) => a + Math.min(0, x.net), 0);

  return (
    <>
      <PageHeader title="Cash Close" sub="Each cashier counts their own drawer. Stemhaul compares it against what they sold in cash." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open drawers" value={open.length} />
        <Stat label="Closed shifts" value={closed.length} sub="Last 7 days" />
        {summary.map((x) => (
          <Stat key={x.c} label={s.users.find((u) => u.id === x.c)!.name} value={`${x.net > 0 ? "+" : ""}${money(x.net)}`} sub={`${x.short} of ${x.shifts} shifts short`} tone={x.net < 0 ? "bad" : "good"} />
        ))}
      </div>
      {totalShort < 0 && <p className="mb-4 text-sm text-bad">Drawers came up {money(-totalShort)} short this week.</p>}
      <div className="grid gap-6">
        {open.map((x) => <CloseForm key={x.id} shiftId={x.id} />)}
        {!open.length && <Card><Empty>No open drawers. Cashiers open one from the POS.</Empty></Card>}
        <Card>
          <CardHeader title="Closed shifts" />
          <Table>
            <thead><tr><th>Cashier</th><th>Closed</th><th className="num">Sales</th><th className="num">Cash expected</th><th className="num">Counted</th><th className="num">Difference</th><th>Note</th></tr></thead>
            <tbody>
              {closed.map((x) => {
                const t = shiftTotals(s, x);
                return (
                  <tr key={x.id}>
                    <td className="font-medium">{s.users.find((u) => u.id === x.cashierId)?.name}</td>
                    <td className="whitespace-nowrap">{dateTime(x.closedAt!)}</td>
                    <td className="num">{money(t.total)}</td>
                    <td className="num">{money(t.expectedCash)}</td>
                    <td className="num">{money(x.countedCashCents ?? 0)}</td>
                    <td className="num">{t.diff === 0 ? <Badge tone="good">Even</Badge> : <Badge tone={t.diff! < 0 ? "bad" : "warn"}>{t.diff! > 0 ? "+" : ""}{money(t.diff!)}</Badge>}</td>
                    <td className="text-muted">{x.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
