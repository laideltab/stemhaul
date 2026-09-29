"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { stemsPerBox } from "@/lib/seed";
import { importerFor, shortName } from "@/lib/market";
import { num } from "@/lib/format";
import type { BoxType, PrebookLine } from "@/lib/types";
import { Button, Card, CardHeader, Field, inputCls, LinkButton, PageHeader } from "@/components/ui";

const BOX_TYPES: BoxType[] = ["HB", "QB", "FB", "EB"];
const LENGTHS = [40, 50, 60, 70, 80, 90];
const blank = (species: string): PrebookLine => ({ species, boxType: "HB", boxes: 1 });

export default function NewPrebook() {
  const s = useStore();
  const router = useRouter();
  const { importer } = importerFor(s, s.session!.orgId);
  const species = [...new Set(s.products.map((p) => p.species))].sort();
  const [soonest] = useState(() => new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));
  const [neededBy, setNeededBy] = useState(() => new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10));
  const [lines, setLines] = useState<PrebookLine[]>([{ ...blank("Rose"), color: "Red", lengthCm: 50 }]);
  const [note, setNote] = useState("");
  const [weekly, setWeekly] = useState(false);
  const [error, setError] = useState("");
  const its = importer ? shortName(importer) : "your importer";

  const edit = (i: number, patch: Partial<PrebookLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const colorsFor = (sp: string) => [...new Set(s.products.filter((p) => p.species === sp).map((p) => p.color))];
  const totalBoxes = lines.reduce((a, l) => a + l.boxes, 0);
  const totalStems = lines.reduce((a, l) => a + l.boxes * stemsPerBox(l.species, l.boxType), 0);

  const send = () => {
    const id = s.createPrebook({ neededBy, note: note.trim() || undefined, weekly, lines: lines.map((l) => ({ ...l, color: l.color?.trim() || undefined })) });
    if (!id) return setError("Add at least one box.");
    router.push("/f/prebooks");
  };

  return (
    <>
      <PageHeader
        title="New prebook"
        sub={`Tell ${its} what you need and when. No farm to pick: ${its} finds the flowers, confirms the price and ships them with your other boxes.`}
        actions={<LinkButton variant="secondary" href="/f/prebooks">My prebooks</LinkButton>}
      />
      <div className="grid max-w-4xl gap-6">
        <Card>
          <CardHeader title="What you need" sub="Leave color or length on Any and let them choose the best they can get." />
          <div className="grid gap-3 p-4">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1.3fr_1fr_0.9fr_0.8fr_0.7fr_0.9fr_auto] sm:items-end">
                <Field label="Flower">
                  <select className={inputCls} value={l.species} onChange={(e) => edit(i, { species: e.target.value, color: undefined, lengthCm: undefined })}>
                    {species.map((sp) => <option key={sp}>{sp}</option>)}
                  </select>
                </Field>
                <Field label="Color">
                  <select className={inputCls} value={l.color ?? ""} onChange={(e) => edit(i, { color: e.target.value || undefined })}>
                    <option value="">Any</option>
                    {colorsFor(l.species).map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Length">
                  <select className={inputCls} value={l.lengthCm ?? ""} onChange={(e) => edit(i, { lengthCm: +e.target.value || undefined })}>
                    <option value="">Any</option>
                    {LENGTHS.map((n) => <option key={n} value={n}>{n} cm</option>)}
                  </select>
                </Field>
                <Field label="Box">
                  <select className={inputCls} value={l.boxType} onChange={(e) => edit(i, { boxType: e.target.value as BoxType })}>
                    {BOX_TYPES.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Boxes">
                  <input type="number" min={1} className={inputCls} value={l.boxes} onChange={(e) => edit(i, { boxes: Math.max(0, +e.target.value | 0) })} />
                </Field>
                <Field label="Target $/stem">
                  <input
                    type="number" step="0.01" min={0} placeholder="Optional" className={inputCls}
                    defaultValue={l.targetCents ? (l.targetCents / 100).toFixed(2) : ""}
                    onBlur={(e) => edit(i, { targetCents: Math.round(+e.target.value * 100) || undefined })}
                  />
                </Field>
                <button
                  className="col-span-2 flex h-9 items-center justify-center gap-1 rounded-lg text-sm text-muted hover:bg-surface-2 hover:text-bad disabled:opacity-40 sm:col-span-1 sm:w-9"
                  aria-label={`Remove line ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}
                >
                  <Trash2 size={16} /><span className="sm:hidden">Remove</span>
                </button>
                <div className="col-span-2 text-xs text-muted sm:col-span-7">≈ {num(l.boxes * stemsPerBox(l.species, l.boxType))} stems ({stemsPerBox(l.species, l.boxType)} per {l.boxType})</div>
              </div>
            ))}
            <div><Button variant="secondary" onClick={() => setLines([...lines, blank(lines.at(-1)?.species ?? "Rose")])}><Plus size={16} /> Add a flower</Button></div>
          </div>
        </Card>

        <Card className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Needed in my shop by">
            <input type="date" className={inputCls} value={neededBy} min={soonest} onChange={(e) => setNeededBy(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" className="size-4 accent-brand" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} />
            Standing order: I need this every week
          </label>
          <Field label={`Note for ${its}`} className="sm:col-span-2">
            <textarea className={`${inputCls} h-20 py-2`} placeholder="e.g. For a wedding, any red works, need them open" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </Card>

        {error && <div className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="text-sm text-muted">{totalBoxes} boxes · ≈ {num(totalStems)} stems · nothing is charged until {its} confirms</span>
          <Button className="h-11" disabled={!totalBoxes} onClick={send}>Send to {its}</Button>
        </div>
      </div>
    </>
  );
}
