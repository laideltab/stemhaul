"use client";

import { useRouter } from "next/navigation";
import { Flower2, ShieldCheck, Store, Tractor, Warehouse } from "lucide-react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/components/shell";
import { Card } from "@/components/ui";

const home: Record<string, string> = { wholesaler: "/w", florist: "/f", farm: "/farm" };

export default function DemoSignIn() {
  const hydrated = useHydrated();
  const orgs = useStore((s) => s.orgs);
  const users = useStore((s) => s.users);
  const signIn = useStore((s) => s.signIn);
  const router = useRouter();
  if (!hydrated) return null;

  const go = (orgId: string, userId: string, to: string) => {
    signIn(orgId, userId);
    router.push(to);
  };

  const accounts = [
    { orgId: "org_lucys", icon: <Warehouse size={20} />, blurb: "Importer / wholesaler. Buys from farms, books freight, receives in Miami and delivers to florists." },
    { orgId: "org_mari", icon: <Store size={20} />, blurb: "Florist shop. Receives boxes from Lucy's, makes bunches, sells in store and online, closes cash per cashier." },
    { orgId: "org_esperanza", icon: <Tractor size={20} />, blurb: "Farm portal. Confirms purchase orders and prints box labels." },
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-sidebar text-sidebar-fg">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-lg bg-sidebar-active"><Flower2 size={20} className="text-white" /></div>
            <span className="font-display text-2xl font-semibold text-white">Stem Haul</span>
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">Demo · fake data</span>
          </div>
          <h1 className="mt-6 max-w-2xl font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
            From the farm to the florist&apos;s counter, one box at a time.
          </h1>
          <p className="mt-3 max-w-2xl text-sidebar-fg/80">
            Pick an account to explore. Everything you do is saved in this browser only; use “Reset demo data” in the menu to start over.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3">
        {accounts.map((a) => {
          const org = orgs.find((o) => o.id === a.orgId)!;
          const people = users.filter((u) => u.orgId === a.orgId && u.active);
          return (
            <Card key={a.orgId} className="flex flex-col p-5">
              <div className="flex items-center gap-2 text-brand">{a.icon}<span className="text-xs font-medium uppercase tracking-wide">{org.kind}</span></div>
              <h2 className="mt-2 font-display text-xl font-semibold">{org.name}</h2>
              <p className="mt-1 flex-1 text-sm text-muted">{a.blurb}</p>
              <div className="mt-4 grid gap-2">
                {people.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => go(org.id, u.id, home[org.kind])}
                    className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-left text-sm hover:border-brand hover:bg-brand-soft"
                  >
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs text-muted">{u.role}</span>
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6">
        <button
          onClick={() => go("platform", "platform", "/admin")}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-5 py-4 text-left hover:border-brand"
        >
          <ShieldCheck className="text-brand" size={20} />
          <div>
            <div className="font-medium">Stem Haul platform owner</div>
            <div className="text-sm text-muted">License Admin: every licensed account, its modules and billing status.</div>
          </div>
        </button>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold">Try the full flow</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
            <li><b className="text-fg">Lucy&apos;s</b>: create a purchase order to Finca La Esperanza and send it.</li>
            <li><b className="text-fg">Farm</b>: confirm the order and print the box labels.</li>
            <li><b className="text-fg">Lucy&apos;s</b>: book freight (master AWB + house AWB), then scan the boxes in at Scan Receiving.</li>
            <li><b className="text-fg">Lucy&apos;s</b>: deliver boxes to Mari Flowers; an invoice (A/R) is created.</li>
            <li><b className="text-fg">Mari</b>: scan the boxes at Receive Boxes, make bunches, sell at the POS and close the cash drawer.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
