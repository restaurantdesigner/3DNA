// Equipment cost & energy calculations — run: node prototipos/centro-deportivo/tests/presupuesto.test.mjs
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { summarize, toRows, dashboard, groupOf, GROUPS } from "../presupuesto.js";

const dir = fileURLToPath(new URL("..", import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(dir + f, "utf8"));
const spec = read("equipamiento-especificaciones.json");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error("FAIL", m); process.exitCode = 1; } else console.log("ok  ", m); };
const near = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-6;
const N = spec.items.length;

// ---------- data integrity ----------
ok(N === 55, "inventory has 55 equipment lines");
ok(new Set(spec.items.map((i) => i.id)).size === N, "equipment ids are unique");
ok(spec.items.every((i) => i.estimate && Number.isFinite(i.estimate.unitPrice) && i.estimate.basis && i.estimate.date), "every line has an estimated price with basis and date");
ok(spec.items.filter((i) => i.powerStatus === "inherent").every((i) => i.ratedKw === 0 && !("ratedKw" in i.estimate)), "non-powered items: 0 kW, no power estimate");
ok(spec.items.filter((i) => i.powerStatus !== "inherent").every((i) => Number.isFinite(i.estimate.ratedKw)), "powered / unconfirmed items: power estimate present");
ok(spec.items.every((i) => i.unitPrice === null && i.ratedKw !== undefined), "no documented price was overwritten (all prices remain undocumented in the data)");

// ---------- given starting assumptions ----------
const A = { "eq-cinta": [3800, 2.2], "eq-eliptica": [2900, 0.15], "eq-bicicleta": [1800, 0.10], "eq-jalon": [2600, 0], "eq-prensa": [2600, 0], "eq-poleas": [2600, 0],
  "eq-rack": [1700, 0], "eq-banco": [450, 0], "eq-mancuernas": [3500, 0], "eq-led": [120, 0.04], "eq-led-calida": [120, 0.04] };
Object.entries(A).forEach(([id, [p, kw]]) => {
  const it = spec.items.find((i) => i.id === id);
  ok(it.estimate.unitPrice === p && (it.estimate.ratedKw ?? it.ratedKw) === kw, `${id}: ${p} € / ${kw} kW (supuesto de partida)`);
});
ok(spec.items.find((i) => i.id === "fx-sauna").estimate.ratedKw === 9, "sauna heater 9 kW (subject to cabin volume)");

// ---------- gym lighting: 3 lines × 5 luminaires ----------
{
  const gymData = read("concepto-gimnasio.json"), led = spec.items.find((i) => i.id === "eq-led");
  const lines = gymData.interior.ledLines.length, per = gymData.interior.ledGroups.luminairesPerLine;
  ok(lines === 3 && per === 5 && led.qty === lines * per, "eq-led quantity = 3 lines × 5 luminaires = 15 (matches the 3D groups)");
  ok(led.group && led.group.lines === 3 && led.group.perLine === 5 && /preliminar/i.test(led.group.status), "lighting group marked preliminary, subject to lighting design");
  ok(JSON.stringify(led.objects) === '["gym-led-lines"]', "stable object id kept for the lighting groups");
  const L = summarize(spec, { scenario: "estimate" }).lines.find((x) => x.item.id === "eq-led");
  ok(near(L.total, 1800) && near(L.installedKw, 0.6) && near(L.kwh, 15 * 0.04 * 4000 * 1.0), "lighting: 1.800 € sin IVA · 0,60 kW · 2.400 kWh/año");
}

// ---------- every line, estimate scenario, against an independent calculation ----------
let S = summarize(spec, { scenario: "estimate" });
const price = spec.energy.estimate.priceEurKwh, sim = spec.energy.estimate.simultaneity;
let expCost = 0, expKw = 0, expKwh = 0;
spec.items.forEach((it) => {
  const L = S.lines.find((x) => x.item.id === it.id), e = it.estimate;
  const kw = it.powerStatus === "inherent" ? 0 : e.ratedKw;
  const cost = it.qty * e.unitPrice, inst = it.qty * kw, kwh = kw === 0 ? 0 : it.qty * kw * e.hoursYear * e.utilization;
  expCost += cost; expKw += inst; expKwh += kwh;
  ok(near(L.total, cost) && near(L.installedKw, inst) && near(L.kwh, kwh) && near(L.energyCost, kwh * price),
    `${it.id.padEnd(18)} ${String(it.qty).padStart(2)} × ${String(e.unitPrice).padStart(6)} € = ${String(cost).padStart(6)} € · ${inst.toFixed(2)} kW · ${kwh.toFixed(0)} kWh`);
  if (kw === 0) ok(L.kwh === 0 && L.r.hoursYear.s === "na", `${it.id}: no consumption assigned to non-powered equipment`);
});
ok(near(S.total.cost, expCost) && S.total.costPending === 0, `total equipment cost ${expCost} € (sin IVA)`);
ok(near(S.total.vat, expCost * 0.21), `IVA 21 % shown separately: ${(expCost * 0.21).toFixed(2)} €`);
ok(near(S.total.installedKw, expKw), `installed power ${expKw.toFixed(2)} kW`);
ok(near(S.total.kwh, expKwh), `annual consumption ${expKwh.toFixed(0)} kWh/año`);
ok(near(S.total.energyCost, expKwh * price), `annual energy cost ${(expKwh * price).toFixed(2)} €/año at ${price} €/kWh`);
ok(near(S.total.demandKw, expKw * sim) && S.total.demandKw < S.total.installedKw, `estimated demand ${(expKw * sim).toFixed(2)} kW (simultaneity ${sim}, peak only)`);
ok(S.total.kwh < S.total.installedKw * 8760, "utilisation factor, not simultaneity, drives kWh");
const roomSum = [...S.byRoom.values()].reduce((s, r) => s + r.cost, 0), catSum = [...S.byCategory.values()].reduce((s, r) => s + r.cost, 0);
const roomKwh = [...S.byRoom.values()].reduce((s, r) => s + r.kwh, 0);
ok(near(roomSum, S.total.cost) && near(catSum, S.total.cost) && near(roomKwh, S.total.kwh), "room and category subtotals add up (no double counting)");
ok(new Set(spec.items.flatMap((i) => i.objects)).size === spec.items.flatMap((i) => i.objects).length, "each 3D object is counted in exactly one line");

// ---------- building services: separate, no duplicates ----------
ok(spec.services.length === 6 && spec.services.every((s) => s.category === "Instalaciones — estimación preliminar"), "6 building-service placeholders in their own category");
ok(S.lines.every((L) => !L.item.id.startsWith("svc-")), "services are not part of the 55-line equipment total");
const sauna = S.services.find((x) => x.item.id === "svc-sauna");
ok(sauna.includedIn === "fx-sauna" && S.servicesTotal.n === 5, "sauna heating not duplicated (already in fx-sauna)");
ok(/eq-led/.test(spec.services.find((x) => x.id === "svc-iluminacion").note), "general lighting excludes the gym luminaires already counted");

// ---------- verified-only scenario ----------
S = summarize(spec, { scenario: "verified" });
ok(S.total.cost === 0 && S.total.costPending === N, "verified-only: all prices pending (nothing documented)");
ok(S.lines.filter((L) => L.item.powerStatus === "inherent").every((L) => L.kwh === 0), "verified-only: inherent items stay 0 kWh");
ok(S.energy.price.s === "pending" && S.total.demandKw === null, "verified-only: energy price & simultaneity pending");

// ---------- user edits are never overwritten ----------
const edits = { "eq-cinta": { unitPrice: 5000, qty: 3, hoursYear: 1000, utilization: 0.5 }, _global: { priceEurKwh: 0.2, simultaneity: 0.8 } };
S = summarize(spec, { scenario: "estimate", edits });
const c = S.lines.find((L) => L.item.id === "eq-cinta");
ok(near(c.total, 15000) && c.r.unitPrice.s === "edited" && c.r.qty.s === "edited", "edited price and quantity win over estimates");
ok(near(c.kwh, 3 * 2.2 * 1000 * 0.5) && near(c.energyCost, c.kwh * 0.2) && c.r.ratedKw.s === "reference", "edited hours / utilisation / price; untouched kW keeps its estimate");
ok(near(S.total.demandKw, S.total.installedKw * 0.8), "edited simultaneity only changes demand");
S = summarize(spec, { scenario: "verified", edits });
ok(near(S.lines.find((L) => L.item.id === "eq-cinta").total, 15000), "edits also apply in verified-only view");

// ---------- dashboard: spaces, categories, summary ----------
{
  const rooms = read("plan-model.json").rooms.map((r) => ({ id: r.id, name: r.name }));
  const D = dashboard(spec, { scenario: "estimate" }, rooms);
  const T = D.summary;
  ok(D.byRoom.length === rooms.length, `every space listed (${rooms.length}), also those without equipment`);
  ok(D.byRoom.some((r) => r.n === 0 && r.cost === 0), "spaces without equipment shown at 0 €");
  ok(spec.items.every((i) => rooms.some((r) => r.id === i.room)), "every equipment line belongs to a listed space");
  ok(D.byRoom.every((r, k) => k === 0 || D.byRoom[k - 1].cost >= r.cost), "spaces sorted by cost, highest first");
  ok(near(D.byRoom.reduce((s, r) => s + r.cost, 0), T.cost) && near(D.byRoom.reduce((s, r) => s + r.kwh, 0), T.kwh) && near(D.byRoom.reduce((s, r) => s + r.installedKw, 0), T.installedKw), "space subtotals add up to the project totals (cost, kW, kWh)");
  ok(near(D.byRoom.reduce((s, r) => s + r.pct, 0), 1), "space percentages add up to 100 %");
  const roomCheck = (id) => spec.items.filter((i) => i.room === id).reduce((s, i) => s + i.qty * i.estimate.unitPrice, 0);
  ok(D.byRoom.every((r) => near(r.cost, roomCheck(r.id))), "each space subtotal = Σ quantity × price of its lines");
  ok(near(D.byRoom.find((r) => r.id === "sala").cost, roomCheck("sala")) && D.byRoom[0].id === "sala", `Sala multiusos is the largest space: ${roomCheck("sala")} €`);
  const lineIds = D.byGroup.flatMap((g) => g.lines.map((L) => L.item.id));
  ok(lineIds.length === N && new Set(lineIds).size === N, "every line in exactly one category (no double counting)");
  ok(spec.items.every((i) => GROUPS.some((g) => g.id === groupOf(i))), "every line maps to a defined category");
  ok(near(D.byGroup.reduce((s, g) => s + g.cost, 0), T.cost) && near(D.byGroup.reduce((s, g) => s + g.kwh, 0), T.kwh), "category subtotals add up to the project totals");
  ok(D.byGroup.every((g, k) => k === 0 || D.byGroup[k - 1].cost >= g.cost), "categories sorted by cost, highest first");
  const ilum = D.byGroup.find((g) => g.id === "iluminacion");
  ok(near(ilum.cost, 1920) && near(ilum.installedKw, 0.64), "Iluminación: 15 luminarias (1.800 €) + línea cálida (120 €) = 1.920 € · 0,64 kW");
  ok(D.byGroup.find((g) => g.id === "wellness").lines.every((L) => L.item.room === "sauna"), "Wellness y SPA = elements of the spa room");
  ok(near(T.vat, T.cost * 0.21) && near(T.costWithVat, T.cost * 1.21), "summary: IVA 21 % and total including IVA");
  ok(near(T.demandKw, T.installedKw * spec.energy.estimate.simultaneity) && near(T.energyCost, T.kwh * spec.energy.estimate.priceEurKwh), "summary: demand and electricity cost derived from the assumptions");
  const D2 = dashboard(spec, { scenario: "estimate", edits: { "eq-cinta": { qty: 2 }, _global: { priceEurKwh: 0.25 } } }, rooms);
  ok(near(D2.summary.cost, T.cost - 2 * 3800) && near(D2.byRoom.find((r) => r.id === "sala").cost, roomCheck("sala") - 7600) && near(D2.summary.energyCost, D2.summary.kwh * 0.25), "user edits flow into summary, spaces and electricity cost (nothing hard-coded)");
  const D3 = dashboard(spec, { scenario: "verified" }, rooms);
  ok(D3.summary.cost === 0 && D3.byRoom.every((r) => r.pct === null), "verified-only: no percentages when nothing is priced");
}

// ---------- export rows ----------
const rows = toRows(spec, { scenario: "estimate" });
ok(rows.length === N + spec.services.length && rows.every((r) => r.grupo) && rows[0].estimacion_base && rows[0].estimacion_fecha, "export rows include group, basis and date");

// ---------- links to the 3D objects ----------
const furn = read("plan-furniture.json"), gym = read("concepto-gimnasio.json");
const ids = new Set([...furn.items, ...gym.items, ...gym.interiorItems].map((i) => i.id).concat(["gym-led-lines", "gym-led-cove"]));
const missing = spec.items.flatMap((i) => i.objects).filter((o) => !ids.has(o));
ok(missing.length === 0, "every specification object id exists in the model " + missing.join(","));
const linked = new Set(spec.items.flatMap((i) => i.objects));
ok([...ids].every((i) => linked.has(i)), "every 3D equipment object has a specification line");
console.log(fails ? `\n${fails} FAILED` : "\nall checks passed");
