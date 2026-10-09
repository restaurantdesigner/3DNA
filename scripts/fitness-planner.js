/*
 * Build-time HTML for the Fitness 3D planner (used by build-i18n.js).
 *
 * Everything a visitor or crawler needs is rendered as semantic HTML outside
 * the WebGL canvas: the zone list, a full specification article per zone and
 * an SVG floor plan (shown before the 3D loads and as the no-WebGL fallback).
 * The 3D scene (assets/js/fitness-3d/) only adds interaction on top.
 */
const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function createFitnessPlanner(gym, translations) {
  const t = (lang) => translations[lang].fitness;
  const totalArea = gym.zones.reduce((sum, z) => sum + z.area, 0);

  // ---- zone navigation (buttons drive both the panel and the 3D camera) ----
  function zoneNav(lang) {
    const f = t(lang);
    const items = gym.zones.map((z) => {
      const name = escapeHtml(f.zones[z.id].name);
      return `        <li><button type="button" class="gym3d__zone-btn" data-zone="${z.id}" aria-controls="gym-zone-${z.id}" aria-pressed="false"><span class="gym3d__zone-num">${z.index}</span><span class="gym3d__zone-name">${name}</span></button></li>`;
    });
    return [
      `      <ol class="gym3d__nav" aria-label="${escapeHtml(f.ui.zonesNav)}">`,
      ...items,
      `      </ol>`
    ].join("\n");
  }

  // ---- details: overview + one article per zone ----
  function zoneDetails(lang) {
    const f = t(lang);
    const ui = f.ui;
    const overview = [
      `      <article class="gym-zone gym-zone--overview" id="gym-zone-overview" data-zone="overview">`,
      `        <p class="gym-zone__kicker">${escapeHtml(ui.overviewTitle)}</p>`,
      `        <dl class="gym-zone__facts">`,
      `          <div><dt>${escapeHtml(ui.totalArea)}</dt><dd>${totalArea} m²</dd></div>`,
      `          <div><dt>${escapeHtml(ui.zoneCount)}</dt><dd>${gym.zones.length}</dd></div>`,
      `        </dl>`,
      `        <p class="gym-zone__desc">${escapeHtml(ui.overviewText)}</p>`,
      `      </article>`
    ];
    const zones = gym.zones.map((z) => {
      const zt = f.zones[z.id];
      const rows = z.equipment.map((e) => {
        const meta = [f.categories[e.category], e.dimensions, e.power].filter(Boolean).map(escapeHtml).join(" · ");
        return [
          `            <li class="gym-zone__item">`,
          `              <span class="gym-zone__qty" aria-label="${escapeHtml(ui.quantity)}: ${e.quantity}">${e.quantity} ×</span>`,
          `              <span class="gym-zone__name">${escapeHtml(f.equipment[e.key])}</span>`,
          `              <span class="gym-zone__meta">${meta}</span>`,
          `            </li>`
        ].join("\n");
      });
      return [
        `      <article class="gym-zone" id="gym-zone-${z.id}" data-zone="${z.id}" aria-labelledby="gym-zone-${z.id}-title">`,
        `        <p class="gym-zone__kicker">${escapeHtml(ui.zone)} ${z.index}</p>`,
        `        <h3 class="gym-zone__title" id="gym-zone-${z.id}-title">${escapeHtml(zt.name)}</h3>`,
        `        <p class="gym-zone__desc">${escapeHtml(zt.description)}</p>`,
        `        <dl class="gym-zone__facts">`,
        `          <div><dt>${escapeHtml(ui.area)}</dt><dd>${z.area} m²</dd></div>`,
        `          <div><dt>${escapeHtml(ui.capacity)}</dt><dd>${z.capacity} ${escapeHtml(ui.users)}</dd></div>`,
        `        </dl>`,
        `        <h4 class="gym-zone__subtitle">${escapeHtml(ui.equipment)}</h4>`,
        `        <ul class="gym-zone__list">`,
        ...rows,
        `        </ul>`,
        `      </article>`
      ].join("\n");
    });
    return [...overview, ...zones].join("\n");
  }

  // ---- SVG floor plan (placeholder before 3D, fallback without WebGL) ----
  function planSvg(lang) {
    const f = t(lang);
    const { width, depth } = gym.floor;
    const rects = gym.zones.map((z) => {
      const r = z.rect;
      const name = escapeHtml(f.zones[z.id].name);
      const fs = Math.min(0.62, r.w / Math.max(6, name.length) * 1.5).toFixed(2);
      return [
        `<g class="gym-plan__zone" data-zone="${z.id}">`,
        `<rect x="${r.x + 0.08}" y="${r.z + 0.08}" width="${r.w - 0.16}" height="${r.d - 0.16}" rx="0.15"/>`,
        `<text x="${r.x + 0.45}" y="${r.z + 0.95}" class="gym-plan__num">${z.index}</text>`,
        `<text x="${r.x + 0.45}" y="${r.z + 1.75}" font-size="${fs}">${name}</text>`,
        `</g>`
      ].join("");
    });
    const service = (gym.serviceAreas || []).map((s) =>
      `<rect class="gym-plan__service" x="${s.rect.x + 0.08}" y="${s.rect.z + 0.08}" width="${s.rect.w - 0.16}" height="${s.rect.d - 0.16}" rx="0.15"/>`
    );
    return `<svg class="gym-plan" viewBox="-0.5 -0.5 ${width + 1} ${depth + 1}" role="img" aria-label="${escapeHtml(f.ui.canvasDescription)}">${service.join("")}${rects.join("")}</svg>`;
  }

  // ---- data for the 3D scene (language-neutral data + localized labels) ----
  function clientData(lang) {
    const f = t(lang);
    return {
      model: gym.model,
      floor: gym.floor,
      serviceAreas: gym.serviceAreas || [],
      serviceLayout: gym.serviceLayout || [],
      architecture: gym.architecture || null,
      zones: gym.zones.map((z) => ({
        id: z.id, mesh: z.mesh, index: z.index, rect: z.rect, floorFinish: z.floorFinish, layout: z.layout || [],
        name: f.zones[z.id].name,
        equipment: z.equipment.map((e) => ({ key: e.key, quantity: e.quantity }))
      }))
    };
  }

  return { zoneNav, zoneDetails, planSvg, clientData };
}

module.exports = { createFitnessPlanner };
