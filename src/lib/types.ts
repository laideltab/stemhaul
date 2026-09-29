// Stems are always integers. Money is always integer cents.

export type OrgKind = "wholesaler" | "florist" | "farm";
export type ModuleKey = "wholesale" | "florist";

export interface Org {
  id: string;
  name: string;
  kind: OrgKind;
  city: string;
  /** Short code printed on labels (vendor code for farms). */
  code: string;
  address?: string;
  phone?: string;
  /** Airport code farms ship from. */
  origin?: string;
  /** Farm pin on the marketplace map. */
  lat?: number;
  lng?: number;
  /** One line under the farm name in the marketplace. */
  tagline?: string;
  modules: ModuleKey[];
  plan: "Starter" | "Pro" | "Enterprise" | "Farm (free)";
  billing: "active" | "trial" | "past_due";
  since: string;
}

export type Role = "owner" | "purchasing" | "warehouse" | "cashier" | "accountant" | "farm";

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface Product {
  id: string;
  species: string;
  variety: string;
  color: string;
  lengthCm: number;
  stemsPerBunch: number;
}

export type BoxType = "FB" | "HB" | "QB" | "EB";

export interface Contact {
  id: string;
  ownerOrgId: string;
  kind: "farm" | "vendor" | "agency" | "customer";
  name: string;
  country: string;
  /** When this contact is itself a Stem Haul account (e.g. a licensed florist). */
  linkedOrgId?: string;
  terms?: string;
  /** Customer code (also the mark code printed on each box). */
  code?: string;
}

// Komet order: the farm confirms, the importer adds the lines to an AWB, labels are printed, the AWB closes and flies.
export type POStatus = "draft" | "sent" | "confirmed" | "booked" | "labeled" | "shipped" | "received";

export interface POLine {
  productId: string;
  boxType: BoxType;
  boxes: number;
  stemsPerBox: number;
  pricePerStemCents: number;
  /** Customer the boxes are already sold to (prebook). Empty means stock for the warehouse. */
  customerId?: string;
  /** Boxes the farm confirmed. Undefined until the farm answers. */
  confirmedBoxes?: number;
  awbId?: string;
  hawb?: string;
  /** Delivered price per stem the florist already agreed to on the marketplace. */
  salePriceCents?: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  wholesalerId: string;
  farmId: string; // org id of the farm
  shipDate: string;
  status: POStatus;
  lines: POLine[];
  createdAt: string;
  /** Set when a florist's marketplace order created this PO. */
  marketOrderId?: string;
}

export type BoxStatus = "labeled" | "in_transit" | "received" | "delivered" | "missing" | "damaged";

export interface Box {
  id: string;
  code: string; // label barcode
  poId: string;
  lineIndex: number;
  productId: string;
  boxType: BoxType;
  stems: number;
  costPerStemCents: number;
  status: BoxStatus;
  hawb?: string;
  awbId?: string;
  /** Lot number printed on the label. */
  lot: number;
  /** Customer the box was bought for (set at purchase), or the one it was delivered to from stock. */
  customerId?: string;
  invoiceId?: string;
  /** Set when a licensed florist has scanned it in. */
  floristReceivedAt?: string;
}

export interface MasterAWB {
  id: string;
  number: string;
  airline: string;
  /** Missing when the wholesaler books directly with the airline, with no cargo agency. */
  agencyId?: string;
  flightDate: string;
  origin: string;
  /** open: still adding boxes and printing labels; closed: flown; arrived: all boxes scanned in Miami. */
  status: "open" | "closed" | "arrived";
}

export type PaymentMethod = "Cash" | "Check" | "Zelle" | "Wire" | "Credit card" | "Cash shipping";

export interface InvoicePayment {
  id: string;
  date: string;
  amountCents: number;
  method: PaymentMethod;
  reference: string;
  note?: string;
}

export interface Invoice {
  id: string;
  number: string;
  wholesalerId: string;
  customerId: string;
  date: string;
  dueDate: string;
  lines: { boxId: string; description: string; stems: number; pricePerStemCents: number }[];
  totalCents: number;
  paidCents: number;
  payments: InvoicePayment[];
}

export interface Bill {
  id: string;
  ownerOrgId: string;
  vendor: string;
  reference: string;
  date: string;
  dueDate: string;
  totalCents: number;
  paidCents: number;
}

// ---- Farm marketplace ----
// The map is the importer's storefront: farms list at farm price, the importer adds its markup,
// florists buy at the delivered price and the importer consolidates, flies and delivers.

export interface Listing {
  id: string;
  farmId: string;
  productId: string;
  boxType: BoxType;
  stemsPerBox: number;
  farmPriceCents: number;
  /** Boxes available for the next flight. */
  stockBoxes: number;
  listed: boolean;
}

/** A farm on an importer's map, with the importer's markup over the farm price. */
export interface MapFarm {
  wholesalerId: string;
  farmId: string;
  markupPct: number;
  enabled: boolean;
}

export interface MarketLine {
  listingId: string;
  productId: string;
  boxType: BoxType;
  boxes: number;
  stemsPerBox: number;
  farmPriceCents: number;
  salePriceCents: number;
  confirmedBoxes?: number;
}

export interface MarketOrder {
  id: string;
  number: string;
  wholesalerId: string;
  floristOrgId: string;
  /** The florist as a customer of the importer (its code goes on every box). */
  customerId: string;
  farmId: string;
  createdAt: string;
  confirmBy: string;
  shipDate: string;
  delivery: "shop" | "pickup";
  payment: "account" | "card";
  status: "pending" | "confirmed" | "declined";
  confirmedAt?: string;
  poId?: string;
  lines: MarketLine[];
}

export interface CartItem {
  listingId: string;
  boxes: number;
}

// ---- Florist module ----

export type MovementType = "receive" | "bunch" | "sale" | "waste" | "adjust";

export interface StockMovement {
  id: string;
  orgId: string;
  at: string;
  productId: string;
  stems: number; // + in, - out
  type: MovementType;
  note: string;
  userId?: string;
}

export interface Receipt {
  id: string;
  orgId: string;
  at: string;
  source: "stemhaul" | "manual";
  supplier: string;
  lines: { productId: string; stems: number; costPerStemCents: number; boxCode?: string }[];
  totalCents: number;
}

export interface SaleItem {
  id: string;
  orgId: string;
  name: string;
  kind: "bunch" | "arrangement" | "box";
  recipe: { productId: string; stems: number }[];
  retailCents: number;
  wholesaleCents: number;
  onWeb: boolean;
  /** Pre-made units ready on the shelf. */
  ready: number;
}

export type Payment = "cash" | "card" | "account";

export interface Sale {
  id: string;
  orgId: string;
  number: string;
  at: string;
  channel: "store" | "web";
  customerType: "retail" | "wholesale";
  customerName?: string;
  cashierId: string;
  shiftId?: string;
  payment: Payment;
  lines: { itemId: string; name: string; qty: number; unitCents: number }[];
  totalCents: number;
  voided?: boolean;
}

export interface Shift {
  id: string;
  orgId: string;
  cashierId: string;
  openedAt: string;
  openingFloatCents: number;
  closedAt?: string;
  countedCashCents?: number;
  note?: string;
}

export interface OnlineOrder {
  id: string;
  orgId: string;
  number: string;
  at: string;
  customer: string;
  deliveryDate: string;
  address: string;
  lines: { itemId: string; name: string; qty: number; unitCents: number }[];
  totalCents: number;
  status: "new" | "preparing" | "ready" | "delivered";
  saleId?: string;
}

export interface QBBatch {
  id: string;
  orgId: string;
  at: string;
  kind: "sales" | "invoices" | "bills";
  description: string;
  count: number;
  totalCents: number;
  status: "sent" | "error";
}
