"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

const tabs = [
  { href: "/w/purchase-orders/confirm", label: "Confirm POs" },
  { href: "/w/purchase-orders", label: "PO Summary" },
  { href: "/w/freight", label: "AWB Summary" },
  { href: "/w/freight/add", label: "Add AWB" },
];

/** Same sub-menu Komet shows under Purchase Orders. */
export function POTabs() {
  const path = usePathname();
  return (
    <div className="no-print -mt-2 mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm",
            path === t.href ? "border-brand font-medium text-brand" : "border-transparent text-muted hover:text-fg",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
