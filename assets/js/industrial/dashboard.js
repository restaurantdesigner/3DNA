/*
 * 3DNA Digital Twin — dashboard (generic UI around the engine).
 *   mountDashboard(root, factory, ui, lang)
 * root: the .tw element of templates/industrial-plant.html; factory: a config from ./factories/;
 * ui: interface text (assets/i18n/industrial.json → twin, embedded in the page as JSON).
 * Left panel: project (case study) · equipment list · process steps and streams.
 * Right panel: selected equipment / network connection · investment (CAD) · production · data sources.
 * Stage: Engineering Networks layers (select all / hide all / reset), Trace Connections, Energy Flow.
 * All figures come from the factory's data module and finance model; they are illustrative.
 */
import { createTwin, tr, nameOf } from "./engine.js?v=ind3";

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hex = (n) => "#" + n.toString(16).padStart(6, "0");
const FLAG = `<svg class="tw-flag" viewBox="0 0 24 12" width="22" height="11" role="img" aria-label="Canada"><rect width="24" height="12" fill="#fff"/><rect width="6" height="12" fill="#d52b1e"/><rect x="18" width="6" height="12" fill="#d52b1e"/><path d="M12 2.2l.75 1.45 .9-.4-.35 2.1 1.15-1.05.25.75 1.2-.2-.45 1.35.55.3-2.2 1.75.25.85-1.85-.25V10h-.5V8.85l-1.85.25.25-.85-2.2-1.75.55-.3-.45-1.35 1.2.2.25-.75 1.15 1.05-.35-2.1.9.4z" fill="#d52b1e"/></svg>`;
const PIN = `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="2.5" fill="currentColor"/></svg>`;

export async function mountDashboard(root, F, ui, lang) {
  const t = ui, fin = F.finance, cur = fin.currency || { symbol: "€", locale: "en-GB" };
  const num = (v, d = 0) => v == null || !isFinite(v) ? "—" : v.toLocaleString(cur.locale || "en-CA", { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: "always" });
  const money = (v, d = 1) => `${v < 0 ? "−" : ""}${cur.symbol}${num(Math.abs(v) / 1e6, d)} M`;
  const $ = (s) => root.querySelector(s);
  const stage = $("[data-stage]");
  const mobile = () => matchMedia("(max-width: 900px)").matches;
  const srcLink = (k) => { const s = (F.sources || {})[k]; return s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title.split(" — ")[0])}</a>` : ""; };

  // phones: panels start closed (bottom sheets), before the 3D model loads
  if (mobile()) root.classList.remove("left-open", "right-open");
  setTimeout(() => root.classList.add("tw-anim"), 400);           // panel transitions only after the first layout

  // ---------------------------------------------------------------- engine
  const loading = $("[data-loading]");
  let twin;
  try { twin = await createTwin(stage, F, { lang, mode: "dashboard" }); }
  catch (e) { console.error(e); loading.textContent = t.webglError; return; }
  loading.hidden = true;
  const NET = twin.networks;

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
  const labelToggles = () => root.querySelectorAll("[data-toggle]").forEach((b) => {
    const side = b.dataset.toggle, open = root.classList.contains(`${side}-open`), name = side === "left" ? t.panels.left : t.panels.right;
    b.setAttribute("aria-expanded", String(open)); b.setAttribute("aria-label", open ? `${t.hidePanel}: ${name}` : name); b.title = open ? `${t.hidePanel}: ${name}` : name;
  });
  root.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
    const side = b.dataset.toggle, open = !root.classList.contains(`${side}-open`);
    root.classList.toggle(`${side}-open`, open);
    labelToggles();
    if (mobile() && open) root.classList.remove(side === "left" ? "right-open" : "left-open");
    setTimeout(() => twin.resize(), 320);
  }));
  labelToggles();
  root.querySelectorAll("[data-tabs]").forEach((box) => box.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => openTab(box, b.dataset.tab))));
  function openTab(box, id) {
    box.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.tab === id)));
    box.querySelectorAll("[data-pane]").forEach((p) => { p.hidden = p.dataset.pane !== id; });
  }
  const rightTabs = root.querySelector(".tw__right [data-tabs]");
  const showRight = (tab) => { if (rightTabs) openTab(rightTabs, tab); if (!root.classList.contains("right-open") && !mobile()) { root.classList.add("right-open"); labelToggles(); setTimeout(() => twin.resize(), 320); } };

  // ---------------------------------------------------------------- project (case study)
  const P = F.project;
  if (P) {
    const rows = [[t.project.country, `${FLAG}<span>${esc(P.country)}</span>`], [t.project.province, esc(P.province)], [t.project.location, `${PIN}<span>${esc(P.location)}</span>`], [t.project.industry, esc(P.industry)], [t.project.technology, esc(P.technology)], [t.project.status, `<span class="tw-status">${esc(P.status)}</span>`], [t.project.developer, esc(P.developer)], [t.project.reference, `<a href="${esc(P.reference.url)}" target="_blank" rel="noopener noreferrer">${esc(P.reference.name)}</a>`]];
    const key = (F.verified || []).filter((v) => ["Current ethanol production", "Daily output and grain", "Fermentation", "Distillation / dehydration", "Feedlot"].includes(v.k));
    $("[data-project]").innerHTML = `<div class="tw-proj__head">${FLAG}<span>${esc(P.location)}, ${esc(P.province)} · ${esc(P.country)}</span></div>
      <h2 class="tw-proj__title">${esc(P.title)}</h2>
      <p class="tw-proj__intro">${esc(P.intro)}</p>
      <dl class="tw-proj__grid">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>
      <p class="tw-k">${esc(t.project.keyFacts)}</p>
      <ul class="tw-facts">${key.map((v) => `<li><span>${esc(v.k)}</span><b>${esc(v.v)}</b><em class="tw-tag tw-tag--v">${esc(t.tags.v)}</em></li>`).join("")}</ul>
      <button type="button" class="tw-linkbtn" data-open-sources>${esc(t.project.openSources)}</button>
      <p class="tw-disclosure">${esc(P.disclosure)}</p>
      `;
    $("[data-open-sources]").addEventListener("click", () => showRight("sources"));
  }

  // ---------------------------------------------------------------- data sources & assumptions
  if (F.sources) {
    const A = F.assumptions;
    $("[data-sources]").innerHTML = `<p class="tw-srcintro">${esc(t.sources.intro)}</p>
      <p class="tw-k">${esc(t.sources.verified)} <em class="tw-tag tw-tag--v">${esc(t.tags.v)}</em></p>
      <ul class="tw-src">${F.verified.map((v) => `<li><b>${esc(v.k)}</b><span>${esc(v.v)}</span><small>${srcLink(v.src)}</small></li>`).join("")}</ul>
      <p class="tw-k">${esc(t.sources.benchmarks)} <em class="tw-tag tw-tag--b">${esc(t.tags.b)}</em></p>
      <ul class="tw-src">${F.benchmarks.map((v) => `<li><b>${esc(v.k)}</b><span>${esc(v.v)}</span><small>${srcLink(v.src)}</small></li>`).join("")}</ul>
      <p class="tw-k">${esc(t.sources.assumptions)} <em class="tw-tag tw-tag--a">${esc(t.tags.a)}</em></p>
      <ul class="tw-src">${Object.values(A).map((a) => `<li><b>${num(a.v, String(a.v).includes(".") ? String(a.v).split(".")[1].length : 0)} ${esc(a.unit)}</b><span>${esc(a.basis)}</span>${a.src ? `<small>${srcLink(a.src)}</small>` : ""}</li>`).join("")}</ul>
      <p class="tw-k">${esc(t.sources.networks)} <em class="tw-tag tw-tag--c">${esc(t.tags.c)}</em></p>
      <p class="tw-srcintro">${esc(F.project.networksNote)}</p>
      <p class="tw-k">${esc(t.sources.list)}</p>
      <ol class="tw-srclist">${Object.values(F.sources).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a> <small>${esc(t.sources.accessed)} ${esc(s.accessed)}</small></li>`).join("")}</ol>
      <p class="tw-disclosure">${esc(F.project.disclosure)}</p>`;
  }

  // ---------------------------------------------------------------- equipment list
  const list = $("[data-equipment]");
  const visibleItems = F.equipment.filter((e) => !e.decor && !["bund", "truck", "conveyor"].includes(e.kind));
  list.innerHTML = F.areas.map((a) => {
    const rows = visibleItems.filter((e) => e.area === a.id);
    if (!rows.length) return "";
    return `<details class="tw-group"${a.step <= 8 ? " open" : ""}><summary><i style="background:${hex(a.color)}"></i><span>${a.step}. ${esc(tr(a.name, lang))}</span><em>${rows.length}</em></summary>
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
    twin.highlightStream(on ? b.dataset.stream : null);
    syncLayers();
  });

  // ---------------------------------------------------------------- engineering networks panel
  const netBox = $("[data-networks]");
  const counts = Object.fromEntries(Object.keys(NET).map((k) => [k, twin.links.filter((l) => l.net === k).length]));
  netBox.innerHTML = `<button type="button" class="tw-nets__head" aria-expanded="false"><span>${esc(t.networks.title)}</span><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
    <div class="tw-nets__body" hidden>
      <ul class="tw-nets__list">${Object.entries(NET).filter(([k]) => counts[k]).map(([k, n]) => `<li><label><input type="checkbox" data-net="${k}"><i style="background:${hex(n.color)}"></i><span>${esc(n.name)}</span><em>${counts[k]}</em></label></li>`).join("")}</ul>
      <div class="tw-nets__btns"><button type="button" data-net-all>${esc(t.networks.all)}</button><button type="button" data-net-none>${esc(t.networks.none)}</button><button type="button" data-net-reset>${esc(t.networks.reset)}</button></div>
      <label class="tw-nets__trace"><input type="checkbox" data-trace><span>${esc(t.networks.trace)}</span></label>
      <button type="button" class="tw-nets__energy" data-energy aria-pressed="false">${esc(t.networks.energy)}</button>
      <p class="tw-nets__note">${esc(t.networks.note)}</p>
    </div>`;
  netBox.querySelector(".tw-nets__head").addEventListener("click", (e) => { const h = e.currentTarget, open = h.getAttribute("aria-expanded") !== "true"; h.setAttribute("aria-expanded", String(open)); netBox.querySelector(".tw-nets__body").hidden = !open; });
  const syncLayers = () => {
    const on = new Set(twin.activeNetworks);
    netBox.querySelectorAll("[data-net]").forEach((c) => { c.checked = on.has(c.dataset.net); });
    netBox.querySelector("[data-energy]").setAttribute("aria-pressed", String(twin.energy));
    netBox.querySelector("[data-trace]").checked = twin.trace;
    netBox.querySelector("[data-energy]").textContent = twin.energy ? t.networks.energyStop : t.networks.energy;
    root.classList.toggle("is-networks", on.size > 0);
  };
  const stopEnergy = () => { if (twin.energy) twin.energyFlow(false); };
  netBox.addEventListener("change", (e) => {
    if (e.target.matches("[data-net]")) { stopEnergy(); twin.setNetworks([...netBox.querySelectorAll("[data-net]:checked")].map((c) => c.dataset.net)); syncLayers(); }
    if (e.target.matches("[data-trace]")) { twin.setTrace(e.target.checked); if (e.target.checked) showRight("detail"); }
  });
  netBox.querySelector("[data-net-all]").addEventListener("click", () => { stopEnergy(); twin.setNetworks(Object.keys(NET)); syncLayers(); });
  netBox.querySelector("[data-net-none]").addEventListener("click", () => { stopEnergy(); twin.setNetworks([]); syncLayers(); });
  netBox.querySelector("[data-net-reset]").addEventListener("click", () => { stopEnergy(); twin.setNetworks([]); twin.setTrace(false); netBox.querySelector("[data-trace]").checked = false; twin.highlightStream(null); legend.querySelectorAll("[data-stream]").forEach((x) => x.setAttribute("aria-pressed", "false")); twin.home(); syncLayers(); });
  netBox.querySelector("[data-energy]").addEventListener("click", () => { twin.energyFlow(!twin.energy); syncLayers(); });
  // during Energy Flow: the layers panel folds away, a Stop button sits under the caption
  const stopBtn = document.createElement("button"); stopBtn.type = "button"; stopBtn.className = "tw-energy-stop"; stopBtn.hidden = true;
  stopBtn.textContent = t.networks.energyStop; stage.appendChild(stopBtn);
  stopBtn.addEventListener("click", () => { twin.energyFlow(false); syncLayers(); });
  twin.on("energy", (ev) => {
    stopBtn.hidden = !ev; root.classList.toggle("is-energy", !!ev);
    if (ev && ev.step === 0) { const h = netBox.querySelector(".tw-nets__head"); h.setAttribute("aria-expanded", "false"); netBox.querySelector(".tw-nets__body").hidden = true; }
    syncLayers();
  });

  // ---------------------------------------------------------------- selected equipment / connection
  const detail = $("[data-detail]");
  const tagOf = (k) => k ? `<em class="tw-tag tw-tag--${k}">${esc(t.tags[k])}</em>` : "";
  const linkRow = (l, me) => { const other = l.from === me ? l.to : l.from; const o = F.equipment.find((e) => e.id === other); return `<li><button type="button" data-link="${l.id}"><i style="background:${hex(l.color)}"></i>${l.from === me ? "→" : "←"} ${esc(o ? nameOf(F, o, lang) : other)}<small>${esc(l.name)}</small></button></li>`; };
  function showDetail(it) {
    list.querySelectorAll("[data-eq]").forEach((b) => b.classList.toggle("is-on", !!it && b.dataset.eq === it.id));
    if (!it) { detail.innerHTML = `<p class="tw-empty">${esc(t.detailEmpty)}</p>`; return; }
    const c = F.catalog[it.kind] || {}, a = F.areas.find((x) => x.id === it.area) || {};
    const mine = twin.links.filter((l) => l.from === it.id || l.to === it.id);
    const byNet = Object.keys(NET).map((k) => [k, mine.filter((l) => l.net === k)]).filter(([, ls]) => ls.length);
    detail.innerHTML = `<p class="tw-detail__area"><i style="background:${hex(a.color || 0x888888)}"></i>${a.step ? a.step + ". " : ""}${esc(tr(a.name, lang))}</p>
      <h3 class="tw-detail__name">${esc(nameOf(F, it, lang))}</h3>
      <p class="tw-detail__fn">${esc(tr(c.fn, lang))}</p>
      ${c.specs && c.specs.length ? `<table class="tw-specs"><tbody>${c.specs.map(([k, v, g]) => `<tr><th>${esc(tr(k, lang))}</th><td>${esc(tr(v, lang))} ${tagOf(g)}</td></tr>`).join("")}</tbody></table>` : ""}
      ${byNet.length ? `<p class="tw-detail__k">${esc(t.connections)}</p>${byNet.map(([k, ls]) => `<p class="tw-netname"><i style="background:${hex(NET[k].color)}"></i>${esc(NET[k].name)}</p><ul class="tw-links">${ls.map((l) => linkRow(l, it.id)).join("")}</ul>`).join("")}` : ""}
      <p class="tw-note">${esc(t.illustrative)}</p>`;
    showRight("detail");
  }
  function showLink(l) {
    if (!l) { return; }
    const n = NET[l.net], A = F.equipment.find((e) => e.id === l.from), B = F.equipment.find((e) => e.id === l.to);
    detail.innerHTML = `<p class="tw-detail__area"><i style="background:${hex(n.color)}"></i>${esc(n.name)}</p>
      <h3 class="tw-detail__name">${esc(l.name)}</h3>
      <dl class="tw-flow"><dt>${esc(t.link.from)}</dt><dd><button type="button" data-eq="${l.from}">${esc(A ? nameOf(F, A, lang) : l.from)}</button></dd><dt>${esc(t.link.to)}</dt><dd><button type="button" data-eq="${l.to}">${esc(B ? nameOf(F, B, lang) : l.to)}</button></dd>
      <dt>${esc(t.link.direction)}</dt><dd>${esc(l.kind === "return" ? t.link.ret : l.kind === "supply" ? t.link.supply : t.link.forward)}</dd><dt>${esc(t.link.length)}</dt><dd>≈ ${num(l.len)} m</dd><dt>ID</dt><dd><code>${esc(l.id)}</code></dd></dl>
      <p class="tw-detail__fn">${esc(l.desc || n.desc || "")}</p>
      <p class="tw-note">${esc(l.net === "process" ? t.link.processNote : t.link.conceptual)}</p>`;
    showRight("detail");
  }
  detail.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-eq]"); if (b) { twin.select(b.dataset.eq); return; }
    const k = ev.target.closest("[data-link]"); if (k) twin.selectLink(k.dataset.link);
  });
  twin.on("select", showDetail);
  twin.on("link", showLink);
  showDetail(null);

  // ---------------------------------------------------------------- investment calculator (CAD)
  const values = Object.fromEntries(fin.inputs.map((i) => [i.id, i.def]));
  const groups = [["plant", t.groups.plant], ["market", t.groups.market], ["invest", t.groups.invest]];
  $("[data-inputs]").innerHTML = `<div class="tw-presets" role="group" aria-label="${esc(t.scenarios)}">${(fin.presets || []).map((p, i) => `<button type="button" data-preset="${p.id}" aria-pressed="${i === 0}">${esc(p.name)}</button>`).join("")}</div>` +
    groups.map(([g, label]) => `<fieldset><legend>${esc(label)}</legend>${fin.inputs.filter((i) => i.group === g).map((i) => `
      <label class="tw-range"><span class="tw-range__top"><span>${esc(tr(i.label, lang))}</span><output data-out="${i.id}"></output></span>
      <input type="range" min="${i.min}" max="${i.max}" step="${i.step}" value="${i.def}" data-in="${i.id}" aria-label="${esc(tr(i.label, lang))}"></label>`).join("")}</fieldset>`).join("") +
    `<button type="button" class="tw-reset" data-reset>${esc(t.reset)}</button>`;
  const decimals = (i) => (String(i.step).split(".")[1] || "").length;
  const payback = (r) => !r.payback ? t.noPayback : r.payback > 25 ? `> 25 ${t.years}` : `${num(r.payback, 1)} ${t.years}`;
  function recalc() {
    for (const i of fin.inputs) $(`[data-out="${i.id}"]`).textContent = `${num(values[i.id], decimals(i))} ${tr(i.unit, lang)}`;
    const r = fin.compute(values);
    const kpis = [
      [t.kpi.capex, money(r.capex)], [t.kpi.revenue, money(r.revenue), false, `${t.kpi.ethanolRev} ${money(r.revEth)} · ${t.kpi.dgRev} ${money(r.revDg)}`],
      [t.kpi.opex, money(r.opex)], [t.kpi.ebitda, money(r.ebitda), r.ebitda < 0],
      [t.kpi.margin, `${num(r.margin * 100, 1)} %`, r.margin < 0], [t.kpi.payback, payback(r), !r.payback || r.payback > 25],
      [t.kpi.costPerL, `${cur.symbol}${num(r.costPerL, 3)}/L`], [t.kpi.netCost, `${cur.symbol}${num(r.netCostPerL, 3)}/L`]
    ];
    $("[data-kpis]").innerHTML = kpis.map(([k, v, bad, sub]) => `<div class="tw-kpi${bad ? " is-bad" : ""}"><span>${esc(k)}</span><b>${esc(v)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`).join("");
    const split = fin.capexSplit.map(([, p, label, color]) => [label, p * r.capex, color]);
    const max = Math.max(...split.map((s) => s[1]));
    $("[data-capex]").innerHTML = split.map(([n, v, c]) => `<li><span class="tw-bar__l">${esc(n)}</span><span class="tw-bar"><i style="width:${(v / max) * 100}%;background:${hex(c)}"></i></span><span class="tw-bar__v">${money(v)}</span></li>`).join("");
    let acc = 0; const C = 2 * Math.PI * 40, OL = fin.opexLabels;
    $("[data-opex]").innerHTML = `<svg viewBox="0 0 120 120" class="tw-donut" role="img" aria-label="${esc(t.opexTitle)}">${r.opexSplit.map(([k, v]) => { const f = v / r.opex, seg = `<circle cx="60" cy="60" r="40" fill="none" stroke="${OL[k][1]}" stroke-width="18" stroke-dasharray="${f * C} ${C}" stroke-dashoffset="${-acc * C}" transform="rotate(-90 60 60)"></circle>`; acc += f; return seg; }).join("")}<text x="60" y="57" text-anchor="middle" class="tw-donut__v">${num(r.opex / 1e6, 1)}</text><text x="60" y="72" text-anchor="middle" class="tw-donut__u">${esc(cur.symbol)} M / ${esc(t.yearShort)}</text></svg>
      <ul class="tw-legend">${r.opexSplit.map(([k, v]) => `<li><i style="background:${OL[k][1]}"></i><span>${esc(OL[k][0])}</span><b>${money(v, 2)}</b></li>`).join("")}</ul>`;
    const d = r.daily, a = r.annual;
    $("[data-prod]").innerHTML = [
      [t.prod.ethanol, `${num(d.ethanol)} L/${t.dayShort}`, `${num(a.ethanol / 1e6, 1)} M L/${t.yearShort}`],
      [t.prod.grain, `${num(d.wheat)} t/${t.dayShort}`, `${num(a.wheat)} t/${t.yearShort}`],
      [t.prod.wdg, `${num(d.wdg)} t/${t.dayShort}`, `${num(a.dgDM)} t DM/${t.yearShort}`],
      [t.prod.co2, `${num(d.co2)} t/${t.dayShort}`, `${num(a.co2)} t/${t.yearShort}`],
      [t.prod.water, `${num(d.water)} m³/${t.dayShort}`, `${num(a.water)} m³/${t.yearShort}`],
      [t.prod.gas, `${num(d.gas)} GJ/${t.dayShort}`, `${num(a.gas)} GJ/${t.yearShort}`],
      [t.prod.power, `${num(d.power, 1)} MWh/${t.dayShort}`, `${num(a.power)} MWh/${t.yearShort}`]
    ].map(([k, v, y]) => `<div class="tw-kpi"><span>${esc(k)}</span><b>${esc(v)}</b><small>${esc(y)}</small></div>`).join("");
    const mmax = Math.max(...r.monthly);
    $("[data-monthly]").innerHTML = r.monthly.map((m, i) => `<li title="${esc(t.months[i])}: ${num(m / 1e6, 2)} M L"><i style="height:${(m / mmax) * 100}%"></i><span>${esc(t.months[i].slice(0, 1))}</span></li>`).join("");
    $("[data-strip]").innerHTML = [[t.strip.capacity, `${num(values.capacity, 1)} M L/${t.yearShort}`], [t.strip.ethanol, `${num(d.ethanol)} L/${t.dayShort}`], [t.strip.grain, `${num(d.wheat)} t/${t.dayShort}`], [t.strip.capex, money(r.capex)], [t.strip.margin, `${num(r.margin * 100, 1)} %`]]
      .map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("");
  }
  const setPreset = (id) => {
    const p = (fin.presets || []).find((x) => x.id === id) || { v: {} };
    for (const i of fin.inputs) { values[i.id] = p.v[i.id] ?? i.def; $(`[data-in="${i.id}"]`).value = values[i.id]; }
    root.querySelectorAll("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.preset === id)));
    recalc();
  };
  root.querySelector("[data-inputs]").addEventListener("input", (ev) => { const i = ev.target.closest("[data-in]"); if (!i) return; values[i.dataset.in] = parseFloat(i.value); root.querySelectorAll("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", "false")); recalc(); });
  root.querySelector("[data-inputs]").addEventListener("click", (ev) => { const b = ev.target.closest("[data-preset]"); if (b) setPreset(b.dataset.preset); });
  root.querySelector("[data-reset]").addEventListener("click", () => setPreset("base"));
  recalc();

  // ---------------------------------------------------------------- pricing & packages (modal → WhatsApp with the chosen package)
  const pm = $("[data-pricing-modal]"), pBtn = $("[data-pricing]"), cta = $("[data-pricing-cta]");
  const syncCta = () => {
    const r = pm.querySelector('input[name="tw-package"]:checked');
    const msg = t.pricing.whatsapp.replace("{name}", r.dataset.name.toUpperCase()).replace("{range}", r.dataset.range);
    cta.href = `https://wa.me/${pm.dataset.wa}?text=${encodeURIComponent(msg)}`;
    pm.querySelectorAll(".tw-pkg").forEach((l) => l.classList.toggle("is-on", l.querySelector("input").checked));
  };
  const openPricing = () => { pm.hidden = false; document.documentElement.classList.add("tw-modal-open"); syncCta(); pm.querySelector("input:checked").focus(); };
  const closePricing = () => { pm.hidden = true; document.documentElement.classList.remove("tw-modal-open"); pBtn.focus(); };
  pBtn.addEventListener("click", openPricing);
  pm.addEventListener("change", syncCta);
  pm.addEventListener("click", (e) => { if (e.target.closest("[data-pricing-close]")) closePricing(); });
  pm.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePricing();
    if (e.key === "Tab") {                                              // keep focus inside the dialog
      const f = [...pm.querySelectorAll("button, a[href], input:checked")].filter((x) => x.offsetParent);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  syncCta();
  return twin;
}
