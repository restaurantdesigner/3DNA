/*
 * 3DNA Industrial (division) — build-time HTML for:
 *   the landing page  /es/industrial/, /en/industrial/          (templates/industrial.html)
 *   a plant dashboard /es/industrial/etanol/, /en/industrial/ethanol/ (templates/industrial-plant.html)
 * Text: assets/i18n/industrial.json (ES / EN). The 3D engine and the dashboard are client modules in
 * assets/js/industrial/ (loaded only on these pages, through the page's import map).
 */
const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonForScript = (d) => JSON.stringify(d).replace(/</g, "\\u003c");

function createIndustrialPage(i18n, { whatsappNumber, plantPath, landingPath }) {
  const T = (lang) => i18n[lang] || i18n.en;
  const ARROW = '<span aria-hidden="true">&rarr;</span>';

  function heroHtml(lang) {
    const t = T(lang), h = t.hero;
    return `  <section class="sector-hero ind-hero" aria-labelledby="ind-title">
    <div class="ind-hero__stage" data-ind-hero data-lang="${lang}" aria-label="${esc(h.hint)}"><p class="ind-hero__loading" data-loading>${esc(h.loading)}</p></div>
    <div class="ind-hero__shade" aria-hidden="true"></div>
    <div class="ind-hero__copy">
      <p class="ind-hero__label">${esc(h.label)}</p>
      <h1 class="ind-hero__title" id="ind-title"><span>${esc(h.title[0])}</span> <em>${esc(h.title[1])}</em></h1>
      <p class="ind-hero__sub">${esc(h.sub)}</p>
      <p class="ind-hero__ctas"><a class="ind-btn ind-btn--light" href="${plantPath(lang)}" data-track="industrial_factory_clicked" data-track-location="hero">${esc(h.cta)} ${ARROW}</a><button type="button" class="ind-btn ind-btn--ghost open-panel" data-track="start_project_clicked" data-track-location="industrial_hero">${esc(h.cta2)}</button></p>
      <p class="ind-hero__hint">${esc(h.hint)}</p>
    </div>
  </section>`;
  }

  function bodyHtml(lang) {
    const t = T(lang), out = [];
    const head = (n, label, title, id) => `<p class="ab-label"><span class="ab-num">${n}</span> ${esc(label)}</p>\n      <h2 class="ab-h2" id="${id}">${esc(title)}</h2>`;
    const s = t.service;
    out.push(`<section class="ab-sec ind-service" aria-labelledby="ind-service-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>${head("02", s.label, s.title, "ind-service-t")}<p class="ab-p ab-p--strong">${esc(s.lead)}</p></div>
    <ol class="ind-cards">${s.items.map(([a, b], i) => `<li data-reveal><span class="ind-cards__n">0${i + 1}</span><h3>${esc(a)}</h3><p>${esc(b)}</p></li>`).join("")}</ol>
  </div>
</section>`);
    const p = t.process;
    out.push(`<section class="ab-sec ind-process" aria-labelledby="ind-process-t">
  <div class="ab-wrap ab-grid">
    <div class="ab-side ab-sticky" data-reveal>${head("03", p.label, p.title, "ind-process-t")}<p class="ab-p">${esc(p.lead)}</p></div>
    <ol class="ab-list" data-reveal>${p.steps.map((x, i) => `<li><span class="ab-list__n">${String(i + 1).padStart(2, "0")}</span><span>${esc(x)}</span></li>`).join("")}</ol>
  </div>
</section>`);
    const e = t.equipment, f = t.finance;
    out.push(`<section class="ab-sec ind-duo" aria-labelledby="ind-equipment-t">
  <div class="ab-wrap ind-duo__grid">
    <div data-reveal>${head("04", e.label, e.title, "ind-equipment-t")}<p class="ab-p">${esc(e.lead)}</p></div>
    <div data-reveal>${head("05", f.label, f.title, "ind-finance-t")}<p class="ab-p">${esc(f.lead)}</p><p class="ind-note">${esc(f.note)}</p></div>
  </div>
</section>`);
    const a = t.audiences;
    out.push(`<section class="ab-sec ind-aud" aria-labelledby="ind-aud-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>${head("06", a.label, a.title, "ind-aud-t")}</div>
    <ul class="ind-aud__grid">${a.items.map(([x, y]) => `<li data-reveal><h3>${esc(x)}</h3><p>${esc(y)}</p></li>`).join("")}</ul>
  </div>
</section>`);
    const sh = t.showcase;
    out.push(`<section class="ab-sec ind-show" id="demo" aria-labelledby="ind-show-t">
  <div class="ab-wrap">
    <p class="ab-label" data-reveal><span class="ab-num">07</span> ${esc(sh.label)}</p>
    <a class="ind-show__card" href="${plantPath(lang)}" data-track="industrial_factory_clicked" data-track-location="showcase" data-reveal>
      <span class="ind-show__media" data-ind-poster aria-hidden="true"><img src="/images/industrial/plant-ethanol-1600.webp" srcset="/images/industrial/plant-ethanol-800.webp 800w, /images/industrial/plant-ethanol-1600.webp 1600w" sizes="(max-width: 900px) 100vw, 55vw" width="1600" height="1000" alt="" loading="lazy" decoding="async"></span>
      <span class="ind-show__body">
        <span class="ind-show__tag">${esc(sh.tag)}</span>
        <h2 class="ind-show__title" id="ind-show-t">${esc(sh.title)}</h2>
        <span class="ind-show__text">${esc(sh.text)}</span>
        <span class="ind-show__facts">${sh.facts.map(([n, l]) => `<span><b>${esc(n)}</b>${esc(l)}</span>`).join("")}</span>
        <span class="ind-btn ind-btn--light">${esc(sh.cta)} ${ARROW}</span>
      </span>
    </a>
  </div>
</section>`);
    const c = t.cta;
    const wa = `https://wa.me/${whatsappNumber(lang)}?text=${encodeURIComponent(c.whatsappText)}`;
    out.push(`<section class="ab-sec ab-personal ind-cta" aria-labelledby="ind-cta-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>${head("08", c.label, c.title, "ind-cta-t")}<p class="ab-p">${esc(c.text)}</p>
      <div class="ab-cta"><button type="button" class="ab-cta__btn open-panel" data-track="start_project_clicked" data-track-location="industrial_cta">${esc(c.button)} ${ARROW}</button><a class="ab-cta__wa" href="${esc(wa)}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="industrial_cta">${esc(c.whatsapp)}</a></div>
    </div>
  </div>
</section>`);
    return out.join("\n\n");
  }

  // the plant dashboard (full-screen app; the factory module and its UI text are read by assets/js/industrial/dashboard.js)
  function plantHtml(lang, factoryId, nameText) {
    const t = T(lang).twin;
    return `<div class="tw left-open right-open" data-twin data-factory="${factoryId}" data-lang="${lang}">
  <header class="tw__top">
    <a class="tw__brand" href="${landingPath(lang)}"><b>3DNA</b> Industrial <span>Digital Twin</span></a>
    <div class="tw__title"><h1>${esc(nameText)}</h1><span class="tw__badge">${esc(t.badge)}</span></div>
    <div class="tw__views" role="group" aria-label="${esc(t.viewsLabel)}">
      <button type="button" data-view="realistic" aria-pressed="true">${esc(t.views.realistic)}</button>
      <button type="button" data-view="process" aria-pressed="false">${esc(t.views.process)}</button>
      <button type="button" data-view="xray" aria-pressed="false">${esc(t.views.xray)}</button>
    </div>
    <div class="tw__tools">
      <button type="button" class="tw__icon" data-home title="${esc(t.homeView)}" aria-label="${esc(t.homeView)}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>
      <button type="button" class="tw__icon" data-fullscreen aria-pressed="false" title="${esc(t.fullscreen)}" aria-label="${esc(t.fullscreen)}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      <a class="tw__back" href="/${lang}/">${esc(t.home3dna)}</a>
    </div>
  </header>
  <div class="tw__body">
    <aside class="tw__panel tw__left" aria-label="${esc(t.panels.left)}">
      <div data-tabs>
        <div class="tw__tabs" role="tablist"><button type="button" role="tab" data-tab="equipment" aria-selected="true">${esc(t.tabs.equipment)}</button><button type="button" role="tab" data-tab="process" aria-selected="false">${esc(t.tabs.process)}</button></div>
        <div class="tw__pane" data-pane="equipment"><input type="search" class="tw-search" data-search placeholder="${esc(t.search)}" aria-label="${esc(t.search)}"><div data-equipment></div></div>
        <div class="tw__pane" data-pane="process" hidden><ol class="tw-steps" data-steps></ol><p class="tw-k">${esc(t.streams)}</p><p class="tw-hint">${esc(t.streamsHint)}</p><div class="tw-streams" data-streams></div></div>
      </div>
    </aside>
    <button type="button" class="tw__toggle tw__toggle--left" data-toggle="left" aria-label="${esc(t.panels.left)}"><span>${esc(t.panels.left)}</span></button>
    <div class="tw__stage" data-stage>
      <p class="tw__loading" data-loading>${esc(t.loading)}</p>
      <div class="tw__strip" data-strip></div>
    </div>
    <button type="button" class="tw__toggle tw__toggle--right" data-toggle="right" aria-label="${esc(t.panels.right)}"><span>${esc(t.panels.right)}</span></button>
    <aside class="tw__panel tw__right" aria-label="${esc(t.panels.right)}">
      <div data-tabs>
        <div class="tw__tabs" role="tablist"><button type="button" role="tab" data-tab="detail" aria-selected="true">${esc(t.tabs.detail)}</button><button type="button" role="tab" data-tab="invest" aria-selected="false">${esc(t.tabs.invest)}</button><button type="button" role="tab" data-tab="prod" aria-selected="false">${esc(t.tabs.prod)}</button></div>
        <div class="tw__pane" data-pane="detail"><div data-detail></div></div>
        <div class="tw__pane" data-pane="invest" hidden><div class="tw-kpis" data-kpis></div><div class="tw-inputs" data-inputs></div><p class="tw-k">${esc(t.capexTitle)}</p><ul class="tw-bars" data-capex></ul><p class="tw-k">${esc(t.opexTitle)}</p><div class="tw-opex" data-opex></div><p class="tw-note">${esc(t.financeNote)}</p></div>
        <div class="tw__pane" data-pane="prod" hidden><div class="tw-kpis" data-prod></div><p class="tw-k">${esc(t.monthlyTitle)}</p><ul class="tw-months" data-monthly></ul><p class="tw-note">${esc(t.financeNote)}</p></div>
      </div>
    </aside>
  </div>
  <script type="application/json" data-twin-ui>${jsonForScript(t)}</script>
</div>`;
  }

  return { heroHtml, bodyHtml, plantHtml, meta: (lang) => T(lang).meta, twinMeta: (lang) => ({ title: T(lang).twin.metaTitle, description: T(lang).twin.metaDescription, ogTitle: T(lang).twin.ogTitle, ogImageAlt: T(lang).twin.ogImageAlt }), nav: (lang) => T(lang).nav };
}

module.exports = { createIndustrialPage };
