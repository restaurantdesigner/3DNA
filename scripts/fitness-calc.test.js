// Financial consistency tests for the Gym Planner model (assets/js/fitness-calc.js).
// Run: node scripts/fitness-calc.test.js
const M = require("../assets/js/fitness-calc.js");
const tools = require("../assets/js/shared-calc/calc-tools.js");
const T = require("../assets/i18n/translations.json");
const P = M.P;
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; if (fails <= 40) console.error("FAIL", m); } };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const sum = (a, f = (x) => x) => a.reduce((s, x) => s + f(x), 0);
const AREAS = [100, 250, 500, 1000, 2000];
const CONCEPTS = M.ORDER;

// ---- model consistency for every size × concept × building condition × demand (Spain reference baseline) ----
for (const area of AREAS) for (const concept of ["auto", ...CONCEPTS]) for (const condition of ["shell", "commercial", "exgym"]) for (const demand of ["conservative", "base", "optimistic"]) {
  const r = M.compute({ area, concept, condition, demand, hvac: "auto" });
  const a = r._an, inv = a.inv, tag = `${area} m² ${a.input.key} ${condition} ${demand}`;
  ok(a.input.city === M.REFERENCE, `${tag}: reference baseline used`);
  ok(sum(a.plan.zones, (z) => z.m2) === area && a.plan.zones.every((z) => z.m2 >= 0), `${tag}: zones sum to the area`);
  ok(a.ach.base <= a.cap.technicalMembers + 1e-9, `${tag}: achievable ≤ technical capacity`);
  ok(a.ach.range[1] / a.ach.range[0] <= 1.25 + 1e-9, `${tag}: member band ≤ 25 %`);
  ok(a.months.every((m, i) => m.month === i + 1 && (i === 0 || m.members >= a.months[i - 1].members - 1e-9)), `${tag}: months 1…N, members never fall`);
  ok(near(a.steady.members, a.ach.base) && near(a.steady.growth, 0), `${tag}: steady month = mature members`);
  a.months.forEach((m) => {
    const R = m.rev;
    ["membership", "enrolment", "pt", "other"].forEach((k) => ok(near(R.gross[k], R.net[k] * (1 + P.VAT[k])), `${tag} m${m.month}: ${k} VAT`));
    ok(near(R.iva, R.grossTotal - R.netTotal), `${tag} m${m.month}: VAT = gross − net`);
    ok(near(R.gross.membership, m.members * a.fee), `${tag} m${m.month}: membership = members × fee`);
    ok(near(m.ebitda, m.net - m.opex) && near(m.opex, sum(Object.values(m.costs))), `${tag} m${m.month}: EBITDA = net − Σ costs`);
  });
  ok(near(inv.capex, sum(inv.items, (i) => i.total)) && inv.items.every((i) => near(i.total, i.qty * i.unitPrice)), `${tag}: investment = Σ qty × unit price`);
  ok(inv.items.every((i) => P.SOURCES[i.src] && ["tariff", "cype", "official", "assumption"].includes(i.cls)), `${tag}: every line has a source class`);
  ok(inv.low <= inv.capex && inv.capex <= inv.high && inv.withinTarget === (inv.spread <= 1.25 + 1e-9), `${tag}: central inside its band; 25 % goal flagged, not forced`);
  ok(near(r.invCentral, inv.capex) && r.invLow === inv.low && r.invHigh === inv.high, `${tag}: headline = central estimate`);
  const tariff = inv.items.filter((i) => i.cls === "tariff");
  ok(near(sum(tariff, (i) => i.total), sum(a.eq.lines.filter((l) => !l.custom), (l) => l.qty * l.unit)) && tariff.every((i) => /p\. \d+/.test(i.ref)), `${tag}: tariff equipment priced and referenced`);
  ok(inv.items.filter((i) => i.key.startsWith("eq:") && M.ITEMS[i.key.slice(3)].custom).every((i) => i.cls === "assumption"), `${tag}: non-tariff equipment = assumption`);
  if (a.breakEven != null) {
    const b = M.analyze({ ...a.input, concept: a.input.key, _forceMature: a.breakEven });
    ok(b.steady.ebitda >= -1e-6 && b.steady.ebitda < a.perMember + 1e-6, `${tag}: EBITDA crosses 0 at break-even`);
  }
  let cum = -a.upfront;
  a.months.forEach((m) => { cum += m.ebitda; ok(near(m.cumulative, cum), `${tag}: cumulative m${m.month}`); });
  if (a.paybackMonth) ok(a.months[a.paybackMonth - 1].cumulative >= 0 && (a.paybackMonth === 1 || a.months[a.paybackMonth - 2].cumulative < 0) && a.months.length === Math.max(24, a.paybackMonth), `${tag}: payback = first non-negative month, projection runs to it`);
  else ok(a.months.length === 120, `${tag}: no payback → 120-month projection`);
  const pb = a.investor.payback;
  ok(pb.operational === a.paybackMonth || (!a.paybackMonth && (!pb.operational || pb.operational > 120)), `${tag}: investor view starts from the same cash flow`);
  ok(pb.project == null || (pb.operational != null && pb.project >= pb.operational), `${tag}: after-tax payback not earlier than operational`);
  ok(a.scenarios.length === 3 && a.scenarios.find((s) => s.demand === demand).a === a, `${tag}: scenarios reuse the same calculation`);
}

// ---- the five reference sizes (defaults, Spain reference baseline): values reported by the test ----
const rows = AREAS.map((area) => { const a = M.compute({ area })._an; return { area, status: a.rank.status, concept: a.input.key, class: a.rank.pick.cls, capex: Math.round(a.inv.capex), low: Math.round(a.inv.low), high: Math.round(a.inv.high), technical: Math.round(a.cap.technicalMembers), members: Math.round(a.ach.base), ebitda: Math.round(a.steady.ebitda), breakEven: a.breakEven, payback: a.paybackMonth, simple: a.simplePaybackYears && +a.simplePaybackYears.toFixed(1) }; });

// ---- every text the page / PDF / print uses exists in all four languages ----
const LOC = { es: "es-ES", en: "en-GB", ru: "ru-RU", uk: "uk-UA" };
for (const lang of ["es", "en", "ru", "uk"]) {
  const t = { ...T.en.calcCommon.report, ...T[lang].calcCommon.report, ...T[lang].fitnessPage.calc.report };
  const f = tools.formatter(LOC[lang]);
  for (const area of [40, ...AREAS, 5000]) for (const concept of ["auto", ...CONCEPTS]) {
    const r = M.compute({ area, concept });
    const txt = JSON.stringify(M.sections(r._an, t, f)) + M.summaryHtml(r._an, t, f, { whatsapp: "#" }) + M.renderHtml(r._an, t, f);
    ok(!/undefined|NaN|Infinity|\{[a-z0-9]+\}|\[object/.test(txt), `${lang} ${area} m² ${concept}: report text complete`);
    const rep = M.report({ area, concept }, r, { t, f, common: { kicker: "", dateLine: "", footer: {} }, contact: { whatsapp: "#", email: "x" }, shareUrl: "#" });
    ok(rep.summary[0].value === f.eur(r.invCentral) && rep.blocks.length > 10, `${lang} ${area} m² ${concept}: PDF headline = central investment`);
  }
  ok(M.TAGS.every((k) => t.tags[k] && t.tagsHelp[k]), `${lang}: tag legend complete`);
}
// ---- recommendation: transparent ordering, never an unsuitable or unprofitable concept ----
for (const area of [40, 60, 80, 100, 150, 250, 350, 500, 750, 1000, 1500, 2000, 3000, 5000]) for (const condition of ["shell", "commercial", "exgym"]) for (const demand of ["conservative", "base", "optimistic"]) for (const hvac of ["auto", "partial"]) {
  const a = M.run({ area, condition, demand, hvac }), rk = a.rank, tag = `rank ${area} m² ${condition} ${demand} ${hvac}`;
  ok(rk.cands.every((x) => ["ideal", "viable"].includes(x.suit)), `${tag}: only concepts that fit the area are ranked`);
  ok(rk.cands.every((x, i) => i === 0 || M.rankCmp(rk.cands[i - 1], x) <= 0), `${tag}: ranking follows the criteria order`);
  ok(rk.cands.every((x) => x.cls === M.paybackClass(x.a)), `${tag}: payback class from the cash-flow payback`);
  if (rk.status === "recommended" || rk.status === "provisional") {
    ok(a.steady.ebitda > 0 && a.paybackMonth != null && a.paybackMonth <= 120, `${tag}: recommended concept has positive EBITDA and pays back within 10 years`);
    ok(rk.pick === rk.cands[0] && ["ideal", "viable"].includes(rk.pick.suit), `${tag}: recommendation = first ranked suitable concept`);
    ok((rk.status === "provisional") === (rk.pick.rel.level === "low"), `${tag}: unverified key prices are labelled provisional`);
    ok(rk.status === "provisional" || !rk.cands.some((x) => x.tier === 0 && M.rankCmp(x, rk.pick) < 0), `${tag}: nothing better ranked`);
  } else {
    ok(rk.status === "notViable" && !rk.cands.some((x) => x.tier <= 1), `${tag}: not viable only when no suitable concept is viable`);
    ok(rk.elsewhere.every((x) => x.tier === 0 && x.a.steady.ebitda > 0 && x.a.paybackMonth <= 120), `${tag}: suggested alternatives are themselves viable`);
  }
  ok(a === rk.pick.a, `${tag}: the plan shows the figures of the selected concept`);
}
// classification thresholds (indicative): ≤ 60 attractive, ≤ 84 moderate, ≤ 120 long, beyond, negative EBITDA
const cls = (e, m) => M.paybackClass({ steady: { ebitda: e }, paybackMonth: m });
ok(cls(1, 60) === "attractive" && cls(1, 61) === "moderate" && cls(1, 84) === "moderate" && cls(1, 85) === "long" && cls(1, 120) === "long" && cls(1, null) === "beyond" && cls(-1, 30) === "notViable" && cls(0, null) === "notViable", "payback classes 5 / 7 / 10 years");
// a chosen concept is shown as chosen (or out of range), never silently replaced
ok(M.run({ area: 500, concept: "pt" }).rank.status === "outOfRange" && M.run({ area: 500, concept: "boutique" }).rank.status === "chosen" && M.run({ area: 500, concept: "boutique" }).input.key === "boutique", "manual concept respected");
// figures of every concept are the model's, whatever is recommended
for (const area of AREAS) M.run({ area }).rank.cands.forEach((x) => { const b = M.analyze({ area, concept: x.k, city: M.REFERENCE, condition: "commercial", demand: "base" }); ok(b.inv.capex === x.a.inv.capex && b.steady.ebitda === x.a.steady.ebitda && b.paybackMonth === x.a.paybackMonth, `${area} m² ${x.k}: ranking does not change the figures`); });

// ---- URL / save round trip of every field ----
const v = { area: 777, concept: "pilates", condition: "exgym", demand: "optimistic", hvac: "partial" };
const back = tools.fromQuery(M, "?" + tools.toQuery(M, v)).values;
ok(JSON.stringify(back) === JSON.stringify(v), "share link restores every input");
ok(!tools.toQuery(M, v).includes("city"), "share links carry no location");
ok(JSON.stringify(tools.fromQuery(M, "?m2=300&v=2").values) === JSON.stringify({ ...M.defaults, area: 300 }), "old links (?m2=…&v=2) still open with defaults");
ok(JSON.stringify(tools.sanitize(M, { area: "x", concept: "spa", city: "paris" })) === JSON.stringify(M.defaults), "invalid inputs fall back to defaults");
ok(!M.fields.some((x) => x.key === "city") && M.fields.filter((x) => x.type === "number").length === 1, "floor area is the only required input; no city field");

// ---- independence from location and language ----
const sig = (a) => JSON.stringify({ k: a.input.key, capex: a.inv.capex, low: a.inv.low, high: a.inv.high, m: a.months.map((x) => x.ebitda), be: a.breakEven, pb: a.paybackMonth, iv: a.investor.payback, cands: a.rank.cands.map((x) => [x.k, x.a.inv.capex, x.a.steady.ebitda]) });
for (const area of AREAS) {
  const ref = sig(M.run({ area }));
  // an old shared link or saved analysis with a city parameter, or any location-like input, changes nothing
  for (const city of Object.keys(P.CITIES).concat(["paris", "kyiv", "toronto"])) {
    ok(sig(M.run({ area, city })) === ref, `${area} m²: result independent of city input "${city}"`);
    ok(sig(M.compute(tools.fromQuery(M, `?m2=${area}&city=${city}&v=3`).values)._an) === ref, `${area} m²: link with city=${city} gives the reference result`);
  }
  // the same calculation feeds every language: numbers in the PDF tiles are identical once formatted alike
  const base = M.compute({ area }), fEn = tools.formatter("en-GB");
  const tiles = ["es", "en", "ru", "uk"].map((lang) => {
    const t = { ...T.en.calcCommon.report, ...T[lang].calcCommon.report, ...T[lang].fitnessPage.calc.report };
    return M.report({ area }, M.compute({ area }), { t, f: fEn, common: { kicker: "", dateLine: "", footer: {} }, contact: { whatsapp: "#", email: "x" }, shareUrl: "#" }).summary.map((x) => x.value).filter((x, i) => i !== 2).join("|");   // tile 3 (payback) contains the translated word "months"
  });
  ok(tiles.every((x) => x === tiles[0]) && tiles[0].startsWith(fEn.eur(base.invCentral)), `${area} m²: PDF figures identical in es / en / ru / uk`);
}
// summary card: no images; hierarchy concept → investment → EBITDA → payback → customer base
{
  const t = { ...T.en.calcCommon.report, ...T.en.fitnessPage.calc.report }, f = tools.formatter("en-GB");
  for (const area of [60, 100, 500, 2000]) {
    const r = M.compute({ area }), h = M.summaryHtml(r._an, t, f, { whatsapp: "#" });
    const pos = [h.indexOf('class="gp-name"'), h.indexOf(f.eur(r.invCentral)), h.indexOf(t.cards.ebitda), h.indexOf(t.cards.payback), h.indexOf(t.cards.members)];
    ok(!/<img|<figure|\.webp|\.jpg|\.png/.test(h), `${area} m²: no images in the summary card`);
    ok(pos.every((x, i) => x > 0 && (i === 0 || x > pos[i - 1])), `${area} m²: summary hierarchy concept → investment → EBITDA → payback → members`);
    const tiles = M.report({ area }, r, { t, f, common: { kicker: "", dateLine: "", footer: {} }, contact: { whatsapp: "#", email: "x" }, shareUrl: "#" }).summary.map((x) => x.label);
    ok(JSON.stringify(tiles) === JSON.stringify([t.cards.investment, t.cards.ebitda, t.cards.payback, t.cards.members]), `${area} m²: PDF tiles in the same order`);
  }
}
// the disclaimer is present in every language, in the card and in the PDF
for (const lang of ["es", "en", "ru", "uk"]) {
  const t = { ...T.en.calcCommon.report, ...T[lang].calcCommon.report, ...T[lang].fitnessPage.calc.report };
  const r = M.compute({ area: 500 }), f = tools.formatter(LOC[lang]);
  ok(t.gp.disclaimer && T[lang].fitnessPage.calc.ui.disclaimer === t.gp.disclaimer, `${lang}: disclaimer translated`);
  const page = require("fs").readFileSync(require("path").join(__dirname, "..", { es: "gimnasios-3d.html", en: "en/fitness/index.html", ru: "ru/fitness/index.html", uk: "uk/fitness/index.html" }[lang]), "utf8");
  {
    const sec = page.slice(page.indexOf('<section class="bcalc bcalc--fitness gp"'), page.indexOf("</section>", page.indexOf('<section class="bcalc bcalc--fitness gp"')));
    const dlg = sec.slice(sec.indexOf("<dialog"), sec.indexOf("</dialog>"));
    ok((dlg.match(/data-gp-sec=/g) || []).length === 8 && (sec.match(/data-gp-sec=/g) || []).length === 8, `${lang}: the eight plan sections are inside the report dialog only`);
    ok(!/<img|<figure|<video/.test(sec), `${lang}: no images in the calculator section`);
    ok(/data-gp-open-report/.test(sec) && (dlg.match(/data-gp-report-close/g) || []).length === 2, `${lang}: open, back and close controls`);
    ok(["pdf", "save", "print", "share-calc", "share-section"].every((k) => sec.includes(`data-ca="${k}"`)) && /data-track="whatsapp_clicked"/.test(sec), `${lang}: PDF, save, print, share and WhatsApp preserved`);
  }
  ok(page.includes(`<p class="gp-ref">${t.gp.disclaimer.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}</p>`) && !page.includes('data-cf="city"'), `${lang}: disclaimer under the input, no city field on the built page`);
  ok(M.report({ area: 500 }, r, { t, f, common: { kicker: "", dateLine: "", footer: {} }, contact: { whatsapp: "#", email: "x" }, shareUrl: "#" }).summaryNote.startsWith(t.gp.disclaimer), `${lang}: disclaimer in the PDF and print`);
  ok(!JSON.stringify(M.sections(r._an, t, f).filter((s) => s.id !== "method")).match(/Granada|Barcelona|Madrid|Málaga|Malaga|Гранад|Барселон|Мадрид|Малаг/), `${lang}: no city named outside the documented reference baseline`);
}

console.table(rows);
console.log(fails ? `${fails} of ${n} checks FAILED` : `all ${n} checks passed`);
process.exitCode = fails ? 1 : 0;
