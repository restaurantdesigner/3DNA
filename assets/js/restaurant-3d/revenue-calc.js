/*
 * Restaurants page — profitability calculator model (no dependencies).
 *
 * The calculator is its own section (#calculadora) right after the 3D
 * restaurant presentation, which stays as it is. Shared by the build
 * (scripts/business-calc.js renders the section prefilled with these defaults,
 * so the figures read without JavaScript) and the browser
 * (assets/js/shared-calc/calc-tools.js runs inputs, sharing, saving, PDF, print).
 *
 *   customer visits / month   = seats × occupancy % × seat turns per day × days per month
 *   gross sales (IVA incl.)   = visits × average ticket
 *   net sales (excl. IVA)     = gross / (1 + IVA)
 *   operating expenses        = food & beverage % × net + staff + rent + utilities + other
 *   operating profit          = net − operating expenses           (annual = monthly × 12)
 *   break-even net sales      = (staff + rent + utilities + other) / (1 − food & beverage %)
 *
 * Starting values: the 3D example restaurant (48 seats, 25 € ticket, 2.6 turns,
 * 30 days, 20 × 13 m floor) with illustrative occupancy and costs, all editable
 * and labelled as an example. IVA 10 %: hospitality services in Spain.
 * URL: ?m2=260&plazas=48&ticket=25&ocupacion=75&rotaciones=2.6&dias=30&…#calculadora
 */
(function (root) {
  const FIELDS = [
    { key: "area", param: "m2", type: "number", min: 10, max: 20000, decimals: 0 },
    { key: "seats", param: "plazas", type: "number", min: 1, max: 2000, decimals: 0 },
    { key: "check", param: "ticket", type: "number", min: 1, max: 1000, decimals: 2 },
    { key: "occupancy", param: "ocupacion", type: "number", min: 1, max: 100, decimals: 0 },
    { key: "turns", param: "rotaciones", type: "number", min: 0.1, max: 20, decimals: 1 },
    { key: "days", param: "dias", type: "number", min: 1, max: 31, decimals: 0 },
    { key: "fb", param: "mp", type: "number", min: 0, max: 95, decimals: 1 },
    { key: "staff", param: "personal", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "rent", param: "alquiler", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "utilities", param: "suministros", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "other", param: "otros", type: "number", min: 0, max: 5000000, decimals: 0 },
    { key: "iva", param: "iva", type: "number", min: 0, max: 30, decimals: 1 },
    { key: "project", param: "proyecto", type: "text", max: 80 },
  ];
  const DEFAULTS = {
    area: 260, seats: 48, check: 25, occupancy: 75, turns: 2.6, days: 30,
    fb: 30, staff: 22000, rent: 6500, utilities: 2500, other: 3000, iva: 10, project: "",
  };
  const ANCHOR = "calculadora";

  function compute(v) {
    const visits = v.seats * (v.occupancy / 100) * v.turns * v.days;
    const gross = visits * v.check;
    const net = gross / (1 + v.iva / 100);
    const fbCost = net * v.fb / 100;
    const fixed = v.staff + v.rent + v.utilities + v.other;
    const expenses = fbCost + fixed;
    const profit = net - expenses;
    const contribution = 1 - v.fb / 100;
    const breakEvenNet = contribution > 0 ? fixed / contribution : null;
    const breakEvenGross = breakEvenNet == null ? null : breakEvenNet * (1 + v.iva / 100);
    const fullVisits = v.seats * v.turns * v.days;          // every seat, every turn
    return {
      visits, visitsDay: visits / v.days,
      gross, grossAnnual: gross * 12,
      vat: gross - net, net, netAnnual: net * 12,
      fbCost, staffCost: v.staff, rentCost: v.rent, utilitiesCost: v.utilities, otherCost: v.other,
      fixed, expenses, expensesAnnual: expenses * 12,
      profit, profitAnnual: profit * 12,
      margin: net > 0 ? profit / net : null,
      grossPerM2: v.area > 0 ? gross / v.area : null,
      netPerM2: v.area > 0 ? net / v.area : null,
      breakEvenNet, breakEvenGross,
      breakEvenVisitsDay: breakEvenGross != null && v.check > 0 && v.days > 0 ? breakEvenGross / v.check / v.days : null,
      breakEvenOccupancy: breakEvenGross != null && v.check > 0 && fullVisits > 0 ? breakEvenGross / v.check / fullVisits : null,
      loss: profit < 0,
    };
  }

  function summaryLine(v, r, f, ui) {
    return `${f.eur(r.gross)}${ui.perMonth} · ${ui.profitShort} ${f.eur(r.profit)}`;
  }

  // report content (strings: restaurantsPage.calc.report + calcCommon.report)
  function report(v, r, ctx) {
    const { t, f, common, contact } = ctx;
    const neg = (x) => typeof x === "number" && x < 0;
    const pct = (x) => f.pct(x / 100);
    return {
      ...common,
      title: t.title, subtitle: t.subtitle, keywords: t.keywords,
      project: v.project ? t.projectLine.replace("{name}", v.project) : "",
      summary: [
        { label: t.grossMonthly, value: f.eur(r.gross), strong: true },
        { label: t.grossAnnual, value: f.eur(r.grossAnnual), strong: true },
        { label: t.profitMonthly, value: f.eur(r.profit), negative: neg(r.profit) },
        { label: t.profitAnnual, value: f.eur(r.profitAnnual), negative: neg(r.profitAnnual) },
      ],
      blocks: [
        { heading: t.hResults, rows: [
          { label: t.grossMonthly, value: f.eur(r.gross), strong: true },
          { label: t.vat, value: f.eur(r.vat) },
          { label: t.netMonthly, value: f.eur(r.net) },
          { label: t.netAnnual, value: f.eur(r.netAnnual) },
          { label: t.expensesMonthly, value: f.eur(r.expenses) },
          { label: t.profitMonthly, value: f.eur(r.profit), strong: true, negative: neg(r.profit) },
          { label: t.profitAnnual, value: f.eur(r.profitAnnual), strong: true, negative: neg(r.profitAnnual) },
          { label: t.margin, value: f.pct(r.margin), negative: neg(r.margin) },
        ] },
        { heading: t.hProject, rows: [
          { label: t.area, value: `${f.int(v.area)} m²` },
          { label: t.seats, value: f.int(v.seats) },
          { label: t.check, value: f.eur2(v.check), note: t.ivaIncl },
          { label: t.occupancy, value: pct(v.occupancy) },
          { label: t.turns, value: f.num1(v.turns) },
          { label: t.days, value: f.int(v.days) },
          { label: t.iva, value: pct(v.iva) },
        ] },
        { heading: t.hExpenses, intro: t.expensesIntro, rows: [
          { label: t.fb, value: f.eur(r.fbCost), note: t.ofNet.replace("{p}", pct(v.fb)) },
          { label: t.staff, value: f.eur(r.staffCost) },
          { label: t.rent, value: f.eur(r.rentCost) },
          { label: t.utilities, value: f.eur(r.utilitiesCost) },
          { label: t.other, value: f.eur(r.otherCost) },
          { label: t.expensesMonthly, value: f.eur(r.expenses), strong: true },
        ] },
        { heading: t.hChart, chart: { items: [
          { label: t.netMonthly, value: r.net, display: f.eur(r.net), tone: "ink" },
          { label: t.fb, value: r.fbCost, display: f.eur(r.fbCost) },
          { label: t.staff, value: r.staffCost, display: f.eur(r.staffCost) },
          { label: t.rent, value: r.rentCost, display: f.eur(r.rentCost) },
          { label: t.utilities, value: r.utilitiesCost, display: f.eur(r.utilitiesCost) },
          { label: t.other, value: r.otherCost, display: f.eur(r.otherCost) },
          { label: t.profitMonthly, value: r.profit, display: f.eur(r.profit), tone: r.profit < 0 ? "neg" : "pos" },
        ] } },
        { heading: t.hOperation, rows: [
          { label: t.visits, value: f.int(r.visits), note: t.perMonthNote },
          { label: t.visitsDay, value: f.int(r.visitsDay) },
          { label: t.grossPerM2, value: f.eurm2(r.grossPerM2), note: t.perMonthNote },
          { label: t.netPerM2, value: f.eurm2(r.netPerM2), note: t.perMonthNote },
          { label: t.breakEven, value: r.breakEvenNet == null ? t.notAvailable : f.eur(r.breakEvenNet), note: t.perMonthNote, strong: true },
          { label: t.breakEvenVisits, value: r.breakEvenVisitsDay == null ? t.notAvailable : f.int(Math.ceil(r.breakEvenVisitsDay)) },
          { label: t.breakEvenOccupancy, value: r.breakEvenOccupancy == null ? t.notAvailable : f.pct(r.breakEvenOccupancy) },
        ] },
        { pageBreak: true, heading: t.hMethod, paragraphs: t.method },
        { note: t.disclaimer },
        { cta: { heading: t.ctaHeading, lines: t.ctaLines, button: { label: t.ctaButton, url: contact.whatsapp },
          links: [{ label: "3dna.es", url: "https://3dna.es/" }, { label: contact.email, url: `mailto:${contact.email}` }, { label: t.calcLink, url: ctx.shareUrl }] } },
      ],
      footer: { ...common.footer, left: t.footerLeft || common.footer.left },
    };
  }

  const model = { id: "restaurant", fileStem: "Rentabilidad-Restaurante", fields: FIELDS, defaults: DEFAULTS, compute, report, summaryLine, ANCHOR };
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  else {
    root.RestaurantRevenueCalc = model;
    const run = () => { const box = document.querySelector('[data-calc="restaurant"]'); if (box && root.CalcTools) root.CalcTools.mount(box, model); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
    else run();
  }
})(typeof window !== "undefined" ? window : this);
