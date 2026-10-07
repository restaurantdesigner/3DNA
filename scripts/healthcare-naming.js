/*
 * Build-time HTML for the hospital naming-opportunities section (used by
 * build-i18n.js).
 *
 * Data:  assets/data/hospital-naming.json   (prices, status, layout, mesh ids)
 * Text:  assets/i18n/translations.json       (naming.* per language)
 *
 * Everything a visitor, keyboard user or crawler needs is plain HTML outside
 * the WebGL canvas: the opportunity list (buttons), a details article per
 * opportunity and an SVG floor plan (shown before the 3D loads and as the
 * no-WebGL fallback). The 3D scene (assets/js/healthcare-3d/) adds interaction.
 */
const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// USD values are never localized: always "$1,000,000"
const formatPrice = (amount, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

function createHealthcareNaming(data, translations, { whatsappNumber }) {
  const t = (lang) => translations[lang].naming;
  const opps = data.namingOpportunities;
  const zoneById = new Map(data.zones.map((z) => [z.id, z]));
  const rectOf = (o) => o.rect || zoneById.get(o.zone).rect;
  const hotspotOf = (o) => {
    if (o.hotspot) return o.hotspot;
    const r = rectOf(o);
    return { x: r.x + r.w / 2, z: r.z + r.d / 2 };
  };
  const total = opps.reduce((sum, o) => sum + o.price, 0);

  function waHref(lang, o) {
    const n = t(lang);
    const text = n.ui.whatsappMessage
      .replace("{name}", n.opportunities[o.id].name)
      .replace("{price}", formatPrice(o.price, o.currency));
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
  }

  // ---- accessible list: one button per opportunity ----
  function list(lang) {
    const n = t(lang);
    const items = opps.map((o) => [
      `        <li><button type="button" class="hnaming__opp" data-opp="${o.id}" aria-controls="hn-opp-${o.id}" aria-pressed="false">`,
      `          <span class="hnaming__opp-name">${escapeHtml(n.opportunities[o.id].name)}</span>`,
      `          <span class="hnaming__opp-price">${formatPrice(o.price, o.currency)}</span>`,
      `        </button></li>`
    ].join("\n"));
    return [
      `      <ol class="hnaming__list" aria-label="${escapeHtml(n.ui.listLabel)}">`,
      ...items,
      `      </ol>`
    ].join("\n");
  }

  // ---- details: overview + one article per opportunity ----
  function details(lang) {
    const n = t(lang);
    const ui = n.ui;
    const overview = [
      `      <article class="hn-opp hn-opp--overview" id="hn-opp-overview" data-opp="overview">`,
      `        <p class="hn-opp__kicker">${escapeHtml(ui.overviewTitle)}</p>`,
      `        <dl class="hn-opp__facts">`,
      `          <div><dt>${escapeHtml(ui.count)}</dt><dd>${opps.length}</dd></div>`,
      `          <div><dt>${escapeHtml(ui.total)}</dt><dd>${formatPrice(total, data.currency)}</dd></div>`,
      `        </dl>`,
      `        <p class="hn-opp__desc">${escapeHtml(ui.overviewText)}</p>`,
      `      </article>`
    ];
    const items = opps.map((o) => {
      const ot = n.opportunities[o.id];
      return [
        `      <article class="hn-opp" id="hn-opp-${o.id}" data-opp="${o.id}" aria-labelledby="hn-opp-${o.id}-title">`,
        `        <p class="hn-opp__kicker">${escapeHtml(ui.opportunity)}</p>`,
        `        <h3 class="hn-opp__title" id="hn-opp-${o.id}-title">${escapeHtml(ot.name)}</h3>`,
        `        <dl class="hn-opp__facts">`,
        `          <div class="hn-opp__value"><dt>${escapeHtml(ui.namingValue)}</dt><dd>${formatPrice(o.price, o.currency)}</dd></div>`,
        `          <div><dt>${escapeHtml(ui.area)}</dt><dd>${escapeHtml(n.zones[o.zone])}</dd></div>`,
        `        </dl>`,
        `        <h4 class="hn-opp__subtitle">${escapeHtml(ui.description)}</h4>`,
        `        <p class="hn-opp__desc">${escapeHtml(ot.description)}</p>`,
        `        <h4 class="hn-opp__subtitle">${escapeHtml(ui.status)}</h4>`,
        `        <p class="hn-opp__status hn-opp__status--${o.status}">${escapeHtml(n.statuses[o.status] || o.status)}</p>`,
        `        <a class="hn-opp__cta" href="${escapeHtml(waHref(lang, o))}" target="_blank" rel="noopener noreferrer"`,
        `          data-track="naming_opportunity_contact" data-track-location="${o.id}">${escapeHtml(ui.cta)} <span aria-hidden="true">&rarr;</span></a>`,
        `      </article>`
      ].join("\n");
    });
    return [...overview, ...items].join("\n");
  }

  // ---- SVG floor plan (placeholder before 3D, fallback without WebGL) ----
  function planSvg(lang) {
    const n = t(lang);
    const { width, depth } = data.floor;
    const zones = data.zones.map((z) => {
      const r = z.rect;
      const name = escapeHtml(n.zones[z.id]);
      const fs = Math.min(0.55, (r.w / Math.max(8, name.length)) * 1.6).toFixed(2);
      return `<g class="hn-plan__zone"><rect x="${r.x + 0.06}" y="${r.z + 0.06}" width="${r.w - 0.12}" height="${r.d - 0.12}"/><text x="${r.x + 0.4}" y="${r.z + 0.95}" font-size="${fs}">${name}</text></g>`;
    });
    const service = (data.serviceAreas || []).map((s) =>
      `<rect class="hn-plan__service" x="${s.rect.x + 0.06}" y="${s.rect.z + 0.06}" width="${s.rect.w - 0.12}" height="${s.rect.d - 0.12}"/>`);
    const spots = opps.map((o) => {
      const h = hotspotOf(o);
      return `<g class="hn-plan__spot" data-opp="${o.id}"><circle cx="${h.x}" cy="${h.z}" r="0.7"/><circle class="hn-plan__dot" cx="${h.x}" cy="${h.z}" r="0.28"/></g>`;
    });
    return `<svg class="hn-plan" viewBox="-0.5 -0.5 ${width + 1} ${depth + 1}" role="img" aria-label="${escapeHtml(n.ui.canvasDescription)}">${service.join("")}${zones.join("")}${spots.join("")}</svg>`;
  }

  // ---- data for the 3D scene (language-neutral data + localized labels) ----
  function clientData(lang) {
    const n = t(lang);
    return {
      model: data.model,
      floor: data.floor,
      serviceAreas: data.serviceAreas || [],
      zones: data.zones.map((z) => ({ id: z.id, mesh: z.mesh, rect: z.rect, finish: z.finish, name: n.zones[z.id] })),
      opportunities: opps.map((o) => ({
        id: o.id, zone: o.zone, meshId: o.meshId, status: o.status,
        rect: rectOf(o), hotspot: hotspotOf(o),
        name: n.opportunities[o.id].name,
        price: formatPrice(o.price, o.currency)
      }))
    };
  }

  return { list, details, planSvg, clientData, formatPrice };
}

module.exports = { createHealthcareNaming, formatPrice };
