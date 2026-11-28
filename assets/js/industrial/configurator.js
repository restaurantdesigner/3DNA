/*
 * 3DNA Digital Twin — Configuration tab: Plant Configuration Calculator (conceptual, CAD).
 *   readConfig()                 → { inputs, lib, active } from the page URL (?cfg=…)
 *   linkFinance(fin, R)          → the factory finance model with its defaults taken from a configuration
 *   mountConfigurator(ctx)       → renders the tab; live recalculation; "Update 3D model" regenerates the plant
 * The 3D model is regenerated from the configuration on load (the whole twin — equipment, connections, networks —
 * is rebuilt from the configured factory), so every existing feature keeps working on the configured plant.
 */
import { INPUTS, DEFAULTS, FEEDSTOCKS, LIBRARY, CAPEX_FACTORS, ENGINEERING, CONTINGENCY, SCALE, calculate, applyConfig, validateLayout } from "./factories/ethanol-config.js?v=cfg1";

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const dec = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))));
const STORE = "tw-cfg-compare";

export function readConfig() {
  try {
    const q = new URLSearchParams(location.search).get("cfg");
    if (q) { const o = dec(q); return { inputs: { ...DEFAULTS, ...(o.i || {}) }, lib: o.l || {}, active: true }; }
  } catch (e) { console.warn("configuration ignored", e); }
  return { inputs: { ...DEFAULTS }, lib: {}, active: false };
}
export const configure = (F, cfg) => {
  const R = calculate(cfg.inputs, cfg.lib, F);
  const { F: F2, changed } = applyConfig(F, R);
  return { R, F: F2, changed, flags: validateLayout(F2, changed) };
};
// the Investment tab starts from the configured plant: capacity, CAPEX per litre, staff and scale-adjusted prices
export function linkFinance(fin, R) {
  const v = R.values;
  return { ...fin, linked: true, inputs: fin.inputs.map((i) => {
    if (!(i.id in v)) return i;
    const def = +(+v[i.id]).toFixed(i.id === "capexPerL" || i.id === "ethanolPrice" ? 3 : i.step < 1 ? 1 : 0);
    return { ...i, def, min: Math.min(i.min, def), max: Math.max(i.max, def) };
  }) };
}
export const stageForKind = (R, kind) => R.stages.find((s) => s.kinds.includes(kind));

export function mountConfigurator({ pane, F, cfg, applied, twin, money, num, root, onWide }) {
  let inputs = { ...cfg.inputs }, lib = JSON.parse(JSON.stringify(cfg.lib || {}));
  const fmt = (v, d = 0) => num(v, d);
  const pct = (v) => (isFinite(v) ? `${fmt(v * 100, 0)} %` : "—");
  const appliedKey = JSON.stringify({ i: cfg.inputs, l: cfg.lib });
  const tagEl = (k) => `<em class="tw-tag tw-tag--${k}">${k === "v" ? "Public figure" : k === "b" ? "Benchmark" : "Assumption"}</em>`;
  let compare = []; try { compare = JSON.parse(localStorage.getItem(STORE) || "[]"); } catch {}

  const field = (i) => {
    if (i.type === "select") {
      const opts = i.id === "feedstock" ? Object.entries(FEEDSTOCKS).map(([k, f]) => [k, f.name]) : i.options;
      return `<label class="tw-cfg__sel"><span>${esc(i.label)}</span><select data-ci="${i.id}">${opts.map(([k, n]) => `<option value="${k}"${inputs[i.id] === k ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
    }
    return `<label class="tw-range"><span class="tw-range__top"><span>${esc(i.label)}</span><output data-co="${i.id}"></output></span><input type="range" min="${i.min}" max="${i.max}" step="${i.step}" value="${inputs[i.id]}" data-ci="${i.id}" aria-label="${esc(i.label)}"></label>`;
  };
  const groups = [["prod", "Production target"], ["process", "Process parameters"], ["design", "Design basis"]];
  pane.innerHTML = `<div class="tw-cfg">
    <p class="tw-cfg__intro">Size a conceptual ethanol plant for a target capacity. The engine converts the annual target into hourly and daily flows, sizes every production stage from the editable equipment library, finds the bottleneck and prices the plant. <b>Conceptual calculation — not certified engineering.</b></p>
    <div class="tw-cfg__status" data-cs></div>
    <div class="tw-cfg__acts"><button type="button" class="tw-cfg__apply" data-capply>Update 3D model</button><button type="button" data-csave>Save to compare</button><button type="button" data-ccsv>Export schedule (CSV)</button><button type="button" data-creset>Reference plant</button></div>
    <div class="tw-cfg__unit"><span>Enter the target in</span><button type="button" data-cunit="L" aria-pressed="true">litres</button><button type="button" data-cunit="t" aria-pressed="false">tonnes</button></div>
    <div class="tw-inputs">${groups.map(([g, label]) => `<fieldset><legend>${esc(label)}</legend>${INPUTS.filter((i) => i.group === g).map(field).join("")}</fieldset>`).join("")}</div>
    <p class="tw-k">Material flows</p><div class="tw-cfg__flows" data-cflows></div>
    <p class="tw-k">Capacity by production stage</p><div class="tw-cfg__scroll"><table class="tw-cfg__t" data-cstages></table></div>
    <p class="tw-k">Equipment schedule (preliminary)</p><div class="tw-cfg__scroll"><table class="tw-cfg__t" data-csched></table></div>
    <p class="tw-k">Estimated CAPEX</p><ul class="tw-cfg__capex" data-ccapex></ul>
    <p class="tw-k">Investment indicators</p><div class="tw-kgrid" data-cfin></div><p class="tw-cfg__small" data-cscale></p>
    <p class="tw-k">Layout check</p><div data-cflags></div>
    <p class="tw-k">Compare configurations</p><div class="tw-cfg__scroll" data-ccmp></div>
    <details class="tw-cfg__lib"><summary>Equipment specification library (editable)</summary><p class="tw-cfg__small">One unit per row: design capacity and budget purchase price (C$, 2025). Leave "Fixed units" empty for automatic sizing. Edited rows are treated as assumptions. Prices scale with the 0.6 power of capacity unless you enter a price.</p><div class="tw-cfg__scroll"><table class="tw-cfg__t tw-cfg__libt" data-clib></table></div><button type="button" class="tw-reset" data-clibreset>Reset library</button></details>
    <p class="tw-note">Unit sizes, prices, factors and scale effects are illustrative assumptions; figures tagged “Public figure” describe the reference facility and only calibrate the defaults. No manufacturer specification is implied. Results are a conceptual pre-feasibility estimate, not certified engineering.</p>
  </div>`;
  const $ = (s) => pane.querySelector(s);
  let unit = "L";
  const ethT = (ML) => (ML * 1e6 * 0.789) / 1e6;     // thousand tonnes (kt) ↔ M L

  const libTable = () => {
    $("[data-clib]").innerHTML = `<thead><tr><th>Stage · unit</th><th>Capacity</th><th>Price C$</th><th>Fixed units</th><th>Standby</th><th>Basis</th></tr></thead><tbody>${LIBRARY.map((s) => {
      const o = lib[s.id] || {};
      return `<tr><td><b>${esc(s.stage)}</b><small>${esc(s.unit)}</small></td><td><input type="number" min="0" step="any" data-cl="${s.id}:cap" value="${o.cap ?? ""}" placeholder="${s.cap}"><small>${esc(s.capUnit)}</small></td><td><input type="number" min="0" step="1000" data-cl="${s.id}:cost" value="${o.cost ?? ""}" placeholder="${s.cost}"></td><td><input type="number" min="0" step="1" data-cl="${s.id}:fixed" value="${o.fixed ?? ""}" placeholder="auto"></td><td><input type="number" min="0" step="1" data-cl="${s.id}:standby" value="${o.standby ?? ""}" placeholder="policy"></td><td>${tagEl(o.cap || o.cost ? "a" : s.tag)}<small>${esc(s.note)}</small></td></tr>`;
    }).join("")}</tbody>`;
  };
  libTable();

  let R, flags = [];
  function render() {
    const c = configure(F, { inputs, lib });
    R = c.R; flags = c.flags;
    for (const i of INPUTS) if (i.type !== "select") {
      const o = $(`[data-co="${i.id}"]`);
      o.textContent = i.id === "target" && unit === "t" ? `${fmt(ethT(inputs.target), 1)} kt/year` : `${fmt(inputs[i.id], (String(i.step).split(".")[1] || "").length)} ${i.unit}`;
    }
    const f = R.flows, dirty = JSON.stringify({ i: inputs, l: lib }) !== appliedKey;
    const limited = R.produced < inputs.target - 1e-6;
    $("[data-cs]").innerHTML = `<div class="tw-cfg__card"><span>Target</span><b>${fmt(inputs.target, 1)} M L/yr</b><small>${fmt(ethT(inputs.target), 1)} kt/yr</small></div>
      <div class="tw-cfg__card"><span>Maximum achievable</span><b class="${limited ? "is-bad" : "is-good"}">${fmt(R.maxPlant, 1)} M L/yr</b><small>Bottleneck: ${esc(R.bottleneck.stage)}</small></div>
      <div class="tw-cfg__card"><span>Layout</span><b class="${flags.length ? "is-warn" : "is-good"}">${flags.length ? `${flags.length} to review` : "No conflicts"}</b><small>${dirty ? "3D model not updated yet" : applied ? "Shown in the 3D model" : "Reference plant in 3D"}</small></div>`;
    $("[data-capply]").classList.toggle("is-due", dirty);
    $("[data-cflows]").innerHTML = [
      ["Ethanol", `${fmt(f.hL)} L/h`, `${fmt(f.dayL)} L/day`], ["Feedstock", `${fmt(f.grainTh, 1)} t/h`, `${fmt(f.grainTd)} t/day`], ["Beer to distillation", `${fmt(f.beerM3h, 1)} m³/h`, `conc. ${fmt(inputs.conc, 1)} % v/v`],
      ["Whole stillage", `${fmt(f.stillM3h, 1)} m³/h`, `WDG ${fmt(f.wdgTd)} t/day`], ["Steam", `${fmt(f.steamTh, 1)} t/h`, "process demand"], ["Electrical load", `${fmt(f.kva)} kVA`, "peak, incl. 1.6 factor"],
      ["Heat rejection", `${fmt(f.heatMW, 1)} MW`, "cooling towers"], ["Water", `${fmt(f.waterM3h, 1)} m³/h`, `wastewater ${fmt(f.wwM3h, 1)} m³/h`], ["Fermentation cycle", `${fmt(R.stages.find((s) => s.id === "ferm").extra.fillH, 1)} h fill`, `+ ${fmt(R.rest)} h ferment/empty/clean`]
    ].map(([k, v, s]) => `<div class="tw-kpi"><span>${esc(k)}</span><b>${esc(v)}</b><small>${esc(s)}</small></div>`).join("");
    $("[data-cstages]").innerHTML = `<thead><tr><th>Stage</th><th>Required</th><th>Units</th><th>Installed</th><th>Utilization</th><th>Max plant</th></tr></thead><tbody>${R.stages.map((s) => {
      const u = Math.min(1.2, s.util), cls = s.util > 1 ? "is-bad" : s.util > inputs.util / 100 + 0.001 ? "is-warn" : "";
      const reqTxt = s.type === "batch" ? `${fmt(s.req)} m³` : s.type === "storage" ? `${fmt(s.req)} ${s.capUnit}` : `${fmt(s.req, s.req < 10 ? 1 : 0)} ${s.capUnit}`;
      return `<tr class="${R.bottleneck === s ? "is-bott" : ""}"><td><b>${esc(s.stage)}</b><small>${esc(s.unit)}</small></td><td>${reqTxt}</td><td>${s.n}${s.standby ? ` <small>+${s.standby} standby</small>` : ""}</td><td>${fmt(s.installed, s.installed < 10 ? 1 : 0)} <small>${esc(s.capUnit)}</small></td><td><span class="tw-cfg__u ${cls}"><i style="width:${Math.min(100, u * 100)}%"></i></span>${pct(s.util)}<small>${s.type === "storage" ? `${fmt(s.extra.autonomy, 1)} days autonomy` : `reserve ${pct(Math.max(0, s.reserve))}`}</small></td><td>${s.maxPlant == null ? "<small>storage</small>" : `${fmt(s.maxPlant, 1)}${R.bottleneck === s ? " <em class=\"tw-cfg__b\">bottleneck</em>" : ""}`}</td></tr>`;
    }).join("")}</tbody>`;
    $("[data-csched]").innerHTML = `<thead><tr><th>Equipment</th><th>Op.</th><th>Standby</th><th>Unit capacity</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${R.schedule.map((x) => `<tr><td><b>${esc(x.unit)}</b><small>${esc(x.stage)} ${tagEl(x.tag)}</small></td><td>${x.op}</td><td>${x.standby || "—"}</td><td>${fmt(x.cap, x.cap < 10 ? 1 : 0)} ${esc(x.capUnit)}</td><td>${money(x.unitCost, 2)}</td><td>${money(x.total, 2)}</td></tr>`).join("")}<tr class="is-sum"><td colspan="5">Equipment purchase</td><td>${money(R.purchase, 1)}</td></tr></tbody>`;
    const cmax = Math.max(...R.capexLines.map((l) => l[2]));
    $("[data-ccapex]").innerHTML = R.capexLines.map(([k, n, v]) => `<li><span>${esc(n)}</span><span class="tw-bar"><i style="width:${(v / cmax) * 100}%"></i></span><b>${money(v, 1)}</b></li>`).join("") + `<li class="is-sum"><span>Total estimated CAPEX</span><span></span><b>${money(R.capex, 1)}</b></li>`;
    const r = R.finance, sign = (v) => (v > 0 ? "is-good" : v < 0 ? "is-bad" : "");
    $("[data-cfin]").innerHTML = r ? [
      ["CAPEX", money(R.capex), "", `${money(R.capex / (R.produced * 1e6) * 1e6, 2).replace(" M", "")}/L of capacity`],
      ["Annual revenue", money(r.revenue), "", `${fmt(R.produced, 1)} M L/yr produced`], ["Annual OPEX", money(r.opex), "", `${R.values.staff} FTE`],
      ["EBITDA", money(r.ebitda), sign(r.ebitda)], ["EBITDA margin", `${fmt(r.margin * 100, 1)} %`, sign(r.margin)],
      ["Break-even ethanol price", `C$${fmt(r.breakEvenEthanol, 3)}/L`, R.values.ethanolPrice > r.breakEvenEthanol ? "is-good" : "is-bad", `selling at C$${fmt(R.values.ethanolPrice, 3)}/L`],
      ["Simple payback", r.payback ? (r.payback > 25 ? "> 25 years" : `${fmt(r.payback, 1)} years`) : "no payback", r.payback && r.payback <= 10 ? "is-good" : "is-bad"],
      ["10-year net position", money(r.netAfter), sign(r.netAfter)]
    ].map(([k, v, c, s]) => `<div class="tw-kpi"><span>${esc(k)}</span><b class="${c}">${esc(v)}</b>${s ? `<small>${esc(s)}</small>` : ""}</div>`).join("") : `<p class="tw-cfg__small">No production.</p>`;
    $("[data-cscale]").innerHTML = `Scale effects applied (assumptions): feedstock C$${fmt(R.values.wheatPrice)}/t delivered (${esc(R.feedstock.name.toLowerCase())}, wider sourcing radius), ethanol netback C$${fmt(R.values.ethanolPrice, 3)}/L (haul and volume discount), ${R.values.staff} FTE. CAPEX = purchase × (1 + ${CAPEX_FACTORS.slice(1).map((x) => x[2]).join(" + ")}) + ${ENGINEERING * 100} % engineering + ${CONTINGENCY * 100} % contingency. Bigger is not automatically better: under-used equipment and scale effects are priced in.`;
    $("[data-cflags]").innerHTML = (R.warnings.length ? `<ul class="tw-cfg__warn">${R.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : "") +
      (flags.length ? `<p class="tw-cfg__small">${flags.length} clearance or spatial conflicts — this configuration needs additional engineering or a manual layout adjustment.${dirty ? " Update the 3D model to see them." : ""}</p><ul class="tw-cfg__flags">${flags.slice(0, 40).map((x) => `<li><button type="button" data-cflag="${esc(x.id)}">${esc(x.msg)}</button></li>`).join("")}</ul>${flags.length > 40 ? `<p class="tw-cfg__small">… and ${flags.length - 40} more.</p>` : ""}` : `<p class="tw-cfg__ok">Generated equipment respects the 1 m clearance, the site boundary and the pipe-rack corridor.</p>`);
    renderCompare();
  }
  const summary = () => ({ name: `${fmt(inputs.target, 1)} M L · ${FEEDSTOCKS[inputs.feedstock]?.name || ""}`, target: inputs.target, max: R.maxPlant, bott: R.bottleneck.stage, ferm: R.stages.find((s) => s.id === "ferm").units, capex: R.capex, opex: R.finance?.opex, rev: R.finance?.revenue, ebitda: R.finance?.ebitda, margin: R.finance?.margin, payback: R.finance?.payback, flags: flags.length, cfg: enc({ i: inputs, l: lib }) });
  function renderCompare() {
    const rows = [["Target", (x) => `${fmt(x.target, 1)} M L`], ["Max achievable", (x) => `${fmt(x.max, 1)} M L`], ["Bottleneck", (x) => esc(x.bott)], ["Fermenters", (x) => x.ferm], ["CAPEX", (x) => money(x.capex)], ["OPEX", (x) => money(x.opex || 0)], ["Revenue", (x) => money(x.rev || 0)], ["EBITDA", (x) => money(x.ebitda || 0)], ["Margin", (x) => `${fmt((x.margin || 0) * 100, 1)} %`], ["Payback", (x) => (x.payback ? `${fmt(x.payback, 1)} yr` : "—")], ["Layout flags", (x) => x.flags]];
    const cols = [{ ...summary(), name: "Current" }, ...compare];
    $("[data-ccmp]").innerHTML = `<table class="tw-cfg__t tw-cfg__cmp"><thead><tr><th></th>${cols.map((c, i) => `<th>${esc(c.name)}${i ? `<button type="button" data-cdel="${i - 1}" aria-label="Remove">×</button><button type="button" data-cload="${i - 1}">Load</button>` : ""}</th>`).join("")}</tr></thead><tbody>${rows.map(([k, f]) => `<tr><td>${esc(k)}</td>${cols.map((c) => `<td>${f(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>${compare.length ? "" : `<p class="tw-cfg__small">Save up to three configurations to compare them side by side.</p>`}`;
  }
  const saveCompare = () => { try { localStorage.setItem(STORE, JSON.stringify(compare)); } catch {} };

  let tmr; const later = () => { clearTimeout(tmr); tmr = setTimeout(render, 90); };
  pane.addEventListener("input", (e) => {
    const c = e.target.closest("[data-ci]");
    if (c) { const i = INPUTS.find((x) => x.id === c.dataset.ci); inputs[i.id] = i.type === "select" ? c.value : parseFloat(c.value); if (i.id === "feedstock") { inputs.yield = FEEDSTOCKS[c.value].yield; $('[data-ci="yield"]').value = inputs.yield; } later(); return; }
    const l = e.target.closest("[data-cl]");
    if (l) { const [id, k] = l.dataset.cl.split(":"); lib[id] = { ...(lib[id] || {}) }; if (l.value === "") delete lib[id][k]; else lib[id][k] = +l.value; if (!Object.keys(lib[id]).length) delete lib[id]; later(); }
  });
  pane.addEventListener("change", (e) => { if (e.target.closest("select[data-ci]")) pane.dispatchEvent(new Event("input")); });
  pane.addEventListener("click", (e) => {
    const b = (s) => e.target.closest(s);
    if (b("[data-capply]")) { const u = new URL(location.href); u.searchParams.set("cfg", enc({ i: inputs, l: lib })); u.hash = "configuration"; location.href = u.toString(); return; }
    if (b("[data-creset]")) { const u = new URL(location.href); u.searchParams.delete("cfg"); u.hash = "configuration"; if (cfg.active) { location.href = u.toString(); return; } inputs = { ...DEFAULTS }; lib = {}; INPUTS.forEach((i) => { const el = $(`[data-ci="${i.id}"]`); if (el) el.value = inputs[i.id]; }); libTable(); render(); return; }
    if (b("[data-csave]")) { compare.unshift(summary()); compare = compare.slice(0, 3); saveCompare(); renderCompare(); return; }
    const del = b("[data-cdel]"); if (del) { compare.splice(+del.dataset.cdel, 1); saveCompare(); renderCompare(); return; }
    const ld = b("[data-cload]"); if (ld) { const o = dec(compare[+ld.dataset.cload].cfg); inputs = { ...DEFAULTS, ...o.i }; lib = o.l || {}; INPUTS.forEach((i) => { const el = $(`[data-ci="${i.id}"]`); if (el) el.value = inputs[i.id]; }); libTable(); render(); return; }
    if (b("[data-clibreset]")) { lib = {}; libTable(); render(); return; }
    const un = b("[data-cunit]"); if (un) { unit = un.dataset.cunit; pane.querySelectorAll("[data-cunit]").forEach((x) => x.setAttribute("aria-pressed", String(x === un))); render(); return; }
    const fl = b("[data-cflag]"); if (fl && !JSON.stringify({ i: inputs, l: lib }).localeCompare(appliedKey) && twin) { twin.select(fl.dataset.cflag); return; }
    if (b("[data-ccsv]")) {
      const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
      const lines = [["3DNA Plant Configuration Calculator — preliminary equipment schedule (conceptual, not certified engineering)"], [`Target ${inputs.target} M L/year; maximum achievable ${R.maxPlant.toFixed(1)} M L/year; bottleneck: ${R.bottleneck.stage}`], [],
        ["Stage", "Equipment unit", "Operating", "Standby", "Unit capacity", "Capacity unit", "Required", "Utilization %", "Unit price C$", "Total C$", "Basis"],
        ...R.stages.map((s) => [s.stage, s.unit, s.n, s.standby, s.cap, s.capUnit, s.req.toFixed(2), (s.util * 100).toFixed(1), Math.round(s.cost), Math.round(s.cost * s.units), (lib[s.id] ? "Assumption (edited)" : s.tag === "v" ? "Public figure + assumption" : "Assumption")]),
        [], ...R.capexLines.map(([, n, v]) => [n, "", "", "", "", "", "", "", "", Math.round(v)]), ["Total estimated CAPEX", "", "", "", "", "", "", "", "", Math.round(R.capex)]];
      const blob = new Blob(["﻿" + lines.map((l) => l.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `3dna-equipment-schedule-${inputs.target}ML.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  });
  render();
  return { get result() { return R; } };
}
