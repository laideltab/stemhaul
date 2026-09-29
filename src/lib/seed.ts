import type {
  Bill, Box, BoxType, CartItem, Contact, Prebook, Invoice, InvoicePayment, Listing, MapFarm, MarketOrder, MasterAWB, OnlineOrder,
  Org, Product, PurchaseOrder, QBBatch, Receipt, Sale, SaleItem, Shift, StockMovement, User,
} from "./types";
import { salePrice } from "./market";

export interface Data {
  orgs: Org[];
  users: User[];
  products: Product[];
  contacts: Contact[];
  pos: PurchaseOrder[];
  boxes: Box[];
  awbs: MasterAWB[];
  invoices: Invoice[];
  bills: Bill[];
  movements: StockMovement[];
  receipts: Receipt[];
  saleItems: SaleItem[];
  sales: Sale[];
  shifts: Shift[];
  onlineOrders: OnlineOrder[];
  qb: QBBatch[];
  listings: Listing[];
  mapFarms: MapFarm[];
  marketOrders: MarketOrder[];
  cart: CartItem[];
  prebooks: Prebook[];
  counters: Record<string, number>;
}

// Deterministic PRNG so every reset gives the same demo.
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function at(daysFromToday: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
const day = (n: number) => at(n).slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const LUCYS = "org_lucys";
export const MARI = "org_mari";
export const ESPERANZA = "org_esperanza";

export const BOX_STEMS: Record<BoxType, Record<string, number>> = {
  FB: { "Spray Rose": 400, Pompon: 300, Limonium: 200, Rose: 500, Carnation: 500, Alstroemeria: 300, Hydrangea: 60, Gypsophila: 200, Eucalyptus: 200, "Wax Flower": 200 },
  HB: { "Spray Rose": 200, Pompon: 150, Limonium: 100, Rose: 250, Carnation: 250, Alstroemeria: 150, Hydrangea: 30, Gypsophila: 100, Eucalyptus: 100, "Wax Flower": 100 },
  QB: { "Spray Rose": 100, Pompon: 75, Limonium: 50, Rose: 100, Carnation: 125, Alstroemeria: 80, Hydrangea: 15, Gypsophila: 50, Eucalyptus: 50, "Wax Flower": 50 },
  EB: { "Spray Rose": 50, Pompon: 40, Limonium: 25, Rose: 50, Carnation: 60, Alstroemeria: 40, Hydrangea: 8, Gypsophila: 25, Eucalyptus: 25, "Wax Flower": 25 },
};

/** Stems a box of this species holds (half box of roses = 250). */
export const stemsPerBox = (species: string, bt: BoxType) => BOX_STEMS[bt][species] ?? 100;

export function buildSeed(): Data {
  const r = rng(42);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];

  const orgs: Org[] = [
    { id: LUCYS, name: "International Trading and Services (ITS)", shortName: "ITS", kind: "wholesaler", city: "Miami, FL", code: "ITS", address: "1617 NW 84th Ave, Miami, FL 33126", phone: "(786) 486-6482", modules: ["wholesale"], plan: "Pro", billing: "active", since: "2026-01-15" },
    { id: MARI, name: "Mari Flowers", kind: "florist", city: "Miami, FL", code: "MF", modules: ["florist"], plan: "Starter", billing: "active", since: "2026-03-02" },
    { id: "org_bloom", name: "Bloom & Co", kind: "florist", city: "Doral, FL", code: "BC", modules: ["florist"], plan: "Starter", billing: "trial", since: "2026-09-10" },
    { id: "org_petal", name: "Petal Supply Group", kind: "wholesaler", city: "Medley, FL", code: "PS", modules: ["wholesale", "florist"], plan: "Enterprise", billing: "past_due", since: "2026-05-20" },
    { id: ESPERANZA, name: "Finca La Esperanza", kind: "farm", city: "Cayambe, Ecuador", code: "ESPER", origin: "UIO", lat: 0.04, lng: -78.14, tagline: "2,850 m on the equator · roses cut to order", modules: [], plan: "Farm (free)", billing: "active", since: "2026-01-15" },
    { id: "org_sabana", name: "Flores de la Sabana", kind: "farm", city: "Madrid, Colombia", code: "SAGA", origin: "BOG", lat: 4.73, lng: -74.26, tagline: "Carnations and alstroemeria from the Bogotá savanna", modules: [], plan: "Farm (free)", billing: "active", since: "2026-01-20" },
    { id: "org_andes", name: "Andes Hydrangeas", kind: "farm", city: "Rionegro, Colombia", code: "ANDHY", origin: "MDE", lat: 6.15, lng: -75.37, tagline: "Jumbo hydrangeas grown at 2,100 m", modules: [], plan: "Farm (free)", billing: "active", since: "2026-02-04" },
    { id: "org_pacifico", name: "Flores del Pacífico", kind: "farm", city: "Huaral, Peru", code: "FLORI", origin: "LIM", lat: -11.5, lng: -77.2, tagline: "Fillers and wax flower from the Peruvian coast", modules: [], plan: "Farm (free)", billing: "active", since: "2026-06-12" },
    { id: "org_cotopaxi", name: "Hacienda Cotopaxi Roses", kind: "farm", city: "Latacunga, Ecuador", code: "COTOP", origin: "UIO", lat: -0.93, lng: -78.62, tagline: "Big-head roses under the Cotopaxi volcano", modules: [], plan: "Farm (free)", billing: "active", since: "2026-07-01" },
    { id: "org_guasca", name: "Flores de Guasca", kind: "farm", city: "Guasca, Colombia", code: "GUASC", origin: "BOG", lat: 4.87, lng: -73.88, tagline: "Spray roses and pompons", modules: [], plan: "Farm (free)", billing: "active", since: "2026-07-18" },
    { id: "org_machachi", name: "Rosas de Machachi", kind: "farm", city: "Machachi, Ecuador", code: "MACHA", origin: "UIO", lat: -0.51, lng: -78.57, tagline: "Garden and classic roses", modules: [], plan: "Farm (free)", billing: "trial", since: "2026-09-02" },
  ];

  const users: User[] = [
    { id: "u_lucy", orgId: LUCYS, name: "Lucy Ramírez", email: "lucy@itsmiami.com", role: "owner", active: true },
    { id: "u_carlos", orgId: LUCYS, name: "Carlos Mejía", email: "carlos@itsmiami.com", role: "purchasing", active: true },
    { id: "u_pedro", orgId: LUCYS, name: "Pedro Soto", email: "pedro@itsmiami.com", role: "warehouse", active: true },
    { id: "u_gloria", orgId: LUCYS, name: "Gloria Díaz", email: "gloria@itsmiami.com", role: "accountant", active: true },
    { id: "u_mari", orgId: MARI, name: "Mari González", email: "mari@mariflowers.com", role: "owner", active: true },
    { id: "u_ana", orgId: MARI, name: "Ana Torres", email: "ana@mariflowers.com", role: "cashier", active: true },
    { id: "u_luis", orgId: MARI, name: "Luis Pérez", email: "luis@mariflowers.com", role: "cashier", active: true },
    { id: "u_rosa", orgId: MARI, name: "Rosa Vega", email: "rosa@mariflowers.com", role: "warehouse", active: false },
    { id: "u_jorge", orgId: ESPERANZA, name: "Jorge Andrade", email: "ventas@fincalaesperanza.ec", role: "farm", active: true },
    { id: "u_sabana", orgId: "org_sabana", name: "Camila Ruiz", email: "export@floressabana.co", role: "farm", active: true },
    { id: "u_pacifico", orgId: "org_pacifico", name: "Rosa Quispe", email: "export@florespacifico.pe", role: "farm", active: true },
    { id: "u_andes", orgId: "org_andes", name: "Andrés López", email: "sales@andeshydrangeas.co", role: "farm", active: true },
  ];

  const products: Product[] = [
    { id: "p_freedom50", species: "Rose", variety: "Freedom", color: "Red", lengthCm: 50, stemsPerBunch: 25 },
    { id: "p_explorer70", species: "Rose", variety: "Explorer", color: "Red", lengthCm: 70, stemsPerBunch: 25 },
    { id: "p_vendela50", species: "Rose", variety: "Vendela", color: "White", lengthCm: 50, stemsPerBunch: 25 },
    { id: "p_pinkfloyd60", species: "Rose", variety: "Pink Floyd", color: "Hot pink", lengthCm: 60, stemsPerBunch: 25 },
    { id: "p_momentum50", species: "Rose", variety: "Momentum", color: "Yellow", lengthCm: 50, stemsPerBunch: 25 },
    { id: "p_carnwhite", species: "Carnation", variety: "Moonlight", color: "White", lengthCm: 60, stemsPerBunch: 20 },
    { id: "p_carnpink", species: "Carnation", variety: "Hermosa", color: "Pink", lengthCm: 60, stemsPerBunch: 20 },
    { id: "p_alstro", species: "Alstroemeria", variety: "Assorted", color: "Mixed", lengthCm: 70, stemsPerBunch: 10 },
    { id: "p_hydwhite", species: "Hydrangea", variety: "Premium", color: "White", lengthCm: 60, stemsPerBunch: 1 },
    { id: "p_gyp", species: "Gypsophila", variety: "Xlence", color: "White", lengthCm: 75, stemsPerBunch: 10 },
    { id: "p_waxpink", species: "Wax Flower", variety: "Chamelaucium", color: "Pink", lengthCm: 60, stemsPerBunch: 10 },
    { id: "p_waxwhite", species: "Wax Flower", variety: "Chamelaucium", color: "White", lengthCm: 60, stemsPerBunch: 10 },
    { id: "p_freedom60", species: "Rose", variety: "Freedom", color: "Red", lengthCm: 60, stemsPerBunch: 25 },
    { id: "p_freedom70", species: "Rose", variety: "Freedom", color: "Red", lengthCm: 70, stemsPerBunch: 25 },
    { id: "p_mondial50", species: "Rose", variety: "Mondial", color: "White", lengthCm: 50, stemsPerBunch: 25 },
    { id: "p_mondial60", species: "Rose", variety: "Mondial", color: "White", lengthCm: 60, stemsPerBunch: 25 },
    { id: "p_vendela60", species: "Rose", variety: "Vendela", color: "White", lengthCm: 60, stemsPerBunch: 25 },
    { id: "p_brighton50", species: "Rose", variety: "Brighton", color: "Yellow", lengthCm: 50, stemsPerBunch: 25 },
    { id: "p_deeppurple50", species: "Rose", variety: "Deep Purple", color: "Lavender", lengthCm: 50, stemsPerBunch: 25 },
    { id: "p_spraylydia", species: "Spray Rose", variety: "Lydia", color: "Pink", lengthCm: 50, stemsPerBunch: 10 },
    { id: "p_hydblue", species: "Hydrangea", variety: "Premium", color: "Blue", lengthCm: 60, stemsPerBunch: 1 },
    { id: "p_pompon", species: "Pompon", variety: "Daisy", color: "Mixed", lengthCm: 70, stemsPerBunch: 10 },
    { id: "p_limonium", species: "Limonium", variety: "Emille", color: "Purple", lengthCm: 70, stemsPerBunch: 10 },
    { id: "p_euca", species: "Eucalyptus", variety: "Baby Blue", color: "Green", lengthCm: 60, stemsPerBunch: 10 },
  ];
  const pname = (id: string) => {
    const p = products.find((x) => x.id === id)!;
    return `${p.species} ${p.variety} ${p.lengthCm}cm`;
  };

  const contacts: Contact[] = [
    { id: "c_esperanza", ownerOrgId: LUCYS, kind: "farm", name: "Finca La Esperanza", country: "Ecuador", linkedOrgId: ESPERANZA, terms: "Net 15" },
    { id: "c_sabana", ownerOrgId: LUCYS, kind: "farm", name: "Flores de la Sabana", country: "Colombia", linkedOrgId: "org_sabana", terms: "Net 15" },
    { id: "c_andes", ownerOrgId: LUCYS, kind: "farm", name: "Andes Hydrangeas", country: "Colombia", linkedOrgId: "org_andes", terms: "Net 30" },
    { id: "c_pacifico", ownerOrgId: LUCYS, kind: "farm", name: "Flores del Pacífico", country: "Peru", linkedOrgId: "org_pacifico", terms: "Net 15" },
    { id: "c_cotopaxi", ownerOrgId: LUCYS, kind: "farm", name: "Hacienda Cotopaxi Roses", country: "Ecuador", linkedOrgId: "org_cotopaxi", terms: "Net 15" },
    { id: "c_guasca", ownerOrgId: LUCYS, kind: "farm", name: "Flores de Guasca", country: "Colombia", linkedOrgId: "org_guasca", terms: "Net 15" },
    { id: "c_machachi", ownerOrgId: LUCYS, kind: "farm", name: "Rosas de Machachi", country: "Ecuador", linkedOrgId: "org_machachi", terms: "Net 15" },
    { id: "c_ag_uio", ownerOrgId: LUCYS, kind: "agency", name: "Ecuador Cargo Express", country: "Ecuador", terms: "Net 7" },
    { id: "c_ag_bog", ownerOrgId: LUCYS, kind: "agency", name: "Andina Freight Forwarders", country: "Colombia", terms: "Net 7" },
    { id: "c_mari", ownerOrgId: LUCYS, kind: "customer", name: "Mari Flowers", country: "USA", linkedOrgId: MARI, terms: "Net 15", code: "ITS1097" },
    { id: "c_bloom", ownerOrgId: LUCYS, kind: "customer", name: "Bloom & Co", country: "USA", linkedOrgId: "org_bloom", terms: "Net 15", code: "ITS1128" },
    { id: "c_kendall", ownerOrgId: LUCYS, kind: "customer", name: "Kendall Events", country: "USA", terms: "Net 30", code: "ITS1031" },
    { id: "c_sunset", ownerOrgId: LUCYS, kind: "customer", name: "Sunset Supermarkets", country: "USA", terms: "Net 30", code: "ITS1094" },
    { id: "v_lucys", ownerOrgId: MARI, kind: "vendor", name: "International Trading and Services (ITS)", country: "USA", linkedOrgId: LUCYS },
    { id: "v_miamiwh", ownerOrgId: MARI, kind: "vendor", name: "Miami Wholesale Blooms", country: "USA" },
    { id: "v_greens", ownerOrgId: MARI, kind: "vendor", name: "Doral Greens Market", country: "USA" },
  ];

  // ---------------- Wholesale: POs, boxes, AWBs, invoices ----------------
  const stemsFor = (productId: string, bt: BoxType) => stemsPerBox(products.find((p) => p.id === productId)!.species, bt);

  type Spec = [string, BoxType, number, number, string?, number?]; // product, box, boxes, cents/stem, customer, confirmed
  const awbPlan: Record<string, { origin: string; ship: number; status: MasterAWB["status"] }> = {
    A: { origin: "UIO", ship: -9, status: "arrived" },
    B: { origin: "BOG", ship: -8, status: "arrived" },
    C: { origin: "MDE", ship: -6, status: "arrived" },
    D: { origin: "UIO", ship: -3, status: "arrived" },
    E: { origin: "BOG", ship: -1, status: "closed" },
    F: { origin: "UIO", ship: 0, status: "closed" },
    G: { origin: "UIO", ship: 2, status: "open" },
    H: { origin: "LIM", ship: 1, status: "open" },
  };
  const poSpecs: { farm: string; ship: number; status: PurchaseOrder["status"]; awb?: string; lines: Spec[] }[] = [
    { farm: ESPERANZA, ship: -9, status: "received", awb: "A", lines: [["p_freedom50", "HB", 2, 32, "c_mari"], ["p_freedom50", "HB", 2, 32, "c_kendall"], ["p_vendela50", "HB", 2, 30, "c_bloom"], ["p_pinkfloyd60", "QB", 2, 45, "c_mari"]] },
    { farm: "org_sabana", ship: -8, status: "received", awb: "B", lines: [["p_carnwhite", "HB", 2, 14, "c_mari"], ["p_carnwhite", "HB", 2, 14, "c_sunset"], ["p_carnpink", "FB", 2, 14, "c_kendall"], ["p_alstro", "QB", 3, 22, "c_mari"]] },
    { farm: "org_andes", ship: -6, status: "received", awb: "C", lines: [["p_hydwhite", "HB", 2, 95, "c_mari"], ["p_hydwhite", "HB", 1, 95, "c_kendall"]] },
    { farm: ESPERANZA, ship: -3, status: "received", awb: "D", lines: [["p_freedom50", "HB", 3, 32, "c_mari"], ["p_freedom50", "HB", 2, 32], ["p_explorer70", "QB", 3, 55, "c_bloom"], ["p_momentum50", "QB", 2, 30]] },
    { farm: "org_sabana", ship: -1, status: "shipped", awb: "E", lines: [["p_gyp", "QB", 4, 20, "c_mari"], ["p_euca", "QB", 3, 18], ["p_carnwhite", "FB", 2, 14, "c_sunset"]] },
    { farm: ESPERANZA, ship: 0, status: "shipped", awb: "F", lines: [["p_freedom50", "HB", 6, 33, "c_kendall"], ["p_vendela50", "QB", 3, 30, "c_mari"]] },
    { farm: ESPERANZA, ship: 2, status: "booked", awb: "G", lines: [["p_explorer70", "HB", 4, 55, "c_bloom"], ["p_pinkfloyd60", "QB", 4, 45, "c_mari"]] },
    { farm: "org_andes", ship: 3, status: "confirmed", lines: [["p_hydwhite", "FB", 2, 95, "c_kendall"], ["p_hydwhite", "HB", 2, 95, "c_mari", 1]] },
    { farm: ESPERANZA, ship: 5, status: "sent", lines: [["p_freedom50", "HB", 8, 34, "c_mari"], ["p_freedom50", "FB", 2, 33], ["p_momentum50", "QB", 2, 30]] },
    { farm: "org_sabana", ship: 6, status: "draft", lines: [["p_alstro", "FB", 2, 21], ["p_gyp", "EB", 4, 22, "c_mari"]] },
    { farm: "org_pacifico", ship: 1, status: "labeled", awb: "H", lines: [["p_waxpink", "QB", 2, 28, "c_kendall"], ["p_waxwhite", "QB", 2, 28, "c_mari"], ["p_limonium", "EB", 3, 26, "c_mari"]] },
    { farm: ESPERANZA, ship: 2, status: "confirmed", lines: [["p_freedom50", "FB", 2, 31, "c_sunset"], ["p_mondial50", "FB", 1, 29], ["p_freedom60", "EB", 4, 40, "c_mari"]] },
  ];

  const pos: PurchaseOrder[] = [];
  const boxes: Box[] = [];
  const awbs: MasterAWB[] = [];
  let poN = 1040;
  let boxN = 0;
  let lot = 14100;
  let hawbN = 1290;
  const awbIds: Record<string, string> = {};
  const awbFor = (key: string) => {
    if (awbIds[key]) return awbIds[key];
    const plan = awbPlan[key];
    const n = awbs.length + 1;
    const airline = plan.origin === "UIO" ? "Avianca Cargo" : plan.origin === "LIM" ? "LATAM Cargo" : "LATAM Cargo";
    const prefix = plan.origin === "UIO" ? "729" : plan.origin === "LIM" ? "992" : "045";
    const awb: MasterAWB = {
      id: `awb_${n}`,
      number: `${prefix}-${String(4821 + n * 137).padStart(4, "0")}-${String(3100 + n * 211).slice(-4)}`,
      airline,
      agencyId: plan.origin === "UIO" ? "c_ag_uio" : plan.origin === "LIM" ? undefined : "c_ag_bog",
      flightDate: day(plan.ship),
      origin: plan.origin,
      status: plan.status,
    };
    awbs.push(awb);
    awbIds[key] = awb.id;
    return awb.id;
  };
  const year = new Date().getFullYear();

  for (const spec of poSpecs) {
    poN++;
    const confirmed = !["draft", "sent"].includes(spec.status);
    const awbId = spec.awb ? awbFor(spec.awb) : undefined;
    const hawb = awbId ? `${year}-${String(++hawbN).padStart(6, "0")}` : undefined;
    const po: PurchaseOrder = {
      id: `po_${poN}`,
      number: `PO-${poN}`,
      wholesalerId: LUCYS,
      farmId: spec.farm,
      shipDate: day(spec.ship),
      status: spec.status,
      createdAt: at(spec.ship - 4, 10),
      lines: spec.lines.map(([productId, boxType, n, price, customerId, conf]) => ({
        productId, boxType, boxes: n, stemsPerBox: stemsFor(productId, boxType), pricePerStemCents: price, customerId,
        confirmedBoxes: confirmed ? conf ?? n : undefined, awbId, hawb,
      })),
    };
    pos.push(po);

    if (!["labeled", "shipped", "received"].includes(spec.status)) continue;
    po.lines.forEach((l, li) => {
      for (let i = 0; i < (l.confirmedBoxes ?? l.boxes); i++) {
        boxN++;
        boxes.push({
          id: `bx_${boxN}`,
          code: `IT${String(558465000 + boxN * 7)}`,
          poId: po.id,
          lineIndex: li,
          productId: l.productId,
          boxType: l.boxType,
          stems: l.stemsPerBox,
          costPerStemCents: l.pricePerStemCents,
          status: spec.status === "labeled" ? "labeled" : spec.status === "shipped" ? "in_transit" : "received",
          hawb, awbId, lot: ++lot, customerId: l.customerId,
        });
      }
    });
  }
  // One stock box of the PO-1044 shipment arrived damaged.
  const dmg = boxes.find((b) => b.poId === "po_1044" && b.productId === "p_momentum50");
  if (dmg) dmg.status = "damaged";

  // Deliveries & invoices: pre-sold boxes go to the customer they were bought for.
  const invoices: Invoice[] = [];
  let invN = 5200;
  let payN = 7000;
  const markup: Record<string, number> = { "Spray Rose": 1.55, Pompon: 1.6, Limonium: 1.6, Rose: 1.55, Carnation: 1.7, Alstroemeria: 1.6, Hydrangea: 1.45, Gypsophila: 1.6, Eucalyptus: 1.6, "Wax Flower": 1.6 };
  const deliver = (customerId: string, poIds: string[], dayOffset: number, paidRatio: number, method: InvoicePayment["method"] = "Zelle") => {
    invN++;
    const inv: Invoice = {
      id: `inv_${invN}`, number: `INV-${invN}`, wholesalerId: LUCYS, customerId,
      date: day(dayOffset), dueDate: day(dayOffset + 15), lines: [], totalCents: 0, paidCents: 0, payments: [],
    };
    for (const b of boxes.filter((x) => poIds.includes(x.poId) && x.customerId === customerId && x.status === "received")) {
      const sp = products.find((p) => p.id === b.productId)!.species;
      const price = Math.round(b.costPerStemCents * markup[sp]);
      inv.lines.push({ boxId: b.id, description: `${b.boxType} ${pname(b.productId)}`, stems: b.stems, pricePerStemCents: price });
      b.status = "delivered";
      b.invoiceId = inv.id;
    }
    inv.totalCents = inv.lines.reduce((s, l) => s + l.stems * l.pricePerStemCents, 0);
    if (paidRatio > 0) {
      const amt = Math.round(inv.totalCents * paidRatio);
      inv.payments.push({ id: `pay_${++payN}`, date: day(dayOffset + 3), amountCents: amt, method, reference: method === "Check" ? `CHK ${4400 + payN % 100}` : method === "Zelle" ? `ZL-${payN}` : "Cash" });
      inv.paidCents = amt;
    }
    invoices.push(inv);
    return inv;
  };

  // Older deliveries to Mari (already received in her shop).
  const marInv1 = deliver("c_mari", ["po_1041", "po_1042"], -7, 1);
  deliver("c_bloom", ["po_1041"], -7, 1, "Check");
  deliver("c_kendall", ["po_1041", "po_1042"], -6, 0.5, "Cash shipping");
  deliver("c_sunset", ["po_1042"], -5, 0);
  const marInv2 = deliver("c_mari", ["po_1043"], -5, 0);
  deliver("c_kendall", ["po_1043"], -5, 0);
  deliver("c_bloom", ["po_1044"], -1, 0);
  // Today's delivery to Mari: on its way to her shop, not scanned there yet.
  deliver("c_mari", ["po_1044"], 0, 0);
  for (const inv of [marInv1, marInv2]) {
    for (const l of inv.lines) boxes.find((b) => b.id === l.boxId)!.floristReceivedAt = at(inv === marInv1 ? -7 : -5, 8, 30);
  }

  const bills: Bill[] = [];
  let billN = 0;
  for (const po of pos.filter((p) => p.status === "received" || p.status === "shipped")) {
    billN++;
    po.dispatchedAt = `${addDays(po.shipDate, 0)}T14:00:00.000Z`;
    po.farmInvoice = `F-${20400 + billN * 7}`;
    const farm = orgs.find((o) => o.id === po.farmId)!;
    const total = po.lines.reduce((s, l) => s + l.boxes * l.stemsPerBox * l.pricePerStemCents, 0);
    bills.push({
      id: `bill_${billN}`, ownerOrgId: LUCYS, vendor: farm.name, reference: `Farm invoice ${po.farmInvoice} · ${po.number}`,
      date: po.shipDate, dueDate: addDays(po.shipDate, 15),
      totalCents: total, paidCents: po.status === "received" && po.number < "PO-1043" ? total : 0,
    });
    const pieces = po.lines.reduce((s, l) => s + l.boxes, 0);
    billN++;
    bills.push({
      id: `bill_${billN}`, ownerOrgId: LUCYS, vendor: (() => { const awb = awbs.find((x) => x.id === po.lines[0].awbId); return contacts.find((c) => c.id === awb?.agencyId)?.name ?? awb?.airline ?? "Freight"; })(),
      reference: `Freight ${po.number} (${pieces} pcs)`, date: po.shipDate, dueDate: addDays(po.shipDate, 7),
      totalCents: pieces * 2850, paidCents: po.number < "PO-1043" ? pieces * 2850 : 0,
    });
  }

  // ---------------- Florist module (Mari Flowers) ----------------
  const saleItems: SaleItem[] = [
    { id: "si_red12", orgId: MARI, name: "Dozen Red Roses", kind: "bunch", recipe: [{ productId: "p_freedom50", stems: 12 }, { productId: "p_gyp", stems: 2 }, { productId: "p_euca", stems: 2 }], retailCents: 4500, wholesaleCents: 2600, onWeb: true, ready: 6 },
    { id: "si_red8", orgId: MARI, name: "Red Rose Bunch (8)", kind: "bunch", recipe: [{ productId: "p_freedom50", stems: 8 }], retailCents: 2400, wholesaleCents: 1300, onWeb: true, ready: 10 },
    { id: "si_white8", orgId: MARI, name: "White Rose Bunch (8)", kind: "bunch", recipe: [{ productId: "p_vendela50", stems: 8 }], retailCents: 2400, wholesaleCents: 1300, onWeb: true, ready: 4 },
    { id: "si_pink8", orgId: MARI, name: "Pink Floyd Bunch (8)", kind: "bunch", recipe: [{ productId: "p_pinkfloyd60", stems: 8 }], retailCents: 2800, wholesaleCents: 1600, onWeb: true, ready: 3 },
    { id: "si_carn10", orgId: MARI, name: "Carnation Bunch (10)", kind: "bunch", recipe: [{ productId: "p_carnpink", stems: 10 }], retailCents: 1200, wholesaleCents: 650, onWeb: false, ready: 8 },
    { id: "si_alstro", orgId: MARI, name: "Alstroemeria Bunch (10)", kind: "bunch", recipe: [{ productId: "p_alstro", stems: 10 }], retailCents: 1400, wholesaleCents: 800, onWeb: false, ready: 5 },
    { id: "si_hyd", orgId: MARI, name: "Hydrangea Stem", kind: "bunch", recipe: [{ productId: "p_hydwhite", stems: 1 }], retailCents: 700, wholesaleCents: 400, onWeb: false, ready: 0 },
    { id: "si_garden", orgId: MARI, name: "Garden Mix Arrangement", kind: "arrangement", recipe: [{ productId: "p_carnwhite", stems: 6 }, { productId: "p_alstro", stems: 5 }, { productId: "p_hydwhite", stems: 1 }, { productId: "p_euca", stems: 3 }], retailCents: 6500, wholesaleCents: 3800, onWeb: true, ready: 2 },
    { id: "si_blush", orgId: MARI, name: "Blush Vase (24 roses)", kind: "arrangement", recipe: [{ productId: "p_pinkfloyd60", stems: 12 }, { productId: "p_vendela50", stems: 12 }, { productId: "p_gyp", stems: 3 }], retailCents: 9500, wholesaleCents: 5800, onWeb: true, ready: 1 },
    { id: "si_hbred", orgId: MARI, name: "Half Box Red Roses (250)", kind: "box", recipe: [{ productId: "p_freedom50", stems: 250 }], retailCents: 22000, wholesaleCents: 15500, onWeb: false, ready: 0 },
  ];

  const movements: StockMovement[] = [];
  const receipts: Receipt[] = [];
  let mvN = 0;
  const mv = (m: Omit<StockMovement, "id" | "orgId">) => movements.push({ id: `mv_${++mvN}`, orgId: MARI, ...m });

  // Receipts of boxes from ITS (already scanned in).
  for (const inv of [marInv1, marInv2]) {
    const when = inv === marInv1 ? at(-7, 8, 30) : at(-5, 8, 30);
    const lines = inv.lines.map((l) => {
      const b = boxes.find((x) => x.id === l.boxId)!;
      return { productId: b.productId, stems: b.stems, costPerStemCents: l.pricePerStemCents, boxCode: b.code };
    });
    receipts.push({ id: `rc_${receipts.length + 1}`, orgId: MARI, at: when, source: "stemhaul", supplier: "International Trading and Services (ITS)", lines, totalCents: inv.totalCents });
    for (const l of lines) mv({ at: when, productId: l.productId, stems: l.stems, type: "receive", note: `Box ${l.boxCode} from International Trading and Services (ITS)`, userId: "u_mari" });
  }
  // Third-party purchases in Miami.
  const manual: [number, string, [string, number, number][]][] = [
    [-6, "Miami Wholesale Blooms", [["p_gyp", 100, 35], ["p_euca", 100, 30], ["p_vendela50", 100, 52]]],
    [-3, "Doral Greens Market", [["p_euca", 50, 32], ["p_alstro", 80, 38]]],
    [-2, "Miami Wholesale Blooms", [["p_freedom50", 250, 55], ["p_pinkfloyd60", 100, 72], ["p_hydwhite", 15, 150]]],
  ];
  for (const [d, supplier, ls] of manual) {
    const when = at(d, 11, 15);
    const lines = ls.map(([productId, stems, c]) => ({ productId, stems, costPerStemCents: c }));
    receipts.push({ id: `rc_${receipts.length + 1}`, orgId: MARI, at: when, source: "manual", supplier, lines, totalCents: lines.reduce((s, l) => s + l.stems * l.costPerStemCents, 0) });
    for (const l of lines) mv({ at: when, productId: l.productId, stems: l.stems, type: "receive", note: `Bought at ${supplier}`, userId: "u_mari" });
  }

  // Sales history: last 7 days (closed shifts) + today (open shift for Ana).
  const sales: Sale[] = [];
  const shifts: Shift[] = [];
  let saleN = 8800;
  let shN = 0;
  const cashiers = ["u_ana", "u_luis"];
  for (let d = -7; d <= 0; d++) {
    const dayShifts = d === 0 ? ["u_ana"] : cashiers;
    for (const cashierId of dayShifts) {
      shN++;
      const sh: Shift = { id: `sh_${shN}`, orgId: MARI, cashierId, openedAt: at(d, cashierId === "u_ana" ? 8 : 13), openingFloatCents: 15000 };
      shifts.push(sh);
      const n = d === 0 ? 7 : 6 + Math.floor(r() * 7);
      for (let i = 0; i < n; i++) {
        saleN++;
        const wholesale = r() < 0.15;
        const lines: Sale["lines"] = [];
        const nLines = 1 + Math.floor(r() * 2);
        for (let k = 0; k < nLines; k++) {
          const it = pick(saleItems.filter((s) => s.kind !== "box" || wholesale));
          if (lines.some((l) => l.itemId === it.id)) continue;
          const qty = it.kind === "box" ? 1 : 1 + Math.floor(r() * (wholesale ? 6 : 2));
          lines.push({ itemId: it.id, name: it.name, qty, unitCents: wholesale ? it.wholesaleCents : it.retailCents });
        }
        const hour = (cashierId === "u_ana" ? 8 : 13) + Math.floor(r() * 5);
        const sale: Sale = {
          id: `sale_${saleN}`, orgId: MARI, number: `S-${saleN}`, at: at(d, hour, Math.floor(r() * 60)),
          channel: "store", customerType: wholesale ? "wholesale" : "retail",
          customerName: wholesale ? pick(["Hotel Brisas", "Iglesia San Juan", "Eventos Luna"]) : undefined,
          cashierId, shiftId: sh.id,
          payment: wholesale ? "account" : r() < 0.45 ? "cash" : "card",
          lines, totalCents: lines.reduce((s, l) => s + l.qty * l.unitCents, 0),
        };
        sales.push(sale);
        for (const l of lines) {
          const it = saleItems.find((s) => s.id === l.itemId)!;
          for (const rp of it.recipe) mv({ at: sale.at, productId: rp.productId, stems: -rp.stems * l.qty, type: "sale", note: `${sale.number} · ${it.name}`, userId: cashierId });
        }
      }
      if (d < 0) {
        const cash = sales.filter((s) => s.shiftId === sh.id && s.payment === "cash").reduce((s, x) => s + x.totalCents, 0);
        sh.closedAt = at(d, cashierId === "u_ana" ? 13 : 19);
        // Luis came up short twice this week; that is what the cash close is for.
        const diff = cashierId === "u_luis" && (d === -4 || d === -2) ? -(2000 + Math.floor(r() * 3) * 500) : 0;
        sh.countedCashCents = sh.openingFloatCents + cash + diff;
        if (diff) sh.note = "Counted twice, still short.";
      }
    }
  }

  // Waste.
  mv({ at: at(-4, 18), productId: "p_carnpink", stems: -20, type: "waste", note: "Botrytis on 1 bunch", userId: "u_mari" });
  mv({ at: at(-1, 18), productId: "p_freedom50", stems: -25, type: "waste", note: "Bent necks", userId: "u_ana" });
  mv({ at: at(-1, 18, 5), productId: "p_hydwhite", stems: -3, type: "waste", note: "Wilted", userId: "u_ana" });

  // Opening balance so no product goes negative (count before the demo week).
  const opening = at(-8, 7);
  for (const p of products) {
    const bal = movements.filter((m) => m.productId === p.id).reduce((s, m) => s + m.stems, 0);
    const targets: Record<string, number> = {
      p_freedom50: 320, p_explorer70: 150, p_vendela50: 210, p_pinkfloyd60: 175, p_momentum50: 0,
      p_carnwhite: 140, p_carnpink: 95, p_alstro: 88, p_hydwhite: 12, p_gyp: 64, p_euca: 72, p_waxpink: 0, p_waxwhite: 0,
    };
    const target = targets[p.id] ?? 0;
    const need = Math.max(0, target - bal);
    if (need > 0) movements.unshift({ id: `mv_open_${p.id}`, orgId: MARI, at: opening, productId: p.id, stems: need, type: "adjust", note: "Opening count", userId: "u_mari" });
  }

  const onlineOrders: OnlineOrder[] = [
    { id: "oo_1", orgId: MARI, number: "W-1021", at: at(-1, 20, 14), customer: "Sofía Herrera", deliveryDate: day(0), address: "1450 Brickell Ave, Miami", lines: [{ itemId: "si_blush", name: "Blush Vase (24 roses)", qty: 1, unitCents: 9500 }], totalCents: 9500, status: "preparing" },
    { id: "oo_2", orgId: MARI, number: "W-1022", at: at(0, 7, 2), customer: "Daniel Brooks", deliveryDate: day(0), address: "88 SW 7th St, Miami", lines: [{ itemId: "si_red12", name: "Dozen Red Roses", qty: 2, unitCents: 4500 }], totalCents: 9000, status: "new" },
    { id: "oo_3", orgId: MARI, number: "W-1023", at: at(0, 8, 41), customer: "Valeria Cruz", deliveryDate: day(1), address: "3201 NE 1st Ave, Miami", lines: [{ itemId: "si_garden", name: "Garden Mix Arrangement", qty: 1, unitCents: 6500 }, { itemId: "si_white8", name: "White Rose Bunch (8)", qty: 1, unitCents: 2400 }], totalCents: 8900, status: "new" },
    { id: "oo_4", orgId: MARI, number: "W-1019", at: at(-2, 16, 30), customer: "Mark Jensen", deliveryDate: day(-1), address: "700 Biscayne Blvd, Miami", lines: [{ itemId: "si_red12", name: "Dozen Red Roses", qty: 1, unitCents: 4500 }], totalCents: 4500, status: "delivered" },
  ];

  const qb: QBBatch[] = [];
  for (let d = -7; d <= -1; d++) {
    const ds = sales.filter((s) => s.at.slice(0, 10) === day(d));
    qb.push({ id: `qb_m${d}`, orgId: MARI, at: at(d + 1, 6), kind: "sales", description: `Daily sales summary ${day(d)}`, count: ds.length, totalCents: ds.reduce((s, x) => s + x.totalCents, 0), status: d === -3 ? "error" : "sent" });
  }
  for (const inv of invoices.filter((i) => i.date < day(-1))) {
    qb.push({ id: `qb_${inv.id}`, orgId: LUCYS, at: addDays(inv.date, 1) + "T11:00:00.000Z", kind: "invoices", description: `${inv.number} (A/R)`, count: 1, totalCents: inv.totalCents, status: "sent" });
  }

  // ---------------- Farm marketplace (ITS map) ----------------
  const L = (farmId: string, rows: [string, BoxType, number, number, boolean?][]) =>
    rows.map(([productId, boxType, price, stock, listed = true]) => ({ farmId, productId, boxType, stemsPerBox: stemsFor(productId, boxType), farmPriceCents: price, stockBoxes: stock, listed }));
  const listings: Listing[] = [
    ...L(ESPERANZA, [["p_freedom50", "HB", 32, 40], ["p_freedom60", "HB", 38, 38], ["p_freedom70", "HB", 45, 12], ["p_mondial50", "HB", 30, 24], ["p_mondial60", "HB", 36, 10], ["p_vendela50", "HB", 30, 6], ["p_vendela60", "HB", 36, 1], ["p_pinkfloyd60", "HB", 45, 16], ["p_brighton50", "HB", 32, 11], ["p_deeppurple50", "HB", 38, 9], ["p_gyp", "QB", 20, 20], ["p_explorer70", "HB", 55, 0, false], ["p_freedom50", "FB", 31, 14], ["p_mondial50", "FB", 29, 6]]),
    ...L("org_cotopaxi", [["p_freedom50", "HB", 30, 30], ["p_freedom60", "HB", 36, 22], ["p_explorer70", "HB", 52, 14], ["p_momentum50", "HB", 28, 18], ["p_freedom50", "FB", 29, 10]]),
    ...L("org_sabana", [["p_carnwhite", "HB", 14, 60], ["p_carnpink", "HB", 14, 45], ["p_alstro", "QB", 22, 30], ["p_gyp", "QB", 20, 25], ["p_carnwhite", "FB", 13, 30], ["p_carnpink", "FB", 13, 20]]),
    ...L("org_guasca", [["p_carnpink", "HB", 13, 20], ["p_spraylydia", "QB", 30, 16], ["p_pompon", "HB", 18, 24]]),
    ...L("org_andes", [["p_hydwhite", "HB", 95, 20], ["p_hydblue", "HB", 105, 8], ["p_hydwhite", "FB", 92, 10]]),
    ...L("org_pacifico", [["p_gyp", "QB", 19, 30], ["p_limonium", "QB", 24, 18], ["p_waxpink", "QB", 28, 12], ["p_waxwhite", "QB", 28, 10], ["p_waxpink", "EB", 30, 15]]),
    ...L("org_machachi", [["p_freedom50", "HB", 31, 20], ["p_vendela50", "HB", 30, 12]]),
  ].map((l, i) => ({ id: `ls_${i + 1}`, ...l }));
  const mapFarms: MapFarm[] = [
    { wholesalerId: LUCYS, farmId: ESPERANZA, markupPct: 38, enabled: true },
    { wholesalerId: LUCYS, farmId: "org_cotopaxi", markupPct: 35, enabled: true },
    { wholesalerId: LUCYS, farmId: "org_sabana", markupPct: 40, enabled: true },
    { wholesalerId: LUCYS, farmId: "org_guasca", markupPct: 36, enabled: true },
    { wholesalerId: LUCYS, farmId: "org_andes", markupPct: 32, enabled: true },
    { wholesalerId: LUCYS, farmId: "org_pacifico", markupPct: 30, enabled: true },
    { wholesalerId: LUCYS, farmId: "org_machachi", markupPct: 35, enabled: false },
  ];
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
  const addHours = (iso: string, h: number) => new Date(new Date(iso).getTime() + h * 3600000).toISOString();
  const mkSpecs: { n: number; florist: string; farm: string; ago: number; status: MarketOrder["status"]; lines: [string, number, number?][] }[] = [
    { n: 10466, florist: MARI, farm: ESPERANZA, ago: 60 * 46, status: "confirmed", lines: [["p_freedom60", 2], ["p_pinkfloyd60", 1]] },
    { n: 10468, florist: "org_bloom", farm: "org_pacifico", ago: 60 * 30, status: "declined", lines: [["p_waxpink", 3]] },
    { n: 10471, florist: "org_bloom", farm: ESPERANZA, ago: 60 * 22, status: "confirmed", lines: [["p_mondial50", 3], ["p_vendela50", 2, 1]] },
    { n: 10477, florist: MARI, farm: "org_sabana", ago: 35, status: "pending", lines: [["p_carnwhite", 2], ["p_alstro", 2]] },
    { n: 10480, florist: "org_bloom", farm: "org_cotopaxi", ago: 130, status: "pending", lines: [["p_freedom50", 3]] },
  ];
  const marketOrders: MarketOrder[] = [];
  for (const m of mkSpecs) {
    const markupPct = mapFarms.find((x) => x.farmId === m.farm)!.markupPct;
    const customerId = contacts.find((c) => c.kind === "customer" && c.linkedOrgId === m.florist)!.id;
    const createdAt = minutesAgo(m.ago);
    const mo: MarketOrder = {
      id: `mk_${m.n}`, number: `MK-${m.n}`, wholesalerId: LUCYS, floristOrgId: m.florist, customerId, farmId: m.farm,
      createdAt, confirmBy: addHours(createdAt, 4), shipDate: day(m.status === "pending" ? 2 : 1),
      delivery: "shop", payment: "account", status: m.status,
      lines: m.lines.map(([productId, boxes, conf]) => {
        const ls = listings.find((l) => l.farmId === m.farm && l.productId === productId)!;
        return {
          listingId: ls.id, productId, boxType: ls.boxType, boxes, stemsPerBox: ls.stemsPerBox, farmPriceCents: ls.farmPriceCents,
          salePriceCents: salePrice(ls.farmPriceCents, markupPct), confirmedBoxes: m.status === "confirmed" ? conf ?? boxes : m.status === "declined" ? 0 : undefined,
        };
      }),
    };
    if (m.status !== "pending") mo.confirmedAt = addHours(createdAt, 1.2);
    if (m.status === "confirmed") {
      poN++;
      mo.poId = `po_${poN}`;
      pos.push({
        id: mo.poId, number: `PO-${poN}`, wholesalerId: LUCYS, farmId: m.farm, shipDate: mo.shipDate, status: "confirmed", createdAt: mo.confirmedAt!, marketOrderId: mo.id,
        lines: mo.lines.map((l) => ({ productId: l.productId, boxType: l.boxType, boxes: l.boxes, stemsPerBox: l.stemsPerBox, pricePerStemCents: l.farmPriceCents, salePriceCents: l.salePriceCents, customerId, confirmedBoxes: l.confirmedBoxes })),
      });
    }
    marketOrders.push(mo);
  }

  // ---------------- Prebooks (florist asks ITS, no farm picked) ----------------
  const prebooks: Prebook[] = [
    {
      id: "pb_2039", number: "PB-2039", wholesalerId: LUCYS, floristOrgId: MARI, customerId: "c_mari", createdAt: at(-3, 16, 20), neededBy: day(6),
      note: "For the weekend weddings.", weekly: false, status: "confirmed", answeredAt: at(-3, 17, 5), answerNote: "Finca La Esperanza has Pink Floyd; it is already on our UIO AWB.",
      lines: [{ species: "Rose", color: "Pink", lengthCm: 60, boxType: "QB", boxes: 4, targetCents: 70, source: "farm", farmId: ESPERANZA, sourcedProductId: "p_pinkfloyd60", confirmedBoxes: 4, priceCents: 72, farmCents: 45, poId: "po_1047" }],
    },
    {
      id: "pb_2041", number: "PB-2041", wholesalerId: LUCYS, floristOrgId: "org_bloom", customerId: "c_bloom", createdAt: minutesAgo(50), neededBy: day(4),
      note: "Any red is fine, we need volume.", weekly: true, status: "requested",
      lines: [
        { species: "Rose", color: "Red", lengthCm: 50, boxType: "HB", boxes: 10, targetCents: 45 },
        { species: "Hydrangea", color: "White", boxType: "HB", boxes: 2 },
      ],
    },
  ];
  // The PO that PB-2039 created carries the agreed price.
  const pb39 = pos.find((p) => p.id === "po_1047")!;
  pb39.prebookId = "pb_2039";
  pb39.lines[1].salePriceCents = 72;

  return {
    orgs, users, products, contacts, pos, boxes, awbs, invoices, bills,
    movements, receipts, saleItems, sales, shifts, onlineOrders, qb, listings, mapFarms, marketOrders, cart: [], prebooks,
    counters: { pb: 2041, mk: 10480, po: poN, box: boxN, lot, awb: awbs.length, hawb: hawbN, inv: invN, pay: payN, sale: saleN, shift: shN, mv: mvN, web: 1023, bill: billN },
  };
}
