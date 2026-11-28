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
function createIndustrialPage(i18n, { whatsappNumber, plantPath, landingPath, builderPath, configuratorPath }) {
  const T = (lang) => i18n[lang] || i18n.en;
  const ARROW = '<span aria-hidden="true">&rarr;</span>';
  const SHARE_ICON = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";
  // quick-share button: native share sheet on phones (with the tool's share card), share panel elsewhere
  const shareAny = ({ title, text, url, img, cls = "shr-btn", label, track, icon }) => `<button type="button" class="${cls}" data-share data-share-title="${esc(title)}" data-share-text="${esc(text)}" data-share-url="${url}" data-share-img="${img}" data-track="industrial_share_clicked" data-track-location="${track}" aria-label="${esc(label)}">${SHARE_ICON}${icon ? "" : `<span>${esc(label)}</span>`}</button>`;
  const shareBtn = (lang, id, cls = "shr-btn", label) => { const k = T(lang).tools, x = k.items.find((i) => i.id === id); const url = { twin: plantPath(lang), builder: builderPath && builderPath(lang), configurator: configuratorPath && configuratorPath(lang) }[id];
    return `<button type="button" class="${cls}" data-share data-share-title="${esc(x.share.title)}" data-share-text="${esc(x.share.text)}" data-share-url="${url}" data-share-img="/images/industrial/share-${id}.jpg" data-track="industrial_share_clicked" data-track-location="${id}">${SHARE_ICON}<span>${esc(label || k.shareLabel)}</span></button>`; };

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
      ${builderPath ? `<p class="ind-hero__build"><a class="ind-btn ind-btn--build" href="${builderPath(lang)}" data-track="factory_builder_clicked" data-track-location="hero">${esc(h.cta3)} ${ARROW}</a>${configuratorPath ? `<a class="ind-btn ind-btn--ghost" href="${configuratorPath(lang)}" data-track="plant_configurator_clicked" data-track-location="hero">${esc(h.cta4)}</a>` : ""}</p>` : ""}
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

  // landing: the three interactive tools, each with a screenshot, what it is and what it shows
  function toolsHtml(lang) {
    const k = T(lang).tools;
    const href = { twin: plantPath(lang), builder: builderPath ? builderPath(lang) : "", configurator: configuratorPath ? configuratorPath(lang) : "" };
    return `<section class="ab-sec ind-tools" id="tools" aria-labelledby="ind-tools-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal><p class="ab-label">${esc(k.label)}</p><h2 class="ab-h2" id="ind-tools-t">${esc(k.title)}</h2><p class="ab-p">${esc(k.lead)}</p></div>
    <ul class="ind-tools__grid">${k.items.filter((x) => href[x.id]).map((x) => `<li class="ind-tool" data-reveal>
      <a class="ind-tool__img" href="${href[x.id]}" data-track="industrial_tool_clicked" data-track-location="${x.id}" tabindex="-1" aria-hidden="true"><img src="/images/industrial/tool-${x.id}-960.webp" width="960" height="540" alt="${esc(x.alt)}" loading="lazy" decoding="async"></a>
      <p class="ind-tool__k">${esc(x.kicker)}</p>
      <h3 class="ind-tool__t"><a href="${href[x.id]}">${esc(x.name)}</a></h3>
      <p class="ind-tool__h">${esc(k.whatIs)}</p><p class="ind-tool__p">${esc(x.is)}</p>
      <p class="ind-tool__h">${esc(k.shows)}</p><ul class="ind-tool__l">${x.shows.map((y) => `<li>${esc(y)}</li>`).join("")}</ul>
      <div class="ind-tool__acts"><a class="ind-btn ind-btn--dark" href="${href[x.id]}" data-track="industrial_tool_clicked" data-track-location="${x.id}_cta">${esc(x.cta)} ${ARROW}</a>${shareBtn(lang, x.id)}</div>
    </li>`).join("")}</ul>
    <p class="ind-tools__note">${esc(k.note)}</p>
  </div>
</section>`;
  }

  function bodyHtml(lang) {
    const t = T(lang), out = [toolsHtml(lang)];
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
  <figure class="ab-wrap ind-film" id="film" data-reveal>
    <div class="ind-film__frame">${shareAny({ title: p.video.share.title, text: p.video.share.text, url: `${landingPath(lang)}#film`, img: "/images/industrial/share-film.jpg", cls: "ind-film__share", label: p.video.share.label, track: "film", icon: true })}
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
      <p class="ind-showfs__ctas"><a class="ind-btn ind-btn--light" href="${plantPath(lang)}" data-track="industrial_factory_clicked" data-track-location="showcase">${esc(sh.cta)} ${ARROW}</a>${shareBtn(lang, "twin", "shr-btn ind-showfs__share")}</p>
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
      <button type="button" class="tw__icon" data-theme-toggle aria-pressed="false" title="${esc(t.themeLight)}" aria-label="${esc(t.themeLight)}"><svg class="tw__sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7L7 17M17 7l1.7-1.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><svg class="tw__moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>
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

  // 3DNA FactoryBuilder (/en/industrial/factory-builder/): app shell; the module builds everything else in the browser
  function builderHtml(lang) {
    const b = T(lang).builder, p = T(lang).twin.pricing;
    return `<div class="fb side-open" data-fb data-wa="${esc(whatsappNumber(lang))}">
  <header class="fb__top">
    <a class="fb__brand" href="${landingPath(lang)}" title="${esc(b.back)}"><b>3DNA</b> FactoryBuilder</a>
    <nav class="fb__nav" data-nav aria-label="FactoryBuilder"></nav>
    <div class="fb__ctas">${shareBtn(lang, "builder", "fb-btn fb-share")}<button type="button" class="fb-btn fb-btn--ghost" data-cta-twin>${esc(b.ctaTwin)}</button></div>
  </header>
  <div class="fb__body">
    <aside class="fb__side" data-side aria-label="FactoryBuilder panel"><button type="button" class="fb-x fb__sidex" data-side-close aria-label="Close panel">×</button><div data-panel></div></aside>
    <section class="fb__stage" aria-label="Generated factory in 3D">
      <div class="fb__canvas" data-canvas></div>
      <div class="fb__hero" data-hero><p class="fb__tag">${esc(b.tagline)}</p><h1>${esc(b.name)}</h1><p class="fb__head">${esc(b.headline)}</p><p class="fb__sub">${esc(b.sub)}</p></div>
      <button type="button" class="fb__toggle" data-side-toggle aria-label="Show or hide the panel"><span></span></button>
      <div class="fb__strip" data-strip></div>
      <div class="fb__prog" data-progress hidden aria-live="polite"></div>
      <noscript><p class="fb__noscript">${esc(b.noscript)}</p></noscript>
    </section>
    <aside class="fb__detail" data-detail aria-label="Equipment details"></aside>
  </div>
  <div class="fb-modal" data-pricing-modal hidden><div class="fb-modal__bg" data-pricing-close></div><div class="fb-modal__box" role="dialog" aria-modal="true" aria-labelledby="fb-pricing-t">
    <button type="button" class="fb-x" data-pricing-close aria-label="${esc(p.close)}">×</button>
    <h2 id="fb-pricing-t">${esc(b.ctaTwin)}</h2><p>${esc(p.intro)} These are 3DNA digital twin development prices — not factory construction costs.</p>
    <div class="fb-pkgs" data-pkgs></div><p class="fb-small">${esc(p.disclaimer)}</p>
    <button type="button" class="fb-btn fb-btn--main" data-pricing-send>${esc(p.cta)} · WhatsApp</button></div></div>
  <script type="application/json" data-fb-ui>${jsonForScript({ pricing: p })}</script>
</div>`;
  }
  // 3DNA Plant Configurator (/en/industrial/plant-configurator/): simplified scale view; the module draws the plant
  function configuratorHtml(lang) {
    const c = T(lang).configurator;
    return `<div class="pc" data-pc>
  <header class="pc__head">
    <p class="pc__brand"><a href="${landingPath(lang)}"><b>3DNA</b> Industrial</a><span>${esc(c.brand)}</span></p>
    <h1 class="pc__q">${esc(c.question)}</h1>
    <div class="pc__tools">${shareBtn(lang, "configurator", "pc-share")}<button type="button" data-pc-compare aria-pressed="false">Compare</button><button type="button" data-pc-fit>Fit view</button></div>
    <div class="pc__ctl">
      <div class="pc__row"><span class="pc__tagab">A</span><label class="pc__val"><span data-pc-value></span><small>per year</small></label><input class="pc__slider" type="range" min="0" max="1000" step="1" data-pc-slider aria-label="Annual ethanol production (plant A)"><div class="pc__presets" data-pc-presets></div></div>
      <div class="pc__row pc__row--b" data-pc-row-b><span class="pc__tagab">B</span><label class="pc__val"><span data-pc-value-b></span><small>per year</small></label><input class="pc__slider" type="range" min="0" max="1000" step="1" data-pc-slider-b aria-label="Annual ethanol production (plant B)"><div class="pc__presets" data-pc-presets-b></div></div>
    </div>
  </header>
  <section class="pc__stage" data-pc-stage aria-label="Configured plant in 3D">
    <div class="pc__labels" data-pc-labels></div>
    <p class="pc__hint">Drag to rotate · scroll or pinch to zoom · click equipment for details</p>
    <div class="pc__summary" data-pc-summary></div>
    <p class="pc__disc"><b>Conceptual engineering estimate.</b> <span data-pc-disc></span></p>
    <aside class="pc__info" data-pc-info aria-live="polite"></aside>
    <noscript><p>The Plant Configurator needs JavaScript and WebGL.</p></noscript>
  </section>
</div>
<section class="pc-about" aria-labelledby="pc-about-t"><div class="pc-about__in"><h2 id="pc-about-t">${esc(c.about.title)}</h2>${c.about.text.map((p) => `<p>${esc(p)}</p>`).join("")}<p class="pc-about__links"><a href="${plantPath(lang)}">${esc(T(lang).tools.items[0].name)} →</a> <a href="${builderPath(lang)}">${esc(T(lang).tools.items[1].name)} →</a></p></div></section>`;
  }
  return { heroHtml, bodyHtml, plantHtml, builderHtml, configuratorHtml, configuratorMeta: (lang) => ({ title: T(lang).configurator.metaTitle, description: T(lang).configurator.metaDescription, ogTitle: T(lang).configurator.ogTitle, ogImageAlt: T(lang).configurator.ogImageAlt }), builderMeta: (lang) => ({ title: T(lang).builder.metaTitle, description: T(lang).builder.metaDescription, ogTitle: T(lang).builder.ogTitle, ogImageAlt: T(lang).builder.ogImageAlt }), meta: (lang) => T(lang).meta, twinMeta: (lang) => ({ title: T(lang).twin.metaTitle, description: T(lang).twin.metaDescription, ogTitle: T(lang).twin.ogTitle, ogImageAlt: T(lang).twin.ogImageAlt }), nav: (lang) => T(lang).nav };
}

module.exports = { createIndustrialPage };
