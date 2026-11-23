/*
 * Build-time HTML for the "Marketing digital / Digital marketing" page body (sections 02–08),
 * used by build-i18n.js through {{marketing.bodyHtml}} in templates/marketing.html.
 *
 * Text:  assets/i18n/translations.json → marketingPage.* (Spanish is the editorial master;
 *        EN / RU / UK translated). The home page links here from sector 04 (sectors[3]).
 * Design: the About page system (.apage, ab-* classes) plus the purpose cards (mk-*) in main.css.
 * Blocks marked data-reveal fade in once (assets/js/main.js, off with reduced motion).
 * Purposes (03) and strategies (04) are cross-linked: each strategy lists the purposes it serves
 * (marketingPage.strategies.items[].serves = purpose indices) and each purpose card lists the
 * strategies that serve it, worked out from the same data.
 * No client names, results or figures: the page explains goals, strategies, channels and method only.
 */
const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function createMarketingPage(translations, { whatsappHref, projectsHtml = () => "", localNavHtml = () => "" }) {
  const t = (lang) => translations[lang].marketingPage;
  const ps = (arr, cls = "ab-p") => arr.map((x) => `<p class="${cls}">${esc(x)}</p>`).join("\n");
  const head = (num, label, title, id) => [
    `<p class="ab-label"><span class="ab-num">${num}</span> ${esc(label)}</p>`,
    title ? `<h2 class="ab-h2" id="${id}">${esc(title)}</h2>` : "",
  ].join("\n");
  const nn = (i) => String(i + 1).padStart(2, "0");

  function bodyHtml(lang) {
    const m = t(lang);
    const out = [];

    // in-page navigation, then 02 · the marketing projects portfolio (scripts/marketing-projects.js)
    const nav = localNavHtml(lang);
    if (nav) out.push(nav);
    const gallery = projectsHtml(lang, "02");
    if (gallery) out.push(gallery);
    // the explanatory sections follow, numbered after the portfolio
    let n = gallery ? 3 : 2;
    const num = () => String(n++).padStart(2, "0");

    // 02 · what digital marketing is for: goal first, channels second
    out.push(`<section class="ab-sec mk-intro" aria-labelledby="mk-intro-l">
  <div class="ab-wrap ab-grid">
    <div class="ab-side" data-reveal><p class="ab-label" id="mk-intro-l"><span class="ab-num">${num()}</span> ${esc(m.intro.label)}</p></div>
    <div class="ab-main" data-reveal>
      <p class="ab-lead">${esc(m.intro.lead)}</p>
      ${ps(m.intro.paras)}
    </div>
  </div>
</section>`);

    // 03 · every purpose of digital marketing: what it is for, strategies, channels, how it is measured
    const p = m.purposes;
    const st = m.strategies;
    const strategiesFor = (i) => st.items.map((x, j) => ({ x, j })).filter(({ x }) => x.serves.includes(i));
    const link = (id, text) => `<li><a class="mk-chip-link" href="#${id}">${esc(text)}</a></li>`;
    out.push(`<section class="ab-sec mk-purposes" id="goals" aria-labelledby="mk-purposes-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${head(num(), p.label, p.title, "mk-purposes-t")}
      <p class="ab-p ab-p--strong">${esc(p.lead)}</p>
    </div>
    <ol class="mk-cards">
${p.items.map((x, i) => `      <li class="mk-card" id="mk-goal-${i + 1}" data-reveal>
        <span class="mk-card__n" aria-hidden="true">${nn(i)}</span>
        <h3 class="mk-card__title">${esc(x.title)}</h3>
        <p class="mk-card__text">${esc(x.text)}</p>
        <p class="mk-card__k">${esc(p.strategiesLabel)}</p>
        <ul class="mk-chips mk-chips--links">${strategiesFor(i).map(({ x: s2, j }) => link(`mk-strategy-${j + 1}`, s2.title)).join("")}</ul>
        <p class="mk-card__k">${esc(p.channelsLabel)}</p>
        <ul class="mk-chips">${x.channels.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
        <p class="mk-card__k">${esc(p.kpiLabel)}</p>
        <p class="mk-card__kpi">${esc(x.kpi)}</p>
      </li>`).join("\n")}
    </ol>
  </div>
</section>`);

    // 04 · the strategies: what each one is, its key actions and the purposes it serves
    out.push(`<section class="ab-sec mk-strategies" id="strategies" aria-labelledby="mk-strategies-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${head(num(), st.label, st.title, "mk-strategies-t")}
      <p class="ab-p ab-p--strong">${esc(st.lead)}</p>
    </div>
    <ol class="mk-cards mk-cards--strategies">
${st.items.map((x, i) => `      <li class="mk-card" id="mk-strategy-${i + 1}" data-reveal>
        <span class="mk-card__n" aria-hidden="true">${nn(i)}</span>
        <h3 class="mk-card__title">${esc(x.title)}</h3>
        <p class="mk-card__text">${esc(x.text)}</p>
        <p class="mk-card__k">${esc(st.actionsLabel)}</p>
        <ul class="mk-actions">${x.actions.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
        <p class="mk-card__k">${esc(st.servesLabel)}</p>
        <ul class="mk-chips mk-chips--links">${x.serves.map((g) => link(`mk-goal-${g + 1}`, p.items[g].title)).join("")}</ul>
      </li>`).join("\n")}
    </ol>
  </div>
</section>`);

    // 05 · the channels (tools), one line each
    const c = m.channels;
    out.push(`<section class="ab-sec mk-channels" id="channels" aria-labelledby="mk-channels-t">
  <div class="ab-wrap ab-grid">
    <div class="ab-side ab-sticky" data-reveal>
      ${head(num(), c.label, c.title, "mk-channels-t")}
      <p class="ab-p">${esc(c.lead)}</p>
    </div>
    <ol class="ab-list mk-list" data-reveal>${c.items.map((x, i) => `<li><span class="ab-list__n">${nn(i)}</span><span><strong class="mk-list__k">${esc(x.k)}</strong> ${esc(x.t)}</span></li>`).join("")}</ol>
  </div>
</section>`);

    // 06 · the space as content: the 3DNA link between design and marketing
    const s = m.space;
    out.push(`<section class="ab-sec mk-space" aria-labelledby="mk-space-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${head(num(), s.label, s.title, "mk-space-t")}
      ${ps(s.paras)}
    </div>
    <p class="ab-big ab-big--center" data-reveal><span>${esc(s.statement[0])}</span> <em>${esc(s.statement[1])}</em></p>
  </div>
</section>`);

    // 07 · how a strategy is built
    const pr = m.process;
    out.push(`<section class="ab-sec mk-process" id="method" aria-labelledby="mk-process-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>${head(num(), pr.label, pr.title, "mk-process-t")}</div>
    <ol class="mk-steps" data-reveal>${pr.steps.map((x, i) => `<li><span class="mk-steps__n">${nn(i)}</span><span class="ab-triad__k">${esc(x.k)}</span><p>${esc(x.t)}</p></li>`).join("")}</ol>
  </div>
</section>`);

    // 08 · closing and contact
    const cl = m.closing;
    out.push(`<section class="ab-sec ab-personal mk-closing" aria-labelledby="mk-closing-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${head(num(), cl.label, cl.title, "mk-closing-t")}
      ${ps(cl.paras)}
      <div class="ab-cta">
        <p class="ab-cta__lead">${esc(cl.ctaLead)}</p>
        <button type="button" class="ab-cta__btn open-panel" data-track="start_project_clicked" data-track-location="marketing_closing">${esc(cl.cta)} <span aria-hidden="true">&rarr;</span></button>
        <a class="ab-cta__wa" href="${esc(whatsappHref(lang))}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="marketing_closing">${esc(cl.whatsapp)}</a>
      </div>
    </div>
  </div>
</section>`);
    return out.join("\n\n");
  }

  return { bodyHtml };
}

module.exports = { createMarketingPage };
