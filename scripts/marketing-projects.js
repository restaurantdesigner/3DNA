/*
 * Marketing projects: the portfolio grid on the digital marketing page ({{marketing.bodyHtml}}, section
 * "projects") and one presentation page per project (templates/marketing-project.html).
 *
 * Data:  assets/data/marketing-projects.json  (one entry per project; content per language)
 * Text:  assets/i18n/marketing-projects.json  (interface: gallery, status, services, labels)
 * Style: the About / marketing page system (.apage, ab-*) plus mpg-* (grid) and mpp-* (presentation).
 *
 * Only projects with published:true are shown or built. A project lists the languages its presentation
 * exists in (langs); in the other languages the card stays in the grid and opens the English (or first)
 * version with a note. Visuals flagged conceptual carry a visible "3DNA concept visual" label.
 */
const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ARROW = '<span aria-hidden="true">&rarr;</span>';

function createMarketingProjects(data, ui, { marketingSlug, whatsappNumber, email }) {
  const projects = data.projects.filter((p) => p.published);
  const byId = (id) => {
    const p = projects.find((x) => x.id === id);
    if (!p) throw new Error(`unknown marketing project "${id}"`);
    return p;
  };
  const U = (lang) => ui[lang] || ui.en;
  const langOf = (p, lang) => (p.langs.includes(lang) ? lang : p.langs.includes("en") ? "en" : p.langs[0]);
  const C = (p, lang) => p.content[langOf(p, lang)];
  const subPath = (lang, id) => `${marketingSlug(lang)}/${byId(id).slug}/`;
  const href = (lang, p) => `/${langOf(p, lang)}/${subPath(langOf(p, lang), p.id)}`;
  const nn = (i) => String(i + 1).padStart(2, "0");
  // 1.500 € (es) / 1,500 € (en): grouping always, also for four digits
  const eur = (n, lang) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === "en" ? "," : ".") + " €";

  // ------------------------------------------------------------------ gallery (marketing page)
  function galleryHtml(lang, num) {
    if (!projects.length) return "";
    const u = U(lang);
    const cards = projects.map((p) => {
      const c = C(p, lang);
      const note = langOf(p, lang) !== lang && u.gallery.langNote ? `<span class="mpg__lang">${esc(u.gallery.langNote)}</span>` : "";
      // featured: the wide card across the grid (dark panel with badge, client logo, name, summary,
      // button; the feature image on the right)
      if (p.featured && p.feature) {
        const im = p.feature.image, lg = p.feature.logo;
        return `      <li class="mpg__item mpg__item--feature">
        <a class="mpg__feature" href="${href(lang, p)}" data-track="marketing_project_clicked" data-track-location="${esc(p.id)}"${langOf(p, lang) !== lang ? ` hreflang="${langOf(p, lang)}"` : ""}>
          <span class="mpg__fpanel">
            <span class="mpg__fbadge">${esc(u.type[p.type])}</span>
            ${lg ? `<img class="mpg__flogo" src="${lg.src}" width="${lg.width}" height="${lg.height}" loading="lazy" decoding="async" alt="">` : ""}
            <h3 class="mpg__fname">${esc(p.client)}</h3>
            <span class="mpg__fsummary">${esc(c.card.summary)}</span>
            ${note}
            <span class="mpg__fbtn">${esc(u.gallery.viewProposal)} <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </span>
          <span class="mpg__fmedia">
            <img src="${im.src}" width="${im.width}" height="${im.height}" loading="lazy" decoding="async" alt="${esc(c.card.featureAlt || c.card.alt)}">
            ${im.conceptual ? `<span class="mpg__concept">${esc(u.conceptual)}</span>` : ""}
          </span>
        </a>
      </li>`;
      }
      return `      <li class="mpg__item">
        <a class="mpg__card" href="${href(lang, p)}" data-track="marketing_project_clicked" data-track-location="${esc(p.id)}"${langOf(p, lang) !== lang ? ` hreflang="${langOf(p, lang)}"` : ""}>
          <span class="mpg__media">
            <img src="${p.cover.small}" srcset="${p.cover.small} 800w, ${p.cover.src} 1600w" sizes="(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 420px" width="${p.cover.width}" height="${p.cover.height}" loading="lazy" decoding="async" alt="${esc(c.card.alt)}">
            <span class="mpg__status">${esc(u.status[p.status])}</span>
            ${p.cover.conceptual ? `<span class="mpg__concept">${esc(u.conceptual)}</span>` : ""}
          </span>
          <span class="mpg__body">
            <span class="mpg__meta">${esc(u.industry[p.industry])} · ${esc(u.type[p.type])}</span>
            <h3 class="mpg__name">${esc(p.client)}</h3>
            <span class="mpg__summary">${esc(c.card.summary)}</span>
            <span class="mpg__services" aria-label="${esc(u.gallery.services)}">${p.services.map((s) => `<span>${esc(u.services[s])}</span>`).join("")}</span>
            ${note}
            <span class="mpg__cta">${esc(u.gallery.view)} ${ARROW}</span>
          </span>
        </a>
      </li>`;
    });
    // featured projects: full-screen chapters, edge to edge (outside the centred column);
    // the others: the 3 / 2 / 1-column grid
    const isFeature = (p) => !!(p.featured && p.feature);
    const features = projects.map((p, i) => (isFeature(p) ? cards[i] : null)).filter(Boolean);
    const grid = projects.map((p, i) => (isFeature(p) ? null : cards[i])).filter(Boolean);
    return `<section class="ab-sec mpg" id="projects" aria-labelledby="mpg-title">
  <div class="ab-wrap">
    <div class="mpg__head" data-reveal>
      <p class="ab-label mpg__label"><span class="ab-num">${num}</span> / ${esc(u.gallery.label)} <i aria-hidden="true"></i></p>
      <h2 class="ab-h2 mpg__title" id="mpg-title">${u.gallery.titleParts ? `${esc(u.gallery.titleParts[0])} <em>${esc(u.gallery.titleParts[1])}</em>` : esc(u.gallery.title)}</h2>
      <p class="ab-p ab-p--strong">${esc(u.gallery.subtitle)}</p>
    </div>
  </div>
${features.length ? `  <ul class="mpg__features">
${features.join("\n")}
  </ul>` : ""}
${grid.length ? `  <div class="ab-wrap">
    <ul class="mpg__grid">
${grid.join("\n")}
    </ul>
  </div>` : ""}
</section>`;
  }

  // in-page navigation of the marketing page
  function localNavHtml(lang) {
    const n = U(lang).localNav;
    const ids = (projects.length ? ["projects"] : []).concat(["goals", "strategies", "channels", "method"]);
    return `<nav class="mk-localnav" aria-label="${esc(n.label)}"><div class="ab-wrap">${ids.map((id) => `<a href="#${id}">${esc(n.items[id])}</a>`).join("")}</div></nav>`;
  }

  // ------------------------------------------------------------------ presentation page
  const label = (num, text, id, title) => `<p class="ab-label"><span class="ab-num">${num}</span> ${esc(text)}</p>
      <h2 class="ab-h2" id="${id}">${esc(title)}</h2>`;
  const conceptTag = (u) => `<span class="mpp-concept">${esc(u.conceptual)}</span>`;

  function heroHtml(lang, id) {
    const p = byId(id), c = C(p, lang), u = U(lang), h = c.hero;
    return `  <section class="sector-hero ahero mpphero" aria-labelledby="mpp-title">
    <picture class="ahero__media">
      <img src="${p.hero.small}" srcset="${p.hero.small} ${p.hero.smallWidth || 960}w, ${p.hero.src} ${p.hero.width}w" sizes="100vw" width="${p.hero.width}" height="${p.hero.height}" fetchpriority="high" decoding="async" alt="${esc(c.hero.alt || c.card.alt)}">
    </picture>
    <div class="ahero__shade" aria-hidden="true"></div>
    ${p.hero.conceptual ? `<span class="mpp-concept mpp-concept--hero">${esc(u.conceptual)}</span>` : ""}
    <div class="ahero__copy">
      <p class="ahero__label">${esc(h.label)}</p>
      <h1 class="ahero__title" id="mpp-title"><span>${esc(h.title)}</span> <em>${esc(h.subtitle)}</em></h1>
      <p class="ahero__sub">${esc(h.lead)}</p>
      <p class="mpp-hero__note">${esc(h.note)}</p>
      <p class="mpp-hero__ctas"><a class="mpp-btn mpp-btn--light" href="#inversion">${esc(h.cta)} ${ARROW}</a><a class="mpp-btn mpp-btn--ghost" href="#contacto">${esc(h.cta2)}</a></p>
    </div>
  </section>`;
  }

  function bodyHtml(lang, id) {
    const p = byId(id), c = C(p, lang), u = U(lang), L = langOf(p, lang);
    const out = [];

    // project facts strip + back link
    out.push(`<section class="mpp-strip" aria-label="${esc(u.page.by)}">
  <div class="ab-wrap mpp-strip__in">
    <a class="mpp-back" href="/${L}/${marketingSlug(L)}/#projects">&larr; ${esc(u.page.back)}</a>
    <dl class="mpp-strip__dl">
      <div><dt>${esc(u.page.client)}</dt><dd>${esc(p.client)}</dd></div>
      <div><dt>${esc(u.page.industry)}</dt><dd>${esc(u.industry[p.industry])}</dd></div>
      <div><dt>${esc(u.page.status)}</dt><dd>${esc(u.status[p.status])}</dd></div>
      <div><dt>${esc(u.page.website)}</dt><dd><a href="${esc(p.website)}" target="_blank" rel="noopener nofollow">${esc(p.website.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a></dd></div>
    </dl>
    <div class="mpp-strip__svc">
      <p class="mpp-strip__k" id="mpp-svc-l">${esc(u.page.services)}</p>
      <ul class="mpp-strip__services" aria-labelledby="mpp-svc-l">${p.services.map((s, i) => `<li><span>${String(i + 1).padStart(2, "0")}</span>${esc(u.services[s])}</li>`).join("")}</ul>
    </div>
  </div>
</section>`);

    // 02 · the company and its product families (a family visual is a path, or { src, small, width, height })
    const co = c.company, fam = p.visuals.families;
    const famImg = (v) => typeof v === "string"
      ? `<img src="${v}" width="800" height="600" loading="lazy" decoding="async" alt="">`
      : `<img src="${v.small}" srcset="${v.small} 800w, ${v.src} ${v.width}w" sizes="(max-width: 600px) 92vw, (max-width: 1100px) 46vw, 420px" width="${v.width}" height="${v.height}" loading="lazy" decoding="async" alt="">`;
    out.push(`<section class="ab-sec mpp-company" aria-labelledby="mpp-company-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${label("02", co.label, "mpp-company-t", co.title)}
      <p class="ab-p ab-p--strong">${esc(co.lead)}</p>
    </div>
    <ul class="mpp-facts" data-reveal>${co.facts.map((f) => `<li><span class="mpp-facts__k">${esc(f.k)}</span><span class="mpp-facts__t">${esc(f.t)}</span></li>`).join("")}</ul>
    <h3 class="mpp-h3" data-reveal>${esc(co.familiesTitle)}</h3>
    <ul class="mpp-fams">
${co.families.map((f) => `      <li class="mpp-fam" data-reveal>
        <span class="mpp-fam__media">${famImg(fam[f.id])}${conceptTag(u)}</span>
        <h4 class="mpp-fam__name">${esc(f.name)}</h4>
        <p class="mpp-fam__text">${esc(f.text)}</p>
      </li>`).join("\n")}
    </ul>
    <p class="mpp-small" data-reveal>${esc(co.visualNote)}</p>
    <div class="ab-grid mpp-opp" data-reveal>
      <div class="ab-side"><h3 class="mpp-h3">${esc(co.oppTitle)}</h3></div>
      <ol class="ab-list">${co.opportunities.map((x, i) => `<li><span class="ab-list__n">${nn(i)}</span><span>${esc(x)}</span></li>`).join("")}</ol>
    </div>
  </div>
</section>`);

    // 03 · website redesign: current vs proposed, desktop and mobile
    const w = c.web, v = p.visuals;
    out.push(`<section class="ab-sec mpp-web" aria-labelledby="mpp-web-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${label("03", w.label, "mpp-web-t", w.title)}
      <p class="ab-p ab-p--strong">${esc(w.lead)}</p>
    </div>
    <div class="mpp-compare">
      <figure class="mpp-shot" data-reveal>
        <figcaption><b>${esc(w.current)}</b><span>${esc(w.currentNote)}</span></figcaption>
        <div class="mpp-browser mpp-browser--muted"><div class="mpp-browser__bar"><i></i><i></i><i></i><span>${esc(p.website.replace(/^https?:\/\//, ""))}</span></div>
          <div class="mpp-browser__view mpp-browser__view--static"><img src="${v.current.src}" width="${v.current.width}" height="${v.current.height}" loading="lazy" decoding="async" alt="${esc(w.current)}"></div></div>
      </figure>
      <figure class="mpp-shot mpp-shot--new" data-reveal>
        <figcaption><b>${esc(w.proposed)}</b><span>${esc(w.proposedNote)}</span></figcaption>
        <div class="mpp-browser"><div class="mpp-browser__bar"><i></i><i></i><i></i><span>${esc(p.website.replace(/^https?:\/\//, ""))}</span></div>
          <div class="mpp-browser__view" tabindex="0" aria-label="${esc(w.proposedNote)}"><img src="${v.desktop.src}" width="${v.desktop.width}" height="${v.desktop.height}" loading="lazy" decoding="async" alt="${esc(w.proposed)} — ${esc(p.client)}"></div></div>
      </figure>
    </div>
    <div class="mpp-webgrid">
      <figure class="mpp-phonefig" data-reveal>
        <div class="mpp-phone"><div class="mpp-phone__screen" tabindex="0" aria-label="${esc(w.mobileNote)}"><img src="${v.mobile.es.src}" width="780" loading="lazy" decoding="async" alt="${esc(w.proposed)} — ${esc(w.mobileNote)}"></div></div>
        <figcaption>${esc(w.mobileNote)}</figcaption>
      </figure>
      <div data-reveal>
        <h3 class="mpp-h3">${esc(w.pointsTitle)}</h3>
        <ul class="mpp-points">${w.points.map((x) => `<li><b>${esc(x.k)}</b><span>${esc(x.t)}</span></li>`).join("")}</ul>
      </div>
    </div>
  </div>
</section>`);

    // 04 · multilingual website
    const lg = c.languages;
    out.push(`<section class="ab-sec mpp-langs" aria-labelledby="mpp-langs-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${label("04", lg.label, "mpp-langs-t", lg.title)}
      <p class="ab-p ab-p--strong">${esc(lg.lead)}</p>
    </div>
    <div class="mpp-trio" data-reveal>${["es", "en", "de"].map((k) => `<figure class="mpp-phonefig mpp-phonefig--sm">
        <span class="mpp-langtag">${k.toUpperCase()}</span>
        <div class="mpp-phone"><div class="mpp-phone__screen mpp-phone__screen--static"><img src="${v.mobile[k].src}" width="780" loading="lazy" decoding="async" alt="${esc(lg.mockNote)} (${k.toUpperCase()})"></div></div>
      </figure>`).join("")}</div>
    <p class="mpp-small mpp-small--center" data-reveal>${esc(lg.mockNote)}</p>
    <ul class="mpp-three" data-reveal>${lg.points.map((x) => `<li><span class="ab-triad__k">${esc(x.k)}</span><p>${esc(x.t)}</p></li>`).join("")}</ul>
  </div>
</section>`);

    // 05 · video marketing: six Reel concepts (a player only when a real video file exists)
    const vd = c.video;
    out.push(`<section class="ab-sec mpp-video" aria-labelledby="mpp-video-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${label("05", vd.label, "mpp-video-t", vd.title)}
      <p class="ab-p ab-p--strong">${esc(vd.lead)}</p>
    </div>
    <ol class="mpp-reels">
${vd.reels.map((r, i) => {
      const file = (p.videos || [])[i];
      const media = file
        ? `<video controls playsinline preload="none" poster="${v.reels[i]}" width="540" height="960"><source src="${file}" type="video/mp4"></video>`
        : `<img src="${v.reels[i]}" width="540" height="960" loading="lazy" decoding="async" alt="">`;
      return `      <li class="mpp-reel" data-reveal>
        <span class="mpp-reel__media">${media}${file ? "" : conceptTag(u)}</span>
        <span class="mpp-reel__n">${nn(i)}</span>
        <h3 class="mpp-reel__title">${esc(r.title)}</h3>
        <p class="mpp-reel__text">${esc(r.text)}</p>
      </li>`;
    }).join("\n")}
    </ol>
    <p class="mpp-small" data-reveal>${esc(vd.note)}</p>
  </div>
</section>`);

    // 06 · marketing and sales funnel
    const fu = c.funnel;
    out.push(`<section class="ab-sec mpp-funnel-sec" aria-labelledby="mpp-funnel-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${label("06", fu.label, "mpp-funnel-t", fu.title)}
      <p class="ab-p ab-p--strong">${esc(fu.lead)}</p>
    </div>
    <ol class="mpp-funnel" data-reveal>${fu.steps.map((s, i) => `<li style="--i:${i}"><span class="mpp-funnel__bar"><span class="mpp-funnel__n">${nn(i)}</span><b>${esc(s.k)}</b></span><span class="mpp-funnel__t">${esc(s.t)}</span></li>`).join("")}</ol>
  </div>
</section>`);

    // 07 · commercial investment
    const pr = c.pricing;
    out.push(`<section class="ab-sec mpp-pricing" id="inversion" aria-labelledby="mpp-pricing-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${label("07", pr.label, "mpp-pricing-t", pr.title)}
      <p class="ab-p ab-p--strong">${esc(pr.lead)}</p>
    </div>
    <ul class="mpp-packs">
${p.packages.map((k) => {
      const pk = pr.packages[k.id];
      const wa = `https://wa.me/${whatsappNumber(L)}?text=${encodeURIComponent(`${c.contact.whatsappText} (${pk.name}, ${eur(k.price, L)} ${pr.vat})`)}`;
      return `      <li class="mpp-pack${k.featured ? " mpp-pack--featured" : ""}" data-reveal>
        ${k.featured ? `<span class="mpp-pack__flag">${esc(pr.featured)}</span>` : ""}
        <h3 class="mpp-pack__name">${esc(pk.name)}</h3>
        <p class="mpp-pack__price"><span>${esc(eur(k.price, L))}</span> <small>${esc(pr.vat)}</small></p>
        <p class="mpp-pack__sum">${esc(pk.summary)}</p>
        <ul class="mpp-pack__list">${pk.includes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <a class="mpp-btn${k.featured ? " mpp-btn--dark" : " mpp-btn--line"}" href="${esc(wa)}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="mproject_${esc(p.id)}_${k.id}">${esc(pr.choose)} ${ARROW}</a>
      </li>`;
    }).join("\n")}
    </ul>
    <div class="mpp-excl" data-reveal>
      <h3 class="mpp-h3">${esc(pr.excludesTitle)}</h3>
      <ul>${pr.excludes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>
  </div>
</section>`);

    // 08 · contact and next steps (verified 3DNA contact details only)
    const ct = c.contact;
    const wa = `https://wa.me/${whatsappNumber(L)}?text=${encodeURIComponent(ct.whatsappText)}`;
    out.push(`<section class="ab-sec mpp-contact" id="contacto" aria-labelledby="mpp-contact-t">
  <div class="ab-wrap">
    <div class="ab-narrow" data-reveal>
      ${label("08", ct.label, "mpp-contact-t", ct.title)}
      <p class="ab-p">${esc(ct.text)}</p>
      <div class="ab-cta">
        <a class="ab-cta__btn" href="${esc(wa)}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="mproject_${esc(p.id)}_contact">${esc(ct.whatsapp)} ${ARROW}</a>
        <button type="button" class="ab-cta__wa mpp-linkbtn open-panel" data-track="start_project_clicked" data-track-location="mproject_${esc(p.id)}">${esc(ct.form)}</button>
        <p class="ab-cta__lead">${esc(ct.email)} <a class="ab-link" href="mailto:${esc(email)}">${esc(email)}</a></p>
      </div>
    </div>
  </div>
</section>`);
    return out.join("\n\n");
  }

  return {
    list: () => projects.map((p) => p.id),
    langs: (id) => byId(id).langs,
    indexable: (id) => byId(id).index !== false,
    subPath,
    meta: (lang, id) => C(byId(id), lang).meta,
    ogImage: (id) => byId(id).og,
    galleryHtml,
    localNavHtml,
    heroHtml,
    heroPreload: (id) => { const h = byId(id).hero; return `  <link rel="preload" as="image" fetchpriority="high" imagesrcset="${h.small} ${h.smallWidth || 960}w, ${h.src} ${h.width}w" imagesizes="100vw">`; },
    bodyHtml,
  };
}

module.exports = { createMarketingProjects };
