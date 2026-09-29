"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Banknote, Boxes, ClipboardList, Flower2, Gauge, Globe, LayoutGrid, LogOut, Menu, PackageCheck,
  Plane, RefreshCw, ScanLine, ShieldCheck, ShoppingCart, Tag, Truck, Users, Wallet, X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/format";

const noop = () => () => {};
/** False during server render and the first client pass, so persisted demo data never causes a hydration mismatch. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

type NavItem = { href: string; label: string; icon: ReactNode };
const I = (C: typeof Gauge) => <C size={17} strokeWidth={1.8} />;

const wholesaleNav: NavItem[] = [
  { href: "/w", label: "Dashboard", icon: I(Gauge) },
  { href: "/w/purchase-orders", label: "Purchase Orders", icon: I(ClipboardList) },
  { href: "/w/freight", label: "Freight & AWBs", icon: I(Plane) },
  { href: "/w/receiving", label: "Scan Receiving", icon: I(ScanLine) },
  { href: "/w/deliveries", label: "Deliveries & Invoices", icon: I(Truck) },
  { href: "/w/accounts", label: "Receivables & Payables", icon: I(Wallet) },
];
const floristNav: NavItem[] = [
  { href: "/f", label: "Dashboard", icon: I(Gauge) },
  { href: "/f/receive", label: "Receive Boxes", icon: I(PackageCheck) },
  { href: "/f/inventory", label: "Inventory", icon: I(Boxes) },
  { href: "/f/bunches", label: "Make Bunches", icon: I(Flower2) },
  { href: "/f/pos", label: "Point of Sale", icon: I(ShoppingCart) },
  { href: "/f/online", label: "Online Orders", icon: I(Globe) },
  { href: "/f/cash-close", label: "Cash Close", icon: I(Banknote) },
];
const farmNav: NavItem[] = [{ href: "/farm", label: "My Orders & Labels", icon: I(Tag) }];
const commonNav: NavItem[] = [
  { href: "/qb", label: "QuickBooks Sync", icon: I(RefreshCw) },
  { href: "/users", label: "Users & Roles", icon: I(Users) },
];
const adminNav: NavItem[] = [{ href: "/admin", label: "License Admin", icon: I(ShieldCheck) }];

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const session = useStore((s) => s.session);
  const orgs = useStore((s) => s.orgs);
  const users = useStore((s) => s.users);
  const signOut = useStore((s) => s.signOut);
  const resetDemo = useStore((s) => s.resetDemo);
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !session) router.replace("/");
  }, [hydrated, session, router]);

  if (!hydrated || !session) return null;
  const isAdmin = session.orgId === "platform";
  const org = orgs.find((o) => o.id === session.orgId);
  const user = users.find((u) => u.id === session.userId);

  const sections: { title: string; items: NavItem[] }[] = [];
  if (isAdmin) sections.push({ title: "Stemhaul", items: adminNav });
  else if (org?.kind === "farm") sections.push({ title: "Farm portal", items: farmNav });
  else {
    if (org?.modules.includes("wholesale")) sections.push({ title: "Wholesale", items: wholesaleNav });
    if (org?.modules.includes("florist")) sections.push({ title: "Florist shop", items: floristNav });
    sections.push({ title: "Account", items: commonNav });
  }
  const active = (href: string) => (href.length <= 3 || href === "/farm" ? path === href : path.startsWith(href));

  const sidebar = (
    <nav className="flex h-full flex-col bg-sidebar text-sidebar-fg">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid size-8 place-items-center rounded-lg bg-sidebar-active"><Flower2 size={18} className="text-white" /></div>
        <div>
          <div className="font-display text-lg font-semibold leading-none text-white">Stemhaul</div>
          <div className="text-[11px] uppercase tracking-wider text-sidebar-fg/70">Demo</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        {sections.map((s) => (
          <div key={s.title} className="mb-4">
            <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-fg/60">{s.title}</div>
            {s.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-sidebar-active/60",
                  active(it.href) && "bg-sidebar-active text-white",
                )}
              >
                {it.icon}
                {it.label}
              </Link>
            ))}
          </div>
        ))}
        {org && org.kind === "florist" && (
          <Link href="/shop/mari-flowers" target="_blank" className="mb-4 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-sidebar-active/60">
            {I(LayoutGrid)} Web shop (public)
          </Link>
        )}
      </div>
      <div className="border-t border-white/10 p-3 text-sm">
        <div className="px-2 pb-2">
          <div className="font-medium text-white">{isAdmin ? "Laidel" : user?.name}</div>
          <div className="text-xs text-sidebar-fg/70">{isAdmin ? "Platform owner" : `${org?.name} · ${user?.role}`}</div>
        </div>
        <button
          onClick={() => {
            if (confirm("Reset all demo data to the original fake data?")) resetDemo();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-sidebar-active/60"
        >
          <RefreshCw size={16} /> Reset demo data
        </button>
        <button onClick={() => { signOut(); router.push("/"); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-sidebar-active/60">
          <LogOut size={16} /> Switch account
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
          <button className="absolute right-3 top-3 rounded-lg bg-white p-2" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 hover:bg-surface-2"><Menu size={20} /></button>
          <span className="font-display font-semibold">Stemhaul</span>
          <span className="truncate text-sm text-muted">{isAdmin ? "License Admin" : org?.name}</span>
        </div>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
