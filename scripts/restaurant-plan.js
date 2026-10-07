/*
 * Build-time HTML for the Restaurants page opening section: the isometric
 * restaurant plan, the planning metrics and the potential monthly revenue
 * (used by build-i18n.js).
 *
 * Data:  assets/data/restaurant-plan.json  (planning figures, zones, walls, furniture, lights, view)
 * Text:  assets/i18n/translations.json     (restaurantsPage.plan.* per language)
 *
 * Everything meaningful is plain HTML rendered here: heading, copy, metrics,
 * revenue formula, zone buttons and the details of every zone. The model
 * starts as an SVG drawing (same projection as the 3D camera), so the section
 * works without WebGL; assets/js/restaurant-3d/plan-app.js swaps in the 3D
 * model (plan-scene.js + Three.js) after the page has loaded.
 *
 * Metrics + revenue come from data.planning (the approved figures):
 *   monthlyRevenue = seats × averageCheck × seatTurnsPerDay × daysPerMonth
 * The furniture in data.items is counted too and the build warns when the two
 * disagree, so the drawing and the numbers cannot drift apart unnoticed.
 */
const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const LOCALE = { es: "es-ES", en: "en-GB", ru: "ru-RU", uk: "uk-UA" };
const num = (lang, n) => new Intl.NumberFormat(LOCALE[lang] || "en-GB", { maximumFractionDigits: 2 }).format(n);

// ---- counting (consistency check against data.planning) ----
const countItem = (it) => {
  if (it.type === "table") return { tables: 1, chairs: it.chairs || 0, stools: 0 };
  if (it.type === "stool") return { tables: 0, chairs: 0, stools: 1 };
  if (it.type === "highTable") return { tables: 1, chairs: 0, stools: it.stools || 0 };
  return { tables: 0, chairs: 0, stools: 0 };
};
const sum = (items) => items.reduce((t, it) => {
  const c = countItem(it);
  t.tables += c.tables; t.chairs += c.chairs; t.stools += c.stools;
  return t;
}, { tables: 0, chairs: 0, stools: 0 });

// ---- projection shared with the 3D camera (orthographic, see plan-scene.js) ----
function projector(view) {
  const A = view.azimuth, P = view.polar;
  const r = [Math.cos(A), 0, -Math.sin(A)];
  const u = [-Math.cos(P) * Math.sin(A), Math.sin(P), -Math.cos(P) * Math.cos(A)];
  return ([x, y, z]) => [x * r[0] + y * r[1] + z * r[2], -(x * u[0] + y * u[1] + z * u[2])];
}
function bounds(data, project) {
  const e = data.view.extent, H = data.wallHeight, m = data.view.margin;
  const pts = [];
  [0, H].forEach((y) => [[e.x0, e.z0], [e.x1, e.z0], [e.x0, e.z1], [e.x1, e.z1]].forEach(([x, z]) => pts.push(project([x, y, z]))));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs) - m, y: Math.min(...ys) - m, w: Math.max(...xs) - Math.min(...xs) + 2 * m, h: Math.max(...ys) - Math.min(...ys) + 2 * m };
}

const FINISH_FILL = { wood: "#c9a47c", woodDark: "#a98466", stone: "#ece5d9", tile: "#dfe0dc", tileGreen: "#7d8a78", service: "#e2ddd4" };
const f2 = (n) => n.toFixed(2);
const rectsOf = (z) => z.rects || [z.rect];

// small line icons for the metrics strip (decorative)
const ICON = {
  seats: '<path d="M7 20v-6.5M17 20v-6.5M5.5 13.5h13M7 13.5V7.5a5 5 0 0 1 10 0v6"/><path d="M5.5 13.5v-3M18.5 13.5v-3"/>',
  tables: '<path d="M3.5 7.5h17M6 7.5c0 .8 2.7 1.5 6 1.5s6-.7 6-1.5"/><path d="M10 9v11M14 9v11"/>',
  chairs: '<path d="M8 20v-7M16 20v-7M7 13h10M8 13V5.5a4 4 0 0 1 8 0V13"/>',
  stools: '<path d="M7.5 6.5h9M8.5 6.5 7 20M15.5 6.5 17 20M8 14h8"/>',
  zones: '<path d="M12 3.5 21 8l-9 4.5L3 8z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16 9 4.5 9-4.5"/>',
};
const icon = (k) => `<svg class="rp-metric__icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON[k]}</svg>`;

function createRestaurantPlan(data, translations, { spec } = {}) {
  const panel = require("../assets/js/restaurant-3d/spec-panel.js");
  const t = (lang) => translations[lang].restaurantsPage.plan;
  const P = data.planning;
  const monthlyRevenue = P.seats * P.averageCheck * P.seatTurnsPerDay * P.daysPerMonth;

  // consistency check: the drawing must hold the approved numbers
  const counted = sum(data.items);
  const approved = { tables: P.tables, chairs: P.chairs, stools: P.barStools };
  Object.keys(approved).forEach((k) => {
    if (counted[k] !== approved[k]) console.warn(`restaurant-plan: planning.${k === "stools" ? "barStools" : k} is ${approved[k]} but the drawing has ${counted[k]}`);
  });
  if (P.chairs + P.barStools !== P.seats) console.warn(`restaurant-plan: seats (${P.seats}) ≠ chairs + bar stools (${P.chairs + P.barStools})`);
  if (P.zones !== data.zones.length) console.warn(`restaurant-plan: planning.zones is ${P.zones} but there are ${data.zones.length} zones`);

  const project = projector(data.view);
  const box = bounds(data, project);
  const pct = ([sx, sy]) => [((sx - box.x) / box.w) * 100, ((sy - box.y) / box.h) * 100];
  const labelPoint = (z) => {
    if (z.label) return [z.label.x, 0, z.label.z];
    const r = rectsOf(z)[0];
    return [r.x + r.w / 2, 0, r.z + r.d / 2];
  };

  // static drawing: zone floors + walls (no furniture), painter's order
  function posterSvg(lang) {
    const p = t(lang);
    const poly = (pts) => pts.map(project).map(([x, y]) => `${f2(x)},${f2(y)}`).join(" ");
    const floors = data.zones.flatMap((z) => rectsOf(z).map(({ x, z: zz, w, d }) =>
      `    <polygon class="rp-poster__zone" data-zone="${z.id}" points="${poly([[x, 0, zz], [x + w, 0, zz], [x + w, 0, zz + d], [x, 0, zz + d]])}" fill="${FINISH_FILL[z.finish] || "#e8e4dc"}"/>`));
    const H = data.wallHeight;
    const A = data.view.azimuth;
    const depth = (wl) => { const [x1, z1] = wl.from, [x2, z2] = wl.to; return ((x1 + x2) / 2) * Math.sin(A) + ((z1 + z2) / 2) * Math.cos(A); };
    const walls = [...data.walls].sort((a, b) => depth(a) - depth(b)).map((wl) => {
      const [x1, z1] = wl.from, [x2, z2] = wl.to;
      const h = wl.type === "glass" ? H * 0.88 : H;
      return `    <polygon class="rp-poster__wall rp-poster__wall--${wl.type}" points="${poly([[x1, 0, z1], [x2, 0, z2], [x2, h, z2], [x1, h, z1]])}"/>`;
    });
    return [
      `  <svg class="rplan3d__poster" data-rplan-poster viewBox="${f2(box.x)} ${f2(box.y)} ${f2(box.w)} ${f2(box.h)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHtml(p.modelLabel)}">`,
      ...floors,
      ...walls,
      `  </svg>`
    ].join("\n");
  }

  function labels(lang) {
    const p = t(lang);
    const btns = data.zones.map((z) => {
      const [l, tp] = pct(project(labelPoint(z)));
      return `      <button type="button" class="rp-zone" data-zone="${z.id}" aria-pressed="false" style="left:${l.toFixed(2)}%;top:${tp.toFixed(2)}%">${escapeHtml(p.zones[z.id].name)}</button>`;
    });
    return [`    <div class="rplan3d__labels" data-rplan-labels role="group" aria-label="${escapeHtml(p.zonesLabel)}">`, ...btns, `    </div>`].join("\n");
  }

  // metrics strip + potential monthly revenue (all from data.planning)
  function metrics(lang) {
    const p = t(lang);
    const vals = { seats: P.seats, tables: P.tables, chairs: P.chairs, stools: P.barStools, zones: P.zones };
    const items = ["seats", "tables", "chairs", "stools", "zones"].map((k) =>
      `      <div class="rp-metric">${icon(k)}<dt>${escapeHtml(p.metrics[k])}</dt><dd>${num(lang, vals[k])}</dd></div>`);
    const fill = (tpl) => tpl
      .replace("{seats}", num(lang, P.seats)).replace("{check}", num(lang, P.averageCheck))
      .replace("{turns}", num(lang, P.seatTurnsPerDay)).replace("{days}", num(lang, P.daysPerMonth))
      .replace("{revenue}", num(lang, monthlyRevenue));
    return [
      `  <div class="rplan3d__figures">`,
      `    <dl class="rplan3d__metrics" aria-label="${escapeHtml(p.metricsLabel)}">`,
      ...items,
      `    </dl>`,
      `    <div class="rp-revenue">`,
      `      <p class="rp-revenue__title">${escapeHtml(p.revenue.title)}</p>`,
      `      <p class="rp-revenue__formula">${escapeHtml(fill(p.revenue.formula))}</p>`,
      `      <p class="rp-revenue__result">${escapeHtml(fill(p.revenue.result))}</p>`,
      `    </div>`,
      `  </div>`
    ].join("\n");
  }

  // specification panel data for one language (display-ready) + the default view
  const specCache = {};
  function specData(lang) {
    if (!specCache[lang]) specCache[lang] = spec.forLang(lang, Object.fromEntries(data.zones.map((z) => [z.id, t(lang).zones[z.id].name])));
    return specCache[lang];
  }

  function clientData(lang) {
    const p = t(lang);
    return {
      floor: data.floor, wallHeight: data.wallHeight, view: data.view, defaultZone: data.defaultZone,
      zones: data.zones.map((z) => ({ id: z.id, rects: rectsOf(z), label: z.label || null, finish: z.finish, name: p.zones[z.id].name })),
      walls: data.walls, items: data.items, lights: data.lights || [],
      zoneFloors: Object.fromEntries(data.zones.map((z) => [z.id, z.floorRef || null])),
    };
  }

  function sectionHtml(lang) {
    const p = t(lang);
    return [
      `  <section class="rplan3d" id="planificacion" aria-labelledby="rplan3d-title" data-rplan>`,
      `    <div class="rplan3d__inner">`,
      `    <header class="rplan3d__text">`,
      `      <div class="rplan3d__lead">`,
      `        <p class="rplan3d__eyebrow">${escapeHtml(p.eyebrow)}</p>`,
      `        <h1 class="rplan3d__title" id="rplan3d-title">${escapeHtml(p.heading)}</h1>`,
      `      </div>`,
      `      <div class="rplan3d__copy">`,
      ...p.body.map((x) => `        <p class="rplan3d__body">${escapeHtml(x)}</p>`),
      `        <p class="rplan3d__supporting">${escapeHtml(p.supporting)}</p>`,
      `      </div>`,
      `    </header>`,
      `    <div class="rplan3d__stage">`,
      `     <div class="rplan3d__model">`,
      `      <div class="rplan3d__viewport" data-rplan-viewport style="--ar: ${(box.w / box.h).toFixed(4)}; aspect-ratio: ${f2(box.w)} / ${f2(box.h)}">`,
      posterSvg(lang).replace(/^/gm, "    "),
      labels(lang).replace(/^/gm, "  "),
      `        <p class="rplan3d__loading" data-rplan-loading hidden>${escapeHtml(p.loading)}</p>`,
      `        <button type="button" class="rplan3d__reset" data-rplan-reset hidden>${escapeHtml(p.reset)}</button>`,
      `      </div>`,
      `      <p class="rplan3d__hint" data-hint-fine="${escapeHtml(p.hint)}" data-hint-touch="${escapeHtml(p.hintTouch)}">${escapeHtml(p.hint)}</p>`,
      `     </div>`,
      // specification panel: side panel on desktop, bottom sheet on phones
      `      <aside class="rplan3d__panel" data-rplan-panel aria-label="${escapeHtml(specData(lang).labels["ui.panel"])}">`,
      `        <div class="rplan3d__panel-in" data-rplan-panel-body aria-live="polite">${panel.render(specData(lang), { type: "zone", id: data.defaultZone })}</div>`,
      `      </aside>`,
      `      <div class="rplan3d__scrim" data-rplan-scrim hidden></div>`,
      `    </div>`,
      metrics(lang).replace(/^/gm, "  "),
      `    </div>`,
      `  </section>`,
      `  <script type="application/json" id="rplan-data">${JSON.stringify(clientData(lang)).replace(/</g, "\\u003c")}</script>`,
      `  <script type="application/json" id="rplan-spec">${JSON.stringify(specData(lang)).replace(/</g, "\\u003c")}</script>`
    ].join("\n");
  }

  return { sectionHtml, monthlyRevenue };
}

module.exports = { createRestaurantPlan };
