// Pre-renders the Base Case investment overview of the ethanol case study, computed by the same model the
// dashboard uses (assets/js/industrial/factories/ethanol.js) and drawn by the same view module the browser uses
// (assets/js/industrial/overview-view.js), so the landing page never hardcodes financial results.
// usage: node industrial-finance.mjs '<overview i18n JSON>'  → prints {kpis, chart, pay, scenario} as JSON
// Called synchronously from scripts/industrial-page.js at build time.
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets/js/industrial");
const f = (await import(pathToFileURL(path.join(dir, "factories/ethanol.js")).href)).default;
const view = await import(pathToFileURL(path.join(dir, "overview-view.js")).href);
const o = JSON.parse(process.argv[2] || "{}");
const F = f.finance, base = F.presets.find((p) => p.id === "base") || { v: {} };
const r = F.compute({ ...Object.fromEntries(F.inputs.map((i) => [i.id, i.def])), ...base.v });
process.stdout.write(JSON.stringify({ capex: view.M(r.capex), kpis: view.kpisHtml(r, o), chart: view.chartHtml(r, o), pay: view.payHtml(r, o), scenario: (o.scenarios && o.scenarios.base) || base.name }));
