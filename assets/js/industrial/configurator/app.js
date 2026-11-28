/*
 * 3DNA Plant Configurator — simplified, isometric "building-block" view of production scale.
 *   mountPlantConfigurator(root)
 * Quantities and parameters come from the existing configuration engine (../builder/model.js → configure),
 * run with the "standard units" strategy so every unit keeps one physical size: more capacity = more objects.
 * This module only draws: one object per unit, zones in process order, quantity labels, process lines,
 * appear / disappear animations and a side-by-side comparison. It does not use the detailed digital-twin engine.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { configure, DISCLOSURE } from "../builder/model.js?v=fb1";

const PRESETS = [5, 12.5, 25, 50, 100];
const RANGE = [2, 120];
const GAP = 14, CELL_GAP = 3.2;
const ZONES = [
  { id: "grain", name: "Grain storage", color: 0xe3b341, parts: [["silos", "silo"], ["receiving", "intake"]] },
  { id: "milling", name: "Milling", color: 0xdc8f3a, parts: [["milling", "mill"]] },
  { id: "mash", name: "Mash preparation", color: 0xe67437, parts: [["mash", "mash"], ["liq", "liq"]] },
  { id: "ferm", name: "Fermentation", color: 0x9b6ee8, parts: [["ferm", "fermenter"]] },
  { id: "dist", name: "Distillation", color: 0x4f86e8, parts: [["dist", "train"]] },
  { id: "dehy", name: "Dehydration", color: 0x22a6c4, parts: [["dehy", "sieve"]] },
  { id: "co", name: "Co-products", color: 0xa97743, parts: [["cent", "centrifuge"], ["wdg", "bunker"]] },
  { id: "store", name: "Ethanol storage", color: 0x2bb5cf, parts: [["store", "tank"], ["loading", "bay"]] },
  { id: "util", name: "Utilities", color: 0x8b95a5, row: 1, parts: [["steam", "boiler"], ["cooling", "cell"], ["power", "transformer"], ["water", "ro"], ["wells", "well"], ["ww", "clarifier"]] }
];
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (v, d = 0) => (v == null || !isFinite(v) ? "—" : v.toLocaleString("en-CA", { minimumFractionDigits: d, maximumFractionDigits: d }));
const ease = (k) => 1 - Math.pow(1 - k, 3);
const backOut = (k) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

// ---------------------------------------------------------------- simplified equipment (metres, physical scale)
const MAT = {
  white: new THREE.MeshStandardMaterial({ color: 0xf4f5f7, roughness: 0.55, metalness: 0.05 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.35, metalness: 0.35 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x5b6472, roughness: 0.6 }),
  roof: new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.45, metalness: 0.2 }),
  water: new THREE.MeshStandardMaterial({ color: 0x8fc7d9, roughness: 0.2, metalness: 0.1 }),
  cake: new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.9 }),
  pipe: new THREE.MeshStandardMaterial({ color: 0x9aa3ae, roughness: 0.4, metalness: 0.4 })
};
const accentMat = new Map();
const accent = (c) => { if (!accentMat.has(c)) accentMat.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })); return accentMat.get(c); };
const cyl = (r, h, mat, seg = 28) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.position.y = h / 2; return m; };
const box = (w, h, d, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.y = h / 2; return m; };
function build(kind, cap, color) {
  const g = new THREE.Group(), A = accent(color);
  const add = (m, x = 0, y = null, z = 0) => { m.position.x = x; if (y != null) m.position.y = y; m.position.z = z; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  let w, d;
  switch (kind) {
    case "silo": { const V = cap / 0.75, r = Math.cbrt(V / (2.2 * Math.PI)), h = 2.2 * r; add(cyl(r, h, MAT.steel)); add(new THREE.Mesh(new THREE.ConeGeometry(r * 1.03, r * 0.55, 28), MAT.roof), 0, h + r * 0.27); add(cyl(r * 1.01, 0.5, A), 0, h * 0.62); w = d = 2 * r; break; }
    case "intake": add(box(14, 6, 8, MAT.white)); add(box(14.2, 0.5, 8.2, A), 0, 6.1); add(box(1.4, 14, 1.4, MAT.dark), 6, null, -3); w = 14; d = 8; break;
    case "mill": add(box(8, 7, 6, MAT.white)); add(box(8.2, 0.4, 6.2, A), 0, 7.1); add(cyl(0.9, 4, MAT.steel), 2.6, 7.2, 1.4); w = 8; d = 6; break;
    case "mash": { const r = Math.cbrt(cap / 2 / Math.PI) * 1.2; add(cyl(r, r * 1.4, MAT.steel)); add(cyl(r * 1.02, 0.35, A), 0, r * 1.4); w = d = 2 * r; break; }
    case "liq": { const r = Math.cbrt(cap / (1.3 * Math.PI)), h = 1.3 * r; add(cyl(r, h, MAT.steel)); add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.roof), 0, h); add(cyl(r * 1.02, 0.35, A), 0, h * 0.5); w = d = 2 * r; break; }
    case "fermenter": { const r = Math.cbrt(cap / (1.6 * Math.PI)), h = 1.6 * r, lift = 2.2; add(cyl(r, h, MAT.white), 0, lift + h / 2); add(new THREE.Mesh(new THREE.ConeGeometry(r, r * 0.6, 28), MAT.white), 0, lift - r * 0.3 + 0.01).rotation.x = Math.PI; add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.roof), 0, lift + h); for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + Math.PI / 4; add(cyl(0.18, lift + 0.6, MAT.dark, 8), Math.cos(t) * r * 0.85, (lift + 0.6) / 2, Math.sin(t) * r * 0.85); } add(cyl(r * 1.02, 0.45, A), 0, lift + h * 0.7); w = d = 2 * r; break; }
    case "train": { const k = Math.sqrt(cap / 20); add(cyl(0.95 * k, 18, MAT.steel, 18), -1.6, 9); add(cyl(0.8 * k, 21, MAT.steel, 18), 1.6, 10.5); add(box(7, 0.4, 4.5, A), 0, 6); add(box(7, 0.4, 4.5, A), 0, 12); add(box(0.25, 12, 0.25, MAT.dark), -3.4, 6, -2.1); add(box(0.25, 12, 0.25, MAT.dark), 3.4, 6, 2.1); w = 7; d = 4.6; break; }
    case "sieve": { const r = 0.9 * Math.pow(cap / 2200, 0.25); for (let i = 0; i < 4; i++) { add(cyl(r, 6, MAT.white, 18), (i % 2) * 2.6 - 1.3, 3 + 1, Math.floor(i / 2) * 2.6 - 1.3); } add(box(5.2, 1, 5.2, A), 0, 0.5); w = d = 5.2; break; }
    case "centrifuge": { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 3, 6, 14), MAT.steel); m.rotation.z = Math.PI / 2; add(m, 0, 1.6); add(box(4.6, 0.8, 1.8, A), 0, 0.4); w = 4.6; d = 1.8; break; }
    case "bunker": { const W = cap > 300 ? 24 : 18; add(box(W, 2.6, 10, MAT.white)); add(box(W - 1.5, 0.4, 8.5, MAT.cake), 0, 2.2); w = W; d = 10; break; }
    case "tank": { const r = Math.cbrt(cap / Math.PI), h = r * 1.0; add(cyl(r, h, MAT.white)); add(new THREE.Mesh(new THREE.ConeGeometry(r * 1.02, r * 0.22, 30), MAT.roof), 0, h + r * 0.11); add(cyl(r * 1.01, 0.5, A), 0, h * 0.75); w = d = 2 * r; break; }
    case "bay": add(box(12, 0.4, 16, A), 0, 6.2); for (const [x, z] of [[-5.6, -7.6], [5.6, -7.6], [-5.6, 7.6], [5.6, 7.6]]) add(box(0.4, 6, 0.4, MAT.dark), x, 3, z); add(box(2.6, 3.2, 10, MAT.steel), 0, 1.6); w = 12; d = 16; break;
    case "boiler": { const s = Math.sqrt(cap / 5); add(box(7 * s, 6, 9, MAT.white)); add(box(7 * s + 0.2, 0.4, 9.2, A), 0, 6.1); add(cyl(0.6, 14, MAT.dark, 12), 2 * s, 7, 3); w = 7 * s; d = 9; break; }
    case "cell": { const s = Math.sqrt(cap / 1.5); add(box(7 * s, 5, 7 * s, MAT.white)); add(cyl(2.6 * s, 0.7, A), 0, 5.2); w = d = 7 * s; break; }
    case "transformer": { const s = Math.sqrt(cap / 1000); add(box(3 * s, 3, 2.4 * s, MAT.dark)); for (let i = -1; i <= 1; i++) add(cyl(0.18, 1.2, MAT.white, 8), i * 0.8 * s, 3.6); add(box(3 * s + 0.6, 0.2, 2.4 * s + 0.6, A), 0, 0.1); w = 3 * s + 0.6; d = 2.4 * s + 0.6; break; }
    case "ro": add(box(10, 4, 6, MAT.white)); add(box(10.2, 0.3, 6.2, A), 0, 4.1); w = 10; d = 6; break;
    case "well": add(cyl(0.6, 1.6, MAT.dark, 12)); add(cyl(1.2, 0.2, A, 16)); w = d = 2.4; break;
    case "clarifier": { const r = 7 * Math.sqrt(cap / 15); add(cyl(r, 2.4, MAT.white, 40)); add(cyl(r * 0.94, 0.1, MAT.water, 40), 0, 2.38); add(box(2 * r, 0.3, 0.6, A), 0, 2.6); w = d = 2 * r; break; }
    default: add(box(4, 3, 4, MAT.white)); w = d = 4;
  }
  return { group: g, w, d };
}
const NAMES = { silo: "Grain storage silo", intake: "Truck intake pit", mill: "Hammer mill line", mash: "Slurry / mash system", liq: "Liquefaction tank", fermenter: "Fermenter", train: "Distillation train", sieve: "Molecular-sieve unit", centrifuge: "Decanter centrifuge", bunker: "Wet distillers grain bunker", tank: "Ethanol storage tank", bay: "Tanker loading bay", boiler: "Steam boiler", cell: "Cooling-tower cell", transformer: "Power transformer", ro: "Reverse-osmosis train", well: "Deep well", clarifier: "Wastewater line" };

// ---------------------------------------------------------------- layout of one plant from the engine result
function planPlant(target, prefix) {
  const cfg = configure({ target, period: "year", strategy: "standard" });
  const S = cfg.S, zones = [];
  for (const z of ZONES) {
    const parts = z.parts.map(([sid, kind]) => ({ s: S[sid], kind })).filter((p) => p.s);
    if (!parts.length) continue;
    const groups = parts.map(({ s, kind }) => {
      const probe = build(kind, s.unitCap, z.color); probe.group.traverse((o) => o.geometry && o.geometry.dispose());
      const cw = probe.w + CELL_GAP, cd = probe.d + CELL_GAP, n = s.units;
      const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt((n * cd) / cw * 1.3))));
      return { s, kind, n, cw, cd, cols, rows: Math.ceil(n / cols), w: probe.w, d: probe.d };
    });
    const W = Math.max(...groups.map((g) => g.cols * g.cw)) + 4, D = groups.reduce((a, g) => a + g.rows * g.cd, 0) + 4;
    zones.push({ ...z, groups, W, D, count: groups.reduce((a, g) => a + g.n, 0) });
  }
  // process zones in a row (production sequence), utilities behind them
  const proc = zones.filter((z) => !z.row), util = zones.filter((z) => z.row);
  let x = 0; for (const z of proc) { z.x = x + z.W / 2; z.z = 0; x += z.W + GAP; }
  const procW = x - GAP, procD = Math.max(...proc.map((z) => z.D));
  let ux = 0; for (const z of util) { z.x = ux + z.W / 2; ux += z.W + GAP; }
  for (const z of util) { z.x += (procW - (ux - GAP)) / 2; z.z = procD / 2 + GAP + z.D / 2; }
  for (const z of zones) z.x -= procW / 2;
  const items = [];
  for (const z of zones) {
    let zc = z.z - z.D / 2 + 2;
    for (const g of z.groups) {
      const x0 = z.x - (g.cols * g.cw) / 2 + g.cw / 2;
      for (let i = 0; i < g.n; i++) {
        const c = i % g.cols, r = Math.floor(i / g.cols);
        items.push({ key: `${prefix}:${g.s.type}-${g.s.sizeIndex}-${i}`, zone: z, s: g.s, kind: g.kind, standby: i >= g.s.n, i, x: x0 + c * g.cw, z: zc + r * g.cd + g.cd / 2 });
      }
      zc += g.rows * g.cd;
    }
  }
  const xs = zones.flatMap((z) => [z.x - z.W / 2, z.x + z.W / 2]), zs = zones.flatMap((z) => [z.z - z.D / 2, z.z + z.D / 2]);
  return { target, cfg, zones, items, bounds: { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) }, units: items.length };
}

export function mountPlantConfigurator(root) {
  const $ = (s) => root.querySelector(s);
  const stage = $("[data-pc-stage]"), labelsBox = $("[data-pc-labels]"), info = $("[data-pc-info]");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- scene
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xfbfbfc);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc8ccd3, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 6; sun.shadow.bias = -0.0004; scene.add(sun, sun.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.ShadowMaterial({ opacity: 0.16 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(3000, 300, 0xe4e6ea, 0xeef0f2); grid.position.y = 0.01; scene.add(grid);
  const camera = new THREE.OrthographicCamera(-50, 50, 50, -50, -2000, 4000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.46; controls.minZoom = 0.3; controls.maxZoom = 8; controls.screenSpacePanning = true;
  const ISO = new THREE.Vector3(1, 0.9, 1.15).normalize();
  camera.position.copy(ISO.clone().multiplyScalar(800)); controls.target.set(0, 0, 0); controls.update();
  let fit = { w: 300, d: 200 }, userZoomed = false;
  controls.addEventListener("start", () => { userZoomed = true; });

  // ---------------------------------------------------------------- objects with appear / disappear animation
  const live = new Map();          // key → { group, item, t0, dir, from, to }
  const zoneMeshes = new Map(), lines = new THREE.Group(); scene.add(lines);
  const pickables = [];
  const now = () => performance.now();
  function syncObjects(items) {
    const want = new Set(items.map((i) => i.key)); let k = 0;
    for (const it of items) {
      let o = live.get(it.key);
      if (!o) {
        const b = build(it.kind, it.s.unitCap, it.zone.color);
        b.group.position.set(it.x, 0, it.z); b.group.scale.setScalar(0.001);
        b.group.traverse((m) => { if (m.isMesh) { m.userData.key = it.key; pickables.push(m); } });
        scene.add(b.group);
        o = { group: b.group, t0: now() + (reduce ? 0 : Math.min(900, k++ * 18)), dir: 1, from: new THREE.Vector3(it.x, 0, it.z) };
        live.set(it.key, o);
      } else if (o.dir < 0) { o.dir = 1; o.t0 = now(); }
      o.item = it; o.from = o.group.position.clone(); o.to = new THREE.Vector3(it.x, 0, it.z); o.tMove = now();
      o.group.children.forEach((m) => { if (m.material && m.material.emissive) m.material.emissive?.setHex?.(0); });
      o.standby = it.standby;
    }
    for (const [key, o] of live) if (!want.has(key) && o.dir > 0) { o.dir = -1; o.t0 = now(); }
  }
  function syncZones(plants) {
    const want = new Set();
    for (const p of plants) for (const z of p.zones) {
      const key = `${p.prefix}:${z.id}`; want.add(key);
      let m = zoneMeshes.get(key);
      if (!m) { m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 1), new THREE.MeshStandardMaterial({ color: new THREE.Color(z.color).lerp(new THREE.Color(0xffffff), 0.78), roughness: 0.9 })); m.receiveShadow = true; m.position.set(z.x, 0.15, z.z); m.scale.set(0.01, 1, 0.01); scene.add(m); zoneMeshes.set(key, m); }
      m.userData.to = { x: z.x, z: z.z, w: z.W, d: z.D }; m.userData.dead = false;
    }
    for (const [key, m] of zoneMeshes) if (!want.has(key)) { m.userData.to = { ...m.userData.to, w: 0.01, d: 0.01 }; m.userData.dead = true; }
  }
  function syncLines(plants) {
    lines.children.forEach((c) => c.geometry.dispose()); lines.clear();
    for (const p of plants) {
      const proc = p.zones.filter((z) => !z.row);
      for (let i = 1; i < proc.length; i++) {
        const a = proc[i - 1], b = proc[i], y = 1.1, z = Math.min(a.z + a.D / 2, b.z + b.D / 2) + 3.5 + (p.prefix === "B" ? 0 : 0);
        const pts = [new THREE.Vector3(a.x, y, a.z + a.D / 2 - 1), new THREE.Vector3(a.x, y, z), new THREE.Vector3(b.x, y, z), new THREE.Vector3(b.x, y, b.z + b.D / 2 - 1)];
        const curve = new THREE.CurvePath(); for (let k = 1; k < pts.length; k++) curve.add(new THREE.LineCurve3(pts[k - 1], pts[k]));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.45, 8, false), accent(a.color)); tube.castShadow = true; lines.add(tube);
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 12), accent(a.color)); arrow.rotation.z = -Math.PI / 2; arrow.position.set((a.x + b.x) / 2, y, z); lines.add(arrow);
      }
      const ut = p.zones.find((z) => z.row);
      if (ut) { const pts = [new THREE.Vector3(ut.x, 0.7, ut.z - ut.D / 2), new THREE.Vector3(ut.x, 0.7, ut.z - ut.D / 2 - GAP / 2 + 1.5)]; lines.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(...pts), 4, 0.35, 8), MAT.pipe)); }
    }
  }

  // ---------------------------------------------------------------- labels above zones
  let labelEls = [];
  function syncLabels(plants) {
    labelsBox.innerHTML = ""; labelEls = [];
    for (const p of plants) {
      for (const z of p.zones) {
        const el = document.createElement("div"); el.className = "pc-zl"; el.style.setProperty("--c", "#" + z.color.toString(16).padStart(6, "0"));
        const detail = z.groups.map((g) => `${g.n} × ${NAMES[g.kind].toLowerCase()}`).join(" · ");
        el.innerHTML = `<b>${z.count}</b><span>${esc(z.name)}</span>`; el.title = detail;
        labelsBox.appendChild(el); labelEls.push({ el, pos: new THREE.Vector3(z.x, 0, z.z - z.D / 2), z });
      }
      if (plants.length > 1) { const el = document.createElement("div"); el.className = "pc-pl"; el.textContent = `${p.prefix} · ${num(p.target, p.target % 1 ? 1 : 0)} M L/year`; labelsBox.appendChild(el); labelEls.push({ el, pos: new THREE.Vector3(p.bounds.x0, 0, (p.bounds.z0 + p.bounds.z1) / 2), plant: true }); }
    }
  }

  // ---------------------------------------------------------------- state and UI
  let compare = false, A = 12.5, B = 50, plants = [];
  function plan() {
    const pa = planPlant(A, "A"); pa.prefix = "A";
    plants = [pa];
    if (compare) {
      const pb = planPlant(B, "B"); pb.prefix = "B";
      const dz = (pa.bounds.z1 - pb.bounds.z0) + 46;
      for (const z of pb.zones) z.z += dz; for (const it of pb.items) it.z += dz; pb.bounds.z0 += dz; pb.bounds.z1 += dz;
      // centre both plants together
      const zmid = (pa.bounds.z0 + pb.bounds.z1) / 2;
      for (const p of [pa, pb]) { for (const z of p.zones) z.z -= zmid; for (const it of p.items) it.z -= zmid; p.bounds.z0 -= zmid; p.bounds.z1 -= zmid; }
      plants.push(pb);
    }
    syncObjects(plants.flatMap((p) => p.items)); syncZones(plants); syncLines(plants); syncLabels(plants);
    const x0 = Math.min(...plants.map((p) => p.bounds.x0)), x1 = Math.max(...plants.map((p) => p.bounds.x1)), z0 = Math.min(...plants.map((p) => p.bounds.z0)), z1 = Math.max(...plants.map((p) => p.bounds.z1));
    fit = { w: x1 - x0 + 40, d: z1 - z0 + 40, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
    const S = Math.max(fit.w, fit.d) * 0.8; sun.position.set(fit.cx + S * 0.5, S * 1.2, fit.cz + S * 0.7); sun.target.position.set(fit.cx, 0, fit.cz);
    Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: S * 4 }); sun.shadow.camera.updateProjectionMatrix();
    if (!userZoomed) frameAll();
    summary();
  }
  let camFrom = null; const REF = {};
  function frameAll(animate = true) {
    const w = stage.clientWidth || 800, h = stage.clientHeight || 600, aspect = w / h;
    // projected footprint of the plant bounds in the isometric view
    const ext = (fit.w * 0.8 + fit.d * 0.62), full = Math.max(ext / aspect, (fit.w * 0.35 + fit.d * 0.55)) * 1.05;
    if (!REF.h) { const r = planPlant(12.5, "R"), rw = r.bounds.x1 - r.bounds.x0 + 40, rd = r.bounds.z1 - r.bounds.z0 + 40; REF.ext = rw * 0.8 + rd * 0.62; REF.h = Math.max(REF.ext / aspect, rw * 0.35 + rd * 0.55) * 1.05; }
    const viewH = Math.min(full, REF.h * Math.pow(Math.max(0.2, ext / REF.ext), 0.12)) * (aspect < 1 ? 0.62 : 1);
    const to = { zoom: 1, top: viewH / 2, target: new THREE.Vector3(fit.cx, 0, fit.cz) };
    camFrom = { t0: now(), from: { top: camera.top, target: controls.target.clone() }, to, dur: animate && !reduce ? 700 : 0 };
  }
  function applyFrustum(top) { const w = stage.clientWidth || 800, h = stage.clientHeight || 600, a = w / h; camera.top = top; camera.bottom = -top; camera.left = -top * a; camera.right = top * a; camera.updateProjectionMatrix(); }

  function summary() {
    const rows = plants.map((p) => { const c = p.cfg; return { p, L: c.flows.Ly, day: c.flows.dayL, grain: c.flows.grainTd, units: p.units, W: p.bounds.x1 - p.bounds.x0, D: p.bounds.z1 - p.bounds.z0, ferm: c.S.ferm.units, silos: c.S.silos.units, tanks: c.S.store.units, bott: c.bottleneck.category }; });
    $("[data-pc-summary]").innerHTML = rows.map((r) => `<div class="pc-sum">${plants.length > 1 ? `<p class="pc-sum__h">${r.p.prefix}</p>` : ""}<div><b data-pc-units="${r.p.prefix}">${num(r.units)}</b><span>equipment units</span><small>${r.silos} silos · ${r.ferm} fermenters · ${r.tanks} tanks</small></div></div>`).join("");
  }

  // ---------------------------------------------------------------- inputs
  const slider = $("[data-pc-slider]"), out = $("[data-pc-value]"), sliderB = $("[data-pc-slider-b]"), outB = $("[data-pc-value-b]");
  const toPos = (v) => (Math.log(v) - Math.log(RANGE[0])) / (Math.log(RANGE[1]) - Math.log(RANGE[0])) * 1000;      // logarithmic slider
  const fromPos = (p) => { const v = Math.exp(Math.log(RANGE[0]) + (p / 1000) * (Math.log(RANGE[1]) - Math.log(RANGE[0]))); return v < 20 ? Math.round(v * 2) / 2 : Math.round(v); };
  const presetHtml = (which) => PRESETS.map((v) => `<button type="button" data-pc-preset="${v}" data-pc-which="${which}">${v === 12.5 ? "12.5" : v} M</button>`).join("");
  $("[data-pc-presets]").innerHTML = presetHtml("A"); $("[data-pc-presets-b]").innerHTML = presetHtml("B");
  root.querySelectorAll("[data-pc-preset]").forEach((b) => { b.style.left = `${toPos(+b.dataset.pcPreset) / 10}%`; });
  const showVals = () => {
    out.textContent = `${num(A, A % 1 ? 1 : 0)} million litres`; outB.textContent = `${num(B, B % 1 ? 1 : 0)} million litres`;
    slider.value = toPos(A); sliderB.value = toPos(B); slider.style.setProperty("--p", `${toPos(A) / 10}%`); sliderB.style.setProperty("--p", `${toPos(B) / 10}%`);
    root.querySelectorAll("[data-pc-preset]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.pcPreset === (b.dataset.pcWhich === "B" ? B : A))));
    slider.setAttribute("aria-valuetext", out.textContent); sliderB.setAttribute("aria-valuetext", outB.textContent);
  };
  let pending = 0; const replan = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(() => { userZoomed = false; plan(); }); };
  slider.addEventListener("input", () => { A = fromPos(+slider.value); showVals(); replan(); });
  sliderB.addEventListener("input", () => { B = fromPos(+sliderB.value); showVals(); replan(); });
  root.addEventListener("click", (e) => {
    const p = e.target.closest("[data-pc-preset]");
    if (p) { if (p.dataset.pcWhich === "B") B = +p.dataset.pcPreset; else A = +p.dataset.pcPreset; showVals(); replan(); return; }
    if (e.target.closest("[data-pc-compare]")) { compare = !compare; root.classList.toggle("is-compare", compare); e.target.closest("[data-pc-compare]").setAttribute("aria-pressed", String(compare)); hideInfo(); replan(); return; }
    if (e.target.closest("[data-pc-fit]")) { userZoomed = false; frameAll(); return; }
    if (e.target.closest("[data-pc-info-close]")) { hideInfo(); return; }
  });

  // ---------------------------------------------------------------- picking
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let selected = null, down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; root.classList.add("pc-touched"); });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const r = renderer.domElement.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickables.filter((m) => { const o = live.get(m.userData.key); return o && o.dir > 0; }), false)[0];
    if (hit) showInfo(hit.object.userData.key); else hideInfo();
  });
  renderer.domElement.addEventListener("pointermove", (e) => {
    const r = renderer.domElement.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera); renderer.domElement.style.cursor = ray.intersectObjects(pickables, false).length ? "pointer" : "";
  });
  function showInfo(key) {
    const o = live.get(key); if (!o) return; const it = o.item, s = it.s, z = it.zone;
    if (selected) setHighlight(selected, false); selected = key; setHighlight(key, true);
    info.innerHTML = `<button type="button" class="pc-x" data-pc-info-close aria-label="Close">×</button>
      <p class="pc-i__z"><i style="background:#${z.color.toString(16).padStart(6, "0")}"></i>${esc(z.name)}${plants.length > 1 ? ` · plant ${key[0]}` : ""}</p>
      <h3>${esc(NAMES[it.kind])} ${it.i + 1}${it.standby ? ' <em>standby</em>' : ""}</h3>
      <dl><dt>Unit capacity</dt><dd>${num(s.unitCap, s.unitCap < 10 ? 1 : 0)} ${esc(s.unit)}</dd>
      <dt>Required quantity</dt><dd>${s.n} operating${s.standby ? ` + ${s.standby} standby` : ""}</dd>
      <dt>Utilization</dt><dd>${num(s.util * 100, 0)} %${s.extra && s.extra.autonomy ? ` · ${num(s.extra.autonomy, 1)} days of storage` : ""}</dd>
      <dt>Combined capacity</dt><dd>${num(s.installedCap, s.installedCap < 10 ? 1 : 0)} ${esc(s.unit)}</dd></dl>
      <p class="pc-i__n">Conceptual engineering estimate — unit size and utilization from the 3DNA configuration engine.</p>`;
    root.classList.add("info-open");
  }
  function hideInfo() { if (selected) setHighlight(selected, false); selected = null; root.classList.remove("info-open"); }
  const hl = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x2f6bff, emissiveIntensity: 0.35, roughness: 0.4 });
  function setHighlight(key, on) { const o = live.get(key); if (!o) return; o.group.traverse((m) => { if (!m.isMesh) return; if (on) { m.userData.mat = m.material; m.material = hl; } else if (m.userData.mat) { m.material = m.userData.mat; m.userData.mat = null; } }); }

  // ---------------------------------------------------------------- loop
  const v3 = new THREE.Vector3();
  function resize() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); applyFrustum(camera.top || 100); if (!userZoomed) frameAll(false); }
  new ResizeObserver(resize).observe(stage);
  function tick() {
    const t = now();
    for (const [key, o] of live) {
      const k = Math.max(0, Math.min(1, (t - o.t0) / (reduce ? 1 : (o.dir > 0 ? 700 : 420))));
      const s = o.dir > 0 ? Math.min(1, ease(Math.min(1, k * 1.6))) : 1 - ease(k);
      o.group.scale.set(Math.max(0.001, s), Math.max(0.001, s), Math.max(0.001, s));
      if (o.to) { const m = Math.min(1, (t - (o.tMove || 0)) / (reduce ? 1 : 600)); o.group.position.lerpVectors(o.from, o.to, ease(m)); }
      // appear: drop from above with a small bounce · disappear: sink into the ground
      o.group.position.y = o.dir > 0 ? (reduce ? 0 : 22 * (1 - backOut(k))) : -3 * ease(k);
      if (o.dir < 0 && k >= 1) { scene.remove(o.group); o.group.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); const i = pickables.indexOf(m); if (i >= 0) pickables.splice(i, 1); } }); live.delete(key); if (selected === key) hideInfo(); }
    }
    for (const [key, m] of zoneMeshes) {
      const to = m.userData.to; m.scale.x += (to.w - m.scale.x) * 0.14; m.scale.z += (to.d - m.scale.z) * 0.14; m.position.x += (to.x - m.position.x) * 0.14; m.position.z += (to.z - m.position.z) * 0.14;
      if (m.userData.dead && m.scale.x < 0.05) { scene.remove(m); m.geometry.dispose(); zoneMeshes.delete(key); }
    }
    if (camFrom) {
      const k = camFrom.dur ? Math.min(1, (t - camFrom.t0) / camFrom.dur) : 1, e = ease(k);
      const top = camFrom.from.top + (camFrom.to.top - camFrom.from.top) * e; camera.zoom = 1;
      const tg = camFrom.from.target.clone().lerp(camFrom.to.target, e);
      const off = camera.position.clone().sub(controls.target); controls.target.copy(tg); camera.position.copy(tg).add(off);
      applyFrustum(top); if (k >= 1) camFrom = null;
    }
    controls.update();
    renderer.render(scene, camera);
    // zone labels follow the zones
    const w = stage.clientWidth, h = stage.clientHeight;
    for (const L of labelEls) {
      const m = L.plant ? null : zoneMeshes.get(`${L.z ? plants.find((p) => p.zones.includes(L.z))?.prefix : ""}:${L.z?.id}`);
      v3.copy(L.pos); if (m) { v3.x = m.position.x; v3.z = m.position.z - m.scale.z / 2; }
      v3.y = L.plant ? 0 : 2; v3.project(camera);
      let px = (v3.x * 0.5 + 0.5) * w, py = (-v3.y * 0.5 + 0.5) * h;
      if (L.plant) { const lw = L.el.offsetWidth || 120; px = Math.min(Math.max(px, lw / 2 + 8), w - lw / 2 - 8); }
      L.px = px; L.py = py;
      L.el.style.transform = `translate(-50%, -100%) translate(${px}px, ${py}px)`;
    }
    // labels that would overlap an earlier one collapse to the count badge (the zone colour still identifies them)
    const placed = [];
    for (const L of labelEls) {
      if (L.plant) continue;
      L.el.classList.remove("is-compact");
      const lw = L.el.offsetWidth, lh = L.el.offsetHeight || 30, box = [L.px - lw / 2, L.py - lh, L.px + lw / 2, L.py];
      const hit = placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
      if (hit) { L.el.classList.add("is-compact"); const cw = 34; placed.push([L.px - cw / 2, L.py - lh, L.px + cw / 2, L.py]); } else placed.push(box);
    }
    requestAnimationFrame(tick);
  }
  showVals(); plan(); resize(); frameAll(false); requestAnimationFrame(tick);
  $("[data-pc-disc]").textContent = DISCLOSURE;
  return { get plants() { return plants; }, set: (a, b) => { if (a != null) A = a; if (b != null) B = b; showVals(); plan(); }, toggleCompare: () => $("[data-pc-compare]").click(), get live() { return live.size; }, camera, controls, renderer };
}
