/*
 * Specification data for the 3D restaurant planning section (used by build-i18n.js
 * through scripts/restaurant-plan.js).
 *
 * Data:  assets/data/restaurant-spec.json  (objects, zones — language neutral, "t:" = vocabulary key)
 * Text:  assets/i18n/restaurant-spec.json  (field labels + vocabulary per language)
 *
 * 1. Links every spec object to its instances in the 3D model (plan data):
 *    tables, chairs, stools, lights, walls, floors… get a `ref` (CH-01, LT-03…)
 *    so the scene can make them clickable, and quantities are COUNTED, never typed.
 * 2. Resolves each object / zone into display-ready rows for one language:
 *    overview, specification, materials, equipment, indicative cost.
 * Budgets are concept-stage placeholders and are always labelled as such.
 */
const LOCALE = { es: "es-ES", en: "en-GB", ru: "ru-RU", uk: "uk-UA" };

function createRestaurantSpec(plan, spec, i18n) {
  const rectsOf = (z) => z.rects || [z.rect];
  const zoneArea = Object.fromEntries(plan.zones.map((z) => [z.id, rectsOf(z).reduce((a, r) => a + r.w * r.d, 0)]));
  const barRuns = plan.items.filter((it) => it.type === "barRun");
  const barLength = barRuns.reduce((a, r) => a + Math.max(r.w, r.d), 0);

  // ---------- 1. instances: annotate the plan data, count quantities per zone ----------
  const qty = {};                       // ref -> { total, byZone: {zone: n} }
  const add = (ref, zone, n) => {
    const q = qty[ref] || (qty[ref] = { total: 0, byZone: {} });
    q.total += n;
    if (zone) q.byZone[zone] = (q.byZone[zone] || 0) + n;
  };
  const matches = (obj, m) => Object.keys(m).every((k) => k === "source" || obj[k] === m[k]);

  spec.objects.forEach((o) => {
    const zoneFor = (z) => z || o.zoneOverride || null;
    (o.match || []).forEach((m) => {
      if (m.source === "items") plan.items.forEach((it) => { if (matches(it, m)) { it.ref = o.ref; if (o.qtyAs !== "none") add(o.ref, zoneFor(it.zone), 1); } });
      if (m.source === "chairs") plan.items.forEach((it) => { if (it.type === "table" && it.zone === m.zone) { it.chairRef = o.ref; add(o.ref, it.zone, it.chairs || 0); } });
      if (m.source === "tableStools") plan.items.forEach((it) => { if (it.type === "highTable") { it.stoolRef = o.ref; add(o.ref, it.zone, it.stools || 0); } });
      if (m.source === "sconces") plan.items.forEach((it) => { if (it.type === "alcove") { it.sconceRef = o.ref; add(o.ref, it.zone, 1); } });
      if (m.source === "backbarLeds") plan.items.forEach((it) => { if (it.type === "backBar") { it.ledRef = o.ref; add(o.ref, it.zone, 2); } });
      if (m.source === "lights") (plan.lights || []).forEach((L) => { if (matches(L, m)) { L.ref = o.ref; add(o.ref, L.zone, 1); } });
      if (m.source === "walls") plan.walls.forEach((w) => { if (w.type === m.type) w.ref = o.ref; });
      if (m.source === "floors") plan.zones.forEach((z) => { if (z.finish === m.finish) z.floorRef = o.ref; });
    });
    if (typeof o.quantity === "number") (o.zones || []).forEach((z, i) => add(o.ref, z, i === 0 ? o.quantity : 0));
    if (o.areaOf) o.areaOf.forEach((z) => add(o.ref, z, zoneArea[z] || 0));
    if (o.quantity === "auto:barLengthNum") add(o.ref, "bar", barLength);
    if (!qty[o.ref] && o.zones) o.zones.forEach((z) => { (qty[o.ref] = qty[o.ref] || { total: null, byZone: {} }).byZone[z] = null; });
  });
  const byRef = Object.fromEntries(spec.objects.map((o) => [o.ref, o]));
  const zonesOf = (o) => {
    const q = qty[o.ref];
    const z = q ? Object.keys(q.byZone) : [];
    return z.length ? z : (o.zones || []);
  };

  // ---------- 2. resolve for one language ----------
  function forLang(lang, zoneNames) {
    const L = i18n[lang].labels, T = i18n[lang].terms;
    const loc = LOCALE[lang] || "en-GB";
    const n0 = (n, d = 0) => new Intl.NumberFormat(loc, { maximumFractionDigits: d }).format(n);
    const eur = (n) => new Intl.NumberFormat(loc, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
    const range = (a, b) => `${eur(a)} – ${eur(b)}`;
    const tr = (v) => {
      if (typeof v !== "string") return String(v);
      if (v.startsWith("t:")) return T[v.slice(2)] || v.slice(2);
      if (v === "auto:barLength") return `${n0(barLength, 1)} ${L["u.m"]} (${barRuns.map((r) => n0(Math.max(r.w, r.d), 1)).join(" + ")})`;
      if (v === "auto:size") return "2300 × 500 / 500 × 1500 × H 1000 mm";
      return v;
    };
    const perLabel = { unit: L["u.unit"], m: L["u.m"], m2: L["u.m2"], run: L["u.run"] };
    const qtyText = (o, n) => {
      if (n == null || o.quantity === "tbc") return T.tbc;
      const per = o.budget ? o.budget[2] : "unit";
      if (per === "m2") return `${n0(n)} ${L["u.m2"]}`;
      if (per === "m") return `${n0(n, 1)} ${L["u.m"]}`;
      if (per === "run") return `${n0(n)} × ${L["u.run"]}`;
      return `${n0(n)} ${n === 1 ? L["u.unit"] : L["u.units"]}`;
    };
    const costOf = (o, n) => {
      if (!o.budget) return null;
      const [a, b, per] = o.budget;
      const unit = `${range(a, b)} / ${perLabel[per] || per}`;
      const known = n != null && o.quantity !== "tbc";
      return { unit, qty: qtyText(o, n), total: known ? range(a * n, b * n) : T.tbc, min: known ? a * n : 0, max: known ? b * n : 0 };
    };
    const zoneList = (ids) => ids.map((z) => zoneNames[z] || z).join(", ");
    const matItem = (m) => (byRef[m] ? { ref: m, text: tr("t:" + byRef[m].name) } : { text: tr(m) });

    const objects = {};
    spec.objects.forEach((o) => {
      const q = qty[o.ref] || { total: null, byZone: {} };
      const total = o.quantity === "tbc" ? null : q.total;
      const zs = zonesOf(o);
      const specRows = o.spec.map(([k, v]) => [L[k] || k, tr(v)]);
      const keyRows = (o.key || []).map((k) => {
        if (k === "status") return [L.status, tr("t:" + o.status)];
        const row = o.spec.find(([kk]) => kk === k);
        return row ? [L[k] || k, tr(row[1])] : null;
      }).filter(Boolean);
      objects[o.ref] = {
        ref: o.ref, group: o.group, groupLabel: L["group." + o.group],
        category: tr("t:" + o.category), name: tr("t:" + o.name),
        zones: zs, location: zoneList(zs),
        quantity: qtyText(o, total), dims: o.dims ? tr(o.dims) : null,
        key: keyRows,
        spec: [[L.reference, o.ref], [L.model, tr(o.model)], [L.manufacturer, tr(o.manufacturer)], [L.supplier, tr(o.supplier)],
               ...(o.dims ? [[L.dimensions, tr(o.dims)]] : []), ...specRows, [L.status, tr("t:" + o.status)]],
        materials: (o.materials || []).map(matItem),
        equipment: (o.equipment || []).filter((r) => byRef[r]),
        status: tr("t:" + o.status),
        notes: o.notes ? tr(o.notes) : null,
        cost: costOf(o, total),
      };
    });

    const entry = (ref, zone) => {
      const o = byRef[ref], q = qty[ref];
      const n = q && q.byZone[zone] != null ? q.byZone[zone] : null;
      return { ref, name: objects[ref].name, qty: qtyText(o, n), n };
    };
    const zones = {};
    plan.zones.forEach((z) => {
      const zs = spec.zones[z.id] || {};
      const area = zoneArea[z.id];
      const inZone = spec.objects.filter((o) => o.group !== "material" && qty[o.ref] && z.id in qty[o.ref].byZone && qty[o.ref].byZone[z.id] !== 0);
      const extra = (zs.extraEquipment || []).filter((r) => !inZone.some((o) => o.ref === r)).map((r) => byRef[r]).filter(Boolean);
      const list = (g) => [...inZone, ...extra].filter((o) => o.group === g).map((o) => entry(o.ref, z.id));
      const items = plan.items.filter((it) => it.zone === z.id);
      const chairs = items.filter((it) => it.type === "table").reduce((a, it) => a + (it.chairs || 0), 0);
      const stools = items.filter((it) => it.type === "stool").length + items.filter((it) => it.type === "highTable").reduce((a, it) => a + (it.stools || 0), 0);
      const tables = items.filter((it) => it.type === "table" || it.type === "highTable").length;
      const alcoves = items.filter((it) => it.type === "alcove").length;
      const lights = (plan.lights || []).filter((l) => l.zone === z.id).length + alcoves + items.filter((it) => it.type === "backBar").length * 2;
      const seats = chairs + stools;
      const overview = [[L.area, `${n0(area)} ${L["u.m2"]}`]];
      if (seats) overview.push([L["z.seats"], n0(seats)]);
      if (tables) overview.push([L["z.tables"], n0(tables)]);
      if (chairs) overview.push([L["z.chairs"], n0(chairs)]);
      if (stools) overview.push([L["z.stools"], n0(stools)]);
      if (alcoves) overview.push([L["z.alcoves"], n0(alcoves)]);
      if (lights) overview.push([L["z.lights"], n0(lights)]);
      if (seats && z.id !== "bar") overview.push([L["z.spacePerGuest"], `${n0(area / seats, 1)} ${L["u.m2"]}`]);
      if (zs.bar) { overview.push([L["z.counterLength"], `${n0(barLength, 1)} ${L["u.m"]}`]); overview.push([L["z.backBar"], T.displayStorage]); }
      if (zs.ceiling) overview.push([L["z.ceiling"], objects[zs.ceiling].name]);

      // indicative cost: FF&E in the zone + floor and ceiling finishes (+ bar finishes per metre)
      let ffeMin = 0, ffeMax = 0;
      [...inZone, ...extra].forEach((o) => {
        const n = qty[o.ref].byZone[z.id];
        if (!o.budget || n == null) return;
        ffeMin += o.budget[0] * n; ffeMax += o.budget[1] * n;
      });
      let finMin = 0, finMax = 0;
      [zs.floor, zs.ceiling].filter(Boolean).forEach((r) => { const o = byRef[r]; finMin += o.budget[0] * area; finMax += o.budget[1] * area; });
      if (zs.bar) ["MAT-09", "MAT-10"].forEach((r) => { const o = byRef[r]; finMin += o.budget[0] * barLength; finMax += o.budget[1] * barLength; });

      zones[z.id] = {
        id: z.id, name: zoneNames[z.id] || z.id, overview,
        objectives: (zs.objectives || []).map((k) => T[k]),
        primary: (zs.primary || []).map((k) => T[k]),
        workZones: (zs.workZones || []).map((k) => T[k]),
        circulation: zs.circulation ? T[zs.circulation] : null,
        furniture: list("furniture"), lighting: list("lighting"), equipment: list("equipment"),
        materials: (zs.materials || []).map((r) => ({ ref: r, name: objects[r].name, qty: entry(r, z.id).qty })),
        cost: { ffe: range(ffeMin, ffeMax), finishes: range(finMin, finMax), total: range(ffeMin + finMin, ffeMax + finMax) },
      };
    });

    return { labels: L, objects, zones };
  }

  return { forLang, quantities: qty };
}

module.exports = { createRestaurantSpec };
