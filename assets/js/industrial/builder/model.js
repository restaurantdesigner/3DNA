/*
 * 3DNA FactoryBuilder — centralized configuration data and configuration engine (conceptual).
 *
 *   OPTIONS / DEFAULTS ...... onboarding inputs (required + advanced) with illustrative defaults
 *   CATALOG ................. equipment types: unique type ID, category, department, discrete unit sizes
 *                             (illustrative capacity range), footprint, budget price, installation factor,
 *                             auxiliary requirements, basis tag ("v" public figure · "b" benchmark · "a" assumption)
 *   FIN_DEFAULTS ............ editable financial assumptions (CAD) with their basis and source
 *   configure(input, fin) ... validates the inputs, converts the production target into flows, chooses unit sizes
 *                             (strategy: standard / balanced / large units), discrete quantities with standby,
 *                             parallel lines, capacity analysis, CAPEX and OPEX, revenue, EBITDA, payback.
 *
 * Calibration: the defaults reproduce the 3DNA Canadian ethanol case study (14 M L/year, Lanigan SK) whose public
 * figures (production, fermenters, product tanks, water use) are documented in ../factories/ethanol-canada.data.js.
 * Everything else is an illustrative assumption that requires independent professional engineering validation.
 */
import { SOURCES, ASSUMPTIONS as A, RESEARCHED } from "../factories/ethanol-canada.data.js?v=ca2";

export const DISCLOSURE = "Conceptual factory configuration generated for visualization and preliminary investment exploration. Equipment sizing, process design, safety systems and financial estimates require independent professional engineering validation.";
export { SOURCES, RESEARCHED };

// ---------------------------------------------------------------- inputs
export const FEEDSTOCKS = {
  wheat: { name: "Feed wheat", yield: 375, dgYield: 0.32, price: 207, basis: "Case-study scenario; public ratio ≈ 10 L/bushel (≈ 367 L/t)", src: "pmEthanol", tag: "b" },
  corn: { name: "Corn (maize)", yield: 400, dgYield: 0.30, price: 235, basis: "Assumption: typical dry-grind yield ≈ 2.8 US gal/bu", tag: "a" },
  barley: { name: "Barley", yield: 320, dgYield: 0.36, price: 195, basis: "Assumption: hulled barley, lower starch", tag: "a" },
  triticale: { name: "Triticale", yield: 360, dgYield: 0.33, price: 200, basis: "Assumption: between wheat and rye", tag: "a" }
};
export const PRODUCTS = {
  fuel: { name: "Fuel ethanol (anhydrous 99.5 %, denatured)", dehydration: true, denature: true, polish: false, priceAdj: 0, basis: "Case-study product (public)" },
  hydrous: { name: "Hydrous ethanol (≈ 95 %)", dehydration: false, denature: false, polish: false, priceAdj: -0.06, basis: "Assumption: lower value, no molecular sieve" },
  industrial: { name: "Industrial / technical ethanol (anhydrous, polished)", dehydration: true, denature: false, polish: true, priceAdj: 0.1, basis: "Assumption: extra polishing column, higher value" }
};
export const CURRENCIES = {
  CAD: { symbol: "C$", rate: 1, locale: "en-CA", basis: "Model currency" },
  USD: { symbol: "US$", rate: 0.71, locale: "en-US", basis: "Illustrative conversion (≈ late 2025); edit as needed" },
  EUR: { symbol: "€", rate: 0.62, locale: "en-IE", basis: "Illustrative conversion (≈ late 2025); edit as needed" }
};
export const COUNTRIES = { CA: { name: "Canada", currency: "CAD" }, US: { name: "United States", currency: "USD" }, EU: { name: "European Union", currency: "EUR" }, OTHER: { name: "Other", currency: "USD" } };
export const SCHEDULES = { continuous: { name: "Continuous 24/7", hours: 24 }, extended: { name: "Two shifts, 20 h/day", hours: 20 }, twoShift: { name: "Two shifts, 16 h/day", hours: 16 } };
export const AUTOMATION = { basic: { name: "Basic (manual operation)", staff: 1.3, auto: 0.04 }, standard: { name: "Standard (DCS)", staff: 1, auto: 0.07 }, advanced: { name: "Advanced (high automation)", staff: 0.78, auto: 0.11 } };
export const ENERGY = {
  gas: { name: "Natural gas boilers", fuelPrice: 5.0, eff: 0.85, boilerCost: 1, basis: "SaskEnergy commodity + delivery (see sources)", src: "gas" },
  biomass: { name: "Biomass boilers", fuelPrice: 3.5, eff: 0.75, boilerCost: 2.2, basis: "Assumption: wood chips; higher boiler cost, fuel yard" },
  electric: { name: "Electric boilers", fuelPrice: 25, eff: 0.98, boilerCost: 0.6, basis: "Assumption: C$0.09/kWh ≈ C$25/GJ; large electrical load" }
};
export const STRATEGIES = { balanced: { name: "Balanced (modular units)" }, standard: { name: "Standard units (more, smaller units)" }, large: { name: "Large units (fewer, larger units)" } };

export const DEFAULTS = {
  target: 14, period: "year", feedstock: "wheat", product: "fuel", days: 350,
  country: "CA", currency: "CAD", land: 0, schedule: "continuous", utilization: 85, automation: "standard",
  grainDays: 14, productDays: 21, energy: "gas", budget: 0, strategy: "balanced", standbyPolicy: "critical", conc: 12, recovery: 98.5
};
export const LIMITS = { target: { year: [2, 250], day: [6000, 700000] }, days: [250, 360], utilization: [50, 100], grainDays: [1, 90], productDays: [2, 90], land: [0, 500], budget: [0, 2000] };

// ---------------------------------------------------------------- equipment catalogue (illustrative)
// sizes: discrete unit capacities offered (first = reference unit); cost: budget purchase price of the reference
// unit (C$ 2025); larger sizes follow the six-tenths rule. fp: footprint [w, d] in m of one unit at the reference
// size (scaled with √size ratio for vessels). install: installation factor on purchase. max: unit count above which
// the balanced strategy moves to the next size. aux: supporting infrastructure.
export const CATALOG = [
  { type: "RCV", id: "receiving", dept: "grain", category: "Raw material handling", name: "Truck intake pit with bucket elevator", cap: [60, 120, 200], unit: "t/h", cost: 650000, install: 0.35, fp: [16, 8], max: 2, rotating: true, aux: "Truck scale, dust aspiration, MCC feeder", tag: "a", kind: "receiving" },
  { type: "SIL", id: "silos", dept: "grain", category: "Raw material storage", name: "Grain storage bin", cap: [600, 1500, 3000], unit: "t", cost: 180000, install: 0.3, fp: [10, 10], max: 8, storage: true, fill: 0.95, aux: "Aeration fans, level sensors, sweep auger", tag: "b", note: "Three bins in the public description; size is an assumption.", kind: "bin" },
  { type: "CLN", id: "cleaning", dept: "grain", category: "Raw material handling", name: "Grain cleaner / scalper", cap: [20, 40, 80], unit: "t/h", cost: 120000, install: 0.3, fp: [5, 4], max: 3, rotating: true, aux: "Dust collection", tag: "a", kind: "cleaner" },
  { type: "MIL", id: "milling", dept: "milling", category: "Processing", name: "Hammer mill line", cap: [6, 12, 20], unit: "t/h", cost: 450000, install: 0.35, fp: [12, 10], max: 3, rotating: true, aux: "Dust cyclone, 250–400 kW drive (assumption)", tag: "a", kind: "mill" },
  { type: "MSH", id: "mash", dept: "cooking", category: "Processing", name: "Slurry system with jet cooker", cap: [40, 80, 160], unit: "m³/h", cost: 250000, install: 0.4, fp: [6, 6], max: 2, aux: "Steam, process water, enzyme dosing", tag: "a", kind: "slurry" },
  { type: "LIQ", id: "liq", dept: "cooking", category: "Processing", name: "Liquefaction / saccharification tank", cap: [83, 150, 300], unit: "m³", cost: 220000, install: 0.35, fp: [6, 6], max: 4, residence: 6, aux: "Agitator, steam coil, mash cooler", tag: "a", kind: "liq" },
  { type: "FRM", id: "ferm", dept: "fermentation", category: "Fermentation", name: "Fermenter", cap: [283, 500, 1000, 1500], unit: "m³", cost: 420000, install: 0.35, fp: [9, 9], max: 8, batch: true, fill: 0.95, aux: "Agitator, external cooler, CIP, CO₂ scrubber", tag: "v", note: "4 × 283,000 L, 48 h fermentation (public figures); price is an assumption.", kind: "fermenter" },
  { type: "DST", id: "dist", dept: "distillation", category: "Distillation", name: "Distillation train (beer column + rectifier)", cap: [20, 40, 80], unit: "m³/h beer", cost: 2600000, install: 0.45, fp: [14, 10], max: 3, line: true, aux: "Reboilers (steam), condensers (cooling water), reflux drums", tag: "a", kind: "beercol" },
  { type: "DHY", id: "dehy", dept: "dehydration", category: "Dehydration", name: "Molecular-sieve unit (4 vessels)", cap: [2200, 5000, 10000], unit: "L/h", cost: 1400000, install: 0.4, fp: [10, 12], max: 3, aux: "Compressed air, vacuum, cooling water", tag: "v", note: "One unit with 4 vessels to 99.5 % (public); capacity is an assumption.", kind: "sieve" },
  { type: "CNT", id: "cent", dept: "coproducts", category: "Co-product processing", name: "Decanter centrifuge", cap: [8, 15, 25], unit: "m³/h stillage", cost: 380000, install: 0.35, fp: [4, 3], max: 6, rotating: true, aux: "Thin-stillage tank, wet-cake conveyor", tag: "a", kind: "centrifuge" },
  { type: "WDG", id: "wdg", dept: "coproducts", category: "Co-product storage", name: "Wet distillers grain bunker", cap: [300, 600], unit: "t", cost: 150000, install: 0.25, fp: [18, 10], max: 4, storage: true, fill: 1, days: 2, aux: "Loader access, drainage", tag: "a", kind: "wdg" },
  { type: "TNK", id: "store", dept: "storage", category: "Product storage", name: "Ethanol storage tank", cap: [500, 1000, 2500], unit: "m³", cost: 260000, install: 0.3, fp: [12, 12], max: 6, storage: true, fill: 0.9, aux: "Containment bund, vapour control, foam system", tag: "v", note: "2 × 500,000 L (public); price is an assumption.", kind: "tank" },
  { type: "LDG", id: "loading", dept: "storage", category: "Loading", name: "Road-tanker loading bay", cap: [60, 120], unit: "m³/h", cost: 300000, install: 0.35, fp: [12, 14], max: 3, hours: 12, aux: "Metering, vapour recovery, earthing", tag: "a", kind: "loading" },
  { type: "BLR", id: "steam", dept: "utilities", category: "Thermal energy", name: "Steam boiler", cap: [5, 10, 20], unit: "t/h steam", cost: 550000, install: 0.4, fp: [7, 10], max: 4, critical: true, aux: "Fuel supply, water treatment, stack", tag: "a", kind: "boiler" },
  { type: "TRF", id: "power", dept: "electrical", category: "Electrical infrastructure", name: "Power transformer", cap: [1000, 2500, 5000], unit: "kVA", cost: 180000, install: 0.35, fp: [6, 5], max: 4, critical: true, aux: "MV switchgear, MCC, standby generator", tag: "a", kind: "substation" },
  { type: "CWT", id: "cooling", dept: "utilities", category: "Cooling", name: "Cooling-tower cell", cap: [1.5, 3, 5], unit: "MW", cost: 220000, install: 0.35, fp: [8, 9], max: 6, rotating: true, aux: "Circulation pumps, chemical dosing", tag: "a", kind: "cooling" },
  { type: "ROT", id: "water", dept: "utilities", category: "Water treatment", name: "Reverse-osmosis train", cap: [25, 50, 100], unit: "m³/h", cost: 450000, install: 0.35, fp: [12, 8], max: 3, aux: "Treated-water tanks, raw-water wells", tag: "a", kind: "ro" },
  { type: "WEL", id: "wells", dept: "utilities", category: "Water supply", name: "Deep well with pump", cap: [12, 25], unit: "m³/h", cost: 90000, install: 0.3, fp: [3, 3], max: 12, rotating: true, aux: "Raw-water main to RO", tag: "b", note: "2 deep wells (public); yield is an assumption.", kind: "well" },
  { type: "WWT", id: "ww", dept: "wastewater", category: "Waste treatment", name: "Clarifier + aeration line", cap: [15, 40, 100], unit: "m³/h", cost: 600000, install: 0.4, fp: [16, 16], max: 3, aux: "Pump station, sludge handling", tag: "a", kind: "clarifier" }
];
export const DEPARTMENTS = {
  grain: { step: 1, color: 0xf2c14e, name: "Raw material receiving and storage", side: "n" },
  milling: { step: 2, color: 0xe8a33d, name: "Milling", side: "n" },
  cooking: { step: 3, color: 0xf97316, name: "Mash preparation and liquefaction", side: "n" },
  fermentation: { step: 4, color: 0xa855f7, name: "Fermentation", side: "n" },
  distillation: { step: 5, color: 0x3b82f6, name: "Distillation", side: "n" },
  dehydration: { step: 6, color: 0x06b6d4, name: "Dehydration", side: "n" },
  storage: { step: 7, color: 0x22d3ee, name: "Product storage and loading", side: "n" },
  coproducts: { step: 8, color: 0xb7793b, name: "Co-product processing", side: "s" },
  utilities: { step: 9, color: 0x94a3b8, name: "Utilities: steam, cooling and water", side: "s" },
  wastewater: { step: 10, color: 0xa16207, name: "Wastewater treatment", side: "s" },
  electrical: { step: 11, color: 0xfacc15, name: "Electrical and fire protection", side: "s" },
  admin: { step: 12, color: 0x64748b, name: "Administration and control", side: "s" }
};

// ---------------------------------------------------------------- financial assumptions (CAD, editable)
const src = (k) => (SOURCES[k] ? { title: SOURCES[k].title, url: SOURCES[k].url, accessed: SOURCES[k].accessed } : null);
export const FIN_DEFAULTS = [
  { id: "ethanolPrice", label: "Ethanol selling price", v: A.ethanolPrice.v, unit: "C$/L", step: 0.01, basis: A.ethanolPrice.basis, src: src("ethanol"), tag: "b" },
  { id: "feedPrice", label: "Feedstock price (delivered)", v: null, unit: "C$/t", step: 1, basis: "Per feedstock (see feedstock basis); wheat: case-study scenario vs C$253/t Oct 2025 benchmark", src: src("wheat"), tag: "b" },
  { id: "coValue", label: "Co-product value (WDG)", v: A.dgValue.v, unit: "C$/t DM", step: 1, basis: A.dgValue.basis, tag: "a" },
  { id: "fuelPrice", label: "Thermal energy price", v: null, unit: "C$/GJ", step: 0.25, basis: "Per energy source", src: src("gas"), tag: "b" },
  { id: "powerPrice", label: "Electricity price", v: A.powerPrice.v, unit: "C$/kWh", step: 0.005, basis: A.powerPrice.basis, src: src("power"), tag: "b" },
  { id: "thermal", label: "Thermal energy use", v: A.thermal.v, unit: "MJ/L", step: 0.1, basis: A.thermal.basis, src: src("energy"), tag: "b" },
  { id: "power", label: "Electricity use", v: A.power.v, unit: "kWh/L", step: 0.01, basis: A.power.basis, src: src("energy"), tag: "b" },
  { id: "waterUse", label: "Water use", v: A.water.v / 40, unit: "L/L ethanol", step: 0.5, basis: "> 400,000 L/day at 40,000 L/day (public)", src: src("pmEthanol"), tag: "v" },
  { id: "waterCost", label: "Water and wastewater cost", v: A.waterCost.v, unit: "C$/m³", step: 0.05, basis: A.waterCost.basis, tag: "a" },
  { id: "chemicals", label: "Enzymes, yeast and chemicals", v: A.chemicals.v, unit: "C$/L", step: 0.005, basis: A.chemicals.basis, tag: "a" },
  { id: "wage", label: "Loaded wage", v: A.wage.v, unit: "C$/FTE/year", step: 1000, basis: A.wage.basis, tag: "a" },
  { id: "maintenance", label: "Maintenance", v: A.maintenance.v, unit: "% of CAPEX/year", step: 0.1, basis: A.maintenance.basis, tag: "a" },
  { id: "logistics", label: "Product logistics", v: A.logistics.v, unit: "C$/L", step: 0.005, basis: A.logistics.basis, tag: "a" },
  { id: "admin", label: "Insurance and administration", v: A.insurance.v, unit: "M C$/year (reference plant)", step: 0.05, basis: A.insurance.basis, tag: "a" },
  { id: "buildingCost", label: "Building construction", v: 2200, unit: "C$/m²", step: 50, basis: "Assumption: pre-engineered industrial buildings, Western Canada", tag: "a" },
  { id: "siteCost", label: "Site works and roads", v: 28, unit: "C$/m² of site", step: 1, basis: "Assumption: grading, drainage, paving, fencing, lighting", tag: "a" },
  { id: "rackCost", label: "Pipe rack", v: 6000, unit: "C$/m", step: 250, basis: "Assumption: three-tier steel rack", tag: "a" },
  { id: "engineering", label: "Engineering", v: 8, unit: "% of direct cost", step: 0.5, basis: "Assumption", tag: "a" },
  { id: "contingency", label: "Contingency", v: 10, unit: "% of direct + engineering", step: 0.5, basis: "Assumption (conceptual stage)", tag: "a" }
];

// ---------------------------------------------------------------- engine
const clamp = (v, [a, b]) => Math.min(b, Math.max(a, v));
const ceil = (x) => Math.max(0, Math.ceil(x - 1e-9));
const REF_L = 14e6;

export function normalize(raw = {}) {
  const issues = [];
  const x = { ...DEFAULTS, ...raw };
  for (const [k, set] of [["feedstock", FEEDSTOCKS], ["product", PRODUCTS], ["currency", CURRENCIES], ["country", COUNTRIES], ["schedule", SCHEDULES], ["automation", AUTOMATION], ["energy", ENERGY], ["strategy", STRATEGIES]]) if (!set[x[k]]) { issues.push(`Unknown ${k} "${x[k]}" — default used.`); x[k] = DEFAULTS[k]; }
  if (x.period !== "day" && x.period !== "year") x.period = "year";
  for (const k of ["target", "days", "utilization", "grainDays", "productDays", "land", "budget", "conc", "recovery"]) { const n = Number(x[k]); if (!isFinite(n)) { issues.push(`${k} is not a number — default used.`); x[k] = DEFAULTS[k]; } else x[k] = n; }
  const lim = LIMITS.target[x.period];
  if (x.target < lim[0] || x.target > lim[1]) { issues.push(`Target outside the supported range (${lim[0]}–${lim[1]} ${x.period === "year" ? "M L/year" : "L/day"}) — clamped.`); x.target = clamp(x.target, lim); }
  for (const k of ["days", "utilization", "grainDays", "productDays", "land", "budget"]) { const v = clamp(x[k], LIMITS[k]); if (v !== x[k]) { issues.push(`${k} clamped to ${v}.`); x[k] = v; } }
  return { input: x, issues };
}

export function configure(raw, finOver = {}) {
  const { input: inp, issues } = normalize(raw);
  const fs = FEEDSTOCKS[inp.feedstock], prod = PRODUCTS[inp.product], en = ENERGY[inp.energy], auto = AUTOMATION[inp.automation];
  const hours = SCHEDULES[inp.schedule].hours;
  const fin = Object.fromEntries(FIN_DEFAULTS.map((f) => [f.id, f.v]));
  fin.feedPrice = fs.price; fin.fuelPrice = en.fuelPrice;
  for (const [k, v] of Object.entries(finOver || {})) if (k in fin && isFinite(+v) && v !== "" && v !== null) fin[k] = +v;
  const u = inp.utilization / 100;

  // flows
  const Ly = inp.period === "year" ? inp.target * 1e6 : inp.target * inp.days;
  const dayL = Ly / inp.days, hL = dayL / hours;
  const grainTd = dayL / fs.yield, grainTh = grainTd / hours;
  const beerM3h = hL / (inp.recovery / 100) / (inp.conc / 100) / 1000, stillM3h = beerM3h * 0.88;
  const wdgTd = (grainTd * fs.dgYield) / 0.235;
  const steamTh = (hL * fin.thermal * 0.85) / 2.2 / 1000;                   // t/h at the reference boiler efficiency
  const boilerElecKW = inp.energy === "electric" ? (hL * fin.thermal) / 3.6 / en.eff : 0;
  const kva = ((hL * fin.power + boilerElecKW) * 1.6) / 0.9;
  const heatMW = (hL * 4.5) / 3600, waterM3h = (dayL * fin.waterUse) / 1000 / hours;
  const flows = { Ly, dayL, hL, hours, grainTd, grainTh, beerM3h, stillM3h, wdgTd, steamTh, kva, heatMW, waterM3h, wwM3h: waterM3h * 0.3 };
  const rest = 48 + 3 + 3;

  const reqOf = (c, cap) => {
    switch (c.id) {
      case "receiving": case "cleaning": return grainTd * 1.2 / 12;
      case "milling": return grainTh;
      case "mash": return beerM3h * (prod.polish ? 1 : 1);
      case "liq": return beerM3h * c.residence;
      case "dist": return beerM3h * (prod.polish ? 1.1 : 1);
      case "dehy": return hL;
      case "cent": return stillM3h;
      case "loading": return dayL / 1000 / c.hours;
      case "steam": return steamTh * (prod.polish ? 1.12 : 1);
      case "power": return kva;
      case "cooling": return heatMW * (prod.polish ? 1.1 : 1);
      case "water": case "wells": return waterM3h;
      case "ww": return waterM3h * 0.3;
      case "silos": return grainTd * inp.grainDays;
      case "store": return (dayL / 1000) * inp.productDays;
      case "wdg": return wdgTd * c.days;
      default: return 0;
    }
  };
  const unitsFor = (c, cap) => {
    if (c.batch) { const Vw = cap * c.fill; return ceil(1 + (beerM3h * rest) / Vw); }
    const req = reqOf(c, cap);
    return c.storage ? ceil(req / (cap * c.fill)) : ceil(req / (cap * u));
  };
  const stages = [];
  for (const c of CATALOG) {
    if (c.id === "dehy" && !prod.dehydration) continue;
    // size choice: standard = smallest unit; large = largest; balanced = smallest size within the stage's unit limit
    let ci = 0;
    if (inp.strategy === "large") ci = c.cap.length - 1;
    else if (inp.strategy === "balanced") { while (ci < c.cap.length - 1 && unitsFor(c, c.cap[ci]) > c.max) ci++; }
    const cap = c.cap[ci], n = Math.max(1, unitsFor(c, cap));
    const cost = c.cost * Math.pow(cap / c.cap[0], 0.6) * (c.id === "steam" ? en.boilerCost : 1);
    const standby = inp.standbyPolicy === "none" ? 0 : (c.critical || (inp.standbyPolicy === "rotating" && c.rotating)) ? 1 : 0;
    const req = c.batch ? beerM3h * rest + cap * c.fill : reqOf(c, cap);
    let util, maxL = null, extra = {};
    if (c.batch) { const Vw = cap * c.fill, Qmax = ((n - 1) * Vw) / rest; util = req / (n * Vw); maxL = Ly * (Qmax / beerM3h); extra = { fillH: Vw / beerM3h, cycleH: Vw / beerM3h + rest }; }
    else if (c.storage) { util = req / (n * cap * c.fill); const perDay = c.id === "silos" ? grainTd : c.id === "store" ? dayL / 1000 : wdgTd; extra = { autonomy: (n * cap * c.fill) / perDay }; }
    else { util = req / (n * cap); maxL = Ly * ((n * cap * u) / req); }
    stages.push({ ...c, sizeIndex: ci, unitCap: cap, n, standby, units: n + standby, req, installedCap: (n + standby) * cap, util, reserve: 1 - util, maxL, unitCost: cost, extra, lines: c.line ? n : null });
  }
  const flowStages = stages.filter((s) => s.maxL != null);
  const bottleneck = flowStages.reduce((a, b) => (b.maxL < a.maxL ? b : a));
  const configuredL = Math.min(...flowStages.map((s) => s.maxL));
  const producedL = Math.min(Ly, configuredL);

  // generated equipment items (each with a unique ID) — the 3D layout and the inventory use this list
  const items = [];
  const S = Object.fromEntries(stages.map((s) => [s.id, s]));
  const pushN = (s, prefix, count, extra = {}) => { for (let i = 1; i <= count; i++) items.push({ id: `${prefix}-${String(i).padStart(2, "0")}`, stage: s.id, type: s.type, standby: i > s.n, n: i, ...extra }); };
  for (const s of stages) pushN(s, s.type, s.units);
  // fixed auxiliaries (not sized by the target; priced as a share of their stage or a flat budget)
  const aux = [
    ["YST-01", "fermentation", "Yeast propagation tank", 160000], ["BWL-01", "fermentation", "Beer well", 240000], ["SCR-01", "fermentation", "CO₂ scrubber", 180000],
    ["COL-01", "cooking", "Mash cooler", 120000], ["PCL-01", "dehydration", "Ethanol product cooler", 80000], ["DAY-01", "storage", "Shift tank 1", 70000], ["DAY-02", "storage", "Shift tank 2", 70000],
    ["TST-01", "coproducts", "Thin stillage tank", 110000], ["CMP-01", "utilities", "Air compressor house", 260000], ["CWP-01", "utilities", "Cooling-water pump station", 220000],
    ["WTK-01", "utilities", "Treated water tank 1", 90000], ["WTK-02", "utilities", "Treated water tank 2", 90000], ["MCC-01", "electrical", "Motor control centre", 520000], ["GEN-01", "electrical", "Standby diesel generator", 380000],
    ["FWT-01", "electrical", "Fire-water tank", 260000], ["FWP-01", "electrical", "Fire pump house", 340000], ["ADM-01", "admin", "Offices and control room", 0], ["LAB-01", "admin", "Quality laboratory", 0], ["GTE-01", "admin", "Gatehouse", 0]
  ];
  if (prod.denature) aux.push(["DEN-01", "storage", "Denaturant tank", 90000]);
  if (prod.polish) aux.push(["POL-01", "distillation", "Polishing column", 900000]);
  if (inp.energy === "biomass") aux.push(["FUY-01", "utilities", "Biomass fuel yard", 650000]);

  // CAPEX
  const procPurchase = stages.filter((s) => !["steam", "power", "cooling", "water", "wells", "ww"].includes(s.id)).reduce((a, s) => a + s.units * s.unitCost, 0) + aux.filter(([, d]) => !["utilities", "electrical"].includes(d)).reduce((a, x) => a + x[3], 0);
  const utilPurchase = stages.filter((s) => ["steam", "power", "cooling", "water", "wells", "ww"].includes(s.id)).reduce((a, s) => a + s.units * s.unitCost, 0) + aux.filter(([, d]) => ["utilities", "electrical"].includes(d)).reduce((a, x) => a + x[3], 0);
  const install = stages.reduce((a, s) => a + s.units * s.unitCost * s.install, 0) + aux.reduce((a, x) => a + x[3] * 0.35, 0) + (procPurchase + utilPurchase) * auto.auto;
  return { input: inp, issues, flows, stages, bottleneck, configuredL, producedL, items, aux, procPurchase, utilPurchase, install, fin, rest, S, hours, feedstock: fs, product: prod, energy: en, automation: auto };
}

// completes the investment model once the layout (site and building areas, rack length) is known
export function invest(cfg, layout) {
  const f = cfg.fin, inp = cfg.input, L = cfg.producedL;
  const construction = layout.buildingArea * f.buildingCost;
  const infrastructure = layout.siteArea * f.siteCost + layout.rackLength * f.rackCost;
  const direct = cfg.procPurchase + cfg.utilPurchase + cfg.install + construction + infrastructure;
  const engineering = direct * f.engineering / 100, contingency = (direct + engineering) * f.contingency / 100;
  const capexLines = [["Equipment", cfg.procPurchase], ["Utilities", cfg.utilPurchase], ["Installation", cfg.install], ["Construction", construction], ["Infrastructure", infrastructure], ["Engineering", engineering], ["Contingency", contingency]];
  const capex = capexLines.reduce((a, x) => a + x[1], 0);
  const grainTy = L / cfg.feedstock.yield, gas = (L * f.thermal / 1000) * (0.85 / cfg.energy.eff);
  const staff = Math.max(8, Math.round(A.staff.v * Math.pow(Math.max(L, 1e5) / REF_L, 0.4) * cfg.automation.staff));
  const opexLines = [
    ["Raw materials", grainTy * f.feedPrice + L * f.chemicals],
    ["Energy", gas * f.fuelPrice * (inp.energy === "electric" ? 1 : 1) + L * f.power * f.powerPrice],
    ["Water", (L * f.waterUse / 1000) * f.waterCost],
    ["Personnel", staff * f.wage],
    ["Maintenance", capex * f.maintenance / 100],
    ["Logistics", L * f.logistics],
    ["Administration", f.admin * 1e6 * Math.pow(Math.max(L, 1e5) / REF_L, 0.5)]
  ];
  const opex = opexLines.reduce((a, x) => a + x[1], 0);
  const ethPrice = f.ethanolPrice + cfg.product.priceAdj;
  const coT = grainTy * cfg.feedstock.dgYield;
  const revEth = L * ethPrice, revCo = coT * f.coValue, revenue = revEth + revCo;
  const ebitda = revenue - opex;
  return { capexLines, capex, opexLines, opex, revEth, revCo, revenue, ebitda, margin: revenue ? ebitda / revenue : 0, costPerL: L ? opex / L : 0, netCostPerL: L ? (opex - revCo) / L : 0, payback: ebitda > 0 ? capex / ebitda : null, staff, ethPrice, overBudget: inp.budget > 0 && capex / 1e6 > inp.budget * (1 / CURRENCIES[inp.currency].rate) };
}
