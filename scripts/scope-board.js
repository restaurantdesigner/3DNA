/*
 * Build-time HTML for scope-of-work boards (used by build-i18n.js).
 *
 * Data: assets/data/boards/<id>.json — hero, videos, access options (each with its own AFTER image and
 *       item overrides), marker positions (percentages of the displayed image: "anchor" = the feature,
 *       "label" = the numbered marker), the specification rows, the work list and the gallery.
 * Page: /<slug>/index.html, Spanish. Behaviour: assets/js/scope-board.js. Print (A3 landscape): CSS.
 *
 * Order: hero · the two option videos (share / download) · option switch with explanation ·
 *        annotated image + numbered cards · specification table · work list · gallery.
 */
const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function createScopeBoard(b) {
  const L = b.labels, B = b.images.before, H = b.hero;
  const pct = (v) => `${Number(v).toFixed(2)}%`;
  const options = b.options && b.options.length ? b.options : [{ id: "a", label: L.after, image: b.images.after }];
  const multi = options.length > 1;
  // the item as it reads in an option (option overrides on top of the shared item)
  const itemIn = (it, o) => Object.assign({}, it, (o.items || {})[it.n] || {});
  const overridden = (n) => options.some((o) => (o.items || {})[n]);
  // shared items carry no option; overridden ones get one copy per option
  const variants = (it) => (multi && overridden(it.n) ? options.map((o) => [itemIn(it, o), o.id]) : [[it, ""]]);
  const optAttr = (id) => (id ? ` data-opt="${id}"` : "");
  const cardId = (n, id) => `item-${n}${id ? `-${id}` : ""}`;

  // ------------------------------------------------ hero
  const heroHtml = () => !H ? [] : [
    `  <section class="sboard-hero" aria-labelledby="sboard-title" data-sboard-hero>`,
    `    <img class="sboard-hero__bg" src="${H.poster}" alt="" aria-hidden="true" decoding="async">`,
    `    <div class="sboard-hero__film">`,
    `      <video class="sboard-hero__video" muted loop playsinline webkit-playsinline preload="metadata" disablepictureinpicture disableremoteplayback` +
      ` width="${H.width}" height="${H.height}" poster="${H.poster}" aria-label="${escapeHtml(H.label)}" data-src="${H.video}"></video>`,
    `    </div>`,
    `    <div class="sboard-hero__shade" aria-hidden="true"></div>`,
    `    <div class="sboard-hero__text">`,
    `      <h1 class="sboard-hero__title" id="sboard-title"><img class="sboard-hero__logo" src="${H.logo}" width="${H.logoWidth}" height="${H.logoHeight}" alt="Santa Locura Fitness" decoding="async"><span class="sboard-hero__sub">${escapeHtml(H.subtitle)}</span></h1>`,
    `      <p class="sboard-hero__status">${escapeHtml(b.status)}</p>`,
    `    </div>`,
    `  </section>`
  ];

  // ------------------------------------------------ today's reception: a full-screen film after the hero
  const C = b.current;
  const currentHtml = () => !C ? [] : [
    `  <section class="sboard-current" aria-labelledby="sboard-current-title" data-sboard-current>`,
    `    <video class="sboard-current__video" muted loop playsinline webkit-playsinline preload="none" disablepictureinpicture` +
      ` width="${C.width}" height="${C.height}" poster="${C.poster}" aria-label="${escapeHtml(C.label)}" data-src="${C.video}"></video>`,
    `    <div class="sboard-current__shade" aria-hidden="true"></div>`,
    `    <div class="sboard-current__text">`,
    `      <p class="sboard-current__eyebrow">${escapeHtml(C.eyebrow)}</p>`,
    `      <h2 class="sboard-current__title" id="sboard-current-title">${escapeHtml(C.title)}</h2>`,
    `      <p class="sboard-current__lead">${escapeHtml(C.text)}</p>`,
    `      <button type="button" class="sboard-current__sound" data-sound aria-pressed="false" data-on="${escapeHtml(C.soundOn)}" data-off="${escapeHtml(C.soundOff)}">${escapeHtml(C.soundOn)}</button>`,
    `    </div>`,
    `  </section>`
  ];

  // ------------------------------------------------ the option videos: share and download
  const G = b.gallery || {};
  const videosHtml = () => !(G.videos && G.videos.length) ? [] : [
    `  <section class="sboard__videos" aria-labelledby="sboard-videos-title">`,
    `    <h2 class="sboard__h2" id="sboard-videos-title">${escapeHtml(L.videosTitle)}</h2>`,
    `    <div class="sboard__vgrid">`,
    ...G.videos.map((v) => [
      `      <figure class="sboard__vid" id="${v.id}">`,
      `        <div class="sboard__vframe" style="aspect-ratio:${v.width} / ${v.height}">`,
      `          <video controls playsinline webkit-playsinline preload="none" poster="${v.poster}" width="${v.width}" height="${v.height}" src="${v.src}" aria-label="${escapeHtml(v.title)}"></video>`,
      `        </div>`,
      `        <figcaption>`,
      `          <h3>${escapeHtml(v.title)}</h3>`,
      `          <p>${escapeHtml(v.text)}</p>`,
      `          <div class="sboard__vact">`,
      `            <button type="button" class="sboard__act" data-share="${v.id}" data-src="${v.src}" data-title="${escapeHtml(v.title)}">${escapeHtml(L.share)}</button>`,
      `            <a class="sboard__act" href="${v.src}" download="Santa-Locura-${v.id}.mp4">${escapeHtml(L.download)}</a>`,
      `          </div>`,
      `          <div class="sboard__shareto" data-shareto="${v.id}" hidden>`,
      `            <a data-net="whatsapp" target="_blank" rel="noopener">WhatsApp</a><a data-net="telegram" target="_blank" rel="noopener">Telegram</a>` +
        `<button type="button" data-copy>${escapeHtml(L.copy)}</button><span class="sboard__copied" data-copied hidden>${escapeHtml(L.shareCopied)}</span>`,
      `          </div>`,
      `        </figcaption>`,
      `      </figure>`
    ].join("\n")),
    `    </div>`,
    `  </section>`
  ];

  // ------------------------------------------------ annotated image per option
  const markers = (o) => [
    `          <svg class="sboard__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">`,
    ...b.items.map((base) => { const it = itemIn(base, o); return `            <line data-line="${it.n}" x1="${it.label[0]}" y1="${it.label[1]}" x2="${it.anchor[0]}" y2="${it.anchor[1]}" vector-effect="non-scaling-stroke"/>`; }),
    `          </svg>`,
    ...b.items.map((base) => {
      const it = itemIn(base, o), id = multi && overridden(it.n) ? o.id : "";
      return [
        `          <span class="sboard__dot" data-dot="${it.n}" style="left:${pct(it.anchor[0])};top:${pct(it.anchor[1])}" aria-hidden="true"></span>`,
        `          <button type="button" class="sboard__marker" data-marker="${it.n}" style="left:${pct(it.label[0])};top:${pct(it.label[1])}"` +
          ` aria-controls="${cardId(it.n, id)}" aria-label="${escapeHtml(`${it.n} · ${it.title}`)}">${it.n}</button>`
      ].join("\n");
    })
  ];
  const pane = (o, i) => [
    `      <div class="sboard__view" data-pane="after-${o.id}"${i ? " hidden" : ""}>`,
    `        <div class="sboard__frame" style="aspect-ratio:${o.image.width} / ${o.image.height}">`,
    `          <img src="${o.image.src}" width="${o.image.width}" height="${o.image.height}" alt="${escapeHtml(o.image.alt)}" decoding="async"${i ? ' loading="lazy"' : ' fetchpriority="high"'}>`,
    ...markers(o),
    `        </div>`,
    `        <figcaption class="sboard__cap">${escapeHtml(o.label)}</figcaption>`,
    `      </div>`
  ].join("\n");

  const list = (items) => `<ul>${items.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
  const card = ([it, id]) => [
    `        <article class="sboard__card" id="${cardId(it.n, id)}" data-item="${it.n}"${optAttr(id)}${id && id !== options[0].id ? " hidden" : ""} tabindex="-1" aria-labelledby="${cardId(it.n, id)}-title">`,
    `          <h3 class="sboard__card-title" id="${cardId(it.n, id)}-title"><span class="sboard__num">${it.n}</span> ${escapeHtml(it.title)}</h3>`,
    `          <h4>${escapeHtml(L.action)}</h4>`,
    `          <p>${escapeHtml(it.action)}</p>`,
    `          <h4>${escapeHtml(L.work)}</h4>`,
    `          ${list(it.work)}`,
    `          <h4>${escapeHtml(L.verify)}</h4>`,
    `          ${list(it.verify)}`,
    ...(it.note ? [`          <p class="sboard__note">${escapeHtml(it.note)}</p>`] : []),
    `        </article>`
  ].join("\n");

  // ------------------------------------------------ specification table
  const specHtml = () => [
    `  <section class="sboard__spec" aria-labelledby="sboard-spec-title">`,
    `    <h2 class="sboard__h2" id="sboard-spec-title">${escapeHtml(L.specTitle)}</h2>`,
    `    <div class="sboard__tablewrap">`,
    `    <table class="sboard__table">`,
    `      <thead><tr>${L.specCols.map((c) => `<th scope="col">${escapeHtml(c)}</th>`).join("")}</tr></thead>`,
    `      <tbody>`,
    ...b.items.flatMap((base) => variants(base).map(([it, id]) =>
      `        <tr${optAttr(id)}${id && id !== options[0].id ? " hidden" : ""}><td class="sboard__tnum"><a href="#${cardId(it.n, id)}" data-goto="${it.n}"><span class="sboard__num">${it.n}</span></a></td>` +
      `<th scope="row">${escapeHtml(it.element)}</th><td>${escapeHtml(it.spec)}</td><td>${escapeHtml(it.ref)}</td><td>${escapeHtml(it.qty)}</td></tr>`)),
    `      </tbody>`,
    `    </table>`,
    `    </div>`,
    `    <p class="sboard__tnote">${escapeHtml(L.specNote)}</p>`,
    `  </section>`
  ];

  // ------------------------------------------------ gallery
  const galleryHtml = () => !(G.images && G.images.length) ? [] : [
    `  <section class="sboard__gallery" aria-labelledby="sboard-gallery-title">`,
    `    <h2 class="sboard__h2" id="sboard-gallery-title">${escapeHtml(L.gallery)}</h2>`,
    // tight: one row of equal-height images (each column sized by its image's proportions), no captions
    `    <div class="sboard__ggrid${G.tight ? " sboard__ggrid--tight" : ""}"${G.tight ? ` style="grid-template-columns:${G.images.map((g) => `${(g.width / g.height).toFixed(4)}fr`).join(" ")}"` : ""}>`,
    ...G.images.map((g) => [
      `      <figure>`,
      `        <a href="${g.src}" target="_blank" rel="noopener" aria-label="${escapeHtml(`${L.open}: ${g.caption}`)}"><img src="${g.small}" width="640" height="${Math.round((640 * g.height) / g.width)}" alt="${escapeHtml(g.caption)}" loading="lazy" decoding="async"></a>`,
      ...(G.tight ? [] : [`        <figcaption>${escapeHtml(g.caption)}</figcaption>`]),
      `      </figure>`
    ].join("\n")),
    `    </div>`,
    `  </section>`
  ];

  function bodyHtml(backHref) {
    return [
      `<main id="main" tabindex="-1" class="sboard${H ? " sboard--hero" : ""}" data-sboard data-view="after" data-option="${options[0].id}" data-preparing="${escapeHtml(L.sharePreparing || "…")}">`,
      ...heroHtml(),
      ...currentHtml(),
      `  <div class="sboard__wrap">`,
      `  <nav class="sboard__context" aria-label="Ubicación en el sitio">`,
      `    <a href="${backHref}"><span aria-hidden="true">&larr;</span> ${escapeHtml(L.back)}</a><span aria-current="page">${escapeHtml(L.board)}</span>`,
      `  </nav>`,
      ...videosHtml(),
      `  <header class="sboard__head" id="opciones">`,
      // with a hero the screen title is the logo; these two lines stay for the printed sheet
      `    <p class="sboard__status${H ? " sboard__print-only" : ""}">${escapeHtml(b.status)}</p>`,
      H ? `    <p class="sboard__title sboard__print-only">${escapeHtml(b.title)}</p>` : `    <h1 class="sboard__title">${escapeHtml(b.title)}</h1>`,
      `    <h2 class="sboard__h2">${escapeHtml(L.optionsTitle || L.legend)}</h2>`,
      `    <p class="sboard__intro">${escapeHtml(b.intro)}</p>`,
      `    <div class="sboard__tools">`,
      ...(multi ? [
        `      <div class="sboard__seg sboard__seg--opt" role="group" aria-label="${escapeHtml(L.options)}">`,
        ...options.map((o, i) => `        <button type="button" data-opt-btn="${o.id}" aria-pressed="${i ? "false" : "true"}">${escapeHtml(o.label)}</button>`),
        `      </div>`] : []),
      `      <div class="sboard__seg" role="group" aria-label="${escapeHtml(L.toggle)}">`,
      `        <button type="button" data-show="before" aria-pressed="false">${escapeHtml(L.before)}</button>`,
      `        <button type="button" data-show="after" aria-pressed="true">${escapeHtml(L.after)}</button>`,
      `      </div>`,
      `      <button type="button" class="sboard__btn" data-annot aria-pressed="false" data-label-hide="${escapeHtml(L.hide)}" data-label-show="${escapeHtml(L.show)}">${escapeHtml(L.hide)}</button>`,
      `      <button type="button" class="sboard__btn" data-print>${escapeHtml(L.print)}</button>`,
      `    </div>`,
      ...options.filter((o) => o.desc).map((o, i) => `    <p class="sboard__optdesc"${optAttr(multi ? o.id : "")}${multi && i ? " hidden" : ""}><strong>${escapeHtml(o.label)}.</strong> ${escapeHtml(o.desc)}</p>`),
      `  </header>`,
      `  <div class="sboard__layout">`,
      `    <figure class="sboard__fig">`,
      ...options.map(pane),
      `      <div class="sboard__view" data-pane="before" hidden>`,
      `        <div class="sboard__frame" style="aspect-ratio:${B.width} / ${B.height}">`,
      `          <img src="${B.src}" width="${B.width}" height="${B.height}" alt="${escapeHtml(B.alt)}" decoding="async" loading="lazy">`,
      `        </div>`,
      `        <figcaption class="sboard__cap">${escapeHtml(B.label)} · ${escapeHtml(L.beforeNote)}</figcaption>`,
      `      </div>`,
      `    </figure>`,
      `    <section class="sboard__cards" aria-label="${escapeHtml(L.legend)}">`,
      `      <div class="sboard__pager" aria-hidden="true"><button type="button" data-step="-1" tabindex="-1">&larr; ${escapeHtml(L.prev)}</button><span data-pos></span><button type="button" data-step="1" tabindex="-1">${escapeHtml(L.next)} &rarr;</button></div>`,
      ...b.items.flatMap(variants).map(card),
      `    </section>`,
      `    <figure class="sboard__print-before" aria-hidden="true">`,
      `      <img src="${B.small}" width="560" height="${Math.round((560 * B.height) / B.width)}" alt="" loading="lazy">`,
      `      <figcaption>${escapeHtml(B.label)}</figcaption>`,
      `    </figure>`,
      `  </div>`,
      ...specHtml(),
      `  <section class="sboard__worklist" aria-labelledby="sboard-worklist-title">`,
      `    <h2 class="sboard__h2" id="sboard-worklist-title">${escapeHtml(L.worklist)}</h2>`,
      `    <div class="sboard__groups">`,
      ...b.worklist.map((g) => [
        `      <div class="sboard__group">`,
        `        <h3>${escapeHtml(g.group)}</h3>`,
        `        <ul>${g.tasks.map(([n, t, o]) => `<li${optAttr(multi ? o : "")}${multi && o && o !== options[0].id ? " hidden" : ""}><a href="#item-${n}" data-goto="${n}"><span class="sboard__num">${n}</span> ${escapeHtml(t)}</a></li>`).join("")}</ul>`,
        `      </div>`
      ].join("\n")),
      `    </div>`,
      `  </section>`,
      ...galleryHtml(),
      `  <p class="sboard__foot">${escapeHtml(b.status)}</p>`,
      `  </div>`,
      `</main>`
    ].join("\n");
  }

  return { data: b, bodyHtml };
}

module.exports = { createScopeBoard };
