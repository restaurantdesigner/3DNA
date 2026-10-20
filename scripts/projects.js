/*
 * Build-time HTML for client projects (used by build-i18n.js).
 *
 * Data:  assets/data/projects.json   (projects, their cover and the sections each page shows)
 * Text:  assets/i18n/projects.json   (per language: labels, slugs, every visible text)
 *
 * Restaurants page: one "Proyectos en desarrollo" section with a card per project.
 * Project page: /<lang>/<restaurants slug>/<projects slug>/<id>/, one block per section in the
 * data; a section renders only its items, so a page never shows an empty section. New material
 * (renders, plans, videos, tours, documents) is added as a section in the data, not in markup.
 */
const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function createProjects(data, texts, { restaurantsSlug }) {
  const t = (lang) => {
    if (!texts[lang]) throw new Error(`projects texts missing for "${lang}"`);
    return texts[lang];
  };
  const byId = new Map(data.projects.map((p) => [p.id, p]));
  const project = (id) => {
    if (!byId.has(id)) throw new Error(`unknown project "${id}"`);
    return byId.get(id);
  };
  const text = (lang, id, key) => {
    const v = (t(lang).projects[id] || {}).text?.[key];
    if (v == null) throw new Error(`projects.${lang}.projects.${id}.text.${key} missing`);
    return v;
  };
  const subPath = (lang, id) => `${restaurantsSlug(lang)}/${t(lang).slug}/${id}/`;
  const pagePath = (lang, id) => `/${lang}/${subPath(lang, id)}`;

  const picture = (img, alt, { sizes, eager = false, cls = "" }) => {
    const srcset = img.widths.map((w) => `${img.base}-${w}.webp ${w}w`).join(", ");
    const largest = Math.max(...img.widths);
    return `<img${cls ? ` class="${cls}"` : ""} src="${img.base}-${largest}.webp" srcset="${srcset}" sizes="${sizes}"` +
      ` width="${img.width}" height="${img.height}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" alt="${escapeHtml(alt)}">`;
  };

  // ------------------------------------------------ Restaurants page: the card section
  // A project's cover may add "video" (mp4) and "poster": the card then shows the film in black and white,
  // playing while the pointer is over the card (on touch screens: while the card is in view).
  function sectionHtml(lang) {
    const L = t(lang);
    const cards = data.projects.map((p) => [
      `      <li class="rproj__item">`,
      `        <a class="rproj__card" href="${pagePath(lang, p.id)}">`,
      `          <span class="rproj__media">${picture(p.cover, text(lang, p.id, p.cover.altKey), { sizes: "(max-width: 760px) 92vw, 1320px" })}` +
        // optional cover film: black and white, loaded and played on hover (assets/js/project-cards.js)
        (p.cover.video ? `<video class="rproj__video" muted loop playsinline webkit-playsinline preload="none" disablepictureinpicture disableremoteplayback` +
          ` aria-hidden="true" tabindex="-1" data-src="${p.cover.video}"${p.cover.poster ? ` poster="${p.cover.poster}"` : ""}></video>` : "") +
        `</span>`,
      `          <span class="rproj__body">`,
      `            <span class="rproj__lead">`,
      `              <span class="rproj__meta"><span class="rproj__category">${escapeHtml(L.category[p.category])}</span>` +
        `<span class="rproj__status">${escapeHtml(L.status[p.status])}</span></span>`,
      `              <span class="rproj__name">${escapeHtml(p.name)}</span>`,
      `            </span>`,
      `            <span class="rproj__cta">${escapeHtml(L.cta)} <span aria-hidden="true">&rarr;</span></span>`,
      `          </span>`,
      `        </a>`,
      `      </li>`
    ].join("\n"));
    return [
      `  <!-- Client projects in development (assets/data/projects.json, scripts/projects.js) -->`,
      `  <section class="rproj" id="proyectos" aria-labelledby="rproj-title">`,
      `    <div class="rproj__inner">`,
      `      <h2 class="rproj__eyebrow" id="rproj-title">${escapeHtml(L.section.eyebrow)}</h2>`,
      `      <ul class="rproj__list" aria-label="${escapeHtml(L.section.label)}">`,
      ...cards,
      `      </ul>`,
      `    </div>`,
      `  </section>`
    ].join("\n");
  }

  // ------------------------------------------------ project page
  const ITEM = {
    // the project story: paragraphs, a few highlights and an honest note on the visuals
    text(lang, id, item) {
      const paras = text(lang, id, item.paragraphsKey);
      const highs = item.highlightsKey ? text(lang, id, item.highlightsKey) : [];
      return [
        `        <div class="pproj__story">`,
        `          <div class="pproj__prose">`,
        ...paras.map((x) => `            <p>${escapeHtml(x)}</p>`),
        `          </div>`,
        ...(highs.length ? [
          `          <dl class="pproj__highlights">`,
          ...highs.map(([k, v]) => `            <div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`),
          `          </dl>`] : []),
        ...(item.noteKey ? [`          <p class="pproj__vnote">${escapeHtml(text(lang, id, item.noteKey))}</p>`] : []),
        `        </div>`
      ].join("\n");
    },
    gallery(lang, id, item) {
      return item.images.map((img) => [
        `        <figure class="pproj__figure">`,
        `          ${picture(img, text(lang, id, img.altKey), { sizes: "(max-width: 1100px) 92vw, 1040px", cls: "pproj__img" })}`,
        ...(img.captionKey ? [`          <figcaption class="pproj__caption">${escapeHtml(text(lang, id, img.captionKey))}</figcaption>`] : []),
        `        </figure>`
      ].join("\n")).join("\n");
    },
    // interactive 360° panorama (assets/js/project-pano.js, the fitness club's viewer); the flat
    // 2048 px image stands in until the viewer starts and stays if WebGL is unavailable
    panorama(lang, id, item) {
      const L = t(lang), sources = item.widths.map((w) => `${item.base}-${w}.webp`);
      return [
        `        <figure class="pproj__pano-fig">`,
        `          <div class="pproj__pano" data-ppano data-sources="${sources.join(" ")}" data-widths="${item.widths.join(" ")}"` +
          ` data-label-full="${escapeHtml(L.panoFull)}" data-label-exit="${escapeHtml(L.panoExit)}">`,
        `            <img class="pproj__pano-still" src="${sources[0]}" width="${item.widths[0]}" height="${item.widths[0] / 2}" loading="lazy" decoding="async" alt="${escapeHtml(text(lang, id, item.altKey))}">`,
        `            <p class="pproj__pano-hint">${escapeHtml(L.panoHint)}</p>`,
        `            <button type="button" class="pproj__pano-full" aria-pressed="false">${escapeHtml(L.panoFull)}</button>`,
        `          </div>`,
        ...(item.captionKey ? [`          <figcaption class="pproj__caption">${escapeHtml(text(lang, id, item.captionKey))}</figcaption>`] : []),
        `        </figure>`
      ].join("\n");
    },
    // vertical film beside its text; plays muted while on screen (assets/js/project-hero.js)
    film(lang, id, item) {
      const cta = item.ctaKey && item.ctaPage === "restaurants"
        ? [`            <a class="pproj__cta" href="/${lang}/${restaurantsSlug(lang)}/">${escapeHtml(text(lang, id, item.ctaKey))} <span aria-hidden="true">&rarr;</span></a>`] : [];
      return [
        `        <div class="pproj__film">`,
        `          <div class="pproj__film-media" style="aspect-ratio: ${item.width} / ${item.height}">`,
        `            <video class="pproj__film-video" muted loop playsinline webkit-playsinline preload="none" disablepictureinpicture disableremoteplayback` +
          ` width="${item.width}" height="${item.height}" poster="${item.poster}" data-src="${item.src}" data-pfilm aria-label="${escapeHtml(text(lang, id, item.labelKey))}"></video>`,
        `          </div>`,
        `          <div class="pproj__film-text">`,
        `            <div class="pproj__prose">`,
        ...text(lang, id, item.paragraphsKey).map((x) => `              <p>${escapeHtml(x)}</p>`),
        `            </div>`,
        ...cta,
        `          </div>`,
        `        </div>`
      ].join("\n");
    },
    // the model runs on its own page, with all its controls (public=1 only marks the embed)
    model3d(lang, id, item) {
      const src = `${item.src}?lang=${lang}&amp;public=1`;
      // "open full screen" goes to the model's own clean address when it has one (directModels)
      const open = item.direct && item.direct[lang] ? `${pagePath(lang, id)}${item.direct[lang]}/` : src;
      return [
        `        <div class="pproj__model">`,
        `          <div class="pproj__model-head">`,
        `            <h3 class="pproj__subtitle">${escapeHtml(text(lang, id, item.titleKey))}</h3>`,
        `            <a class="pproj__open" href="${open}">${escapeHtml(text(lang, id, "openModel"))} <span aria-hidden="true">&nearr;</span></a>`,
        `          </div>`,
        ...(item.noteKey ? [`          <p class="pproj__note">${escapeHtml(text(lang, id, item.noteKey))}</p>`] : []),
        `          <div class="pproj__frame"><iframe src="${src}" title="${escapeHtml(text(lang, id, "modelFrameTitle"))}" loading="lazy" allow="fullscreen" referrerpolicy="same-origin"></iframe></div>`,
        `        </div>`
      ].join("\n");
    }
  };

  function pageBodyHtml(lang, id) {
    const L = t(lang), p = project(id);
    const title = (s) => (s.titleTextKey ? text(lang, id, s.titleTextKey) : L.sections[s.titleKey]);
    const sections = p.sections.filter((s) => s.items && s.items.length).map((s) => [
      `    <section class="pproj__section" id="${s.id}" aria-labelledby="pproj-${s.id}-title">`,
      ...(s.eyebrowKey ? [`      <p class="pproj__eyebrow">${escapeHtml(text(lang, id, s.eyebrowKey))}</p>`] : []),
      `      <h2 class="pproj__title" id="pproj-${s.id}-title">${escapeHtml(title(s))}</h2>`,
      ...s.items.map((item) => {
        if (!ITEM[item.type]) throw new Error(`project ${id}: unknown section item type "${item.type}"`);
        return ITEM[item.type](lang, id, item);
      }),
      `    </section>`
    ].join("\n"));
    // with a hero film the name and status sit on the film (heroHtml); otherwise in a plain header
    const head = p.hero ? [] : [
      `    <header class="pproj__head">`,
      `      <p class="pproj__eyebrow">${escapeHtml(L.category[p.category])}</p>`,
      `      <h1 class="pproj__name">${escapeHtml(p.name)}</h1>`,
      `      <p class="pproj__status"><span class="pproj__dot" aria-hidden="true"></span>${escapeHtml(L.status[p.status])}</p>`,
      `    </header>`];
    return [...head, ...sections].join("\n");
  }

  // full-width film at the top of the project page (assets/js/project-hero.js picks the source)
  function heroHtml(lang, id) {
    const L = t(lang), p = project(id), h = p.hero;
    if (!h) return "";
    return [
      `  <section class="phero" aria-labelledby="phero-title" data-phero>`,
      `    <img class="phero__poster" src="${h.posterDesktop}" width="1920" height="1080" fetchpriority="high" decoding="async" alt=""` +
        ` data-poster-mobile="${h.posterMobile}">`,
      `    <video class="phero__video" muted loop playsinline webkit-playsinline preload="none" disablepictureinpicture disableremoteplayback` +
        ` aria-label="${escapeHtml(text(lang, id, h.labelKey))}" data-src-desktop="${h.desktop}" data-src-mobile="${h.mobile}"></video>`,
      `    <div class="phero__shade" aria-hidden="true"></div>`,
      `    <div class="phero__inner">`,
      `      <p class="phero__eyebrow">${escapeHtml(L.category[p.category])}</p>`,
      `      <h1 class="phero__name" id="phero-title">${escapeHtml(p.name)}</h1>`,
      `      <p class="phero__tagline">${escapeHtml(text(lang, id, h.taglineKey))}</p>`,
      `      <p class="phero__status"><span class="pproj__dot" aria-hidden="true"></span>${escapeHtml(L.status[p.status])}</p>`,
      `    </div>`,
      `  </section>`
    ].join("\n");
  }

  // models with a direct link: /<lang>/<restaurants>/<projects>/<id>/<slug>/ shows the model alone, full screen
  function directModels(lang) {
    const L = t(lang), out = [];
    for (const p of data.projects) for (const s of p.sections) for (const item of s.items || []) {
      if (item.type !== "model3d" || !item.direct || !item.direct[lang]) continue;
      out.push({
        file: `${lang}/${subPath(lang, p.id)}${item.direct[lang]}/index.html`,
        title: `${p.name} · ${L.sections[s.titleKey] || ""} · ${text(lang, p.id, item.titleKey)} | 3DNA`,
        back: pagePath(lang, p.id) + `#${s.id}`, backLabel: p.name, lang
      });
    }
    return out;
  }

  const meta = (lang, id) => {
    const m = (t(lang).projects[id] || {}).meta;
    if (!m) throw new Error(`projects.${lang}.projects.${id}.meta missing`);
    return m;
  };

  return {
    ids: () => data.projects.map((p) => p.id),
    name: (id) => project(id).name,
    ogImage: (id) => project(id).ogImage,
    subPath, pagePath, sectionHtml, pageBodyHtml, heroHtml, directModels, meta,
    back: (lang) => t(lang).back,
    contextLabel: (lang) => t(lang).contextLabel
  };
}

module.exports = { createProjects };
