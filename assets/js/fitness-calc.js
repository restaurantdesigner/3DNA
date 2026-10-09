/*
 * Fitness page — gym profitability calculator model (no dependencies).
 *
 * Shared by the build (scripts/fitness-calc.js renders the section prefilled
 * with these defaults) and the browser (assets/js/shared-calc/calc-tools.js runs
 * inputs, sharing, saving, PDF and print). Formulas:
 *
 *   gross sales (IVA incl.)  = active memberships × monthly price
 *   net revenue (excl. IVA)  = gross / (1 + IVA)
 *   operating expenses       = staff + rent + utilities + cleaning + maintenance
 *                              + security & access control + insurance & other
 *   operating profit         = net − expenses                 (annual = monthly × 12)
 *   visits per day           = memberships × visits per member per month / 30.4
 *   average occupancy        = visits per day × visit duration / opening hours
 *   peak attendance          = average occupancy × peak factor (24/7: 3 · staffed: 2)
 *   break-even memberships   = expenses / (price / (1 + IVA)), rounded up
 *
 * Opening hours, staff and security costs are kept per operating model, so the
 * 24/7 and staffed scenarios can be compared side by side. All starting values
 * are an illustrative example, editable, and labelled as such on the page.
 * URL: ?m2=800&aforo=120&socios=900&cuota=39.9&modelo=247&…#calculadora
 */
(function (root) {
  const FIELDS = [
    { key: "area", param: "m2", type: "number", min: 20, max: 50000, decimals: 0 },
    { key: "capacity", param: "aforo", type: "number", min: 1, max: 10000, decimals: 0 },
    { key: "members", param: "socios", type: "number", min: 0, max: 200000, decimals: 0 },
    { key: "price", param: "cuota", type: "number", min: 0, max: 1000, decimals: 2 },
    { key: "model", param: "modelo", type: "choice", options: ["247", "conv"] },
    { key: "visits", param: "visitas", type: "number", min: 0, max: 60, decimals: 1 },
    { key: "duration", param: "duracion", type: "number", min: 5, max: 600, decimals: 0 },
    { key: "hours247", param: "h247", type: "number", min: 1, max: 24, decimals: 1 },
    { key: "hoursConv", param: "hconv", type: "number", min: 1, max: 24, decimals: 1 },
    { key: "staff247", param: "p247", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "staffConv", param: "pconv", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "rent", param: "alquiler", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "utilities", param: "suministros", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "cleaning", param: "limpieza", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "maintenance", param: "mantenimiento", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "sec247", param: "s247", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "secConv", param: "sconv", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "insurance", param: "otros", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "iva", param: "iva", type: "number", min: 0, max: 30, decimals: 1 },
    { key: "project", param: "proyecto", type: "text", max: 80 },
  ];
  // illustrative example (IVA: 21 %, the general rate for gym memberships in Spain)
  const DEFAULTS = {
    area: 800, capacity: 120, members: 900, price: 39.9, model: "247", visits: 8, duration: 75,
    hours247: 24, hoursConv: 15, staff247: 8000, staffConv: 14000,
    rent: 8000, utilities: 3000, cleaning: 1800, maintenance: 1200, sec247: 900, secConv: 350, insurance: 1000,
    iva: 21, project: "",
  };
  const PEAK = { "247": 3, conv: 2 };
  const DAYS = 30.4;

  function scenario(v, m) {
    const hours = m === "247" ? v.hours247 : v.hoursConv;
    const staff = m === "247" ? v.staff247 : v.staffConv;
    const security = m === "247" ? v.sec247 : v.secConv;
    const gross = v.members * v.price;
    const net = gross / (1 + v.iva / 100);
    const expenses = staff + v.rent + v.utilities + v.cleaning + v.maintenance + security + v.insurance;
    const profit = net - expenses;
    const visitsDay = v.members * v.visits / DAYS;
    const avgOccupancy = hours > 0 ? visitsDay * (v.duration / 60) / hours : 0;
    const peak = avgOccupancy * PEAK[m];
    const netPrice = v.price / (1 + v.iva / 100);
    return {
      model: m, hours, staff, security, gross, net, expenses, profit, visitsDay, avgOccupancy, peak,
      peakFactor: PEAK[m],
      breakEven: netPrice > 0 ? Math.ceil(expenses / netPrice) : null,
    };
  }

  function compute(v) {
    const s = scenario(v, v.model);
    const alt = scenario(v, v.model === "247" ? "conv" : "247");
    const a = v.area > 0 ? v.area : null;
    return {
      gross: s.gross, grossAnnual: s.gross * 12,
      net: s.net, netAnnual: s.net * 12, vat: s.gross - s.net,
      staffCost: s.staff, rentCost: v.rent, utilitiesCost: v.utilities, cleaningCost: v.cleaning,
      maintenanceCost: v.maintenance, securityCost: s.security, insuranceCost: v.insurance,
      expenses: s.expenses, expensesAnnual: s.expenses * 12,
      profit: s.profit, profitAnnual: s.profit * 12,
      margin: s.net > 0 ? s.profit / s.net : null,
      revenuePerM2: a ? s.net / a : null, profitPerM2: a ? s.profit / a : null,
      capacity: v.capacity, visitsDay: s.visitsDay, avgOccupancy: s.avgOccupancy, peak: s.peak, peakFactor: s.peakFactor,
      peakShare: v.capacity > 0 ? s.peak / v.capacity : null,
      overCapacity: s.peak > v.capacity,
      breakEven: s.breakEven, hours: s.hours,
      loss: s.profit < 0,
      current: s, alternative: alt,
      // both operating models, for the side-by-side comparison
      ...Object.fromEntries([s, alt].flatMap((x) => {
        const k = x.model === "247" ? "247" : "Conv";
        return [[`profit${k}`, x.profit], [`expenses${k}`, x.expenses], [`breakEven${k}`, x.breakEven], [`peak${k}`, x.peak]];
      })),
    };
  }

  function summaryLine(v, r, f, ui) {
    return `${f.int(v.members)} ${ui.membersShort} · ${ui.profitShort} ${f.eur(r.profit)}${ui.perMonth}`;
  }

  function report(v, r, ctx) {
    const { t, f, common, contact } = ctx;
    const neg = (x) => typeof x === "number" && x < 0;
    const modelName = (m) => (m === "247" ? t.model247 : t.modelConv);
    const sc = { [r.current.model]: r.current, [r.alternative.model]: r.alternative };
    const cell = (x, fmt) => ({ text: fmt(x), negative: neg(x) });
    return {
      ...common,
      title: t.title, subtitle: t.subtitle, keywords: t.keywords,
      project: v.project ? t.projectLine.replace("{name}", v.project) : "",
      summary: [
        { label: t.grossMonthly, value: f.eur(r.gross), strong: true },
        { label: t.grossAnnual, value: f.eur(r.grossAnnual), strong: true },
        { label: t.profitMonthly, value: f.eur(r.profit), negative: neg(r.profit) },
        { label: t.profitAnnual, value: f.eur(r.profitAnnual), negative: neg(r.profitAnnual) },
        { label: t.area, value: `${f.int(v.area)} m²` },
        { label: t.modelLabel, value: modelName(v.model) },
        { label: t.members, value: f.int(v.members) },
        { label: t.price, value: f.eur2(v.price), note: t.ivaIncl },
      ],
      blocks: [
        { heading: t.hSummary, rows: [
          { label: t.vat, value: f.eur(r.vat) },
          { label: t.netMonthly, value: f.eur(r.net) },
          { label: t.netAnnual, value: f.eur(r.netAnnual) },
          { label: t.expensesMonthly, value: f.eur(r.expenses) },
          { label: t.margin, value: f.pct(r.margin), negative: neg(r.margin) },
        ] },
        { pageBreak: true, heading: t.hInputs, rows: [
          { label: t.capacity, value: f.int(v.capacity) },
          { label: t.visits, value: f.num1(v.visits) },
          { label: t.duration, value: `${f.int(v.duration)} min` },
          { label: t.hours, value: `${f.num1(r.hours)} h` },
          { label: t.iva, value: f.pct(v.iva / 100) },
        ] },
        { heading: t.hExpenses, rows: [
          { label: t.staff, value: f.eur(r.staffCost) },
          { label: t.rent, value: f.eur(r.rentCost) },
          { label: t.utilities, value: f.eur(r.utilitiesCost) },
          { label: t.cleaning, value: f.eur(r.cleaningCost) },
          { label: t.maintenance, value: f.eur(r.maintenanceCost) },
          { label: t.security, value: f.eur(r.securityCost) },
          { label: t.insurance, value: f.eur(r.insuranceCost) },
          { label: t.expensesMonthly, value: f.eur(r.expenses), strong: true },
        ] },
        { heading: t.hChart, chart: { items: [
          { label: t.netMonthly, value: r.net, display: f.eur(r.net), tone: "ink" },
          { label: t.staff, value: r.staffCost, display: f.eur(r.staffCost) },
          { label: t.rent, value: r.rentCost, display: f.eur(r.rentCost) },
          { label: t.utilities, value: r.utilitiesCost, display: f.eur(r.utilitiesCost) },
          { label: t.cleaning, value: r.cleaningCost, display: f.eur(r.cleaningCost) },
          { label: t.maintenance, value: r.maintenanceCost, display: f.eur(r.maintenanceCost) },
          { label: t.security, value: r.securityCost, display: f.eur(r.securityCost) },
          { label: t.insurance, value: r.insuranceCost, display: f.eur(r.insuranceCost) },
          { label: t.profitMonthly, value: r.profit, display: f.eur(r.profit), tone: r.profit < 0 ? "neg" : "pos" },
        ] } },
        { heading: t.hOperation, rows: [
          { label: t.revenuePerM2, value: f.eurm2(r.revenuePerM2), note: t.perMonthNote, negative: false },
          { label: t.profitPerM2, value: f.eurm2(r.profitPerM2), note: t.perMonthNote, negative: neg(r.profitPerM2) },
          { label: t.capacity, value: f.int(r.capacity) },
          { label: t.visitsDay, value: f.int(r.visitsDay) },
          { label: t.peak, value: f.int(r.peak), note: r.peakShare == null ? "" : t.ofCapacity.replace("{p}", f.pct(r.peakShare)) },
          { label: t.breakEven, value: r.breakEven == null ? t.notAvailable : f.int(r.breakEven), strong: true },
        ] },
        ...(r.overCapacity ? [{ note: t.overCapacityNote }] : []),
        { heading: t.hCompare, intro: t.compareIntro, compare: {
          columns: [t.compareItem, t.model247, t.modelConv],
          rows: [
            [t.hours, `${f.num1(sc["247"].hours)} h`, `${f.num1(sc.conv.hours)} h`],
            [t.staff, f.eur(sc["247"].staff), f.eur(sc.conv.staff)],
            [t.security, f.eur(sc["247"].security), f.eur(sc.conv.security)],
            [t.expensesMonthly, f.eur(sc["247"].expenses), f.eur(sc.conv.expenses)],
            [t.profitMonthly, cell(sc["247"].profit, f.eur), cell(sc.conv.profit, f.eur)],
            [t.peak, f.int(sc["247"].peak), f.int(sc.conv.peak)],
            [t.breakEven, sc["247"].breakEven == null ? t.notAvailable : f.int(sc["247"].breakEven), sc.conv.breakEven == null ? t.notAvailable : f.int(sc.conv.breakEven)],
          ] } },
        { heading: t.hMethod, paragraphs: t.method },
        { note: t.disclaimer },
        { cta: { heading: t.ctaHeading, lines: t.ctaLines, button: { label: t.ctaButton, url: contact.whatsapp },
          links: [{ label: "3dna.es", url: "https://3dna.es/" }, { label: contact.email, url: `mailto:${contact.email}` }, { label: t.calcLink, url: ctx.shareUrl }] } },
      ],
      footer: { ...common.footer, left: t.footerLeft || common.footer.left },
    };
  }

  const model = { id: "fitness", fileStem: "Rentabilidad-Gimnasio", fields: FIELDS, defaults: DEFAULTS, compute, report, summaryLine, PEAK };
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  else {
    root.FitnessCalc = model;
    const run = () => { const box = document.querySelector('[data-calc="fitness"]'); if (box && root.CalcTools) root.CalcTools.mount(box, model); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
    else run();
  }
})(typeof window !== "undefined" ? window : this);
