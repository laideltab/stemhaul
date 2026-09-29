import type {
  Bill, Box, BoxType, Contact, Invoice, MasterAWB, OnlineOrder, Org, Product, PurchaseOrder,
  QBBatch, Receipt, Sale, SaleItem, Shift, StockMovement, User,
} from "./types";

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

export function buildSeed(): Data {
  const r = rng(42);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];

  const orgs: Org[] = [
    { id: LUCYS, name: "Lucy's Flowers", kind: "wholesaler", city: "Miami, FL", modules: ["wholesale"], plan: "Pro", billing: "active", since: "2026-01-15" },
    { id: MARI, name: "Mari Flowers", kind: "florist", city: "Miami, FL", modules: ["florist"], plan: "Starter", billing: "active", since: "2026-03-02" },
    { id: "org_bloom", name: "Bloom & Co", kind: "florist", city: "Doral, FL", modules: ["florist"], plan: "Starter", billing: "trial", since: "2026-09-10" },
    { id: "org_petal", name: "Petal Supply Group", kind: "wholesaler", city: "Medley, FL", modules: ["wholesale", "florist"], plan: "Enterprise", billing: "past_due", since: "2026-05-20" },
    { id: ESPERANZA, name: "Finca La Esperanza", kind: "farm", city: "Cayambe, Ecuador", modules: [], plan: "Farm (free)", billing: "active", since: "2026-01-15" },
    { id: "org_sabana", name: "Flores de la Sabana", kind: "farm", city: "Bogotá, Colombia", modules: [], plan: "Farm (free)", billing: "active", since: "2026-01-20" },
    { id: "org_andes", name: "Andes Hydrangeas", kind: "farm", city: "Rionegro, Colombia", modules: [], plan: "Farm (free)", billing: "active", since: "2026-02-04" },
  ];

  const users: User[] = [
    { id: "u_lucy", orgId: LUCYS, name: "Lucy Ramírez", email: "lucy@lucysflowers.com", role: "owner", active: true },
    { id: "u_carlos", orgId: LUCYS, name: "Carlos Mejía", email: "carlos@lucysflowers.com", role: "purchasing", active: true },
    { id: "u_pedro", orgId: LUCYS, name: "Pedro Soto", email: "pedro@lucysflowers.com", role: "warehouse", active: true },
    { id: "u_gloria", orgId: LUCYS, name: "Gloria Díaz", email: "gloria@lucysflowers.com", role: "accountant", active: true },
    { id: "u_mari", orgId: MARI, name: "Mari González", email: "mari@mariflowers.com", role: "owner", active: true },
    { id: "u_ana", orgId: MARI, name: "Ana Torres", email: "ana@mariflowers.com", role: "cashier", active: true },
    { id: "u_luis", orgId: MARI, name: "Luis Pérez", email: "luis@mariflowers.com", role: "cashier", active: true },
    { id: "u_rosa", orgId: MARI, name: "Rosa Vega", email: "rosa@mariflowers.com", role: "warehouse", active: false },
    { id: "u_jorge", orgId: ESPERANZA, name: "Jorge Andrade", email: "ventas@fincalaesperanza.ec", role: "farm", active: true },
    { id: "u_sabana", orgId: "org_sabana", name: "Camila Ruiz", email: "export@floressabana.co", role: "farm", active: true },
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
    { id: "c_ag_uio", ownerOrgId: LUCYS, kind: "agency", name: "Ecuador Cargo Express", country: "Ecuador", terms: "Net 7" },
    { id: "c_ag_bog", ownerOrgId: LUCYS, kind: "agency", name: "Andina Freight Forwarders", country: "Colombia", terms: "Net 7" },
    { id: "c_mari", ownerOrgId: LUCYS, kind: "customer", name: "Mari Flowers", country: "USA", linkedOrgId: MARI, terms: "Net 15" },
    { id: "c_bloom", ownerOrgId: LUCYS, kind: "customer", name: "Bloom & Co", country: "USA", linkedOrgId: "org_bloom", terms: "Net 15" },
    { id: "c_kendall", ownerOrgId: LUCYS, kind: "customer", name: "Kendall Events", country: "USA", terms: "Net 30" },
    { id: "c_sunset", ownerOrgId: LUCYS, kind: "customer", name: "Sunset Supermarkets", country: "USA", terms: "Net 30" },
    { id: "v_lucys", ownerOrgId: MARI, kind: "vendor", name: "Lucy's Flowers", country: "USA", linkedOrgId: LUCYS },
    { id: "v_miamiwh", ownerOrgId: MARI, kind: "vendor", name: "Miami Wholesale Blooms", country: "USA" },
    { id: "v_greens", ownerOrgId: MARI, kind: "vendor", name: "Doral Greens Market", country: "USA" },
  ];

  // ---------------- Wholesale: POs, boxes, AWBs, invoices ----------------
  const cap: Record<BoxType, Record<string, number>> = {
    FB: { Rose: 500, Carnation: 500, Alstroemeria: 300, Hydrangea: 60, Gypsophila: 200, Eucalyptus: 200 },
    HB: { Rose: 250, Carnation: 250, Alstroemeria: 150, Hydrangea: 30, Gypsophila: 100, Eucalyptus: 100 },
    QB: { Rose: 100, Carnation: 125, Alstroemeria: 80, Hydrangea: 15, Gypsophila: 50, Eucalyptus: 50 },
    EB: { Rose: 50, Carnation: 60, Alstroemeria: 40, Hydrangea: 8, Gypsophila: 25, Eucalyptus: 25 },
  };
  const stemsFor = (productId: string, bt: BoxType) => cap[bt][products.find((p) => p.id === productId)!.species];

  const poSpecs: {
    farm: string; ship: number; status: PurchaseOrder["status"];
    lines: [string, BoxType, number, number][]; // product, boxType, boxes, price cents
  }[] = [
    { farm: ESPERANZA, ship: -9, status: "received", lines: [["p_freedom50", "HB", 4, 32], ["p_vendela50", "HB", 2, 30], ["p_pinkfloyd60", "QB", 2, 45]] },
    { farm: "org_sabana", ship: -8, status: "received", lines: [["p_carnwhite", "HB", 4, 14], ["p_carnpink", "HB", 3, 14], ["p_alstro", "QB", 3, 22]] },
    { farm: "org_andes", ship: -6, status: "received", lines: [["p_hydwhite", "HB", 3, 95]] },
    { farm: ESPERANZA, ship: -3, status: "received", lines: [["p_freedom50", "HB", 5, 32], ["p_explorer70", "QB", 3, 55], ["p_momentum50", "QB", 2, 30]] },
    { farm: "org_sabana", ship: -1, status: "shipped", lines: [["p_gyp", "QB", 4, 20], ["p_euca", "QB", 3, 18], ["p_carnwhite", "HB", 2, 14]] },
    { farm: ESPERANZA, ship: 0, status: "shipped", lines: [["p_freedom50", "HB", 6, 33], ["p_vendela50", "QB", 3, 30]] },
    { farm: ESPERANZA, ship: 2, status: "labeled", lines: [["p_explorer70", "HB", 4, 55], ["p_pinkfloyd60", "QB", 4, 45]] },
    { farm: "org_andes", ship: 3, status: "confirmed", lines: [["p_hydwhite", "HB", 4, 95]] },
    { farm: ESPERANZA, ship: 5, status: "sent", lines: [["p_freedom50", "HB", 8, 34], ["p_momentum50", "QB", 2, 30]] },
    { farm: "org_sabana", ship: 6, status: "draft", lines: [["p_alstro", "HB", 3, 22]] },
  ];

  const pos: PurchaseOrder[] = [];
  const boxes: Box[] = [];
  const awbs: MasterAWB[] = [];
  let poN = 1040;
  let boxN = 0;
  let awbN = 0;
  let hawbN = 3100;

  for (const spec of poSpecs) {
    poN++;
    const po: PurchaseOrder = {
      id: `po_${poN}`,
      number: `PO-${poN}`,
      wholesalerId: LUCYS,
      farmId: spec.farm,
      shipDate: day(spec.ship),
      status: spec.status,
      createdAt: at(spec.ship - 4, 10),
      lines: spec.lines.map(([productId, boxType, n, price]) => ({
        productId, boxType, boxes: n, stemsPerBox: stemsFor(productId, boxType), pricePerStemCents: price,
      })),
    };
    pos.push(po);

    const hasBoxes = ["labeled", "shipped", "received"].includes(spec.status);
    let hawb: string | undefined;
    if (spec.status === "shipped" || spec.status === "received") {
      hawb = `HAWB-${++hawbN}`;
      const isEc = spec.farm === ESPERANZA;
      awbN++;
      const awb: MasterAWB = {
        id: `awb_${awbN}`,
        number: isEc ? `729-${48210000 + awbN * 137}` : `045-${61550000 + awbN * 211}`,
        airline: isEc ? "Avianca Cargo" : "LATAM Cargo",
        agencyId: isEc ? "c_ag_uio" : "c_ag_bog",
        flightDate: day(spec.ship),
        origin: isEc ? "UIO" : "BOG",
        status: spec.status === "received" ? "arrived" : spec.ship < 0 ? "departed" : "booked",
        houses: [{ hawb, poId: po.id, pieces: po.lines.reduce((s, l) => s + l.boxes, 0) }],
      };
      awbs.push(awb);
      po.awbId = awb.id;
    }
    if (!hasBoxes) continue;
    po.lines.forEach((l, li) => {
      for (let i = 0; i < l.boxes; i++) {
        boxN++;
        boxes.push({
          id: `bx_${boxN}`,
          code: `LF${poN}${String(boxN).padStart(4, "0")}`,
          poId: po.id,
          lineIndex: li,
          productId: l.productId,
          boxType: l.boxType,
          stems: l.stemsPerBox,
          costPerStemCents: l.pricePerStemCents,
          status: spec.status === "labeled" ? "labeled" : spec.status === "shipped" ? "in_transit" : "received",
          hawb,
        });
      }
    });
  }
  // One box of the PO-1044 shipment arrived damaged.
  const dmg = boxes.find((b) => b.poId === "po_1044" && b.productId === "p_momentum50");
  if (dmg) dmg.status = "damaged";

  // Deliveries & invoices from received boxes.
  const invoices: Invoice[] = [];
  let invN = 5200;
  const markup: Record<string, number> = { Rose: 1.55, Carnation: 1.7, Alstroemeria: 1.6, Hydrangea: 1.45, Gypsophila: 1.6, Eucalyptus: 1.6 };
  const deliver = (customerId: string, boxIds: string[], dayOffset: number, paidRatio: number) => {
    invN++;
    const inv: Invoice = {
      id: `inv_${invN}`, number: `INV-${invN}`, wholesalerId: LUCYS, customerId,
      date: day(dayOffset), dueDate: day(dayOffset + 15), lines: [], totalCents: 0, paidCents: 0,
    };
    for (const id of boxIds) {
      const b = boxes.find((x) => x.id === id)!;
      const sp = products.find((p) => p.id === b.productId)!.species;
      const price = Math.round(b.costPerStemCents * markup[sp]);
      inv.lines.push({ boxId: b.id, description: `${b.boxType} ${pname(b.productId)}`, stems: b.stems, pricePerStemCents: price });
      b.status = "delivered";
      b.customerId = customerId;
      b.invoiceId = inv.id;
    }
    inv.totalCents = inv.lines.reduce((s, l) => s + l.stems * l.pricePerStemCents, 0);
    inv.paidCents = Math.round(inv.totalCents * paidRatio);
    invoices.push(inv);
    return inv;
  };
  const rec = (poId: string) => boxes.filter((b) => b.poId === poId && b.status === "received").map((b) => b.id);
  const r1041 = rec("po_1041"), r1042 = rec("po_1042"), r1043 = rec("po_1043"), r1044 = rec("po_1044");

  // Older deliveries to Mari (already received in her shop).
  const marInv1 = deliver("c_mari", [r1041[0], r1041[4], r1041[6], r1042[0], r1042[5]], -7, 1);
  const marInv2 = deliver("c_mari", [r1043[0], r1041[1], r1042[3], r1042[7]], -5, 0);
  deliver("c_bloom", [r1041[2], r1041[3], r1042[1]], -7, 1);
  deliver("c_kendall", [r1041[5], r1041[7], r1043[1], r1042[2], r1042[4]], -6, 0.5);
  deliver("c_sunset", [r1042[6], r1042[8], r1042[9]], -5, 0);
  // Today's delivery to Mari: on its way to her shop, not scanned there yet.
  deliver("c_mari", [r1044[0], r1044[1], r1044[5], r1044[8]], 0, 0);
  deliver("c_bloom", [r1044[2], r1044[6]], -1, 0);
  for (const inv of [marInv1, marInv2]) {
    for (const l of inv.lines) boxes.find((b) => b.id === l.boxId)!.floristReceivedAt = at(inv === marInv1 ? -7 : -5, 8, 30);
  }

  const bills: Bill[] = [];
  let billN = 0;
  for (const po of pos.filter((p) => p.status === "received" || p.status === "shipped")) {
    billN++;
    const farm = orgs.find((o) => o.id === po.farmId)!;
    const total = po.lines.reduce((s, l) => s + l.boxes * l.stemsPerBox * l.pricePerStemCents, 0);
    bills.push({
      id: `bill_${billN}`, ownerOrgId: LUCYS, vendor: farm.name, reference: `Farm invoice for ${po.number}`,
      date: po.shipDate, dueDate: addDays(po.shipDate, 15),
      totalCents: total, paidCents: po.status === "received" && po.number < "PO-1043" ? total : 0,
    });
    const pieces = po.lines.reduce((s, l) => s + l.boxes, 0);
    billN++;
    bills.push({
      id: `bill_${billN}`, ownerOrgId: LUCYS, vendor: farm.id === ESPERANZA ? "Ecuador Cargo Express" : "Andina Freight Forwarders",
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

  // Receipts of boxes from Lucy's (already scanned in).
  for (const inv of [marInv1, marInv2]) {
    const when = inv === marInv1 ? at(-7, 8, 30) : at(-5, 8, 30);
    const lines = inv.lines.map((l) => {
      const b = boxes.find((x) => x.id === l.boxId)!;
      return { productId: b.productId, stems: b.stems, costPerStemCents: l.pricePerStemCents, boxCode: b.code };
    });
    receipts.push({ id: `rc_${receipts.length + 1}`, orgId: MARI, at: when, source: "stemhaul", supplier: "Lucy's Flowers", lines, totalCents: inv.totalCents });
    for (const l of lines) mv({ at: when, productId: l.productId, stems: l.stems, type: "receive", note: `Box ${l.boxCode} from Lucy's Flowers`, userId: "u_mari" });
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
      p_carnwhite: 140, p_carnpink: 95, p_alstro: 88, p_hydwhite: 12, p_gyp: 64, p_euca: 72,
    };
    const target = targets[p.id] ?? 50;
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

  return {
    orgs, users, products, contacts, pos, boxes, awbs, invoices, bills,
    movements, receipts, saleItems, sales, shifts, onlineOrders, qb,
    counters: { po: poN, box: boxN, awb: awbN, hawb: hawbN, inv: invN, sale: saleN, shift: shN, mv: mvN, web: 1023, bill: billN },
  };
}
