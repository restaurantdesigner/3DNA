/*
 * Build-time HTML for the "Nosotros / About" page body (sections 02–10), used by
 * build-i18n.js through {{about.bodyHtml}} in templates/about.html.
 *
 * Text:  assets/i18n/translations.json → aboutPage.* (Spanish is the editorial
 *        master; EN / RU / UK translated). The founder's name is always written
 *        "Andrei Yafimenka".
 * Every word is HTML (no text in images). The quote and the signature are typography.
 * Blocks marked data-reveal fade in once (assets/js/main.js, off with reduced motion).
 */
const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function createAboutPage(translations, { whatsappHref }) {
  const t = (lang) => translations[lang].aboutPage;
  // the partner platform's name opens its site
  const linkify = (h) => h.replace(/\bishare\.ca\b/g, '<a class="ab-link" href="https://ishare.ca" target="_blank" rel="noopener">ishare.ca</a>');
  const ps = (arr, cls = "ab-p") => arr.map((x) => `<p class="${cls}">${linkify(esc(x))}</p>`).join("\n");
  const head = (num, label, title, id) => [
    `<p class="ab-label"><span class="ab-num">${num}</span> ${esc(label)}</p>`,
    title ? `<h2 class="ab-h2" id="${id}">${esc(title)}</h2>` : "",
  ].join("\n");

  function bodyHtml(lang) {
    const a = t(lang);
    const out = [];

    // 02 · introduction: the opening statement
    out.push(`<section class="ab-sec ab-intro" aria-labelledby="ab-intro-l">
  <div class="ab-wrap ab-grid">
    <div class="ab-side" data-reveal><p class="ab-label" id="ab-intro-l"><span class="ab-num">02</span> ${esc(a.intro.label)}</p></div>
    <div class="ab-main" data-reveal>
      <p class="ab-lead">${esc(a.intro.lead)}</p>
      ${ps(a.intro.paras)}
      <p class="ab-statement">${esc(a.intro.statement)}</p>
      ${ps(a.intro.after)}
    </div>
  </div>
</section>`);

    // 03 · origins and education
    out.push(`<section class="ab-sec ab-origins" aria-labelledby="ab-origins-t">
  <div class="ab-wrap ab-grid">
    <div class="ab-side ab-sticky" data-reveal>${head("03", a.origins.label, a.origins.title, "ab-origins-t")}</div>
    <div class="ab-main" data-reveal>
      ${ps(a.origins.paras)}
      <p class="ab-question">${esc(a.origins.question)}</p>
      <p class="ab-p">${esc(a.origins.after)}</p>
    </div>
  </div>
</section>`);

    // 04 · 25 years in restaurants: the statement, then the business from the inside
    const r = a.restaurants;
    out.push(`<section class="ab-sec ab-rest" aria-labelledby="ab-rest-t">
  <div class="ab-wrap">
    <div data-reveal>${head("04", r.label, r.title, "ab-rest-t")}</div>
    <p class="ab-big" data-reveal><span>${esc(r.statement[0])}</span> <em>${esc(r.statement[1])}</em></p>
    <div class="ab-two">
      <div data-reveal>${ps(r.paras)}</div>
      <ol class="ab-list" data-reveal>${r.list.map((x, i) => `<li><span class="ab-list__n">${String(i + 1).padStart(2, "0")}</span><span>${esc(x)}</span></li>`).join("")}</ol>
    </div>
    <div class="ab-narrow" data-reveal>
      <p class="ab-p ab-p--strong">${esc(r.close)}</p>
      <p class="ab-p">${esc(r.lead2)}</p>
      <p class="ab-question">${esc(r.question)}</p>
    </div>
  </div>
</section>`);

    // 05 · psychology of spaces + the people / experience / business balance
    const p = a.psychology;
    out.push(`<section class="ab-sec ab-psy" aria-labelledby="ab-psy-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${head("05", p.label, p.title, "ab-psy-t")}
      <p class="ab-p ab-p--strong">${esc(p.intro)}</p>
    </div>
    <ul class="ab-questions" data-reveal>${p.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>
    <div class="ab-narrow" data-reveal>${ps(p.paras)}</div>
    <ol class="ab-triad" data-reveal>${p.triad.map((x) => `<li><span class="ab-triad__k">${esc(x.k)}</span><p>${esc(x.t)}</p></li>`).join("")}</ol>
  </div>
</section>`);

    // featured quote
    out.push(`<section class="ab-quote" aria-label="${esc(a.quote.by)}">
  <figure class="ab-wrap ab-quote__fig" data-reveal>
    <blockquote class="ab-quote__text"><p>${esc(a.quote.text)}</p></blockquote>
    <figcaption class="ab-quote__by">${esc(a.quote.by)}</figcaption>
  </figure>
</section>`);

    // 06 · international experience
    const n = a.international;
    out.push(`<section class="ab-sec ab-intl" aria-labelledby="ab-intl-t">
  <div class="ab-wrap ab-grid">
    <div class="ab-side" data-reveal>
      ${head("06", n.label, n.title, "ab-intl-t")}
      <p class="ab-places">${n.places.map(esc).join('<span aria-hidden="true"> · </span>')}</p>
    </div>
    <div class="ab-main" data-reveal>${ps(n.paras)}</div>
  </div>
</section>`);

    // 07 · technology and innovation
    const tc = a.technology;
    out.push(`<section class="ab-sec ab-tech" aria-labelledby="ab-tech-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${head("07", tc.label, tc.title, "ab-tech-t")}
      ${ps(tc.paras)}
    </div>
    <p class="ab-big ab-big--center" data-reveal><span>${esc(tc.statement[0])}</span> <em>${esc(tc.statement[1])}</em></p>
  </div>
</section>`);

    // 08 · Funding Matters and iShare
    const c = a.collaboration;
    out.push(`<section class="ab-sec ab-collab" aria-labelledby="ab-collab-t">
  <div class="ab-wrap ab-grid">
    <div class="ab-side" data-reveal>${head("08", c.label, c.title, "ab-collab-t")}</div>
    <div class="ab-main" data-reveal>${ps(c.paras)}</div>
  </div>
</section>`);

    // 09 · why 3DNA exists: the disciplines, one sentence each
    const w = a.why;
    out.push(`<section class="ab-sec ab-why" aria-labelledby="ab-why-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${head("09", w.label, w.title, "ab-why-t")}
      <p class="ab-p ab-p--strong">${esc(w.lead)}</p>
    </div>
    <p class="ab-disciplines" data-reveal aria-label="${esc(w.disciplines.join(", "))}">${w.disciplines.map((d, i) => `<span aria-hidden="true">${esc(d)}</span>${i < w.disciplines.length - 1 ? '<i aria-hidden="true"></i>' : ""}`).join("")}</p>
    <div class="ab-narrow" data-reveal>
      <ul class="ab-lines">${w.lines.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      ${ps(w.paras)}
      <p class="ab-statement">${w.belief.map(esc).join(" ")}</p>
    </div>
  </div>
</section>`);

    // 10 · personal closing, signature and contact
    const pe = a.personal;
    out.push(`<section class="ab-sec ab-personal" aria-labelledby="ab-personal-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${head("10", pe.label, pe.title, "ab-personal-t")}
      ${ps(pe.paras)}
      <p class="ab-closing">${pe.closing.map(esc).join(" ")}</p>
      <div class="ab-sign">
        <p class="ab-sign__name">${esc(pe.sigName)}</p>
        <p class="ab-sign__role">${esc(pe.sigRole)}</p>
      </div>
      <div class="ab-cta">
        <p class="ab-cta__lead">${esc(pe.ctaLead)}</p>
        <button type="button" class="ab-cta__btn open-panel" data-track="start_project_clicked" data-track-location="about_closing">${esc(pe.cta)} <span aria-hidden="true">&rarr;</span></button>
        <a class="ab-cta__wa" href="${esc(whatsappHref(lang))}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="about_closing">${esc(pe.whatsapp)}</a>
      </div>
    </div>
  </div>
</section>`);
    return out.join("\n\n");
  }

  return { bodyHtml };
}

module.exports = { createAboutPage };
