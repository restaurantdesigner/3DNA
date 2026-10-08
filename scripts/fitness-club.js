/*
 * Build-time HTML for the Fitness page section 03 / Zonificación: the
 * conceptual 3D fitness club (used by build-i18n.js).
 *
 * Everything a visitor or crawler needs is plain HTML outside the WebGL
 * canvas: the zone buttons, one specification article per zone (shown in the
 * floating panel / bottom sheet) and a plan drawing that stands in before the
 * 3D model loads and stays as the fallback without WebGL.
 * The 3D model and the interaction live in assets/js/fitness-club-3d/.
 *
 * Data: assets/data/fitness-club.json (DEMONSTRATION data, see its _about).
 * Texts: assets/i18n/fitness-club.json + fitnessPage.zoning in translations.
 */
const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// items that are architecture (not listed) and furniture (listed apart from equipment)
const ARCH = new Set(["slat_wall", "rug", "mirror_partition", "mirror_panel", "mirror_wall", "riser", "riser_high"]);
const FURNITURE = new Set(["reception_desk", "sofa", "lounge_chair", "coffee_table", "shake_bar", "bar_stool", "back_bar",
  "retail_unit", "planter", "towel_station", "mobility_shelf", "storage_wall", "changing_bench", "vanity"]);
const LOCALES = { es: "es-ES", en: "en-GB", ru: "ru-RU", uk: "uk-UA" };

function createFitnessClub(data, texts, translations) {
  const area = (z) => Math.round(z.rect.w * z.rect.d);
  const totalArea = data.footprint.w * data.footprint.d;
  const sum = (z) => Object.values(z.budget).reduce((a, [lo, hi]) => [a[0] + lo, a[1] + hi], [0, 0]);
  const grand = data.zones.reduce((a, z) => { const [lo, hi] = sum(z); return [a[0] + lo, a[1] + hi]; }, [0, 0]);

  const money = (lang, v) => new Intl.NumberFormat(LOCALES[lang], { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v).replace("EUR", "€");
  const range = (lang, [lo, hi]) => `${money(lang, lo)} – ${money(lang, hi)}`;
  const num = (lang, v) => new Intl.NumberFormat(LOCALES[lang]).format(v);

  // counted from the placed items, so the list always matches the model
  function counts(z, pick) {
    const m = new Map();
    z.items.forEach((it) => { if (pick(it.k)) m.set(it.k, (m.get(it.k) || 0) + (it.n || 1)); });
    return [...m];
  }

  function zoneArticle(lang, z) {
    const T = texts[lang], ui = T.ui, zt = T.zones[z.id];
    const equipment = counts(z, (k) => !ARCH.has(k) && !FURNITURE.has(k));
    const furniture = counts(z, (k) => FURNITURE.has(k));
    const list = (rows) => rows.map(([k, n]) => `            <li><span class="fclub-z__qty">${n} ×</span> ${escapeHtml(T.items[k] || k)}</li>`);
    const budgetRows = ["equipment", "furniture", "finishes", "lighting"]
      .filter((c) => z.budget[c] && z.budget[c][1] > 0)
      .map((c) => `            <tr><th scope="row">${escapeHtml(ui.cat[c])}</th><td>${range(lang, z.budget[c])}</td></tr>`);
    return [
      `        <article class="fclub-z" id="fclub-zone-${z.id}" data-zone="${z.id}" aria-labelledby="fclub-zone-${z.id}-title" hidden>`,
      `          <button type="button" class="fclub-z__close" data-fclub-close aria-label="${escapeHtml(ui.close)}"><span aria-hidden="true">×</span></button>`,
      `          <p class="fclub-z__kicker">${escapeHtml(ui.zone)} ${z.index}</p>`,
      `          <h3 class="fclub-z__title" id="fclub-zone-${z.id}-title">${escapeHtml(zt.name)}</h3>`,
      z.image ? `          <figure class="fclub-z__fig"><img src="${z.image.src}" width="${z.image.w}" height="${z.image.h}" loading="lazy" decoding="async" alt=""><figcaption>${escapeHtml(ui.imageCaption)}</figcaption></figure>` : "",
      `          <p class="fclub-z__desc">${escapeHtml(zt.desc)}</p>`,
      `          <dl class="fclub-z__facts">`,
      `            <div><dt>${escapeHtml(ui.area)}</dt><dd>${num(lang, area(z))} m²</dd></div>`,
      `            <div><dt>${escapeHtml(ui.capacity)}</dt><dd>${z.capacity} <span>${escapeHtml(ui.people)}</span></dd></div>`,
      `          </dl>`,
      equipment.length ? [`          <h4 class="fclub-z__h">${escapeHtml(ui.equipment)}</h4>`, `          <ul class="fclub-z__list">`, ...list(equipment), `          </ul>`].join("\n") : "",
      furniture.length ? [`          <h4 class="fclub-z__h">${escapeHtml(ui.furniture)}</h4>`, `          <ul class="fclub-z__list">`, ...list(furniture), `          </ul>`].join("\n") : "",
      `          <h4 class="fclub-z__h">${escapeHtml(ui.materials)}</h4>`,
      `          <ul class="fclub-z__tags">${z.materials.map((m) => `<li>${escapeHtml(T.materials[m] || m)}</li>`).join("")}</ul>`,
      `          <h4 class="fclub-z__h">${escapeHtml(ui.lighting)}</h4>`,
      `          <p class="fclub-z__text">${escapeHtml(zt.lighting)}</p>`,
      `          <h4 class="fclub-z__h">${escapeHtml(ui.investment)}</h4>`,
      `          <table class="fclub-z__budget">`,
      `            <tbody>`,
      ...budgetRows,
      `            </tbody>`,
      `            <tfoot><tr><th scope="row">${escapeHtml(ui.total)}</th><td>${range(lang, sum(z))}</td></tr></tfoot>`,
      `          </table>`,
      `          <p class="fclub-z__note">${escapeHtml(ui.demoNote)}</p>`,
      `        </article>`
    ].filter(Boolean).join("\n");
  }

  function overview(lang) {
    const ui = texts[lang].ui;
    return [
      `        <article class="fclub-z fclub-z--overview" data-zone="overview">`,
      `          <p class="fclub-z__kicker">${escapeHtml(ui.overviewKicker)}</p>`,
      `          <h3 class="fclub-z__title">${escapeHtml(ui.overviewTitle)}</h3>`,
      `          <p class="fclub-z__desc">${escapeHtml(ui.overviewText)}</p>`,
      `          <dl class="fclub-z__facts">`,
      `            <div><dt>${escapeHtml(ui.totalArea)}</dt><dd>${num(lang, totalArea)} m²</dd></div>`,
      `            <div><dt>${escapeHtml(ui.zoneCount)}</dt><dd>${data.zones.length}</dd></div>`,
      `          </dl>`,
      `          <p class="fclub-z__total"><span>${escapeHtml(ui.totalBudget)}</span> ${range(lang, grand)}</p>`,
      `          <p class="fclub-z__note">${escapeHtml(ui.demoNote)}</p>`,
      `        </article>`
    ].join("\n");
  }

  // plan drawing: placeholder before the 3D model, and the no-WebGL fallback
  function planSvg(lang) {
    const T = texts[lang];
    const { w, d } = data.footprint;
    const corridors = data.architecture.corridors.map((c) => `<rect class="fclub-plan__corr" x="${c.x}" y="${c.z}" width="${c.w}" height="${c.d}"/>`);
    const zones = data.zones.map((z) => {
      const r = z.rect;
      return `<g class="fclub-plan__zone" data-zone="${z.id}"><rect x="${r.x + 0.1}" y="${r.z + 0.1}" width="${r.w - 0.2}" height="${r.d - 0.2}"/><text x="${r.x + r.w / 2}" y="${r.z + r.d / 2 + 0.45}">${z.index}</text></g>`;
    });
    return `<svg class="fclub-plan" data-fclub-poster viewBox="-1 -1 ${w + 2} ${d + 2}" role="img" aria-label="${escapeHtml(T.ui.viewer)}"><rect class="fclub-plan__slab" x="0" y="0" width="${w}" height="${d}"/>${corridors.join("")}${zones.join("")}</svg>`;
  }

  // data for the 3D scene: geometry + localized names
  function clientData(lang) {
    const T = texts[lang];
    return {
      model: data.model,
      footprint: data.footprint,
      architecture: data.architecture,
      zones: data.zones.map((z) => ({ id: z.id, index: z.index, name: T.zones[z.id].name, rect: z.rect, floor: z.floor, items: z.items }))
    };
  }

  function sectionHtml(lang) {
    const T = texts[lang], ui = T.ui;
    const zoning = translations[lang].fitnessPage.zoning;
    const nav = data.zones.map((z) =>
      `        <li><button type="button" class="fclub__zone" data-zone="${z.id}" aria-controls="fclub-zone-${z.id}" aria-pressed="false"><span class="fclub__zone-num">${z.index}</span><span class="fclub__zone-name">${escapeHtml(T.zones[z.id].name)}</span></button></li>`);
    return [
      `  <section class="fscene fclub" id="zonificacion" aria-labelledby="f-zoning-title" data-fclub>`,
      `    <div class="fclub__inner">`,
      `      <header class="fclub__head">`,
      `        <p class="fscene__label">${escapeHtml(zoning.label)}</p>`,
      `        <h2 class="fscene__title" id="f-zoning-title">${escapeHtml(zoning.heading)}</h2>`,
      `        <p class="fscene__body">${escapeHtml(zoning.body)}</p>`,
      `      </header>`,
      `      <div class="fclub__stage">`,
      `        <div class="fclub__viewport" data-fclub-viewport>`,
      `          ${planSvg(lang)}`,
      `          <div class="fclub__labels" data-fclub-labels></div>`,
      `          <p class="fclub__loading" data-fclub-loading hidden>${escapeHtml(ui.loading)}</p>`,
      `          <p class="fclub__fallback" data-fclub-fallback hidden>${escapeHtml(ui.fallback)}</p>`,
      `          <button type="button" class="fclub__reset" data-fclub-reset hidden>${escapeHtml(ui.reset)}</button>`,
      `          <p class="fclub__hint" data-fclub-hint data-hint-touch="${escapeHtml(ui.hintTouch)}" hidden>${escapeHtml(ui.hint)}</p>`,
      `        </div>`,
      `        <ol class="fclub__nav" aria-label="${escapeHtml(ui.zonesNav)}">`,
      ...nav,
      `        </ol>`,
      `        <aside class="fclub__panel" data-fclub-panel aria-label="${escapeHtml(ui.zonesNav)}" aria-live="polite">`,
      overview(lang),
      ...data.zones.map((z) => zoneArticle(lang, z)),
      `        </aside>`,
      `        <div class="fclub__scrim" data-fclub-scrim hidden></div>`,
      `      </div>`,
      `    </div>`,
      `  </section>`,
      `  <script type="application/json" id="fclub-data">${JSON.stringify(clientData(lang)).replace(/</g, "\\u003c")}</script>`
    ].join("\n");
  }

  return { sectionHtml };
}

module.exports = { createFitnessClub };
