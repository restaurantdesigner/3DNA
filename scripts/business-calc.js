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

function createBusinessCalcs(translations, { whatsappHref, email, restaurantSharePath, fitnessSharePath }) {
  function i18nScript(lang, page) {
    const T = translations[lang], E = translations.en;
    const block = (tr) => ({ ...tr.calcCommon.report, ...tr[page].calc.report });
    return `<script type="application/json" data-calc-i18n>${json({
      locale: LOCALE[lang] || "en-GB",
      ui: { ...T.calcCommon.ui, ...T[page].calc.ui },
      report: { ...block(E), ...block(T) },   // English fills any report string not yet translated
      reportEn: ["es", "en"].includes(lang) ? null : block(E),   // fallback for RU / UK PDFs only
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

  // Restaurants: "Calculadora de Potencial Comercial" — five inputs, summary, full report
  function restaurantHtml(lang) {
    const M = restaurantModel;
    const T = translations[lang], E = translations.en;
    const ui = { ...T.calcCommon.ui, ...T.restaurantsPage.calc.ui };
    const rt = { ...E.calcCommon.report, ...E.restaurantsPage.calc.report, ...T.calcCommon.report, ...T.restaurantsPage.calc.report };
    const fmt = tools.formatter(LOCALE[lang]);
    const r = M.compute(M.defaults);
    const fieldOf = (key) => M.fields.find((f) => f.key === key);
    const box = (key, unit) => {
      const f = fieldOf(key);
      return [
        `<div class="bcalc__field">`,
        `  <label for="rc-${key}">${esc(ui.fields[key])}</label>`,
        `  <div class="bcalc__box has-unit">`,
        `    <input id="rc-${key}" name="${f.param}" type="text" inputmode="${f.decimals ? "decimal" : "numeric"}" autocomplete="off" spellcheck="false" value="${esc(fmt.input(M.defaults[key], f.decimals || 0))}" data-cf="${key}" aria-describedby="rc-${key}-u">`,
        `    <span class="bcalc__unit" id="rc-${key}-u">${esc(ui.units[unit])}</span>`,
        `  </div>`,
        `</div>`,
      ].join("\n");
    };
    const rot = fieldOf("rotation");
    const card = (label, key, note, strong) =>
      `<div class="rpc-card${strong ? " rpc-card--strong" : ""}"><dt>${esc(label)}</dt><dd data-co="${key}" data-fmt="eur"${r[key] < 0 ? ' class="is-neg"' : ""}>${esc(fmt.eur(r[key]))}</dd><p class="rpc-card__note">${esc(note)}</p></div>`;
    return [
      `  <section class="bcalc bcalc--restaurant rpc" id="calculadora" data-calc="restaurant" aria-labelledby="rc-title"${restaurantSharePath ? ` data-share-url="${esc(restaurantSharePath(lang))}"` : ""}>`,
      `    <div class="bcalc__inner">`,
      `    <header class="bcalc__head">`,
      `      <p class="bcalc__eyebrow">${esc(ui.eyebrow)}</p>`,
      `      <h2 class="bcalc__title" id="rc-title">${esc(ui.title)}</h2>`,
      `      <p class="bcalc__sub">${esc(ui.subtitle)}</p>`,
      `    </header>`,
      `    <form class="rpc-inputs" aria-label="${esc(ui.inputsLabel)}" novalidate>`,
      indent([box("area", "m2"), box("seats", "seats"), box("ticket", "eur"), box("days", "days")].join("\n"), 6),
      `      <div class="bcalc__field rpc-slider">`,
      `        <label for="rc-rotation">${esc(ui.fields.rotation)}</label>`,
      `        <div class="rpc-slider__row">`,
      `          <input id="rc-rotation" name="${rot.param}" type="range" min="${rot.min}" max="${rot.max}" step="0.1" value="${M.defaults.rotation}" autocomplete="off" data-cf="rotation" aria-describedby="rc-rotation-u">`,
      `          <input class="rpc-slider__val" id="rc-rotation-n" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(fmt.input(M.defaults.rotation, 1))}" data-cf="rotation" aria-label="${esc(ui.fields.rotation)}">`,
      `        </div>`,
      `        <span class="rpc-slider__unit" id="rc-rotation-u"><span aria-hidden="true">${rot.min}</span><span>${esc(ui.rotationUnit)}</span><span aria-hidden="true">${rot.max}</span></span>`,
      `      </div>`,
      `    </form>`,
      `    <dl class="rpc-cards">`,
      `      ${card(rt.cards.grossMonthly, "gross", rt.cards.ivaIncl, true)}`,
      `      ${card(rt.cards.grossAnnual, "grossAnnual", rt.cards.ivaIncl, true)}`,
      `      ${card(rt.cards.profitMonthly, "profit", rt.tags.scn)}`,
      `      <div class="rpc-card"><dt>${esc(rt.cards.staff)}</dt><dd data-co="staffFte" data-fmt="num1" data-tpl="${esc(rt.cards.staffValue)}">${esc(rt.cards.staffValue.replace("{v}", fmt.num1(r.staffFte)))}</dd><p class="rpc-card__note">${esc(rt.tags.est)}</p></div>`,
      `    </dl>`,
      `    <p class="rpc-cards__note">${esc(rt.cards.note.replace("{u}", fmt.pct(M.ASSUMPTIONS.utilization.base)))}</p>`,
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
      // the full report: one accordion, closed on every load (the PDF always holds all of it)
      `    <details class="rpc-report" data-rpc-full>`,
      `      <summary class="rpc-report__head">`,
      `        <span class="rpc-report__titles"><span class="rpc-report__title">${esc(ui.fullTitle)}</span><span class="rpc-report__sub">${esc(ui.fullSub)}</span></span>`,
      `        <svg class="rpc-report__chev" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      `      </summary>`,
      `      <div class="rpc-report__inner">`,
      `        <p class="rpc-report__intro">${esc(ui.reportIntro)}</p>`,
      `        <ul class="rpc-legend">${["in", "est", "scn"].map((k) => `<li><span class="rpc-tag rpc-tag--${k}">${esc(rt.tags[k])}</span> ${esc(rt.tagsHelp[k])}</li>`).join("")}</ul>`,
      // filled from the live calculation the first time the report is opened
      `        <div class="rpc-report__body" data-rpc-report></div>`,
      `      </div>`,
      `    </details>`,
      `    ${i18nScript(lang, "restaurantsPage")}`,
      `    </div>`,
      `  </section>`,
    ].join("\n");
  }

  // Fitness: compact progressive planner. One required input (floor area); concept, premises, demand and
  // air-conditioning in "Advanced settings"; one project summary card; the detailed plan in eight accordions.
  // One Spain reference baseline for every visitor (never chosen by language or location).
  // Every figure comes from the model (assets/js/fitness-calc.js); the card is pre-rendered with the
  // same function the browser uses, so the page reads without JavaScript.
  function fitnessHtml(lang) {
    const M = fitnessModel;
    const T = translations[lang], E = translations.en;
    const ui = { ...T.calcCommon.ui, ...T.fitnessPage.calc.ui };
    const rt = { ...E.calcCommon.report, ...E.fitnessPage.calc.report, ...T.calcCommon.report, ...T.fitnessPage.calc.report };
    const fmt = tools.formatter(LOCALE[lang]);
    const r = M.compute(M.defaults);
    const f = M.fields[0];
    const optLabel = (field, o) => ({ concept: o === "auto" ? rt.autoConcept : (rt.concepts[o] || {}).name, condition: rt.conditions[o], demand: rt.demands[o], hvac: rt.hvacReuse[o] })[field];
    const select = (field) => {
      const fd = M.fields.find((x) => x.key === field);
      return [
        `<div class="gp-field">`,
        `  <label for="fc-${field}">${esc(ui.fields[field])}</label>`,
        `  <select id="fc-${field}" name="${fd.param}" data-cf="${field}">`,
        ...fd.options.map((o) => `    <option value="${o}"${M.defaults[field] === o ? " selected" : ""}>${esc(optLabel(field, o))}${M.defaults[field] === o ? ` (${esc(ui.defaultMark)})` : ""}</option>`),
        `  </select>`,
        `</div>`,
      ].join("\n");
    };
    const chev = `<svg class="gp-chev" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const contact = { whatsapp: whatsappHref(lang), email };
    return [
      `  <section class="bcalc bcalc--fitness gp" id="calculadora" data-calc="fitness" aria-labelledby="fc-title"${fitnessSharePath ? ` data-share-url="${esc(fitnessSharePath(lang))}"` : ""}>`,
      `    <div class="gp__inner">`,
      // left: title, the one required input, advanced settings, saved analyses
      `    <div class="gp-left">`,
      `      <header class="gp-head">`,
      `        <p class="bcalc__eyebrow">${esc(ui.eyebrow)}</p>`,
      `        <h2 class="gp-title" id="fc-title">${esc(ui.title)}</h2>`,
      `        <p class="gp-sub">${esc(ui.subtitle)}</p>`,
      `      </header>`,
      `      <form class="gp-form" novalidate aria-labelledby="fc-title">`,
      `        <div class="gp-field gp-field--area">`,
      `          <label for="fc-area">${esc(ui.inputLabel)}</label>`,
      `          <div class="bcalc__box has-unit gp-box">`,
      `            <input id="fc-area" name="${f.param}" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" value="${esc(fmt.input(M.defaults.area, 0))}" data-cf="area" aria-describedby="fc-area-u fc-area-h">`,
      `            <span class="bcalc__unit" id="fc-area-u">${esc(ui.units.m2)}</span>`,
      `          </div>`,
      `          <p class="gp-hint" id="fc-area-h">${esc(ui.inputHint)} ${esc(ui.live)}</p>`,
      `        </div>`,
      `        <p class="gp-ref">${esc(ui.disclaimer)}</p>`,
      `        <details class="gp-adv">`,
      `          <summary>${esc(ui.optsTitle)}${chev}</summary>`,
      `          <div class="gp-adv__body">`,
      `            <p class="gp-hint">${esc(ui.optsHint)}</p>`,
      ...["concept", "condition", "demand", "hvac"].map((x) => indent(select(x), 12)),
      `          </div>`,
      `        </details>`,
      `      </form>`,
      `      <details class="ccalc-saved" data-csaved hidden>`,
      `        <summary>${esc(ui.savedTitle)} (<span data-csaved-count>0</span>)</summary>`,
      `        <p class="ccalc-saved__note">${esc(ui.savedNote)}</p>`,
      `        <ul class="ccalc-saved__list" data-csaved-list></ul>`,
      `      </details>`,
      `    </div>`,
      // right: recommended concept and financial summary (same calculation as the report)
      `    <article class="gp-card" aria-live="polite">`,
      `      <div class="gp-card__summary" data-gp-summary>`,
      indent(M.summaryHtml(r._an, rt, fmt, contact), 8),
      `      </div>`,
      `      <div class="gp-card__foot">`,
      `        <button type="button" class="gp-open" data-gp-open-report>${esc(ui.openPlan)} <span aria-hidden="true">→</span></button>`,
      `        <div class="ccalc-tools gp-tools" role="group" aria-label="${esc(ui.toolbarLabel)}">`,
      `          <button type="button" class="bcalc__btn" data-ca="pdf" hidden>${esc(ui.pdf)}</button>`,
      `          <button type="button" class="bcalc__btn" data-ca="save" hidden>${esc(ui.save)}</button>`,
      `          <button type="button" class="bcalc__btn" data-ca="print" hidden>${esc(ui.print)}</button>`,
      `          <button type="button" class="bcalc__btn" data-ca="share-calc" hidden>${esc(ui.shareCalc)}</button>`,
      `          <button type="button" class="bcalc__btn" data-ca="share-section" hidden>${esc(ui.shareSection)}</button>`,
      `          <a class="bcalc__btn gp-wa-btn" href="${esc(contact.whatsapp)}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="gym_planner">WhatsApp</a>`,
      `        </div>`,
      `        <p class="ccalc-status" data-cstatus role="status" aria-live="polite"></p>`,
      `        <input class="ccalc-link" data-clink type="text" readonly hidden aria-label="${esc(ui.linkLabel)}">`,
      `      </div>`,
      `    </article>`,
      // detailed business plan: a dialog with its own scroll area, so the page section never grows
      `    <dialog class="gp-report" data-gp-report aria-labelledby="gp-report-title">`,
      `      <header class="gp-report__head">`,
      `        <button type="button" class="gp-report__back" data-gp-report-close><span aria-hidden="true">←</span> ${esc(ui.backToCalc)}</button>`,
      `        <h3 class="gp-report__title" id="gp-report-title">${esc(ui.planTitle)}</h3>`,
      `        <button type="button" class="gp-report__x" data-gp-report-close aria-label="${esc(ui.closePlan)}"><span aria-hidden="true">×</span></button>`,
      `      </header>`,
      `      <div class="gp-report__body">`,
      `        <p class="gp-hint">${esc(ui.planSub)}</p>`,
      `        <ul class="rpc-legend gp-legend">${M.TAGS.map((t) => `<li><span class="rpc-tag rpc-tag--${t}">${esc(rt.tags[t])}</span> ${esc(rt.tagsHelp[t])}</li>`).join("")}</ul>`,
      `        <div class="gp-plan">`,
      ...M.GROUPS.map((g, i) => [
        `          <details class="gp-acc" data-gp-sec="${g.id}">`,
        `            <summary class="gp-acc__head"><span class="gp-acc__num">${String(i + 1).padStart(2, "0")}</span><span class="gp-acc__titles"><span class="gp-acc__title">${esc(rt.gp.groups[g.id])}</span><span class="gp-acc__sub">${esc(rt.gp.groupSubs[g.id])}</span></span>${chev}</summary>`,
        `            <div class="gp-acc__body" data-gp-body></div>`,
        `          </details>`,
      ].join("\n")),
      `        </div>`,
      `      </div>`,
      `    </dialog>`,
      `    ${i18nScript(lang, "fitnessPage")}`,
      `    </div>`,
      `  </section>`,
    ].join("\n");
  }

  return { restaurantHtml, fitnessHtml };
}

module.exports = { createBusinessCalcs };
