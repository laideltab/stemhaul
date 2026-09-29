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
import WMarket from "@/app/(app)/w/marketplace/page";
import Market from "@/app/(app)/f/market/page";
import MarketFarm from "@/app/(app)/f/market/farm/[id]/page";
import MarketCart from "@/app/(app)/f/market/cart/page";
import MarketOrders from "@/app/(app)/f/market/orders/page";
import MarketOrder from "@/app/(app)/f/market/orders/[id]/page";
import FPrebooks from "@/app/(app)/f/prebooks/page";
import NewPrebook from "@/app/(app)/f/prebooks/new/page";
import WPrebooks from "@/app/(app)/w/prebooks/page";
import InvoiceView from "@/app/(app)/w/invoices/[id]/page";
import FarmMapOrders from "@/app/(app)/farm/map-orders/page";
import FarmListings from "@/app/(app)/farm/listings/page";
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
  [/^\/w\/marketplace$/, WMarket as Page, true],
  [/^\/w\/prebooks$/, WPrebooks as Page, true],
  [/^\/w\/invoices\/([^/]+)$/, InvoiceView as Page, true, "id"],
  [/^\/f\/prebooks$/, FPrebooks as Page, true],
  [/^\/f\/prebooks\/new$/, NewPrebook as Page, true],
  [/^\/f\/market$/, Market as Page, true],
  [/^\/f\/market\/farm\/([^/]+)$/, MarketFarm as Page, true, "id"],
  [/^\/f\/market\/cart$/, MarketCart as Page, true],
  [/^\/f\/market\/orders$/, MarketOrders as Page, true],
  [/^\/f\/market\/orders\/([^/]+)$/, MarketOrder as Page, true, "id"],
  [/^\/farm\/map-orders$/, FarmMapOrders as Page, true],
  [/^\/farm\/listings$/, FarmListings as Page, true],
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
