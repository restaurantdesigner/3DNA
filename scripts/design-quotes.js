/*
 * Build-time HTML for the quote spacers: a white band with one centred
 * statement at a time and a slow crossfade (behaviour: main.js "QUOTE SPACER";
 * styles: main.css "QUOTE SPACER"). All items sit in one grid cell, so the
 * band never changes height; without JavaScript the first one is shown.
 *
 * 1. Homepage, after the hero — the value of design.
 *    Data: assets/data/design-quotes.json; text: designQuotes.* in translations.
 *    Only items of type "quote" are quotations (quotation marks, <blockquote>,
 *    labelled as a direct quotation). Every "summary" is labelled as a
 *    research-based statement and is never in quotation marks. The attribution
 *    links the source.
 * 2. Fitness page, between the hero and the process film — what fitness club
 *    customers want. Text: fitnessPage.voices.* in translations. These are
 *    ILLUSTRATIVE customer wishes, not testimonials: no quotation marks, no
 *    names, and the shared caption says so ("Lo que buscan tus clientes").
 */
const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// generic band: items = [{ body: html, caption: html }]
function spacerHtml({ id, label, modifier = "", items }) {
  const total = items.length;
  return [
    `<section class="qspacer${modifier ? ` qspacer--${modifier}` : ""}" id="${id}" aria-label="${escapeHtml(label)}" aria-roledescription="carousel" data-qspacer>`,
    `  <div class="qspacer__stage" aria-live="off">`,
    ...items.map((it, i) => [
      `    <figure class="qspacer__item${i === 0 ? " is-active" : ""}" data-qs-item role="group" aria-roledescription="slide" aria-label="${i + 1} / ${total}"${i === 0 ? "" : ' aria-hidden="true"'}>`,
      `      ${it.body}`,
      `      <figcaption class="qspacer__by">${it.caption}</figcaption>`,
      `    </figure>`
    ].join("\n")),
    `  </div>`,
    `</section>`
  ].join("\n");
}

function createDesignQuotes(data, translations) {
  const t = (lang) => translations[lang].designQuotes;

  // homepage: the value of design
  function sectionHtml(lang) {
    const p = t(lang);
    return spacerHtml({
      id: "design-value",
      label: p.label,
      items: data.items.map((it) => {
        const text = p.items[it.id];
        const isQuote = it.type === "quote";
        const who = isQuote ? `${it.author} · ${it.org}` : it.org;
        const kind = isQuote ? `${p.quoteKind}${p.translatedNote ? ` (${p.translatedNote})` : ""}` : p.researchKind;
        const pub = [it.title, it.year].filter(Boolean).join(", ");
        return {
          body: isQuote
            ? `<blockquote class="qspacer__quote" cite="${escapeHtml(it.url)}"><p class="qspacer__text">“${escapeHtml(text)}”</p></blockquote>`
            : `<p class="qspacer__text">${escapeHtml(text)}</p>`,
          caption: `<a href="${escapeHtml(it.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(who)}<span class="qspacer__sr">${pub ? ` — ${escapeHtml(pub)}` : ""} (${escapeHtml(p.newTab)})</span></a> · ${escapeHtml(kind)}`
        };
      })
    });
  }

  // fitness page: what fitness club customers want (illustrative, not reviews)
  function fitnessVoicesHtml(lang) {
    const v = translations[lang].fitnessPage.voices;
    return spacerHtml({
      id: "lo-que-buscan",
      label: v.label,
      modifier: "compact",
      items: v.items.map((text) => ({ body: `<p class="qspacer__text">${escapeHtml(text)}</p>`, caption: escapeHtml(v.attribution) }))
    });
  }

  return { sectionHtml, fitnessVoicesHtml };
}

module.exports = { createDesignQuotes };
