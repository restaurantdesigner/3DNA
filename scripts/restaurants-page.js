/*
 * Build-time HTML for the Restaurants page (used by build-i18n.js).
 *
 * Data:  assets/data/restaurant-stories.json   (order, number, video, poster)
 * Text:  assets/i18n/translations.json          (restaurantsPage.* per language)
 *
 * One <section> per story: a vertical 9:16 video + label / headline / text.
 * DOM order is always video then text (mobile order); on desktop CSS puts the
 * text left on odd stories and right on even ones. Videos are lazy-loaded by
 * the SECTOR SECTIONS module in assets/js/main.js (data-src, near viewport,
 * paused off screen). All meaning is in the HTML text, never only in a video.
 */
const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function createRestaurantsPage(data, translations, { whatsappHref }) {
  const t = (lang) => translations[lang].restaurantsPage;

  function story(lang, s, index) {
    const p = t(lang);
    const st = p.stories[s.id];
    if (!st) throw new Error(`restaurantsPage.stories.${s.id} missing for "${lang}"`);
    const alignment = s.alignment || (index % 2 === 0 ? "text-left" : "video-left");
    const heading = "h2"; // the page H1 is the planning section that opens the page
    const label = `${s.number} / ${st.label}`;
    const media = s.video
      ? [
          // frame follows the video's own proportions (9:16 for most stories)
          `      <div class="rstory__media" style="aspect-ratio: ${s.width || 9} / ${s.height || 16}">`,
          `        <video class="rstory__video" muted autoplay loop playsinline webkit-playsinline preload="metadata" tabindex="-1"`,
          `          width="${s.width || 1080}" height="${s.height || 1920}"${s.poster ? ` poster="${s.poster}"` : ""}`,
          `          data-src="${s.video}" aria-label="${escapeHtml(p.videoLabel.replace("{label}", st.label))}"></video>`,
          `      </div>`
        ]
      : [
          `      <div class="rstory__media rstory__media--placeholder" aria-hidden="true">`,
          `        <span class="rstory__ph-num">${s.number}</span>`,
          `        <span class="rstory__ph-text">${escapeHtml(p.placeholder)}</span>`,
          `      </div>`
        ];
    return [
      `  <section class="rstory rstory--${alignment}${Array.isArray(st.body) && st.body.length ? " rstory--long" : ""}" id="${s.id}" aria-labelledby="rstory-${s.id}-title">`,
      `    <div class="rstory__inner">`,
      ...media,
      `      <div class="rstory__text">`,
      `        <p class="rstory__label">${escapeHtml(label)}</p>`,
      `        <${heading} class="rstory__title" id="rstory-${s.id}-title">${escapeHtml(st.headline)}</${heading}>`,
      `        <p class="rstory__desc">${escapeHtml(st.description)}</p>`,
      // optional longer copy (real, indexable paragraphs; never collapsed)
      ...(Array.isArray(st.body) && st.body.length
        ? [`        <div class="rstory__body">`, ...st.body.map((x) => `          <p>${escapeHtml(x)}</p>`), `        </div>`]
        : []),
      ...(st.tags ? [`        <p class="rstory__tags">${escapeHtml(st.tags)}</p>`] : []),
      `      </div>`,
      `    </div>`,
      `  </section>`
    ].join("\n");
  }

  function midCta(lang) {
    const m = t(lang).midCta;
    return [
      `  <aside class="rmid" aria-labelledby="rmid-title">`,
      `    <p class="rmid__title" id="rmid-title">${escapeHtml(m.heading)}</p>`,
      `    <a class="rmid__link" href="${escapeHtml(whatsappHref(lang))}" target="_blank" rel="noopener noreferrer"`,
      `      data-track="whatsapp_clicked" data-track-location="restaurants_mid">${escapeHtml(m.action)} <span aria-hidden="true">&rarr;</span></a>`,
      `  </aside>`
    ].join("\n");
  }

  // full-width visual break: natural aspect ratio, no text, decorative.
  // "sound": true adds a mute/unmute button (wired in assets/js/main.js);
  // the video always starts muted so autoplay is allowed.
  const SPEAKER = '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/>';
  const ICON_MUTED = `<svg class="rwide__icon rwide__icon--muted" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">${SPEAKER}<path d="M15.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>`;
  const ICON_ON = `<svg class="rwide__icon rwide__icon--on" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">${SPEAKER}<path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>`;
  function wide(lang, s) {
    const snd = t(lang).sound;
    return [
      `  <div class="rwide${s.sound ? " rwide--sound" : ""}" id="${s.id}"${s.sound ? "" : ' aria-hidden="true"'}>`,
      `    <video class="rwide__video" muted autoplay loop playsinline webkit-playsinline preload="metadata" tabindex="-1" aria-hidden="true"`,
      `      width="${s.width}" height="${s.height}"${s.poster ? ` poster="${s.poster}"` : ""}`,
      `      data-src="${s.video}" style="aspect-ratio: ${s.width} / ${s.height}"></video>`,
      ...(s.sound ? [
        `    <button type="button" class="rwide__sound" aria-pressed="false" aria-label="${escapeHtml(snd.enable)}"`,
        `      data-label-enable="${escapeHtml(snd.enable)}" data-label-disable="${escapeHtml(snd.disable)}">${ICON_MUTED}${ICON_ON}</button>`
      ] : []),
      `  </div>`
    ].join("\n");
  }

  function storiesHtml(lang) {
    const out = [];
    let n = 0; // stories only: wide breaks don't change the left/right rhythm
    data.stories.forEach((s) => {
      if (s.type === "wide") { out.push(wide(lang, s)); return; }
      out.push(story(lang, s, n++));
      if (s.id === data.midCtaAfter) out.push(midCta(lang));
    });
    return out.join("\n\n");
  }

  return { storiesHtml };
}

module.exports = { createRestaurantsPage };
