/*
 * Letreros Programables — interactive website concept by 3DNA (design prototype).
 * Static, no backend: hash routes, everything rendered from data.js + i18n.js.
 *   #/es/                 home            #/es/catalogo        catalogue with filters
 *   #/es/c/<category>     category        #/es/p/<product>     product page
 *   #/es/contacto[/<id>]  quote request (demo: sends nothing)
 * Embedded in the proposal (iframe): links replace the hash instead of pushing history, so the
 * presentation's back button is not filled with prototype steps. Standalone (full screen): normal history.
 */
(function () {
  "use strict";
  const D = window.LP, I = window.LP_I18N;
  const LANGS = ["es", "en", "de"];
  const embedded = window.self !== window.top;
  const app = document.getElementById("app");
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
  const catOf = (id) => D.categories.find((c) => c.id === id);
  const prodOf = (id) => D.products.find((p) => p.id === id);
  const img = (name, size) => `${D.img}${name}-${size}.webp`;
  const picture = (name, alt, sizes, eager) => name
    ? `<img src="${img(name, 800)}" srcset="${img(name, 800)} 800w, ${img(name, 1448)} 1448w" sizes="${sizes}" width="1448" height="1086" alt="${esc(alt)}"${eager ? "" : ' loading="lazy"'} decoding="async">`
    : "";
  const price = (n, lang) => lang === "en"
    ? "€" + n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString(lang === "de" ? "de-DE" : "es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const ARROW = '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const WA = '<svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.1-1.2 2.8 1.2 3.3 1.4 3.5 2.4 3.7 5.8 5.2c2.2.9 3 1 4.1.8.7-.1 1.9-.8 2.2-1.5s.3-1.4.2-1.5-.3-.2-.6-.3z"/></svg>';

  // ------------------------------------------------------------------ routing
  function parse() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const [path, query] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    const lang = LANGS.includes(parts[0]) ? parts.shift() : "es";
    const params = new URLSearchParams(query || "");
    return { lang, page: parts[0] || "", arg: parts[1] || "", params };
  }
  const href = (lang, page = "", arg = "", q = "") => `#/${lang}/${page}${arg ? "/" + arg : ""}${q ? "?" + q : ""}`;
  function go(h) { if (embedded) location.replace(h); else location.hash = h; }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#/']");
    if (a && embedded) { e.preventDefault(); go(a.getAttribute("href")); }
    const m = e.target.closest("[data-modal]");
    if (m) { e.preventDefault(); openModal(); }
    if (e.target.closest("[data-menu-open]")) document.body.classList.add("menu-open");
    if (e.target.closest("[data-menu-close]") || e.target.closest(".mnav a")) document.body.classList.remove("menu-open");
    const lb = e.target.closest("[data-lang-toggle]");
    if (lb) { const box = lb.parentElement; box.classList.toggle("is-open"); lb.setAttribute("aria-expanded", box.classList.contains("is-open")); }
    else document.querySelectorAll(".langsel.is-open").forEach((b) => b.classList.remove("is-open"));
    const chip = e.target.closest("[data-filter]");
    if (chip) { e.preventDefault(); setFilter(chip.dataset.filter, chip.dataset.value); }
  });
  window.addEventListener("hashchange", render);

  // ------------------------------------------------------------------ chrome
  function header(t, r, solid) {
    const L = r.lang;
    const langLinks = LANGS.map((l) => `<a href="${href(l, r.page, r.arg, r.params.toString())}" lang="${l}" hreflang="${l}"${l === L ? ' aria-current="true"' : ""}>${l.toUpperCase()}<span>${esc(I[l].langName)}</span></a>`).join("");
    return `<header class="hdr${solid ? " hdr--solid" : ""}">
  <div class="hdr__in">
    <a class="hdr__logo" href="${href(L)}" aria-label="Letreros Programables — ${esc(t.nav.home)}"><img src="${D.img}client-logo-light-440.webp" width="440" height="122" alt="Letreros Programables"></a>
    <nav class="hdr__nav" aria-label="${esc(t.nav.menu)}">
      <a href="${href(L, "catalogo")}">${esc(t.nav.products)}</a>
      <a href="${href(L, "", "", "s=apps")}">${esc(t.nav.apps)}</a>
      <a href="${href(L, "", "", "s=how")}">${esc(t.nav.how)}</a>
      <a href="${href(L, "", "", "s=company")}">${esc(t.nav.company)}</a>
      <a href="${href(L, "contacto")}">${esc(t.nav.contact)}</a>
    </nav>
    <div class="langsel"><button type="button" class="langsel__btn" data-lang-toggle aria-haspopup="true" aria-expanded="false" aria-label="${esc(t.nav.lang)}">${L.toUpperCase()}<i aria-hidden="true"></i></button><div class="langsel__menu">${langLinks}</div></div>
    <a class="hdr__cta" href="${href(L, "contacto")}">${esc(t.nav.quote)}</a>
    <button type="button" class="hdr__burger" data-menu-open aria-label="${esc(t.nav.menu)}"><span></span></button>
  </div>
</header>
<div class="mnav" role="dialog" aria-modal="true" aria-label="${esc(t.nav.menu)}">
  <button type="button" class="mnav__close" data-menu-close aria-label="${esc(t.nav.close)}">&times;</button>
  <a href="${href(L)}">${esc(t.nav.home)}</a>
  <a href="${href(L, "catalogo")}">${esc(t.nav.products)}</a>
  <a href="${href(L, "", "", "s=apps")}">${esc(t.nav.apps)}</a>
  <a href="${href(L, "", "", "s=how")}">${esc(t.nav.how)}</a>
  <a href="${href(L, "", "", "s=company")}">${esc(t.nav.company)}</a>
  <a href="${href(L, "contacto")}">${esc(t.nav.contact)}</a>
  <div class="mnav__langs">${LANGS.map((l) => `<a href="${href(l, r.page, r.arg, r.params.toString())}"${l === L ? ' aria-current="true"' : ""}>${l.toUpperCase()}</a>`).join("")}</div>
</div>`;
  }

  const SOCIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M16.6 3c.3 2.3 1.6 3.7 3.9 3.9v2.6c-1.4.1-2.6-.3-3.9-1.1v5.3c0 6.7-7.3 8.8-10.2 4-1.9-3.1-.7-8.5 5.4-8.7v2.8c-.5.1-1 .2-1.4.3-1.4.5-2.2 1.4-2 3 .4 3 6 3.9 5.5-2V3h2.7z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.6 2.6 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z"/></svg>'
  };
  function footer(t, L) {
    return `<footer class="ftr">
  <div class="wrap ftr__in">
    <div><img src="${D.img}client-logo-light-440.webp" width="440" height="122" alt="Letreros Programables" class="ftr__logo" loading="lazy">
      <p class="ftr__k">${esc(t.foot.social)}</p>
      <ul class="social">${(D.social || []).map((n) => n.url
        ? `<li><a href="${n.url}" target="_blank" rel="noopener nofollow" aria-label="${esc(n.name)}" title="${esc(n.name)}">${SOCIAL_ICONS[n.id]}</a></li>`
        : `<li><span class="social--proposed" role="img" aria-label="${esc(n.name)} — ${esc(t.foot.proposedShort)}" title="${esc(n.name)} — ${esc(t.foot.proposedShort)}">${SOCIAL_ICONS[n.id]}</span></li>`).join("")}</ul>
      <p class="ftr__note">${esc(t.foot.proposed)}</p></div>
    <nav class="ftr__nav">${D.categories.map((c) => `<a href="${href(L, "c", c.id)}">${esc(t.cats[c.id][0])}</a>`).join("")}</nav>
    <div class="ftr__demo"><p><b>${esc(t.foot.concept)}</b></p><p>${esc(t.foot.demo)}</p><p><a href="${D.source}/" target="_blank" rel="noopener nofollow">${esc(t.foot.source)} ↗</a></p></div>
  </div>
</footer>`;
  }

  // ------------------------------------------------------------------ pieces
  function productCard(p, t, L) {
    const c = catOf(p.cat);
    const media = c.img ? picture(c.img, "", "(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 380px") : accTile(p, t);
    return `<a class="pcard" href="${href(L, "p", p.id)}">
  <span class="pcard__media">${media}${p.isNew ? `<span class="pcard__new">${esc(t.product.isNew)}</span>` : ""}</span>
  <span class="pcard__body">
    <span class="pcard__cat">${esc(t.cats[p.cat][0])}${p.sub ? " · " + esc(t.subs[p.sub]) : ""}</span>
    <span class="pcard__name">${esc(p.t[L])}</span>
    <span class="pcard__chips">${chips(p, t).map((x) => `<span>${esc(x)}</span>`).join("")}</span>
    <span class="pcard__foot"><span class="pcard__price">${p.price ? `${esc(price(p.price, L))} <small>${esc(t.product.vat)}</small>` : esc(t.product.consult)}</span><span class="pcard__go">${ARROW}</span></span>
  </span>
</a>`;
  }
  function chips(p, t) {
    const v = t.val, out = [];
    if (p.colour) out.push(v[p.colour]);
    if (p.sides) out.push(v["s" + p.sides]);
    if (p.pitch) out.push(p.pitch);
    if (p.use && p.use !== "both") out.push(v[p.use]);
    if (p.prog) out.push(v[p.prog]);
    return out;
  }
  function accTile(p, t) {
    return `<span class="acctile"><span>${esc(t.cats.accesorios[0])}</span><b>${esc(p.t[parse().lang])}</b></span>`;
  }
  const section = (id, cls, inner) => `<section id="${id}" class="sec ${cls || ""}">${inner}</section>`;

  // ------------------------------------------------------------------ pages
  function home(t, L) {
    const cats = D.categories.map((c) => `<a class="ccard" href="${href(L, "c", c.id)}">
      <span class="ccard__media">${c.img ? picture(c.img, t.cats[c.id][0], "(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 400px") : `<span class="acctile acctile--cat"><span>${esc(t.cats.accesorios[0])}</span></span>`}${c.comingSoon ? `<span class="ccard__soon">${esc(t.cat.soon.split(":")[0])}</span>` : ""}</span>
      <span class="ccard__title">${esc(t.cats[c.id][0])} ${ARROW}</span>
      <span class="ccard__text">${esc(t.cats[c.id][1])}</span>
    </a>`).join("");
    const feat = D.products.filter((p) => p.featured).map((p) => productCard(p, t, L)).join("");
    const appImgs = ["photo-cruces", "photo-blackfriday", "photo-pantallas", "photo-marcadores"];
    const apps = t.apps.items.map(([a, b], i) => `<figure class="app">
      <img src="${D.img}${appImgs[i]}-${appImgs[i] === "photo-blackfriday" ? 960 : 800}.webp" width="960" height="720" loading="lazy" decoding="async" alt="">
      <figcaption><b>${esc(a)}</b><span>${esc(b)}</span></figcaption></figure>`).join("");
    return `
<section class="hero" aria-labelledby="hero-t">
  <picture class="hero__media">
    <source media="(max-width: 760px)" srcset="${D.img}mobile-hero-storefront-822.webp">
    <img src="${D.img}hero-facade-1672.webp" srcset="${D.img}hero-facade-960.webp 960w, ${D.img}hero-facade-1672.webp 1672w" sizes="100vw" width="1672" height="941" alt="" fetchpriority="high">
  </picture>
  <div class="hero__shade" aria-hidden="true"></div>
  <div class="hero__copy">
    <h1 id="hero-t">${esc(t.hero.a)} <em>${esc(t.hero.b)}</em></h1>
    <div class="hero__ctas">
      <a class="btn btn--wa" href="#" data-modal>${WA}<span>${esc(t.hero.cta)}</span></a>
      <a class="btn btn--ghost hero__cta2" href="${href(L, "catalogo")}">${esc(t.hero.cta2)}</a>
    </div>
  </div>
</section>
${section("products", "sec--white", `<div class="wrap"><div class="sh"><h2>${esc(t.cats.title)}</h2><p>${esc(t.cats.lead)}</p></div><div class="cgrid">${cats}</div><p class="more"><a href="${href(L, "catalogo")}">${esc(t.cats.all)} ${ARROW}</a></p></div>`)}
${section("featured", "sec--soft", `<div class="wrap"><div class="sh"><h2>${esc(t.featured.title)}</h2><p>${esc(t.featured.lead)}</p></div><div class="pgrid pgrid--4">${feat}</div></div>`)}
${section("apps", "sec--dark", `<div class="wrap"><div class="sh sh--light"><h2>${esc(t.apps.title)}</h2><p>${esc(t.apps.lead)}</p></div><div class="apps">${apps}</div><p class="tiny tiny--light">${esc(t.apps.note)}</p></div>`)}
${section("how", "sec--white", `<div class="wrap"><div class="sh"><h2>${esc(t.how.title)}</h2></div><ol class="steps">${t.how.steps.map(([a, b], i) => `<li><span class="steps__n">0${i + 1}</span><b>${esc(a)}</b><p>${esc(b)}</p></li>`).join("")}</ol><p class="tiny">${esc(t.how.note)}</p></div>`)}
${section("company", "sec--dark sec--company", `<div class="wrap company"><div class="company__media"><img src="${D.img}card-storefront-792.webp" width="792" height="544" loading="lazy" decoding="async" alt=""></div><div><h2>${esc(t.company.title)}</h2>${t.company.paras.map((x) => `<p>${esc(x)}</p>`).join("")}<ul class="facts">${t.company.facts.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join("")}</ul></div></div>`)}
${section("info", "sec--white", `<div class="wrap"><div class="sh"><h2>${esc(t.info.title)}</h2></div><ul class="info">${t.info.items.map(([a, b]) => `<li><b>${esc(a)}</b><p>${esc(b)}</p></li>`).join("")}</ul><p class="tiny">${esc(t.info.note)}</p></div>`)}
${contactBlock(t, L)}`;
  }

  function contactBlock(t, L) {
    return section("contact", "sec--navy", `<div class="wrap contact"><div><h2>${esc(t.contact.title)}</h2><p>${esc(t.contact.lead)}</p><div class="contact__ctas"><a class="btn btn--wa" href="#" data-modal>${WA}<span>${esc(t.hero.cta)}</span></a><a class="btn btn--light" href="${href(L, "contacto")}">${esc(t.nav.quote)}</a></div></div>
      <dl class="contact__dl"><div><dt>Letreros Programables</dt><dd>${esc(t.contact.address)}</dd></div><div><dt>${esc(t.contact.phone)}</dt><dd>627 68 96 99 · 958 05 00 26</dd></div><div><dt>${esc(t.contact.email)}</dt><dd>info@letrerosprogramables.com</dd></div><p class="tiny tiny--light">${esc(t.contact.note)}</p></dl></div>`);
  }

  const FILTERS = { colour: ["mono", "rgb", "full"], sides: ["1", "2"], use: ["interior", "exterior"] };
  function setFilter(key, value) {
    const r = parse();
    const p = new URLSearchParams(r.params);
    if (!value || p.get(key) === value) p.delete(key); else p.set(key, value);
    go(href(r.lang, r.page, r.arg, p.toString()));
  }
  function matches(p, q) {
    if (q.get("fam") && p.cat !== q.get("fam")) return false;
    if (q.get("colour") && p.colour !== q.get("colour")) return false;
    if (q.get("sides") && String(p.sides) !== q.get("sides")) return false;
    if (q.get("use") && !(p.use === q.get("use") || p.use === "both")) return false;
    return true;
  }
  function filterBar(t, q, withFamily) {
    const v = t.val;
    const group = (key, label, opts, name) => `<div class="fgroup" role="group" aria-label="${esc(label)}"><span class="fgroup__l">${esc(label)}</span>${opts.map((o) => `<a href="#" class="chip${q.get(key) === o ? " is-on" : ""}" data-filter="${key}" data-value="${o}" aria-pressed="${q.get(key) === o}">${esc(name(o))}</a>`).join("")}</div>`;
    return `<div class="filters">
      ${withFamily ? group("fam", t.catalog.family, D.categories.filter((c) => !c.comingSoon).map((c) => c.id), (o) => t.cats[o][0]) : ""}
      ${group("colour", t.catalog.colour, FILTERS.colour, (o) => v[o])}
      ${group("sides", t.catalog.sides, FILTERS.sides, (o) => v["s" + o])}
      ${group("use", t.catalog.use, FILTERS.use, (o) => v[o])}
      ${[...q.keys()].some((k) => k !== "s") ? `<a href="#" class="chip chip--clear" data-filter="__all">${esc(t.catalog.clear)}</a>` : ""}
    </div>`;
  }

  function catalog(t, L, q) {
    const list = D.products.filter((p) => matches(p, q));
    return `<section class="page sec--white"><div class="wrap">
      <nav class="crumbs"><a href="${href(L)}">${esc(t.nav.home)}</a><span>/</span><span>${esc(t.catalog.title)}</span></nav>
      <div class="sh"><h1>${esc(t.catalog.title)}</h1><p>${esc(t.catalog.lead)}</p></div>
      ${filterBar(t, q, true)}
      <p class="count">${esc(fill(t.catalog.count, { n: list.length }))}</p>
      ${list.length ? `<div class="pgrid">${list.map((p) => productCard(p, t, L)).join("")}</div>` : `<p class="empty">${esc(t.catalog.none)}</p>`}
    </div></section>`;
  }

  function category(t, L, id, q) {
    const c = catOf(id);
    if (!c) return notFound(t, L);
    const sub = q.get("sub");
    const all = D.products.filter((p) => p.cat === id);
    const list = all.filter((p) => (!sub || p.sub === sub) && matches(p, q));
    const subs = c.subs.filter((s) => all.some((p) => p.sub === s));
    return `<section class="cathero${c.img ? "" : " cathero--plain"}">
      ${c.img ? `<img src="${img(c.img, 1448)}" width="1448" height="1086" alt="" fetchpriority="high">` : ""}
      <div class="cathero__shade"></div>
      <div class="wrap cathero__copy"><nav class="crumbs crumbs--light"><a href="${href(L)}">${esc(t.nav.home)}</a><span>/</span><a href="${href(L, "catalogo")}">${esc(t.catalog.title)}</a></nav><h1>${esc(t.cats[id][0])}</h1><p>${esc(t.cats[id][1])}</p></div>
    </section>
    <section class="page sec--white"><div class="wrap">
      ${c.comingSoon ? `<p class="empty">${esc(t.cat.soon)}</p><p class="more"><a href="${href(L, "contacto")}">${esc(t.nav.quote)} ${ARROW}</a></p>` : `
      ${subs.length > 1 ? `<div class="filters"><div class="fgroup">${subs.map((s) => `<a href="#" class="chip${sub === s ? " is-on" : ""}" data-filter="sub" data-value="${s}" aria-pressed="${sub === s}">${esc(t.subs[s])}</a>`).join("")}</div></div>` : ""}
      <p class="count">${esc(fill(t.catalog.count, { n: list.length }))}</p>
      <div class="pgrid">${list.map((p) => productCard(p, t, L)).join("")}</div>`}
      <p class="more"><a href="${href(L, "catalogo")}">← ${esc(t.cat.back)}</a></p>
    </div></section>`;
  }

  function product(t, L, id) {
    const p = prodOf(id);
    if (!p) return notFound(t, L);
    const c = catOf(p.cat), v = t.val, s = t.spec;
    const rows = [];
    const row = (k, val) => { if (val) rows.push(`<tr><th scope="row">${esc(k)}</th><td>${esc(val)}</td></tr>`); };
    row(s.colour, p.colour && v[p.colour]);
    row(s.colours, p.colours && p.colours.map((x) => v[x]).join(", "));
    row(s.sides, p.sides && v["s" + p.sides]);
    row(s.sizes, (p.sizes && p.sizes[L]) || (p.sizesList && p.sizesList.join(" · ")));
    row(s.sizeDefault, p.defaultSize);
    row(s.pitch, p.pitch);
    row(s.pitchMm, p.pitchMm);
    row(s.density, p.density);
    row(s.use, p.use && v[p.use]);
    row(s.prog, p.prog && v[p.prog]);
    row(s.probe, p.probe && v[p.probe]);
    row(s.brightness, p.brightness);
    row(s.ip, p.ip);
    row(s.voltage, p.voltage);
    row(s.weight, p.weight);
    row(s.temp, p.temp);
    row(s.bracket, p.bracket && v.included);
    row(s.life, p.life);
    row(s.warranty, p.warranty && fill(v.years, { n: p.warranty }));
    const related = D.products.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 3);
    return `<section class="page sec--white"><div class="wrap">
      <nav class="crumbs"><a href="${href(L)}">${esc(t.nav.home)}</a><span>/</span><a href="${href(L, "c", p.cat)}">${esc(t.cats[p.cat][0])}</a></nav>
      <div class="pd">
        <figure class="pd__media">${c.img ? picture(c.img, p.t[L], "(max-width: 900px) 92vw, 560px", true) : accTile(p, t)}${p.isNew ? `<span class="pcard__new">${esc(t.product.isNew)}</span>` : ""}<figcaption>${esc(t.product.imgNote)}</figcaption></figure>
        <div class="pd__info">
          <p class="pd__cat">${esc(t.cats[p.cat][0])}${p.sub ? " · " + esc(t.subs[p.sub]) : ""}</p>
          <h1>${esc(p.t[L])}</h1>
          ${p.acc ? `<p class="pd__lead">${esc(t.acc[p.acc])}</p>` : ""}
          <div class="pd__price">${p.price ? `<b>${esc(price(p.price, L))}</b> <span>${esc(t.product.vat)}</span><small>${esc(p.priceSize ? fill(t.product.priceNote, { size: p.priceSize }) : t.product.priceNoteDefault)}</small>` : `<b class="pd__consult">${esc(t.product.consult)}</b>`}</div>
          <div class="pd__ctas"><a class="btn btn--dark" href="${href(L, "contacto", p.id)}">${esc(t.product.quote)}</a><a class="btn btn--wa" href="#" data-modal>${WA}<span>WhatsApp</span></a></div>
          ${rows.length ? `<h2 class="pd__h">${esc(t.product.specs)}</h2><table class="specs"><tbody>${rows.join("")}</tbody></table>` : ""}
          <p class="pd__ref"><span>${esc(t.product.ref)}</span>${esc(p.ref)} · <a href="${D.source}${p.src}" target="_blank" rel="noopener nofollow">letrerosprogramables.com ↗</a></p>
        </div>
      </div>
      ${related.length ? `<div class="sh sh--small"><h2>${esc(t.product.related)}</h2></div><div class="pgrid">${related.map((x) => productCard(x, t, L)).join("")}</div>` : ""}
      <p class="more"><a href="${href(L, "c", p.cat)}">← ${esc(t.cats[p.cat][0])}</a></p>
    </div></section>`;
  }

  function contactPage(t, L, pid) {
    const opts = D.products.filter((p) => !p.acc).map((p) => `<option value="${p.id}"${p.id === pid ? " selected" : ""}>${esc(p.t[L])}</option>`).join("");
    return `<section class="page sec--white"><div class="wrap quote">
      <div><nav class="crumbs"><a href="${href(L)}">${esc(t.nav.home)}</a><span>/</span><span>${esc(t.nav.contact)}</span></nav>
        <h1>${esc(t.quote.title)}</h1><p class="pd__lead">${esc(t.quote.lead)}</p>
        <p class="notice">${esc(t.quote.notice)}</p>
        <form class="qform" novalidate autocomplete="off">
          <label>${esc(t.quote.name)}<input type="text" name="n"></label>
          <label>${esc(t.quote.email)}<input type="email" name="e"></label>
          <label>${esc(t.quote.phone)}<input type="tel" name="t"></label>
          <label>${esc(t.quote.product)}<select name="p"><option value="">${esc(t.quote.any)}</option>${opts}</select></label>
          <label class="qform__wide">${esc(t.quote.message)}<textarea name="m" rows="4"></textarea></label>
          <button type="submit" class="btn btn--dark">${esc(t.quote.send)}</button>
          <p class="qform__sent" role="status" hidden>${esc(t.quote.sent)}</p>
        </form></div>
      <aside class="quote__aside">${contactBlockInner(t)}</aside>
    </div></section>`;
  }
  const contactBlockInner = (t) => `<dl class="contact__dl contact__dl--dark"><div><dt>Letreros Programables</dt><dd>${esc(t.contact.address)}</dd></div><div><dt>${esc(t.contact.phone)}</dt><dd>627 68 96 99 · 958 05 00 26</dd></div><div><dt>${esc(t.contact.email)}</dt><dd>info@letrerosprogramables.com</dd></div><p class="tiny">${esc(t.contact.note)}</p></dl>`;

  const notFound = (t, L) => `<section class="page sec--white"><div class="wrap"><p class="empty">404</p><p class="more"><a href="${href(L)}">${esc(t.nav.home)}</a></p></div></section>`;

  // ------------------------------------------------------------------ modal (demo notices)
  function openModal() {
    const t = I[parse().lang];
    const d = document.getElementById("modal");
    d.querySelector("h2").textContent = t.modal.title;
    d.querySelector("p").textContent = t.modal.wa;
    d.querySelector("button").textContent = t.modal.ok;
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
  }

  // ------------------------------------------------------------------ render
  let lastKey = "";
  function render() {
    const r = parse(), t = I[r.lang], L = r.lang;
    document.documentElement.lang = L;
    if (r.params.get("__all") !== null) { /* never used as a real filter */ }
    let body, solid = true;
    if (!r.page) { body = home(t, L); solid = false; }
    else if (r.page === "catalogo") body = catalog(t, L, r.params);
    else if (r.page === "c") body = category(t, L, r.arg, r.params);
    else if (r.page === "p") body = product(t, L, r.arg);
    else if (r.page === "contacto") body = contactPage(t, L, r.arg);
    else body = notFound(t, L);
    const bar = embedded ? "" : `<div class="cbar"><span>${esc(t.bar.concept)}</span><a href="${L === "es" ? "/es/marketing-digital/letreros-programables/" : "/en/digital-marketing/letreros-programables/"}#experiencia-digital">← ${esc(t.bar.back)}</a></div>`;
    document.body.classList.toggle("is-standalone", !embedded);
    document.body.classList.remove("menu-open");
    app.innerHTML = bar + header(t, r, solid) + `<main id="main">${body}</main>` + footer(t, L);
    document.title = `${r.page === "p" && prodOf(r.arg) ? prodOf(r.arg).t[L] + " · " : ""}Letreros Programables — ${t.foot.concept}`;
    // the quote form never sends anything
    const f = app.querySelector(".qform");
    if (f) f.addEventListener("submit", (e) => { e.preventDefault(); f.reset(); f.querySelector(".qform__sent").hidden = false; });
    const key = r.lang + "/" + r.page + "/" + r.arg + "/" + [...r.params.entries()].filter(([k]) => k !== "s").join("&");
    const s = r.params.get("s");
    if (s && document.getElementById(s)) requestAnimationFrame(() => document.getElementById(s).scrollIntoView({ block: "start" }));
    else if (key.split("/").slice(0, 3).join("/") !== lastKey.split("/").slice(0, 3).join("/")) window.scrollTo(0, 0);
    lastKey = key;
  }
  // "clear filters" removes every filter but keeps the page
  const _setFilter = setFilter;
  setFilter = function (k, v) { if (k === "__all") { const r = parse(); go(href(r.lang, r.page, r.arg)); } else _setFilter(k, v); };
  document.getElementById("modal").addEventListener("close", () => {});
  render();
})();
