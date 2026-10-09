/*
 * Restaurants page — "Calculadora de Potencial Comercial" model (no dependencies).
 *
 * Five inputs → a complete preliminary feasibility report. One deterministic
 * engine (analyze) and one report structure (sections) feed everything: the live
 * section, the PDF and the print sheet. Shared by the build
 * (scripts/business-calc.js renders the section with the defaults, readable
 * without JavaScript) and the browser (assets/js/shared-calc/calc-tools.js).
 *
 * The 3D restaurant presentation above the calculator is a separate section and
 * is not touched by any of this.
 *
 * ASSUMPTIONS below are the model's internal, illustrative values for a
 * preliminary estimate in Spain (version ASSUMPTIONS.version). They are not
 * verified market data, quotes or wages; the page and the report say so.
 * URL: ?m2=260&plazas=48&ticket=25&dias=30&rotacion=3#calculadora
 */
(function (root) {
  // ---- the five inputs ----
  const FIELDS = [
    { key: "area", param: "m2", type: "number", min: 20, max: 5000, decimals: 0 },
    { key: "seats", param: "plazas", type: "number", min: 4, max: 1000, decimals: 0 },
    { key: "ticket", param: "ticket", type: "number", min: 1, max: 500, decimals: 2 },
    { key: "days", param: "dias", type: "number", min: 1, max: 31, decimals: 0 },
    { key: "rotation", param: "rotacion", type: "number", min: 1, max: 10, decimals: 1 },
  ];
  // the example: the 3D restaurant above (20 × 13 m, 48 seats, 25 € ticket, 30 days)
  // the example: the 3D restaurant above — 48 × 25 € × 2.6 × 30 = 93.600 €/month, as presented there
  const DEFAULTS = { area: 260, seats: 48, ticket: 25, days: 30, rotation: 2.6 };
  const ANCHOR = "calculadora";

  // ---- internal model assumptions (illustrative, versioned) ----
  const ASSUMPTIONS = {
    version: "3DNA-R1 · 2026-10",
    iva: 0.10,                                        // IVA on food & drink service in Spain (reduced rate)
    // demand per scenario relative to the entered rotation (which already is the average
    // occupancy: no extra occupancy % is applied). Base = exactly the five inputs.
    utilization: { conservative: 0.85, base: 1.0, optimistic: 1.15 },
    zoning: { dining: 0.55, kitchen: 0.25, support: 0.20 },              // conceptual split of the total area
    density: { veryHigh: 1.0, high: 1.3, ample: 2.2 },                   // m² of dining area per seat (thresholds)
    totalPerSeatTight: 1.6,                           // m² of total area per seat below which circulation is at risk
    kitchenPerSeat: { tight: 0.4, large: 1.2 },       // m² of conceptual kitchen per seat
    revenuePerM2Year: { low: 1500, high: 5000 },      // € net sales per m² and year (insight thresholds)
    breakEvenTight: 0.85,                             // break-even demand ≥ 85 % of the expected = little headroom
    rotationHigh: 6,
    services: 2, hoursPerService: 6, fteHours: 160,   // lunch + dinner; hours per service incl. set-up; hours per FTE month
    productivity: { waiter: 45, cook: 60, assistant: 90, bar: 150 },     // customers per service per position
    barMinSeats: 30,                                  // a bar position from this many seats
    salary: { waiter: 1550, cook: 1750, assistant: 1400, bar: 1550, supervisor: 2100 },  // gross €/month, 14 payments
    payments: 14, employerOnCost: 0.32,               // employer social security and similar
    fbRatio: 0.30,                                    // food & beverage cost on net sales
    rentPerM2: 15,                                    // €/m²/month
    electricity: { perM2: 3.0, perCustomer: 0.20 },
    water: { base: 40, perCustomer: 0.06 },
    gasPerCustomer: 0.12,
    cleaningPerM2: 1.6, maintenancePerM2: 1.2,
    insurance: { base: 90, perM2: 0.35 },
    software: { base: 90, cardFeeOnGross: 0.005 },
    marketingOnNet: 0.02, consumablesPerCustomer: 0.15,
    overhead: { base: 350, onNet: 0.01 },
  };
  const A = ASSUMPTIONS;
  const ROLES = ["waiter", "cook", "assistant", "bar", "supervisor"];

  function staffing(v, dailyCustomers) {
    const perService = dailyCustomers / A.services;
    const pos = {
      waiter: Math.max(1, Math.ceil(perService / A.productivity.waiter)),
      cook: Math.max(1, Math.ceil(perService / A.productivity.cook)),
      assistant: Math.max(1, Math.ceil(perService / A.productivity.assistant)),
      bar: v.seats >= A.barMinSeats ? Math.max(1, Math.ceil(perService / A.productivity.bar)) : 0,
      supervisor: 1,
    };
    const fteFactor = A.services * A.hoursPerService * v.days / A.fteHours;
    const roles = ROLES.map((r) => {
      const fte = pos[r] * fteFactor;
      const monthlyCost = A.salary[r] * A.payments / 12 * (1 + A.employerOnCost);
      return { role: r, perService: pos[r], fte, cost: fte * monthlyCost };
    });
    return {
      perServiceCustomers: perService, roles,
      positions: roles.reduce((s, x) => s + x.perService, 0),
      fte: roles.reduce((s, x) => s + x.fte, 0),
      cost: roles.reduce((s, x) => s + x.cost, 0),
    };
  }

  // one scenario at a utilization factor u; the five inputs never change between scenarios
  function scenario(v, u) {
    const theoDaily = v.seats * v.rotation;
    const daily = theoDaily * u;
    const monthly = daily * v.days;
    const gross = monthly * v.ticket;
    const net = gross / (1 + A.iva);
    const fb = net * A.fbRatio;
    const staff = staffing(v, daily);
    const opex = {
      staff: staff.cost,
      rent: v.area * A.rentPerM2,
      electricity: v.area * A.electricity.perM2 + monthly * A.electricity.perCustomer,
      water: A.water.base + monthly * A.water.perCustomer,
      gas: monthly * A.gasPerCustomer,
      cleaning: v.area * A.cleaningPerM2,
      maintenance: v.area * A.maintenancePerM2,
      insurance: A.insurance.base + v.area * A.insurance.perM2,
      software: A.software.base + gross * A.software.cardFeeOnGross,
      marketing: net * A.marketingOnNet,
      consumables: monthly * A.consumablesPerCustomer,
      overhead: A.overhead.base + net * A.overhead.onNet,
    };
    const opexTotal = Object.values(opex).reduce((s, x) => s + x, 0);
    const result = net - fb - opexTotal;
    return { u, daily, monthly, gross, net, vat: gross - net, fb, staff, opex, opexTotal, costs: fb + opexTotal, result, margin: net > 0 ? result / net : null };
  }

  function analyze(input) {
    const v = { ...DEFAULTS, ...input };
    const base = scenario(v, A.utilization.base);
    const cons = scenario(v, A.utilization.conservative);
    const opt = scenario(v, A.utilization.optimistic);
    const theo = { daily: v.seats * v.rotation };
    theo.monthly = theo.daily * v.days; theo.annual = theo.monthly * 12; theo.sales = theo.monthly * v.ticket;
    const space = {
      perSeat: v.area / v.seats,
      dining: v.area * A.zoning.dining, kitchen: v.area * A.zoning.kitchen, support: v.area * A.zoning.support,
    };
    space.diningPerSeat = space.dining / v.seats;
    space.kitchenPerSeat = space.kitchen / v.seats;
    space.seatsPer100 = v.seats / v.area * 100;
    space.density = space.diningPerSeat < A.density.veryHigh ? "veryHigh" : space.diningPerSeat < A.density.high ? "high" : space.diningPerSeat <= A.density.ample ? "adequate" : "ample";

    // break-even: staff and fixed costs held at the base scenario; the rest varies per customer
    const o = base.opex;
    const fixed = o.staff + o.rent + v.area * A.electricity.perM2 + A.water.base + o.cleaning + o.maintenance + o.insurance + A.software.base + A.overhead.base;
    const netTicket = v.ticket / (1 + A.iva);
    const varPerCustomer = netTicket * (A.fbRatio + A.marketingOnNet + A.overhead.onNet) + v.ticket * A.software.cardFeeOnGross
      + A.electricity.perCustomer + A.water.perCustomer + A.gasPerCustomer + A.consumablesPerCustomer;
    const perCustomer = netTicket - varPerCustomer;
    const be = perCustomer > 0 ? { customers: fixed / perCustomer } : null;
    if (be) {
      be.gross = be.customers * v.ticket; be.net = be.gross / (1 + A.iva);
      be.daily = be.customers / v.days; be.utilization = be.customers / base.monthly;   // share of the expected demand
    }

    const insights = [];
    const lvl = { veryHigh: "alert", high: "warn", adequate: "ok", ample: "opp" };
    insights.push({ level: lvl[space.density], key: "density_" + space.density, vars: { d: space.diningPerSeat } });
    if (space.perSeat < A.totalPerSeatTight) insights.push({ level: "warn", key: "circulation", vars: { p: space.perSeat } });
    if (space.kitchenPerSeat < A.kitchenPerSeat.tight && v.rotation >= 3) insights.push({ level: "warn", key: "kitchenTight", vars: { k: space.kitchenPerSeat, r: v.rotation } });
    if (space.kitchenPerSeat > A.kitchenPerSeat.large) insights.push({ level: "opp", key: "kitchenLarge", vars: { k: space.kitchenPerSeat } });
    const netPerM2Year = base.net * 12 / v.area;
    if (netPerM2Year < A.revenuePerM2Year.low) insights.push({ level: "warn", key: "revenueLow", vars: { e: netPerM2Year } });
    else if (netPerM2Year > A.revenuePerM2Year.high) insights.push({ level: "opp", key: "revenueHigh", vars: { e: netPerM2Year } });
    if (v.rotation >= A.rotationHigh) insights.push({ level: "warn", key: "rotationHigh", vars: { r: v.rotation } });
    if (!be || be.utilization > A.utilization.base) insights.push({ level: "alert", key: be ? "breakEvenOver" : "breakEvenNone", vars: { b: be ? be.utilization : null, u: A.utilization.base } });
    else if (be.utilization >= A.utilization.base * A.breakEvenTight) insights.push({ level: "warn", key: "breakEvenTight", vars: { b: be.utilization, u: A.utilization.base } });
    else insights.push({ level: "ok", key: "breakEvenOk", vars: { b: be.utilization, u: A.utilization.base } });

    return { v, A, theo, space, base, cons, opt, be, netPerM2Year, insights };
  }

  // flat results for the live summary (engine outputs [data-co])
  function compute(v) {
    const an = analyze(v);
    return {
      gross: an.base.gross, grossAnnual: an.base.gross * 12,
      profit: an.base.result, profitAnnual: an.base.result * 12, staffFte: an.base.staff.fte,
      rotation: v.rotation, utilizationBase: A.utilization.base,
      loss: an.base.result < 0, _an: an,
    };
  }

  // ---------------- the report: one structure for page, PDF and print ----------------
  // tags: in = entered by you · est = estimated by the model · max = theoretical maximum · scn = scenario
  function sections(an, t, f) {
    const { v, theo, space, base, be } = an;
    const m2 = (x) => `${f.num1(x)} m²`;
    const neg = (x) => typeof x === "number" && x < 0;
    const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] == null ? m : vars[k]));
    const pctU = f.pct(A.utilization.base);
    const S = [];

    S.push({ id: "space", page: 2, title: t.space.title, intro: t.space.intro, rows: [
      { label: t.space.area, value: m2(v.area), tag: "in" },
      { label: t.space.seats, value: f.int(v.seats), tag: "in" },
      { label: t.space.perSeat, value: m2(space.perSeat), tag: "est" },
      { label: t.space.dining, value: m2(space.dining), tag: "est", note: f.pct(A.zoning.dining) },
      { label: t.space.kitchen, value: m2(space.kitchen), tag: "est", note: f.pct(A.zoning.kitchen) },
      { label: t.space.support, value: m2(space.support), tag: "est", note: f.pct(A.zoning.support) },
      { label: t.space.diningPerSeat, value: m2(space.diningPerSeat), tag: "est" },
      { label: t.space.seatsPer100, value: f.num1(space.seatsPer100), tag: "est" },
      { label: t.space.density, value: t.space.levels[space.density], tag: "est", strong: true },
    ] });

    S.push({ id: "customers", page: 3, title: t.customers.title, intro: t.customers.intro, rows: [
      { label: t.customers.rotation, value: f.num1(v.rotation), tag: "in" },
      { label: t.customers.days, value: f.int(v.days), tag: "in" },
      { label: t.customers.expDaily, value: f.int(base.daily), tag: "scn", strong: true },
      { label: t.customers.expMonthly, value: f.int(base.monthly), tag: "scn", strong: true },
      { label: t.customers.expAnnual, value: f.int(base.monthly * 12), tag: "scn" },
    ] });

    S.push({ id: "revenue", page: 3, title: t.revenue.title, intro: fill(t.revenue.intro, { i: f.pct(A.iva) }), rows: [
      { label: t.revenue.ticket, value: f.eur2(v.ticket), tag: "in" },
      { label: t.revenue.dailyGross, value: f.eur(base.gross / v.days), tag: "scn" },
      { label: t.revenue.monthlyGross, value: f.eur(base.gross), tag: "scn", strong: true },
      { label: t.revenue.annualGross, value: f.eur(base.gross * 12), tag: "scn", strong: true },
      { label: t.revenue.vatMonthly, value: f.eur(base.vat), tag: "est" },
      { label: t.revenue.netMonthly, value: f.eur(base.net), tag: "est" },
      { label: t.revenue.netAnnual, value: f.eur(base.net * 12), tag: "est" },
      { label: t.revenue.perSeat, value: f.eur(base.gross / v.seats), tag: "est" },
      { label: t.revenue.perM2, value: f.eur(base.gross / v.area), tag: "est" },
      { label: t.revenue.netPerM2Year, value: f.eur(an.netPerM2Year), tag: "est" },
    ] });

    S.push({ id: "product", page: 3, title: t.product.title, intro: t.product.intro, rows: [
      { label: t.product.ratio, value: f.pct(A.fbRatio), tag: "est" },
      { label: t.product.monthly, value: f.eur(base.fb), tag: "est" },
      { label: t.product.annual, value: f.eur(base.fb * 12), tag: "est" },
      { label: t.product.contribution, value: f.eur(base.net - base.fb), tag: "est", strong: true },
    ] });

    const st = base.staff;
    S.push({ id: "staff", page: 4, title: t.staff.title,
      intro: fill(t.staff.intro, { s: A.services, h: A.hoursPerService, c: f.int(st.perServiceCustomers) }),
      table: { columns: [t.staff.role, t.staff.perService, t.staff.fte, t.staff.cost],
        rows: [...st.roles.filter((r) => r.perService > 0).map((r) => [t.staff.roles[r.role], f.int(r.perService), f.num1(r.fte), f.eur(r.cost)]),
          [{ text: t.staff.total, strong: true }, { text: f.int(st.positions), strong: true }, { text: f.num1(st.fte), strong: true }, { text: f.eur(st.cost), strong: true }]] },
      rows: [
        { label: t.staff.monthly, value: f.eur(st.cost), tag: "est", strong: true },
        { label: t.staff.annual, value: f.eur(st.cost * 12), tag: "est" },
        { label: t.staff.ratio, value: f.pct(base.net > 0 ? st.cost / base.net : null), tag: "est" },
      ],
      note: t.staff.note });

    const ox = base.opex;
    const opexKeys = ["staff", "rent", "electricity", "water", "gas", "cleaning", "maintenance", "insurance", "software", "marketing", "consumables", "overhead"];
    S.push({ id: "opex", page: 5, title: t.opex.title, intro: t.opex.intro,
      rows: [
        ...opexKeys.map((k) => ({ label: t.opex[k], value: f.eur(ox[k]), tag: "est" })),
        { label: t.opex.total, value: f.eur(base.opexTotal), tag: "est", strong: true },
        { label: t.opex.product, value: f.eur(base.fb), tag: "est" },
        { label: t.opex.totalCosts, value: f.eur(base.costs), tag: "est", strong: true },
      ],
      chart: { items: [
        { label: t.opex.net, value: base.net, display: f.eur(base.net), tone: "ink" },
        { label: t.opex.product, value: base.fb, display: f.eur(base.fb) },
        ...opexKeys.map((k) => ({ label: t.opex[k], value: ox[k], display: f.eur(ox[k]) })),
        { label: t.profit.monthly, value: base.result, display: f.eur(base.result), tone: base.result < 0 ? "neg" : "pos" },
      ] } });

    S.push({ id: "profit", page: 6, title: t.profit.title, intro: t.profit.intro, rows: [
      { label: t.profit.monthly, value: f.eur(base.result), tag: "scn", strong: true, negative: neg(base.result) },
      { label: t.profit.annual, value: f.eur(base.result * 12), tag: "scn", strong: true, negative: neg(base.result) },
      { label: t.profit.margin, value: f.pct(base.margin), tag: "scn", negative: neg(base.margin) },
      { label: t.profit.perM2, value: f.eur(base.result * 12 / v.area), tag: "scn", negative: neg(base.result) },
      { label: t.profit.perSeat, value: f.eur(base.result * 12 / v.seats), tag: "scn", negative: neg(base.result) },
      { label: t.profit.beRevenue, value: be ? f.eur(be.gross) : t.na, tag: "est", strong: true },
      { label: t.profit.beNet, value: be ? f.eur(be.net) : t.na, tag: "est" },
      { label: t.profit.beCustomers, value: be ? f.int(Math.ceil(be.customers)) : t.na, tag: "est" },
      { label: t.profit.beDaily, value: be ? f.int(Math.ceil(be.daily)) : t.na, tag: "est" },
      { label: t.profit.beUtilization, value: be ? f.pct(be.utilization) : t.na, tag: "est", negative: !!be && be.utilization > 1 },
    ], note: t.profit.excluded });

    const sc = [an.cons, an.base, an.opt];
    const cell = (x, fm) => ({ text: fm(x), negative: neg(x) });
    S.push({ id: "scenarios", page: 7, title: t.scenarios.title, intro: t.scenarios.intro,
      table: { columns: [t.scenarios.item, t.scenarios.conservative, t.scenarios.base, t.scenarios.optimistic], rows: [
        [t.scenarios.utilization, ...sc.map((s) => f.pct(s.u))],
        [t.scenarios.customers, ...sc.map((s) => f.int(s.monthly))],
        [t.scenarios.gross, ...sc.map((s) => f.eur(s.gross))],
        [t.scenarios.net, ...sc.map((s) => f.eur(s.net))],
        [t.scenarios.product, ...sc.map((s) => f.eur(s.fb))],
        [t.scenarios.staff, ...sc.map((s) => f.eur(s.staff.cost))],
        [t.scenarios.fte, ...sc.map((s) => f.num1(s.staff.fte))],
        [t.scenarios.other, ...sc.map((s) => f.eur(s.opexTotal - s.staff.cost))],
        [{ text: t.scenarios.result, strong: true }, ...sc.map((s) => ({ ...cell(s.result, f.eur), strong: true }))],
        [t.scenarios.annual, ...sc.map((s) => cell(s.result * 12, f.eur))],
        [t.scenarios.margin, ...sc.map((s) => cell(s.margin, f.pct))],
      ] } });

    const fmtVar = (k, x) => (x == null ? "—" : ["b", "u"].includes(k) ? f.pct(x) : ["d", "p", "k"].includes(k) ? f.num1(x) : k === "e" ? f.eur(x) : f.int(x));
    S.push({ id: "insights", page: 8, title: t.insights.title, intro: t.insights.intro,
      bullets: an.insights.map((i) => ({ level: i.level, label: t.insights.levels[i.level],
        text: fill(t.insights.texts[i.key], Object.fromEntries(Object.entries(i.vars).map(([k, x]) => [k, fmtVar(k, x)]))) })) });

    const sal = A.salary;
    S.push({ id: "method", page: 8, collapsed: true, title: t.method.title, intro: fill(t.method.intro, { version: A.version }),
      rows: [
        { label: t.method.a.iva, value: f.pct(A.iva) },
        { label: t.method.a.utilization, value: [A.utilization.conservative, A.utilization.base, A.utilization.optimistic].map(f.pct).join(" / ") },
        { label: t.method.a.zoning, value: [A.zoning.dining, A.zoning.kitchen, A.zoning.support].map(f.pct).join(" / ") },
        { label: t.method.a.services, value: `${A.services} × ${A.hoursPerService} h` },
        { label: t.method.a.fteHours, value: `${A.fteHours} h` },
        { label: t.method.a.productivity, value: [A.productivity.waiter, A.productivity.cook, A.productivity.assistant, A.productivity.bar].join(" / ") },
        { label: t.method.a.salaries, value: [sal.waiter, sal.cook, sal.assistant, sal.bar, sal.supervisor].map(f.eur).join(" / ") },
        { label: t.method.a.onCost, value: f.pct(A.employerOnCost) },
        { label: t.method.a.fb, value: f.pct(A.fbRatio) },
        { label: t.method.a.rent, value: `${f.eur2(A.rentPerM2)}/m²` },
        { label: t.method.a.electricity, value: `${f.eur2(A.electricity.perM2)}/m² + ${f.eur2(A.electricity.perCustomer)}` },
        { label: t.method.a.water, value: `${f.eur(A.water.base)} + ${f.eur2(A.water.perCustomer)}` },
        { label: t.method.a.gas, value: f.eur2(A.gasPerCustomer) },
        { label: t.method.a.cleaning, value: `${f.eur2(A.cleaningPerM2)}/m² · ${f.eur2(A.maintenancePerM2)}/m²` },
        { label: t.method.a.insurance, value: `${f.eur(A.insurance.base)} + ${f.eur2(A.insurance.perM2)}/m²` },
        { label: t.method.a.software, value: `${f.eur(A.software.base)} + ${f.pct(A.software.cardFeeOnGross)}` },
        { label: t.method.a.marketing, value: `${f.pct(A.marketingOnNet)} · ${f.eur2(A.consumablesPerCustomer)}` },
        { label: t.method.a.overhead, value: `${f.eur(A.overhead.base)} + ${f.pct(A.overhead.onNet)}` },
      ],
      paragraphs: t.method.formulas, note: t.method.disclaimer });
    return S;
  }

  // ---------------- live HTML (also used by the build for the first paint) ----------------
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // the eight report groups shown on the page (the PDF keeps every section in full)
  const GROUPS = [["space", ["space"]], ["volume", ["customers", "revenue", "product"]], ["staff", ["staff"]], ["opex", ["opex"]],
    ["profit", ["profit"]], ["scenarios", ["scenarios"]], ["insights", ["insights"]], ["method", ["method"]]];
  function renderHtml(an, t, f, open) {
    const tag = (k) => (k ? `<span class="rpc-tag rpc-tag--${k}">${esc(t.tags[k])}</span>` : "");
    const rows = (rs) => `<table class="rpc-table"><tbody>${rs.map((r) => `<tr${r.strong ? ' class="is-strong"' : ""}><th scope="row">${esc(r.label)}${r.note ? ` <span class="rpc-note">${esc(r.note)}</span>` : ""}</th><td>${tag(r.tag)}</td><td class="rpc-num${r.negative ? " is-neg" : ""}">${esc(r.value)}</td></tr>`).join("")}</tbody></table>`;
    const table = (tb) => `<div class="rpc-scroll"><table class="rpc-table rpc-table--grid"><thead><tr>${tb.columns.map((c, i) => `<th scope="col"${i ? ' class="rpc-num"' : ""}>${esc(c)}</th>`).join("")}</tr></thead><tbody>${tb.rows.map((r) => {
      const strong = r.some((c) => c && c.strong);
      return `<tr${strong ? ' class="is-strong"' : ""}>${r.map((c, i) => { const o = typeof c === "object" ? c : { text: c }; return i === 0 ? `<th scope="row">${esc(o.text)}</th>` : `<td class="rpc-num${o.negative ? " is-neg" : ""}">${esc(o.text)}</td>`; }).join("")}</tr>`;
    }).join("")}</tbody></table></div>`;
    const chart = (c) => {
      const max = Math.max(1, ...c.items.map((i) => Math.abs(i.value)));
      return `<div class="rpc-bars" aria-hidden="true">${c.items.map((i) => `<div class="rpc-bar rpc-bar--${i.tone || "accent"}${i.value < 0 ? " is-neg" : ""}"><span class="rpc-bar__l">${esc(i.label)}</span><span class="rpc-bar__t"><i style="width:${(100 * Math.abs(i.value) / max).toFixed(1)}%"></i></span><span class="rpc-bar__v">${esc(i.display)}</span></div>`).join("")}</div>`;
    };
    const byId = Object.fromEntries(sections(an, t, f).map((s) => [s.id, s]));
    return GROUPS.map(([gid, ids], gi) => {
      const list = ids.map((id) => byId[id]);
      const isOpen = !!(open && open[gid]);                       // every group starts closed
      const title = list.length > 1 ? t.groups[gid] : list[0].title;
      return `<details class="rpc-sec" data-sec="${gid}"${isOpen ? " open" : ""}>
  <summary class="rpc-sec__head"><span class="rpc-sec__num">${String(gi + 1).padStart(2, "0")}</span><span class="rpc-sec__title">${esc(title)}</span></summary>
  <div class="rpc-sec__body">
    ${list.map((s) => block(s, list.length > 1)).join("\n")}
  </div>
</details>`;
    }).join("\n");
    function block(s, sub) {
      return `${sub ? `<h4 class="rpc-sub">${esc(s.title)}</h4>` : ""}
    ${s.intro ? `<p class="rpc-intro">${esc(s.intro)}</p>` : ""}
    ${s.table ? table(s.table) : ""}
    ${s.rows ? rows(s.rows) : ""}
    ${s.chart ? chart(s.chart) : ""}
    ${s.bullets ? `<ul class="rpc-insights">${s.bullets.map((b) => `<li class="rpc-insight rpc-insight--${b.level}"><span class="rpc-insight__l">${esc(b.label)}</span> ${esc(b.text)}</li>`).join("")}</ul>` : ""}
    ${s.paragraphs ? s.paragraphs.map((p) => `<p class="rpc-p">${esc(p)}</p>`).join("") : ""}
    ${s.note ? `<p class="rpc-sec__note">${esc(s.note)}</p>` : ""}`;
    }
  }

  // engine hook: the summary is always live; the full report is rebuilt only while it is open
  // (and once when it is opened), keeping which groups the visitor opened
  function paint(box, results, ctx) {
    const out = box.querySelector("[data-rpc-rotation]");
    if (out) out.textContent = String(results.rotation);
    const host = box.querySelector("[data-rpc-report]");
    const full = box.querySelector("[data-rpc-full]");
    if (!host) return;
    const draw = () => {
      const open = {};
      host.querySelectorAll("details[data-sec]").forEach((d) => { open[d.dataset.sec] = d.open; });
      host.innerHTML = renderHtml(box.__rpcLast._an, ctx.t, ctx.f, open);
      box.__rpcDirty = false;
    };
    box.__rpcLast = results;
    if (full && !full.open) { box.__rpcDirty = true; }
    else draw();
    if (full && !full.__rpcWired) {
      full.__rpcWired = true;
      full.addEventListener("toggle", () => { if (full.open && box.__rpcDirty) draw(); });
    }
  }

  function summaryLine(v, r, f, ui) {
    return `${f.int(v.seats)} ${ui.seatsShort} · ${f.eur(r.gross)}${ui.perMonth} · ${ui.profitShort} ${f.eur(r.profit)}`;
  }

  // ---------------- PDF / print report ----------------
  function report(v, r, ctx) {
    const { t, f, common, contact } = ctx;
    const an = r._an;
    const neg = (x) => typeof x === "number" && x < 0;
    const S = sections(an, t, f);
    // the cover stands alone; the analysis then flows, each block kept whole on a page
    const blocks = [];
    S.forEach((s, i) => {
      const pb = i === 0;
      blocks.push({ pageBreak: pb, heading: s.title, intro: s.intro, table: s.table, rows: s.rows && s.rows.map((x) => ({ ...x, tagKind: x.tag, tag: x.tag ? t.tags[x.tag] : "" })), chart: s.chart, bullets: s.bullets, paragraphs: s.paragraphs, note: s.note });
    });
    blocks.push({ cta: { heading: t.cta.heading, lines: t.cta.lines, button: { label: t.cta.button, url: contact.whatsapp },
      links: [{ label: "3dna.es", url: "https://3dna.es/" }, { label: contact.email, url: `mailto:${contact.email}` }, { label: t.cta.calcLink, url: ctx.shareUrl }] } });
    return {
      ...common,
      title: t.pdfTitle, subtitle: t.pdfSubtitle, keywords: t.keywords,
      intro: [
        { label: t.inputsTitle, rows: [
          [t.fields.area, `${f.int(v.area)} m²`], [t.fields.seats, f.int(v.seats)], [t.fields.ticket, f.eur2(v.ticket)],
          [t.fields.days, f.int(v.days)], [t.fields.rotation, f.num1(v.rotation)],
        ] },
      ],
      summary: [
        { label: t.cards.grossMonthly, value: f.eur(r.gross), strong: true, note: t.cards.ivaIncl },
        { label: t.cards.grossAnnual, value: f.eur(r.grossAnnual), strong: true, note: t.cards.ivaIncl },
        { label: t.cards.profitMonthly, value: f.eur(r.profit), negative: neg(r.profit) },
        { label: t.cards.profitAnnual, value: f.eur(r.profitAnnual), negative: neg(r.profitAnnual) },
      ],
      summaryNote: t.cards.note,
      legend: ["in", "est", "scn"].map((k) => ({ key: k, label: t.tags[k], text: t.tagsHelp[k] })),
      blocks,
      footer: { ...common.footer, left: t.footerLeft },
    };
  }

  const model = { id: "restaurant", version: 2, fileStem: "Potencial-Comercial-Restaurante", fields: FIELDS, defaults: DEFAULTS, ASSUMPTIONS, ANCHOR,
    analyze, compute, sections, renderHtml, paint, report, summaryLine };
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  else {
    root.RestaurantRevenueCalc = model;
    const run = () => { const box = document.querySelector('[data-calc="restaurant"]'); if (box && root.CalcTools) root.CalcTools.mount(box, model); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
    else run();
  }
})(typeof window !== "undefined" ? window : this);
