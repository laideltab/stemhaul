"use client";

import { Minus, Plus } from "lucide-react";
import type { MarketOrder } from "@/lib/types";
import type { Stage } from "@/lib/market";
import { cn } from "@/lib/format";
import { Badge } from "@/components/ui";

/** Petal colors for the product swatches and card bands. */
export const FLOWER_COLOR: Record<string, string> = {
  Red: "#9b1d2e", White: "#e8e2d4", "Hot pink": "#c4467b", Pink: "#d77ea3", Yellow: "#d68a2b", Lavender: "#6c4a8c",
  Purple: "#6a3d8d", Blue: "#4a6fa5", Mixed: "#a0765a", Green: "#6b8f71",
};
const light = new Set(["White"]);

export function FlowerBand({ color, children, className }: { color: string; children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("flex h-16 items-end px-4 pb-2 text-xs font-medium", light.has(color) ? "text-[#4a4538]" : "text-white/90", className)}
      style={{ background: FLOWER_COLOR[color] ?? "#8a8f86" }}
    >
      {children}
    </div>
  );
}

export function Swatch({ color }: { color: string }) {
  return <span className="inline-block size-3 shrink-0 rounded-full border border-black/10" style={{ background: FLOWER_COLOR[color] ?? "#8a8f86" }} />;
}

export function Stepper({ value, max, onChange, unit }: { value: number; max: number; onChange: (n: number) => void; unit: string }) {
  return (
    <div className="inline-flex h-9 items-center rounded-lg border border-line bg-surface">
      <button className="grid h-full w-9 place-items-center hover:bg-surface-2 disabled:opacity-40" onClick={() => onChange(value - 1)} disabled={value <= 0} aria-label="One box less">
        <Minus size={15} />
      </button>
      <span className="min-w-14 text-center text-sm font-semibold tabular-nums">{value} {unit}</span>
      <button className="grid h-full w-9 place-items-center hover:bg-surface-2 disabled:opacity-40" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="One box more">
        <Plus size={15} />
      </button>
    </div>
  );
}

/** How the florist sees an order's state. */
export function FloristOrderBadge({ order, stages }: { order: MarketOrder; stages: Stage[] }) {
  if (order.status === "pending") return <Badge tone="warn">Waiting for farm</Badge>;
  if (order.status === "declined") return <Badge tone="bad">Declined</Badge>;
  if (order.status === "cancelled") return <Badge>Cancelled</Badge>;
  const last = [...stages].reverse().find((s) => s.done)!;
  const partly = order.lines.some((l) => (l.confirmedBoxes ?? 0) < l.boxes);
  return <Badge tone={last.label === "At your shop" ? "good" : last.label === "Farm confirmed" ? "brand" : "info"}>{last.label === "Farm confirmed" && partly ? "Partly confirmed" : last.label}</Badge>;
}

export function Tracker({ stages }: { stages: Stage[] }) {
  return (
    <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {stages.map((st, i) => (
        <li key={st.label} className="flex gap-2 lg:block">
          <div className="flex items-center gap-2">
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold", st.done ? "border-brand bg-brand text-brand-fg" : "border-line text-muted")}>
              {st.done ? "✓" : i + 1}
            </span>
            <span className={cn("hidden h-0.5 flex-1 lg:block", stages[i + 1]?.done ? "bg-brand" : "bg-line", i === stages.length - 1 && "invisible")} />
          </div>
          <div className="lg:mt-2">
            <div className={cn("text-sm font-semibold", !st.done && "text-muted")}>{st.label}</div>
            {st.sub && <div className="text-xs text-muted">{st.sub}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-brand" : "bg-line")}>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}
