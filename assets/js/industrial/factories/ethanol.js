/*
 * 3DNA Digital Twin — factory configuration: Ethanol Production Plant (dry-grind, illustrative).
 *
 * The engine (../engine.js) and the dashboard (../dashboard.js) read only this object:
 *   site / roads / fence ........ ground plan (metres; x east, z south)
 *   areas ....................... process areas (floor tint + label in the process view, step order)
 *   equipment ................... { id, kind, n?, type, params, pos: [x, z], rot?, area }
 *   streams / connections ....... process streams (colour, rack lane) and the pipes between items
 *   catalog ..................... per kind: name, function, illustrative specifications (ES / EN)
 *   finance ..................... calculator inputs, compute(values) -> KPIs, CAPEX / OPEX, production
 * A new plant type = a new file with the same shape; nothing in the engine changes.
 * Every technical and financial figure here is ILLUSTRATIVE (a demonstration, not an engineering study).
 */
const E = (id, kind, type, pos, params = {}, extra = {}) => ({ id, kind, type, pos, params, ...extra });

export default {
  id: "ethanol",
  name: { es: "Planta de producción de etanol", en: "Ethanol Production Plant" },
  short: { es: "Etanol", en: "Ethanol" },
  site: { x: [-150, 170], z: [-80, 64] },
  fence: { x: [-152, 172], z: [-82, 66] },
  roads: [
    { x: 10, z: 58, w: 324, d: 9 }, { x: 10, z: -75, w: 324, d: 8 },
    { x: -146, z: -8, w: 8, d: 142, lines: false }, { x: 166, z: -8, w: 8, d: 142, lines: false },
    { x: 148, z: -8, w: 10, d: 56, lines: false }
  ],

  areas: [
    { id: "grain", step: 1, color: 0xf2c14e, x: [-142, -88], z: [-70, -28], name: { es: "Recepción y almacenamiento de grano", en: "Grain receiving and storage" },
      desc: { es: "Los camiones descargan el cereal en la tolva de recepción; el elevador lo sube a los silos, donde se almacena hasta la molienda.", en: "Trucks unload the grain into the receiving pit; the elevator lifts it into the silos, where it is stored until milling." } },
    { id: "milling", step: 2, color: 0xe8a33d, x: [-96, -64], z: [-32, -8], name: { es: "Molienda", en: "Milling" },
      desc: { es: "Los molinos de martillos reducen el grano a harina para exponer el almidón.", en: "Hammer mills grind the grain into flour to expose the starch." } },
    { id: "liquefaction", step: 3, color: 0xf97316, x: [-64, -42], z: [-36, -4], name: { es: "Licuefacción", en: "Liquefaction" },
      desc: { es: "La harina se mezcla con agua y enzimas; a temperatura controlada el almidón se convierte en un mosto fluido.", en: "The flour is mixed with water and enzymes; at a controlled temperature the starch becomes a fluid mash." } },
    { id: "fermentation", step: 4, color: 0xa855f7, x: [-40, 28], z: [-68, -20], name: { es: "Fermentación", en: "Fermentation" },
      desc: { es: "Las levaduras transforman los azúcares en etanol y CO₂ durante varios días. El resultado es la «cerveza» de destilación.", en: "Yeast turns the sugars into ethanol and CO₂ over several days. The result is the distillation 'beer'." } },
    { id: "distillation", step: 5, color: 0x3b82f6, x: [28, 58], z: [-52, -16], name: { es: "Destilación", en: "Distillation" },
      desc: { es: "Las columnas separan el etanol del agua y de los sólidos (vinazas).", en: "The columns separate the ethanol from the water and the solids (stillage)." } },
    { id: "dehydration", step: 6, color: 0x06b6d4, x: [58, 72], z: [-50, -14], name: { es: "Deshidratación", en: "Dehydration" },
      desc: { es: "Los tamices moleculares retiran el agua restante hasta obtener etanol anhidro.", en: "Molecular sieves remove the remaining water to produce anhydrous ethanol." } },
    { id: "storage", step: 7, color: 0x22d3ee, x: [74, 156], z: [-68, -14], name: { es: "Almacenamiento y expedición", en: "Storage and dispatch" },
      desc: { es: "El etanol se almacena en tanques dentro de un cubeto y se carga en camiones cisterna.", en: "The ethanol is stored in tanks inside a bund and loaded into road tankers." } },
    { id: "coproducts", step: 8, color: 0xb7793b, x: [14, 148], z: [14, 52], name: { es: "Coproductos: DDGS y CO₂", en: "Co-products: DDGS and CO₂" },
      desc: { es: "Las vinazas se centrifugan, se concentran y se secan para producir DDGS, un pienso de alto valor proteico.", en: "The stillage is centrifuged, concentrated and dried into DDGS, a high-protein animal feed." } },
    { id: "utilities", step: 9, color: 0x94a3b8, x: [-130, 0], z: [16, 52], name: { es: "Servicios: vapor, agua y energía", en: "Utilities: steam, water and power" },
      desc: { es: "Calderas, torre de refrigeración, tratamiento de agua, subestación y sala de control.", en: "Boilers, cooling tower, water treatment, substation and control room." } }
  ],

  equipment: [
    // 1 · grain
    E("silo-1", "silo", "silo", [-132, -56], { r: 7, h: 20 }, { n: 1, area: "grain" }),
    E("silo-2", "silo", "silo", [-116, -56], { r: 7, h: 20 }, { n: 2, area: "grain" }),
    E("silo-3", "silo", "silo", [-132, -38], { r: 7, h: 20 }, { n: 3, area: "grain" }),
    E("silo-4", "silo", "silo", [-116, -38], { r: 7, h: 20 }, { n: 4, area: "grain" }),
    E("receiving", "receiving", "building", [-96, -64], { w: 16, d: 10, h: 8, doors: 2, wall: "wallDark" }, { area: "grain" }),
    E("elevator", "elevator", "elevator", [-98, -46], { h: 30 }, { area: "grain" }),
    E("conveyor-silos", "conveyor", "conveyor", [-98, -46], { len: 26, y0: 30, y1: 30 }, { rot: Math.PI, area: "grain" }),
    E("conveyor-mill", "conveyor", "conveyor", [-98, -46], { len: 25.6, y0: 30, y1: 15 }, { rot: -0.896, area: "grain" }),
    // 2 · milling
    E("mill", "mill", "building", [-78, -20], { w: 22, d: 16, h: 14, doors: 1 }, { area: "milling" }),
    E("cyclone", "cyclone", "vessel", [-93, -16], { r: 1.2, h: 5, legs: 3, mat: "steel" }, { area: "milling" }),
    // 3 · liquefaction
    E("slurry", "slurry", "tank", [-58, -24], { r: 3.5, h: 7, roof: "flat" }, { area: "liquefaction" }),
    E("liq-1", "liq", "tank", [-50, -31], { r: 3.5, h: 9, roof: "dome" }, { n: 1, area: "liquefaction" }),
    E("liq-2", "liq", "tank", [-50, -17], { r: 3.5, h: 9, roof: "dome" }, { n: 2, area: "liquefaction" }),
    E("cooler", "cooler", "exchanger", [-60, -9], { r: 0.7, len: 6 }, { area: "liquefaction" }),
    // 4 · fermentation
    ...[[-30, -50], [-14, -50], [2, -50], [-30, -30], [-14, -30], [2, -30]].map((p, i) => E(`ferm-${i + 1}`, "fermenter", "tank", p, { r: 6.5, h: 15, roof: "dome", mat: "cladding" }, { n: i + 1, area: "fermentation" })),
    E("yeast-1", "yeast", "vessel", [16, -52], { r: 1.6, h: 6 }, { n: 1, area: "fermentation" }),
    E("yeast-2", "yeast", "vessel", [16, -43], { r: 1.6, h: 6 }, { n: 2, area: "fermentation" }),
    E("beerwell", "beerwell", "tank", [18, -27], { r: 6, h: 16, roof: "cone", mat: "cladding" }, { area: "fermentation" }),
    E("scrubber", "scrubber", "column", [-6, -63], { r: 1.1, h: 16, step: 8, mat: "steel" }, { area: "fermentation" }),
    // 5 · distillation
    E("beercol", "beercol", "column", [34, -46], { r: 1.8, h: 30, step: 6 }, { area: "distillation" }),
    E("rectifier", "rectifier", "column", [42, -46], { r: 1.5, h: 34, step: 6 }, { area: "distillation" }),
    E("stripper", "stripper", "column", [50, -46], { r: 1.2, h: 24, step: 6 }, { area: "distillation" }),
    E("dist-structure", "structure", "structure", [43, -28], { w: 20, d: 12, levels: 4, lh: 6 }, { area: "distillation" }),
    // 6 · dehydration
    E("sieve-1", "sieve", "vessel", [64, -42], { r: 1.3, h: 9, mat: "insulation" }, { n: 1, area: "dehydration" }),
    E("sieve-2", "sieve", "vessel", [64, -33], { r: 1.3, h: 9, mat: "insulation" }, { n: 2, area: "dehydration" }),
    E("condenser", "condenser", "exchanger", [64, -21], { r: 0.8, len: 7 }, { rot: Math.PI / 2, area: "dehydration" }),
    // 7 · storage and dispatch
    E("day-1", "day", "tank", [80, -48], { r: 3, h: 8, roof: "cone" }, { n: 1, area: "storage" }),
    E("day-2", "day", "tank", [80, -36], { r: 3, h: 8, roof: "cone" }, { n: 2, area: "storage" }),
    E("tank-1", "tank", "tank", [98, -52], { r: 8, h: 13, roof: "cone" }, { n: 1, area: "storage" }),
    E("tank-2", "tank", "tank", [120, -52], { r: 8, h: 13, roof: "cone" }, { n: 2, area: "storage" }),
    E("tank-3", "tank", "tank", [98, -28], { r: 8, h: 13, roof: "cone" }, { n: 3, area: "storage" }),
    E("tank-4", "tank", "tank", [120, -28], { r: 8, h: 13, roof: "cone" }, { n: 4, area: "storage" }),
    E("bund", "bund", "bund", [109, -40], { w: 46, d: 46, h: 1.4 }, { area: "storage" }),
    E("loading", "loading", "canopy", [146, -36], { w: 24, d: 14, h: 7 }, { area: "storage" }),
    E("truck-1", "truck", "truck", [146, -40], {}, { n: 1, area: "storage" }),
    E("truck-2", "truck", "truck", [146, -32], {}, { n: 2, area: "storage" }),
    // 8 · co-products
    E("centrifuge", "centrifuge", "centrifuge", [22, 26], { n: 3 }, { area: "coproducts" }),
    ...[40, 46, 52, 58].map((x, i) => E(`evap-${i + 1}`, "evap", "vessel", [x, 22], { r: 1.6, h: 12, mat: "steel" }, { n: i + 1, area: "coproducts" })),
    E("syrup", "syrup", "tank", [64, 36], { r: 3, h: 7, roof: "dome" }, { area: "coproducts" }),
    E("dryer", "dryer", "dryer", [88, 34], { r: 2.2, len: 26 }, { area: "coproducts" }),
    E("ddgs", "ddgs", "building", [131, 34], { w: 30, d: 20, h: 12, doors: 3, wall: "wallDark" }, { area: "coproducts" }),
    // 9 · utilities
    E("boiler", "boiler", "building", [-20, 30], { w: 20, d: 14, h: 12, doors: 1 }, { area: "utilities" }),
    E("stack", "stack", "stack", [-5, 38], { r: 1.3, h: 38 }, { area: "utilities" }),
    E("cooling", "cooling", "coolingTower", [-50, 34], { cells: 3, cw: 9, d: 10, h: 9 }, { area: "utilities" }),
    E("water-1", "water", "tank", [-74, 26], { r: 3, h: 6, roof: "flat" }, { n: 1, area: "utilities" }),
    E("water-2", "water", "tank", [-74, 40], { r: 3, h: 6, roof: "flat" }, { n: 2, area: "utilities" }),
    E("substation", "substation", "building", [-92, 30], { w: 10, d: 8, h: 5, windows: false, doors: 1, wall: "wallDark" }, { area: "utilities" }),
    E("admin", "admin", "building", [-115, 40], { w: 26, d: 14, h: 8, glass: true, doors: 0 }, { area: "utilities" }),
    // pipe rack + pumps
    E("rack", "rack", "pipeRack", [10, 0], { len: 232, w: 8, h: 8, bay: 8 }, { area: "utilities" }),
    E("pump-1", "pump", "pump", [-40, -12], {}, { n: 1, area: "fermentation" }),
    E("pump-2", "pump", "pump", [28, -12], { color: "paintGreen" }, { n: 2, area: "distillation" }),
    E("pump-3", "pump", "pump", [86, -12], {}, { n: 3, area: "storage" })
  ],

  // lane: height and z of the stream's run along the pipe rack
  streams: {
    mash: { color: 0xf59e0b, pipe: 0xd4d8dd, r: 0.3, lane: { y: 8.4, z: -2.6 }, name: { es: "Mosto", en: "Mash" } },
    beer: { color: 0xa855f7, pipe: 0xd4d8dd, r: 0.3, lane: { y: 8.4, z: -0.9 }, name: { es: "Cerveza (mosto fermentado)", en: "Beer (fermented mash)" } },
    ethanol: { color: 0x22d3ee, pipe: 0xc9ced4, r: 0.24, lane: { y: 8.4, z: 0.9 }, name: { es: "Etanol", en: "Ethanol" } },
    stillage: { color: 0xc08a4a, pipe: 0x8a6d4a, r: 0.32, lane: { y: 8.4, z: 2.6 }, name: { es: "Vinazas / jarabe", en: "Stillage / syrup" } },
    steam: { color: 0xf87171, pipe: 0xe8ecef, r: 0.34, lane: { y: 10.6, z: -2.2 }, name: { es: "Vapor", en: "Steam" } },
    water: { color: 0x3b82f6, pipe: 0x2f6fbf, r: 0.32, lane: { y: 10.6, z: 0 }, name: { es: "Agua de refrigeración", en: "Cooling water" } },
    co2: { color: 0xcbd5e1, pipe: 0x9aa3ad, r: 0.26, lane: { y: 10.6, z: 2.2 }, name: { es: "CO₂", en: "CO₂" } }
  },

  connections: [
    { from: "mill", to: "slurry", stream: "mash", direct: true, fromPort: "out" },
    { from: "slurry", to: "liq-1", stream: "mash", direct: true },
    { from: "liq-1", to: "liq-2", stream: "mash", direct: true },
    { from: "liq-2", to: "cooler", stream: "mash", direct: true },
    { from: "cooler", to: "ferm-4", stream: "mash", direct: true },
    { from: "cooler", to: "ferm-1", stream: "mash", direct: true },
    { from: "yeast-1", to: "ferm-2", stream: "mash", direct: true },
    { from: "ferm-1", to: "scrubber", stream: "co2", direct: true, fromPort: "in" },
    { from: "ferm-2", to: "scrubber", stream: "co2", direct: true, fromPort: "in" },
    { from: "ferm-3", to: "beerwell", stream: "beer", direct: true },
    { from: "ferm-6", to: "beerwell", stream: "beer", direct: true },
    { from: "beerwell", to: "beercol", stream: "beer", direct: true },
    { from: "beercol", to: "rectifier", stream: "ethanol", direct: true },
    { from: "rectifier", to: "sieve-1", stream: "ethanol", direct: true },
    { from: "sieve-2", to: "condenser", stream: "ethanol", direct: true },
    { from: "condenser", to: "day-1", stream: "ethanol", direct: true },
    { from: "day-2", to: "tank-3", stream: "ethanol", direct: true },
    { from: "tank-4", to: "loading", stream: "ethanol", direct: true },
    { from: "beercol", to: "centrifuge", stream: "stillage", fromPort: "bottom" },
    { from: "centrifuge", to: "evap-1", stream: "stillage", direct: true },
    { from: "evap-4", to: "syrup", stream: "stillage", direct: true },
    { from: "syrup", to: "dryer", stream: "stillage", direct: true },
    { from: "dryer", to: "ddgs", stream: "stillage", direct: true },
    { from: "boiler", to: "dist-structure", stream: "steam" },
    { from: "boiler", to: "evap-2", stream: "steam" },
    { from: "boiler", to: "liq-1", stream: "steam" },
    { from: "cooling", to: "dist-structure", stream: "water" },
    { from: "cooling", to: "condenser", stream: "water" }
  ],

  // illustrative descriptions and specifications per kind of equipment
  catalog: {
    silo: { name: { es: "Silo de grano", en: "Grain silo" }, fn: { es: "Almacena el cereal antes de la molienda y asegura varios días de autonomía.", en: "Stores the grain before milling and secures several days of supply." }, specs: [[{ es: "Diámetro", en: "Diameter" }, "14 m"], [{ es: "Altura", en: "Height" }, "≈ 24 m"], [{ es: "Capacidad", en: "Capacity" }, "≈ 2.200 t"]] },
    receiving: { name: { es: "Recepción de camiones", en: "Truck receiving" }, fn: { es: "Báscula y tolva de descarga de camiones a granel.", en: "Weighbridge and pit for unloading bulk trucks." }, specs: [[{ es: "Bocas de descarga", en: "Unloading bays" }, "2"]] },
    elevator: { name: { es: "Elevador de cangilones", en: "Bucket elevator" }, fn: { es: "Sube el grano a los transportadores de llenado de silos.", en: "Lifts the grain to the silo-filling conveyors." }, specs: [[{ es: "Altura", en: "Height" }, "≈ 34 m"]] },
    conveyor: { name: { es: "Transportador cubierto", en: "Enclosed conveyor" }, fn: { es: "Lleva el grano entre el elevador, los silos y la molienda.", en: "Carries the grain between the elevator, the silos and the mill." }, specs: [] },
    mill: { name: { es: "Edificio de molienda", en: "Milling building" }, fn: { es: "Molinos de martillos que reducen el grano a harina.", en: "Hammer mills that grind the grain into flour." }, specs: [[{ es: "Molinos", en: "Mills" }, "3 + 1"]] },
    cyclone: { name: { es: "Ciclón de aspiración", en: "Dust cyclone" }, fn: { es: "Recoge el polvo del sistema de aspiración de la molienda.", en: "Collects the dust from the milling aspiration system." }, specs: [] },
    slurry: { name: { es: "Tanque de mezcla", en: "Slurry tank" }, fn: { es: "Mezcla la harina con agua de proceso y enzimas.", en: "Mixes the flour with process water and enzymes." }, specs: [[{ es: "Temperatura", en: "Temperature" }, "≈ 60 °C"]] },
    liq: { name: { es: "Tanque de licuefacción", en: "Liquefaction tank" }, fn: { es: "Mantiene el mosto a temperatura para que las enzimas conviertan el almidón.", en: "Holds the mash at temperature so the enzymes convert the starch." }, specs: [[{ es: "Temperatura", en: "Temperature" }, "≈ 85 °C"]] },
    cooler: { name: { es: "Enfriador de mosto", en: "Mash cooler" }, fn: { es: "Baja la temperatura del mosto antes de la fermentación.", en: "Lowers the mash temperature before fermentation." }, specs: [] },
    fermenter: { name: { es: "Fermentador", en: "Fermenter" }, fn: { es: "Las levaduras convierten los azúcares en etanol y CO₂.", en: "Yeast converts the sugars into ethanol and CO₂." }, specs: [[{ es: "Volumen", en: "Volume" }, "≈ 2.000 m³"], [{ es: "Ciclo", en: "Cycle" }, "≈ 50–60 h"], [{ es: "Temperatura", en: "Temperature" }, "≈ 32 °C"]] },
    yeast: { name: { es: "Propagación de levadura", en: "Yeast propagation" }, fn: { es: "Prepara el inóculo de levadura para cada fermentador.", en: "Prepares the yeast inoculum for each fermenter." }, specs: [] },
    beerwell: { name: { es: "Tanque pulmón (beer well)", en: "Beer well" }, fn: { es: "Acumula la cerveza fermentada y alimenta la destilación de forma continua.", en: "Holds the fermented beer and feeds distillation continuously." }, specs: [] },
    scrubber: { name: { es: "Lavador de CO₂", en: "CO₂ scrubber" }, fn: { es: "Recupera el etanol arrastrado por el CO₂ de fermentación.", en: "Recovers the ethanol carried by the fermentation CO₂." }, specs: [] },
    beercol: { name: { es: "Columna de cerveza", en: "Beer column" }, fn: { es: "Primera destilación: separa una mezcla de etanol y agua de las vinazas.", en: "First distillation: separates an ethanol-water mix from the stillage." }, specs: [[{ es: "Altura", en: "Height" }, "≈ 35 m"]] },
    rectifier: { name: { es: "Columna rectificadora", en: "Rectifier column" }, fn: { es: "Concentra el etanol hasta cerca del azeótropo.", en: "Concentrates the ethanol close to the azeotrope." }, specs: [[{ es: "Altura", en: "Height" }, "≈ 39 m"]] },
    stripper: { name: { es: "Columna de agotamiento", en: "Side stripper" }, fn: { es: "Recupera el etanol del fondo de la rectificadora.", en: "Recovers the ethanol from the rectifier bottoms." }, specs: [] },
    structure: { name: { es: "Estructura de destilación", en: "Distillation structure" }, fn: { es: "Plataformas con condensadores, rehervidores y bombas de la destilación.", en: "Platforms carrying the distillation condensers, reboilers and pumps." }, specs: [[{ es: "Niveles", en: "Levels" }, "4"]] },
    sieve: { name: { es: "Tamiz molecular", en: "Molecular sieve" }, fn: { es: "Retira el agua restante para obtener etanol anhidro.", en: "Removes the remaining water to produce anhydrous ethanol." }, specs: [[{ es: "Pureza de salida", en: "Outlet purity" }, "≥ 99,5 %"]] },
    condenser: { name: { es: "Condensador de producto", en: "Product condenser" }, fn: { es: "Condensa y enfría el etanol anhidro.", en: "Condenses and cools the anhydrous ethanol." }, specs: [] },
    day: { name: { es: "Tanque diario", en: "Day tank" }, fn: { es: "Recibe la producción del día antes de pasarla a almacenamiento.", en: "Receives the day's production before it goes to storage." }, specs: [] },
    tank: { name: { es: "Tanque de etanol", en: "Ethanol tank" }, fn: { es: "Almacena el etanol terminado.", en: "Stores the finished ethanol." }, specs: [[{ es: "Volumen", en: "Volume" }, "≈ 2.600 m³"]] },
    bund: { name: { es: "Cubeto de retención", en: "Containment bund" }, fn: { es: "Muro de contención alrededor de los tanques.", en: "Containment wall around the tanks." }, specs: [] },
    loading: { name: { es: "Cargadero de cisternas", en: "Tanker loading" }, fn: { es: "Puestos de carga con brazos de llenado.", en: "Loading bays with filling arms." }, specs: [[{ es: "Puestos", en: "Bays" }, "2"]] },
    truck: { name: { es: "Camión cisterna", en: "Road tanker" }, fn: { es: "Expedición del etanol por carretera.", en: "Dispatches the ethanol by road." }, specs: [] },
    centrifuge: { name: { es: "Centrífugas decantadoras", en: "Decanter centrifuges" }, fn: { es: "Separan los sólidos de las vinazas.", en: "Separate the solids from the stillage." }, specs: [[{ es: "Unidades", en: "Units" }, "3"]] },
    evap: { name: { es: "Evaporador", en: "Evaporator" }, fn: { es: "Concentra las vinazas finas en jarabe.", en: "Concentrates the thin stillage into syrup." }, specs: [] },
    syrup: { name: { es: "Tanque de jarabe", en: "Syrup tank" }, fn: { es: "Acumula el jarabe que se mezcla con los sólidos antes del secado.", en: "Holds the syrup that is blended with the solids before drying." }, specs: [] },
    dryer: { name: { es: "Secadero rotativo", en: "Rotary dryer" }, fn: { es: "Seca la mezcla para producir DDGS.", en: "Dries the blend to produce DDGS." }, specs: [[{ es: "Longitud", en: "Length" }, "≈ 26 m"]] },
    ddgs: { name: { es: "Almacén de DDGS", en: "DDGS store" }, fn: { es: "Nave de almacenamiento y carga del pienso DDGS.", en: "Storage and loading hall for the DDGS feed." }, specs: [] },
    boiler: { name: { es: "Sala de calderas", en: "Boiler house" }, fn: { es: "Produce el vapor para licuefacción, destilación y evaporación.", en: "Produces steam for liquefaction, distillation and evaporation." }, specs: [] },
    stack: { name: { es: "Chimenea", en: "Stack" }, fn: { es: "Evacuación de gases de combustión.", en: "Exhausts the combustion gases." }, specs: [[{ es: "Altura", en: "Height" }, "≈ 39 m"]] },
    cooling: { name: { es: "Torre de refrigeración", en: "Cooling tower" }, fn: { es: "Enfría el agua de los condensadores y de la fermentación.", en: "Cools the water for the condensers and fermentation." }, specs: [[{ es: "Celdas", en: "Cells" }, "3"]] },
    water: { name: { es: "Tratamiento de agua", en: "Water treatment" }, fn: { es: "Prepara el agua de proceso y de calderas.", en: "Prepares process and boiler water." }, specs: [] },
    substation: { name: { es: "Subestación eléctrica", en: "Electrical substation" }, fn: { es: "Transformación y distribución de energía eléctrica.", en: "Power transformation and distribution." }, specs: [] },
    admin: { name: { es: "Oficinas y sala de control", en: "Offices and control room" }, fn: { es: "Control de la planta, laboratorio y oficinas.", en: "Plant control, laboratory and offices." }, specs: [] },
    rack: { name: { es: "Rack de tuberías", en: "Pipe rack" }, fn: { es: "Estructura que soporta las tuberías entre áreas.", en: "Structure carrying the pipes between areas." }, specs: [[{ es: "Longitud", en: "Length" }, "≈ 232 m"]] },
    pump: { name: { es: "Grupo de bombeo", en: "Pump set" }, fn: { es: "Bombas de transferencia entre áreas.", en: "Transfer pumps between areas." }, specs: [] }
  },

  // ---------------------------------------------------------------- financial model (illustrative)
  finance: {
    inputs: [
      { id: "capacity", group: "plant", min: 20, max: 300, step: 10, def: 100, unit: { es: "M L/año", en: "M L/year" }, label: { es: "Capacidad de etanol", en: "Ethanol capacity" } },
      { id: "days", group: "plant", min: 300, max: 360, step: 5, def: 345, unit: { es: "días", en: "days" }, label: { es: "Días de operación", en: "Operating days" } },
      { id: "yield", group: "plant", min: 360, max: 430, step: 5, def: 400, unit: { es: "L/t", en: "L/t" }, label: { es: "Rendimiento de etanol", en: "Ethanol yield" } },
      { id: "grainPrice", group: "market", min: 150, max: 320, step: 5, def: 220, unit: { es: "€/t", en: "€/t" }, label: { es: "Precio del cereal", en: "Grain price" } },
      { id: "ethanolPrice", group: "market", min: 0.5, max: 1.1, step: 0.01, def: 0.75, unit: { es: "€/L", en: "€/L" }, label: { es: "Precio del etanol", en: "Ethanol price" } },
      { id: "ddgsPrice", group: "market", min: 150, max: 320, step: 5, def: 230, unit: { es: "€/t", en: "€/t" }, label: { es: "Precio del DDGS", en: "DDGS price" } },
      { id: "gasPrice", group: "market", min: 20, max: 90, step: 1, def: 40, unit: { es: "€/MWh", en: "€/MWh" }, label: { es: "Precio del gas", en: "Gas price" } },
      { id: "capexPerL", group: "invest", min: 0.6, max: 1.6, step: 0.05, def: 0.95, unit: { es: "€/L de capacidad", en: "€/L of capacity" }, label: { es: "Inversión unitaria", en: "Unit investment" } },
      { id: "fixed", group: "invest", min: 4, max: 20, step: 0.5, def: 9, unit: { es: "M€/año", en: "M€/year" }, label: { es: "Costes fijos (personal, mantenimiento)", en: "Fixed costs (staff, maintenance)" } }
    ],
    // constants of the illustrative model
    constants: { ddgsYield: 0.31, gasUse: 1.9, elecUse: 0.19, elecPrice: 120, chemicals: 28, co2PerL: 0.754 },
    capexSplit: [
      ["grain", 0.08], ["milling", 0.04], ["liquefaction", 0.05], ["fermentation", 0.18], ["distillation", 0.15],
      ["dehydration", 0.05], ["storage", 0.07], ["coproducts", 0.15], ["utilities", 0.13], ["civil", 0.10]
    ],
    civil: { es: "Obra civil y edificios", en: "Civil works and buildings" },
    compute(v, k) {
      const L = v.capacity * 1e6, m3 = v.capacity * 1e3;
      const grain = L / v.yield, ddgs = grain * k.ddgsYield, co2 = (L * k.co2PerL) / 1000;
      const revEth = L * v.ethanolPrice, revDdgs = ddgs * v.ddgsPrice, revenue = revEth + revDdgs;
      const feed = grain * v.grainPrice;
      const energy = m3 * (k.gasUse * v.gasPrice + k.elecUse * k.elecPrice);
      const chem = m3 * k.chemicals, fixed = v.fixed * 1e6;
      const opex = feed + energy + chem + fixed, ebitda = revenue - opex;
      const capex = L * v.capexPerL;
      const months = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const stopDays = 365 - v.days;      // planned shutdown in August
      const daily = m3 / v.days;
      const monthly = months.map((d, i) => Math.max(0, d - (i === 7 ? Math.min(31, stopDays) : 0)) * daily);
      return {
        revenue, revEth, revDdgs, opex, ebitda, capex,
        margin: revenue ? ebitda / revenue : 0,
        payback: ebitda > 0 ? capex / ebitda : null,
        costPerL: opex / L,
        opexSplit: [["feed", feed], ["energy", energy], ["chem", chem], ["fixed", fixed]],
        daily: { ethanol: daily, grain: grain / v.days, ddgs: ddgs / v.days, co2: co2 / v.days },
        annual: { ethanol: m3, grain, ddgs, co2 },
        monthly
      };
    }
  }
};
