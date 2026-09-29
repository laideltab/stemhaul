# Stem Haul (demo)

Clickable demo of Stem Haul, a licensed multi-tenant system for the flower trade with two modules:

- **Wholesale** (Komet-style): purchase orders to farms, farm portal with 4×6 box labels, freight booking with master/house AWBs, scan receiving in Miami, deliveries and invoices, receivables and payables, QuickBooks sync.
- **Farm marketplace**: the importer's farm map. Florists pick a farm on the map and buy at the delivered price (farm price plus the importer's markup); the farm gets a notification and confirms each line; confirming creates the importer's PO with the florist on every line, and it continues through the regular AWB, labels, receiving and delivery flow. Farms keep their prices and stock in My Listings.
- **Prebooks**: a florist asks the importer for flowers without picking a farm (flower, color and length or "any", box type, boxes, optional target price, date needed, weekly standing order). The importer sources each line from its Miami stock or any farm, including one it adds on the spot, sets the price and confirms; confirming creates one PO per farm with the florist on every line, or sets aside the stock boxes at the agreed price.
- **Florist shop**: receive boxes from a wholesaler on Stem Haul by scanning them (no retyping), manual purchases from other Miami suppliers, stock in stems, make bunches from recipes, point of sale (retail and wholesale prices), web shop tied to stock, online orders, and cash close per cashier.

All data is fake. It is generated in `src/lib/seed.ts` and kept in the browser's localStorage, so the demo runs with no database or credentials. Use **Reset demo data** in the sidebar to start over.

## Demo accounts

| Account | Type | Try it as |
|---|---|---|
| International Trading and Services (ITS) | Wholesaler | Carlos (purchasing), Pedro (warehouse), Gloria (accountant), Lucy (owner) |
| Mari Flowers | Florist | Ana or Luis (cashiers), Mari (owner) |
| Finca La Esperanza | Farm | Jorge |
| Platform owner | Stem Haul | License Admin |

Public web shop: `/shop/mari-flowers`.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS, Zustand for the in-browser demo store, lucide icons. Stems are integers and money is integer cents everywhere.

## Where things live

- `src/lib/types.ts`: data model (orgs, users, products, POs, boxes, AWBs, invoices, bills, stock movements, sales, shifts, online orders, QuickBooks batches)
- `src/lib/seed.ts`: deterministic fake data
- `src/lib/store.ts`: every action (create PO, print labels, book freight, scan, deliver, receive, sell, close cash…)
- `src/app/(app)/w/*`: wholesale screens · `f/*`: florist screens · `farm/*`: farm portal · `qb`, `users`, `admin`
- `src/app/shop/[slug]`: public web shop

## Single-file demo build

`node demo/build.mjs` bundles the whole app into one HTML file (`demo/dist/stemhaul-demo.html`) with hash routing, so it can be hosted anywhere as a static page. Shims for `next/link` and `next/navigation` live in `demo/shims`.
