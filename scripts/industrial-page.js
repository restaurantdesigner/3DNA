/*
 * 3DNA Industrial (division) — build-time HTML for:
 *   the landing page  /es/industrial/, /en/industrial/          (templates/industrial.html)
 *   a plant dashboard /es/industrial/etanol/, /en/industrial/ethanol/ (templates/industrial-plant.html)
 * Text: assets/i18n/industrial.json (ES / EN). The 3D engine and the dashboard are client modules in
 * assets/js/industrial/ (loaded only on these pages, through the page's import map).
 */
const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonForScript = (d) => JSON.stringify(d).replace(/</g, "\\u003c");

const FLAG = "<svg class=\"tw-flag\" viewBox=\"0 0 24 12\" width=\"22\" height=\"11\" role=\"img\" aria-label=\"Canada\"><rect width=\"24\" height=\"12\" fill=\"#fff\"/><rect width=\"6\" height=\"12\" fill=\"#d52b1e\"/><rect x=\"18\" width=\"6\" height=\"12\" fill=\"#d52b1e\"/><path d=\"M12 2.2l.75 1.45 .9-.4-.35 2.1 1.15-1.05.25.75 1.2-.2-.45 1.35.55.3-2.2 1.75.25.85-1.85-.25V10h-.5V8.85l-1.85.25.25-.85-2.2-1.75.55-.3-.45-1.35 1.2.2.25-.75 1.15 1.05-.35-2.1.9.4z\" fill=\"#d52b1e\"/></svg>";
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

  // Base Case pre-rendered at build time by the same model and view module the browser uses (never hardcoded)
  const fin = (o) => {
    const { execFileSync } = require("child_process");
    return JSON.parse(execFileSync(process.execPath, ["--no-warnings", require("path").join(__dirname, "industrial-finance.mjs"), JSON.stringify(o)], { encoding: "utf8" }));
  };
  function twinBand(lang, s) {
    const o = s.overview, r = fin(o);
    return `<section class="ind-twin" aria-label="${esc(o.title)}">
  <img class="ind-twin__bg" data-twin-poster src="/images/industrial/twin-backdrop-1920.webp" srcset="/images/industrial/twin-backdrop-960.webp 960w, /images/industrial/twin-backdrop-1920.webp 1920w" sizes="100vw" width="1920" height="1080" alt="${esc(o.backdropAlt)}" loading="lazy" decoding="async">
  <div class="ind-twin__shade" aria-hidden="true"></div>
  <div class="ind-twin__in">
    <ol class="ind-twin__cards">${s.items.map(([a, b], i) => `<li data-reveal><span class="ind-twin__n">0${i + 1}</span><h3>${esc(a)}</h3><p>${esc(b)}</p></li>`).join("")}</ol>
    <div class="ind-twin__gap" aria-hidden="true"></div>
    <div class="ind-twin__wrap" data-ind-fin data-reveal>
      <script type="application/json" data-fin-i18n>${JSON.stringify(o).replace(/</g, "\\u003c")}</script>
      <div class="ind-twin__ctl" data-fin-ctl hidden></div>
      <div class="ind-twin__fin">
        <div class="ind-twin__panel">
          <p class="ind-twin__h"><b data-fin-name>${esc(r.scenario)}</b> · ${esc(o.title)}</p>
          <dl class="ind-twin__kpis" data-fin-kpis>${r.kpis}</dl>
        </div>
        <div class="ind-twin__panel">
          <p class="ind-twin__h"><b>${esc(o.chartTitle)}</b> (${esc(o.chartYears)})</p>
          <div data-fin-chart>${r.chart}</div>
        </div>
        <div class="ind-twin__panel ind-twin__pay" data-fin-pay>${r.pay}</div>
      </div>
    </div>
    <p class="ind-twin__foot"><span>${esc(o.note)}</span><a class="ind-btn ind-btn--light" href="${plantPath(lang)}" data-track="industrial_factory_clicked" data-track-location="investment_overview">${esc(o.cta)} ${ARROW}</a></p>
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
  </div>
</section>
${twinBand(lang, s)}`);
    const p = t.process;
    out.push(`<section class="ab-sec ind-process" aria-labelledby="ind-process-t">
  <div class="ab-wrap ab-grid">
    <div class="ab-side ab-sticky" data-reveal>${head("03", p.label, p.title, "ind-process-t")}<p class="ab-p">${esc(p.lead)}</p></div>
    <ol class="ab-list" data-reveal>${p.steps.map((x, i) => `<li><span class="ab-list__n">${String(i + 1).padStart(2, "0")}</span><span>${esc(x)}</span></li>`).join("")}</ol>
  </div>
  <figure class="ab-wrap ind-film" data-reveal>
    <div class="ind-film__frame">
      <video class="ind-film__v" controls playsinline preload="none" poster="/images/industrial/flythrough-tour-poster.webp" width="1280" height="720" aria-label="${esc(p.video.label)}">
        <source src="/images/industrial/flythrough-tour-720.mp4" type="video/mp4">
      </video>
    </div>
    <figcaption class="ind-film__cap"><b>${esc(p.video.title)}</b> <span>${esc(p.video.meta)}</span><br>${esc(p.video.caption)}</figcaption>
  </figure>
</section>`);
    const e = t.equipment, f = t.finance;
    out.push(`<section class="ab-sec ind-duo" aria-labelledby="ind-equipment-t">
  <div class="ab-wrap ind-duo__grid">
    <div data-reveal>${head("04", e.label, e.title, "ind-equipment-t")}<p class="ab-p">${esc(e.lead)}</p></div>
    <div data-reveal>${head("05", f.label, f.title, "ind-finance-t")}<p class="ab-p">${esc(f.lead)}</p></div>
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
    out.push(`<section class="ind-showfs" id="demo" aria-labelledby="ind-show-t">
  <img class="ind-showfs__img" src="/images/industrial/case-render-1672.webp" srcset="/images/industrial/case-render-900.webp 900w, /images/industrial/case-render-1672.webp 1672w" sizes="100vw" width="1672" height="941" alt="${esc(sh.imageAlt)}" loading="lazy" decoding="async">
  <div class="ind-showfs__shade" aria-hidden="true"></div>
  <div class="ind-showfs__in">
    <p class="ind-showfs__label" data-reveal><span class="ab-num">07</span> ${esc(sh.label)}</p>
    <div class="ind-showfs__copy" data-reveal>
      <p class="ind-showfs__loc">${FLAG}<span>${esc(sh.location)}</span></p>
      <h2 class="ind-showfs__title" id="ind-show-t">${esc(sh.title)}</h2>
      <p class="ind-showfs__text">${esc(sh.text)}</p>
      <ul class="ind-showfs__facts">${sh.facts.map(([n, l]) => `<li><b>${esc(n === "{capex}" ? fin(t.service.overview).capex : n)}</b><span>${esc(l)}</span></li>`).join("")}</ul>
      <p class="ind-showfs__ctas"><a class="ind-btn ind-btn--light" href="${plantPath(lang)}" data-track="industrial_factory_clicked" data-track-location="showcase">${esc(sh.cta)} ${ARROW}</a></p>
      <p class="ind-showfs__disc">${esc(sh.disclosure)}</p>
    </div>
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
    <div class="tw__title"><h1>${esc(nameText)}</h1><span class="tw__loc">${FLAG}${esc(t.location)}</span><span class="tw__badge">${esc(t.badge)}</span></div>
    <div class="tw__views" role="group" aria-label="${esc(t.viewsLabel)}">
      <button type="button" data-view="realistic" aria-pressed="true">${esc(t.views.realistic)}</button>
      <button type="button" data-view="process" aria-pressed="false">${esc(t.views.process)}</button>
      <button type="button" data-view="xray" aria-pressed="false">${esc(t.views.xray)}</button>
      <button type="button" data-view="thermal" aria-pressed="false">${esc(t.views.thermal)}</button>
      <button type="button" data-view="blueprint" aria-pressed="false">${esc(t.views.blueprint)}</button>
      <button type="button" data-view="night" aria-pressed="false">${esc(t.views.night)}</button>
    </div>
    <div class="tw__tools">
      <button type="button" class="tw-price-btn" data-pricing aria-haspopup="dialog"><span class="tw-price-btn__l">${esc(t.pricing.button)}</span><span class="tw-price-btn__s">${esc(t.pricing.buttonShort)}</span></button>
      <button type="button" class="tw__icon" data-home title="${esc(t.homeView)}" aria-label="${esc(t.homeView)}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>
      <button type="button" class="tw__icon" data-fullscreen aria-pressed="false" title="${esc(t.fullscreen)}" aria-label="${esc(t.fullscreen)}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    </div>
  </header>
  <div class="tw__body">
    <aside class="tw__panel tw__left" aria-label="${esc(t.panels.left)}">
      <div data-tabs>
        <div class="tw__tabs" role="tablist"><button type="button" role="tab" data-tab="project" aria-selected="true">${esc(t.tabs.project)}</button><button type="button" role="tab" data-tab="equipment" aria-selected="false">${esc(t.tabs.equipment)}</button><button type="button" role="tab" data-tab="process" aria-selected="false">${esc(t.tabs.process)}</button></div>
        <div class="tw__pane tw-proj" data-pane="project" data-project></div>
        <div class="tw__pane" data-pane="equipment" hidden><input type="search" class="tw-search" data-search placeholder="${esc(t.search)}" aria-label="${esc(t.search)}"><div data-equipment></div></div>
        <div class="tw__pane" data-pane="process" hidden><ol class="tw-steps" data-steps></ol><p class="tw-k">${esc(t.streams)}</p><p class="tw-hint">${esc(t.streamsHint)}</p><div class="tw-streams" data-streams></div></div>
      </div>
    </aside>
    <button type="button" class="tw__toggle tw__toggle--left" data-toggle="left" aria-label="${esc(t.panels.left)}"><span>${esc(t.panels.left)}</span></button>
    <div class="tw__stage" data-stage>
      <p class="tw__loading" data-loading>${esc(t.loading)}</p>
      <div class="tw-nets" data-networks></div>
      <div class="tw__strip" data-strip></div>
    </div>
    <button type="button" class="tw__toggle tw__toggle--right" data-toggle="right" aria-label="${esc(t.panels.right)}"><span>${esc(t.panels.right)}</span></button>
    <aside class="tw__panel tw__right" aria-label="${esc(t.panels.right)}">
      <div data-tabs>
        <div class="tw__tabs" role="tablist"><button type="button" role="tab" data-tab="detail" aria-selected="true">${esc(t.tabs.detail)}</button><button type="button" role="tab" data-tab="invest" aria-selected="false">${esc(t.tabs.invest)}</button><button type="button" role="tab" data-tab="prod" aria-selected="false">${esc(t.tabs.prod)}</button><button type="button" role="tab" data-tab="sources" aria-selected="false">${esc(t.tabs.sources)}</button></div>
        <div class="tw__pane" data-pane="detail"><div data-detail></div></div>
        <div class="tw__pane" data-pane="invest" hidden><div class="tw-kpis" data-kpis></div><div class="tw-inputs" data-inputs></div><p class="tw-k">${esc(t.capexTitle)}</p><ul class="tw-bars" data-capex></ul><p class="tw-k">${esc(t.opexTitle)}</p><div class="tw-opex" data-opex></div><p class="tw-note">${esc(t.financeNote)}</p></div>
        <div class="tw__pane" data-pane="prod" hidden><div class="tw-kpis" data-prod></div><p class="tw-k">${esc(t.monthlyTitle)}</p><ul class="tw-months" data-monthly></ul><p class="tw-note">${esc(t.financeNote)}</p></div>
        <div class="tw__pane" data-pane="sources" hidden><div data-sources></div></div>
      </div>
    </aside>
  </div>
  <div class="tw-modal" data-pricing-modal data-wa="${esc(whatsappNumber(lang))}" hidden>
    <div class="tw-modal__backdrop" data-pricing-close></div>
    <div class="tw-modal__box" role="dialog" aria-modal="true" aria-labelledby="tw-pricing-t">
      <button type="button" class="tw-modal__x" data-pricing-close aria-label="${esc(t.pricing.close)}">×</button>
      <h2 class="tw-modal__t" id="tw-pricing-t">${esc(t.pricing.title)}</h2>
      <p class="tw-modal__intro">${esc(t.pricing.intro)}</p>
      <div class="tw-pkgs" role="radiogroup" aria-labelledby="tw-pricing-t">
        ${t.pricing.packages.map((k) => `<label class="tw-pkg${k.recommended ? " is-rec is-on" : ""}"><input type="radio" name="tw-package" value="${k.id}"${k.recommended ? " checked" : ""} data-name="${esc(k.name)}" data-range="${esc(k.range)}">
          <span class="tw-pkg__top"><span class="tw-pkg__name">${esc(k.name)}</span>${k.recommended ? `<span class="tw-pkg__rec">${esc(t.pricing.recommended)}</span>` : ""}<span class="tw-pkg__check" aria-hidden="true"></span></span>
          <span class="tw-pkg__range">${esc(k.range)}</span>
          <span class="tw-pkg__text">${esc(k.text)}</span></label>`).join("")}
      </div>
      <a class="tw-modal__cta" data-pricing-cta href="https://wa.me/${esc(whatsappNumber(lang))}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="industrial_pricing">${esc(t.pricing.cta)}</a>
      <p class="tw-modal__note">${esc(t.pricing.disclaimer)}</p>
    </div>
  </div>
  <script type="application/json" data-twin-ui>${jsonForScript(t)}</script>
</div>`;
  }

  return { heroHtml, bodyHtml, plantHtml, meta: (lang) => T(lang).meta, twinMeta: (lang) => ({ title: T(lang).twin.metaTitle, description: T(lang).twin.metaDescription, ogTitle: T(lang).twin.ogTitle, ogImageAlt: T(lang).twin.ogImageAlt }), nav: (lang) => T(lang).nav };
}

module.exports = { createIndustrialPage };
