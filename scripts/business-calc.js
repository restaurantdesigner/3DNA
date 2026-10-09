/*
 * Build-time HTML for the business calculators (used by build-i18n.js). One
 * dashboard component, two configurations:
 *   - Restaurants: "Calculadora de rentabilidad", its own section right after
 *     the 3D restaurant presentation (which is not touched)
 *   - Fitness: "Calculadora de Rentabilidad", right after "01 / Del plano a la realidad"
 *
 * Desktop: inputs panel (left) · live results (right) · breakdown, comparison
 * and assumptions (below) · action toolbar. Phones: inputs, then results.
 * Everything is plain HTML prefilled with the model defaults (readable without
 * JavaScript); assets/js/shared-calc/calc-tools.js makes it live.
 * Models: assets/js/restaurant-3d/revenue-calc.js, assets/js/fitness-calc.js.
 * Text:   translations.json → calcCommon, restaurantsPage.calc, fitnessPage.calc
 */
const restaurantModel = require("../assets/js/restaurant-3d/revenue-calc.js");
const fitnessModel = require("../assets/js/fitness-calc.js");
const tools = require("../assets/js/shared-calc/calc-tools.js");

const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const LOCALE = { es: "es-ES", en: "en-GB", ru: "ru-RU", uk: "uk-UA" };
const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
const indent = (s, n) => s.replace(/^/gm, " ".repeat(n));

function createBusinessCalcs(translations, { whatsappHref, email }) {
  function i18nScript(lang, page) {
    const T = translations[lang], E = translations.en;
    const block = (tr) => ({ ...tr.calcCommon.report, ...tr[page].calc.report });
    return `<script type="application/json" data-calc-i18n>${json({
      locale: LOCALE[lang] || "en-GB",
      ui: { ...T.calcCommon.ui, ...T[page].calc.ui },
      report: { ...block(E), ...block(T) },   // English fills any report string not yet translated
      reportEn: block(E),
      contact: { whatsapp: whatsappHref(lang), email },
    })}</script>`;
  }

  function dashboard(cfg, lang) {
    const M = cfg.model;
    const ui = { ...translations[lang].calcCommon.ui, ...translations[lang][cfg.page].calc.ui };
    const units = ui.units;
    const fmt = tools.formatter(LOCALE[lang]);
    const r = M.compute(M.defaults);
    const fieldOf = (key) => M.fields.find((f) => f.key === key);

    function input(key, { label, unit, wide } = {}) {
      const f = fieldOf(key);
      const def = M.defaults[key];
      const value = f.type === "number" ? fmt.input(def, f.decimals || 0) : def;
      const mode = f.type === "text" ? "text" : f.decimals ? "decimal" : "numeric";
      const id = `${cfg.prefix}-${key}`;
      return [
        `<div class="bcalc__field${wide ? " bcalc__field--wide" : ""}">`,
        `  <label for="${id}">${esc(label || ui.fields[key])}</label>`,
        `  <div class="bcalc__box${unit ? " has-unit" : ""}">`,
        `    <input id="${id}" name="${f.param}" type="text" inputmode="${mode}" autocomplete="off" spellcheck="false"${f.type === "text" ? ` maxlength="${f.max}"` : ""} value="${esc(value)}" data-cf="${key}"${unit ? ` aria-describedby="${id}-u"` : ""}>`,
        unit ? `    <span class="bcalc__unit" id="${id}-u">${esc(units[unit])}</span>` : "",
        `  </div>`,
        `</div>`,
      ].filter(Boolean).join("\n");
    }
    function item(it) {
      if (it.radio) {
        const f = fieldOf(it.radio);
        return [
          `<div class="bcalc__field bcalc__field--wide" role="radiogroup" aria-labelledby="${cfg.prefix}-${it.radio}-l">`,
          `  <span class="bcalc__label" id="${cfg.prefix}-${it.radio}-l">${esc(ui.fields[it.radio])}</span>`,
          `  <div class="bcalc__radios">`,
          ...f.options.map((o) => `    <label class="bcalc__radio"><input type="radio" name="${f.param}" value="${o}" data-cf="${it.radio}"${M.defaults[it.radio] === o ? " checked" : ""}><span>${esc(it.labels[o])}</span></label>`),
          `  </div>`,
          `</div>`,
        ].join("\n");
      }
      if (it.when) {
        const [k, v] = it.when.split("=");
        return `<div class="bcalc__when" data-when="${it.when}"${String(M.defaults[k]) === v ? "" : " hidden"}>\n${indent(input(it.key, it), 2)}\n</div>`;
      }
      return input(it.key, it);
    }
    const group = (g) => [
      `<fieldset class="bcalc__group">`,
      `  <legend>${esc(g.title)}</legend>`,
      g.intro ? `  <p class="bcalc__gintro">${esc(g.intro)}</p>` : "",
      `  <div class="bcalc__fields">`,
      ...g.items.map((it) => indent(item(it), 4)),
      `  </div>`,
      `</fieldset>`,
    ].filter(Boolean).join("\n");
    const kv = ([label, key, kind], cls = "") =>
      `<div class="bcalc__kv${cls}"><dt>${esc(label)}</dt><dd data-co="${key}" data-fmt="${kind}"${typeof r[key] === "number" && r[key] < 0 ? ' class="is-neg"' : ""}>${esc(fmt[kind](r[key]))}</dd></div>`;
    const resultGroup = (g) => [
      `<p class="bcalc__rhead">${esc(g.head)}</p>`,
      g.big ? `<dl class="bcalc__big">\n${g.big.map((x, i) => "  " + kv(x, i === 0 ? " bcalc__kv--hero" : "")).join("\n")}\n</dl>` : "",
      g.list ? `<dl class="bcalc__list">\n${g.list.map((x) => "  " + kv(x)).join("\n")}\n</dl>` : "",
    ].filter(Boolean).join("\n");
    const maxBar = Math.max(1, ...cfg.bars.map(([, k]) => Math.abs(r[k] || 0)));
    const bar = ([label, key, tone]) =>
      `<div class="bcalc__bar bcalc__bar--${tone}${r[key] < 0 ? " is-neg" : ""}" data-cbar="${key}"><span class="bcalc__bar-l">${esc(label)}</span><span class="bcalc__bar-t"><i data-cbar-fill style="width:${(100 * Math.abs(r[key] || 0) / maxBar).toFixed(1)}%"></i></span><span class="bcalc__bar-v" data-co="${key}" data-fmt="eur">${esc(fmt.eur(r[key]))}</span></div>`;
    const compare = cfg.compare ? [
      `<div class="bcalc__panel">`,
      `  <p class="bcalc__rhead">${esc(cfg.compare.head)}</p>`,
      `  <table class="bcalc__table">`,
      `    <thead><tr><th scope="col"><span class="visually-hidden">${esc(cfg.compare.head)}</span></th>${cfg.compare.cols.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead>`,
      `    <tbody>`,
      ...cfg.compare.rows.map(([label, keys, kind]) => `      <tr><th scope="row">${esc(label)}</th>${keys.map((k) => `<td data-co="${k}" data-fmt="${kind}"${r[k] < 0 ? ' class="is-neg"' : ""}>${esc(fmt[kind](r[k]))}</td>`).join("")}</tr>`),
      `    </tbody>`,
      `  </table>`,
      `  <p class="bcalc__assume">${esc(cfg.assumptions)}</p>`,
      `</div>`,
    ].join("\n") : [
      `<div class="bcalc__panel">`,
      `  <p class="bcalc__rhead">${esc(cfg.assumptionsHead)}</p>`,
      `  <p class="bcalc__assume">${esc(cfg.assumptions)}</p>`,
      `</div>`,
    ].join("\n");

    return [
      `  <section class="bcalc bcalc--${cfg.theme}" id="calculadora" data-calc="${M.id}" aria-labelledby="${cfg.prefix}-title">`,
      `    <div class="bcalc__inner">`,
      `    <header class="bcalc__head">`,
      `      <p class="bcalc__eyebrow">${esc(ui.eyebrow)}</p>`,
      `      <h2 class="bcalc__title" id="${cfg.prefix}-title">${esc(ui.title)}</h2>`,
      `      <p class="bcalc__sub">${esc(ui.subtitle)}</p>`,
      `      <p class="bcalc__example">${esc(ui.example)}</p>`,
      `    </header>`,
      `    <div class="bcalc__grid">`,
      `      <form class="bcalc__inputs" aria-labelledby="${cfg.prefix}-title" novalidate>`,
      ...cfg.groups.map((g) => indent(group(g), 8)),
      `      </form>`,
      `      <div class="bcalc__results">`,
      ...cfg.results.map((g) => indent(resultGroup(g), 8)),
      cfg.flag ? `        <p class="bcalc__warn" data-cflag="${cfg.flag[0]}"${r[cfg.flag[0]] ? "" : " hidden"}>${esc(cfg.flag[1])}</p>` : "",
      `      </div>`,
      `    </div>`,
      `    <div class="bcalc__bottom">`,
      `      <div class="bcalc__panel">`,
      `        <p class="bcalc__rhead">${esc(cfg.barsHead)}</p>`,
      `        <div class="bcalc__bars" data-cbars>`,
      ...cfg.bars.map((b) => `          ${bar(b)}`),
      `        </div>`,
      `      </div>`,
      indent(compare, 6),
      `    </div>`,
      `    <div class="ccalc-tools" role="group" aria-label="${esc(ui.toolbarLabel)}">`,
      `      <button type="button" class="bcalc__btn bcalc__btn--primary" data-ca="pdf" hidden>${esc(ui.pdf)}</button>`,
      `      <button type="button" class="bcalc__btn" data-ca="save" hidden>${esc(ui.save)}</button>`,
      `      <button type="button" class="bcalc__btn" data-ca="print" hidden>${esc(ui.print)}</button>`,
      `      <button type="button" class="bcalc__btn" data-ca="share-calc" hidden>${esc(ui.shareCalc)}</button>`,
      `      <button type="button" class="bcalc__btn" data-ca="share-section" hidden>${esc(ui.shareSection)}</button>`,
      `    </div>`,
      `    <p class="ccalc-status" data-cstatus role="status" aria-live="polite"></p>`,
      `    <input class="ccalc-link" data-clink type="text" readonly hidden aria-label="${esc(ui.linkLabel)}">`,
      `    <details class="ccalc-saved" data-csaved hidden>`,
      `      <summary>${esc(ui.savedTitle)} (<span data-csaved-count>0</span>)</summary>`,
      `      <p class="ccalc-saved__note">${esc(ui.savedNote)}</p>`,
      `      <ul class="ccalc-saved__list" data-csaved-list></ul>`,
      `    </details>`,
      `    ${i18nScript(lang, cfg.page)}`,
      `    </div>`,
      `  </section>`,
    ].filter((x) => x !== "").join("\n");
  }

  function restaurantHtml(lang) {
    const ui = translations[lang].restaurantsPage.calc.ui;
    return dashboard({
      model: restaurantModel, page: "restaurantsPage", prefix: "rc", theme: "restaurant",
      groups: [
        { title: ui.gBasic, items: [
          { key: "area", unit: "m2" }, { key: "seats", unit: "seats" },
          { key: "check", unit: "eur" }, { key: "occupancy", unit: "pct" },
          { key: "turns", unit: "turns" }, { key: "days", unit: "days" },
        ] },
        { title: ui.gCosts, intro: ui.gCostsIntro, items: [
          { key: "fb", unit: "pctNet" }, { key: "staff", unit: "eurMonth" },
          { key: "rent", unit: "eurMonth" }, { key: "utilities", unit: "eurMonth" },
          { key: "other", unit: "eurMonth" }, { key: "iva", unit: "pct" },
        ] },
        { title: ui.gReport, items: [{ key: "project", wide: true }] },
      ],
      results: [
        { head: ui.hRevenue, big: [[ui.grossMonthly, "gross", "eur"], [ui.netMonthly, "net", "eur"], [ui.grossAnnual, "grossAnnual", "eur"], [ui.netAnnual, "netAnnual", "eur"]] },
        { head: ui.hProfit, big: [[ui.profitMonthly, "profit", "eur"], [ui.profitAnnual, "profitAnnual", "eur"], [ui.margin, "margin", "pct"]] },
        { head: ui.hMetrics, list: [[ui.visits, "visits", "int"], [ui.grossPerM2, "grossPerM2", "eurm2"], [ui.breakEven, "breakEvenNet", "eur"], [ui.breakEvenOccupancy, "breakEvenOccupancy", "pct"]] },
      ],
      barsHead: ui.hChart,
      bars: [[ui.netMonthly, "net", "ink"], [ui.fields.fb, "fbCost", "accent"], [ui.fields.staff, "staffCost", "accent"], [ui.fields.rent, "rentCost", "accent"],
        [ui.fields.utilities, "utilitiesCost", "accent"], [ui.fields.other, "otherCost", "accent"], [ui.profitMonthly, "profit", "pos"]],
      assumptionsHead: ui.hAssumptions, assumptions: ui.assumptions,
    }, lang);
  }

  function fitnessHtml(lang) {
    const ui = translations[lang].fitnessPage.calc.ui;
    const labels = { "247": ui.model247, conv: ui.modelConv };
    return dashboard({
      model: fitnessModel, page: "fitnessPage", prefix: "fc", theme: "fitness",
      groups: [
        { title: ui.gSpace, items: [
          { key: "area", unit: "m2" }, { key: "capacity", unit: "people" },
          { key: "members", unit: "members" }, { key: "price", unit: "eurMonth" },
        ] },
        { title: ui.gOps, items: [
          { radio: "model", labels },
          { key: "visits", unit: "perMonth" }, { key: "duration", unit: "min" },
          { key: "hours247", label: ui.fields.hours, unit: "h", when: "model=247" },
          { key: "hoursConv", label: ui.fields.hours, unit: "h", when: "model=conv" },
        ] },
        { title: ui.gCosts, items: [
          { key: "staff247", label: ui.fields.staff, unit: "eurMonth", when: "model=247" },
          { key: "staffConv", label: ui.fields.staff, unit: "eurMonth", when: "model=conv" },
          { key: "rent", unit: "eurMonth" }, { key: "utilities", unit: "eurMonth" },
          { key: "cleaning", unit: "eurMonth" }, { key: "maintenance", unit: "eurMonth" },
          { key: "sec247", label: ui.fields.security, unit: "eurMonth", when: "model=247" },
          { key: "secConv", label: ui.fields.security, unit: "eurMonth", when: "model=conv" },
          { key: "insurance", unit: "eurMonth" },
        ] },
        { title: ui.gTax, items: [{ key: "iva", unit: "pct" }, { key: "project" }] },
      ],
      results: [
        { head: ui.hRevenue, big: [[ui.grossMonthly, "gross", "eur"], [ui.netMonthly, "net", "eur"], [ui.grossAnnual, "grossAnnual", "eur"], [ui.netAnnual, "netAnnual", "eur"]] },
        { head: ui.hProfit, big: [[ui.profitMonthly, "profit", "eur"], [ui.profitAnnual, "profitAnnual", "eur"], [ui.margin, "margin", "pct"]] },
        { head: ui.hMetrics, list: [[ui.revenuePerM2, "revenuePerM2", "eurm2"], [ui.profitPerM2, "profitPerM2", "eurm2"], [ui.capacity, "capacity", "int"], [ui.peak, "peak", "int"], [ui.breakEven, "breakEven", "int"]] },
      ],
      flag: ["overCapacity", ui.overCapacity],
      barsHead: ui.hChart,
      bars: [[ui.netMonthly, "net", "ink"], [ui.fields.staff, "staffCost", "accent"], [ui.fields.rent, "rentCost", "accent"], [ui.fields.utilities, "utilitiesCost", "accent"],
        [ui.fields.cleaning, "cleaningCost", "accent"], [ui.fields.maintenance, "maintenanceCost", "accent"], [ui.fields.security, "securityCost", "accent"],
        [ui.fields.insurance, "insuranceCost", "accent"], [ui.profitMonthly, "profit", "pos"]],
      compare: { head: ui.hCompare, cols: [ui.model247, ui.modelConv], rows: [
        [ui.expenses, ["expenses247", "expensesConv"], "eur"],
        [ui.compareProfit, ["profit247", "profitConv"], "eur"],
        [ui.peak, ["peak247", "peakConv"], "int"],
        [ui.compareBreakEven, ["breakEven247", "breakEvenConv"], "int"],
      ] },
      assumptions: ui.assumptions,
    }, lang);
  }

  return { restaurantHtml, fitnessHtml };
}

module.exports = { createBusinessCalcs };
