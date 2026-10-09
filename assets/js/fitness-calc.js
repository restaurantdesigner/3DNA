/*
 * Fitness page — one-input gym space & business planner (no dependencies).
 *
 * The visitor enters only the total area of the premises. One deterministic
 * engine (analyze) derives a recommended gym concept, an area schedule that sums
 * to exactly 100 % of the gross area, an equipment schedule that fits its zones,
 * capacity, staffing, investment, operating costs, three revenue scenarios and
 * break-even. One report structure (sections) feeds the live section, the PDF
 * and the print sheet. Shared by the build (scripts/business-calc.js) and the
 * browser (assets/js/shared-calc/calc-tools.js).
 *
 * CONCEPTS and ASSUMPTIONS are internal, illustrative values for a preliminary
 * feasibility study in Spain (version ASSUMPTIONS.version): not verified market
 * data, supplier quotes, rents or wages. The page and the report say so.
 * URL: ?m2=500&v=2#calculadora
 */
(function (root) {
  const FIELDS = [{ key: "area", param: "m2", type: "number", min: 40, max: 5000, decimals: 0 }];
  const DEFAULTS = { area: 500 };

  // gym formats: suitable area range (min / ideal / max, m² gross) and operating profile
  const CONCEPTS = {
    pt:           { min: 40,   ideal: [50, 150],    max: 260,  fee: 120, visits: 6,  session: 1.0,  m2PerUser: 8.0, hours: 13, peakShare: 0.12, coachRatio: 4,  mix: { cardio: 0.22, strength: 0.30, free: 0.28, functional: 0.20 }, studioFrom: Infinity },
    boutique:     { min: 100,  ideal: [150, 350],   max: 550,  fee: 75,  visits: 8,  session: 1.0,  m2PerUser: 4.5, hours: 14, peakShare: 0.14, coachRatio: 16, mix: { cardio: 0.18, strength: 0.10, free: 0.17, functional: 0.55 }, studioFrom: 180 },
    functional:   { min: 220,  ideal: [300, 800],   max: 1300, fee: 55,  visits: 10, session: 1.0,  m2PerUser: 5.0, hours: 15, peakShare: 0.13, coachRatio: 18, mix: { cardio: 0.15, strength: 0.15, free: 0.25, functional: 0.45 }, studioFrom: 400 },
    conventional: { min: 500,  ideal: [800, 2000],  max: 3200, fee: 38,  visits: 8,  session: 1.25, m2PerUser: 5.0, hours: 16, peakShare: 0.13, coachRatio: 45, mix: { cardio: 0.30, strength: 0.30, free: 0.25, functional: 0.15 }, studioFrom: 500 },
    large:        { min: 1500, ideal: [2000, 5000], max: 9999, fee: 45,  visits: 8,  session: 1.4,  m2PerUser: 5.5, hours: 17, peakShare: 0.12, coachRatio: 50, mix: { cardio: 0.28, strength: 0.30, free: 0.22, functional: 0.20 }, studioFrom: 1500 },
  };
  const ORDER = ["pt", "boutique", "functional", "conventional", "large"];

  const ASSUMPTIONS = {
    version: "3DNA-F1 · 2026-10",
    iva: 0.21,                                     // standard IVA on gym memberships in Spain
    // non-training zones: m² = base + share × gross area (area-sensitive); a zone appears from minArea
    zones: {
      reception:   { base: 6, share: 0.020, minArea: 0 },
      changing:    { base: 8, share: 0.055, minArea: 0 },
      showers:     { base: 4, share: 0.035, minArea: 0 },
      storage:     { base: 3, share: 0.015, minArea: 0 },
      staff:       { base: 6, share: 0.015, minArea: 250 },
      technical:   { base: 3, share: 0.022, minArea: 0 },
      circulation: { base: 0, share: 0.120, minArea: 0 },
    },
    studioShare: 0.11,                             // group studio, once the concept and area allow it
    trainingMin: { small: 0.45, smallUpTo: 200, other: 0.35 },   // minimum share of the floor that trains
    zoneMin: { cardio: 8, strength: 10, free: 8 },  // smaller than this, the zone joins the open training floor
    peakLoad: 0.85,                                // simultaneous users at peak vs. capacity
    daysPerMonth: 30.4,
    scenarios: { conservative: { members: 0.70, fee: 0.90 }, base: { members: 1.0, fee: 1.0 }, optimistic: { members: 1.15, fee: 1.05 } },
    // equipment: footprint incl. clearance (m²), share of its zone, budget range (€), power (W)
    equipment: {
      treadmill:   { zone: "cardio", share: 0.40, m2: 4.5, cost: [4000, 9000], w: 2200 },
      bike:        { zone: "cardio", share: 0.25, m2: 2.5, cost: [1200, 3500], w: 60 },
      elliptical:  { zone: "cardio", share: 0.20, m2: 3.5, cost: [2500, 6000], w: 60 },
      rower:       { zone: "cardio", share: 0.15, m2: 3.5, cost: [1000, 2500], w: 0 },
      selectorized:{ zone: "strength", share: 0.70, m2: 5.5, cost: [3000, 7000], w: 0 },
      cable:       { zone: "strength", share: 0.30, m2: 8.0, cost: [4000, 9000], w: 0 },
      rack:        { zone: "free", share: 0.45, m2: 9.0, cost: [1500, 4000], w: 0 },
      bench:       { zone: "free", share: 0.35, m2: 4.0, cost: [300, 1000], w: 0 },
      dumbbells:   { zone: "free", share: 0.20, m2: 6.0, cost: [1500, 4000], w: 0 },
      rig:         { zone: "functional", share: 0.35, m2: 20, cost: [3000, 12000], w: 0 },
      mats:        { zone: "functional", share: 0.40, m2: 3.0, cost: [30, 80], w: 0 },
      kit:         { zone: "functional", share: 0.25, m2: 25, cost: [600, 1500], w: 0 },
    },
    support: { lockersPerPeakUser: 1.3, lockerCost: [150, 300], reception: [3000, 8000], access: [4000, 12000], cameraPerM2: 1 / 80, cameraCost: [300, 600],
      lightingWPerM2: 10, lightingCostPerM2: [25, 60], soundPerZone: [800, 2000] },
    staff: { fteHours: 160, payments: 14, onCost: 0.32,
      salary: { reception: 1400, trainer: 1650, cleaning: 1350, manager: 2400, maintenance: 1800 },
      cleaningM2PerHour: 120, managerFromArea: 300, smallStudio: 150, maintenanceFtePerM2: 1 / 2500, automatedStaffedHours: 8 },
    investment: { fitout: [150, 350], flooring: [45, 110], wet: [600, 1200], electrical: [60, 120], hvac: [90, 180], signage: { base: [2000, 8000], perM2: [5, 12] }, contingency: 0.10 },
    opex: { rentPerM2: 10, energyPerM2: 2.5, water: { base: 30, perVisit: 0.06 }, cleaningPerM2: 0.4, maintenance: { equipmentYear: 0.08, perM2: 0.4 },
      insurance: { base: 80, perM2: 0.3 }, software: { base: 150, perMember: 0.5 }, marketingOnNet: 0.04, overhead: { base: 300, onNet: 0.015 } },
  };
  const A = ASSUMPTIONS;
  const mid = (r) => (r[0] + r[1]) / 2;

  function suitability(c, area) {
    if (area < c.min) return "no";
    if (area >= c.ideal[0] && area <= c.ideal[1]) return "ideal";
    if (area <= c.max) return "viable";
    return "oversized";
  }
  function recommend(area) {
    const ideal = ORDER.filter((k) => suitability(CONCEPTS[k], area) === "ideal");
    const pool = ideal.length ? ideal : ORDER.filter((k) => suitability(CONCEPTS[k], area) === "viable");
    const list = pool.length ? pool : [area < CONCEPTS.pt.min ? "pt" : "large"];
    const centre = (k) => Math.abs(Math.log(area / Math.sqrt(CONCEPTS[k].ideal[0] * CONCEPTS[k].ideal[1])));
    return list.slice().sort((a, b) => centre(a) - centre(b))[0];   // ideal range centred closest to the area
  }

  // area schedule: whole m², sums exactly to the gross area
  function schedule(area, key) {
    const c = CONCEPTS[key];
    const z = {};
    Object.entries(A.zones).forEach(([k, d]) => { if (area >= d.minArea) z[k] = d.base + d.share * area; });
    const studio = area >= c.studioFrom ? A.studioShare * area : 0;
    const support = Object.values(z).reduce((s, x) => s + x, 0);
    // a minimum share trains: on a very small floor the support zones are scaled down instead
    const minShare = area <= A.trainingMin.smallUpTo ? A.trainingMin.small : A.trainingMin.other;
    const training = Math.max(area * minShare, area - support - studio);
    const scale = (area - training - studio) / support;
    Object.keys(z).forEach((k) => { z[k] *= scale; });
    Object.entries(c.mix).forEach(([k, s]) => { z[k] = training * s; });
    // zones too small to work on their own become part of the open training floor
    const merged = {};
    Object.entries(A.zoneMin).forEach(([k, min]) => { if (z[k] < min) { merged[k] = z[k]; z.functional += z[k]; delete z[k]; } });
    if (studio) z.studio = studio;
    const ORDERZ = ["reception", "cardio", "strength", "free", "functional", "studio", "changing", "showers", "storage", "staff", "technical", "circulation"];
    const zones = ORDERZ.filter((k) => z[k] > 0).map((k) => ({ key: k, m2: Math.floor(z[k]) }));
    const diff = area - zones.reduce((s, x) => s + x.m2, 0);
    zones.find((x) => x.key === "circulation").m2 += diff;               // rounding goes to circulation
    zones.forEach((x) => { x.share = x.m2 / area; });
    const trainingKeys = ["cardio", "strength", "free", "functional", "studio"];
    const byKey = Object.fromEntries(zones.map((x) => [x.key, x.m2]));
    // equipment area per discipline: a merged discipline keeps its share inside the open training floor
    const eqArea = { ...byKey };
    Object.entries(merged).forEach(([k, m]) => { eqArea[k] = m; eqArea.functional -= m; });
    return { zones, usable: zones.filter((x) => trainingKeys.includes(x.key)).reduce((s, x) => s + x.m2, 0), byKey, eqArea };
  }

  function equipment(sched, peakUsers, area) {
    const E = A.equipment, S = A.support;
    const qty = {};
    Object.entries(E).forEach(([k, e]) => {
      const zone = Math.max(0, sched.eqArea[e.zone] || 0);
      qty[k] = Math.floor(zone * e.share / e.m2);
      if (k === "rig" && zone >= 30) qty[k] = Math.max(1, qty[k]);     // a rig needs ≈ 20 m² + clearance
    });
    // fill what is left of each zone with the smallest items that still fit (never beyond the zone)
    ["cardio", "strength", "free", "functional"].forEach((zk) => {
      const zone = Math.max(0, sched.eqArea[zk] || 0);
      const keys = Object.keys(E).filter((k) => E[k].zone === zk).sort((a, b) => E[a].m2 - E[b].m2);
      let used = keys.reduce((s2, k) => s2 + qty[k] * E[k].m2, 0);
      let added = true;
      while (added) {
        added = false;
        for (const k of keys) { if (used + E[k].m2 <= zone) { qty[k] += 1; used += E[k].m2; added = true; break; } }
      }
    });
    const items = Object.entries(E).filter(([k]) => qty[k] > 0).map(([k, e]) => ({
      key: k, group: e.zone === "free" ? "strength" : e.zone, qty: qty[k], m2: qty[k] * e.m2, cost: [qty[k] * e.cost[0], qty[k] * e.cost[1]], w: qty[k] * e.w }));
    if (sched.byKey.studio) {
      const qty = Math.floor(sched.byKey.studio / 3.2);
      items.push({ key: "studioKit", group: "functional", qty, m2: qty * 3.2, cost: [qty * 60, qty * 150], w: 0 });
    }
    const lockers = Math.ceil(peakUsers * S.lockersPerPeakUser);
    const cams = Math.max(2, Math.ceil(area * S.cameraPerM2));
    const soundZones = 1 + (sched.byKey.studio ? 1 : 0) + (area > 800 ? 1 : 0);
    items.push(
      { key: "lockers", group: "support", qty: lockers, m2: 0, cost: [lockers * S.lockerCost[0], lockers * S.lockerCost[1]], w: 0 },
      { key: "receptionDesk", group: "support", qty: 1, m2: 0, cost: S.reception.slice(), w: 300 },
      { key: "access", group: "support", qty: 1, m2: 0, cost: S.access.slice(), w: 150 },
      { key: "lighting", group: "support", qty: area, unit: "m2", m2: 0, cost: [area * S.lightingCostPerM2[0], area * S.lightingCostPerM2[1]], w: area * S.lightingWPerM2 },
      { key: "cameras", group: "support", qty: cams, m2: 0, cost: [cams * S.cameraCost[0], cams * S.cameraCost[1]], w: cams * 8 },
      { key: "sound", group: "support", qty: soundZones, m2: 0, cost: [soundZones * S.soundPerZone[0], soundZones * S.soundPerZone[1]], w: soundZones * 200 },
    );
    const sum = (f) => items.reduce((s, x) => s + f(x), 0);
    return { items, cost: [sum((x) => x.cost[0]), sum((x) => x.cost[1])], w: sum((x) => x.w) };
  }

  function staffing(area, c, peakUsers) {
    const St = A.staff, D = A.daysPerMonth;
    const fte = (hoursPerDay) => hoursPerDay * D / St.fteHours;
    const cost = (role, f) => f * St.salary[role] * St.payments / 12 * (1 + St.onCost);
    // small studios: the trainers cover the front desk and the owner manages part-time
    const recPositions = area < St.smallStudio ? 0 : area >= 1500 ? 2 : 1;
    const trainers = Math.max(1, Math.ceil(peakUsers / c.coachRatio));
    const roles = [
      { role: "reception", positions: recPositions, fte: fte(c.hours * recPositions) },
      { role: "trainer", positions: trainers, fte: fte(c.hours * trainers) },
      { role: "cleaning", positions: null, fte: fte(area / St.cleaningM2PerHour) },
      { role: "manager", positions: 1, fte: area >= St.managerFromArea ? 1 : area < St.smallStudio ? 0.25 : 0.5 },
      { role: "maintenance", positions: null, fte: Math.max(0.1, area * St.maintenanceFtePerM2) },
    ].map((r) => ({ ...r, cost: cost(r.role, r.fte) }));
    const total = { fte: roles.reduce((s, r) => s + r.fte, 0), cost: roles.reduce((s, r) => s + r.cost, 0) };
    // automated access: reception staffed only part of the day; demand is NOT assumed to change
    const autoRec = fte(Math.min(c.hours, St.automatedStaffedHours) * recPositions);
    const automated = { receptionFte: autoRec, saving: cost("reception", Math.max(0, roles[0].fte - autoRec)) };
    return { roles, total, automated };
  }

  function analyze(input) {
    const area = Math.min(FIELDS[0].max, Math.max(FIELDS[0].min, Number(input && input.area) || DEFAULTS.area));
    const key = recommend(area);
    const c = CONCEPTS[key];
    const concepts = ORDER.map((k) => ({ key: k, suit: suitability(CONCEPTS[k], area), c: CONCEPTS[k] }));
    const sched = schedule(area, key);

    // capacity: simultaneous users (space) ≠ paying members (demand over a month)
    const capacity = Math.floor(sched.usable / c.m2PerUser);
    const peakUsers = Math.round(capacity * A.peakLoad);
    const dailyVisits = peakUsers / (c.peakShare * c.session);
    const monthlyVisits = dailyVisits * A.daysPerMonth;
    const members = monthlyVisits / c.visits;                         // base potential membership
    const eq = equipment(sched, peakUsers, area);
    const staff = staffing(area, c, peakUsers);

    // investment (low / high), excl. IVA
    const I = A.investment;
    const wet = (sched.byKey.changing || 0) + (sched.byKey.showers || 0);
    const accessItem = eq.items.find((x) => x.key === "access");
    const inv = {
      fitout: [area * I.fitout[0], area * I.fitout[1]],
      flooring: [sched.usable * I.flooring[0], sched.usable * I.flooring[1]],
      wet: [wet * I.wet[0], wet * I.wet[1]],
      electrical: [area * I.electrical[0], area * I.electrical[1]],
      hvac: [area * I.hvac[0], area * I.hvac[1]],
      equipment: [eq.cost[0] - accessItem.cost[0], eq.cost[1] - accessItem.cost[1]],   // access control on its own line
      access: accessItem.cost.slice(),
      signage: [I.signage.base[0] + area * I.signage.perM2[0], I.signage.base[1] + area * I.signage.perM2[1]],
    };
    const sub = [0, 1].map((i) => Object.values(inv).reduce((s, r) => s + r[i], 0));
    inv.contingency = sub.map((x) => x * I.contingency);
    const invTotal = [sub[0] + inv.contingency[0], sub[1] + inv.contingency[1]];

    const O = A.opex;
    function scenarioAt(name) {
      const s = A.scenarios[name];
      const fee = Math.round(c.fee * s.fee * 2) / 2;
      const m = Math.round(members * s.members);
      const gross = m * fee;
      const net = gross / (1 + A.iva);
      const visits = m * c.visits;
      const costs = {
        payroll: staff.total.cost,
        rent: area * O.rentPerM2,
        energy: area * O.energyPerM2,
        water: O.water.base + visits * O.water.perVisit,
        cleaning: area * O.cleaningPerM2,
        maintenance: mid(eq.cost) * O.maintenance.equipmentYear / 12 + area * O.maintenance.perM2,
        insurance: O.insurance.base + area * O.insurance.perM2,
        software: O.software.base + m * O.software.perMember,
        marketing: net * O.marketingOnNet,
        overhead: O.overhead.base + net * O.overhead.onNet,
      };
      const total = Object.values(costs).reduce((a, b) => a + b, 0);
      const variable = m * O.software.perMember + visits * O.water.perVisit + net * (O.marketingOnNet + O.overhead.onNet);
      const fixed = total - variable;
      const netFee = fee / (1 + A.iva);
      const perMember = netFee * (1 - O.marketingOnNet - O.overhead.onNet) - O.software.perMember - c.visits * O.water.perVisit;
      const breakEven = perMember > 0 ? Math.ceil(fixed / perMember) : null;
      const result = net - total;
      return { name, fee, members: m, gross, vat: gross - net, net, costs, total, result, annual: result * 12, margin: net > 0 ? result / net : null,
        breakEven, breakEvenShare: breakEven == null || !members ? null : breakEven / members, revPerM2: net / area, profitPerM2: result / area,
        payback: result > 0 ? mid(invTotal) / (result * 12) : null };
    }
    const sc = { conservative: scenarioAt("conservative"), base: scenarioAt("base"), optimistic: scenarioAt("optimistic") };

    // architectural recommendations (conditional)
    const rec = [];
    if (area < 80) rec.push({ level: "warn", key: "tiny" });
    if (key === "pt" || key === "boutique") rec.push({ level: "opp", key: "boutiqueIdentity" });
    if (sched.byKey.studio) rec.push({ level: "ok", key: "studioAcoustics" });
    else if (area >= 150) rec.push({ level: "opp", key: "noStudio" });
    if (eq.items.some((x) => x.key === "treadmill")) rec.push({ level: "ok", key: "treadmillPower", vars: { kw: eq.w / 1000 } });
    if (sched.byKey.free) rec.push({ level: "warn", key: "freeWeightsFloor" });
    rec.push({ level: "warn", key: "ventilation", vars: { p: peakUsers } });
    if (area >= 1500) rec.push({ level: "opp", key: "zoningLarge" });
    if (sc.base.breakEven != null && sc.base.breakEven > sc.base.members) rec.push({ level: "alert", key: "breakEvenOver" });
    else if (sc.base.breakEven != null && sc.base.breakEven > sc.conservative.members) rec.push({ level: "warn", key: "breakEvenTight" });
    rec.push({ level: "ok", key: "regulations" });

    return { area, key, c, concepts, sched, capacity, peakUsers, dailyVisits, monthlyVisits, members, eq, staff, inv, invTotal, sc, rec, A };
  }

  function compute(v) {
    const an = analyze(v);
    const b = an.sc.base;
    return { gross: b.gross, grossAnnual: b.gross * 12, profit: b.result, profitAnnual: b.annual, capacity: an.capacity, members: b.members,
      invLow: an.invTotal[0], invHigh: an.invTotal[1], usable: an.sched.usable, loss: b.result < 0, _an: an };
  }

  // ---------------- one report structure: page, PDF and print ----------------
  function sections(an, t, f) {
    const { area, sched, sc } = an;
    const m2 = (x) => `${f.int(x)} m²`;
    const neg = (x) => typeof x === "number" && x < 0;
    const rng = (r) => `${f.keur(r[0])} – ${f.keur(r[1])}`;
    const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] == null ? m : vars[k]));
    const name = (k) => t.concepts[k].name;
    const S = [];
    const b = sc.base;

    S.push({ id: "summary", title: t.summary.title, intro: fill(t.summary.intro, { a: m2(area), c: name(an.key) }), rows: [
      { label: t.summary.area, value: m2(area), tag: "in", strong: true },
      { label: t.summary.concept, value: name(an.key), tag: "est", strong: true },
      { label: t.summary.usable, value: `${m2(sched.usable)} (${f.pct(sched.usable / area)})`, tag: "est" },
      { label: t.summary.capacity, value: f.int(an.capacity), tag: "max" },
      { label: t.summary.members, value: `${f.int(sc.conservative.members)} – ${f.int(sc.optimistic.members)}`, tag: "scn" },
      { label: t.summary.investment, value: rng(an.invTotal), tag: "est" },
      { label: t.summary.gross, value: f.eur(b.gross), tag: "scn" },
      { label: t.summary.result, value: f.eur(b.result), tag: "scn", strong: true, negative: neg(b.result) },
    ] });

    S.push({ id: "concept", title: t.concept.title, intro: fill(t.concept.intro, { c: name(an.key) }),
      table: { columns: [t.concept.format, t.concept.range, t.concept.suit], widths: [0.46, 0.24, 0.3], rows: an.concepts.map((x) => [
        { text: x.key === an.key ? `${name(x.key)} ★` : name(x.key), strong: x.key === an.key },
        `${f.int(x.c.ideal[0])}–${x.c.ideal[1] >= 5000 ? "5000+" : f.int(x.c.ideal[1])} m²`,
        { text: t.concept.suits[x.suit], strong: x.key === an.key },
      ]) },
      bullets: an.concepts.filter((x) => x.suit !== "no").map((x) => ({ level: x.key === an.key ? "ok" : "zone", label: name(x.key), text: t.concepts[x.key].desc })),
      note: t.concept.note });

    S.push({ id: "space", title: t.space.title, intro: t.space.intro,
      table: { columns: [t.space.zone, "m²", "%", t.space.equipment], widths: [0.3, 0.1, 0.1, 0.5], align: ["l", "r", "r", "l"], rows: [
        ...sched.zones.map((z) => [t.zones[z.key].name, f.int(z.m2), f.pct(z.share), t.zones[z.key].eq]),
        [{ text: t.space.total, strong: true }, { text: f.int(area), strong: true }, { text: f.pct(1), strong: true }, ""],
      ] },
      rows: [
        { label: t.space.gross, value: m2(area), tag: "in" },
        { label: t.space.usable, value: m2(sched.usable), tag: "est", note: f.pct(sched.usable / area) },
      ],
      chart: { items: sched.zones.map((z) => ({ label: t.zones[z.key].name, value: z.m2, display: `${f.int(z.m2)} m²`, tone: ["cardio", "strength", "free", "functional", "studio"].includes(z.key) ? "ink" : "accent" })) },
      bullets: sched.zones.map((z) => ({ level: "zone", label: t.zones[z.key].name, text: `${t.zones[z.key].purpose} ${t.zones[z.key].rec}` })),
      note: t.space.note });

    S.push({ id: "equipment", title: t.equipment.title, intro: t.equipment.intro,
      table: { columns: [t.equipment.item, t.equipment.qty, "m²", t.equipment.budget, "kW"], widths: [0.34, 0.12, 0.1, 0.3, 0.14], rows: [
        ...an.eq.items.map((x) => [t.equipment.items[x.key], x.unit === "m2" ? m2(x.qty) : f.int(x.qty), x.m2 ? f.int(x.m2) : "—", rng(x.cost), x.w ? f.num1(x.w / 1000) : "—"]),
        [{ text: t.equipment.total, strong: true }, "", "", { text: rng(an.eq.cost), strong: true }, { text: f.num1(an.eq.w / 1000), strong: true }],
      ] },
      bullets: ["cardio", "strength", "functional", "support"].map((g) => ({ level: "zone", label: t.equipment.groups[g], text: t.equipment.maintenance[g] })),
      note: t.equipment.note });

    S.push({ id: "capacity", title: t.capacity.title, intro: t.capacity.intro, rows: [
      { label: t.capacity.usable, value: m2(sched.usable), tag: "est" },
      { label: t.capacity.perUser, value: `${f.num1(an.c.m2PerUser)} m²`, tag: "est" },
      { label: t.capacity.simultaneous, value: f.int(an.capacity), tag: "max", strong: true },
      { label: t.capacity.peak, value: f.int(an.peakUsers), tag: "est" },
      { label: t.capacity.hours, value: `${an.c.hours} h`, tag: "est" },
      { label: t.capacity.session, value: `${f.int(an.c.session * 60)} min`, tag: "est" },
      { label: t.capacity.daily, value: f.int(an.dailyVisits), tag: "est" },
      { label: t.capacity.monthly, value: f.int(an.monthlyVisits), tag: "est" },
      { label: t.capacity.visits, value: f.num1(an.c.visits), tag: "est" },
      { label: t.capacity.members, value: `${f.int(sc.conservative.members)} – ${f.int(sc.optimistic.members)}`, tag: "scn", strong: true },
    ], note: t.capacity.note });

    const st = an.staff;
    S.push({ id: "staff", title: t.staff.title, intro: fill(t.staff.intro, { h: an.c.hours }),
      table: { columns: [t.staff.role, t.staff.positions, "FTE", t.staff.cost], rows: [
        ...st.roles.map((r) => [t.staff.roles[r.role], r.positions == null ? "—" : f.int(r.positions), f.num1(r.fte), f.eur(r.cost)]),
        [{ text: t.staff.total, strong: true }, "", { text: f.num1(st.total.fte), strong: true }, { text: f.eur(st.total.cost), strong: true }],
      ] },
      rows: [
        { label: t.staff.autoReception, value: `${f.num1(st.automated.receptionFte)} FTE`, tag: "scn" },
        { label: t.staff.autoSaving, value: f.eur(st.automated.saving), tag: "scn" },
      ],
      note: t.staff.note });

    const invKeys = ["fitout", "flooring", "wet", "electrical", "hvac", "equipment", "access", "signage", "contingency"];
    S.push({ id: "investment", title: t.investment.title, intro: t.investment.intro,
      table: { columns: [t.investment.item, t.investment.low, t.investment.high], rows: [
        ...invKeys.map((k) => [t.investment.items[k], f.eur(an.inv[k][0]), f.eur(an.inv[k][1])]),
        [{ text: t.investment.total, strong: true }, { text: f.eur(an.invTotal[0]), strong: true }, { text: f.eur(an.invTotal[1]), strong: true }],
      ] },
      rows: [{ label: t.investment.perM2, value: `${f.eur(an.invTotal[0] / area)} – ${f.eur(an.invTotal[1] / area)}`, tag: "est" }],
      note: t.investment.note });

    const ck = ["payroll", "rent", "energy", "water", "cleaning", "maintenance", "insurance", "software", "marketing", "overhead"];
    S.push({ id: "opex", title: t.opex.title, intro: t.opex.intro,
      rows: [...ck.map((k) => ({ label: t.opex.items[k], value: f.eur(b.costs[k]), tag: "est" })), { label: t.opex.total, value: f.eur(b.total), tag: "est", strong: true }],
      chart: { items: [{ label: t.opex.net, value: b.net, display: f.eur(b.net), tone: "ink" }, ...ck.map((k) => ({ label: t.opex.items[k], value: b.costs[k], display: f.eur(b.costs[k]) })),
        { label: t.scenarios.result, value: b.result, display: f.eur(b.result), tone: b.result < 0 ? "neg" : "pos" }] } });

    const L = [sc.conservative, sc.base, sc.optimistic];
    const cell = (x, fm) => ({ text: x == null ? t.na : fm(x), negative: neg(x) });
    S.push({ id: "scenarios", title: t.scenarios.title, intro: fill(t.scenarios.intro, { i: f.pct(A.iva) }),
      table: { columns: [t.scenarios.item, t.scenarios.conservative, t.scenarios.base, t.scenarios.optimistic], rows: [
        [t.scenarios.fee, ...L.map((s) => f.eur2(s.fee))],
        [t.scenarios.members, ...L.map((s) => f.int(s.members))],
        [t.scenarios.gross, ...L.map((s) => f.eur(s.gross))],
        [t.scenarios.vat, ...L.map((s) => f.eur(s.vat))],
        [t.scenarios.net, ...L.map((s) => f.eur(s.net))],
        [t.scenarios.costs, ...L.map((s) => f.eur(s.total))],
        [{ text: t.scenarios.result, strong: true }, ...L.map((s) => ({ ...cell(s.result, f.eur), strong: true }))],
        [t.scenarios.annual, ...L.map((s) => cell(s.annual, f.eur))],
        [t.scenarios.margin, ...L.map((s) => cell(s.margin, f.pct))],
        [t.scenarios.breakEven, ...L.map((s) => (s.breakEven == null ? t.na : f.int(s.breakEven)))],
        [t.scenarios.revPerM2, ...L.map((s) => f.eur2(s.revPerM2))],
        [t.scenarios.profitPerM2, ...L.map((s) => cell(s.profitPerM2, f.eur2))],
      ] }, note: t.scenarios.note });

    S.push({ id: "breakeven", title: t.breakeven.title, intro: t.breakeven.intro, rows: [
      { label: t.breakeven.members, value: b.breakEven == null ? t.na : f.int(b.breakEven), tag: "est", strong: true },
      { label: t.breakeven.share, value: b.breakEvenShare == null ? t.na : f.pct(b.breakEvenShare), tag: "est" },
      { label: t.breakeven.capacityNote, value: f.int(an.capacity), tag: "max" },
      { label: t.breakeven.payback, value: b.payback == null ? t.na : `${f.num1(b.payback)} ${t.breakeven.years}`, tag: "scn" },
    ], note: t.breakeven.note });

    S.push({ id: "recommendations", title: t.recs.title, intro: t.recs.intro,
      bullets: an.rec.map((r) => ({ level: r.level, label: t.levels[r.level], text: fill(t.recs.texts[r.key], { kw: r.vars && r.vars.kw != null ? f.num1(r.vars.kw) : "", p: r.vars && r.vars.p != null ? f.int(r.vars.p) : "" }) })) });

    const O = A.opex, St = A.staff, I = A.investment;
    S.push({ id: "method", collapsed: true, title: t.method.title, intro: fill(t.method.intro, { version: A.version }), rows: [
      { label: t.method.a.iva, value: f.pct(A.iva) },
      { label: t.method.a.perUser, value: ORDER.map((k) => f.num1(CONCEPTS[k].m2PerUser)).join(" / ") },
      { label: t.method.a.fee, value: ORDER.map((k) => f.eur(CONCEPTS[k].fee)).join(" / ") },
      { label: t.method.a.visits, value: ORDER.map((k) => f.int(CONCEPTS[k].visits)).join(" / ") },
      { label: t.method.a.hours, value: ORDER.map((k) => `${CONCEPTS[k].hours} h`).join(" / ") },
      { label: t.method.a.peak, value: `${f.pct(A.peakLoad)} · ${ORDER.map((k) => f.pct(CONCEPTS[k].peakShare)).join(" / ")}` },
      { label: t.method.a.scenarios, value: ["conservative", "base", "optimistic"].map((k) => `${f.pct(A.scenarios[k].members)} × ${f.pct(A.scenarios[k].fee)}`).join(" / ") },
      { label: t.method.a.salaries, value: ["reception", "trainer", "cleaning", "manager", "maintenance"].map((k) => f.eur(St.salary[k])).join(" / ") },
      { label: t.method.a.onCost, value: f.pct(St.onCost) },
      { label: t.method.a.rent, value: `${f.eur2(O.rentPerM2)}/m²` },
      { label: t.method.a.energy, value: `${f.eur2(O.energyPerM2)}/m²` },
      { label: t.method.a.investment, value: `${I.fitout.join("–")} · ${I.hvac.join("–")} · ${I.electrical.join("–")} €/m²` },
      { label: t.method.a.contingency, value: f.pct(I.contingency) },
      { label: t.method.a.marketing, value: `${f.pct(O.marketingOnNet)} · ${f.pct(O.overhead.onNet)}` },
    ], paragraphs: t.method.paragraphs, note: t.method.disclaimer });
    return S;
  }

  // ---------------- live HTML (also the build's first paint) ----------------
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function renderHtml(an, t, f, open) {
    const tag = (k) => (k ? `<span class="rpc-tag rpc-tag--${k}">${esc(t.tags[k])}</span>` : "");
    const rows = (rs) => `<table class="rpc-table"><tbody>${rs.map((r) => `<tr${r.strong ? ' class="is-strong"' : ""}><th scope="row">${esc(r.label)}${r.note ? ` <span class="rpc-note">${esc(r.note)}</span>` : ""}</th><td>${tag(r.tag)}</td><td class="rpc-num${r.negative ? " is-neg" : ""}">${esc(r.value)}</td></tr>`).join("")}</tbody></table>`;
    const num = (tb, i) => i > 0 && !(tb.align && tb.align[i] === "l");
    const table = (tb) => `<div class="rpc-scroll"><table class="rpc-table rpc-table--grid"><thead><tr>${tb.columns.map((c, i) => `<th scope="col"${num(tb, i) ? ' class="rpc-num"' : ""}>${esc(c)}</th>`).join("")}</tr></thead><tbody>${tb.rows.map((r) => `<tr${r.some((c) => c && c.strong) ? ' class="is-strong"' : ""}>${r.map((c, i) => { const o = typeof c === "object" ? c : { text: c }; return i === 0 ? `<th scope="row">${esc(o.text)}</th>` : `<td class="${num(tb, i) ? "rpc-num" : "rpc-txt"}${o.negative ? " is-neg" : ""}">${esc(o.text)}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`;
    const chart = (c) => { const max = Math.max(1, ...c.items.map((i) => Math.abs(i.value))); return `<div class="rpc-bars" aria-hidden="true">${c.items.map((i) => `<div class="rpc-bar rpc-bar--${i.tone || "accent"}${i.value < 0 ? " is-neg" : ""}"><span class="rpc-bar__l">${esc(i.label)}</span><span class="rpc-bar__t"><i style="width:${(100 * Math.abs(i.value) / max).toFixed(1)}%"></i></span><span class="rpc-bar__v">${esc(i.display)}</span></div>`).join("")}</div>`; };
    return sections(an, t, f).map((s, i) => {
      const isOpen = !!(open && open[s.id]);                        // every section starts closed
      return `<details class="rpc-sec" data-sec="${s.id}"${isOpen ? " open" : ""}>
  <summary class="rpc-sec__head"><span class="rpc-sec__num">${String(i + 1).padStart(2, "0")}</span><span class="rpc-sec__title">${esc(s.title)}</span></summary>
  <div class="rpc-sec__body">
    ${s.intro ? `<p class="rpc-intro">${esc(s.intro)}</p>` : ""}
    ${s.table ? table(s.table) : ""}
    ${s.rows ? rows(s.rows) : ""}
    ${s.chart ? chart(s.chart) : ""}
    ${s.bullets ? `<ul class="rpc-insights">${s.bullets.map((x) => `<li class="rpc-insight rpc-insight--${x.level}"><span class="rpc-insight__l">${esc(x.label)}</span> ${esc(x.text)}</li>`).join("")}</ul>` : ""}
    ${s.paragraphs ? s.paragraphs.map((p) => `<p class="rpc-p">${esc(p)}</p>`).join("") : ""}
    ${s.note ? `<p class="rpc-sec__note">${esc(s.note)}</p>` : ""}
  </div>
</details>`;
    }).join("\n");
  }
  // engine hook: the summary is always live; the full report is rebuilt only while it is open
  function paint(box, results, ctx) {
    const host = box.querySelector("[data-rpc-report]");
    const full = box.querySelector("[data-rpc-full]");
    const draw = () => {
      const open = {};
      host.querySelectorAll("details[data-sec]").forEach((d) => { open[d.dataset.sec] = d.open; });
      host.innerHTML = renderHtml(box.__rpcLast._an, ctx.t, ctx.f, open);
      box.__rpcDirty = false;
    };
    box.__rpcLast = results;
    if (host) {
      if (full && !full.open) box.__rpcDirty = true; else draw();
      if (full && !full.__rpcWired) { full.__rpcWired = true; full.addEventListener("toggle", () => { if (full.open && box.__rpcDirty) draw(); }); }
    }
    const an = results._an;
    const set = (sel, txt) => { const el = box.querySelector(sel); if (el) el.textContent = txt; };
    set("[data-fpc-concept]", ctx.t.concepts[an.key].name);
    set("[data-fpc-inv]", `${ctx.f.keur(an.invTotal[0])} – ${ctx.f.keur(an.invTotal[1])}`);
    set("[data-fpc-members]", `${ctx.f.int(an.sc.conservative.members)} – ${ctx.f.int(an.sc.optimistic.members)}`);
  }
  function summaryLine(v, r, f, ui) {
    return `${f.int(v.area)} m² · ${ui.profitShort} ${f.eur(r.profit)}${ui.perMonth}`;
  }

  function report(v, r, ctx) {
    const { t, f, common, contact } = ctx;
    const an = r._an;
    const neg = (x) => typeof x === "number" && x < 0;
    // the cover carries the executive summary; the analysis flows from page 2
    const S = sections(an, t, f).filter((s) => s.id !== "summary");
    const blocks = S.map((s, i) => ({ pageBreak: i === 0, heading: s.title, intro: s.intro, table: s.table,
      rows: s.rows && s.rows.map((x) => ({ ...x, tagKind: x.tag, tag: x.tag ? t.tags[x.tag] : "" })), chart: s.chart,
      bullets: s.bullets && s.bullets.map((x) => ({ ...x, level: x.level === "zone" ? "est" : x.level })), paragraphs: s.paragraphs, note: s.note }));
    blocks.push({ cta: { heading: t.cta.heading, lines: t.cta.lines, button: { label: t.cta.button, url: contact.whatsapp },
      links: [{ label: "3dna.es", url: "https://3dna.es/" }, { label: contact.email, url: `mailto:${contact.email}` }, { label: t.cta.calcLink, url: ctx.shareUrl }] } });
    return {
      ...common, title: t.pdfTitle, subtitle: t.pdfSubtitle, keywords: t.keywords,
      intro: [{ label: t.inputsTitle, rows: [
        [t.summary.area, `${f.int(an.area)} m²`], [t.summary.concept, t.concepts[an.key].name], [t.summary.usable, `${f.int(an.sched.usable)} m²`],
        [t.summary.capacity, f.int(an.capacity)], [t.summary.members, `${f.int(an.sc.conservative.members)}–${f.int(an.sc.optimistic.members)}`],
      ] }],
      summary: [
        { label: t.cards.gross, value: f.eur(r.gross), strong: true, note: t.cards.ivaIncl },
        { label: t.cards.investment, value: `${f.keur(an.invTotal[0])} – ${f.keur(an.invTotal[1])}`, strong: true },
        { label: t.cards.profit, value: f.eur(r.profit), negative: neg(r.profit) },
        { label: t.cards.profitAnnual, value: f.eur(r.profitAnnual), negative: neg(r.profitAnnual) },
      ],
      summaryNote: t.cards.note,
      legend: ["in", "est", "max", "scn"].map((k) => ({ key: k, label: t.tags[k], text: t.tagsHelp[k] })),
      blocks, footer: { ...common.footer, left: t.footerLeft },
    };
  }

  const model = { id: "fitness", version: 2, fileStem: "Planificacion-Gimnasio", fields: FIELDS, defaults: DEFAULTS, ASSUMPTIONS, CONCEPTS,
    analyze, compute, sections, renderHtml, paint, report, summaryLine };
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  else {
    root.FitnessCalc = model;
    const run = () => { const box = document.querySelector('[data-calc="fitness"]'); if (box && root.CalcTools) root.CalcTools.mount(box, model); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
    else run();
  }
})(typeof window !== "undefined" ? window : this);
