/*
 * 3DNA Digital Twin — dashboard (generic UI around the engine).
 *   mountDashboard(root, factory, ui, lang)
 * root: the .tw element of templates/industrial-plant.html; factory: a config from ./factories/;
 * ui: interface text (assets/i18n/industrial.json → twin, embedded in the page as JSON).
 * Panels: equipment list (by area) · process steps and stream legend · selected equipment ·
 * investment calculator (CAPEX / OPEX) · production analytics. All figures come from the factory's
 * finance model and are illustrative.
 */
import { createTwin, tr, nameOf } from "./engine.js?v=ind1";

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hex = (n) => "#" + n.toString(16).padStart(6, "0");

export async function mountDashboard(root, F, ui, lang) {
  const t = ui;
  const loc = lang === "es" ? "es-ES" : "en-GB";
  const num = (v, d = 0) => v == null || !isFinite(v) ? "—" : v.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: "always" });
  const meur = (v) => `${num(v / 1e6, 1)} M€`;
  const $ = (s) => root.querySelector(s);
  const stage = $("[data-stage]");

  // ---------------------------------------------------------------- engine
  const loading = $("[data-loading]");
  let twin;
  try {
    twin = await createTwin(stage, F, { lang, mode: "dashboard" });
  } catch (e) {
    console.error(e);
    loading.textContent = t.webglError; return;
  }
  loading.hidden = true;

  // ---------------------------------------------------------------- views + tools
  root.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
    twin.setView(b.dataset.view);
    root.querySelectorAll("[data-view]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    root.classList.toggle("is-process", b.dataset.view === "process");
  }));
  $("[data-home]").addEventListener("click", () => twin.home());
  const fsBtn = $("[data-fullscreen]");
  fsBtn.addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen?.().catch(() => {}); });
  document.addEventListener("fullscreenchange", () => { fsBtn.setAttribute("aria-pressed", String(!!document.fullscreenElement)); setTimeout(() => twin.resize(), 60); });
  root.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
    const side = b.dataset.toggle, open = !root.classList.contains(`${side}-open`);
    root.classList.toggle(`${side}-open`, open);
    if (matchMedia("(max-width: 900px)").matches && open) root.classList.remove(side === "left" ? "right-open" : "left-open");
    setTimeout(() => twin.resize(), 320);
  }));
  if (matchMedia("(max-width: 900px)").matches) root.classList.remove("left-open", "right-open");
  // tabs
  root.querySelectorAll("[data-tabs]").forEach((box) => box.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => openTab(box, b.dataset.tab))));
  function openTab(box, id) {
    box.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.tab === id)));
    box.querySelectorAll("[data-pane]").forEach((p) => { p.hidden = p.dataset.pane !== id; });
  }

  // ---------------------------------------------------------------- equipment list
  const list = $("[data-equipment]");
  const visibleItems = F.equipment.filter((e) => !["bund", "rack", "truck", "conveyor"].includes(e.kind) || e.kind === "rack");
  list.innerHTML = F.areas.map((a) => {
    const rows = visibleItems.filter((e) => e.area === a.id);
    if (!rows.length) return "";
    return `<details class="tw-group" open><summary><i style="background:${hex(a.color)}"></i><span>${a.step}. ${esc(tr(a.name, lang))}</span><em>${rows.length}</em></summary>
      <ul>${rows.map((e) => `<li><button type="button" data-eq="${e.id}">${esc(nameOf(F, e, lang))}</button></li>`).join("")}</ul></details>`;
  }).join("");
  list.addEventListener("click", (ev) => { const b = ev.target.closest("[data-eq]"); if (b) twin.select(b.dataset.eq); });
  $("[data-search]").addEventListener("input", (ev) => {
    const q = ev.target.value.trim().toLowerCase();
    list.querySelectorAll("[data-eq]").forEach((b) => { b.parentElement.hidden = q && !b.textContent.toLowerCase().includes(q); });
    list.querySelectorAll(".tw-group").forEach((g) => { g.hidden = q && !g.querySelector("li:not([hidden])"); if (q) g.open = true; });
  });

  // ---------------------------------------------------------------- process steps + streams
  $("[data-steps]").innerHTML = F.areas.map((a) => `<li><button type="button" data-area="${a.id}"><span class="tw-step__n" style="--c:${hex(a.color)}">${String(a.step).padStart(2, "0")}</span><span><b>${esc(tr(a.name, lang))}</b><small>${esc(tr(a.desc, lang))}</small></span></button></li>`).join("");
  $("[data-steps]").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-area]"); if (!b) return;
    if (twin.view === "realistic") root.querySelector('[data-view="process"]').click();
    twin.focus(b.dataset.area);
    $("[data-steps]").querySelectorAll("[data-area]").forEach((x) => x.classList.toggle("is-on", x === b));
  });
  const legend = $("[data-streams]");
  legend.innerHTML = Object.entries(F.streams).map(([k, s]) => `<button type="button" data-stream="${k}" aria-pressed="false"><i style="background:${hex(s.color)}"></i>${esc(tr(s.name, lang))}</button>`).join("");
  legend.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-stream]"); if (!b) return;
    const on = b.getAttribute("aria-pressed") !== "true";
    legend.querySelectorAll("[data-stream]").forEach((x) => x.setAttribute("aria-pressed", String(on && x === b)));
    if (twin.view === "realistic") root.querySelector('[data-view="process"]').click();
    twin.highlightStream(on ? b.dataset.stream : null);
  });

  // ---------------------------------------------------------------- selected equipment
  const detail = $("[data-detail]");
  const rightTabs = root.querySelector(".tw__right [data-tabs]");
  function showDetail(it) {
    list.querySelectorAll("[data-eq]").forEach((b) => b.classList.toggle("is-on", it && b.dataset.eq === it.id));
    if (!it) { detail.innerHTML = `<p class="tw-empty">${esc(t.detailEmpty)}</p>`; return; }
    const c = F.catalog[it.kind] || {}, a = F.areas.find((x) => x.id === it.area) || {};
    const links = F.connections.filter((x) => x.from === it.id || x.to === it.id);
    detail.innerHTML = `<p class="tw-detail__area"><i style="background:${hex(a.color || 0x888888)}"></i>${a.step ? a.step + ". " : ""}${esc(tr(a.name, lang))}</p>
      <h3 class="tw-detail__name">${esc(nameOf(F, it, lang))}</h3>
      <p class="tw-detail__fn">${esc(tr(c.fn, lang))}</p>
      ${c.specs && c.specs.length ? `<table class="tw-specs"><tbody>${c.specs.map(([k, v]) => `<tr><th>${esc(tr(k, lang))}</th><td>${esc(tr(v, lang))}</td></tr>`).join("")}</tbody></table>` : ""}
      ${links.length ? `<p class="tw-detail__k">${esc(t.connections)}</p><ul class="tw-links">${links.map((x) => { const other = F.equipment.find((e) => e.id === (x.from === it.id ? x.to : x.from)); const s = F.streams[x.stream]; return `<li><button type="button" data-eq="${other.id}"><i style="background:${hex(s.color)}"></i>${x.from === it.id ? "→" : "←"} ${esc(nameOf(F, other, lang))}<small>${esc(tr(s.name, lang))}</small></button></li>`; }).join("")}</ul>` : ""}
      <p class="tw-note">${esc(t.illustrative)}</p>`;
    if (rightTabs) openTab(rightTabs, "detail");
    if (!root.classList.contains("right-open") && !matchMedia("(max-width: 900px)").matches) { root.classList.add("right-open"); setTimeout(() => twin.resize(), 320); }
  }
  detail.addEventListener("click", (ev) => { const b = ev.target.closest("[data-eq]"); if (b) twin.select(b.dataset.eq); });
  twin.on("select", showDetail);
  showDetail(null);

  // ---------------------------------------------------------------- investment calculator
  const fin = F.finance, values = Object.fromEntries(fin.inputs.map((i) => [i.id, i.def]));
  const groups = [["plant", t.groups.plant], ["market", t.groups.market], ["invest", t.groups.invest]];
  $("[data-inputs]").innerHTML = groups.map(([g, label]) => `<fieldset><legend>${esc(label)}</legend>${fin.inputs.filter((i) => i.group === g).map((i) => `
      <label class="tw-range"><span class="tw-range__top"><span>${esc(tr(i.label, lang))}</span><output data-out="${i.id}"></output></span>
      <input type="range" min="${i.min}" max="${i.max}" step="${i.step}" value="${i.def}" data-in="${i.id}" aria-label="${esc(tr(i.label, lang))}"></label>`).join("")}</fieldset>`).join("") +
    `<button type="button" class="tw-reset" data-reset>${esc(t.reset)}</button>`;
  const unitOf = (i) => tr(i.unit, lang);
  const decimals = (i) => (String(i.step).split(".")[1] || "").length;
  function recalc() {
    for (const i of fin.inputs) $(`[data-out="${i.id}"]`).textContent = `${num(values[i.id], decimals(i))} ${unitOf(i)}`;
    const r = fin.compute(values, fin.constants);
    // KPIs
    const kpis = [
      [t.kpi.capex, meur(r.capex)], [t.kpi.revenue, meur(r.revenue)], [t.kpi.opex, meur(r.opex)],
      [t.kpi.ebitda, meur(r.ebitda), r.ebitda < 0], [t.kpi.margin, `${num(r.margin * 100, 1)} %`, r.margin < 0],
      [t.kpi.payback, r.payback ? `${num(r.payback, 1)} ${t.years}` : t.noPayback, !r.payback], [t.kpi.costPerL, `${num(r.costPerL, 3)} €/L`]
    ];
    $("[data-kpis]").innerHTML = kpis.map(([k, v, bad]) => `<div class="tw-kpi${bad ? " is-bad" : ""}"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("");
    // CAPEX by area (bars)
    const split = fin.capexSplit.map(([id, p]) => [id === "civil" ? tr(fin.civil, lang) : tr((F.areas.find((a) => a.id === id) || {}).name, lang), p * r.capex, (F.areas.find((a) => a.id === id) || {}).color || 0x64748b]);
    const max = Math.max(...split.map((s) => s[1]));
    $("[data-capex]").innerHTML = split.map(([n, v, c]) => `<li><span class="tw-bar__l">${esc(n)}</span><span class="tw-bar"><i style="width:${(v / max) * 100}%;background:${hex(c)}"></i></span><span class="tw-bar__v">${meur(v)}</span></li>`).join("");
    // OPEX donut
    const cols = { feed: "#f2c14e", energy: "#f87171", chem: "#a855f7", fixed: "#60a5fa" };
    let acc = 0; const C = 2 * Math.PI * 40;
    $("[data-opex]").innerHTML = `<svg viewBox="0 0 120 120" class="tw-donut" role="img" aria-label="${esc(t.opexTitle)}">${r.opexSplit.map(([k, v]) => { const f = v / r.opex, seg = `<circle cx="60" cy="60" r="40" fill="none" stroke="${cols[k]}" stroke-width="18" stroke-dasharray="${f * C} ${C}" stroke-dashoffset="${-acc * C}" transform="rotate(-90 60 60)"></circle>`; acc += f; return seg; }).join("")}<text x="60" y="57" text-anchor="middle" class="tw-donut__v">${num(r.opex / 1e6, 0)}</text><text x="60" y="72" text-anchor="middle" class="tw-donut__u">M€/${esc(t.yearShort)}</text></svg>
      <ul class="tw-legend">${r.opexSplit.map(([k, v]) => `<li><i style="background:${cols[k]}"></i><span>${esc(t.opex[k])}</span><b>${num((v / r.opex) * 100, 0)} %</b></li>`).join("")}</ul>`;
    // production
    const d = r.daily, a = r.annual;
    $("[data-prod]").innerHTML = [[t.prod.ethanol, `${num(d.ethanol, 0)} m³/${t.dayShort}`, `${num(a.ethanol, 0)} m³/${t.yearShort}`], [t.prod.grain, `${num(d.grain, 0)} t/${t.dayShort}`, `${num(a.grain, 0)} t/${t.yearShort}`], [t.prod.ddgs, `${num(d.ddgs, 0)} t/${t.dayShort}`, `${num(a.ddgs, 0)} t/${t.yearShort}`], [t.prod.co2, `${num(d.co2, 0)} t/${t.dayShort}`, `${num(a.co2, 0)} t/${t.yearShort}`]]
      .map(([k, v, y]) => `<div class="tw-kpi"><span>${esc(k)}</span><b>${esc(v)}</b><small>${esc(y)}</small></div>`).join("");
    const mmax = Math.max(...r.monthly);
    $("[data-monthly]").innerHTML = r.monthly.map((m, i) => `<li title="${esc(t.months[i])}: ${num(m, 0)} m³"><i style="height:${(m / mmax) * 100}%"></i><span>${esc(t.months[i].slice(0, 1))}</span></li>`).join("");
    // KPI strip on the stage
    $("[data-strip]").innerHTML = [[t.strip.capacity, `${num(values.capacity, 0)} ${unitOf(fin.inputs[0])}`], [t.strip.ethanol, `${num(d.ethanol, 0)} m³/${t.dayShort}`], [t.strip.grain, `${num(d.grain, 0)} t/${t.dayShort}`], [t.strip.capex, meur(r.capex)], [t.strip.payback, r.payback ? `${num(r.payback, 1)} ${t.years}` : t.noPayback]]
      .map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("");
  }
  root.querySelector("[data-inputs]").addEventListener("input", (ev) => { const i = ev.target.closest("[data-in]"); if (!i) return; values[i.dataset.in] = parseFloat(i.value); recalc(); });
  root.querySelector("[data-reset]").addEventListener("click", () => { for (const i of fin.inputs) { values[i.id] = i.def; $(`[data-in="${i.id}"]`).value = i.def; } recalc(); });
  recalc();
  return twin;
}
