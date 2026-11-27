/*
 * 3DNA Industrial landing — interactive investment overview ([data-ind-fin]).
 * The page ships the Base Case pre-rendered (works without JavaScript). Here the visitor can switch the
 * scenario (the factory's presets), move the ethanol and feed wheat prices, and read any year on the chart.
 * Every figure comes from the same model as the dashboard: factories/ethanol.js → finance.compute().
 */
import { kpisHtml, chartHtml, payHtml, scale, CH, M, esc } from "./overview-view.js?v=ov2";

// background: a slow camera orbit around the plant (loops seamlessly), loaded when the band comes near;
// with reduced motion the still render stays
const poster = document.querySelector("[data-twin-poster]");
if (poster && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const go = () => {
    const vid = document.createElement("video");
    vid.className = "ind-twin__bg ind-twin__vid";
    vid.muted = true; vid.loop = true; vid.playsInline = true; vid.autoplay = true;
    vid.setAttribute("muted", ""); vid.setAttribute("playsinline", ""); vid.setAttribute("aria-hidden", "true");
    vid.poster = poster.currentSrc || poster.src;
    vid.src = "/images/industrial/twin-orbit-720.mp4";
    vid.addEventListener("playing", () => vid.classList.add("is-on"), { once: true });
    poster.after(vid);
    vid.play().catch(() => {});
    // pause while off screen
    new IntersectionObserver((e) => { for (const x of e) x.isIntersecting ? vid.play().catch(() => {}) : vid.pause(); }).observe(vid);
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: "300px" });
    io.observe(poster);
  }
}

const root = document.querySelector("[data-ind-fin]");
if (root) {
  const o = JSON.parse(root.querySelector("[data-fin-i18n]").textContent);
  const { default: factory } = await import("./factories/ethanol.js?v=ind12");
  const F = factory.finance;
  const defs = Object.fromEntries(F.inputs.map((i) => [i.id, i.def]));
  const inp = (id) => F.inputs.find((i) => i.id === id);
  const SL = ["ethanolPrice", "wheatPrice"];
  let preset = "base", v = {}, touched = false;

  const ctl = root.querySelector("[data-fin-ctl]");
  const presetName = (p) => (o.scenarios && o.scenarios[p.id]) || p.name;
  ctl.innerHTML = `<div class="ind-twin__seg" role="group" aria-label="${esc(o.scenarioLabel)}">${F.presets.map((p) => `<button type="button" data-preset="${p.id}" aria-pressed="${p.id === preset}">${esc(presetName(p))}</button>`).join("")}</div>
    ${SL.map((id) => { const d = inp(id); return `<label class="ind-twin__sl"><span>${esc(o.sliders[id])} <output data-out="${id}"></output></span><input type="range" data-sl="${id}" min="${d.min}" max="${d.max}" step="${d.step}"></label>`; }).join("")}
    <button type="button" class="ind-twin__reset" data-reset hidden>${esc(o.reset)}</button>`;
  ctl.hidden = false;

  const fmtIn = (id, x) => (id === "ethanolPrice" ? "C$" + x.toFixed(2) + "/L" : "C$" + Math.round(x) + "/t");
  const $ = (s) => root.querySelector(s);
  let r;
  function render() {
    const p = F.presets.find((x) => x.id === preset) || { v: {} };
    const vals = { ...defs, ...p.v, ...v };
    r = F.compute(vals);
    $("[data-fin-kpis]").innerHTML = kpisHtml(r, o);
    $("[data-fin-chart]").innerHTML = chartHtml(r, o);
    $("[data-fin-pay]").innerHTML = payHtml(r, o);
    $("[data-fin-name]").textContent = presetName(p) + (touched ? " · " + o.adjusted : "");
    for (const b of ctl.querySelectorAll("[data-preset]")) b.setAttribute("aria-pressed", String(b.dataset.preset === preset));
    for (const id of SL) { const el = ctl.querySelector(`[data-sl="${id}"]`); el.value = vals[id]; ctl.querySelector(`[data-out="${id}"]`).textContent = fmtIn(id, vals[id]); }
    ctl.querySelector("[data-reset]").hidden = !touched && preset === "base";
    hookChart();
  }

  ctl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-preset]");
    if (b) { preset = b.dataset.preset; v = {}; touched = false; render(); return; }
    if (e.target.closest("[data-reset]")) { preset = "base"; v = {}; touched = false; render(); }
  });
  ctl.addEventListener("input", (e) => {
    const s = e.target.closest("[data-sl]"); if (!s) return;
    v[s.dataset.sl] = +s.value; touched = true; render();
  });

  // chart read-out: the year under the pointer (mouse or touch)
  function hookChart() {
    const svg = $(".ind-twin__chart"), hov = svg.querySelector(".hov"), sc = scale(r), c = r.cumulative;
    const show = (ev) => {
      const b = svg.getBoundingClientRect(), x = ((ev.clientX - b.left) / b.width) * CH.W;
      const i = Math.max(0, Math.min(sc.n, Math.round(((x - CH.L) / (CH.W - CH.L - CH.R)) * sc.n)));
      const X = sc.X(i), Y = sc.Y(c[i]);
      hov.hidden = false;
      hov.querySelector(".hov__l").setAttribute("x1", X); hov.querySelector(".hov__l").setAttribute("x2", X);
      const d = hov.querySelector(".hov__d"); d.setAttribute("cx", X); d.setAttribute("cy", Y); d.setAttribute("class", "hov__d" + (c[i] < 0 ? " neg" : ""));
      const tx = Math.min(Math.max(X, CH.L + 56), CH.W - CH.R - 56), ty = Math.max(Y, 46);
      hov.querySelector(".hov__t").setAttribute("transform", `translate(${tx},${ty})`);
      hov.querySelector(".hov__y").textContent = `${o.year} ${i}`;
      hov.querySelector(".hov__v").textContent = M(c[i]);
      svg.classList.add("is-hover");
    };
    const hide = () => { hov.hidden = true; svg.classList.remove("is-hover"); };
    svg.addEventListener("pointermove", show);
    svg.addEventListener("pointerdown", show);
    svg.addEventListener("pointerleave", hide);
  }
  render();
}
