/*
 * Real estate section (classic agency layout): the catalogue page and one page per property,
 * built by build-i18n.js.
 *
 * Listings: assets/data/properties.json (see its _comment)
 *   catalog       optional { hero: image, ogImage: {src,width,height} } for the catalogue page
 *   developments  optional new-build developments a property can belong to (property.development = id):
 *                 name, developer, architect, location, units, summary, description, specs, payment,
 *                 paymentNote, nearby, nearbyText, mapUrl, images. Shown on each of its properties' pages.
 *   properties    the listings
 * Strings:  assets/i18n/real-estate.json (es / en / ru / uk)
 *
 * URLs   es: /inmobiliaria/ and /inmobiliaria/<slug>/
 *        en|ru|uk: /<lang>/real-estate/ and /<lang>/real-estate/<slug>/
 * Optional fields that are empty are left out of the markup. With no listings the catalogue
 * shows the "Cuéntanos qué vivienda buscas" contact block only.
 * Contact: WhatsApp links with a pre-filled message naming the property and its reference, and
 * the site's "Start a project" panel (.open-panel), pre-filled through data-panel-message.
 * Client script (assets/js/real-estate.js): catalogue filters, photo viewer.
 */
const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
const present = (v) => v != null && v !== "" && v !== false && !(Array.isArray(v) && !v.length);
const LOCALES = { es: "es-ES", en: "en-GB", ru: "ru-RU", uk: "uk-UA" };
const CATEGORIES = ["residential", "commercial", "land"];
const STATUSES = ["available", "reserved", "sold"];

// line icons (currentColor), 20 × 20
const ICON = {
  bed: '<path d="M3 17V6M3 13h16v4M19 13v-2a3 3 0 0 0-3-3H10v5"/><circle cx="6.5" cy="10" r="1.6"/>',
  bath: '<path d="M3 11h16v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-2zM6 11V5a2 2 0 0 1 4 0M7 18l-1 2M15 18l1 2"/>',
  area: '<path d="M4 4h14v14H4zM4 9h5V4M18 13h-5v5"/>',
  car: '<path d="M4 15v-4l2-5h10l2 5v4zM4 15v2M18 15v2M4 11h14"/><circle cx="7.5" cy="13" r=".8"/><circle cx="14.5" cy="13" r=".8"/>',
  box: '<path d="M3 7l8-4 8 4v9l-8 4-8-4zM3 7l8 4 8-4M11 11v9"/>',
  home: '<path d="M3 10l8-6 8 6v9H3zM9 19v-5h4v5"/>',
  pin: '<path d="M11 20s6-5.6 6-10.5A6 6 0 0 0 5 9.5C5 14.4 11 20 11 20z"/><circle cx="11" cy="9.5" r="2.2"/>',
  check: '<path d="M4 11.5l4.5 4.5L18 6"/>',
  camera: '<path d="M3 7h4l2-2h4l2 2h4v11H3z"/><circle cx="11" cy="12" r="3.2"/>',
};
const icon = (name, cls = "re-ico") =>
  `<svg class="${cls}" viewBox="0 0 22 22" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;

function createRealEstate(data, i18n, { whatsappNumber, absolute, sectionPath, homePath }) {
  const T = (lang) => i18n[lang];
  // a text field: plain value, or { es, en, ru, uk } (missing language → Spanish → English)
  const tx = (v, lang) => {
    if (v == null) return null;
    if (typeof v !== "object" || Array.isArray(v)) return v;
    return v[lang] != null ? v[lang] : v.es != null ? v.es : v.en != null ? v.en : null;
  };
  const num = (n, lang) => new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 1 }).format(n);
  const plural = (forms, n, lang) => fill(forms[new Intl.PluralRules(LOCALES[lang]).select(n)] || forms.other, { n: num(n, lang) });
  const money = (n, lang) => new Intl.NumberFormat(LOCALES[lang], { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  // the listing's own price; else its development's starting price ("Promoción desde …"); else nothing
  // (no price line at all until a real price is entered)
  const devFrom = (p) => { const d = p.development && developments.get(p.development); return d && present(d.priceFrom) ? d.priceFrom : null; };
  const price = (p, lang) => (present(p.price) ? money(p.price, lang)
    : devFrom(p) != null ? fill(T(lang).priceFromDev, { price: money(devFrom(p), lang) })
    : null);
  const sortPrice = (p) => (present(p.price) ? p.price : devFrom(p));
  // bedrooms: a number, or [min, max] when a type comes in two sizes
  const beds = (p) => (Array.isArray(p.bedrooms) ? p.bedrooms : present(p.bedrooms) ? [p.bedrooms, p.bedrooms] : null);
  const bedsText = (p, lang, short = false) => {
    const b = beds(p), t = T(lang);
    if (!b) return null;
    if (b[0] !== b[1]) return short ? `${b[0]}–${b[1]}` : fill(t.bedroomsRange, { a: b[0], b: b[1] });
    return short ? num(b[0], lang) : plural(t.units.bedrooms, b[0], lang);
  };
  const wa = (text) => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;

  // ---------------------------------------------------------------- listings (checked at build time)
  const checkImages = (list, where) => {
    for (const img of list || []) if (!img || !img.src || !img.width || !img.height) throw new Error(`${where}: every image needs src, width and height`);
  };
  const developments = new Map((data.developments || []).map((d, i) => {
    if (!d.id || !d.name) throw new Error(`assets/data/properties.json, development ${i + 1}: "id" and "name" are required`);
    checkImages(d.images, `development "${d.id}"`);
    return [d.id, d];
  }));
  const list = (data.properties || []).map((p, i) => {
    const where = `assets/data/properties.json, property ${i + 1}`;
    for (const k of ["ref", "slug", "category", "title"]) if (!present(p[k])) throw new Error(`${where}: "${k}" is required`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) throw new Error(`${where}: slug "${p.slug}" may only use a-z, 0-9 and single hyphens`);
    if (!CATEGORIES.includes(p.category)) throw new Error(`${where}: category must be one of ${CATEGORIES.join(", ")}`);
    if (p.status && !STATUSES.includes(p.status)) throw new Error(`${where}: status must be one of ${STATUSES.join(", ")}`);
    if (present(p.price) && typeof p.price !== "number") throw new Error(`${where}: price must be a number in euros (e.g. 250000)`);
    if (p.development && !developments.has(p.development)) throw new Error(`${where}: development "${p.development}" is not in "developments"`);
    if (!Array.isArray(p.images) || !p.images.length) throw new Error(`${where}: at least one image is required`);
    checkImages([...p.images, ...(p.floorPlans || [])], where);
    return p;
  });
  const seen = new Set();
  for (const p of list) { if (seen.has(p.slug)) throw new Error(`properties.json: slug "${p.slug}" is used twice`); seen.add(p.slug); }
  const order = (p) => STATUSES.indexOf(p.status || "available");
  const sorted = list.map((p, i) => [p, i]).sort((a, b) => order(a[0]) - order(b[0]) || a[1] - b[1]).map(([p]) => p);
  const residential = list.length > 0 && list.every((p) => p.category === "residential");
  const bySlug = (slug) => list.find((p) => p.slug === slug);
  const devOf = (p) => (p.development ? developments.get(p.development) : null);

  const heading = (lang) => (residential ? T(lang).titleResidential : T(lang).title);
  const countForms = (lang) => (residential ? T(lang).countResidential : T(lang).count);
  // sea view: only listings whose view was confirmed (from inside or from their own terrace / balcony)
  const seaVerified = (p) => !!(p.seaView && p.seaView.status === "verified");
  const purposesOf = (p) => [...new Set([...(p.purposes || []).filter((k) => k !== "sea"), ...(seaVerified(p) ? ["sea"] : [])])];
  const detailPath = (lang, p) => `${sectionPath(lang)}${p.slug}/`;
  const img = (im, lang, { small = false, attrs = "" } = {}) =>
    `<img src="${esc(small && im.small ? im.small : im.src)}" width="${im.width}" height="${im.height}" alt="${esc(tx(im.alt, lang) || "")}" decoding="async"${attrs}>`;
  const chips = (p, lang) => [
    ...(p.status && p.status !== "available" ? [`<span class="re-chip re-chip--${p.status}">${esc(T(lang).status[p.status])}</span>`] : []),
    ...(seaVerified(p) ? [`<span class="re-chip re-chip--sea">${esc(T(lang).sea.badge)}</span>`] : []),
    ...(p.tags || []).map((t) => `<span class="re-chip">${esc(tx(t, lang))}</span>`),
  ].join("");
  // the short icon facts of a listing (card and page)
  const iconFacts = (p, lang) => {
    const t = T(lang);
    return [
      beds(p) ? ["bed", bedsText(p, lang)] : null,
      present(p.bathrooms) ? ["bath", plural(t.units.bathrooms, p.bathrooms, lang)] : null,
      present(p.area) ? ["area", fill(t.units.area, { n: num(p.area, lang) })] : null,
      p.parking === true ? ["car", t.parkingIncluded] : present(p.parking) ? ["car", plural(t.parking, p.parking, lang)] : null,
    ].filter(Boolean);
  };

  // ---------------------------------------------------------------- catalogue
  function card(p, lang, tag = "li") {
    const t = T(lang), dev = devOf(p);
    const type = tx(p.type, lang), loc = tx(p.location, lang);
    const facts = iconFacts(p, lang);
    const attrs = tag === "li" ? ` data-re-item data-type="${esc(type || "")}" data-beds="${beds(p) ? beds(p)[1] : 0}" data-loc="${esc(loc || "")}" data-price="${sortPrice(p) != null ? sortPrice(p) : ""}" data-purposes="${esc(purposesOf(p).join(" "))}"` : "";
    return `<${tag} class="re-card${p.status === "sold" ? " is-sold" : ""}"${attrs}>
  <a class="re-card__link" href="${detailPath(lang, p)}">
    <div class="re-card__media">${img(p.images[0], lang, { small: true, attrs: ' loading="lazy"' })}<div class="re-chips">${chips(p, lang)}</div><span class="re-card__photos">${icon("camera", "re-ico re-ico--sm")}${p.images.length}</span></div>
    <div class="re-card__body">
      ${price(p, lang) ? `<p class="re-card__price">${esc(price(p, lang))}</p>` : ""}
      <h2 class="re-card__title">${esc(tx(p.title, lang))}</h2>
      ${loc ? `<p class="re-card__loc">${icon("pin", "re-ico re-ico--sm")}${esc(loc)}</p>` : ""}
      ${facts.length ? `<ul class="re-card__facts">${facts.map(([ic, f]) => `<li>${icon(ic)}<span>${esc(f)}</span></li>`).join("")}</ul>` : ""}
      <p class="re-card__foot"><span>${esc([dev ? dev.name : type, p.ref].filter(Boolean).join(" · "))}</span><span class="re-card__cta">${esc(t.cta)} <span aria-hidden="true">&rarr;</span></span></p>
    </div>
  </a>
</${tag}>`;
  }

  function filtersHtml(lang) {
    const t = T(lang), f = t.filters;
    const uniq = (arr) => [...new Set(arr.filter(present))];
    const types = uniq(list.map((p) => tx(p.type, lang)));
    const bedCounts = uniq(list.flatMap((p) => beds(p) || [])).sort((a, b) => a - b);
    const locs = uniq(list.map((p) => tx(p.location, lang)));
    const priced = list.some((p) => sortPrice(p) != null);
    const used = purposeList(lang).filter((pp) => pp.count > 0);
    const chipsRow = used.length ? `<fieldset class="re-purpose-chips"><legend>${esc(t.purposeLabel)}</legend>${[{ key: "", title: t.purposeAll }, ...used].map((pp) => `<label><input type="radio" name="purpose" value="${pp.key}"${pp.key ? "" : " checked"}><span>${esc(pp.title)}</span></label>`).join("")}</fieldset>` : "";
    const select = (name, label, options) => `<label class="re-filter__field"><span>${esc(label)}</span><select name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select></label>`;
    const fields = [
      types.length > 1 ? select("type", f.type, [["", f.any], ...types.map((v) => [v, v])]) : "",
      bedCounts.length > 1 ? select("beds", f.beds, [["", f.anyBeds], ...bedCounts.map((n) => [n, fill(f.bedsMin, { n })])]) : "",
      locs.length > 1 ? select("loc", f.location, [["", f.any], ...locs.map((v) => [v, v])]) : "",
      priced ? select("sort", f.sort, [["", f.sortDefault], ["asc", f.sortPriceAsc], ["desc", f.sortPriceDesc]]) : "",
    ].filter(Boolean);
    if (!fields.length && !chipsRow) return "";
    // the live count sits in the catalogue header (catalogHtml); the form says which forms to use
    return `<form class="re-filter re-wrap" data-re-filter aria-label="${esc(f.label)}" data-shown='${esc(JSON.stringify(countForms(lang)))}' data-locale="${LOCALES[lang]}">
  <div class="re-filter__fields">${chipsRow}${fields.join("")}</div>
</form>`;
  }

  function featuredHtml(lang) {
    const t = T(lang);
    return [...developments.values()].filter((d) => list.some((p) => p.development === d.id)).map((d) => {
      const im = (d.images && d.images[0]) || list.find((p) => p.development === d.id).images[0];
      const count = list.filter((p) => p.development === d.id).length;
      return `<section class="re-featured" aria-labelledby="re-feat-${esc(d.id)}">
  <div class="re-wrap re-featured__grid">
    <div class="re-featured__media">${img(im, lang, { small: true, attrs: ' loading="lazy"' })}</div>
    <div class="re-featured__copy">
      <p class="re-eyebrow">${esc(t.featured)}</p>
      <h2 class="re-h2" id="re-feat-${esc(d.id)}">${esc(d.name)}</h2>
      ${tx(d.location, lang) ? `<p class="re-card__loc">${icon("pin", "re-ico re-ico--sm")}${esc(tx(d.location, lang))}</p>` : ""}
      ${tx(d.summary, lang) ? `<p class="re-p">${esc(tx(d.summary, lang))}</p>` : ""}
      <dl class="re-mini">
        ${d.completion ? `<div><dt>${esc(t.completion)}</dt><dd>${esc(tx(d.completion, lang))}</dd></div>` : ""}
        ${d.units ? `<div><dt>${esc(t.development.units)}</dt><dd>${esc(num(d.units, lang))}</dd></div>` : ""}
        ${d.developer ? `<div><dt>${esc(t.development.developer)}</dt><dd>${esc(tx(d.developer, lang))}</dd></div>` : ""}
        ${d.architect ? `<div><dt>${esc(t.development.architect)}</dt><dd>${esc(tx(d.architect, lang))}</dd></div>` : ""}
      </dl>
      <a class="re-btn" href="#re-listings">${esc(plural(residential ? t.countResidential : t.count, count, lang))} <span aria-hidden="true">&darr;</span></a>
    </div>
  </div>
</section>`;
    }).join("\n");
  }

  // buyer purposes (properties.json "purposes": order + picture; titles in the strings file):
  // tiles that open the list filtered to that purpose (?p=<key>)
  function purposeList(lang) {
    const t = T(lang);
    return (data.purposes || []).filter((pp) => t.purposes[pp.key]).map((pp) => ({
      key: pp.key, image: pp.image, title: t.purposes[pp.key].title, text: t.purposes[pp.key].text,
      count: list.filter((p) => purposesOf(p).includes(pp.key)).length,
    }));
  }
  function purposesHtml(lang) {
    const t = T(lang), used = purposeList(lang).filter((pp) => pp.count > 0);
    if (used.length < 2) return "";
    return `<section class="re-purposes" aria-labelledby="re-purposes-t">
  <div class="re-wrap">
    <h2 class="re-h2" id="re-purposes-t">${esc(t.purposesTitle)}</h2>
    <p class="re-purposes__intro">${esc(t.purposesIntro)}</p>
    <ul class="re-purposes__grid">
${used.map((pp) => `      <li><a class="re-ptile" href="?p=${pp.key}#re-listings" data-re-purpose="${pp.key}">
        ${pp.image ? `<span class="re-ptile__media">${img(pp.image, lang, { small: true, attrs: ' loading="lazy"' })}</span>` : ""}
        <span class="re-ptile__body"><strong class="re-ptile__title">${esc(pp.title)}</strong><span class="re-ptile__text">${esc(pp.text)}</span><span class="re-ptile__count">${esc(plural(t.purposeCount, pp.count, lang))} <span aria-hidden="true">&rarr;</span></span></span>
      </a></li>`).join("\n")}
    </ul>
  </div>
</section>`;
  }

  function searchHtml(lang) {
    const s = T(lang).search;
    return `<section class="re-search" aria-labelledby="re-search-t">
  <div class="re-wrap re-search__grid">
    <div>
      <h2 class="re-h2" id="re-search-t">${esc(s.title)}</h2>
      <p class="re-search__text">${esc(list.length ? s.text : s.textEmpty)}</p>
    </div>
    <div class="re-actions">
      <a class="re-btn re-btn--primary" href="${esc(wa(s.message))}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="real_estate_search">${esc(s.whatsapp)} <span aria-hidden="true">&rarr;</span></a>
      <button class="re-btn open-panel" type="button" data-panel-message="${esc(s.message)}" data-track="start_project_clicked" data-track-location="real_estate_search">${esc(s.form)}</button>
    </div>
  </div>
</section>`;
  }

  // sea-view homes: the confirmed ones, or (none yet) a contact block for buyers looking for one
  function seaHtml(lang) {
    const t = T(lang), sea = t.sea, verified = sorted.filter(seaVerified);
    if (verified.length) return `<section class="re-sea" aria-labelledby="re-sea-t">
  <div class="re-wrap">
    <h2 class="re-h2" id="re-sea-t">${esc(sea.featuredTitle)}</h2>
    <p class="re-purposes__intro">${esc(sea.featuredNote)}</p>
    <ul class="re-grid">${verified.map((p) => card(p, lang, "li")).join("\n")}</ul>
  </div>
</section>`;
    return `<section class="re-sea re-sea--cta" aria-labelledby="re-sea-t">
  <div class="re-wrap re-search__grid">
    <div>
      <h2 class="re-h2" id="re-sea-t">${esc(sea.ctaTitle)}</h2>
      <p class="re-search__text">${esc(sea.ctaText)}</p>
    </div>
    <div class="re-actions">
      <a class="re-btn re-btn--primary" href="${esc(wa(sea.message))}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="real_estate_sea_view">${esc(sea.whatsapp)} <span aria-hidden="true">&rarr;</span></a>
      <button class="re-btn open-panel" type="button" data-panel-message="${esc(sea.message)}" data-track="start_project_clicked" data-track-location="real_estate_sea_view">${esc(sea.form)}</button>
    </div>
  </div>
</section>`;
  }

  function catalogHtml(lang) {
    const t = T(lang), h = t.hero;
    const hero = data.catalog && data.catalog.hero;
    // background film (muted, inline, looped; started by the page script, not for reduced motion);
    // its poster is the first paint and the still for reduced-motion visitors
    const film = data.catalog && data.catalog.heroVideo;
    const media = film
      ? `<video poster="${esc(film.poster)}" width="${film.width}" height="${film.height}" muted loop playsinline preload="metadata" aria-hidden="true" data-re-hero-video data-src="${esc(film.src)}"></video>`
      : hero ? img(hero, lang, { attrs: ' fetchpriority="high"' }) : "";
    // sector-hero: the shared transparent header over a full-bleed hero (assets/js/main.js)
    return `<header class="re-hero${media ? " re-hero--photo sector-hero" : ""}"${film ? ` style="--re-poster:url('${esc(film.poster)}')"` : ""}>
  ${media ? `<div class="re-hero__media">${media}</div><div class="re-hero__shade" aria-hidden="true"></div>` : ""}
  <div class="re-wrap re-hero__copy">
    <h1 class="re-hero__title">${(() => { const w = h.title.trim().split(/\s+/), last = w.pop(); return `${esc(w.join(" "))} <em>${esc(last)}</em>`; })()}</h1>
    <p class="re-intro">${esc(h.text)}</p>
    ${list.length ? `<a class="re-btn re-btn--light" href="#re-listings">${esc(h.cta)} <span aria-hidden="true">&darr;</span></a>` : ""}
  </div>
</header>
${seaHtml(lang)}
${list.length ? `${purposesHtml(lang)}
<section class="re-list" id="re-listings" aria-labelledby="re-list-t">
  <div class="re-wrap re-list__head">
    <h2 class="re-h2" id="re-list-t">${esc(heading(lang))}</h2>
    <p class="re-list__count" data-re-shown aria-live="polite">${esc(plural(countForms(lang), list.length, lang))}</p>
  </div>
  ${filtersHtml(lang)}
  <div class="re-wrap">
    <ul class="re-grid" data-re-grid>
${sorted.map((p) => card(p, lang)).join("\n")}
    </ul>
    <div class="re-empty" data-re-none hidden><p>${esc(t.filters.none)}</p><button type="button" class="re-btn" data-re-reset>${esc(t.filters.reset)}</button></div>
  </div>
</section>
${featuredHtml(lang)}` : ""}
${searchHtml(lang)}`;
  }

  // ---------------------------------------------------------------- property page
  function detailHtml(lang, slug) {
    const p = bySlug(slug), t = T(lang), dev = devOf(p);
    const title = tx(p.title, lang), url = absolute(detailPath(lang, p));
    const vars = { title, ref: p.ref, url };
    const type = tx(p.type, lang), loc = tx(p.location, lang);
    const devImages = (dev && dev.images) || [];
    const all = [...p.images, ...devImages];
    const n = p.images.length;
    const x = t.factsExtra;
    const facts = [
      [t.facts.ref, p.ref],
      [t.facts.price, price(p, lang)],
      [t.facts.type, type],
      [x.development, dev ? dev.name : null],
      [t.facts.location, loc],
      [t.facts.area, present(p.area) ? fill(t.units.area, { n: num(p.area, lang) }) : null],
      [t.facts.plot, present(p.plot) ? fill(t.units.area, { n: num(p.plot, lang) }) : null],
      [t.facts.bedrooms, bedsText(p, lang, true)],
      [t.facts.bathrooms, present(p.bathrooms) ? num(p.bathrooms, lang) : null],
      [x.parking, p.parking === true ? x.yes : present(p.parking) ? num(p.parking, lang) : null],
      [x.storage, p.storage ? x.yes : null],
      [x.units, present(p.units) ? num(p.units, lang) : null],
      [t.completion, dev ? tx(dev.completion, lang) : null],
      [t.facts.year, present(p.year) ? String(p.year) : null],
      [t.facts.energy, tx(p.energy, lang)],
    ].filter(([, v]) => present(v));
    const description = [].concat(tx(p.description, lang) || []).filter(present);
    const features = [].concat(tx(p.features, lang) || []).filter(present);
    const plans = (p.floorPlans || []).filter((f) => f && f.src);
    const tour = p.tour && p.tour.url ? p.tour : null;
    const bar = [...iconFacts(p, lang), ...(p.storage ? [["box", t.storage]] : []), ...(type ? [["home", type]] : [])];

    const photo = (im, i) => `<li${i === 0 ? ' class="re-gallery__lead"' : ""}><button type="button" class="re-gallery__btn" data-re-photo="${i}" aria-label="${esc(t.openPhoto)} · ${esc(fill(t.photoOf, { i: i + 1, n: all.length }))}">${img(im, lang, { small: i > 0, attrs: i === 0 ? ' fetchpriority="high"' : ' loading="lazy"' })}</button></li>`;
    const photos = all.map((im) => ({ src: im.src, width: im.width, height: im.height, alt: tx(im.alt, lang) || "" }));
    const sec = (id, h, body) => `<section class="re-sec" aria-labelledby="${id}"><h2 class="re-h2" id="${id}">${esc(h)}</h2>${body}</section>`;

    const blocks = [];
    if (description.length) blocks.push(sec("re-desc-t", t.description, description.map((d) => `<p class="re-p">${esc(d)}</p>`).join("")));
    if (features.length) blocks.push(sec("re-feat-t", t.features, `<ul class="re-checks">${features.map((f) => `<li>${icon("check")}<span>${esc(f)}</span></li>`).join("")}</ul>`));
    blocks.push(sec("re-facts-t", t.facts.title, `<dl class="re-dl">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`));
    if (plans.length) blocks.push(sec("re-plans-t", t.floorPlans, plans.map((f) => `<figure class="re-plan"><a href="${esc(f.src)}" target="_blank" rel="noopener">${img(f, lang, { attrs: ' loading="lazy"' })}</a>${tx(f.alt, lang) ? `<figcaption>${esc(tx(f.alt, lang))}</figcaption>` : ""}</figure>`).join("")));
    if (tour) blocks.push(sec("re-tour-t", t.tour, `${tour.embed ? `<div class="re-tour"><iframe src="${esc(tour.url)}" title="${esc(t.tour)} · ${esc(title)}" loading="lazy" allow="fullscreen; xr-spatial-tracking" allowfullscreen></iframe></div>` : ""}<p><a class="re-btn" href="${esc(tour.url)}" target="_blank" rel="noopener">${esc(t.tourOpen)} <span aria-hidden="true">&#8599;</span></a></p>`));
    const amenities = dev ? [].concat(tx(dev.amenities, lang) || []).filter(present) : [];
    if (amenities.length) blocks.push(sec("re-amen-t", t.amenities, `<ul class="re-checks">${amenities.map((f) => `<li>${icon("check")}<span>${esc(f)}</span></li>`).join("")}</ul>`));
    if (dev && dev.specs && dev.specs.length) {
      blocks.push(sec("re-specs-t", t.specs, `<div class="re-acc">${dev.specs.map((g, i) => `<details${i === 0 ? " open" : ""}><summary>${esc(tx(g.title, lang))}</summary><ul class="re-checks re-checks--one">${[].concat(tx(g.items, lang) || []).map((it) => `<li>${icon("check")}<span>${esc(it)}</span></li>`).join("")}</ul></details>`).join("")}</div>`));
    }
    if (dev && dev.payment && dev.payment.length) {
      blocks.push(sec("re-pay-t", t.payment, `<ol class="re-steps">${dev.payment.map((s, i) => `<li><span class="re-steps__n">${i + 1}</span><span class="re-steps__label">${esc(tx(s.label, lang))}</span><strong class="re-steps__value">${esc(tx(s.value, lang))}</strong>${s.note ? `<span class="re-steps__note">${esc(tx(s.note, lang))}</span>` : ""}</li>`).join("")}</ol>${dev.paymentNote ? `<p class="re-note">${esc(tx(dev.paymentNote, lang))}</p>` : ""}`));
    }
    const nearby = (dev && dev.nearby) || [];
    if (loc || nearby.length) {
      blocks.push(sec("re-loc-t", t.location, `${loc ? `<p class="re-card__loc re-card__loc--big">${icon("pin")}${esc(loc)}</p>` : ""}
${nearby.length ? `<h3 class="re-h3">${esc(dev.nearbyDriving ? t.drivingTimes : t.distances)}</h3><ul class="re-dist">${nearby.map((d) => `<li><span>${esc(tx(d.place, lang))}</span><strong>${esc(d.text ? tx(d.text, lang) : present(d.min) ? `${num(d.min, lang)} min` : `${num(d.km, lang)} km`)}</strong></li>`).join("")}</ul>` : ""}
${dev && dev.nearbyText ? `<p class="re-p">${esc(tx(dev.nearbyText, lang))}</p>` : ""}
${dev && dev.mapUrl ? `<p><a class="re-btn" href="${esc(dev.mapUrl)}" target="_blank" rel="noopener">${icon("pin")}${esc(t.mapOpen)} <span aria-hidden="true">&#8599;</span></a></p>` : ""}`));
    }
    if (dev) {
      const d = t.development;
      blocks.push(sec("re-dev-t", `${d.title}: ${dev.name}`, `<dl class="re-mini">
  ${dev.completion ? `<div><dt>${esc(t.completion)}</dt><dd>${esc(tx(dev.completion, lang))}</dd></div>` : ""}
  ${dev.developer ? `<div><dt>${esc(d.developer)}</dt><dd>${esc(tx(dev.developer, lang))}</dd></div>` : ""}
  ${dev.architect ? `<div><dt>${esc(d.architect)}</dt><dd>${esc(tx(dev.architect, lang))}</dd></div>` : ""}
  ${dev.units ? `<div><dt>${esc(d.units)}</dt><dd>${esc(num(dev.units, lang))}</dd></div>` : ""}
</dl>
${[].concat(tx(dev.description, lang) || []).map((x2) => `<p class="re-p">${esc(x2)}</p>`).join("")}
${devImages.length ? `<ul class="re-devgrid" aria-label="${esc(d.photos)}">${devImages.map((im, i) => `<li><button type="button" class="re-gallery__btn" data-re-photo="${n + i}" aria-label="${esc(t.openPhoto)} · ${esc(tx(im.alt, lang) || "")}">${img(im, lang, { small: true, attrs: ' loading="lazy"' })}</button></li>`).join("")}</ul>` : ""}`));
    }
    // image note: the development's own wording (string or per language), or the generic one (true)
    const note = [p.imagesNote, dev && dev.imagesNote].find((v) => v);
    if (note) blocks.push(`<p class="re-note">${esc(note === true ? t.imagesNote : tx(note, lang))}</p>`);

    // other listings: same development first
    const others = sorted.filter((o) => o.slug !== p.slug).sort((a, b) => (b.development === p.development) - (a.development === p.development)).slice(0, 3);
    const sameDev = dev && others.length && others.every((o) => o.development === p.development);

    return `<nav class="re-crumbs re-wrap" aria-label="breadcrumb"><ol><li><a href="${homePath(lang)}">${esc(t.home)}</a></li><li><a href="${sectionPath(lang)}">${esc(t.nav)}</a></li><li aria-current="page">${esc(title)}</li></ol></nav>
<header class="re-dhead re-wrap">
  <div>
    <div class="re-chips re-chips--inline">${chips(p, lang)}</div>
    <h1 class="re-h1">${esc(title)}</h1>
    ${loc ? `<p class="re-card__loc re-card__loc--big">${icon("pin")}${esc(loc)}</p>` : ""}
  </div>
  <div class="re-dhead__side">
    ${price(p, lang) ? `<p class="re-dhead__price">${esc(price(p, lang))}</p>` : ""}
    ${!present(p.price) && devFrom(p) != null ? `<p class="re-dhead__ref">${esc(t.priceFromNote)}</p>` : ""}
    <p class="re-dhead__ref">${esc(t.facts.ref)}: ${esc(p.ref)}</p>
  </div>
</header>
<section class="re-gallery re-wrap" aria-label="${esc(t.gallery)}">
  <ul class="re-gallery__grid re-gallery__grid--${Math.min(n, 5)}">${p.images.map(photo).join("")}</ul>
  ${all.length > 1 ? `<button type="button" class="re-allphotos" data-re-photo="0">${icon("camera")}${esc(fill(t.allPhotos, { n: all.length }))}</button>` : ""}
</section>
${bar.length ? `<ul class="re-bar re-wrap">${bar.map(([ic, f]) => `<li>${icon(ic)}<span>${esc(f)}</span></li>`).join("")}</ul>` : ""}
<div class="re-layout re-wrap">
  <div class="re-body">
${blocks.join("\n")}
  </div>
  <aside class="re-ask" aria-labelledby="re-ask-t">
    ${price(p, lang) ? `<p class="re-ask__price">${esc(price(p, lang))}</p>` : ""}
    <h2 class="re-ask__title" id="re-ask-t">${esc(t.ask.title)}</h2>
    <p class="re-ask__text">${esc(fill(t.ask.text, vars))}</p>
    <div class="re-actions re-actions--stack">
      <a class="re-btn re-btn--primary" href="${esc(wa(fill(t.ask.visitMessage, vars)))}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="property_viewing">${esc(t.ask.visit)} <span aria-hidden="true">&rarr;</span></a>
      <a class="re-btn" href="${esc(wa(fill(t.ask.questionMessage, vars)))}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="property_question">${esc(t.ask.question)}</a>
      <button class="re-btn open-panel" type="button" data-panel-message="${esc(fill(t.ask.formMessage, vars))}" data-track="start_project_clicked" data-track-location="property_form">${esc(t.ask.form)}</button>
      ${dev && dev.presentation ? `<a class="re-btn re-btn--ghost" href="${esc(wa(fill(t.presentationMessage, { ...vars, dev: dev.name })))}" target="_blank" rel="noopener noreferrer" data-track="whatsapp_clicked" data-track-location="property_presentation">${esc(t.presentation)}</a>` : ""}
    </div>
    ${!present(p.price) && devFrom(p) != null ? `<p class="re-note">${esc(t.priceFromNote)}</p>` : ""}
  </aside>
</div>
${others.length ? `<section class="re-others" aria-labelledby="re-others-t">
  <div class="re-wrap">
    <h2 class="re-h2" id="re-others-t">${esc(sameDev ? fill(t.others, { name: dev.name }) : t.othersAll)}</h2>
    <ul class="re-grid">${others.map((o) => card(o, lang, "li")).join("\n").replace(/ data-re-item[^>]*>/g, ">")}</ul>
  </div>
</section>` : ""}
<dialog class="re-lb" data-re-lightbox aria-label="${esc(t.gallery)}" data-of="${esc(t.photoOf)}">
  <img data-re-lb-img alt="">
  <p class="re-lb__count" data-re-lb-count></p>
  <button type="button" class="re-lb__close" data-re-lb-close aria-label="${esc(t.close)}">&times;</button>
  ${all.length > 1 ? `<button type="button" class="re-lb__nav re-lb__nav--prev" data-re-lb-step="-1" aria-label="${esc(t.prev)}">&lsaquo;</button><button type="button" class="re-lb__nav re-lb__nav--next" data-re-lb-step="1" aria-label="${esc(t.next)}">&rsaquo;</button>` : ""}
</dialog>
<script type="application/json" data-re-photos>${JSON.stringify(photos).replace(/</g, "\\u003c")}</script>`;
  }

  function detailMeta(lang, slug) {
    const p = bySlug(slug), t = T(lang);
    const title = tx(p.title, lang), loc = tx(p.location, lang);
    const bits = [loc, price(p, lang)].filter(present).join(" · ");
    const summary = tx(p.summary, lang) || [].concat(tx(p.description, lang) || [])[0] || t.intro;
    // a sea view is mentioned only when it is confirmed for this listing
    const sea = seaVerified(p) ? `${t.sea.badge}. ` : "";
    return {
      title: `${title} · ${p.ref} | 3DNA`,
      ogTitle: `${title} · ${bits}`,
      description: `${sea}${summary} ${bits}.`.slice(0, 300),
      ogImageAlt: [title, loc].filter(present).join(" · "),
    };
  }

  // ---------------------------------------------------------------- link previews (1200 × 630)
  // Each public page gets its own card, generated by the build (scripts/real-estate-og.js) into
  // /images/og/real-estate/: the landing card from the hero film (or catalog.hero) with the hero
  // heading and "Costa del Sol · Costa Tropical"; a property card from its lead photo, title,
  // location and price (+ "sea views" only when confirmed). shareImage { src, width, height } on
  // catalog or on a listing replaces the generated card.
  const OG_DIR = "/images/og/real-estate/";
  const cardPath = (name, lang) => `${OG_DIR}${name}-${lang}.jpg`;
  const shareJobs = (langs) => {
    const jobs = [];
    const c = data.catalog || {};
    if (list.length && !c.shareImage) for (const lang of langs) {
      jobs.push({ kind: "landing", lang, out: cardPath("inmobiliaria", lang),
        video: c.heroVideo ? c.heroVideo.src : null, image: !c.heroVideo && c.hero ? c.hero.src : null, position: c.sharePosition || "58% 40%",
        title: T(lang).hero.title, line: T(lang).shareLine });
    }
    for (const p of list) if (!p.shareImage) for (const lang of langs) {
      jobs.push({ kind: "property", lang, out: cardPath(p.slug, lang), image: p.images[0].src, position: p.sharePosition || "50% 50%",
        title: tx(p.title, lang), location: tx(p.location, lang), price: price(p, lang), badge: seaVerified(p) ? T(lang).sea.badge : "" });
    }
    return jobs;
  };
  const asImage = (im) => ({ path: im.src, width: im.width, height: im.height });
  // what a page shares: the override, else its generated card (when it exists), else the landing card
  const shareImage = (slug, lang, exists) => {
    const c = data.catalog || {};
    const landing = c.shareImage ? asImage(c.shareImage) : exists(cardPath("inmobiliaria", lang)) ? { path: cardPath("inmobiliaria", lang), width: 1200, height: 630 } : null;
    if (!slug) return landing;
    const p = bySlug(slug);
    if (p.shareImage) return asImage(p.shareImage);
    return exists(cardPath(p.slug, lang)) ? { path: cardPath(p.slug, lang), width: 1200, height: 630 } : landing;
  };

  return { slugs: () => list.map((p) => p.slug), heading, catalogHtml, detailHtml, detailMeta, shareJobs, shareImage };
}

module.exports = { createRealEstate };
