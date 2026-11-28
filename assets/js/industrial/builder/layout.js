/*
 * 3DNA FactoryBuilder — conceptual layout generator.
 *   generateFactory(cfg) → { F, inventory, stats, checks }
 * F follows the factory schema read by ../engine.js (site, roads, rack, areas, equipment, paths, streams,
 * connections, networks, links, catalog …), so the existing procedural equipment library, engineering-network
 * routing, selection and views render the generated plant without any manual modelling.
 *
 * Layout rules (conceptual): a pipe rack runs west → east through the middle of the site; process departments
 * sit north of it in process order (raw material → milling → cooking → fermentation → distillation →
 * dehydration → product storage and loading); co-products, utilities, wastewater, electrical and administration
 * sit south of it. Each department is packed in rows of equipment blocks with clearances; departments are
 * separated by service lanes; a perimeter road, the fence and the site size follow the packed extents.
 */
import ref from "../factories/ethanol.js?v=ind16";
import { DEPARTMENTS } from "./model.js?v=fb1";

const CLR = 4, DEPT_GAP = 12, RACK_W = 10, RACK_CLEAR = 9, ROAD = 8;

export function generateFactory(cfg) {
  const S = cfg.S, prod = cfg.product, inp = cfg.input;
  const scale = (cap, base) => Math.cbrt(cap / base);
  const blocks = Object.fromEntries(Object.keys(DEPARTMENTS).map((k) => [k, []]));
  const inv = [];                                       // inventory rows: one per priced equipment unit / part
  const items = [];                                     // 3D equipment entries
  const E = (id, kind, type, params = {}, extra = {}) => ({ id, kind, type, params, ...extra });
  const blockOf = (dept, w, d, parts, order = 0) => blocks[dept].push({ w, d, parts, order });
  const one = (dept, e, w, d, order = 0) => blockOf(dept, w, d, [{ ...e, dx: 0, dz: 0 }], order);
  const invRow = (id, stage, name, dept, cap, unit, price, installF, obj, extra = {}) => inv.push({ id, stage, name, dept, cap, unit, price, install: price * installF, obj: obj || id, ...extra });
  const st = (id) => S[id];
  const ids = (s) => Array.from({ length: s ? s.units : 0 }, (_, i) => `${s.type}-${String(i + 1).padStart(2, "0")}`);

  // ---------------------------------------------------------------- raw material
  { const s = st("silos"), k = scale(s.unitCap, 600), r = 4.5 * k;
    ids(s).forEach((id, i) => { one("grain", E(id, "bin", "silo", { r, h: 12 * k, hopper: 2.5 }, { n: i + 1 }), 2 * r + 2, 2 * r + 2, 0); invRow(id, s, `Grain storage bin ${i + 1}`, "grain", s.unitCap, s.unit, s.unitCost, s.install, id, { dims: `Ø ${(2 * r).toFixed(1)} × ${(12 * k + 2.5).toFixed(0)} m` }); }); }
  { const s = st("cleaning"); ids(s).forEach((id, i) => { one("grain", E(id, "cleaner", "building", { w: 6, d: 5, h: 5, windows: false, doors: 1, wall: "wallDark" }, { n: i + 1 }), 6, 5, 1); invRow(id, s, `Grain cleaner ${i + 1}`, "grain", s.unitCap, s.unit, s.unitCost, s.install, id, { dims: "6 × 5 × 5 m" }); }); }
  { const s = st("receiving"); ids(s).forEach((id, i) => { const w = 16 + 4 * s.sizeIndex; one("grain", E(id, "receiving", "building", { w, d: 8, h: 7, doors: 2, wall: "wallDark" }, { n: i + 1 }), w, 8, 2); invRow(id, s, `Truck intake pit ${i + 1}`, "grain", s.unitCap, s.unit, s.unitCost, s.install, id, { dims: `${w} × 8 × 7 m` }); }); }
  // ---------------------------------------------------------------- milling
  { const s = st("milling"); ids(s).forEach((id, i) => { const w = 10 + 3 * s.sizeIndex; one("milling", E(id, "mill", "building", { w, d: 9, h: 10, doors: 1 }, { n: i + 1 }), w, 9); invRow(id, s, `Hammer mill line ${i + 1}`, "milling", s.unitCap, s.unit, s.unitCost, s.install, id, { dims: `${w} × 9 × 10 m` }); }); }
  // ---------------------------------------------------------------- cooking
  { const s = st("mash"); ids(s).forEach((id, i) => { const r = 2 * scale(s.unitCap, 40); one("cooking", E(id, "slurry", "tank", { r, h: 4.5, roof: "flat" }, { n: i + 1 }), 2 * r + 2, 2 * r + 2, 0); invRow(id, s, `Slurry system ${i + 1}`, "cooking", s.unitCap, s.unit, s.unitCost, s.install, id); }); }
  { const s = st("liq"), k = scale(s.unitCap, 83); ids(s).forEach((id, i) => { const r = 2.2 * k; one("cooking", E(id, "liq", "tank", { r, h: 5.5 * k, roof: "dome" }, { n: i + 1 }), 2 * r + 2, 2 * r + 2, 1); invRow(id, s, `Liquefaction tank ${i + 1}`, "cooking", s.unitCap, s.unit, s.unitCost, s.install, id, { dims: `Ø ${(2 * r).toFixed(1)} × ${(5.5 * k).toFixed(1)} m` }); }); }
  one("cooking", E("COL-01", "cooler", "exchanger", { r: 0.6, len: 5 }), 6, 2.5, 2);
  // ---------------------------------------------------------------- fermentation
  { const s = st("ferm"), k = scale(s.unitCap, 283), r = 3.6 * k;
    ids(s).forEach((id, i) => { one("fermentation", E(id, "fermenter", "tank", { r, h: 7 * k, roof: "dome", legs: 1.6, agitator: true }, { n: i + 1 }), 2 * r + 2.5, 2 * r + 2.5, 0); invRow(id, s, `Fermenter ${i + 1}`, "fermentation", s.unitCap, s.unit, s.unitCost, s.install, id, { standby: i >= s.n, dims: `Ø ${(2 * r).toFixed(1)} × ${(7 * k + 1.6).toFixed(1)} m` }); });
    const bw = 3 * Math.sqrt(k);
    one("fermentation", E("BWL-01", "beerwell", "tank", { r: bw, h: 7 * Math.sqrt(k), roof: "dome" }), 2 * bw + 2, 2 * bw + 2, 1);
    one("fermentation", E("YST-01", "yeast", "vessel", { r: 1.4, h: 4, legs: 1.2 }), 4, 4, 1);
    one("fermentation", E("SCR-01", "scrubber", "column", { r: 0.7, h: 10, step: 5, mat: "steel" }), 3, 3, 1); }
  // ---------------------------------------------------------------- distillation (parallel trains)
  { const s = st("dist"), k = Math.sqrt(s.unitCap / 20);
    ids(s).forEach((id, i) => {
      blockOf("distillation", 18, 16, [
        { ...E(id, "beercol", "column", { r: 0.95 * k, h: 18, step: 6 }, { n: i + 1 }), dx: -4, dz: 4 },
        { ...E(`${id}-R`, "rectifier", "column", { r: 0.8 * k, h: 20, step: 6 }, { n: i + 1 }), dx: 2, dz: 4 },
        { ...E(`${id}-S`, "structure", "structure", { w: 12, d: 6, levels: 3, lh: 5 }), dx: 0, dz: -3.5 },
        { ...E(`${id}-C`, "condenser", "exchanger", { r: 0.7, len: 5 }), dx: 0, dz: -8 }
      ]);
      invRow(id, s, `Distillation train ${i + 1} — beer column`, "distillation", s.unitCap, s.unit, s.unitCost * 0.45, s.install, id, { standby: i >= s.n });
      invRow(`${id}-R`, s, `Distillation train ${i + 1} — rectifier`, "distillation", s.unitCap, s.unit, s.unitCost * 0.35, s.install, `${id}-R`);
      invRow(`${id}-S`, s, `Distillation train ${i + 1} — reboilers, condensers and structure`, "distillation", s.unitCap, s.unit, s.unitCost * 0.2, s.install, `${id}-S`);
    });
    if (prod.polish) one("distillation", E("POL-01", "rectifier", "column", { r: 0.7, h: 16, step: 6 }, { n: 99 }), 4, 4, 1); }
  // ---------------------------------------------------------------- dehydration
  if (st("dehy")) { const s = st("dehy");
    ids(s).forEach((id, i) => { blockOf("dehydration", 12, 14, ["A", "B", "C", "D"].map((p, j) => ({ ...E(`${id}-${p}`, "sieve", "vessel", { r: 0.9 * Math.sqrt(s.unitCap / 2200) ** 0.5, h: 6, mat: "insulation", legs: 1.4 }, { n: i * 4 + j + 1 }), dx: (j % 2) * 6 - 3, dz: Math.floor(j / 2) * 7 - 3.5 })));
      ["A", "B", "C", "D"].forEach((p) => invRow(`${id}-${p}`, s, `Molecular-sieve unit ${i + 1} — vessel ${p}`, "dehydration", s.unitCap, s.unit, s.unitCost / 4, s.install, `${id}-${p}`)); }); }
  one(st("dehy") ? "dehydration" : "distillation", E("PCL-01", "prodcooler", "exchanger", { r: 0.55, len: 4 }), 5, 2.5, 2);
  // ---------------------------------------------------------------- product storage and loading
  one("storage", E("DAY-01", "day", "tank", { r: 1.8, h: 5, roof: "cone" }, { n: 1 }), 5, 5, 0);
  one("storage", E("DAY-02", "day", "tank", { r: 1.8, h: 5, roof: "cone" }, { n: 2 }), 5, 5, 0);
  if (prod.denature) one("storage", E("DEN-01", "denaturant", "tank", { r: 1.6, h: 4, roof: "cone", band: "cabRed" }), 5, 5, 0);
  { const s = st("store"), k = scale(s.unitCap, 500), r = 4.6 * k;
    ids(s).forEach((id, i) => { one("storage", E(id, "tank", "tank", { r, h: 7.5 * k, roof: "cone", label: i === 0 ? "ETHANOL|" + (prod.dehydration ? "99.5 %" : "95 %") : "" }, { n: i + 1, tankFarm: true }), 2 * r + 5, 2 * r + 5, 1); invRow(id, s, `Ethanol storage tank ${i + 1}`, "storage", s.unitCap, s.unit, s.unitCost, s.install, id, { dims: `Ø ${(2 * r).toFixed(1)} × ${(7.5 * k).toFixed(1)} m` }); }); }
  { const s = st("loading"); ids(s).forEach((id, i) => { one("storage", E(id, "loading", "canopy", { w: 12, d: 16, h: 7 }, { n: i + 1 }), 14, 18, 3); invRow(id, s, `Tanker loading bay ${i + 1}`, "storage", s.unitCap, s.unit, s.unitCost, s.install, id, { dims: "12 × 16 m canopy" }); }); }
  // ---------------------------------------------------------------- co-products
  { const s = st("cent"); ids(s).forEach((id, i) => { one("coproducts", E(id, "centrifuge", "centrifuge", { n: 1 }, { n: i + 1 }), 7, 6, 0); invRow(id, s, `Decanter centrifuge ${i + 1}`, "coproducts", s.unitCap, s.unit, s.unitCost, s.install, id, { standby: i >= s.n }); }); }
  one("coproducts", E("TST-01", "tstank", "tank", { r: 2.6, h: 5, roof: "dome" }), 7, 7, 1);
  { const s = st("wdg"); ids(s).forEach((id, i) => { const w = s.unitCap > 300 ? 26 : 18; one("coproducts", E(id, "wdg", "bunker", { w, d: 10, h: 3 }, { n: i + 1 }), w, 10, 2); invRow(id, s, `WDG bunker ${i + 1}`, "coproducts", s.unitCap, s.unit, s.unitCost, s.install, id, { dims: `${w} × 10 m` }); }); }
  // ---------------------------------------------------------------- utilities
  { const s = st("steam"); ids(s).forEach((id, i) => { const w = 7 + 2 * s.sizeIndex; one("utilities", E(id, "boiler", "building", { w, d: 10, h: 9, doors: 1 }, { n: i + 1 }), w, 10, 0); invRow(id, s, `Steam boiler ${i + 1} (${cfg.energy.name.toLowerCase()})`, "utilities", s.unitCap, s.unit, s.unitCost, s.install, id, { standby: i >= s.n, dims: `${w} × 10 × 9 m house` }); });
    one("utilities", E("STK-01", "stack", "stack", { r: 0.9, h: 22 }), 3, 3, 0); }
  { const s = st("cooling"), per = 4, towers = Math.ceil(s.units / per);
    for (let t = 0; t < towers; t++) { const cells = Math.min(per, s.units - t * per), cw = 8 * Math.sqrt(s.unitCap / 1.5); one("utilities", E(`CWT-T${t + 1}`, "cooling", "coolingTower", { cells, cw, d: 9 * Math.sqrt(s.unitCap / 1.5), h: 8 }, { n: t + 1 }), cells * cw + 2, 9 * Math.sqrt(s.unitCap / 1.5) + 2, 1); }
    ids(s).forEach((id, i) => invRow(id, s, `Cooling-tower cell ${i + 1}`, "utilities", s.unitCap, s.unit, s.unitCost, s.install, `CWT-T${Math.floor(i / per) + 1}`, { standby: i >= s.n })); }
  one("utilities", E("CWP-01", "cwpump", "building", { w: 8, d: 5, h: 4, windows: false, doors: 1, wall: "wallDark" }), 8, 5, 1);
  one("utilities", E("CMP-01", "compressor", "building", { w: 8, d: 6, h: 4.5, windows: false, doors: 1, wall: "wallDark" }), 8, 6, 1);
  { const s = st("water"); ids(s).forEach((id, i) => { one("utilities", E(id, "ro", "building", { w: 12, d: 8, h: 6, doors: 1 }, { n: i + 1 }), 12, 8, 2); invRow(id, s, `Reverse-osmosis train ${i + 1}`, "utilities", s.unitCap, s.unit, s.unitCost, s.install, id); }); }
  one("utilities", E("WTK-01", "wtank", "tank", { r: 3, h: 6, roof: "flat" }, { n: 1 }), 7, 7, 2);
  one("utilities", E("WTK-02", "wtank", "tank", { r: 3, h: 6, roof: "flat" }, { n: 2 }), 7, 7, 2);
  { const s = st("wells"); ids(s).forEach((id, i) => { one("utilities", E(id, "well", "wellhead", {}, { n: i + 1 }), 4, 4, 3); invRow(id, s, `Deep well ${i + 1}`, "utilities", s.unitCap, s.unit, s.unitCost, s.install, id); }); }
  if (inp.energy === "biomass") one("utilities", E("FUY-01", "fuelyard", "bunker", { w: 30, d: 14, h: 4 }), 30, 14, 3);
  // ---------------------------------------------------------------- wastewater
  one("wastewater", E("WWP-01", "wwpump", "building", { w: 6, d: 5, h: 4, windows: false, doors: 1, wall: "wallDark" }), 6, 5, 0);
  { const s = st("ww"), k = Math.sqrt(s.unitCap / 15);
    ids(s).forEach((id, i) => { const r = 7 * k; blockOf("wastewater", 2 * r + 18 * k, 2 * r + 2, [{ ...E(id, "clarifier", "clarifier", { r }, { n: i + 1 }), dx: -9 * k, dz: 0 }, { ...E(`${id}-B`, "aeration", "basin", { w: 14 * k, d: 9 * k, h: 3 }, { n: i + 1 }), dx: r + 1, dz: 0 }], 1);
      invRow(id, s, `Wastewater line ${i + 1} — clarifier`, "wastewater", s.unitCap, s.unit, s.unitCost * 0.5, s.install, id); invRow(`${id}-B`, s, `Wastewater line ${i + 1} — aeration basin`, "wastewater", s.unitCap, s.unit, s.unitCost * 0.5, s.install, `${id}-B`); }); }
  // ---------------------------------------------------------------- electrical and fire
  { const s = st("power"); one("electrical", E("SUB-01", "substation", "substation", { w: 14 + 5 * s.units, d: 16, units: s.units }), 14 + 5 * s.units + 2, 18, 0);
    ids(s).forEach((id, i) => invRow(id, s, `Power transformer ${i + 1}`, "electrical", s.unitCap, s.unit, s.unitCost, s.install, "SUB-01", { standby: i >= s.n })); }
  one("electrical", E("MCC-01", "mcc", "building", { w: 10, d: 6, h: 5, windows: false, doors: 1, wall: "wallDark" }), 10, 6, 1);
  one("electrical", E("GEN-01", "egen", "egen", {}), 6, 4, 1);
  one("electrical", E("FWT-01", "firetank", "tank", { r: 5, h: 9, roof: "cone", band: "fireRed" }), 12, 12, 2);
  one("electrical", E("FWP-01", "firepump", "building", { w: 7, d: 5, h: 4, windows: false, doors: 1, wall: "wallDark" }), 7, 5, 2);
  // ---------------------------------------------------------------- administration
  one("admin", E("ADM-01", "admin", "office", { w: 26, d: 13, floors: 3, sign: { title: "3DNA FACTORYBUILDER", sub: "CONCEPTUAL ETHANOL FACILITY" } }), 26, 13, 0);
  one("admin", E("LAB-01", "lab", "office", { w: 13, d: 9, floors: 2 }), 13, 9, 0);
  one("admin", E("PRK-01", "parking", "parking", { w: 30, d: 18, cars: 16 }), 30, 18, 1);
  one("admin", E("GTE-01", "gate", "gatehouse", {}, { rot: Math.PI / 2 }), 6, 6, 1);
  // aux rows (fixed budget items)
  for (const [id, dept, name, price] of cfg.aux) if (price) invRow(id, null, name, dept, null, "", price, 0.35, id);

  // ---------------------------------------------------------------- pack departments
  const placed = {}, areaBox = {};
  const pack = (dept, x0, side) => {
    const list = blocks[dept].sort((a, b) => a.order - b.order);
    if (!list.length) return 0;
    const area = list.reduce((a, b) => a + (b.w + CLR) * (b.d + CLR), 0);
    const maxW = Math.max(...list.map((b) => b.w + CLR));
    const W = Math.max(maxW, Math.min(90, Math.sqrt(area) * 1.15));
    let x = 0, z = 0, rowD = 0, usedW = 0;
    const sgn = side === "n" ? -1 : 1, z0 = sgn * (RACK_W / 2 + RACK_CLEAR);
    let order = list[0].order;
    for (const b of list) {
      if (x > 0 && (x + b.w + CLR > W || b.order !== order)) { z += rowD; x = 0; rowD = 0; }
      order = b.order;
      const cx = x0 + x + (b.w + CLR) / 2, cz = z0 + sgn * (z + (b.d + CLR) / 2);
      for (const p of b.parts) { const { dx, dz, ...e } = p; e.pos = [cx + dx, cz + sgn * -dz]; e.area = dept; items.push(e); placed[e.id] = e; }
      x += b.w + CLR; usedW = Math.max(usedW, x); rowD = Math.max(rowD, b.d + CLR);
    }
    z += rowD;
    areaBox[dept] = { x: [x0, x0 + usedW], z: side === "n" ? [z0 - z, z0] : [z0, z0 + z] };
    return usedW;
  };
  const north = ["grain", "milling", "cooking", "fermentation", "distillation", "dehydration", "storage"], south = ["admin", "utilities", "coproducts", "wastewater", "electrical"];
  let xn = 0; for (const d of north) { const w = pack(d, xn, "n"); if (w) xn += w + DEPT_GAP; }
  let xs = 0; for (const d of south) { const w = pack(d, xs, "s"); if (w) xs += w + DEPT_GAP; }
  const width = Math.max(xn, xs) - DEPT_GAP;
  // centre on x = 0
  const shift = -width / 2;
  for (const e of items) e.pos = [e.pos[0] + shift, e.pos[1]];
  for (const b of Object.values(areaBox)) b.x = [b.x[0] + shift, b.x[1] + shift];

  // ---------------------------------------------------------------- site, roads, rack, fence
  const zs = Object.values(areaBox).flatMap((b) => b.z), X0 = shift - 6, X1 = shift + width + 6, Z0 = Math.min(...zs) - 4, Z1 = Math.max(...zs) + 4;
  const rx0 = X0 - ROAD / 2 - 4, rx1 = X1 + ROAD / 2 + 4, rz0 = Z0 - ROAD / 2 - 4, rz1 = Z1 + ROAD / 2 + 4;
  const site = { x: [rx0 - ROAD / 2 - 6, rx1 + ROAD / 2 + 6], z: [rz0 - ROAD / 2 - 6, rz1 + ROAD / 2 + 6] };
  const fence = { x: [site.x[0] - 2, site.x[1] + 2], z: [site.z[0] - 2, site.z[1] + 2] };
  const roads = [
    { x: (rx0 + rx1) / 2, z: rz0, w: rx1 - rx0 + ROAD, d: ROAD }, { x: (rx0 + rx1) / 2, z: rz1, w: rx1 - rx0 + ROAD, d: ROAD },
    { x: rx0, z: (rz0 + rz1) / 2, w: ROAD, d: rz1 - rz0, lines: false }, { x: rx1, z: (rz0 + rz1) / 2, w: ROAD, d: rz1 - rz0, lines: false }
  ];
  const procX = north.filter((d) => areaBox[d]).flatMap((d) => areaBox[d].x), utilX = south.filter((d) => areaBox[d]).flatMap((d) => areaBox[d].x);
  const rack = { x: [Math.min(...procX, ...utilX) + 2, Math.max(...procX, ...utilX) - 2], z: 0, w: RACK_W, tiers: [6, 8.2, 10.4], bay: 7 };
  items.push({ id: "RCK-01", kind: "rack", type: "pipeRack", pos: [(rack.x[0] + rack.x[1]) / 2, 0], params: { len: rack.x[1] - rack.x[0], w: RACK_W, tiers: rack.tiers, bay: 7 }, area: "utilities" });
  // bund around the tank farm
  const tanks = items.filter((e) => e.tankFarm);
  if (tanks.length) { const r = tanks[0].params.r + 3, xs2 = tanks.map((t) => t.pos[0]), zs2 = tanks.map((t) => t.pos[1]); items.push({ id: "BND-01", kind: "bund", type: "bund", pos: [(Math.min(...xs2) + Math.max(...xs2)) / 2, (Math.min(...zs2) + Math.max(...zs2)) / 2], params: { w: Math.max(...xs2) - Math.min(...xs2) + 2 * r, d: Math.max(...zs2) - Math.min(...zs2) + 2 * r, h: 1.2 }, area: "storage" }); }
  // local control panels and hydrants: one per department, at the rack side of the department
  const cabinets = [], hydrants = [];
  for (const [d, b] of Object.entries(areaBox)) {
    const side = DEPARTMENTS[d].side, zEdge = side === "n" ? -(RACK_W / 2 + 3) : RACK_W / 2 + 3;
    const cab = { id: `CAB-${d.slice(0, 3).toUpperCase()}`, kind: "cabinet", type: "cabinet", pos: [b.x[0] + 3, zEdge], params: {}, area: d }; items.push(cab); cabinets.push(cab); placed[cab.id] = cab;
    const hyd = { id: `HYD-${d.slice(0, 3).toUpperCase()}`, kind: "hydrant", type: "hydrant", pos: [b.x[1] - 3, zEdge], params: {}, area: d }; items.push(hyd); hydrants.push(hyd); placed[hyd.id] = hyd;
  }
  // decor: lamps along the main walkway, trees on the verges, vehicles on the perimeter road
  const lampN = Math.max(3, Math.floor(width / 40));
  for (let i = 0; i <= lampN; i++) items.push({ id: `LMP-${i}`, kind: "lamp", type: "lamp", pos: [shift + (width * i) / lampN, RACK_W / 2 + 4.6], params: { h: 8 }, decor: true, area: "admin", rot: Math.PI / 2 });
  const treeN = Math.floor((rx1 - rx0) / 14);
  for (let i = 0; i <= treeN; i++) { items.push({ id: `TRS-${i}`, kind: "tree", type: "tree", pos: [rx0 + 7 + i * 14, rz1 + ROAD / 2 + 3], params: { s: 0.85, seed: i }, decor: true, area: "admin" }); items.push({ id: `TRN-${i}`, kind: "tree", type: "tree", pos: [rx0 + 7 + i * 14, rz0 - ROAD / 2 - 3], params: { s: 0.8, seed: i + 50 }, decor: true, area: "admin" }); }
  const ld = placed["LDG-01"], rc = placed["RCV-01"];
  const vehicles = [];
  if (ld) { items.push({ id: "TRK-01", kind: "truck", type: "truck", pos: [ld.pos[0], rz0], params: {}, area: "storage" }, { id: "TRK-02", kind: "truck", type: "truck", pos: [ld.pos[0], rz0], params: {}, area: "storage" });
    vehicles.push({ ids: ["TRK-01", "TRK-02"], path: [[rx0, rz1], [rx0, rz0], [ld.pos[0], rz0], [rx1, rz0], [rx1, rz1]], stopAt: 2, stop: 7, speed: 10 }); }
  if (rc) { items.push({ id: "GTR-01", kind: "graintruck", type: "grainTruck", pos: [rc.pos[0], rz0], params: {}, area: "grain" });
    vehicles.push({ ids: ["GTR-01"], path: [[rx1, rz1], [rx0, rz1], [rx0, rz0], [rc.pos[0], rz0], [rx1, rz0]], stopAt: 3, stop: 8, speed: 9 }); }

  // ---------------------------------------------------------------- process connections (production network)
  const has = (id) => !!placed[id];
  const all = (prefix) => Object.keys(placed).filter((id) => new RegExp(`^${prefix}-\\d{2}$`).test(id)).sort();
  // straight (direct) routes only for neighbours in the same department; longer runs go up to the pipe rack
  const same = (a, b) => placed[a] && placed[b] && placed[a].area === placed[b].area && Math.hypot(placed[a].pos[0] - placed[b].pos[0], placed[a].pos[1] - placed[b].pos[1]) < 13;
  const conns = [];
  const C = (from, to, stream, extra = {}) => { if (has(from) && has(to) && from !== to) conns.push({ id: `PR-${String(conns.length + 1).padStart(3, "0")}`, from, to, stream, direct: same(from, to), ...extra }); };
  const bins = all("SIL"), cleaners = all("CLN"), mills = all("MIL"), mash = all("MSH"), liqs = all("LIQ"), ferms = all("FRM"), trains = all("DST"), sieves = all("DHY"), cents = all("CNT"), tanksL = all("TNK"), bays = all("LDG"), wdgs = all("WDG");
  all("RCV").forEach((r) => bins.forEach((b, i) => { if (i % all("RCV").length === all("RCV").indexOf(r)) C(r, b, "grain"); }));
  bins.forEach((b, i) => C(b, cleaners[i % cleaners.length], "grain"));
  cleaners.forEach((c, i) => C(c, mills[i % mills.length], "grain"));
  mills.forEach((m, i) => C(m, mash[i % mash.length], "mash"));
  mash.forEach((m) => C(m, liqs[0], "mash"));
  liqs.forEach((l, i) => { if (i) C(liqs[i - 1], l, "mash"); });
  C(liqs[liqs.length - 1], "COL-01", "mash");
  ferms.forEach((f) => C("COL-01", f, "mash"));
  if (ferms[0]) { C("YST-01", ferms[0], "mash"); C(ferms[0], "SCR-01", "co2", { fromPort: "in" }); }
  ferms.forEach((f) => C(f, "BWL-01", "beer"));
  trains.forEach((t) => { C("BWL-01", t, "beer"); C(t, `${t}-R`, "ethanol"); cents.forEach((c, i) => { if (i % trains.length === trains.indexOf(t)) C(t, c, "stillage", { fromPort: "bottom" }); }); });
  const rectifiers = trains.map((t) => `${t}-R`);
  const afterDist = has("POL-01") ? "POL-01" : null;
  if (afterDist) rectifiers.forEach((r) => C(r, "POL-01", "ethanol"));
  const dhyUnits = [...new Set(Object.keys(placed).filter((id) => /^DHY-\d{2}-[A-D]$/.test(id)).map((id) => id.slice(0, 6)))];
  if (dhyUnits.length) { dhyUnits.forEach((u, i) => { (afterDist ? [afterDist] : rectifiers).forEach((r, j) => { if (j % dhyUnits.length === i || afterDist) C(r, `${u}-A`, "ethanol"); }); C(`${u}-C`, "PCL-01", "ethanol"); }); }
  else (afterDist ? [afterDist] : rectifiers).forEach((r) => C(r, "PCL-01", "ethanol"));
  C("PCL-01", "DAY-01", "ethanol"); C("DAY-01", "DAY-02", "ethanol", { direct: true });
  tanksL.forEach((t) => C("DAY-02", t, "ethanol"));
  bays.forEach((b, i) => C(tanksL[i % tanksL.length], b, "ethanol"));
  if (has("DEN-01")) bays.forEach((b) => C("DEN-01", b, "denat"));
  cents.forEach((c, i) => { C(c, "TST-01", "thin"); C(c, wdgs[i % wdgs.length], "stillage"); });

  // ---------------------------------------------------------------- engineering networks
  const links = [];
  const Lk = (net, from, to, name, extra = {}) => { if (has(from) && has(to) && from !== to) links.push({ id: `${net.toUpperCase().slice(0, 2)}-${String(links.filter((l) => l.net === net).length + 1).padStart(3, "0")}`, net, from, to, name, direct: same(from, to), ...extra }); };
  Lk("power", "SUB-01", "MCC-01", "Main feeder (MV)"); Lk("power", "GEN-01", "MCC-01", "Standby generator feeder");
  cabinets.forEach((c) => Lk("power", "MCC-01", c.id, `LV feeder · ${DEPARTMENTS[c.area].name}`));
  [...all("BLR"), "CWP-01", "CMP-01", ...all("ROT"), "WWP-01", "FWP-01", "ADM-01", ...Object.keys(placed).filter((id) => /^CWT-T\d+$/.test(id))].forEach((id) => Lk("power", "MCC-01", id, "LV feeder"));
  cabinets.forEach((c) => Lk("control", "ADM-01", c.id, "Control network")); ["MCC-01", "FWP-01", ...all("BLR")].forEach((id) => Lk("control", "ADM-01", id, "Control network"));
  const blr = all("BLR")[0];
  all("BLR").forEach((b) => { mash.forEach((m) => Lk("steam", b, m, "Steam to jet cooker", { kind: "supply" })); Lk("steam", b, liqs[0], "Steam to liquefaction", { kind: "supply" }); trains.forEach((t) => Lk("steam", b, `${t}-S`, "Steam to reboilers", { kind: "supply" })); });
  trains.forEach((t) => Lk("steam", `${t}-S`, blr, "Condensate return", { kind: "return" }));
  const towers = Object.keys(placed).filter((id) => /^CWT-T\d+$/.test(id));
  towers.forEach((t) => Lk("cooling", t, "CWP-01", "Cold-water basin to pumps", { kind: "supply" }));
  [...ferms, ...trains.map((t) => `${t}-C`), "PCL-01", "COL-01"].forEach((to) => { Lk("cooling", "CWP-01", to, "Cooling water supply", { kind: "supply" }); Lk("cooling", to, towers[0], "Cooling water return", { kind: "return" }); });
  all("WEL").forEach((w) => Lk("water", w, all("ROT")[0], "Raw well water"));
  all("ROT").forEach((r) => Lk("water", r, "WTK-01", "Treated water to storage"));
  Lk("water", "WTK-01", "WTK-02", "Storage balance line"); mash.forEach((m) => Lk("water", "WTK-01", m, "Process water to mashing")); Lk("water", "WTK-02", blr, "Boiler make-up"); towers.forEach((t) => Lk("water", "WTK-02", t, "Cooling tower make-up"));
  trains.forEach((t) => Lk("air", "CMP-01", `${t}-S`, "Instrument air · distillation")); dhyUnits.forEach((u) => Lk("air", "CMP-01", `${u}-C`, "Instrument air · molecular sieve")); mills.forEach((m) => Lk("air", "CMP-01", m, "Plant air · dust filters"));
  Lk("waste", "BWL-01", "WWP-01", "Process drains"); Lk("waste", blr, "WWP-01", "Boiler blow-down"); all("ROT").forEach((r) => Lk("waste", r, "WWP-01", "RO reject"));
  all("WWT").forEach((c) => { Lk("waste", "WWP-01", c, "To clarifier"); Lk("waste", c, `${c}-B`, "To aeration basin"); });
  Lk("fire", "FWT-01", "FWP-01", "Fire-water suction"); hydrants.forEach((h) => Lk("fire", "FWP-01", h.id, `Hydrant · ${DEPARTMENTS[h.area].name}`));

  // ---------------------------------------------------------------- factory object
  const areas = Object.entries(areaBox).map(([id, b]) => ({ id, step: DEPARTMENTS[id].step, color: DEPARTMENTS[id].color, x: [b.x[0] - 2, b.x[1] + 2], z: [b.z[0] - 2, b.z[1] + 2], name: DEPARTMENTS[id].name, desc: `${DEPARTMENTS[id].name} — generated by the conceptual layout rules.` })).sort((a, b) => a.step - b.step);
  const catalog = { ...ref.catalog, cleaner: { name: "Grain cleaner", fn: "Removes stones, straw and dust before storage and milling.", specs: [] }, fuelyard: { name: "Biomass fuel yard", fn: "Covered storage for boiler fuel.", specs: [] } };
  for (const k of Object.keys(catalog)) catalog[k] = { ...catalog[k], specs: [] };
  const streams = { grain: { color: 0xf2c14e, name: "Grain" }, ...ref.streams };
  const F = {
    id: "factory-builder", name: "3DNA FactoryBuilder — conceptual ethanol facility", short: "FactoryBuilder",
    site, fence, rack, roads, areas, equipment: items, streams, connections: conns, networks: ref.networks, links, catalog, vehicles,
    paths: [{ pts: [[X0, RACK_W / 2 + 3.5], [X1, RACK_W / 2 + 3.5]] }],
    lawns: [[(rx0 + rx1) / 2, rz1 + ROAD / 2 + 3, rx1 - rx0, 3.5], [(rx0 + rx1) / 2, rz0 - ROAD / 2 - 3, rx1 - rx0, 3.5]],
    paving: [{ kind: "slab", x: (Math.min(...procX) + Math.max(...procX)) / 2, z: (Math.min(...north.filter((d) => areaBox[d]).flatMap((d) => areaBox[d].z)) - RACK_W / 2) / 2, w: Math.max(...procX) - Math.min(...procX) + 6, d: Math.abs(Math.min(...north.filter((d) => areaBox[d]).flatMap((d) => areaBox[d].z))) - RACK_W / 2 + 4 }],
    zoneLines: ["milling", "cooking", "fermentation", "distillation", "dehydration"].filter((d) => areaBox[d])
  };

  // ---------------------------------------------------------------- checks and statistics
  const checks = [];
  const fp = (e) => { const p = e.params; if (p.r) return [p.r + 0.5, p.r + 0.5]; if (e.type === "coolingTower") return [(p.cells * p.cw) / 2, p.d / 2]; if (p.w) return [p.w / 2, (p.d || p.w) / 2]; return [1, 1]; };
  const solid = items.filter((e) => !e.decor && !["rack", "bund", "parking", "truck", "graintruck", "structure", "cabinet", "hydrant"].includes(e.kind));
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
    const a = solid[i], b = solid[j];
    if (a.id.split("-").slice(0, 2).join("-") === b.id.split("-").slice(0, 2).join("-")) continue;   // parts of one block
    const [aw, ad] = fp(a), [bw, bd] = fp(b);
    if (Math.abs(a.pos[0] - b.pos[0]) < aw + bw && Math.abs(a.pos[1] - b.pos[1]) < ad + bd) checks.push({ level: "error", msg: `Geometry overlap: ${a.id} and ${b.id}.` });
  }
  const idSet = new Set(items.map((e) => e.id));
  if (idSet.size !== items.length) checks.push({ level: "error", msg: "Duplicate equipment IDs." });
  for (const c of [...conns, ...links]) if (!idSet.has(c.from) || !idSet.has(c.to)) checks.push({ level: "error", msg: `Connection ${c.id} references a missing equipment ID.` });
  const connected = new Set([...conns, ...links].flatMap((c) => [c.from, c.to]));
  const lonely = items.filter((e) => !e.decor && !["rack", "bund", "parking", "truck", "graintruck", "gate", "lab", "structure", "stack", "fuelyard", "wtank"].includes(e.kind) && !connected.has(e.id) && !/-[A-D]$/.test(e.id) && !/-B$/.test(e.id));
  for (const e of lonely) checks.push({ level: "warn", msg: `${e.id} has no engineering connection.` });
  const siteArea = (site.x[1] - site.x[0]) * (site.z[1] - site.z[0]);
  const buildingKinds = ["receiving", "cleaner", "mill", "boiler", "cwpump", "compressor", "ro", "wwpump", "mcc", "firepump", "gate"];
  const buildingArea = items.filter((e) => buildingKinds.includes(e.kind)).reduce((a, e) => a + (e.params.w || 6) * (e.params.d || e.params.w || 6), 0)
    + items.filter((e) => e.kind === "admin" || e.kind === "lab").reduce((a, e) => a + e.params.w * e.params.d * (e.params.floors || 1), 0);
  const stats = { siteArea, siteW: site.x[1] - site.x[0], siteD: site.z[1] - site.z[0], buildingArea, rackLength: rack.x[1] - rack.x[0], equipmentCount: items.filter((e) => !e.decor && !["truck", "graintruck"].includes(e.kind)).length, departments: areas.length, connections: conns.length, links: links.length };
  return { F, inventory: inv, stats, checks };
}
