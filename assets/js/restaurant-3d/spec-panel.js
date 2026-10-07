/*
 * Restaurants page — specification panel renderer (no dependencies).
 *
 * Shared by the build (scripts/restaurant-plan.js renders the default zone into
 * the page, so it is readable without JavaScript) and the browser
 * (plan-app.js re-renders it when a zone or object is selected).
 *
 * Input: the display-ready data from scripts/restaurant-spec.js
 *   { labels, objects: { REF: {...} }, zones: { id: {...} } }
 * Output: HTML string. Sections work as tabs on desktop and as collapsible
 * blocks in the mobile bottom sheet (CSS + plan-app.js decide).
 */
(function (root) {
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const dl = (rows) => rows.length
    ? `<dl class="rps__dl">${rows.map(([k, v]) => `<div class="rps__row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`
    : "";
  const bullets = (title, items) => items && items.length
    ? `<p class="rps__label">${esc(title)}</p><ul class="rps__list">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
    : "";
  // schedule rows: reference · name · quantity, each opens that object
  const schedule = (title, entries) => entries && entries.length
    ? `${title ? `<p class="rps__label">${esc(title)}</p>` : ""}<ul class="rps__sched">${entries.map((e) =>
        `<li><button type="button" class="rps__item" data-rps-open="${esc(e.ref)}"><span class="rps__iref">${esc(e.ref)}</span><span class="rps__iname">${esc(e.name || e.text)}</span>${e.qty ? `<span class="rps__iqty">${esc(e.qty)}</span>` : ""}</button></li>`).join("")}</ul>`
    : "";
  const materialsList = (items) => items.length
    ? `<ul class="rps__sched">${items.map((m) => m.ref
        ? `<li><button type="button" class="rps__item" data-rps-open="${esc(m.ref)}"><span class="rps__iref">${esc(m.ref)}</span><span class="rps__iname">${esc(m.text || m.name)}</span>${m.qty ? `<span class="rps__iqty">${esc(m.qty)}</span>` : ""}</button></li>`
        : `<li class="rps__plain">${esc(m.text)}</li>`).join("")}</ul>`
    : "";
  const costBlock = (L, rows) =>
    `<p class="rps__badge">${esc(L["c.indicative"])}</p>${dl(rows)}<p class="rps__fine">${esc(L["c.note"])}</p>`;

  function section(key, title, body, open) {
    if (!body) return "";
    return `<section class="rps__sec${open ? " is-open" : ""}" data-sec="${key}">` +
      `<button type="button" class="rps__sum" data-rps-toggle aria-expanded="${open ? "true" : "false"}"><span class="rps__plus" aria-hidden="true"></span>${esc(title)}</button>` +
      `<div class="rps__body">${body}</div></section>`;
  }

  function render(S, sel) {
    const L = S.labels;
    let head, secs;
    if (sel.type === "object" && S.objects[sel.id]) {
      const o = S.objects[sel.id];
      const zone = (sel.zone && o.zones.includes(sel.zone)) ? sel.zone : o.zones[0];
      head = `<p class="rps__kicker">${esc(L["ui.selectedItem"])} · ${esc(o.groupLabel)}</p>` +
        `<h2 class="rps__title">${esc(o.name)}</h2>` +
        `<p class="rps__meta"><span class="rps__ref">${esc(o.ref)}</span><span>${esc(o.category)}</span><span class="rps__status">${esc(o.status)}</span></p>` +
        (zone && S.zones[zone] ? `<button type="button" class="rps__back" data-rps-zone="${esc(zone)}"><span aria-hidden="true">&larr;</span> ${esc(L["ui.back"])} ${esc(S.zones[zone].name)}</button>` : "");
      const overview = dl([
        [L.category, o.category], [L.quantity, o.quantity], ...(o.dims ? [[L.dimensions, o.dims]] : []), [L.location, o.location], ...o.key,
      ]) + (o.notes ? `<p class="rps__note rps__note--desktop">${esc(o.notes)}</p>` : "");
      secs = [
        section("overview", L["tab.overview"], overview, true),
        section("specification", L["tab.specification"], dl(o.spec)),
        section("materials", L["tab.materials"], materialsList(o.materials)),
        section("equipment", L["tab.equipment"], o.equipment.length ? schedule("", o.equipment.map((r) => ({ ref: r, name: S.objects[r] ? S.objects[r].name : r, qty: S.objects[r] ? S.objects[r].quantity : "" }))) : ""),
        section("cost", L["tab.cost"], o.cost ? costBlock(L, [[L["c.unit"], o.cost.unit], [L["c.qty"], o.cost.qty], [L["c.total"], o.cost.total]]) : `<p class="rps__fine">${esc(L["c.none"])}</p>`),
        o.notes ? section("notes", L["tab.notes"], `<p class="rps__note">${esc(o.notes)}</p>`) : "",
      ];
    } else {
      const z = S.zones[sel.id] || S.zones[Object.keys(S.zones)[0]];
      head = `<p class="rps__kicker">${esc(L["ui.selectedZone"])}</p><h2 class="rps__title">${esc(z.name)}</h2>`;
      const overview = dl(z.overview) +
        bullets(L["z.objectives"], z.objectives) +
        bullets(L["z.primaryMaterials"], z.primary) +
        bullets(L["z.workZones"], z.workZones) +
        (z.circulation ? `<p class="rps__label">${esc(L["z.circulation"])}</p><p class="rps__note">${esc(z.circulation)}</p>` : "");
      const ffe = schedule(L["group.furniture"], z.furniture) + schedule(L["group.lighting"], z.lighting);
      secs = [
        section("overview", L["tab.overview"], overview, true),
        section("specification", L["tab.specification"], ffe || `<p class="rps__fine">${esc(L["z.noItems"])}</p>`),
        section("materials", L["tab.materials"], materialsList(z.materials)),
        section("equipment", L["tab.equipment"], z.equipment.length ? schedule("", z.equipment) : ""),
        section("cost", L["tab.cost"], costBlock(L, [[L["c.ffe"], z.cost.ffe], [L["c.finishes"], z.cost.finishes], [L["c.zoneTotal"], z.cost.total]])),
      ];
    }
    secs = secs.filter(Boolean);
    const tabs = secs.map((s) => s.match(/data-sec="([^"]+)"/)[1]).filter((k) => k !== "notes");
    return `<div class="rps" data-type="${sel.type === "object" ? "object" : "zone"}">` +
      `<header class="rps__head">${head}<button type="button" class="rps__close" data-rps-close aria-label="${esc(L["ui.close"])}">&times;</button></header>` +
      `<div class="rps__tabs" role="tablist">${tabs.map((k, i) => `<button type="button" role="tab" class="rps__tab" data-rps-tab="${k}" aria-selected="${i === 0}">${esc(L["tab." + k])}</button>`).join("")}</div>` +
      `<div class="rps__secs">${secs.join("")}</div></div>`;
  }

  const api = { render };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RestaurantSpecPanel = api;
})(typeof window !== "undefined" ? window : this);
