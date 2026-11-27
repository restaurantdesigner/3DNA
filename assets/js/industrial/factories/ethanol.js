/*
 * 3DNA Digital Twin — factory configuration: Canadian Ethanol Production Facility (Lanigan, Saskatchewan).
 *
 * An independent conceptual digital twin INSPIRED BY public information about the Pound-Maker feedlot and
 * ethanol plant (see ./ethanol-canada.data.js for verified facts, benchmarks, assumptions and sources).
 * Equipment counts and sizes follow the public figures where they exist (4 × 283,000 L fermenters,
 * molecular sieve with 4 vessels, 2 × 500,000 L product tanks, 3 grain bins, 2 water wells, no stillage
 * drying); everything else — the layout, the engineering networks and the financial scenarios — is
 * conceptual and illustrative. It is not a reconstruction of the real facility.
 *
 * The engine (../engine.js) and the dashboard (../dashboard.js) read only this object:
 *   site / roads / fence / paths / lawns ...... ground plan (metres; x east, z south)
 *   areas ....................................... process areas (step order, floor tint, label)
 *   equipment ................................... { id, kind, n?, type, params, pos: [x, z], rot?, area, decor? }
 *   streams / connections ....................... the production process (network "process")
 *   networks / links ............................ the engineering connection graph (all other networks)
 *   catalog ..................................... per kind: name, function, specifications [label, value, tag]
 *                                                 tag: "v" verified public figure · "a" assumption · "c" conceptual
 *   finance ..................................... CAD financial model (defaults from the data module)
 */
import { PROJECT, VERIFIED, BENCHMARKS, ASSUMPTIONS as A, SOURCES, CAPEX_SPLIT, RESEARCHED } from "./ethanol-canada.data.js?v=ca1";

const E = (id, kind, type, pos, params = {}, extra = {}) => ({ id, kind, type, pos, params, ...extra });
const RACK = { x: [-110, 140], z: 0, w: 10, tiers: [6, 8.2, 10.4], bay: 7 };

// ---------------------------------------------------------------- engineering networks (conceptual)
const NETWORKS = {
  process: { name: "Production Process", color: 0xf59e0b, style: "pipe", tier: 0, r: 0.22, desc: "Grain, mash, beer, ethanol and co-product streams between the process steps." },
  power: { name: "Electrical Power", color: 0xfacc15, style: "tray", tier: 2, desc: "Conceptual medium/low-voltage distribution: substation → motor control centre → local panels and motors, with a standby generator on the essential bus." },
  steam: { name: "Steam & Thermal Energy", color: 0xf97316, style: "insulated", tier: 1, r: 0.3, desc: "Insulated steam supply from the boiler house to cooking and distillation, with condensate return." },
  cooling: { name: "Cooling Water", color: 0x3b82f6, style: "pipe", tier: 1, r: 0.28, desc: "Cooling-water supply from the cooling-tower pump station to fermenters and condensers, and warm return." },
  water: { name: "Process Water", color: 0x14b8a6, style: "pipe", tier: 1, r: 0.2, desc: "Well water treated by reverse osmosis, stored and distributed to mashing, boiler make-up and cooling make-up." },
  air: { name: "Compressed Air", color: 0x93c5fd, style: "pipe", tier: 1, r: 0.12, desc: "Instrument and plant air for valve actuators, molecular sieve switching and dust-filter pulsing." },
  waste: { name: "Wastewater", color: 0xa16207, style: "pipe", tier: 0, r: 0.2, desc: "Process drains, boiler blow-down and RO reject collected to the wastewater pump station, clarifier and aeration basin." },
  control: { name: "Automation & Control", color: 0xc084fc, style: "cable", tier: 2, desc: "Control-system network from the control room to local panels, instruments and environmental monitoring." },
  fire: { name: "Fire Protection", color: 0xef4444, style: "pipe", tier: 1, r: 0.22, desc: "Fire-water storage, fire pumps and a hydrant main around the process and the tank farm." }
};
const L = (id, net, from, to, name, extra = {}) => ({ id, net, from, to, name, ...extra });

export default {
  id: "ethanol",
  name: "Canadian Ethanol Production Facility",
  short: "Ethanol",
  project: PROJECT, verified: VERIFIED, benchmarks: BENCHMARKS, assumptions: A, sources: SOURCES, researched: RESEARCHED,
  site: { x: [-150, 170], z: [-80, 64] },
  fence: { x: [-152, 172], z: [-82, 66] },
  rack: RACK,
  roads: [
    // perimeter loop
    { x: 10, z: 58, w: 324, d: 9 }, { x: 10, z: -75, w: 324, d: 8 },
    { x: -146, z: -8, w: 8, d: 142, lines: false }, { x: 166, z: -8, w: 8, d: 142, lines: false },
    // north service road behind the process (grain receiving ↔ tank farm) and its spur to the perimeter
    { x: 18, z: -62, w: 244, d: 6 }, { x: -104, z: -67.5, w: 6, d: 7, lines: false },
    // east internal road through the tanker loading bay, connector to the east perimeter road
    { x: 148, z: -25.5, w: 10, d: 91, lines: false }, { x: 157.5, z: -36, w: 9, d: 8, lines: false }
  ],
  // zebra crossings where the main walkway meets roads
  crossings: [{ x: -146, z: 9, w: 8, d: 2.4, along: "x" }, { x: 148, z: 9, w: 10, d: 2.4, along: "x" }],

  areas: [
    { id: "grain", step: 1, color: 0xf2c14e, x: [-142, -86], z: [-72, -36], name: "Grain receiving and storage", desc: "Trucks deliver feed wheat; it is screened and elevated into three storage bins (public description)." },
    { id: "milling", step: 2, color: 0xe8a33d, x: [-86, -62], z: [-44, -14], name: "Milling", desc: "A hammer mill grinds the wheat into smaller particles to expose the starch." },
    { id: "cooking", step: 3, color: 0xf97316, x: [-62, -42], z: [-42, -8], name: "Cooking and liquefaction", desc: "A continuous jet cooker sterilises the mash; enzymes convert the starch into dextrins." },
    { id: "fermentation", step: 4, color: 0xa855f7, x: [-40, -2], z: [-60, -8], name: "Fermentation", desc: "Four 283,000 L fermenters: ≈ 20 h fill and 48 h fermentation to a beer of 10–12 % alcohol (public figures)." },
    { id: "distillation", step: 5, color: 0x3b82f6, x: [0, 22], z: [-48, -8], name: "Distillation", desc: "The columns separate the alcohol: about 94 % at the top of the column (public figure)." },
    { id: "dehydration", step: 6, color: 0x06b6d4, x: [24, 42], z: [-48, -14], name: "Dehydration", desc: "A molecular sieve with four desiccant vessels purifies the ethanol to 99.5 % (public figures)." },
    { id: "storage", step: 7, color: 0x22d3ee, x: [44, 158], z: [-60, -10], name: "Storage and dispatch", desc: "Two 500,000 L product tanks; ethanol is denatured with gasoline and dispatched by road tanker." },
    { id: "coproducts", step: 8, color: 0xb7793b, x: [4, 56], z: [14, 40], name: "Co-products: WDG and thin stillage", desc: "Whole stillage is split into wet distillers grain and thin stillage, both used in the adjacent feedlot (no drying)." },
    { id: "utilities", step: 9, color: 0x94a3b8, x: [-100, 4], z: [14, 48], name: "Utilities: steam, water and air", desc: "Boiler house, cooling tower, wells, reverse osmosis, water storage and compressed air (conceptual layout)." },
    { id: "wastewater", step: 10, color: 0xa16207, x: [58, 104], z: [14, 48], name: "Wastewater treatment", desc: "Conceptual collection, clarification and aeration of process wastewater." },
    { id: "electrical", step: 11, color: 0xfacc15, x: [104, 152], z: [14, 50], name: "Electrical and fire protection", desc: "Conceptual substation, motor control centre, standby generator, fire-water tank and fire pumps." },
    { id: "admin", step: 12, color: 0x64748b, x: [-142, -86], z: [-18, 52], name: "Administration and control", desc: "Offices and control room, quality laboratory, gatehouse and staff car park." }
  ],

  equipment: [
    // 1 · grain (3 bins: public description)
    ...[-130, -118, -106].map((x, i) => E(`bin-${i + 1}`, "bin", "silo", [x, -52], { r: 4.5, h: 12, hopper: 2.5 }, { n: i + 1, area: "grain" })),
    E("receiving", "receiving", "building", [-120, -66], { w: 16, d: 8, h: 7, doors: 2, wall: "wallDark" }, { area: "grain" }),
    E("elevator", "elevator", "elevator", [-94, -52], { h: 22 }, { area: "grain" }),
    E("conveyor-bins", "conveyor", "conveyor", [-94, -52], { len: 36, y0: 22, y1: 22 }, { rot: Math.PI, area: "grain" }),
    E("conveyor-mill", "conveyor", "conveyor", [-98, -48], { len: 24, y0: 3, y1: 11 }, { rot: -Math.PI / 4, area: "grain" }),
    // 2 · milling
    E("mill", "mill", "building", [-74, -28], { w: 12, d: 10, h: 10, doors: 1 }, { area: "milling" }),
    E("cyclone", "cyclone", "vessel", [-82, -40], { r: 0.9, h: 4, legs: 3, mat: "steel" }, { area: "milling" }),
    // 3 · cooking and liquefaction
    E("slurry", "slurry", "tank", [-58, -26], { r: 2, h: 4.5, roof: "flat" }, { area: "cooking" }),
    E("cooker", "cooker", "vessel", [-58, -14], { r: 0.6, h: 3, legs: 1, mat: "insulation" }, { area: "cooking" }),
    E("liq-1", "liq", "tank", [-48, -23], { r: 2.2, h: 5.5, roof: "dome" }, { n: 1, area: "cooking" }),
    E("liq-2", "liq", "tank", [-48, -34], { r: 2.2, h: 5.5, roof: "dome" }, { n: 2, area: "cooking" }),
    E("cooler", "cooler", "exchanger", [-44, -41], { r: 0.6, len: 5 }, { area: "cooking" }),
    // 4 · fermentation (4 × 283,000 L: public figures)
    ...[[-32, -38], [-20, -38], [-32, -22], [-20, -22]].map((p, i) => E(`ferm-${i + 1}`, "fermenter", "tank", p, { r: 3.6, h: 7, roof: "dome", legs: 1.6, agitator: true }, { n: i + 1, area: "fermentation" })),
    E("yeast", "yeast", "vessel", [-8, -40], { r: 1.4, h: 4, legs: 1.2 }, { area: "fermentation" }),
    E("beerwell", "beerwell", "tank", [-8, -24], { r: 3, h: 7, roof: "dome" }, { area: "fermentation" }),
    E("scrubber", "scrubber", "column", [-26, -54], { r: 0.7, h: 10, step: 5, mat: "steel" }, { area: "fermentation" }),
    E("pump-1", "pump", "pump", [-26, -12], {}, { n: 1, area: "fermentation" }),
    // 5 · distillation
    E("beercol", "beercol", "column", [8, -38], { r: 0.95, h: 18, step: 6 }, { area: "distillation" }),
    E("rectifier", "rectifier", "column", [14, -38], { r: 0.8, h: 20, step: 6 }, { area: "distillation" }),
    E("dist-structure", "structure", "structure", [11, -22], { w: 12, d: 8, levels: 3, lh: 5 }, { area: "distillation" }),
    E("condenser", "condenser", "exchanger", [12, -11], { r: 0.7, len: 5 }, { area: "distillation" }),
    E("pump-2", "pump", "pump", [3, -12], { color: "paintGreen" }, { n: 2, area: "distillation" }),
    // 6 · dehydration (molecular sieve, 4 vessels: public figures)
    ...[[28, -42], [34, -42], [28, -34], [34, -34]].map((p, i) => E(`sieve-${i + 1}`, "sieve", "vessel", p, { r: 0.9, h: 6, mat: "insulation", legs: 1.4 }, { n: i + 1, area: "dehydration" })),
    E("prodcooler", "prodcooler", "exchanger", [31, -20], { r: 0.55, len: 4 }, { area: "dehydration" }),
    // 7 · storage and dispatch (2 × 500,000 L: public figures)
    E("day-1", "day", "tank", [50, -18], { r: 1.8, h: 5, roof: "cone" }, { n: 1, area: "storage" }),
    E("day-2", "day", "tank", [57, -18], { r: 1.8, h: 5, roof: "cone" }, { n: 2, area: "storage" }),
    E("tank-1", "tank", "tank", [64, -44], { r: 4.6, h: 7.5, roof: "cone" }, { n: 1, area: "storage" }),
    E("tank-2", "tank", "tank", [80, -44], { r: 4.6, h: 7.5, roof: "cone", label: "ETHANOL|99.5 %" }, { n: 2, area: "storage" }),
    E("denaturant", "denaturant", "tank", [89, -28], { r: 1.6, h: 4, roof: "cone", band: "cabRed" }, { area: "storage" }),
    E("bund", "bund", "bund", [72, -40], { w: 44, d: 28, h: 1.2 }, { area: "storage" }),
    E("pump-3", "pump", "pump", [66, -12], {}, { n: 3, area: "storage" }),
    E("loading", "loading", "canopy", [146, -36], { w: 24, d: 14, h: 7 }, { area: "storage" }),
    E("truck-1", "truck", "truck", [146, -40], {}, { n: 1, area: "storage" }),
    E("truck-2", "truck", "truck", [146, -32], {}, { n: 2, area: "storage" }),
    // 8 · co-products (no drying: WDG and thin stillage go to the feedlot)
    E("centrifuge", "centrifuge", "centrifuge", [12, 24], { n: 2 }, { area: "coproducts" }),
    E("ts-tank", "tstank", "tank", [26, 22], { r: 2.6, h: 5, roof: "dome" }, { area: "coproducts" }),
    E("wdg-bunker", "wdg", "bunker", [42, 30], { w: 18, d: 10, h: 3 }, { area: "coproducts" }),
    E("conveyor-wdg", "conveyor", "conveyor", [15, 24], { len: 19, y0: 2.5, y1: 4 }, { rot: -0.25, area: "coproducts" }),
    E("feedlot", "feedlot", "terminal", [158, 26], {}, { area: "coproducts" }),
    // 9 · utilities
    E("boiler", "boiler", "building", [-20, 28], { w: 14, d: 10, h: 9, doors: 1 }, { area: "utilities" }),
    E("stack", "stack", "stack", [-8, 36], { r: 0.9, h: 22 }, { area: "utilities" }),
    E("cooling", "cooling", "coolingTower", [-46, 32], { cells: 2, cw: 8, d: 9, h: 8 }, { area: "utilities" }),
    E("cwpump", "cwpump", "building", [-46, 18], { w: 8, d: 5, h: 4, windows: false, doors: 1, wall: "wallDark" }, { area: "utilities" }),
    E("compressor", "compressor", "building", [-2, 20], { w: 8, d: 6, h: 4.5, windows: false, doors: 1, wall: "wallDark" }, { area: "utilities" }),
    E("receiver", "receiver", "vessel", [5, 19], { r: 0.7, h: 3, legs: 0.8, mat: "white" }, { area: "utilities" }),
    E("ro", "ro", "building", [-70, 24], { w: 12, d: 8, h: 6, doors: 1 }, { area: "utilities" }),
    E("wt-1", "wtank", "tank", [-70, 38], { r: 3, h: 6, roof: "flat" }, { n: 1, area: "utilities" }),
    E("wt-2", "wtank", "tank", [-61, 38], { r: 3, h: 6, roof: "flat" }, { n: 2, area: "utilities" }),
    E("well-1", "well", "wellhead", [-88, 20], {}, { n: 1, area: "utilities" }),
    E("well-2", "well", "wellhead", [-88, 30], {}, { n: 2, area: "utilities" }),
    // 10 · wastewater (conceptual)
    E("wwpump", "wwpump", "building", [62, 20], { w: 6, d: 5, h: 4, windows: false, doors: 1, wall: "wallDark" }, { area: "wastewater" }),
    E("clarifier", "clarifier", "clarifier", [76, 33], { r: 7 }, { area: "wastewater" }),
    E("aeration", "aeration", "basin", [96, 32], { w: 14, d: 9, h: 3 }, { area: "wastewater" }),
    // 11 · electrical and fire (conceptual)
    E("substation", "substation", "substation", [138, 40], { w: 22, d: 16, units: 2 }, { area: "electrical" }),
    E("mcc", "mcc", "building", [128, 20], { w: 10, d: 6, h: 5, windows: false, doors: 1, wall: "wallDark" }, { area: "electrical" }),
    E("egen", "egen", "egen", [138, 26], {}, { area: "electrical" }),
    E("firetank", "firetank", "tank", [113, 42], { r: 5, h: 9, roof: "cone", band: "fireRed" }, { area: "electrical" }),
    E("firepump", "firepump", "building", [112, 24], { w: 7, d: 5, h: 4, windows: false, doors: 1, wall: "wallDark" }, { area: "electrical" }),
    E("monitor", "monitor", "monitor", [156, 46], { h: 10 }, { area: "electrical" }),
    // local control panels (conceptual)
    ...[["cab-grain", -100, -40], ["cab-mill", -66, -16], ["cab-ferm", -14, -13], ["cab-dist", 20, -16], ["cab-sieve", 40, -30], ["cab-tank", 50, -11], ["cab-co", 20, 15]].map(([id, x, z]) => E(id, "cabinet", "cabinet", [x, z], {}, { area: "electrical" })),
    // hydrants on the fire main (conceptual)
    ...[["hyd-grain", -102, -30], ["hyd-ferm", -42, -9], ["hyd-dist", 24, -10], ["hyd-tank", 98, -18], ["hyd-util", -32, 13], ["hyd-co", 56, 14]].map(([id, x, z]) => E(id, "hydrant", "hydrant", [x, z], {}, { area: "electrical" })),
    // 12 · administration and control
    E("admin", "admin", "office", [-118, 41], { w: 26, d: 13, floors: 3 }, { area: "admin" }),
    E("lab", "lab", "office", [-95, 45], { w: 13, d: 9, floors: 2 }, { area: "admin" }),
    E("gate", "gate", "gatehouse", [-136, 50], {}, { area: "admin", rot: Math.PI / 2 }),
    E("parking", "parking", "parking", [-122, -7], { w: 30, d: 18, cars: 16 }, { area: "admin" }),
    // pipe rack
    E("rack", "rack", "pipeRack", [(RACK.x[0] + RACK.x[1]) / 2, RACK.z], { len: RACK.x[1] - RACK.x[0], w: RACK.w, tiers: RACK.tiers, bay: 7 }, { area: "utilities" }),
    // landscaping, lights, skips (decor: not selectable)
    ...[-140, -133, -126, -112, -105, -98, -90].map((x, i) => E(`tree-a${i}`, "tree", "tree", [x, 51.5], { s: 1, seed: i }, { decor: true, area: "admin" })),
    ...[-140, -140, -140, -104, -104, -104].map((x, i) => E(`tree-p${i}`, "tree", "tree", [x, [-14, -6, 2][i % 3]], { s: 0.9, seed: i + 3 }, { decor: true, area: "admin" })),
    ...[-132, -112].map((x, i) => E(`tree-l${i}`, "tree", "tree", [x, 30.5], { s: 0.8, seed: i + 9 }, { decor: true, area: "admin" })),
    ...[-120, -80, -40, 0, 40, 80, 120].map((x, i) => E(`lamp-${i}`, "lamp", "lamp", [x, 11.6], { h: 8 }, { decor: true, area: "admin", rot: Math.PI / 2 })),
    ...Array.from({ length: 17 }, (_, i) => -80 + i * 13.5).map((x, i) => E(`tree-s${i}`, "tree", "tree", [x, 51.3], { s: 0.85, seed: i + 20 }, { decor: true, area: "admin" })),
    ...Array.from({ length: 15 }, (_, i) => -92 + i * 16).map((x, i) => E(`tree-n${i}`, "tree", "tree", [x, -68], { s: 0.8, seed: i + 40 }, { decor: true, area: "admin" })),
    ...[-24, -14, -4, 6, 16].map((z, i) => E(`tree-e${i}`, "tree", "tree", [157.5, z], { s: 0.8, seed: i + 60 }, { decor: true, area: "admin" })),
    ...[[-100.5, -70.5, "stop"], [142, -66, "stop"], [154, -41, "stop"], [140, -58, "info"], [-108, -58, "info"]].map(([x, z, kind], i) => E(`sign-${i}`, "sign", "sign", [x, z], { kind }, { decor: true, area: "admin" })),
    E("muster", "muster", "muster", [-130, 20], { s: 7 }, { area: "admin" }),
    E("grain-truck-1", "graintruck", "grainTruck", [-120, -75], {}, { n: 1, area: "grain" }),
    E("grain-truck-2", "graintruck", "grainTruck", [60, -75], {}, { n: 2, area: "grain" }),
    ...[[-84, -68, "paintBlue"], [-34, 42, "paintGreen"], [104, 18, "paintBlue"], [54, 40, "paintGreen"]].map(([x, z, color], i) => E(`skip-${i}`, "skip", "skip", [x, z], { color }, { decor: true, area: "utilities" }))
  ],

  // pedestrian walkways (painted, 1.8 m)
  paths: [
    { pts: [[-118, 34], [-118, 9], [-142, 9]] },
    { pts: [[-118, 9], [156, 9]] },                                    // main walkway along the pipe rack
    { pts: [[-103, 45], [-103, 9]] },                                  // laboratory
    { pts: [[-97, 9], [-97, -38]] },                                   // grain and milling
    { pts: [[-39, 9], [-39, -58], [44, -58], [44, 9]] },               // process loop: fermentation, distillation, dehydration
    { pts: [[24, 9], [24, -6]] }, { pts: [[60, 9], [60, -6]] },
    { pts: [[-30, 9], [-30, 22]] }, { pts: [[48, 9], [48, 22]] }, { pts: [[-126, 9], [-126, 16]] }
  ],
  // green zones [x, z, w, d]: office lawns, south and north verges with tree rows, west and east verges
  lawns: [[-118, 51, 34, 4], [-122, 30.5, 22, 4], [32, 51.25, 236, 3.5], [21, -68, 242, 5], [-140, -10, 3, 108], [157.5, -5, 7, 50]],

  // road tankers: a closed loop on the site roads, stopping under the loading canopy (index stopAt)
  vehicles: [
    { ids: ["truck-1", "truck-2"], path: [[-146, 58], [0, 58], [160, 58], [166, 50], [166, 0], [166, -28], [160, -36], [149.5, -36], [149.5, -50], [149.5, -64], [146, -76], [130, -77], [0, -77], [-140, -77], [-146, -70], [-146, 0], [-146, 50]], stopAt: 7, stop: 7, speed: 10 },
    { ids: ["grain-truck-1", "grain-truck-2"], path: [[-60, -73], [0, -73], [100, -73], [144, -72], [146, -66], [140, -62], [60, -62], [0, -62], [-60, -62], [-98, -62], [-104, -66], [-110, -73], [-122, -73]], stopAt: 12, stop: 8, speed: 9 }
  ],

  // ---------------------------------------------------------------- production process (network "process")
  streams: {
    mash: { color: 0xf59e0b, name: "Mash" },
    beer: { color: 0xa855f7, name: "Beer (fermented mash)" },
    ethanol: { color: 0x22d3ee, name: "Ethanol" },
    stillage: { color: 0xb7793b, name: "Whole stillage" },
    thin: { color: 0xd6a35c, name: "Thin stillage" },
    co2: { color: 0xcbd5e1, name: "CO₂" },
    denat: { color: 0xef4444, name: "Denaturant (gasoline)" }
  },
  connections: [
    { from: "mill", to: "slurry", stream: "mash", direct: true },
    { from: "slurry", to: "cooker", stream: "mash", direct: true },
    { from: "cooker", to: "liq-1", stream: "mash", direct: true },
    { from: "liq-1", to: "liq-2", stream: "mash", direct: true },
    { from: "liq-2", to: "cooler", stream: "mash", direct: true },
    { from: "cooler", to: "ferm-3", stream: "mash", direct: true },
    { from: "cooler", to: "ferm-4", stream: "mash", direct: true },
    { from: "yeast", to: "ferm-2", stream: "mash", direct: true },
    { from: "ferm-1", to: "scrubber", stream: "co2", direct: true, fromPort: "in" },
    { from: "ferm-2", to: "beerwell", stream: "beer", direct: true },
    { from: "ferm-4", to: "beerwell", stream: "beer", direct: true },
    { from: "beerwell", to: "beercol", stream: "beer", direct: true },
    { from: "beercol", to: "rectifier", stream: "ethanol", direct: true },
    { from: "rectifier", to: "sieve-1", stream: "ethanol", direct: true },
    { from: "sieve-3", to: "prodcooler", stream: "ethanol", direct: true },
    { from: "prodcooler", to: "day-1", stream: "ethanol" },
    { from: "day-2", to: "tank-1", stream: "ethanol", direct: true },
    { from: "tank-1", to: "tank-2", stream: "ethanol", direct: true },
    { from: "tank-2", to: "loading", stream: "ethanol" },
    { from: "denaturant", to: "loading", stream: "denat" },
    { from: "beercol", to: "centrifuge", stream: "stillage", fromPort: "bottom" },
    { from: "centrifuge", to: "ts-tank", stream: "thin", direct: true },
    { from: "ts-tank", to: "feedlot", stream: "thin" }
  ],

  // ---------------------------------------------------------------- engineering connection graph (conceptual)
  networks: NETWORKS,
  links: [
    // electrical power: substation → MCC → loads; standby generator on the essential bus
    L("pw-main", "power", "substation", "mcc", "Main feeder (MV)", { desc: "Utility supply from the substation transformers to the motor control centre." }),
    L("pw-egen", "power", "egen", "mcc", "Standby generator feeder", { desc: "Emergency power for essential loads (controls, fire pumps, lighting)." }),
    ...[["grain", "cab-grain", "Grain handling motors"], ["mill", "cab-mill", "Hammer mill drive"], ["ferm", "cab-ferm", "Fermenter agitators and pumps"], ["dist", "cab-dist", "Distillation pumps"], ["sieve", "cab-sieve", "Molecular sieve skid"], ["tank", "cab-tank", "Tank farm and loading pumps"], ["co", "cab-co", "Decanter centrifuges"], ["boiler", "boiler", "Boiler house"], ["cool", "cwpump", "Cooling-water pumps"], ["tower", "cooling", "Cooling tower fans"], ["air", "compressor", "Air compressors"], ["ro", "ro", "Reverse osmosis unit"], ["ww", "wwpump", "Wastewater pumps"], ["fire", "firepump", "Fire pumps (essential)"], ["admin", "admin", "Offices and control room"]]
      .map(([k, to, name]) => L(`pw-${k}`, "power", "mcc", to, name, { desc: `Low-voltage feeder from the motor control centre: ${name.toLowerCase()}.` })),
    // automation & control: control room → local panels and instruments
    ...[["grain", "cab-grain"], ["mill", "cab-mill"], ["ferm", "cab-ferm"], ["dist", "cab-dist"], ["sieve", "cab-sieve"], ["tank", "cab-tank"], ["co", "cab-co"], ["boiler", "boiler"], ["mcc", "mcc"], ["env", "monitor"], ["fire", "firepump"]]
      .map(([k, to]) => L(`ct-${k}`, "control", "admin", to, "Control network", { desc: "Fibre / fieldbus link from the control room to a local control panel (conceptual)." })),
    // steam & thermal energy
    L("st-cook", "steam", "boiler", "cooker", "Steam to jet cooker", { kind: "supply", desc: "High-temperature steam injected into the continuous jet cooker." }),
    L("st-dist", "steam", "boiler", "dist-structure", "Steam to distillation reboilers", { kind: "supply", desc: "Steam supply to the reboilers on the distillation structure." }),
    L("st-liq", "steam", "boiler", "liq-1", "Steam to liquefaction", { kind: "supply", desc: "Heating steam for the liquefaction holding tanks." }),
    L("cr-dist", "steam", "dist-structure", "boiler", "Condensate return", { kind: "return", desc: "Condensate from the reboilers returned to the boiler feed system." }),
    L("cr-liq", "steam", "liq-1", "boiler", "Condensate return", { kind: "return", desc: "Condensate returned from liquefaction heating." }),
    // cooling water (supply / return)
    L("cw-tower", "cooling", "cooling", "cwpump", "Cold-water basin to pumps", { kind: "supply", direct: true }),
    ...[["cond", "condenser", "Product condenser"], ["ferm", "ferm-4", "Fermenter coolers"], ["prod", "prodcooler", "Ethanol product cooler"], ["mash", "cooler", "Mash cooler"]].flatMap(([k, to, name]) => [
      L(`cws-${k}`, "cooling", "cwpump", to, `Cooling water supply · ${name}`, { kind: "supply", desc: `Cooling-water supply to the ${name.toLowerCase()}.` }),
      L(`cwr-${k}`, "cooling", to, "cooling", `Cooling water return · ${name}`, { kind: "return", desc: `Warm return from the ${name.toLowerCase()} to the cooling tower.` })
    ]),
    // process water
    L("pw-well1", "water", "well-1", "ro", "Well water", { direct: true, desc: "Raw water from deep well 1 to reverse osmosis (2 deep wells: public figure)." }),
    L("pw-well2", "water", "well-2", "ro", "Well water", { direct: true, desc: "Raw water from deep well 2 to reverse osmosis." }),
    L("pw-store", "water", "ro", "wt-1", "Treated water to storage", { direct: true }),
    L("pw-store2", "water", "wt-1", "wt-2", "Storage balance line", { direct: true }),
    L("pw-mash", "water", "wt-1", "slurry", "Process water to mashing", { desc: "Make-up water to the slurry tank." }),
    L("pw-boiler", "water", "wt-2", "boiler", "Boiler make-up water"),
    L("pw-tower", "water", "wt-2", "cooling", "Cooling tower make-up", { direct: true }),
    // compressed air
    L("ca-dist", "air", "compressor", "dist-structure", "Instrument air · distillation"),
    L("ca-sieve", "air", "compressor", "sieve-3", "Instrument air · molecular sieve", { desc: "Air for the valve actuators that switch the sieve vessels." }),
    L("ca-mill", "air", "compressor", "mill", "Plant air · dust filters"),
    L("ca-recv", "air", "compressor", "receiver", "Air receiver", { direct: true }),
    // wastewater
    L("ww-ferm", "waste", "beerwell", "wwpump", "Process drains · fermentation"),
    L("ww-boiler", "waste", "boiler", "wwpump", "Boiler blow-down"),
    L("ww-ro", "waste", "ro", "wwpump", "RO reject"),
    L("ww-clar", "waste", "wwpump", "clarifier", "To clarifier", { direct: true }),
    L("ww-aer", "waste", "clarifier", "aeration", "To aeration basin", { direct: true }),
    // fire protection
    L("fw-tank", "fire", "firetank", "firepump", "Fire-water suction", { direct: true }),
    ...[["grain", "Hydrant · grain area"], ["ferm", "Hydrant · fermentation"], ["dist", "Hydrant · distillation"], ["tank", "Hydrant · tank farm"], ["util", "Hydrant · utilities"], ["co", "Hydrant · co-products"]]
      .map(([k, name]) => L(`fw-${k}`, "fire", "firepump", `hyd-${k}`, name, { desc: "Fire main from the fire pump house to a hydrant (conceptual)." }))
  ],

  // ---------------------------------------------------------------- equipment catalogue
  catalog: {
    bin: { name: "Grain storage bin", fn: "Stores screened feed wheat before milling (three bins in the public description).", specs: [["Feedstock", "Feed wheat, spring and winter", "v"], ["Wheat milled", "≈ 110 t/day", "v"], ["Bin size", "≈ 600 t each", "a"]] },
    receiving: { name: "Grain receiving", fn: "Truck unloading, screening of large material and weighing.", specs: [] },
    elevator: { name: "Bucket elevator", fn: "Elevates screened grain into the storage bins.", specs: [] },
    conveyor: { name: "Conveyor", fn: "Moves grain between the bins and the mill, or wet cake to the WDG bunker.", specs: [] },
    mill: { name: "Hammer mill building", fn: "Grinds the wheat into smaller particles to expose the starch.", specs: [["Mill type", "Hammer mill", "v"]] },
    cyclone: { name: "Dust cyclone", fn: "Collects dust from the grain handling and milling aspiration.", specs: [] },
    slurry: { name: "Slurry tank", fn: "Mixes the meal with process water and alpha-amylase.", specs: [] },
    cooker: { name: "Continuous jet cooker", fn: "Injects high-temperature steam to sterilise the grain and hydrolyse the starch.", specs: [["Type", "Continuous jet cooker", "v"]] },
    liq: { name: "Liquefaction tank", fn: "Holds the cooked mash while enzymes convert the starch.", specs: [] },
    cooler: { name: "Mash cooler", fn: "Cools the mash to fermentation temperature.", specs: [] },
    fermenter: { name: "Fermenter", fn: "Yeast converts the sugars into ethanol and carbon dioxide.", specs: [["Volume", "283,000 L", "v"], ["Fill time", "≈ 20 h", "v"], ["Fermentation", "48 h", "v"], ["Beer strength", "10–12 % v/v", "v"]] },
    yeast: { name: "Yeast propagation tank", fn: "Prepares the yeast for each fermentation batch.", specs: [] },
    beerwell: { name: "Beer well", fn: "Buffers the fermented beer and feeds the distillation continuously.", specs: [] },
    scrubber: { name: "CO₂ scrubber", fn: "Recovers alcohol from the fermentation CO₂ before venting.", specs: [] },
    pump: { name: "Transfer pump", fn: "Moves mash, beer or product between process steps.", specs: [] },
    beercol: { name: "Beer column", fn: "Strips the alcohol from the fermented beer; the stillage leaves at the bottom.", specs: [["Overhead strength", "≈ 94 %", "v"]] },
    rectifier: { name: "Rectifier column", fn: "Concentrates the alcohol vapour before dehydration.", specs: [] },
    structure: { name: "Distillation structure", fn: "Platforms carrying reboilers, condensers and reflux drums.", specs: [] },
    condenser: { name: "Condenser", fn: "Condenses the overhead vapour.", specs: [] },
    sieve: { name: "Molecular sieve vessel", fn: "Desiccant bed that removes the remaining water.", specs: [["Vessels", "4", "v"], ["Outlet purity", "99.5 %", "v"], ["Upgrade", "2011 (KATZEN design)", "v"]] },
    prodcooler: { name: "Ethanol product cooler", fn: "Cools the anhydrous ethanol before storage.", specs: [] },
    day: { name: "Shift tank", fn: "Receives and checks production before transfer to storage.", specs: [["Purpose", "Conceptual", "c"]] },
    tank: { name: "Ethanol storage tank", fn: "Stores the finished ethanol before dispatch.", specs: [["Capacity", "500,000 L", "v"], ["Tanks", "2", "v"]] },
    denaturant: { name: "Denaturant tank", fn: "Gasoline used to denature the ethanol so that it cannot enter the potable market.", specs: [["Denaturant", "Gasoline", "v"]] },
    bund: { name: "Containment bund", fn: "Secondary containment around the product tanks.", specs: [] },
    loading: { name: "Tanker loading bay", fn: "Road-tanker loading with filling arms.", specs: [] },
    truck: { name: "Road tanker", fn: "Dispatches the ethanol by road.", specs: [] },
    centrifuge: { name: "Decanter centrifuges", fn: "Split the whole stillage into wet cake (WDG) and thin stillage.", specs: [["Drying / evaporation", "None — avoided by design", "v"]] },
    tstank: { name: "Thin stillage tank", fn: "Holds thin stillage pumped to the feedlot watering system.", specs: [["Dissolved solids", "≈ 9 %, mostly protein", "v"]] },
    wdg: { name: "Wet distillers grain bunker", fn: "Wet cake used in the feedlot ration within a few days.", specs: [["Moisture", "75–78 %", "v"]] },
    feedlot: { name: "Feedlot connection (off-site)", fn: "Co-products go to the adjacent cattle feedlot.", specs: [["Feedlot capacity", "26,000 head (one-time)", "v"]] },
    boiler: { name: "Boiler house", fn: "Natural-gas boilers producing steam for cooking and distillation.", specs: [["Thermal energy", `≈ ${A.thermal.v} MJ/L`, "a"]] },
    stack: { name: "Boiler stack", fn: "Exhausts the combustion gases.", specs: [] },
    cooling: { name: "Cooling tower", fn: "Rejects process heat from the cooling-water circuit.", specs: [["Cells", "2", "c"]] },
    cwpump: { name: "Cooling-water pump station", fn: "Circulates cooling water to the process coolers and condensers.", specs: [] },
    compressor: { name: "Compressor house", fn: "Compressed air for instruments, valve actuators and filters.", specs: [] },
    receiver: { name: "Air receiver", fn: "Stores compressed air and damps pressure swings.", specs: [] },
    ro: { name: "Water treatment (reverse osmosis)", fn: "Purifies the make-up water drawn from the wells.", specs: [["Technology", "Industrial reverse osmosis", "v"], ["Water use", "> 400,000 L/day", "v"]] },
    wtank: { name: "Treated water tank", fn: "Stores treated water for process and boiler make-up.", specs: [] },
    well: { name: "Deep well", fn: "Raw-water supply.", specs: [["Wells", "2 (300 ft deep)", "v"]] },
    wwpump: { name: "Wastewater pump station", fn: "Collects process drains, blow-down and RO reject.", specs: [["Status", "Conceptual", "c"]] },
    clarifier: { name: "Clarifier", fn: "Settles suspended solids from the wastewater.", specs: [["Status", "Conceptual", "c"]] },
    aeration: { name: "Aeration basin", fn: "Biological treatment of the clarified wastewater.", specs: [["Status", "Conceptual", "c"]] },
    substation: { name: "Electrical substation", fn: "Utility supply transformed to plant distribution voltage.", specs: [["Transformers", "2", "c"]] },
    mcc: { name: "Electrical room / motor control centre", fn: "Switchgear and motor starters feeding the plant loads.", specs: [["Status", "Conceptual", "c"]] },
    egen: { name: "Standby diesel generator", fn: "Emergency power for essential loads.", specs: [["Status", "Conceptual", "c"]] },
    firetank: { name: "Fire-water tank", fn: "Dedicated fire-water storage.", specs: [["Status", "Conceptual", "c"]] },
    firepump: { name: "Fire pump house", fn: "Electric and diesel fire pumps feeding the hydrant main.", specs: [["Status", "Conceptual", "c"]] },
    monitor: { name: "Environmental monitoring station", fn: "Weather and ambient air monitoring.", specs: [["Status", "Conceptual", "c"]] },
    cabinet: { name: "Local control panel", fn: "Field panel with motor starters, PLC I/O and a status light.", specs: [["Status", "Conceptual", "c"]] },
    hydrant: { name: "Fire hydrant", fn: "Hydrant on the fire-water main.", specs: [] },
    admin: { name: "Offices and control room", fn: "Plant control room, management and administration.", specs: [["Employees (company)", "≈ 50", "v"]] },
    lab: { name: "Quality laboratory", fn: "Tests the grain, beer, ethanol and co-products.", specs: [] },
    gate: { name: "Gatehouse", fn: "Staff, visitor and truck control.", specs: [] },
    parking: { name: "Staff car park", fn: "Parking for staff and visitors.", specs: [] },
    graintruck: { name: "Grain truck", fn: "Delivers feed wheat to the receiving pit (≈ 110 t/day: public figure).", specs: [] },
    muster: { name: "Emergency assembly point", fn: "Muster point for staff and visitors during an evacuation.", specs: [["Status", "Conceptual", "c"]] },
    rack: { name: "Pipe rack", fn: "Three-tier steel structure: process lines, utility lines and cable trays.", specs: [["Length", "≈ 250 m", "c"], ["Tiers", "Process · utilities · cable trays", "c"]] }
  },

  // ---------------------------------------------------------------- financial model (CAD, illustrative)
  finance: {
    currency: { code: "CAD", symbol: "C$", locale: "en-CA" },
    presets: [
      { id: "base", name: "Base case (2025 benchmarks)", v: {} },
      { id: "favourable", name: "Favourable market", v: { ethanolPrice: 0.82, wheatPrice: 225, dgValue: 360 } },
      { id: "stressed", name: "Stressed market", v: { ethanolPrice: 0.62, wheatPrice: 300, gasPrice: 6.5 } }
    ],
    inputs: [
      { id: "capacity", group: "plant", min: 5, max: 40, step: 0.5, def: A.capacity.v, unit: "M L/year", label: "Ethanol production" },
      { id: "days", group: "plant", min: 300, max: 360, step: 5, def: A.days.v, unit: "days", label: "Operating days" },
      { id: "yield", group: "plant", min: 330, max: 400, step: 1, def: A.yield.v, unit: "L/t", label: "Ethanol yield" },
      { id: "wheatPrice", group: "market", min: 180, max: 380, step: 5, def: A.wheatPrice.v, unit: "C$/t", label: "Feed wheat price" },
      { id: "ethanolPrice", group: "market", min: 0.5, max: 1.1, step: 0.01, def: A.ethanolPrice.v, unit: "C$/L", label: "Ethanol price" },
      { id: "dgValue", group: "market", min: 200, max: 420, step: 10, def: A.dgValue.v, unit: "C$/t DM", label: "Distillers grain value" },
      { id: "gasPrice", group: "market", min: 3, max: 10, step: 0.25, def: A.gasPrice.v, unit: "C$/GJ", label: "Natural gas price" },
      { id: "powerPrice", group: "market", min: 0.05, max: 0.15, step: 0.005, def: A.powerPrice.v, unit: "C$/kWh", label: "Electricity price" },
      { id: "capexPerL", group: "invest", min: 1.2, max: 3.5, step: 0.05, def: A.capexPerL.v, unit: "C$/L", label: "Unit investment" },
      { id: "staff", group: "invest", min: 8, max: 30, step: 1, def: A.staff.v, unit: "FTE", label: "Plant personnel" }
    ],
    capexSplit: CAPEX_SPLIT,
    opexLabels: { feed: ["Feed wheat", "#f2c14e"], gas: ["Natural gas", "#f97316"], power: ["Electricity", "#facc15"], water: ["Water and wastewater", "#14b8a6"], chem: ["Enzymes, yeast, chemicals", "#a855f7"], staff: ["Personnel", "#60a5fa"], maint: ["Maintenance", "#94a3b8"], logistics: ["Logistics", "#22d3ee"], admin: ["Insurance and administration", "#64748b"] },
    compute(v) {
      const Lt = v.capacity * 1e6;                                  // litres per year
      const wheat = Lt / v.yield;                                   // t/year
      const dgDM = wheat * A.dgYield.v;                             // t dry matter/year
      const wdgWet = dgDM / 0.235;                                  // 76.5 % moisture (public range 75–78 %)
      const co2 = (Lt * 0.789 * 0.957) / 1000;                      // t/year: 0.957 kg CO₂ per kg ethanol (stoichiometry)
      const gasGJ = (Lt * A.thermal.v) / 1000, powerKWh = Lt * A.power.v, waterM3 = Lt * (A.water.v / 40000);
      const capex = Lt * v.capexPerL;
      const revEth = Lt * v.ethanolPrice, revDg = dgDM * v.dgValue, revenue = revEth + revDg;
      const opexSplit = [
        ["feed", wheat * v.wheatPrice], ["gas", gasGJ * v.gasPrice], ["power", powerKWh * v.powerPrice],
        ["water", waterM3 * A.waterCost.v], ["chem", Lt * A.chemicals.v], ["staff", v.staff * A.wage.v],
        ["maint", (capex * A.maintenance.v) / 100], ["logistics", Lt * A.logistics.v], ["admin", A.insurance.v * 1e6]
      ];
      const opex = opexSplit.reduce((s, [, x]) => s + x, 0), ebitda = revenue - opex;
      const months = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], stop = 365 - v.days, perDay = Lt / v.days;
      return {
        revenue, revEth, revDg, opex, opexSplit, ebitda, capex,
        margin: revenue ? ebitda / revenue : 0,
        payback: ebitda > 0 ? capex / ebitda : null,
        costPerL: opex / Lt, netCostPerL: (opex - revDg) / Lt,
        daily: { ethanol: perDay, wheat: wheat / v.days, wdg: wdgWet / v.days, co2: co2 / v.days, water: waterM3 / v.days, gas: gasGJ / v.days, power: powerKWh / 1000 / v.days },
        annual: { ethanol: Lt, wheat, wdg: wdgWet, dgDM, co2, water: waterM3, gas: gasGJ, power: powerKWh / 1000 },
        monthly: months.map((d, i) => Math.max(0, d - (i === 6 ? Math.min(31, stop) : 0)) * perDay)   // planned shutdown in July
      };
    }
  }
};
