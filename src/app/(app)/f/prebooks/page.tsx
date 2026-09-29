"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Repeat, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { stemsPerBox } from "@/lib/seed";
import { cn, date, money, perStem, time } from "@/lib/format";
import { importerFor, shortName } from "@/lib/market";
import { askLabel, lineStage, prebookTotals } from "@/lib/prebook";
import type { Prebook, PrebookLine } from "@/lib/types";
import { Badge, Button, Card, Empty, LinkButton, PageHeader, Table } from "@/components/ui";

function PrebookStatus({ pb }: { pb: Prebook }) {
  return pb.status === "requested" ? <Badge tone="warn">Waiting for answer</Badge> : pb.status === "confirmed" ? <Badge tone="brand">Confirmed</Badge> : <Badge tone="bad">Could not source</Badge>;
}

export default function FloristPrebooks() {
  const s = useStore();
  const router = useRouter();
  const orgId = s.session!.orgId;
  const { importer } = importerFor(s, orgId);
  const its = importer ? shortName(importer) : "your importer";
  const all = s.prebooks.filter((p) => p.floristOrgId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [pick, setPick] = useState<string | null>(null);
  const pb = all.find((x) => x.id === pick) ?? all[0];

  const product = (id?: string) => s.products.find((p) => p.id === id);
  const stems = (l: PrebookLine) => stemsPerBox(product(l.sourcedProductId)?.species ?? l.species, l.boxType);
  const sourceOf = (l: PrebookLine) => (l.source === "stock" ? `${its} Miami stock` : s.orgs.find((o) => o.id === l.farmId)?.name ?? "");

  return (
    <>
      <PageHeader
        title="Prebooks"
        sub={`Ask ${its} for flowers without picking a farm. They find them, confirm the price, and they arrive with your other boxes.`}
        actions={<><LinkButton variant="secondary" href="/f/market">Farm map</LinkButton><LinkButton href="/f/prebooks/new">New prebook</LinkButton></>}
      />
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="grid h-fit gap-3">
          {all.map((x) => {
            const t = prebookTotals(x, stems);
            return (
              <button key={x.id} onClick={() => setPick(x.id)} className={cn("rounded-xl border bg-surface p-3 text-left", x.id === pb?.id ? "border-accent ring-1 ring-accent" : "border-line hover:bg-surface-2")}>
                <div className="flex justify-between gap-2"><span className="font-semibold">{x.number}</span><PrebookStatus pb={x} /></div>
                <div className="text-sm text-muted">{x.lines.map((l) => `${l.boxes} ${l.boxType} ${l.species.toLowerCase()}`).join(" + ")}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                  Needed {date(x.neededBy)}{x.weekly && <span className="inline-flex items-center gap-1"><Repeat size={12} /> weekly</span>}
                  {x.status === "confirmed" && <span className="ml-auto font-medium text-fg">{money(t.cents)}</span>}
                </div>
              </button>
            );
          })}
          {!all.length && <Card><Empty>No prebooks yet.</Empty></Card>}
        </div>

        {pb ? (
          <div className="grid min-w-0 gap-4">
            {pb.status === "requested" && (
              <Card className="flex gap-4 border-warn/40 bg-warn-soft/60 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warn text-white"><Clock size={20} /></span>
                <div>
                  <div className="font-semibold">{its} is finding your flowers</div>
                  <p className="text-sm text-muted">Sent {date(pb.createdAt)} at {time(pb.createdAt)}. They will confirm the boxes and the price per stem; nothing is charged before that.</p>
                </div>
              </Card>
            )}
            {pb.status === "confirmed" && (
              <Card className="flex gap-4 border-brand/30 bg-brand-soft/60 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-brand-fg"><Check size={20} /></span>
                <div>
                  <div className="font-semibold">{its} confirmed {prebookTotals(pb, stems).confirmed} of {prebookTotals(pb, stems).asked} boxes</div>
                  <p className="text-sm text-muted">{pb.answerNote ? `"${pb.answerNote}" ` : ""}They will invoice you {money(prebookTotals(pb, stems).cents)} when the boxes are delivered.</p>
                </div>
              </Card>
            )}
            {pb.status === "declined" && (
              <Card className="flex gap-4 border-bad/30 bg-bad-soft/60 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bad text-white"><X size={20} /></span>
                <div>
                  <div className="font-semibold">{its} could not source this one</div>
                  <p className="text-sm text-muted">{pb.answerNote ? `"${pb.answerNote}" ` : ""}Nothing was charged.</p>
                </div>
              </Card>
            )}

            <Card>
              <Table>
                <thead><tr><th>You asked</th><th className="num">Boxes</th><th>{its} sends</th><th className="num">Per stem</th><th className="num">Total</th><th>Status</th></tr></thead>
                <tbody>
                  {pb.lines.map((l, i) => {
                    const p = product(l.sourcedProductId);
                    const stage = lineStage(s, l);
                    return (
                      <tr key={i}>
                        <td>
                          <div className="font-medium">{askLabel(l)}</div>
                          {l.targetCents && <div className="text-xs text-muted">Target {perStem(l.targetCents)}</div>}
                        </td>
                        <td className="num">{l.confirmedBoxes !== undefined && l.confirmedBoxes !== l.boxes ? <><s className="text-muted">{l.boxes}</s> {l.confirmedBoxes}</> : l.boxes} {l.boxType}</td>
                        <td>{p && l.confirmedBoxes ? <><div>{p.variety} {p.color.toLowerCase()} {p.lengthCm} cm</div><div className="text-xs text-muted">{sourceOf(l)}</div></> : "—"}</td>
                        <td className="num">{l.priceCents && l.confirmedBoxes ? perStem(l.priceCents) : "—"}</td>
                        <td className="num">{l.priceCents && l.confirmedBoxes ? money(l.confirmedBoxes * stems(l) * l.priceCents) : "—"}</td>
                        <td><Badge tone={stage.tone}>{stage.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4 text-sm">
                <h3 className="font-semibold">{pb.number}</h3>
                <p>Needed in your shop by {date(pb.neededBy)}{pb.weekly ? " · standing order, every week" : ""}</p>
                {pb.note && <p className="text-muted">Your note: {pb.note}</p>}
              </Card>
              <Card className="p-4 text-sm">
                <h3 className="font-semibold">How it arrives</h3>
                <p>{its} ships it on its own AWB with your mark code on every box. Scan the boxes in Receive Boxes when they reach your shop.</p>
              </Card>
            </div>
            {pb.status !== "requested" && (
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => { const id = s.repeatPrebook(pb.id); if (id) setPick(id); }}>
                  <Repeat size={16} /> {pb.weekly ? "Send next week's order" : "Order this again"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card><Empty>Ask {its} for anything you need. <button className="text-brand underline" onClick={() => router.push("/f/prebooks/new")}>New prebook</button></Empty></Card>
        )}
      </div>
    </>
  );
}
