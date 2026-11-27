/*
 * 3DNA Industrial landing — investment overview panels (KPIs, 10-year cumulative chart, payback ring).
 * Pure functions shared by the build (scripts/industrial-finance.mjs pre-renders the Base Case into the page)
 * and the browser (./overview.js re-renders when the visitor changes the scenario or the prices).
 *   r = factory.finance.compute(values) · o = i18n strings (assets/i18n/industrial.json → service.overview)
 */
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const minus = (x) => (x < 0 ? "−" : "");
export const M = (x) => minus(x) + "C$" + Math.abs(x / 1e6).toFixed(1) + " M";
export const P = (x) => minus(x) + Math.abs(x * 100).toFixed(1) + " %";
const tone = (x) => (x > 0 ? "is-good" : x < 0 ? "is-bad" : "");

export const CH = { W: 360, H: 240, L: 54, R: 16, T: 18, B: 30 };
// chart scale for a result (exported so the browser can map the pointer to a year)
export function scale(r) {
  const { W, H, L, R, T, B } = CH, c = r.cumulative, n = c.length - 1, step = 10e6;
  const y0 = Math.floor(Math.min(0, ...c) / step) * step, y1 = Math.max(step, Math.ceil(Math.max(0, ...c) / step) * step);
  return { n, step, y0, y1, X: (i) => L + ((W - L - R) * i) / n, Y: (v) => T + ((H - T - B) * (y1 - v)) / (y1 - y0) };
}

export function kpisHtml(r, o) {
  const k = o.kpis;
  const kp = [["capex", M(r.capex), ""], ["revenue", M(r.revenue), ""], ["opex", M(r.opex), ""], ["ebitda", M(r.ebitda), tone(r.ebitda)], ["margin", P(r.margin), tone(r.margin)], ["costPerL", "C$" + r.costPerL.toFixed(2) + "/L", ""], ["revEth", M(r.revEth), ""], ["revDg", M(r.revDg), ""], ["ebitdaToCapex", P(r.ebitdaToCapex), tone(r.ebitdaToCapex)]];
  return kp.map(([id, val, cls]) => `<div><dt>${esc(k[id])}</dt><dd${cls ? ` class="${cls}"` : ""}>${val}</dd></div>`).join("");
}

export function chartHtml(r, o) {
  const { W, H, L, R } = CH, { n, step, y0, y1, X, Y } = scale(r), c = r.cumulative, f = (v) => v.toFixed(1);
  let g = "";
  for (let v = y0; v <= y1 + 1; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${f(Y(v))}" y2="${f(Y(v))}" class="${v === 0 ? "z" : ""}"/><text x="${L - 8}" y="${f(Y(v) + 4)}" text-anchor="end">${minus(v)}C$${Math.abs(v / 1e6)} M</text>`;
  for (let i = 0; i <= n; i++) g += `<text x="${f(X(i))}" y="${H - 8}" text-anchor="middle">${i}</text>`;
  const pts = c.map((v, i) => `${f(X(i))},${f(Y(v))}`);
  const area = `M${f(X(0))},${f(Y(0))} L${pts.join(" L")} L${f(X(n))},${f(Y(0))} Z`;
  const pb = r.payback, pbX = pb && pb <= n ? X(pb) : null;
  const dots = c.map((v, i) => `<circle cx="${f(X(i))}" cy="${f(Y(v))}" r="3.2" class="${v < 0 ? "neg" : ""}"/>`).join("");
  const last = c[n], endTag = last >= 0 ? "" : " neg";
  // keep the end tag inside the plot whatever the slope
  const endY = Math.min(Math.max(Y(last) + 2, 34), CH.H - CH.B - 4);
  // payback tag above the zero line, or below it when it would collide with the end tag
  const pbTx = pbX ? Math.min(Math.max(pbX, L + 44), W - R - 44) : 0;
  const pbTy = pbX && Math.abs(pbTx - (X(n) - 62)) < 108 && Math.abs(Y(0) - 22 - endY) < 40 ? Y(0) + 44 : Y(0) - 22;
  return `<svg class="ind-twin__chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.chartTitle)} (${esc(o.chartYears)}): ${esc(o.initial)} ${M(-r.capex)}, ${esc(o.payback)} ${pb ? pb.toFixed(1) + " " + esc(o.years) : esc(o.noPayback)}, ${esc(o.cumulative)} ${M(r.cumEbitda)}">
      <defs><linearGradient id="indTwinG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#22c55e" stop-opacity=".55"/><stop offset="1" stop-color="#22c55e" stop-opacity="0"/></linearGradient><clipPath id="indTwinPos"><rect x="0" y="0" width="${W}" height="${f(Y(0))}"/></clipPath></defs>
      <g class="ax">${g}</g>
      <path d="${area}" fill="url(#indTwinG)" clip-path="url(#indTwinPos)"/>
      <polyline points="${pts.join(" ")}" class="ln${r.ebitda < 0 ? " is-bad" : ""}"/>${dots}
      ${pbX ? `<circle cx="${f(pbX)}" cy="${f(Y(0))}" r="6" class="pb"/><g class="tag" transform="translate(${f(pbTx)},${f(pbTy)})"><rect x="-44" y="-30" width="88" height="34" rx="6"/><text y="-17" text-anchor="middle">${esc(o.payback)}</text><text y="-2" text-anchor="middle" class="b">${pb.toFixed(1)} ${esc(o.years)}</text></g>` : ""}
      <g class="tag neg" transform="translate(${f(X(0) + 66)},${f(Math.max(Y(c[0]) - 10, 34))})"><rect x="-58" y="-30" width="116" height="34" rx="6"/><text y="-17" text-anchor="middle">${esc(o.initial)}</text><text y="-2" text-anchor="middle" class="b">${M(r.capex)}</text></g>
      <g class="tag${endTag}" transform="translate(${f(X(n) - 62)},${f(endY)})"><rect x="-60" y="-30" width="120" height="34" rx="6"/><text y="-17" text-anchor="middle">${esc(o.cumulative)}</text><text y="-2" text-anchor="middle" class="b">${M(r.cumEbitda)}</text></g>
      <g class="hov" hidden><line class="hov__l" y1="${CH.T}" y2="${H - CH.B}"/><circle class="hov__d" r="5.5"/><g class="hov__t"><rect x="-56" y="-38" width="112" height="32" rx="6"/><text class="hov__y" y="-25" text-anchor="middle"></text><text class="hov__v b" y="-11" text-anchor="middle"></text></g></g>
    </svg>`;
}

export const RING = 2 * Math.PI * 70;
export const ringDash = (r) => { const n = r.cumulative.length - 1, q = r.payback ? Math.max(0, Math.min(1, 1 - r.payback / n)) : 0; return `${(RING * Math.max(0.02, q)).toFixed(1)} ${RING.toFixed(1)}`; };

export function payHtml(r, o) {
  const pb = r.payback, n = r.cumulative.length - 1;
  return `<div class="ind-twin__ring${pb && pb <= n ? "" : " is-bad"}"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="70" class="bg"/><circle cx="80" cy="80" r="70" class="fg" stroke-dasharray="${ringDash(r)}"/></svg><p><small>${esc(o.payback)}</small><b>${pb ? (pb < 10 ? pb.toFixed(1) : Math.round(pb)) : "—"}</b><small>${esc(o.years)}</small></p></div>
        <dl class="ind-twin__side"><div><dt>${esc(o.profit)}</dt><dd class="${tone(r.ebitda)}">${M(r.ebitda)}</dd></div><div><dt>${esc(o.operatingMargin)}</dt><dd class="${tone(r.margin)}">${P(r.margin)}</dd></div><div><dt>${esc(o.cum10)}</dt><dd class="${tone(r.cumEbitda)}">${M(r.cumEbitda)}</dd></div></dl>`;
}
