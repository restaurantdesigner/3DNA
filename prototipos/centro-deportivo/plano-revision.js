// Plan review: draws the PDF sheet and the extracted / completed geometry in metres.
(async () => {
  const NS = "http://www.w3.org/2000/svg";
  const [ex, model] = await Promise.all([
    fetch("plan-extracted.json").then((r) => r.json()),
    fetch("plan-model.json").then((r) => (r.ok ? r.json() : { rooms: [], manualWalls: [], openings: [], notes: [] })).catch(() => ({ rooms: [], manualWalls: [], openings: [], notes: [] })),
  ]);
  const svg = document.getElementById("plan");
  const im = ex.image;
  svg.setAttribute("viewBox", `${im.x} ${im.y} ${im.w} ${im.h}`);
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); (parent || svg).appendChild(e); return e; };
  const layer = (name) => el("g", { "data-layer": name });
  const pts = (arr) => arr.map(([x, y]) => `${x},${y}`).join(" ");

  const bg = el("image", { href: "source_p76_albanileria.png", x: im.x, y: im.y, width: im.w, height: im.h, opacity: 0.55, preserveAspectRatio: "none" });

  const gRooms = layer("rooms");
  const gWalls = layer("walls");
  const gManual = layer("manual");
  const gOpen = layer("openings");
  const gCols = layer("columns");
  const gFurn = layer("furniture");

  ex.walls.forEach((p) => el("polygon", { points: pts(p), fill: "rgba(192,57,43,.55)", stroke: "#c0392b", "stroke-width": 0.012 }, gWalls));
  (model.manualWalls || []).forEach((w) => el("polygon", { points: pts(w.poly), fill: "rgba(181,101,29,.6)", stroke: "#b5651d", "stroke-width": 0.012 }, gManual));
  ex.columns.forEach((c) => el("rect", { x: c.c[0] - c.w / 2, y: c.c[1] - c.d / 2, width: c.w, height: c.d, fill: "#111" }, gCols));
  ex.furniture.forEach((f) => el("polyline", { points: pts(f.p), fill: "none", stroke: f.g ? "#9a9a9a" : "#555", "stroke-width": 0.012 }, gFurn));
  (model.openings || []).forEach((o) => {
    const [a, b] = o.ab;
    el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: o.kind === "window" ? "#2f6fb8" : "#1f8a4c", "stroke-width": o.kind === "window" ? 0.08 : 0.1, "stroke-linecap": "butt", opacity: 0.9 }, gOpen);
  });

  // rooms + area check
  const polyArea = (p) => Math.abs(p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y; }, 0) / 2);
  const tbody = document.querySelector("#areas tbody");
  (model.rooms || []).forEach((r) => {
    el("polygon", { points: pts(r.poly), fill: r.color || "rgba(47,125,115,.18)", stroke: "#2f7d73", "stroke-width": 0.03 }, gRooms);
    const cx = r.label ? r.label[0] : r.poly.reduce((s, q) => s + q[0], 0) / r.poly.length;
    const cy = r.label ? r.label[1] : r.poly.reduce((s, q) => s + q[1], 0) / r.poly.length;
    el("text", { x: cx, y: cy, class: "room-label" }, gRooms).textContent = `${r.n} ${r.name}`;
    const a = polyArea(r.poly);
    el("text", { x: cx, y: cy + 0.38, class: "room-area" }, gRooms).textContent = `${a.toFixed(2)} m² (plano ${r.area.toFixed(2)})`;
    const diff = (a - r.area) / r.area;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.n} ${r.name}</td><td class="n">${r.area.toFixed(2).replace(".", ",")}</td><td class="n">${a.toFixed(2).replace(".", ",")}</td><td class="${Math.abs(diff) < 0.04 ? "ok" : "warn"}">${diff >= 0 ? "+" : ""}${(diff * 100).toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });
  const notes = document.getElementById("notes");
  (model.notes || []).forEach((n) => { const li = document.createElement("li"); li.innerHTML = n; notes.appendChild(li); });

  // controls
  document.querySelectorAll("input[name=src]").forEach((r) => r.addEventListener("change", () => {
    const v = document.querySelector("input[name=src]:checked").value;
    bg.style.display = v === "none" ? "none" : "";
    if (v === "none") return;
    // the 415 px crop, calibrated on the hall walls (0,054 m/px)
    const crop = { x: -0.98, y: -1.064, w: 415 * 0.054, h: 373 * 0.054 };
    const box = v === "crop" ? crop : im;
    ["x", "y"].forEach((k) => bg.setAttribute(k, box[k]));
    bg.setAttribute("width", box.w); bg.setAttribute("height", box.h);
    bg.setAttribute("href", v === "alb" ? "source_p76_albanileria.png" : v === "amu" ? "source_p76_amueblamiento.png" : "source_plan_crop.png");
  }));
  document.getElementById("op").addEventListener("input", (e) => bg.setAttribute("opacity", e.target.value));
  document.querySelectorAll("input[data-layer]").forEach((c) => {
    const g = svg.querySelector(`g[data-layer=${c.dataset.layer}]`);
    const apply = () => { g.style.display = c.checked ? "" : "none"; };
    c.addEventListener("change", apply); apply();
  });
  const ro = document.getElementById("readout");
  svg.addEventListener("pointermove", (e) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    ro.textContent = `x ${q.x.toFixed(2)} m · y ${q.y.toFixed(2)} m`;
  });
})();
