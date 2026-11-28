/*
 * 3DNA Digital Twin — Plant Configuration Calculator for the ethanol case study (conceptual, CAD).
 *
 *   calculate(inputs, libOverrides, F)  → flows, stage sizing, bottleneck, equipment schedule, CAPEX, finance
 *   applyConfig(F, result)              → a copy of the factory with the equipment generated for that result
 *   validateLayout(F2, changedIds)      → clearance / spatial conflicts to review by hand
 *
 * Everything here is a TRANSPARENT CONCEPTUAL CALCULATION, not certified engineering:
 *   · the equipment library holds generic unit sizes and budget prices (tag "a" = illustrative assumption);
 *     public figures of the reference facility are tagged "v" and are only used to calibrate the defaults;
 *   · no manufacturer specification is implied; every value can be edited in the Configuration tab;
 *   · the defaults reproduce the case-study plant: 3 bins, 4 × 283,000 L fermenters, 2 × 500,000 L tanks,
 *     one distillation train, one molecular-sieve unit (4 vessels), 2 decanters … at ≈ C$26 M.
 */

// ---------------------------------------------------------------- inputs (defaults = the case-study plant)
export const FEEDSTOCKS = {
  wheat: { name: "Feed wheat", yield: 375, dgYield: 0.32, price: 207, basis: "Case-study investment scenario (public ratio ≈ 367 L/t)" },
  corn: { name: "Corn (maize)", yield: 400, dgYield: 0.30, price: 230, basis: "Assumption: typical dry-grind corn yield ≈ 2.8 gal/bu" },
  barley: { name: "Barley", yield: 320, dgYield: 0.36, price: 190, basis: "Assumption: hulled barley, lower starch content" }
};

export const INPUTS = [
  { id: "target", label: "Target annual production", def: 14, min: 2, max: 200, step: 0.5, unit: "M L/year", group: "prod" },
  { id: "days", label: "Operating days per year", def: 350, min: 300, max: 360, step: 1, unit: "days", group: "prod" },
  { id: "hours", label: "Operating hours per day", def: 24, min: 16, max: 24, step: 1, unit: "h/day", group: "prod" },
  { id: "feedstock", label: "Feedstock", def: "wheat", type: "select", group: "process" },
  { id: "yield", label: "Ethanol yield", def: 375, min: 280, max: 430, step: 1, unit: "L/t feedstock", group: "process" },
  { id: "grainDays", label: "Grain storage autonomy", def: 14, min: 2, max: 60, step: 1, unit: "days", group: "process" },
  { id: "fermH", label: "Fermentation time", def: 48, min: 30, max: 72, step: 1, unit: "h", group: "process" },
  { id: "emptyH", label: "Emptying time", def: 3, min: 1, max: 10, step: 0.5, unit: "h", group: "process" },
  { id: "cleanH", label: "Cleaning (CIP) time", def: 3, min: 1, max: 10, step: 0.5, unit: "h", group: "process" },
  { id: "conc", label: "Beer ethanol concentration", def: 12, min: 8, max: 16, step: 0.1, unit: "% v/v", group: "process" },
  { id: "recovery", label: "Downstream ethanol recovery", def: 98.5, min: 95, max: 99.8, step: 0.1, unit: "%", group: "process" },
  { id: "productDays", label: "Finished product storage autonomy", def: 21, min: 3, max: 60, step: 1, unit: "days", group: "process" },
  { id: "util", label: "Equipment design utilization (max.)", def: 85, min: 60, max: 100, step: 1, unit: "%", group: "design" },
  { id: "reserve", label: "Engineering reserve on required capacity", def: 0, min: 0, max: 40, step: 1, unit: "%", group: "design" },
  { id: "redundancy", label: "Standby policy", def: "critical", type: "select", group: "design",
    options: [["none", "No standby units"], ["critical", "N+1 on critical utilities"], ["rotating", "N+1 on all critical and rotating equipment"]] }
];
export const DEFAULTS = Object.fromEntries(INPUTS.map((i) => [i.id, i.def]));

// ---------------------------------------------------------------- equipment specification library
// cap: design capacity of ONE unit (capUnit) · cost: budget purchase price of one unit, C$ (2025, illustrative)
// standby: units added by the standby policy (critical / rotating flags) · tag: v public figure · a assumption
// Unit cost scales with the 0.6 power when the unit capacity is edited (six-tenths rule, assumption).
export const LIBRARY = [
  { id: "receiving", stage: "Grain receiving and handling", unit: "Truck intake pit with elevator", cap: 60, capUnit: "t/h", cost: 650000, type: "flow", rotating: true, kinds: ["receiving", "elevator"], tag: "a", note: "Intake over 12 h/day with a 1.2 peak factor (assumption)." },
  { id: "silos", stage: "Grain storage silos", unit: "Grain bin ≈ 600 t", cap: 600, capUnit: "t", cost: 180000, type: "storage", fill: 0.95, kinds: ["bin"], tag: "a", note: "Three bins in the public description; ≈ 600 t each is an assumption." },
  { id: "cleaning", stage: "Grain cleaning", unit: "Scalper / cleaner", cap: 20, capUnit: "t/h", cost: 120000, type: "flow", rotating: true, kinds: [], tag: "a", note: "Sized on the intake rate; housed in the receiving building (not modelled separately)." },
  { id: "milling", stage: "Milling", unit: "Hammer mill line", cap: 6, capUnit: "t/h", cost: 450000, type: "flow", rotating: true, kinds: ["mill", "cyclone"], tag: "a", note: "Hammer mill (public); line capacity is an assumption." },
  { id: "mash", stage: "Mash preparation", unit: "Slurry system with jet cooker", cap: 40, capUnit: "m³/h", cost: 250000, type: "flow", kinds: ["slurry", "cooker"], tag: "a", note: "Continuous jet cooker (public); capacity is an assumption." },
  { id: "liq", stage: "Liquefaction and saccharification", unit: "Holding tank 83 m³", cap: 83, capUnit: "m³", cost: 220000, type: "volume", residence: 6, kinds: ["liq", "cooler"], tag: "a", note: "≈ 2 h liquefaction + 4 h saccharification residence (assumption)." },
  { id: "ferm", stage: "Fermentation tanks", unit: "Fermenter 283 m³", cap: 283, capUnit: "m³", cost: 420000, type: "batch", fill: 0.95, kinds: ["fermenter", "yeast", "beerwell", "scrubber"], tag: "v", note: "4 × 283,000 L, ≈ 20 h fill, 48 h fermentation (public figures); price is an assumption." },
  { id: "dist", stage: "Distillation", unit: "Distillation train (beer column + rectifier)", cap: 20, capUnit: "m³/h beer", cost: 2600000, type: "flow", kinds: ["beercol", "rectifier", "structure", "condenser"], tag: "a", note: "≈ 94 % overhead strength (public); train capacity is an assumption." },
  { id: "dehy", stage: "Ethanol dehydration", unit: "Molecular-sieve unit (4 vessels)", cap: 2200, capUnit: "L/h", cost: 1400000, type: "flow", kinds: ["sieve", "prodcooler"], tag: "v", note: "One sieve with 4 vessels to 99.5 % (public); unit capacity is an assumption." },
  { id: "cent", stage: "Centrifugation", unit: "Decanter centrifuge", cap: 8, capUnit: "m³/h stillage", cost: 380000, type: "flow", rotating: true, kinds: ["centrifuge", "tstank"], tag: "a", note: "Decanters split whole stillage into WDG and thin stillage (public); size is an assumption." },
  { id: "wdg", stage: "Co-product processing and storage", unit: "WDG bunker ≈ 300 t", cap: 300, capUnit: "t", cost: 150000, type: "storage", days: 2, fill: 1, kinds: ["wdg"], tag: "a", note: "Wet cake used within ≈ 2 days (assumption); no drying (public)." },
  { id: "store", stage: "Ethanol storage", unit: "Product tank 500 m³", cap: 500, capUnit: "m³", cost: 260000, type: "storage", fill: 0.9, kinds: ["tank", "day", "denaturant", "bund"], tag: "v", note: "2 × 500,000 L (public figures); price is an assumption." },
  { id: "loading", stage: "Product loading", unit: "Road-tanker loading bay", cap: 60, capUnit: "m³/h", cost: 300000, type: "flow", hours: 12, kinds: ["loading"], tag: "a", note: "Dispatch over 12 h/day (assumption)." },
  { id: "steam", stage: "Steam generation", unit: "Natural-gas boiler 5 t/h", cap: 5, capUnit: "t/h steam", cost: 550000, type: "flow", critical: true, kinds: ["boiler", "stack"], tag: "a", note: "Steam from the thermal-energy assumption (MJ/L), 85 % boiler efficiency, 2.2 MJ/kg." },
  { id: "power", stage: "Electrical infrastructure", unit: "Transformer 1,000 kVA", cap: 1000, capUnit: "kVA", cost: 180000, type: "flow", critical: true, kinds: ["substation", "mcc", "egen"], tag: "a", note: "Average load from kWh/L × 1.6 peak factor ÷ 0.9 power factor." },
  { id: "cooling", stage: "Cooling systems", unit: "Cooling-tower cell 1.5 MW", cap: 1.5, capUnit: "MW", cost: 220000, type: "flow", rotating: true, kinds: ["cooling", "cwpump"], tag: "a", note: "Heat rejection ≈ 4.5 MJ per litre of ethanol (assumption)." },
  { id: "water", stage: "Water treatment", unit: "Reverse-osmosis train 25 m³/h", cap: 25, capUnit: "m³/h", cost: 450000, type: "flow", kinds: ["ro", "wtank"], tag: "a", note: "Water use from > 400,000 L/day at 40,000 L/day ethanol (public)." },
  { id: "wells", stage: "Raw-water supply", unit: "Deep well 12 m³/h", cap: 12, capUnit: "m³/h", cost: 90000, type: "flow", rotating: true, kinds: ["well"], tag: "a", note: "2 deep wells (public); well yield is an assumption." },
  { id: "ww", stage: "Wastewater treatment", unit: "Clarifier + aeration line 15 m³/h", cap: 15, capUnit: "m³/h", cost: 600000, type: "flow", kinds: ["wwpump", "clarifier", "aeration"], tag: "a", note: "Discharge ≈ 30 % of water intake (assumption)." }
];

// CAPEX build-up on equipment purchase (factors are assumptions, calibrated to the case study ≈ C$26 M)
export const CAPEX_FACTORS = [
  ["purchase", "Equipment purchase", 1],
  ["install", "Installation", 0.25],
  ["civil", "Civil works and foundations", 0.09],
  ["buildings", "Buildings", 0.10],
  ["piping", "Piping", 0.15],
  ["electrical", "Electrical systems", 0.085],
  ["automation", "Automation and control", 0.058]
];
export const ENGINEERING = 0.08, CONTINGENCY = 0.08;
// market and organisation scale effects (assumptions) — a bigger plant is not automatically more profitable
export const SCALE = {
  wheatPremium: { v: 8, unit: "C$/t per √(grain ÷ reference)", basis: "Wider sourcing radius: delivered grain costs more as demand grows (assumption)." },
  ethanolDiscount: { v: 0.015, unit: "C$/L per doubling", basis: "Longer haul to blenders and price concessions for larger volumes (assumption)." },
  staffExp: { v: 0.4, unit: "exponent", basis: "Staffing grows less than proportionally with capacity (assumption)." }
};

const REF = { target: 14, grainTy: (14e6 / 375) };
const ceil = (x) => Math.max(0, Math.ceil(x - 1e-9));

// ---------------------------------------------------------------- calculation engine
export function libraryWith(over = {}) {
  return LIBRARY.map((s) => {
    const o = over[s.id] || {};
    const cap = o.cap > 0 ? +o.cap : s.cap;
    return { ...s, cap0: s.cap, cost0: s.cost, cap, cost: o.cost > 0 ? +o.cost : s.cost * Math.pow(cap / s.cap, 0.6), fixed: o.fixed > 0 ? Math.round(+o.fixed) : null, standbyOver: o.standby >= 0 && o.standby !== "" && o.standby != null ? Math.round(+o.standby) : null, edited: !!(o.cap || o.cost || o.fixed || (o.standby !== undefined && o.standby !== "")) };
  });
}

export function calculate(inp0 = {}, over = {}, F) {
  const inp = { ...DEFAULTS, ...inp0 };
  const A = F.assumptions, fs = FEEDSTOCKS[inp.feedstock] || FEEDSTOCKS.wheat;
  const lib = libraryWith(over);
  const u = inp.util / 100, res = 1 + inp.reserve / 100;
  // flows
  const Ly = inp.target * 1e6, dayL = Ly / inp.days, hL = dayL / inp.hours;
  const grainTd = dayL / inp.yield, grainTh = grainTd / inp.hours;
  const ethInBeer = hL / (inp.recovery / 100);                  // L/h of ethanol leaving fermentation
  const beerM3h = ethInBeer / (inp.conc / 100) / 1000;          // m³/h of beer (≈ mash)
  const stillM3h = beerM3h * 0.88;
  const wdgTd = (grainTd * fs.dgYield) / 0.235;
  const steamTh = (hL * A.thermal.v * 0.85) / 2.2 / 1000;
  const kva = (hL * A.power.v * 1.6) / 0.9;
  const heatMW = (hL * 4.5) / 3600;
  const waterM3h = (dayL * (A.water.v / 40000)) / inp.hours;
  const flows = { Ly, dayL, hL, grainTd, grainTh, beerM3h, stillM3h, wdgTd, steamTh, kva, heatMW, waterM3h, wwM3h: waterM3h * 0.3 };
  const rest = inp.fermH + inp.emptyH + inp.cleanH;
  const policy = inp.redundancy;

  const stages = lib.map((s) => {
    let req, unitWord = s.capUnit, n, maxPlant, util, extra = {};
    if (s.type === "batch") {
      // fermenters: N ≥ 1 + (fermentation + emptying + cleaning) × flow ÷ working volume (one tank always filling)
      const Vw = s.cap * s.fill, Q = beerM3h * res;
      req = Q * rest + Vw;
      n = s.fixed ?? ceil(1 + (Q * rest) / Vw);
      const Qmax = n > 1 ? ((n - 1) * Vw) / rest : 0;
      maxPlant = inp.target * (Qmax / beerM3h);
      util = (Q * rest + Vw) / (n * Vw);
      extra = { fillH: Vw / beerM3h, cycleH: Vw / beerM3h + rest };
    } else if (s.type === "storage") {
      const need = s.id === "silos" ? grainTd * inp.grainDays : s.id === "store" ? (dayL / 1000) * inp.productDays : wdgTd * (s.days || 2);
      req = need * res;
      n = s.fixed ?? ceil(req / (s.cap * s.fill));
      util = n ? need / (n * s.cap * s.fill) : Infinity;
      const perDay = s.id === "silos" ? grainTd : s.id === "store" ? dayL / 1000 : wdgTd;
      extra = { autonomy: n ? (n * s.cap * s.fill) / perDay : 0, needDays: s.id === "silos" ? inp.grainDays : s.id === "store" ? inp.productDays : s.days || 2 };
      maxPlant = null;
    } else {
      const base = { receiving: grainTd * 1.2 / 12, cleaning: grainTd * 1.2 / 12, milling: grainTh, mash: beerM3h, liq: beerM3h * s.residence, dist: beerM3h, dehy: hL, cent: stillM3h, loading: dayL / 1000 / (s.hours || 12), steam: steamTh, power: kva, cooling: heatMW, water: waterM3h, wells: waterM3h, ww: waterM3h * 0.3 }[s.id];
      req = base * res;
      const cap1 = s.type === "volume" ? s.cap : s.cap;
      n = s.fixed ?? ceil(req / (cap1 * u));
      util = n ? base / (n * cap1) : Infinity;
      maxPlant = n ? inp.target * ((n * cap1 * u) / base) : 0;
    }
    const standbyAuto = policy === "none" ? 0 : (s.critical || (policy === "rotating" && s.rotating)) ? 1 : 0;
    const standby = s.standbyOver ?? standbyAuto;
    const units = n + standby;
    return { ...s, req, n, standby, units, installed: units * s.cap, firm: n * s.cap, util, reserve: 1 - util, maxPlant, extra };
  });

  // bottleneck: the process stage that limits the plant (storage stages limit autonomy, not throughput)
  const flowStages = stages.filter((s) => s.maxPlant != null);
  const bott = flowStages.reduce((a, b) => (b.maxPlant < a.maxPlant ? b : a), flowStages[0]);
  const maxPlant = bott.maxPlant;
  const produced = Math.min(inp.target, maxPlant);                // M L/year actually achievable
  const warnings = [];
  for (const s of stages) {
    if (s.type === "storage" && s.extra.autonomy < s.extra.needDays - 0.01) warnings.push(`${s.stage}: ${s.extra.autonomy.toFixed(1)} days of autonomy, below the ${s.extra.needDays} days requested.`);
    if (s.util > 1.0001) warnings.push(`${s.stage}: ${Math.round(s.util * 100)} % of nameplate — overloaded.`);
  }
  if (produced < inp.target - 1e-6) warnings.unshift(`The plant is limited by ${bott.stage.toLowerCase()} to ${produced.toFixed(1)} M L/year (target ${inp.target} M L/year).`);

  // equipment schedule and CAPEX
  const schedule = stages.map((s) => ({ id: s.id, stage: s.stage, unit: s.unit, op: s.n, standby: s.standby, units: s.units, cap: s.cap, capUnit: s.capUnit, unitCost: s.cost, total: s.units * s.cost, tag: s.edited ? "a" : s.tag }));
  const purchase = schedule.reduce((a, x) => a + x.total, 0);
  const capexLines = CAPEX_FACTORS.map(([k, name, f]) => [k, name, purchase * f]);
  const direct = capexLines.reduce((a, x) => a + x[2], 0);
  const eng = direct * ENGINEERING, cont = (direct + eng) * CONTINGENCY;
  capexLines.push(["engineering", "Engineering", eng], ["contingency", "Contingency", cont]);
  const capex = direct + eng + cont;

  // operating economics with scale effects; uses the factory's own finance model
  const grainTy = (produced * 1e6) / inp.yield, ratio = grainTy / REF.grainTy;
  const wheatPrice = fs.price + Math.max(0, SCALE.wheatPremium.v * (Math.sqrt(ratio) - 1));
  const ethanolPrice = A.ethanolPrice.v - Math.max(0, SCALE.ethanolDiscount.v * Math.log2(Math.max(1, produced / REF.target)));
  const staff = Math.max(8, Math.round(A.staff.v * Math.pow(Math.max(produced, 0.1) / REF.target, SCALE.staffExp.v)));
  const fin = F.finance;
  const values = { ...Object.fromEntries(fin.inputs.map((i) => [i.id, i.def])), capacity: produced, days: inp.days, yield: inp.yield, wheatPrice: +wheatPrice.toFixed(0), ethanolPrice: +ethanolPrice.toFixed(3), capexPerL: produced > 0 ? capex / (produced * 1e6) : 0, staff };
  const finance = produced > 0 ? fin.compute(values) : null;
  return { inputs: inp, feedstock: fs, flows, stages, bottleneck: bott, maxPlant, produced, warnings, schedule, purchase, capexLines, capex, values, finance, rest };
}

// ---------------------------------------------------------------- 3D: regenerate the equipment for a configuration
const grid = (pts, n) => pts.slice(0, n);
export function applyConfig(F, R) {
  const N = Object.fromEntries(R.stages.map((s) => [s.id, s]));

  const base = F.equipment;
  const byId = Object.fromEntries(base.map((e) => [e.id, e]));
  const out = [], changed = new Set();
  const regen = new Set(["bin", "fermenter", "liq", "sieve", "tank", "beercol", "rectifier", "well", "clarifier"]);
  for (const e of base) if (!regen.has(e.kind)) out.push({ ...e, params: { ...e.params } });
  const set = (id, fn) => { const e = out.find((x) => x.id === id); if (!e) return; const was = JSON.stringify([e.pos, e.params]); fn(e); if (JSON.stringify([e.pos, e.params]) !== was) changed.add(id); };
  const add = (e) => { out.push(e); changed.add(e.id); };
  const E = (id, kind, type, pos, params, extra) => ({ id, kind, type, pos, params, ...extra });

  // grain bins (3 per row, rows towards the pipe rack)
  const bin = N.silos, bs = Math.cbrt(bin.cap / 600);
  grid(Array.from({ length: 12 }, (_, i) => [-130 + (i % 3) * 12 * Math.max(1, bs), -52 + Math.floor(i / 3) * 12 * Math.max(1, bs)]), bin.units).forEach((p, i) => add(E(`bin-${i + 1}`, "bin", "silo", p, { r: 4.5 * bs, h: 12 * bs, hopper: 2.5 }, { n: i + 1, area: "grain" })));
  set("receiving", (e) => { e.params.w = 16 + 8 * (N.receiving.units - 1); e.params.doors = 2 * N.receiving.units; });
  set("mill", (e) => { e.params.w = 12 + 6 * (N.milling.units - 1); });
  // liquefaction tanks
  const lq = N.liq, ls = Math.cbrt(lq.cap / 83);
  grid([[-48, -23], [-48, -34], [-48, -12], [-54, -34], [-54, -12]], lq.units).forEach((p, i) => add(E(`liq-${i + 1}`, "liq", "tank", p, { r: 2.2 * ls, h: 5.5 * ls, roof: "dome" }, { n: i + 1, area: "cooking" })));
  // fermenters: the case-study 2 × 2 block, then further rows / columns around its centre
  const fm = N.ferm, fsz = Math.cbrt(fm.cap / 283), k = Math.max(1, (2 * 3.6 * fsz + 4.8) / 12);
  const slots = [[-32, -38], [-20, -38], [-32, -22], [-20, -22], [-32, -54], [-20, -54], [-44, -38], [-44, -22], [-44, -54], [-8, -54], [-56, -38], [-56, -22], [-56, -54], [-32, -6], [-20, -6], [-44, -6]];
  grid(slots, fm.units).forEach(([x, z], i) => add(E(`ferm-${i + 1}`, "fermenter", "tank", [-26 + (x + 26) * k, -30 + (z + 30) * k], { r: 3.6 * fsz, h: 7 * fsz, roof: "dome", legs: 1.6, agitator: true }, { n: i + 1, area: "fermentation" })));
  if (fm.units > 4) set("scrubber", (e) => { e.pos = [-8, -58]; });
  // distillation trains
  for (let t = 0; t < N.dist.units; t++) {
    add(E(t ? `beercol-${t + 1}` : "beercol", "beercol", "column", [8, -38 - 9 * t], { r: 0.95, h: 18, step: 6 }, { n: t ? t + 1 : undefined, area: "distillation" }));
    add(E(t ? `rectifier-${t + 1}` : "rectifier", "rectifier", "column", [14, -38 - 9 * t], { r: 0.8, h: 20, step: 6 }, { n: t ? t + 1 : undefined, area: "distillation" }));
  }
  // molecular-sieve units (4 vessels each)
  const unitPos = [[28, -42], [28, -26], [44, -42], [44, -26]];
  for (let un = 0; un < N.dehy.units; un++) {
    const [ox, oz] = unitPos[un] || [28 + 16 * un, -42];
    [[0, 0], [6, 0], [0, 8], [6, 8]].forEach(([dx, dz], j) => add(E(`sieve-${un * 4 + j + 1}`, "sieve", "vessel", [ox + dx, oz + dz], { r: 0.9, h: 6, mat: "insulation", legs: 1.4 }, { n: un * 4 + j + 1, area: "dehydration" })));
  }
  if (N.dehy.units > 1) set("prodcooler", (e) => { e.pos = [31, -12]; });
  set("centrifuge", (e) => { e.params.n = N.cent.units; });
  set("wdg-bunker", (e) => { e.params.w = 18 * N.wdg.units; e.pos = [42 + 9 * (N.wdg.units - 1), 30]; });
  // product tanks in the bund (5 per row)
  const st = N.store, ts = Math.cbrt(st.cap / 500), sp = Math.max(16, 2 * 4.6 * ts + 6);
  const tpos = grid(Array.from({ length: 15 }, (_, i) => [64 + (i % 5) * sp, -44 + Math.floor(i / 5) * sp]), st.units);
  tpos.forEach((p, i) => add(E(`tank-${i + 1}`, "tank", "tank", p, { r: 4.6 * ts, h: 7.5 * ts, roof: "cone", label: i === 1 ? "ETHANOL|99.5 %" : "" }, { n: i + 1, area: "storage" })));
  if (tpos.length) set("bund", (e) => {
    const xs = tpos.map((p) => p[0]), zs = tpos.map((p) => p[1]), r = 4.6 * ts + 4;
    const x0 = Math.min(...xs) - r, x1 = Math.max(...xs) + r, z0 = Math.min(...zs) - r, z1 = Math.max(...zs) + r;
    e.params.w = Math.max(44, x1 - x0); e.params.d = Math.max(28, z1 - z0); e.pos = [(x0 + x1) / 2 + (e.params.w > x1 - x0 ? 0 : 0), (z0 + z1) / 2 + 4];
  });
  set("loading", (e) => { e.params.d = 14 * N.loading.units; e.pos = [146, -36 - 7 * (N.loading.units - 1)]; });
  set("boiler", (e) => { e.params.w = 6 + 4 * N.steam.units; });
  set("substation", (e) => { e.params.units = N.power.units; });
  set("cooling", (e) => { e.params.cells = N.cooling.units; });
  set("ro", (e) => { e.params.w = 12 + 6 * (N.water.units - 1); });
  for (let i = 0; i < N.wells.units; i++) add(E(`well-${i + 1}`, "well", "wellhead", [-88, 20 + 10 * i], {}, { n: i + 1, area: "utilities" }));
  [[76, 33], [76, 52], [60, 40]].slice(0, N.ww.units).forEach((p, i) => add(E(i ? `clarifier-${i + 1}` : "clarifier", "clarifier", "clarifier", p, { r: 7 }, { n: i ? i + 1 : undefined, area: "wastewater" })));

  // connections: keep those whose ends exist; re-target references to removed units; add the new units
  const ids = new Set(out.map((e) => e.id));
  const retarget = (id) => {
    if (ids.has(id)) return id;
    const m = id.match(/^([a-z]+)-(\d+)$/); if (!m) return null;
    const same = out.filter((e) => e.id.startsWith(m[1] + "-")).map((e) => +e.id.split("-")[1]).sort((a, b) => b - a);
    return same.length ? `${m[1]}-${same[0]}` : null;
  };
  const fix = (arr) => arr.map((c) => ({ ...c, from: retarget(c.from), to: retarget(c.to) })).filter((c) => c.from && c.to && c.from !== c.to);
  const conns = fix(F.connections);
  for (let i = 5; i <= fm.units; i++) conns.push({ from: "cooler", to: `ferm-${i}`, stream: "mash", direct: true }, { from: `ferm-${i}`, to: "beerwell", stream: "beer", direct: true });
  for (let t = 2; t <= N.dist.units; t++) conns.push({ from: "beerwell", to: `beercol-${t}`, stream: "beer", direct: true }, { from: `beercol-${t}`, to: `rectifier-${t}`, stream: "ethanol", direct: true }, { from: `rectifier-${t}`, to: "sieve-1", stream: "ethanol", direct: true }, { from: `beercol-${t}`, to: "centrifuge", stream: "stillage", fromPort: "bottom" });
  for (let un = 1; un < N.dehy.units; un++) conns.push({ from: "rectifier", to: `sieve-${un * 4 + 1}`, stream: "ethanol", direct: true }, { from: `sieve-${un * 4 + 3}`, to: "prodcooler", stream: "ethanol", direct: true });
  for (let i = 3; i <= st.units; i++) conns.push({ from: `tank-${i - 1}`, to: `tank-${i}`, stream: "ethanol", direct: true });
  const seen = new Set();
  const dedupe = (arr, key) => arr.filter((c) => { const kk = key(c); if (seen.has(kk)) return false; seen.add(kk); return true; });
  const links = fix(F.links);
  for (let i = 3; i <= N.wells.units; i++) links.push({ id: `pw-well${i}`, net: "water", from: `well-${i}`, to: "ro", name: "Well water", direct: true });

  // catalogue: configured kinds show the configured unit sizes (assumption tag, not the verified figures)
  const catalog = { ...F.catalog };
  const spec = (kind, rows) => { catalog[kind] = { ...catalog[kind], specs: rows }; };
  spec("fermenter", [["Working volume", `${Math.round(fm.cap * fm.fill)} m³ of ${Math.round(fm.cap)} m³`, "a"], ["Fermenters", `${fm.n} + ${fm.standby} standby`, "a"], ["Cycle", `${fm.extra.fillH.toFixed(1)} h fill + ${R.rest} h`, "a"]]);
  spec("tank", [["Capacity", `${Math.round(st.cap).toLocaleString("en-CA")} m³`, "a"], ["Tanks", `${st.units}`, "a"]]);
  spec("bin", [["Bin size", `≈ ${Math.round(bin.cap)} t`, "a"], ["Bins", `${bin.units}`, "a"]]);
  spec("sieve", [["Units", `${N.dehy.units} × 4 vessels`, "a"], ["Outlet purity", "99.5 %", "v"]]);

  const F2 = { ...F, equipment: out, connections: dedupe(conns, (c) => `${c.from}>${c.to}>${c.stream}`), links: (seen.clear(), dedupe(links, (l) => l.id)), catalog, configured: true };
  return { F: F2, changed };
}

// ---------------------------------------------------------------- clearance and spatial checks (conceptual)
const IGNORE = new Set(["bund", "rack", "conveyor", "truck", "graintruck", "worker", "tree", "lamp", "sign", "skip", "parking", "structure", "feedlot", "stack", "monument"]);
export function footprint(e) {
  const p = e.params || {}, [x, z] = e.pos;
  let hw, hd;
  if (p.r) { hw = hd = p.r + (e.type === "tank" || e.type === "silo" ? 0.8 : 0.4); }
  else if (e.type === "coolingTower") { hw = ((p.cells || 1) * (p.cw || 8)) / 2; hd = (p.d || 9) / 2; }
  else if (p.w) { hw = p.w / 2; hd = (p.d || p.w) / 2; }
  else if (e.type === "centrifuge") { hw = 2 + (p.n || 2) * 1.6; hd = 2.5; }
  else { hw = hd = 1.2; }
  if (e.rot && Math.abs(Math.sin(e.rot)) > 0.7) [hw, hd] = [hd, hw];
  return { x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd };
}
export function validateLayout(F2, changed, clearance = 1.0) {
  const items = F2.equipment.filter((e) => !e.decor && !IGNORE.has(e.kind));
  const name = (e) => (F2.catalog[e.kind]?.name || e.kind) + (e.n ? ` ${e.n}` : "");
  const flags = [], S = F2.site, R = F2.rack;
  for (const e of items) {
    if (!changed.has(e.id)) continue;
    const a = footprint(e);
    if (a.x0 < S.x[0] || a.x1 > S.x[1] || a.z0 < S.z[0] || a.z1 > S.z[1]) flags.push({ id: e.id, msg: `${name(e)} extends beyond the site boundary.` });
    if (R && a.z1 > R.z - R.w / 2 && a.z0 < R.z + R.w / 2 && a.x1 > R.x[0] && a.x0 < R.x[1]) flags.push({ id: e.id, msg: `${name(e)} crosses the pipe-rack corridor.` });
    for (const o of items) {
      if (o === e || (changed.has(o.id) && o.id < e.id)) continue;
      const b = footprint(o);
      if (a.x0 < b.x1 + clearance && a.x1 + clearance > b.x0 && a.z0 < b.z1 + clearance && a.z1 + clearance > b.z0) flags.push({ id: e.id, other: o.id, msg: `${name(e)} is within ${clearance} m of ${name(o)}.` });
    }
  }
  return flags;
}
