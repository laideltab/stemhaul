import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
import { usePathname } from "./shims/next-navigation";
import { AppShell } from "@/components/shell";
import Home from "@/app/page";
import W from "@/app/(app)/w/page";
import POs from "@/app/(app)/w/purchase-orders/page";
import NewPO from "@/app/(app)/w/purchase-orders/new/page";
import PODetail from "@/app/(app)/w/purchase-orders/[id]/page";
import Freight from "@/app/(app)/w/freight/page";
import AddAwb from "@/app/(app)/w/freight/add/page";
import AwbLabels from "@/app/(app)/w/freight/labels/[id]/page";
import ConfirmPOs from "@/app/(app)/w/purchase-orders/confirm/page";
import Receiving from "@/app/(app)/w/receiving/page";
import Deliveries from "@/app/(app)/w/deliveries/page";
import Accounts from "@/app/(app)/w/accounts/page";
import F from "@/app/(app)/f/page";
import Receive from "@/app/(app)/f/receive/page";
import Inventory from "@/app/(app)/f/inventory/page";
import Bunches from "@/app/(app)/f/bunches/page";
import POS from "@/app/(app)/f/pos/page";
import Online from "@/app/(app)/f/online/page";
import CashClose from "@/app/(app)/f/cash-close/page";
import Farm from "@/app/(app)/farm/page";
import Labels from "@/app/(app)/farm/labels/[id]/page";
import QB from "@/app/(app)/qb/page";
import Users from "@/app/(app)/users/page";
import Admin from "@/app/(app)/admin/page";
import Shop from "@/app/shop/[slug]/page";

type Page = ComponentType<{ params: Promise<Record<string, string>> }>;
// [pattern, page, inside the app shell, name of the captured path segment]
const routes: [RegExp, Page, boolean, string?][] = [
  [/^\/w$/, W as Page, true],
  [/^\/w\/purchase-orders$/, POs as Page, true],
  [/^\/w\/purchase-orders\/new$/, NewPO as Page, true],
  [/^\/w\/purchase-orders\/confirm$/, ConfirmPOs as Page, true],
  [/^\/w\/purchase-orders\/([^/]+)$/, PODetail as Page, true, "id"],
  [/^\/w\/freight$/, Freight as Page, true],
  [/^\/w\/freight\/add$/, AddAwb as Page, true],
  [/^\/w\/freight\/labels\/([^/]+)$/, AwbLabels as Page, true, "id"],
  [/^\/w\/receiving$/, Receiving as Page, true],
  [/^\/w\/deliveries$/, Deliveries as Page, true],
  [/^\/w\/accounts$/, Accounts as Page, true],
  [/^\/f$/, F as Page, true],
  [/^\/f\/receive$/, Receive as Page, true],
  [/^\/f\/inventory$/, Inventory as Page, true],
  [/^\/f\/bunches$/, Bunches as Page, true],
  [/^\/f\/pos$/, POS as Page, true],
  [/^\/f\/online$/, Online as Page, true],
  [/^\/f\/cash-close$/, CashClose as Page, true],
  [/^\/farm$/, Farm as Page, true],
  [/^\/farm\/labels\/([^/]+)$/, Labels as Page, true, "id"],
  [/^\/qb$/, QB as Page, true],
  [/^\/users$/, Users as Page, true],
  [/^\/admin$/, Admin as Page, true],
  [/^\/shop\/([^/]+)$/, Shop as Page, false, "slug"],
];

// use(params) needs the same promise object on every render.
const paramCache = new Map<string, Promise<Record<string, string>>>();
const paramsFor = (path: string, groups: Record<string, string>) => {
  if (!paramCache.has(path)) paramCache.set(path, Promise.resolve(groups));
  return paramCache.get(path)!;
};

function App() {
  const path = usePathname();
  for (const [re, C, inShell, param] of routes) {
    const m = path.match(re);
    if (!m) continue;
    const page = <C key={path} params={paramsFor(path, param ? { [param]: m[1] } : {})} />;
    return inShell ? <AppShell>{page}</AppShell> : page;
  }
  return <Home />;
}

createRoot(document.getElementById("root")!).render(<App />);
