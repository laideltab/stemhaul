"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const btn: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:bg-brand/90",
  secondary: "bg-surface border border-line text-fg hover:bg-surface-2",
  ghost: "text-fg hover:bg-surface-2",
  danger: "bg-bad text-white hover:bg-bad/90",
};
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 h-9 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

export function Button({ variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(btnBase, btn[variant], className)} {...p} />;
}

export function LinkButton({ variant = "primary", className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(btnBase, btn[variant], className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cn("min-w-0 rounded-xl border border-line bg-surface", className)} {...p} />;
}

export function CardHeader({ title, action, sub }: { title: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div>
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "info" | "brand";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  brand: "bg-brand-soft text-brand",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone])}>{children}</span>;
}

const statusTone: Record<string, Tone> = {
  draft: "neutral", sent: "info", confirmed: "brand", labeled: "warn", shipped: "info", received: "good",
  in_transit: "info", delivered: "good", missing: "bad", damaged: "bad",
  booked: "neutral", departed: "info", arrived: "good",
  new: "warn", preparing: "info", ready: "brand",
  paid: "good", open: "warn", overdue: "bad", partial: "info",
  active: "good", trial: "info", past_due: "bad", error: "bad",
};
export function Status({ value }: { value: string }) {
  return <Badge tone={statusTone[value] ?? "neutral"}>{value.replace("_", " ")}</Badge>;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "bad" | "good" }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={cn("mt-1 font-display text-2xl font-semibold tabular-nums", tone === "bad" && "text-bad", tone === "good" && "text-good")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted [&_td]:px-4 [&_td]:py-2.5 [&_tbody_tr]:border-t [&_tbody_tr]:border-line [&_th.num]:text-right [&_td.num]:text-right [&_td.num]:tabular-nums">
        {children}
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-muted">{children}</div>;
}

export const inputCls =
  "h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1 text-sm", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Notice({ result }: { result: { ok: boolean; message: string } | null }) {
  if (!result || !result.message) return null;
  return (
    <div className={cn("rounded-lg px-3 py-2 text-sm", result.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad")}>{result.message}</div>
  );
}
