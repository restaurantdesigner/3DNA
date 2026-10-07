/*
 * Build-time HTML for the homepage "How it works" steps and the service levels
 * (used by build-i18n.js).
 *
 * Data:  assets/data/services.json     (id, price, "from" flag, emphasis, order)
 * Text:  assets/i18n/translations.json  (howItWorks.*, pricing.* per language)
 *
 * Plain semantic HTML, no client JS needed: each "What's included" list is a
 * <details> element (open on larger screens, collapsed on phones by a tiny
 * inline script in the template).
 */
const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// "€1.500" (es) / "€1,500" (en) / "€1 500" (ru, uk): euro sign first, local grouping
const GROUP = { es: ".", en: ",", ru: " ", uk: " " };
const formatEuro = (amount, lang) =>
  "€" + String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, GROUP[lang] || ",");

function createServicesPricing(data, translations, { whatsappNumber }) {
  const t = (lang) => translations[lang];

  const priceLabel = (lang, s) => (s.from ? `${t(lang).pricing.from} ` : "") + formatEuro(s.price, lang);

  function waHref(lang, s) {
    const p = t(lang).pricing;
    const item = p.items[s.id];
    const price = priceLabel(lang, s);
    const text = item.whatsappMessage ||
      p.whatsappMessage.replace("{name}", item.name).replace("{price}", price.charAt(0).toLowerCase() + price.slice(1));
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
  }

  // ---- "How it works": numbered steps ----
  function steps(lang) {
    const h = t(lang).howItWorks;
    const items = h.steps.map((s, i) => [
      `      <li class="hiw__step">`,
      `        <span class="hiw__num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>`,
      `        <h3 class="hiw__step-title">${escapeHtml(s.title)}</h3>`,
      `        <p class="hiw__step-text">${escapeHtml(s.text)}</p>`,
      `      </li>`
    ].join("\n"));
    return [`    <ol class="hiw__steps" aria-label="${escapeHtml(h.stepsLabel)}">`, ...items, `    </ol>`].join("\n");
  }

  // ---- service levels ----
  function cards(lang) {
    const p = t(lang).pricing;
    return data.services.map((s, i) => {
      const item = p.items[s.id];
      const includes = item.includes.map((x) => `            <li>${escapeHtml(x)}</li>`);
      return [
        `    <article class="svc${s.emphasis ? " svc--emphasis" : ""}" id="servicio-${s.id}" aria-labelledby="svc-${s.id}-name">`,
        `      <p class="svc__index" aria-hidden="true">${String(i + 1).padStart(2, "0")}</p>`,
        `      <h3 class="svc__name" id="svc-${s.id}-name">${escapeHtml(item.name)}</h3>`,
        `      <p class="svc__price">${s.from ? `<span class="svc__from">${escapeHtml(p.from)}</span> ` : ""}<span class="svc__amount">${formatEuro(s.price, lang)}</span></p>`,
        `      <p class="svc__tax">${escapeHtml(p.vatNote)}</p>`,
        `      <p class="svc__desc">${escapeHtml(item.description)}</p>`,
        `      <details class="svc__includes" open>`,
        `        <summary>${escapeHtml(p.includes)}</summary>`,
        `        <ul>`,
        ...includes,
        `        </ul>`,
        `      </details>`,
        `      <p class="svc__best"><span class="svc__label">${escapeHtml(p.bestFor)}</span> ${escapeHtml(item.bestFor)}</p>`,
        `      <a class="svc__cta" href="${escapeHtml(waHref(lang, s))}" target="_blank" rel="noopener noreferrer"`,
        `        data-track="service_cta_clicked" data-track-location="${s.id}">${escapeHtml(item.cta)} <span aria-hidden="true">&rarr;</span></a>`,
        `    </article>`
      ].join("\n");
    }).join("\n");
  }

  return { steps, cards, formatEuro, priceLabel };
}

module.exports = { createServicesPricing, formatEuro };
