// Prints the Base Case of the ethanol case study as JSON, computed by the same model the dashboard uses
// (assets/js/industrial/factories/ethanol.js), so the landing page never hardcodes financial results.
// Called synchronously from scripts/industrial-page.js at build time.
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets/js/industrial/factories/ethanol.js");
const f = (await import(pathToFileURL(file).href)).default;
const F = f.finance, base = F.presets.find((p) => p.id === "base") || { v: {} };
const v = { ...Object.fromEntries(F.inputs.map((i) => [i.id, i.def])), ...base.v };
const r = F.compute(v);
process.stdout.write(JSON.stringify({
  years: F.years || 10, capex: r.capex, revenue: r.revenue, opex: r.opex, ebitda: r.ebitda, margin: r.margin,
  payback: r.payback, ebitdaToCapex: r.ebitdaToCapex, costPerL: r.costPerL, revEth: r.revEth, revDg: r.revDg,
  cumEbitda: r.cumEbitda, cumulative: r.cumulative, note: F.note
}));
