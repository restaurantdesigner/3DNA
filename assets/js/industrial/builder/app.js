/*
 * 3DNA FactoryBuilder — application (Configure · Generate · Explore · Equipment · Investment · Compare).
 *   mountBuilder(root, ui)
 * Pipeline (each stage is real work; the progress list reports them as they complete):
 *   1 validate inputs → 2 size equipment (model.configure) → 3 generate layout and networks (layout.generateFactory)
 *   → 4 check geometry and references → 5 build the 3D model and route the networks (engine.createTwin)
 *   → 6 investment estimate (model.invest).
 * The 3D view, equipment library, networks, selection and views are the existing 3DNA Industrial engine.
 */
import { createTwin } from "../engine.js?v=ind16";
import { DISCLOSURE, DEFAULTS, FEEDSTOCKS, PRODUCTS, CURRENCIES, COUNTRIES, SCHEDULES, AUTOMATION, ENERGY, STRATEGIES, LIMITS, FIN_DEFAULTS, CATALOG, DEPARTMENTS, SOURCES, RESEARCHED, configure, invest } from "./model.js?v=fb1";
import { generateFactory } from "./layout.js?v=fb1";

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hex = (n) => "#" + n.toString(16).padStart(6, "0");
class InputError extends Error {}
const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const NAV = [["configure", "Configure"], ["generate", "Generate"], ["explore", "Explore"], ["equipment", "Equipment"], ["invest", "Investment"], ["compare", "Compare"]];
const STEPS = ["Validating inputs", "Sizing equipment", "Generating layout and networks", "Checking geometry and references", "Building the 3D model and routing networks", "Estimating the investment"];
const VIEWS = [["realistic", "Realistic"], ["process", "Process"], ["xray", "X-ray"], ["thermal", "Thermal"], ["blueprint", "Blueprint"], ["night", "Night"]];
const STORE = "fb-scenarios";

export async function mountBuilder(root, ui) {
  const $ = (s) => root.querySelector(s);
  const side = $("[data-side]"), canvasBox = $("[data-canvas]"), detail = $("[data-detail]"), prog = $("[data-progress]");
  const mobile = () => matchMedia("(max-width: 900px)").matches;
  let input = { ...DEFAULTS }, finOver = {}, rates = Object.fromEntries(Object.entries(CURRENCIES).map(([k, c]) => [k, c.rate]));
  let state = null, twin = null, nav = "configure", busy = false, layers = new Set();
  let scenarios = [null, null, null]; try { scenarios = JSON.parse(localStorage.getItem(STORE) || "null") || scenarios; } catch {}

  // ---------------------------------------------------------------- formatting
  const cur = () => CURRENCIES[input.currency] || CURRENCIES.CAD;
  const num = (v, d = 0) => (v == null || !isFinite(v) ? "—" : v.toLocaleString("en-CA", { minimumFractionDigits: d, maximumFractionDigits: d }));
  const money = (cad, d = 1) => { if (cad == null || !isFinite(cad)) return "—"; const v = cad * rates[input.currency]; const a = Math.abs(v); return `${v < 0 ? "−" : ""}${cur().symbol}${a >= 1e6 ? num(a / 1e6, d) + " M" : a >= 1e3 ? num(a / 1e3, 0) + " k" : num(a, 2)}`; };
  const perL = (cad) => `${cur().symbol}${num(cad * rates[input.currency], 3)}/L`;
  const ML = (L) => `${num(L / 1e6, 1)} M L`;
  const tag = (k) => `<em class="fb-tag fb-tag--${k || "a"}">${k === "v" ? "Public figure" : k === "b" ? "Benchmark" : "Assumption"}</em>`;
  const lastShown = {};
  const animate = (el, to, fmt, key) => { const from = key in lastShown ? lastShown[key] : 0; lastShown[key] = to; el.dataset.v = to; const t0 = performance.now(), D = 600; const step = (t) => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); }; if (matchMedia("(prefers-reduced-motion: reduce)").matches) el.textContent = fmt(to); else requestAnimationFrame(step); };

  // ---------------------------------------------------------------- navigation
  const navBox = $("[data-nav]");
  navBox.innerHTML = NAV.map(([k, n], i) => `<button type="button" data-nav-to="${k}" aria-pressed="${k === nav}"><span>${i + 1}</span>${esc(n)}</button>`).join("");
  navBox.addEventListener("click", (e) => { const b = e.target.closest("[data-nav-to]"); if (b) go(b.dataset.navTo); });
  function go(k) {
    nav = k; navBox.querySelectorAll("[data-nav-to]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.navTo === k)));
    root.classList.add("side-open"); render();
    const b = navBox.querySelector(`[data-nav-to="${k}"]`); if (b && navBox.scrollWidth > navBox.clientWidth) navBox.scrollLeft = b.offsetLeft - navBox.clientWidth / 2 + b.offsetWidth / 2;
    side.scrollTop = 0;
  }
  $("[data-side-toggle]").addEventListener("click", () => { root.classList.toggle("side-open"); setTimeout(() => twin && twin.resize(), 320); });
  $("[data-side-close]")?.addEventListener("click", () => { root.classList.remove("side-open"); setTimeout(() => twin && twin.resize(), 320); });

  // ---------------------------------------------------------------- panels
  function render() {
    side.querySelector("[data-panel]").innerHTML = ({ configure: pConfigure, generate: pGenerate, explore: pExplore, equipment: pEquipment, invest: pInvest, compare: pCompare })[nav]();
    if (nav === "invest") animateInvest();
    if (nav === "generate") animateGenerate();
  }
  const opt = (set, v, label = (x) => x.name) => Object.entries(set).map(([k, x]) => `<option value="${k}"${k === v ? " selected" : ""}>${esc(label(x))}</option>`).join("");
  const field = (id, label, html, hint = "") => `<label class="fb-f"><span>${esc(label)}</span>${html}${hint ? `<small>${hint}</small>` : ""}</label>`;
  function pConfigure() {
    const lim = LIMITS.target[input.period];
    return `<h2 class="fb-h">Configure your factory</h2><p class="fb-p">Five inputs define the plant. Everything else has an illustrative default you can change.</p>
      <form class="fb-form" data-form novalidate>
        <fieldset><legend>Required</legend>
        ${field("target", "Target ethanol production", `<div class="fb-row"><input type="number" name="target" inputmode="decimal" min="${lim[0]}" max="${lim[1]}" step="any" value="${input.target}" required><select name="period"><option value="year"${input.period === "year" ? " selected" : ""}>million litres / year</option><option value="day"${input.period === "day" ? " selected" : ""}>litres / day</option></select></div>`, `Supported range ${num(lim[0])}–${num(lim[1])} ${input.period === "year" ? "M L/year" : "L/day"}.`)}
        ${field("feedstock", "Feedstock", `<select name="feedstock">${opt(FEEDSTOCKS, input.feedstock)}</select>`, esc(FEEDSTOCKS[input.feedstock].basis))}
        ${field("product", "Final product", `<select name="product">${opt(PRODUCTS, input.product)}</select>`)}
        ${field("days", "Operating days per year", `<input type="number" name="days" min="${LIMITS.days[0]}" max="${LIMITS.days[1]}" step="1" value="${input.days}">`, "Case study: 350 days (14.0 M L ÷ 40,000 L/day, public figures).")}
        </fieldset>
        <details class="fb-adv"><summary>Advanced settings</summary>
        <fieldset>
        ${field("country", "Country", `<select name="country">${opt(COUNTRIES, input.country)}</select>`)}
        ${field("currency", "Currency", `<select name="currency">${Object.keys(CURRENCIES).map((k) => `<option${k === input.currency ? " selected" : ""}>${k}</option>`).join("")}</select>`)}
        ${field("land", "Available land area (ha, 0 = no limit)", `<input type="number" name="land" min="0" max="${LIMITS.land[1]}" step="0.1" value="${input.land}">`)}
        ${field("schedule", "Operating schedule", `<select name="schedule">${opt(SCHEDULES, input.schedule)}</select>`)}
        ${field("utilization", "Design capacity utilization (%)", `<input type="number" name="utilization" min="${LIMITS.utilization[0]}" max="${LIMITS.utilization[1]}" step="1" value="${input.utilization}">`, "Maximum share of nameplate capacity used for sizing (illustrative default 85 %).")}
        ${field("automation", "Automation level", `<select name="automation">${opt(AUTOMATION, input.automation)}</select>`)}
        ${field("grainDays", "Raw material storage (days)", `<input type="number" name="grainDays" min="1" max="90" step="1" value="${input.grainDays}">`)}
        ${field("productDays", "Product storage (days)", `<input type="number" name="productDays" min="2" max="90" step="1" value="${input.productDays}">`)}
        ${field("energy", "Energy source", `<select name="energy">${opt(ENERGY, input.energy)}</select>`)}
        ${field("strategy", "Equipment configuration", `<select name="strategy">${opt(STRATEGIES, input.strategy)}</select>`, "Discrete unit sizes: balanced keeps unit counts modular; standard uses more, smaller units; large uses fewer, bigger units.")}
        ${field("standbyPolicy", "Standby equipment", `<select name="standbyPolicy"><option value="none"${input.standbyPolicy === "none" ? " selected" : ""}>None</option><option value="critical"${input.standbyPolicy === "critical" ? " selected" : ""}>N+1 on critical utilities</option><option value="rotating"${input.standbyPolicy === "rotating" ? " selected" : ""}>N+1 on critical and rotating equipment</option></select>`)}
        ${field("budget", `Budget limit (M ${input.currency}, 0 = none)`, `<input type="number" name="budget" min="0" max="2000" step="1" value="${input.budget}">`)}
        </fieldset></details>
        <p class="fb-err" data-err hidden></p>
        <button type="submit" class="fb-btn fb-btn--go" ${busy ? "disabled" : ""}>Generate factory</button>
      </form>
      <p class="fb-disc">${esc(DISCLOSURE)}</p>`;
  }
  function pGenerate() {
    if (!state) return `<h2 class="fb-h">Generate</h2><p class="fb-p">Configure the plant and press Generate.</p>`;
    const c = state.cfg, s = state.stats, iv = state.inv, Ly = c.flows.Ly, util = Ly / c.configuredL;
    const warn = [...c.issues.map((m) => ({ level: "warn", msg: m })), ...state.checks, ...state.engineChecks];
    if (c.producedL < Ly - 1) warn.unshift({ level: "error", msg: `Configured capacity ${ML(c.configuredL)} is below the target; limited by ${c.bottleneck.category.toLowerCase()}.` });
    if (input.land > 0 && s.siteArea / 1e4 > input.land) warn.push({ level: "error", msg: `The generated site needs ≈ ${num(s.siteArea / 1e4, 1)} ha; only ${num(input.land, 1)} ha available.` });
    if (iv.overBudget) warn.push({ level: "error", msg: `Indicative CAPEX ${money(iv.capex)} exceeds the budget limit of ${cur().symbol}${num(input.budget)} M.` });
    warn.push({ level: "note", msg: "Unit sizes, prices and layout rules are illustrative assumptions — all require professional engineering validation." });
    const tight = c.stages.filter((x) => x.maxL != null).sort((a, b) => a.maxL - b.maxL).slice(0, 4);
    return `<h2 class="fb-h">Capacity analysis</h2>
      <div class="fb-kpis">
        ${kpi("Target annual production", ML(Ly))}${kpi("Target daily production", `${num(c.flows.dayL)} L`)}
        ${kpi("Estimated configured capacity", ML(c.configuredL), "", "data-anim-l", c.configuredL)}${kpi("Capacity utilization", `${num(util * 100, 0)} %`, util > 1 ? "is-bad" : "")}
        ${kpi("Capacity reserve", `${num((c.configuredL / Ly - 1) * 100, 1)} %`, c.configuredL >= Ly ? "is-good" : "is-bad")}${kpi("Production departments", s.departments)}
        ${kpi("Total equipment count", num(s.equipmentCount))}${kpi("Engineering connections", num(s.connections + s.links))}
        ${kpi("Estimated site footprint", `${num(s.siteArea / 1e4, 1)} ha`, "", "", null, `${num(s.siteW)} × ${num(s.siteD)} m`)}${kpi("Estimated building area", `${num(s.buildingArea)} m²`)}
      </div>
      <p class="fb-k">Potential capacity constraints</p>
      <ul class="fb-list">${tight.map((x, i) => `<li><p><b>${esc(x.category)}</b><small>${esc(x.name)}</small></p><span>${num(x.maxL / 1e6, 1)} M L/yr max${i === 0 ? ' <em class="fb-chip">bottleneck</em>' : ""}</span></li>`).join("")}</ul>
      <p class="fb-k">Checks</p><ul class="fb-checks">${warn.map((w) => `<li class="is-${w.level}">${esc(w.msg)}</li>`).join("")}</ul>
      <p class="fb-k">Generation log</p><ol class="fb-log">${state.timings.map(([n, ms]) => `<li><span>${esc(n)}</span><b>${num(ms)} ms</b></li>`).join("")}</ol>
      <p class="fb-disc">${esc(DISCLOSURE)}</p>`;
  }
  const kpi = (k, v, cls = "", anim = "", raw = null, sub = "") => `<div class="fb-kpi"><span>${esc(k)}</span><b class="${cls}" ${anim}>${esc(v)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`;
  function pExplore() {
    if (!twin) return `<h2 class="fb-h">Explore</h2><p class="fb-p">Generate a factory first.</p>`;
    const counts = Object.fromEntries(Object.keys(twin.networks).map((k) => [k, twin.links.filter((l) => l.net === k).length]));
    return `<h2 class="fb-h">Explore the factory</h2><p class="fb-p">Drag to orbit, scroll or pinch to zoom, click any equipment for its data sheet.</p>
      <p class="fb-k">View</p><div class="fb-seg" data-views>${VIEWS.map(([k, n]) => `<button type="button" data-view="${k}" aria-pressed="${twin.view === k}">${n}</button>`).join("")}</div>
      <p class="fb-k">Engineering layers</p><ul class="fb-layers">${Object.entries(twin.networks).filter(([k]) => counts[k]).map(([k, n]) => `<li><label><input type="checkbox" data-layer="${k}"${layers.has(k) ? " checked" : ""}><i style="background:${hex(n.color)}"></i><span>${esc(n.name)}</span><em>${counts[k]}</em></label></li>`).join("")}</ul>
      <div class="fb-row fb-row--btns"><button type="button" class="fb-btn" data-layers-all>All layers</button><button type="button" class="fb-btn" data-layers-none>Hide all</button><button type="button" class="fb-btn" data-energy aria-pressed="${twin.energy}">${twin.energy ? "Stop energy flow" : "Animate energy flow"}</button><button type="button" class="fb-btn" data-home>Overview</button></div>
      <p class="fb-k">Departments</p><ul class="fb-list fb-list--btn">${state.F.areas.map((a) => `<li><button type="button" data-area="${a.id}"><i style="background:${hex(a.color)}"></i>${esc(a.name)}</button></li>`).join("")}</ul>
      <p class="fb-note">Connections are conceptual routes generated from equipment IDs and attachment points — not verified infrastructure.</p>`;
  }
  function pEquipment() {
    if (!state) return `<h2 class="fb-h">Equipment</h2><p class="fb-p">Generate a factory first.</p>`;
    const rows = state.inventory;
    const byDept = Object.keys(DEPARTMENTS).map((d) => [d, rows.filter((r) => r.dept === d)]).filter(([, r]) => r.length);
    const total = rows.reduce((a, r) => a + r.price, 0);
    return `<h2 class="fb-h">Equipment inventory</h2><p class="fb-p">${num(rows.length)} priced items · ${money(total)} purchase · ${money(rows.reduce((a, r) => a + r.install, 0))} installation</p>
      <div class="fb-row"><input type="search" class="fb-search" data-search placeholder="Search equipment, ID or department…" aria-label="Search equipment"><button type="button" class="fb-btn" data-csv>Export CSV</button></div>
      <div data-inv>${byDept.map(([d, r]) => `<details class="fb-grp" open><summary><i style="background:${hex(DEPARTMENTS[d].color)}"></i>${esc(DEPARTMENTS[d].name)}<em>${r.length}</em></summary><ul>${r.map((x) => `<li><button type="button" data-obj="${esc(x.obj)}" data-row="${esc(x.id)}"><code>${esc(x.id)}</code><span>${esc(x.name)}${x.standby ? ' <em class="fb-chip">standby</em>' : ""}</span><b>${money(x.price, 2)}</b></button></li>`).join("")}</ul></details>`).join("")}</div>`;
  }
  function pInvest() {
    if (!state) return `<h2 class="fb-h">Investment</h2><p class="fb-p">Generate a factory first.</p>`;
    const iv = state.inv, c = state.cfg, L = c.producedL;
    const capMax = Math.max(...iv.capexLines.map((x) => x[1])), opMax = Math.max(...iv.opexLines.map((x) => x[1]));
    const bars = (lines, max, color) => `<ul class="fb-bars">${lines.map(([k, v]) => `<li><span>${esc(k)}</span><i><b style="width:${(v / max) * 100}%;background:${color}"></b></i><em>${money(v)}</em></li>`).join("")}</ul>`;
    return `<h2 class="fb-h">Investment simulation</h2>
      <div class="fb-row"><label class="fb-f fb-f--inline"><span>Currency</span><select data-currency>${Object.keys(CURRENCIES).map((k) => `<option${k === input.currency ? " selected" : ""}>${k}</option>`).join("")}</select></label></div>
      <div class="fb-kpis">
        <div class="fb-kpi is-main"><span>Indicative CAPEX</span><b data-anim="capex">${money(iv.capex)}</b><small>${perL(iv.capex / L)} of annual capacity</small></div>
        <div class="fb-kpi"><span>Annual revenue</span><b data-anim="revenue">${money(iv.revenue)}</b><small>ethanol ${money(iv.revEth)} · co-products ${money(iv.revCo)}</small></div>
        <div class="fb-kpi"><span>Annual operating cost</span><b data-anim="opex">${money(iv.opex)}</b><small>${iv.staff} FTE</small></div>
        <div class="fb-kpi"><span>Production cost</span><b>${perL(iv.costPerL)}</b><small>net of co-products ${perL(iv.netCostPerL)}</small></div>
        <div class="fb-kpi"><span>EBITDA</span><b class="${iv.ebitda > 0 ? "is-good" : "is-bad"}" data-anim="ebitda">${money(iv.ebitda)}</b><small>margin ${num(iv.margin * 100, 1)} %</small></div>
        <div class="fb-kpi"><span>Simple payback</span><b class="${iv.payback && iv.payback <= 10 ? "is-good" : "is-bad"}">${iv.payback ? (iv.payback > 30 ? "> 30 years" : `${num(iv.payback, 1)} years`) : "no payback"}</b><small>before tax and financing</small></div>
      </div>
      <p class="fb-k">Indicative CAPEX</p>${bars(iv.capexLines, capMax, "#3b82f6")}
      <p class="fb-k">Indicative annual OPEX</p>${bars(iv.opexLines, opMax, "#f59e0b")}
      <details class="fb-adv"><summary>Financial assumptions (editable, CAD)</summary>
        <div class="fb-assume">${FIN_DEFAULTS.map((f) => `<label class="fb-f"><span>${esc(f.label)} <small>${esc(f.unit)}</small></span><input type="number" step="${f.step}" data-fin="${f.id}" value="${+(+state.cfg.fin[f.id]).toFixed(4)}"><small>${tag(f.tag)} ${esc(f.basis)}${f.src ? ` · <a href="${esc(f.src.url)}" target="_blank" rel="noopener noreferrer">source</a>` : ""}</small></label>`).join("")}
        ${Object.entries(CURRENCIES).filter(([k]) => k !== "CAD").map(([k, c]) => `<label class="fb-f"><span>1 CAD in ${k}</span><input type="number" step="0.01" data-rate="${k}" value="${rates[k]}"><small>${tag("a")} ${esc(c.basis)}</small></label>`).join("")}
        <button type="button" class="fb-btn" data-fin-reset>Reset assumptions</button></div>
      </details>
      <p class="fb-note">The FactoryBuilder CAPEX is a fuller build-up (buildings, site works, pipe rack and auxiliary equipment) than the C$26.3 M replacement-cost scenario of the ethanol case study, so the two differ.</p>
      <div class="fb-dev"><p class="fb-k">3DNA digital twin development — not factory construction cost</p><ul>${(ui.pricing.packages || []).map((p) => `<li><b>${esc(p.name)}</b><span>${esc(p.range)}</span><small>${esc(p.text)}</small></li>`).join("")}</ul><button type="button" class="fb-btn" data-pricing>Request a Professional Digital Twin</button></div>
      <button type="button" class="fb-btn fb-btn--main fb-btn--wide" data-cta-main data-track="factory_builder_lead">Turn This Concept Into Your Project</button>
      <p class="fb-disc">${esc(DISCLOSURE)}</p>`;
  }
  function pCompare() {
    const cols = scenarios.map((s, i) => ({ s, i, name: "ABC"[i] }));
    const rows = [["Production capacity", (s) => ML(s.produced)], ["Configured capacity", (s) => ML(s.configured)], ["Fermenters", (s) => s.ferm], ["Distillation trains", (s) => s.trains], ["Storage tanks", (s) => s.tanks], ["Equipment count", (s) => num(s.equipment)], ["Site footprint", (s) => `${num(s.site / 1e4, 1)} ha`], ["Indicative CAPEX", (s) => money(s.capex)], ["Annual OPEX", (s) => money(s.opex)], ["Annual revenue", (s) => money(s.revenue)], ["EBITDA", (s) => money(s.ebitda)], ["Simple payback", (s) => (s.payback ? `${num(s.payback, 1)} yr` : "—")]];
    return `<h2 class="fb-h">Compare scenarios</h2><p class="fb-p">Save up to three configurations and switch the 3D view between them.</p>
      <div class="fb-row fb-row--btns">${cols.map(({ i, name }) => `<button type="button" class="fb-btn" data-save="${i}" ${state ? "" : "disabled"}>Save current as ${name}</button>`).join("")}</div>
      <div class="fb-row fb-row--btns"><button type="button" class="fb-btn" data-examples>Load examples: 10 / 25 / 50 M L/year</button></div>
      <div class="fb-scroll"><table class="fb-t"><thead><tr><th></th>${cols.map(({ s, i, name }) => `<th>Scenario ${name}${s ? `<small>${esc(s.label)}</small><span><button type="button" data-show="${i}">Show in 3D</button><button type="button" data-clear="${i}" aria-label="Clear scenario ${name}">×</button></span>` : "<small>empty</small>"}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(([k, f]) => `<tr><td>${esc(k)}</td>${cols.map(({ s }) => `<td>${s ? f(s) : "—"}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <p class="fb-disc">${esc(DISCLOSURE)}</p>`;
  }
  function animateInvest() { const iv = state.inv; for (const k of ["capex", "revenue", "opex", "ebitda"]) { const el = side.querySelector(`[data-anim="${k}"]`); if (el) animate(el, iv[k], (v) => money(v), k); } }
  function animateGenerate() { const el = side.querySelector("[data-anim-l]"); if (el) animate(el, state.cfg.configuredL, (v) => ML(v), "configured"); }

  // ---------------------------------------------------------------- panel events
  side.addEventListener("submit", (e) => { if (e.target.closest("[data-form]")) { e.preventDefault(); readForm(); generate(); } });
  side.addEventListener("change", (e) => {
    const f = e.target.closest("[data-form]");
    if (f && ["period", "currency", "feedstock"].includes(e.target.name)) {
      if (e.target.name === "period") { const t = +f.target.value || 0; input.period = e.target.value; input.target = e.target.value === "day" ? Math.round((t * 1e6) / (+f.days.value || 350)) : +(t * (+f.days.value || 350) / 1e6).toFixed(1); }
      readForm(); render();
    }
    if (e.target.matches("[data-layer]")) { e.target.checked ? layers.add(e.target.dataset.layer) : layers.delete(e.target.dataset.layer); if (twin.energy) twin.energyFlow(false); twin.setNetworks([...layers]); }
    if (e.target.matches("[data-currency]")) { input.currency = e.target.value; render(); updateStrip(); }
  });
  side.addEventListener("input", (e) => {
    if (e.target.matches("[data-fin]")) { const v = e.target.value; if (v === "" || !isFinite(+v)) delete finOver[e.target.dataset.fin]; else finOver[e.target.dataset.fin] = +v; reinvest(); }
    if (e.target.matches("[data-rate]")) { const v = +e.target.value; if (v > 0) { rates[e.target.dataset.rate] = v; updateStrip(); } }
    if (e.target.matches("[data-search]")) { const q = e.target.value.trim().toLowerCase(); side.querySelectorAll("[data-row]").forEach((b) => { b.parentElement.hidden = q && !b.textContent.toLowerCase().includes(q); }); side.querySelectorAll(".fb-grp").forEach((g) => { g.hidden = q && !g.querySelector("li:not([hidden])"); }); }
  });
  side.addEventListener("click", (e) => {
    const b = (s) => e.target.closest(s);
    if (b("[data-view]")) { twin.setView(b("[data-view]").dataset.view); side.querySelectorAll("[data-view]").forEach((x) => x.setAttribute("aria-pressed", String(x === b("[data-view]")))); return; }
    if (b("[data-layers-all]")) { layers = new Set(Object.keys(twin.networks)); if (twin.energy) twin.energyFlow(false); twin.setNetworks([...layers]); render(); return; }
    if (b("[data-layers-none]")) { layers.clear(); if (twin.energy) twin.energyFlow(false); twin.setNetworks([]); render(); return; }
    if (b("[data-energy]")) { twin.energyFlow(!twin.energy); render(); return; }
    if (b("[data-home]")) { twin.home(); return; }
    if (b("[data-area]")) { if (twin.view === "realistic") twin.setView("process"); twin.focus(b("[data-area]").dataset.area); if (mobile()) root.classList.remove("side-open"); return; }
    const o = b("[data-obj]"); if (o) { twin.select(o.dataset.obj); showDetail(o.dataset.row); if (mobile()) root.classList.remove("side-open"); return; }
    if (b("[data-csv]")) { exportCsv(); return; }
    if (b("[data-fin-reset]")) { finOver = {}; rates = Object.fromEntries(Object.entries(CURRENCIES).map(([k, c]) => [k, c.rate])); reinvest(true); return; }
    if (b("[data-pricing]")) { openPricing(); return; }
    const sv = b("[data-save]"); if (sv) { scenarios[+sv.dataset.save] = summary(); saveScenarios(); render(); return; }
    const sh = b("[data-show]"); if (sh) { const s = scenarios[+sh.dataset.show]; input = { ...DEFAULTS, ...s.input }; finOver = { ...(s.finOver || {}) }; generate(); return; }
    const cl = b("[data-clear]"); if (cl) { scenarios[+cl.dataset.clear] = null; saveScenarios(); render(); return; }
    if (b("[data-examples]")) { runExamples(); return; }
  });
  function readForm() {
    const f = side.querySelector("[data-form]"); if (!f) return;
    const fd = new FormData(f); const o = {};
    for (const [k, v] of fd.entries()) o[k] = ["target", "days", "land", "utilization", "grainDays", "productDays", "budget"].includes(k) ? (v === "" ? NaN : +v) : v;
    input = { ...input, ...o };
  }

  // ---------------------------------------------------------------- generation pipeline (real stages)
  async function generate(opts = {}) {
    if (busy) return; busy = true; root.classList.add("is-busy");
    const err = side.querySelector("[data-err]"); if (err) err.hidden = true;
    const timings = [];
    const steps = STEPS.map((n) => ({ n, s: "wait" }));
    const show = () => { prog.hidden = false; prog.innerHTML = `<p class="fb-prog__t">Generating factory</p><div class="fb-prog__bar"><i style="width:${(steps.filter((x) => x.s === "done").length / steps.length) * 100}%"></i></div><ol>${steps.map((x) => `<li class="is-${x.s}">${esc(x.n)}</li>`).join("")}</ol>`; };
    const stage = async (i, fn) => { steps[i].s = "run"; show(); await frame(); const t0 = performance.now(); const r = await fn(); timings.push([STEPS[i], performance.now() - t0]); steps[i].s = "done"; show(); return r; };
    try {
      const v = await stage(0, () => { const lim = LIMITS.target[input.period]; if (!isFinite(input.target) || input.target <= 0) throw new InputError("Enter a positive production target."); if (input.target < lim[0] || input.target > lim[1]) throw new InputError(`The target must be between ${num(lim[0])} and ${num(lim[1])} ${input.period === "year" ? "million litres per year" : "litres per day"}.`); if (!isFinite(input.days) || input.days < LIMITS.days[0] || input.days > LIMITS.days[1]) throw new InputError(`Operating days must be between ${LIMITS.days[0]} and ${LIMITS.days[1]}.`); return true; });
      const cfg = await stage(1, () => configure(input, finOver));
      const g = await stage(2, () => generateFactory(cfg));
      await stage(3, () => g.checks);
      const nt = await stage(4, async () => {
        if (twin) { try { twin.dispose(); } catch {} twin = null; }
        const tw = await createTwin(canvasBox, g.F, { lang: "en", mode: "dashboard", thermalLabel: "Operating temperature (illustrative)" });
        return tw;
      });
      twin = nt; layers.clear();
      const iv = await stage(5, () => invest(cfg, g.stats));
      const engineChecks = [...(twin.validation.orphans || []).map((id) => ({ level: "error", msg: `Connection ${id} could not be attached (missing equipment or port).` })), ...(twin.validation.crossings && twin.validation.crossings.length ? [{ level: "warn", msg: `${twin.validation.crossings.length} conceptual pipe routes pass over or through equipment envelopes (e.g. ${twin.validation.crossings.slice(0, 3).join(", ")}) — routing needs engineering review.` }] : [])];
      state = { cfg, F: g.F, inventory: g.inventory, stats: g.stats, checks: g.checks, engineChecks, inv: iv, timings };
      twin.on("select", (it) => { if (it) showDetail(null, it.id); else hideDetail(); });
      twin.on("link", (l) => { if (l) showLinkDetail(l); });
      $("[data-hero]")?.classList.add("is-small");
      updateStrip();
      if (!opts.keepNav) go(opts.nav || "generate");
    } catch (e) {
      if (!(e instanceof InputError)) console.error(e);
      const er = side.querySelector("[data-err]"); if (er) { er.textContent = e.message; er.hidden = false; } else alert(e.message);
      steps.forEach((x) => { if (x.s === "run") x.s = "fail"; }); show();
    } finally {
      busy = false; root.classList.remove("is-busy");
      setTimeout(() => { if (!busy) prog.hidden = true; }, 900);
    }
  }
  function reinvest(rerender) { if (!state) return; const cfg = configure(input, finOver); state.cfg.fin = cfg.fin; state.inv = invest(state.cfg, state.stats); if (rerender) render(); else { const keep = side.scrollTop, act = document.activeElement?.dataset?.fin; render(); side.scrollTop = keep; if (act) { const el = side.querySelector(`[data-fin="${act}"]`); if (el) { el.focus(); const v = el.value; el.value = ""; el.value = v; } } } updateStrip(); }

  // ---------------------------------------------------------------- KPI strip over the viewport
  function updateStrip() {
    if (!state) return;
    const c = state.cfg, iv = state.inv;
    $("[data-strip]").innerHTML = [["Target", ML(c.flows.Ly)], ["Configured", ML(c.configuredL)], ["Equipment", num(state.stats.equipmentCount)], ["Site", `${num(state.stats.siteArea / 1e4, 1)} ha`], ["CAPEX", money(iv.capex)], ["EBITDA", money(iv.ebitda)], ["Payback", iv.payback ? `${num(iv.payback, 1)} yr` : "—"]]
      .map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join("");
  }

  // ---------------------------------------------------------------- equipment explorer (detail drawer)
  const stageOf = (id) => state.inventory.find((r) => r.id === id || r.obj === id);
  function showDetail(rowId, objId) {
    if (!state) return;
    const e = state.F.equipment.find((x) => x.id === (objId || stageOf(rowId)?.obj)); if (!e) return;
    const rows = state.inventory.filter((r) => r.obj === e.id || r.id === e.id);
    const r0 = rows.find((r) => r.id === rowId) || rows[0];
    const cat = state.F.catalog[e.kind] || {}, dept = DEPARTMENTS[e.area] || {}, s = r0 && r0.stage;
    const mine = twin.links.filter((l) => l.from === e.id || l.to === e.id);
    const byNet = Object.keys(twin.networks).map((k) => [k, mine.filter((l) => l.net === k)]).filter(([, ls]) => ls.length);
    const nameOf = (id) => { const r = state.inventory.find((x) => x.id === id || x.obj === id); return r ? r.name : (state.F.catalog[state.F.equipment.find((x) => x.id === id)?.kind] || {}).name || id; };
    detail.innerHTML = `<button type="button" class="fb-x" data-detail-close aria-label="Close">×</button>
      <p class="fb-d__dept"><i style="background:${hex(dept.color || 0x888888)}"></i>${esc(dept.name || "")}</p>
      <h3 class="fb-d__name">${esc(r0 ? r0.name : cat.name || e.kind)}</h3><p class="fb-d__id"><code>${esc(r0 ? r0.id : e.id)}</code>${r0 && r0.standby ? ' <em class="fb-chip">standby</em>' : ""}</p>
      <p class="fb-d__fn">${esc(cat.fn || "")}</p>
      <table class="fb-spec"><tbody>
        ${s ? `<tr><th>Equipment category</th><td>${esc(s.category)}</td></tr><tr><th>Equipment type</th><td>${esc(s.name)} <code>${esc(s.type)}</code></td></tr>` : ""}
        ${r0 && r0.cap ? `<tr><th>Illustrative capacity</th><td>${num(r0.cap, r0.cap < 10 ? 1 : 0)} ${esc(r0.unit)} per unit</td></tr>` : ""}
        ${s ? `<tr><th>Stage quantity</th><td>${s.n} operating${s.standby ? ` + ${s.standby} standby` : ""} · combined ${num(s.installedCap, s.installedCap < 10 ? 1 : 0)} ${esc(s.unit)}</td></tr><tr><th>Utilization</th><td>${num(s.util * 100, 0)} %${s.extra.autonomy ? ` · ${num(s.extra.autonomy, 1)} days autonomy` : ""}</td></tr>` : ""}
        ${r0 && r0.dims ? `<tr><th>Dimensions</th><td>${esc(r0.dims)}</td></tr>` : ""}
        ${r0 ? `<tr><th>Estimated purchase price</th><td>${money(r0.price, 2)}</td></tr><tr><th>Installation estimate</th><td>${money(r0.install, 2)}</td></tr>` : `<tr><th>Price</th><td>Included in the department budget</td></tr>`}
        ${s ? `<tr><th>Supporting infrastructure</th><td>${esc(s.aux)}</td></tr>` : ""}
      </tbody></table>
      ${byNet.length ? `<p class="fb-k">Connected infrastructure</p>${byNet.map(([k, ls]) => `<p class="fb-net"><i style="background:${hex(twin.networks[k].color)}"></i>${esc(twin.networks[k].name)}</p><ul class="fb-links">${ls.map((l) => `<li><button type="button" data-goto="${esc(l.from === e.id ? l.to : l.from)}">${l.from === e.id ? "→" : "←"} ${esc(nameOf(l.from === e.id ? l.to : l.from))} <small>${esc(l.name)} · <code>${esc(l.id)}</code></small></button></li>`).join("")}</ul>`).join("")}` : ""}
      <p class="fb-k">Data sources and assumptions</p>
      <p class="fb-note">${s ? `${tag(s.tag)} ${esc(s.note || "Unit size, price and installation factor are illustrative assumptions from the FactoryBuilder catalogue.")}` : tag("a") + " Auxiliary item with an illustrative budget price."} Requires professional engineering validation.</p>`;
    root.classList.add("detail-open");
  }
  function showLinkDetail(l) {
    const n = twin.networks[l.net];
    detail.innerHTML = `<button type="button" class="fb-x" data-detail-close aria-label="Close">×</button><p class="fb-d__dept"><i style="background:${hex(n.color)}"></i>${esc(n.name)}</p><h3 class="fb-d__name">${esc(l.name)}</h3><p class="fb-d__id"><code>${esc(l.id)}</code></p>
      <table class="fb-spec"><tbody><tr><th>From</th><td><button type="button" data-goto="${esc(l.from)}"><code>${esc(l.from)}</code></button></td></tr><tr><th>To</th><td><button type="button" data-goto="${esc(l.to)}"><code>${esc(l.to)}</code></button></td></tr><tr><th>Route length</th><td>≈ ${num(l.len)} m</td></tr></tbody></table>
      <p class="fb-note">Conceptual connection generated from equipment IDs and attachment points — not verified infrastructure.</p>`;
    root.classList.add("detail-open");
  }
  const hideDetail = () => root.classList.remove("detail-open");
  detail.addEventListener("click", (e) => { if (e.target.closest("[data-detail-close]")) { twin && twin.select(null, false); hideDetail(); return; } const g = e.target.closest("[data-goto]"); if (g) twin.select(g.dataset.goto); });

  // ---------------------------------------------------------------- CSV export
  function exportCsv() {
    const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const c = state.cfg, rate = rates[input.currency];
    const lines = [["3DNA FactoryBuilder — conceptual equipment list"], [DISCLOSURE], [`Target ${ML(c.flows.Ly)}/year · configured ${ML(c.configuredL)}/year · ${PRODUCTS[input.product].name} · ${FEEDSTOCKS[input.feedstock].name} · currency ${input.currency}`], [],
      ["Equipment ID", "Name", "Department", "Category", "Type", "Unit capacity", "Capacity unit", "Standby", "Purchase price", "Installation", "Basis"],
      ...state.inventory.map((r) => [r.id, r.name, DEPARTMENTS[r.dept]?.name, r.stage?.category || "Auxiliary", r.stage?.type || "", r.cap ?? "", r.unit, r.standby ? "yes" : "", Math.round(r.price * rate), Math.round(r.install * rate), r.stage ? (r.stage.tag === "v" ? "Public figure + assumption" : "Assumption") : "Assumption"])];
    const blob = new Blob(["﻿" + lines.map((l) => l.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `3dna-factorybuilder-equipment-${num(c.flows.Ly / 1e6, 0)}ML.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------------------------------------------------------------- scenarios
  const summary = () => { const c = state.cfg, S = c.S; return { label: `${ML(c.flows.Ly)} · ${FEEDSTOCKS[input.feedstock].name}`, input: { ...input }, finOver: { ...finOver }, produced: c.producedL, configured: c.configuredL, ferm: `${S.ferm.units} × ${num(S.ferm.unitCap)} m³`, trains: S.dist.units, tanks: `${S.store.units} × ${num(S.store.unitCap)} m³`, equipment: state.stats.equipmentCount, site: state.stats.siteArea, capex: state.inv.capex, opex: state.inv.opex, revenue: state.inv.revenue, ebitda: state.inv.ebitda, payback: state.inv.payback }; };
  const saveScenarios = () => { try { localStorage.setItem(STORE, JSON.stringify(scenarios)); } catch {} };
  async function runExamples() {
    for (const [i, t] of [[0, 10], [1, 25], [2, 50]].map(([i, t]) => [i, t])) { input = { ...input, target: t, period: "year" }; await generate({ keepNav: true }); if (state) scenarios[i] = summary(); }
    saveScenarios(); go("compare");
  }

  // ---------------------------------------------------------------- lead generation (existing WhatsApp contact)
  const wa = root.dataset.wa;
  const leadText = (pkg) => {
    if (!state) return "Hello 3DNA, I would like to discuss an industrial digital twin.";
    const c = state.cfg, S = c.S, iv = state.inv;
    return [`Hello 3DNA, I would like to turn my FactoryBuilder concept into a project.`, `Target: ${ML(c.flows.Ly)}/year (${num(c.flows.dayL)} L/day), ${PRODUCTS[input.product].name}, ${FEEDSTOCKS[input.feedstock].name}, ${input.days} days/year.`,
      `Configuration: ${S.ferm.units} fermenters × ${num(S.ferm.unitCap)} m³, ${S.dist.units} distillation train(s), ${S.store.units} storage tanks × ${num(S.store.unitCap)} m³, ${state.stats.equipmentCount} equipment items, site ≈ ${num(state.stats.siteArea / 1e4, 1)} ha.`,
      `Indicative CAPEX: ${money(iv.capex)} (conceptual estimate).`, pkg ? `Digital twin package: ${pkg}.` : ""].filter(Boolean).join("\n");
  };
  const waUrl = (pkg) => `https://wa.me/${wa}?text=${encodeURIComponent(leadText(pkg))}`;
  root.addEventListener("click", (e) => { if (e.target.closest("[data-cta-main]")) window.open(waUrl(), "_blank", "noopener"); else if (e.target.closest("[data-cta-twin]")) openPricing(); });
  const pm = $("[data-pricing-modal]");
  function openPricing() {
    pm.querySelector("[data-pkgs]").innerHTML = (ui.pricing.packages || []).map((p, i) => `<label class="fb-pkg"><input type="radio" name="fb-pkg" value="${esc(p.name)} (${esc(p.range)})"${p.recommended ? " checked" : !i && !(ui.pricing.packages || []).some((x) => x.recommended) ? " checked" : ""}><b>${esc(p.name)}</b><span>${esc(p.range)}</span><small>${esc(p.text)}</small></label>`).join("");
    pm.hidden = false; pm.querySelector("input:checked")?.focus();
  }
  pm.addEventListener("click", (e) => {
    if (e.target.closest("[data-pricing-close]")) { pm.hidden = true; return; }
    if (e.target.closest("[data-pricing-send]")) { const v = pm.querySelector("input:checked")?.value; window.open(waUrl(v), "_blank", "noopener"); pm.hidden = true; }
  });
  pm.addEventListener("keydown", (e) => { if (e.key === "Escape") pm.hidden = true; });

  // ---------------------------------------------------------------- start: open Configure and generate the default plant
  root.classList.toggle("side-open", !mobile());
  render();
  await generate({ nav: mobile() ? "generate" : "configure" });
  if (mobile()) root.classList.remove("side-open");
  return { get state() { return state; }, generate, get twin() { return twin; }, setInput: (o) => { input = { ...input, ...o }; render(); } };
}
