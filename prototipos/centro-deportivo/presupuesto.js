/*
 * Equipment cost & energy calculations (Centro Deportivo prototype) — pure functions, no DOM.
 * Data: equipamiento-especificaciones.json (one line per equipment item, linked
 * to the 3D objects by stable ids; building services in a separate list).
 *
 * Scenarios:
 *   estimate   (default) documented values + preliminary estimates ("Estimado — referencia orientativa")
 *   verified   documented values only; everything else "Pendiente de definir"
 * User edits always win over both and are never overwritten.
 *
 * Every value carries a status so the interface can badge it:
 *   verified      documented value
 *   inherent      0 kW because the element has no electrical supply by nature
 *   estimated     preliminary value from the project data (e.g. a quantity interpreted on the plan)
 *   concept       quantity from the 3DNA concept (not part of the architectural project)
 *   reference     "Estimado — referencia orientativa": preliminary estimate with basis and date
 *   edited        value typed by the user (preliminary, editable)
 *   na            not applicable (hours / utilisation of a 0 kW item)
 *   pending       "Pendiente de definir"
 *
 *   total equipment cost  = quantity × unit price (EUR, VAT excluded)
 *   installed power (kW)  = quantity × rated power
 *   consumption (kWh/año) = quantity × rated kW × hours × utilisation factor   (energy)
 *   energy cost (EUR/año) = kWh × energy price
 *   estimated demand (kW) = installed power × simultaneity factor              (peak power only)
 * The utilisation factor (energy) and the simultaneity factor (peak demand) are independent.
 */

export const FIELDS = ["manufacturer", "model", "qty", "unitPrice", "ratedKw", "hoursYear", "utilization"];

// status of a value present in the data file (documented unless stated otherwise)
const fieldStatus = (item, f) => {
  if (f === "qty") return item.qtyStatus || "estimated";
  if (f === "ratedKw" && item.powerStatus === "inherent") return "inherent";
  if (f === "hoursYear" || f === "utilization") return "estimated";
  return "verified";
};

const has = (v) => v !== null && v !== undefined && v !== "" && !(typeof v === "number" && Number.isNaN(v));

/** Effective value + status of every field of a line. */
export function resolve(item, { scenario = "estimate", edits = {} } = {}) {
  const e = edits[item.id] || {};
  const est = scenario === "estimate" ? item.estimate || {} : {};
  const out = {};
  FIELDS.forEach((f) => {
    if (has(e[f])) out[f] = { v: e[f], s: "edited" };
    else if (has(item[f])) out[f] = { v: item[f], s: fieldStatus(item, f) };
    else if (has(est[f])) out[f] = { v: est[f], s: "reference" };
    else out[f] = { v: null, s: "pending" };
  });
  // hours / utilisation do not apply to an item without electrical demand (unless the user typed them)
  if (out.ratedKw.v === 0) ["hoursYear", "utilization"].forEach((f) => { if (out[f].s !== "edited") out[f] = { v: null, s: "na" }; });
  return out;
}

/** Global energy parameters (price, simultaneity). */
export function energyParams(spec, { scenario = "estimate", edits = {} } = {}) {
  const g = edits._global || {};
  const one = (k) => {
    if (has(g[k])) return { v: g[k], s: "edited" };
    if (has(spec.energy[k])) return { v: spec.energy[k], s: "verified" };
    if (scenario === "estimate" && has(spec.energy.estimate?.[k])) return { v: spec.energy.estimate[k], s: "reference" };
    return { v: null, s: "pending" };
  };
  return { price: one("priceEurKwh"), simultaneity: one("simultaneity") };
}

/** All computed figures of one line. null = cannot be computed (a value is pending). */
export function computeLine(item, ctx, energy) {
  const r = resolve(item, ctx);
  const q = r.qty.v, up = r.unitPrice.v, kw = r.ratedKw.v, h = r.hoursYear.v, u = r.utilization.v;
  const total = has(q) && has(up) ? q * up : null;
  const installedKw = has(q) && has(kw) ? q * kw : null;
  let kwh = null;
  if (kw === 0) kwh = 0;                                      // no electrical demand
  else if (has(q) && has(kw) && has(h) && has(u)) kwh = q * kw * h * u;
  const price = energy ? energy.price.v : null;
  const energyCost = kwh === 0 ? 0 : has(kwh) && has(price) ? kwh * price : null;
  const used = [r.qty, r.unitPrice, r.ratedKw, r.hoursYear, r.utilization];
  return {
    item, r, total, installedKw, kwh, energyCost,
    reference: used.some((x) => x.s === "reference") || (kwh > 0 && !!energy && energy.price.s === "reference"),
    edited: used.some((x) => x.s === "edited"),
    pendingPrice: total === null,
    pendingPower: installedKw === null,
  };
}

const blank = () => ({ n: 0, cost: 0, costPending: 0, installedKw: 0, kwPending: 0, kwh: 0, kwhPending: 0, energyCost: 0, eurPending: 0, reference: false });
function add(acc, L) {
  acc.n++;
  if (L.total === null) acc.costPending++; else acc.cost += L.total;
  if (L.installedKw === null) acc.kwPending++; else acc.installedKw += L.installedKw;
  if (L.kwh === null) acc.kwhPending++; else acc.kwh += L.kwh;
  if (L.energyCost === null) acc.eurPending++; else acc.energyCost += L.energyCost;
  acc.reference = acc.reference || L.reference;
  return acc;
}
function finish(acc, spec, energy) {
  const sim = energy.simultaneity.v;
  acc.demandKw = has(sim) ? acc.installedKw * sim : null;
  acc.vat = spec.pricing.vat === "excluded" ? acc.cost * spec.pricing.vatRate : 0;
  return acc;
}

/**
 * Equipment lines + totals (whole model, by room, by category) and, separately,
 * the optional building-services estimate. Services marked includedIn are already
 * counted in an equipment line and are never added again.
 */
export function summarize(spec, ctx) {
  const energy = energyParams(spec, ctx);
  const lines = spec.items.map((it) => computeLine(it, ctx, energy));
  const byRoom = new Map(), byCategory = new Map();
  const total = blank();
  lines.forEach((L) => {
    add(total, L);
    add(byRoom.get(L.item.room) || byRoom.set(L.item.room, blank()).get(L.item.room), L);
    add(byCategory.get(L.item.category) || byCategory.set(L.item.category, blank()).get(L.item.category), L);
  });
  finish(total, spec, energy);
  const services = (spec.services || []).map((it) => ({ ...computeLine(it, ctx, energy), includedIn: it.includedIn || null }));
  const servicesTotal = blank();
  services.filter((S) => !S.includedIn).forEach((S) => add(servicesTotal, S));
  finish(servicesTotal, spec, energy);
  return { energy, lines, total, byRoom, byCategory, services, servicesTotal };
}

// ---------------------------------------------------------------------------
// dashboard: budget by space and by group (each line belongs to exactly one group)
// ---------------------------------------------------------------------------
export const GROUPS = [
  { id: "fitness", name: "Equipamiento fitness", desc: "Cardio, fuerza, peso libre y funcional" },
  { id: "wellness", name: "Wellness y SPA", desc: "Sauna, vaso de hidromasaje y elementos del recinto spa" },
  { id: "vestuarios", name: "Vestuarios y aseos", desc: "Sanitarios, duchas, encimeras, bancos y taquillas" },
  { id: "recepcion", name: "Recepción y control", desc: "Mostrador, puesto informático y mampara de acceso" },
  { id: "iluminacion", name: "Iluminación", desc: "Luminarias del gimnasio (no incluye el alumbrado general del edificio)" },
  { id: "sanitario", name: "Equipamiento sanitario", desc: "Botiquín" },
  { id: "acabados", name: "Acabados interiores", desc: "Espejos del gimnasio" },
  { id: "mobiliario", name: "Mobiliario", desc: "Almacenaje y mobiliario de la sala" },
  { id: "tecnicos", name: "Equipos técnicos", desc: "Depósito y cuadro dibujados en el cuarto de instalaciones (no son las instalaciones del edificio)" },
];
const FITNESS = new Set(["Cardio", "Fuerza (máquinas)", "Peso libre", "Funcional"]);
/** Dashboard group of a line, from its data category (and room where the category is generic). */
export function groupOf(item) {
  const c = item.category, r = item.room;
  if (c === "Iluminación") return "iluminacion";
  if (c === "Spa y bienestar" || r === "sauna") return "wellness";
  if (FITNESS.has(c)) return "fitness";
  if (["vestM", "vestF", "aseoM", "aseoF"].includes(r)) return "vestuarios";
  if (c === "Control y TIC" || r === "control" || r === "acceso") return "recepcion";
  if (c === "Equipamiento sanitario" || r === "botiquin") return "sanitario";
  if (c === "Instalaciones") return "tecnicos";
  if (c === "Acabados interiores") return "acabados";
  return "mobiliario";
}

/**
 * Everything the dashboard shows, derived from the specification + scenario + user edits.
 * rooms: [{ id, name }] — every room is listed, also those without equipment.
 */
export function dashboard(spec, ctx, rooms) {
  const S = summarize(spec, ctx);
  const T = S.total;
  const pct = (v) => (T.cost > 0 ? v / T.cost : null);
  const summary = {
    n: T.n, cost: T.cost, vat: T.vat, costWithVat: T.cost + T.vat, vatRate: spec.pricing.vatRate,
    installedKw: T.installedKw, demandKw: T.demandKw, kwh: T.kwh, energyCost: T.energyCost,
    pending: { cost: T.costPending, kw: T.kwPending, kwh: T.kwhPending, eur: T.eurPending },
  };
  const byRoom = rooms.map((r) => {
    const a = S.byRoom.get(r.id) || blank();
    return { id: r.id, name: r.name, ...a, pct: pct(a.cost) };
  }).sort((a, b) => b.cost - a.cost || b.n - a.n || a.name.localeCompare(b.name, "es"));
  const byGroup = GROUPS.map((g) => {
    const acc = blank(), lines = S.lines.filter((L) => groupOf(L.item) === g.id);
    lines.forEach((L) => add(acc, L));
    return { ...g, ...acc, pct: pct(acc.cost), categories: [...new Set(lines.map((L) => L.item.category))], lines };
  }).filter((g) => g.n > 0).sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name, "es"));
  return { S, summary, byRoom, byGroup };
}

/** Flat rows for a future CSV / Excel / PDF export (labels in Spanish, numbers unformatted). */
export function toRows(spec, ctx, roomName = (id) => id) {
  const { lines, services } = summarize(spec, ctx);
  return [...lines.map((L) => ["equipamiento", L]), ...services.map((L) => ["instalaciones", L])].map(([grupo, L]) => ({
    grupo, id: L.item.id, objetos3d: L.item.objects.join(" "), equipo: L.item.name, categoria: L.item.category,
    recinto: roomName(L.item.room), zona: L.item.zone || "",
    fabricante: L.r.manufacturer.v ?? "Pendiente de definir", modelo: L.r.model.v ?? "Pendiente de definir",
    cantidad: L.r.qty.v, precio_unitario_eur_sin_iva: L.r.unitPrice.v, total_eur_sin_iva: L.total,
    potencia_nominal_kw: L.r.ratedKw.v, potencia_instalada_kw: L.installedKw,
    horas_ano: L.r.hoursYear.v, factor_uso: L.r.utilization.v, consumo_kwh_ano: L.kwh, coste_energia_eur_ano: L.energyCost,
    estado_cantidad: L.r.qty.s, estado_precio: L.r.unitPrice.s, estado_potencia: L.r.ratedKw.s,
    estimacion_base: L.item.estimate?.basis ?? "", estimacion_fecha: L.item.estimate?.date ?? "",
    incluido_en: L.includedIn || "", fuente: L.item.source,
  }));
}
