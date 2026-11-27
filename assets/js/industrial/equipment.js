/*
 * 3DNA Digital Twin — procedural industrial equipment library (Three.js, no external models).
 *
 * Every generator returns a THREE.Group whose geometry is merged per material (a handful of draw
 * calls per item), built in metres, standing on y = 0 at its local origin. Generators are plain
 * functions of their parameters, so any factory configuration (assets/js/industrial/factories/*.js)
 * can place them: { type: "tank", params: { r: 6, h: 14 }, pos: [x, z], rot: 0 }.
 *
 *   tank · silo · column · vessel · exchanger · pump · building · coolingTower · stack · dryer ·
 *   centrifuge · structure (steel frame with grated floors) · pipeRack · canopy · truck · bund ·
 *   conveyor (inclined gallery) · elevator (bucket-elevator tower)
 * plus the parts they share: ladder (with cage), railing, platform, nozzles, valves.
 */
import * as THREE from "three";
import { mergeGeometries } from "/assets/js/shared-3d/archviz.js?v=ind1";

// ------------------------------------------------------------------ materials
export function createMaterials(tex) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  return {
    steel: std({ color: 0xc9ced4, metalness: 0.9, roughness: 0.22 }),
    cladding: std({ color: 0xd8dde3, metalness: 0.6, roughness: 0.38, map: tex.cladding }),
    white: std({ color: 0xeef1f4, metalness: 0.15, roughness: 0.45 }),
    paintBlue: std({ color: 0x23508f, metalness: 0.3, roughness: 0.45 }),
    paintGreen: std({ color: 0x2f6b4f, metalness: 0.3, roughness: 0.5 }),
    paintGrey: std({ color: 0x5c6470, metalness: 0.35, roughness: 0.55 }),
    darkSteel: std({ color: 0x3a3f47, metalness: 0.75, roughness: 0.35 }),
    yellow: std({ color: 0xf2b705, metalness: 0.3, roughness: 0.4, emissive: 0xff9a00, emissiveIntensity: 0.35 }),
    orange: std({ color: 0xe1661c, metalness: 0.25, roughness: 0.5 }),
    concrete: std({ color: 0x5f6368, metalness: 0.25, roughness: 0.42, map: tex.concrete }),
    asphalt: std({ color: 0x2a2d33, roughness: 0.96, map: tex.asphalt }),
    grass: std({ color: 0x1c2418, roughness: 1 }),
    grating: std({ color: 0x8b939c, metalness: 0.5, roughness: 0.5, map: tex.grating, transparent: true, alphaTest: 0.35 }),
    wallPanel: std({ color: 0xc9ced4, metalness: 0.3, roughness: 0.5, map: tex.panel }),
    wallDark: std({ color: 0x3b4350, metalness: 0.3, roughness: 0.55, map: tex.panel }),
    roof: std({ color: 0x8e959e, metalness: 0.45, roughness: 0.45, map: tex.panel }),
    glass: std({ color: 0x9fc2e6, metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.55, emissive: 0x2a4a6a, emissiveIntensity: 0.35 }),
    windowLit: std({ color: 0xfff1c8, emissive: 0xffc56e, emissiveIntensity: 2.6 }),
    rubber: std({ color: 0x15171a, roughness: 0.85 }),
    silo: std({ color: 0xb4bac1, metalness: 0.95, roughness: 0.28, map: tex.corrugated, envMapIntensity: 0.85 }),
    tankerBody: std({ color: 0xd9dde2, metalness: 0.8, roughness: 0.25 }),
    cabRed: std({ color: 0xb3261e, metalness: 0.3, roughness: 0.4 }),
    insulation: std({ color: 0xb9bfc6, metalness: 1, roughness: 0.24, map: tex.bands, envMapIntensity: 0.9 }),
    // polished process equipment (the studio "diorama" look): reflective stainless, brushed darker steel
    stainless: std({ color: 0xa9b0b8, metalness: 1, roughness: 0.27, envMapIntensity: 0.85 }),
    brushed: std({ color: 0xaab1b9, metalness: 1, roughness: 0.34, map: tex.bands }),
    slab: std({ color: 0x55595f, roughness: 0.9, map: tex.concrete }),
    slabEdge: std({ color: 0x24262b, metalness: 0.3, roughness: 0.6 }),
    grain: std({ color: 0xe0bf86, roughness: 1, map: tex.grain }),
    belt: std({ color: 0x8f8f8f, roughness: 0.9, map: tex.belt }),
    grille: std({ color: 0x9aa0a7, metalness: 0.6, roughness: 0.45, map: tex.grille }),
    fan: std({ color: 0x1a1c20, metalness: 0.5, roughness: 0.45 }),
    machine: std({ color: 0xf1f3f5, metalness: 0.1, roughness: 0.35 }),
    // campus: offices, landscaping, walkways, parking
    curtain: std({ color: 0x2b3a4c, metalness: 0.6, roughness: 0.12, emissive: 0x0d1a2a, emissiveIntensity: 0.6 }),
    officeWall: std({ color: 0xe9ebee, metalness: 0.05, roughness: 0.55 }),
    leaf: std({ color: 0x2f5a37, roughness: 0.9, flatShading: true }),
    leafDark: std({ color: 0x24472c, roughness: 0.9, flatShading: true }),
    bark: std({ color: 0x4a3a2c, roughness: 0.9 }),
    lawn: std({ color: 0x2c4a2f, roughness: 1 }),
    walkway: std({ color: 0x3e7a52, roughness: 0.75 }),
    lampHead: std({ color: 0xfff3d6, emissive: 0xffc77a, emissiveIntensity: 3 }),
    carBlue: std({ color: 0x1f4f8f, metalness: 0.6, roughness: 0.3 }),
    carSilver: std({ color: 0xb8bec6, metalness: 0.8, roughness: 0.28 }),
    carBlack: std({ color: 0x15171b, metalness: 0.6, roughness: 0.3 }),
    carWhite: std({ color: 0xf0f2f4, metalness: 0.4, roughness: 0.3 }),
    galv: std({ color: 0x9da4ac, metalness: 0.85, roughness: 0.38 }),
    transformer: std({ color: 0x6f7c74, metalness: 0.5, roughness: 0.45 }),
    porcelain: std({ color: 0x8a5a3c, roughness: 0.35 }),
    fireRed: std({ color: 0xc4231b, metalness: 0.3, roughness: 0.4 }),
    water: std({ color: 0x2f5f6e, metalness: 0.1, roughness: 0.12, transparent: true, opacity: 0.88 }),
    sludge: std({ color: 0x5a4a32, roughness: 0.6 }),
    cabinet: std({ color: 0xd9dcdf, metalness: 0.3, roughness: 0.45 }),
    wdg: std({ color: 0x8a6a3c, roughness: 0.95, flatShading: true }),
    signal: std({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.2 })
  };
}

// ------------------------------------------------------------------ canvas textures (no downloads)
export function createTextures(renderer) {
  const make = (w, h, draw, repeat = [1, 1]) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  };
  const noise = (x, w, h, a, n) => { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? "0,0,0" : "255,255,255"},${Math.random() * a})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } };
  return {
    concrete: make(256, 256, (x, w, h) => { x.fillStyle = "#b5b7b3"; x.fillRect(0, 0, w, h); noise(x, w, h, .08, 5000); x.strokeStyle = "rgba(0,0,0,.18)"; x.lineWidth = 2; x.strokeRect(0, 0, w, h); }, [40, 40]),
    asphalt: make(256, 256, (x, w, h) => { x.fillStyle = "#3e4146"; x.fillRect(0, 0, w, h); noise(x, w, h, .12, 7000); }, [30, 30]),
    grating: make(64, 64, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = "#9aa2ab"; for (let i = 0; i < w; i += 8) x.fillRect(i, 0, 2, h); for (let j = 0; j < h; j += 16) x.fillRect(0, j, w, 2); }, [1, 1]),
    panel: make(128, 128, (x, w, h) => { x.fillStyle = "#d0d4d9"; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 16) { x.fillStyle = "rgba(0,0,0,.12)"; x.fillRect(i, 0, 2, h); x.fillStyle = "rgba(255,255,255,.25)"; x.fillRect(i + 2, 0, 1, h); } }, [1, 1]),
    corrugated: make(128, 32, (x, w, h) => { const g = x.createLinearGradient(0, 0, 16, 0); g.addColorStop(0, "#c7cbcf"); g.addColorStop(.5, "#f4f6f8"); g.addColorStop(1, "#c7cbcf"); x.fillStyle = g; for (let i = 0; i < w; i += 16) { x.save(); x.translate(i, 0); x.fillRect(0, 0, 16, h); x.restore(); } x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(0, 0, w, 1); }, [24, 6]),
    cladding: make(64, 128, (x, w, h) => { x.fillStyle = "#e3e7eb"; x.fillRect(0, 0, w, h); for (let j = 0; j < h; j += 32) { x.fillStyle = "rgba(0,0,0,.16)"; x.fillRect(0, j, w, 2); } noise(x, w, h, .05, 400); }, [8, 4]),
    grain: make(128, 128, (x, w, h) => { x.fillStyle = "#cfa968"; x.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { x.fillStyle = Math.random() < .5 ? "rgba(120,80,30,.35)" : "rgba(255,240,200,.5)"; x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 1.6, 1, Math.random() * 3, 0, 7); x.fill(); } }, [3, 3]),
    belt: make(64, 64, (x, w, h) => { x.fillStyle = "#2a2c30"; x.fillRect(0, 0, w, h); x.fillStyle = "#d9b779"; for (let i = 0; i < 260; i++) x.fillRect(Math.random() * w, 14 + Math.random() * 36, 2, 2); x.fillStyle = "rgba(255,255,255,.08)"; x.fillRect(0, 0, 2, h); }, [6, 1]),
    grille: make(64, 64, (x, w, h) => { x.fillStyle = "#b8bec5"; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(0,0,0,.55)"; for (let j = 0; j < h; j += 4) x.fillRect(0, j, w, 2); }, [3, 1]),
    bands: make(64, 64, (x, w, h) => { x.fillStyle = "#cfd3d8"; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(0,0,0,.2)"; x.fillRect(0, 0, w, 2); x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(0, 3, w, 1); }, [6, 10])
  };
}

// ------------------------------------------------------------------ builder: parts collected per material, merged once
export function createBuilder(M) {
  const lists = new Map();
  const movers = [];
  const add = (mat, geo, m4) => { if (m4) geo.applyMatrix4(m4); if (!lists.has(mat)) lists.set(mat, []); lists.get(mat).push(geo); return geo; };
  const T = (x, y, z, ry = 0, rx = 0, rz = 0, s = null) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), s ? new THREE.Vector3(...s) : new THREE.Vector3(1, 1, 1));
    return m;
  };
  const b = {
    M, add, T,
    box: (mat, w, h, d, x, y, z, ry = 0) => add(mat, new THREE.BoxGeometry(w, h, d), T(x, y, z, ry)),
    cyl: (mat, r, h, x, y, z, seg = 32, rTop = r, open = false) => add(mat, new THREE.CylinderGeometry(rTop, r, h, seg, 1, open), T(x, y, z)),
    // a cylinder from point a to point b (beams, rails, pipes)
    rod: (mat, r, a, c, seg = 8) => {
      const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c), len = A.distanceTo(C);
      if (len < 1e-4) return;
      const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), C.clone().sub(A).normalize());
      add(mat, g, new THREE.Matrix4().compose(A.clone().add(C).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    },
    sphereCap: (mat, r, y, h, x = 0, z = 0, seg = 32) => {
      // dome of height h on a radius r cylinder top
      const R = (r * r + h * h) / (2 * h), theta = Math.asin(Math.min(1, r / R));
      add(mat, new THREE.SphereGeometry(R, seg, 10, 0, Math.PI * 2, 0, theta), T(x, y - (R - h), z));
    },
    cone: (mat, r, h, x, y, z, seg = 32, down = false) => add(mat, new THREE.ConeGeometry(r, h, seg, 1, false), T(x, y, z, 0, down ? Math.PI : 0)),
    torus: (mat, R, r, x, y, z, rx = Math.PI / 2) => add(mat, new THREE.TorusGeometry(R, r, 6, 48), T(x, y, z, 0, rx)),
    // a separate mesh that the engine animates: spins about its local y axis ({ speed } rad/s, { tag } groups it)
    spinner: (mat, geos, x, y, z, spec = {}) => {
      const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true; movers.push({ mesh, speed: spec.speed || 3, tag: spec.tag || "" });
      return mesh;
    },
    group: (name = "") => {
      const g = new THREE.Group(); g.name = name;
      for (const [mat, geos] of lists) {
        const merged = mergeGeometries(geos);
        geos.forEach((x) => x.dispose());
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = mat !== M.grating && mat !== M.glass; mesh.receiveShadow = true;
        g.add(mesh);
      }
      lists.clear();
      for (const m of movers) g.add(m.mesh);
      g.userData.movers = movers.splice(0);
      return g;
    }
  };
  return b;
}

// ------------------------------------------------------------------ shared parts
// caged ladder from y0 to y1 at (x, z), facing outward along angle a (radians) from a vessel centre
function ladder(b, x, z, y0, y1, a = 0, cage = true) {
  const M = b.M, dx = Math.cos(a), dz = Math.sin(a), px = -dz * 0.22, pz = dx * 0.22;
  b.rod(M.yellow, 0.025, [x + px, y0, z + pz], [x + px, y1 + 1, z + pz], 6);
  b.rod(M.yellow, 0.025, [x - px, y0, z - pz], [x - px, y1 + 1, z - pz], 6);
  for (let y = y0 + 0.3; y < y1; y += 0.3) b.rod(M.yellow, 0.015, [x + px, y, z + pz], [x - px, y, z - pz], 4);
  if (!cage) return;
  for (let y = y0 + 2.4; y < y1 + 1; y += 0.9) {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const t = Math.PI * (i / 8); pts.push([x + px * Math.cos(t) * 1.6 + dx * Math.sin(t) * 0.42, y, z + pz * Math.cos(t) * 1.6 + dz * Math.sin(t) * 0.42]); }
    for (let i = 0; i < pts.length - 1; i++) b.rod(M.yellow, 0.012, pts[i], pts[i + 1], 4);
  }
  for (let k = 0; k < 4; k++) { const t = Math.PI * (k / 3); b.rod(M.yellow, 0.012, [x + px * Math.cos(t) * 1.6 + dx * Math.sin(t) * 0.42, y0 + 2.4, z + pz * Math.cos(t) * 1.6 + dz * Math.sin(t) * 0.42], [x + px * Math.cos(t) * 1.6 + dx * Math.sin(t) * 0.42, y1 + 1, z + pz * Math.cos(t) * 1.6 + dz * Math.sin(t) * 0.42], 4); }
}
// circular railing at height y around radius r
function ringRail(b, r, y, x = 0, z = 0) {
  const M = b.M, n = Math.max(12, Math.round(r * 6));
  b.torus(M.yellow, r, 0.03, x, y + 1.05, z); b.torus(M.yellow, r, 0.025, x, y + 0.55, z);
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; b.rod(M.yellow, 0.025, [x + Math.cos(t) * r, y, z + Math.sin(t) * r], [x + Math.cos(t) * r, y + 1.05, z + Math.sin(t) * r], 4); }
}
// rectangular railing on a platform edge
function rectRail(b, w, d, y, x = 0, z = 0, skip = "") {
  const M = b.M, hw = w / 2, hd = d / 2;
  const sides = { n: [[x - hw, z - hd], [x + hw, z - hd]], s: [[x - hw, z + hd], [x + hw, z + hd]], w: [[x - hw, z - hd], [x - hw, z + hd]], e: [[x + hw, z - hd], [x + hw, z + hd]] };
  for (const [k, [p, q]] of Object.entries(sides)) {
    if (skip.includes(k)) continue;
    for (const hh of [0.55, 1.05]) b.rod(M.yellow, 0.025, [p[0], y + hh, p[1]], [q[0], y + hh, q[1]], 4);
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.round(len / 1.6));
    for (let i = 0; i <= n; i++) { const t = i / n; b.rod(M.yellow, 0.025, [p[0] + (q[0] - p[0]) * t, y, p[1] + (q[1] - p[1]) * t], [p[0] + (q[0] - p[0]) * t, y + 1.05, p[1] + (q[1] - p[1]) * t], 4); }
  }
}
function rotor(r, blades = 5) {
  const geos = [new THREE.CylinderGeometry(r * .18, r * .18, 0.25, 16)];
  for (let i = 0; i < blades; i++) { const g = new THREE.BoxGeometry(r * .8, 0.05, r * .26); g.translate(r * .5, 0, 0); g.rotateX(0.3); g.rotateY((i / blades) * Math.PI * 2); geos.push(g); }
  return geos;
}
function nozzles(b, r, y, n, a0 = 0, len = 0.6, rr = 0.18) {
  for (let i = 0; i < n; i++) { const t = a0 + (i / n) * Math.PI * 2; b.rod(b.M.steel, rr, [Math.cos(t) * r, y, Math.sin(t) * r], [Math.cos(t) * (r + len), y, Math.sin(t) * (r + len)], 12); b.rod(b.M.steel, rr * 1.5, [Math.cos(t) * (r + len - 0.05), y, Math.sin(t) * (r + len - 0.05)], [Math.cos(t) * (r + len + 0.05), y, Math.sin(t) * (r + len + 0.05)], 12); }
}

// a parked car (≈ 4.5 × 1.8 m), facing angle a
function car(b, x, z, a, paint) {
  const M = b.M, T = (dx, dy, dz) => { const c = Math.cos(a), s = Math.sin(a); return [x + dx * c + dz * s, dy, z - dx * s + dz * c]; };
  const box = (mat, w, h, d, dx, dy, dz) => { const p = T(dx, dy, dz); b.add(mat, new THREE.BoxGeometry(w, h, d), b.T(p[0], p[1], p[2], a)); };
  box(paint, 4.4, 0.75, 1.8, 0, 0.75, 0);
  box(paint, 2.3, 0.6, 1.6, -0.2, 1.4, 0);
  box(M.curtain, 2.32, 0.42, 1.62, -0.2, 1.42, 0);
  for (const dx of [-1.4, 1.4]) for (const dz of [-0.85, 0.85]) { const p = T(dx, 0.36, dz); b.add(M.rubber, new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12), b.T(p[0], p[1], p[2], a, Math.PI / 2)); }
}

// ------------------------------------------------------------------ generators
const G = {
  // vertical storage tank / fermenter: cladding rings, cone or dome roof, top railing, caged ladder
  tank(b, { r = 6, h = 12, roof = "cone", mat = "stainless", ladder: lad = true, legs = 0, base = 0.4, label = "", band = "", agitator = false } = {}) {
    const M = b.M, body = M[mat] || M.white;
    b.cyl(M.concrete, r + 0.4, base, 0, base / 2, 0, 40);
    if (legs) { for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + Math.PI / 4; b.rod(M.paintGrey, 0.18, [Math.cos(t) * r * .8, base, Math.sin(t) * r * .8], [Math.cos(t) * r * .8, base + legs, Math.sin(t) * r * .8], 8); } b.cone(body, r, r * .7, 0, base + legs + r * .35, 0, 40, true); }
    const y0 = base + legs + (legs ? r * .7 : 0);
    b.cyl(body, r, h, 0, y0 + h / 2, 0, 48);
    for (let y = y0 + 2.4; y < y0 + h - 0.5; y += 2.4) b.torus(M.steel, r + 0.02, 0.04, 0, y, 0);
    if (roof === "cone") b.cone(body, r + 0.05, r * 0.28, 0, y0 + h + r * 0.14, 0, 48);
    else if (roof === "dome") b.sphereCap(body, r + 0.02, y0 + h, r * 0.35, 0, 0, 48);
    else b.cyl(body, r + 0.05, 0.15, 0, y0 + h + 0.07, 0, 48);
    const top = y0 + h + (roof === "cone" ? r * 0.12 : roof === "dome" ? r * 0.2 : 0.15);
    if (band) b.cyl(M[band] || M.paintGreen, r + 0.03, 0.7, 0, y0 + h * 0.22, 0, 48, r + 0.03, true);
    if (label) {
      const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d");
      x.fillStyle = "#1c2026"; x.textAlign = "center"; x.font = "700 92px Inter, Arial, sans-serif";
      const lines = label.split("|");
      lines.forEach((l, i) => x.fillText(l, 256, 128 + (i - (lines.length - 1) / 2) * 104 + 32));
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      const lm = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.4, metalness: 0.2, depthWrite: false });
      // a curved decal facing the default camera (+x +z)
      b.add(lm, new THREE.CylinderGeometry(r + 0.04, r + 0.04, h * 0.32, 32, 1, true, Math.PI * 0.03, Math.PI * 0.44), b.T(0, y0 + h * 0.56, 0));
    }
    if (agitator) {
      b.cyl(M.paintBlue, 0.55, 1.4, 0, top + 0.7, 0, 20); b.box(M.paintGrey, 1.6, 0.3, 1.6, 0, top + 0.15, 0);
      b.spinner(M.yellow, rotor(0.9, 3), 0, top + 1.55, 0, { speed: 2.4, tag: "agitator" });
    }
    ringRail(b, r * 0.55, top, 0, 0);
    b.cyl(M.steel, 0.45, 0.6, r * 0.3, top + 0.3, 0, 16); b.cyl(M.steel, 0.3, 0.9, -r * 0.25, top + 0.45, r * 0.2, 12);
    nozzles(b, r, y0 + 1, 3, 0.4, 0.7, 0.2);
    if (lad) { const a = -Math.PI / 4; ladder(b, Math.cos(a) * (r + 0.35), Math.sin(a) * (r + 0.35), base, top, a); }
    return { height: top + 1, radius: r, ports: { in: [0, top, 0], out: [r + 0.7, y0 + 1, 0] } };
  },
  // corrugated grain silo with conical roof, roof walkway and hopper legs
  silo(b, { r = 7, h = 20, hopper = 0 } = {}) {
    const M = b.M;
    b.cyl(M.concrete, r + 0.6, 0.6, 0, 0.3, 0, 48);
    let y0 = 0.6;
    if (hopper) { for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; b.rod(M.paintGrey, 0.22, [Math.cos(t) * r * .92, y0, Math.sin(t) * r * .92], [Math.cos(t) * r * .92, y0 + hopper, Math.sin(t) * r * .92], 8); } b.cone(M.silo, r, hopper * .8, 0, y0 + hopper * .6, 0, 48, true); y0 += hopper; }
    b.cyl(M.silo, r, h, 0, y0 + h / 2, 0, 64);
    for (let y = y0 + 3; y < y0 + h; y += 3) b.torus(M.steel, r + 0.03, 0.06, 0, y, 0);
    for (let i = 0; i < 16; i++) { const t = i * Math.PI / 8; b.rod(M.steel, 0.07, [Math.cos(t) * (r + .03), y0, Math.sin(t) * (r + .03)], [Math.cos(t) * (r + .03), y0 + h, Math.sin(t) * (r + .03)], 6); }
    b.cone(M.silo, r + 0.25, r * 0.55, 0, y0 + h + r * 0.27, 0, 64);
    b.cyl(M.steel, 0.9, 1.2, 0, y0 + h + r * 0.55 + 0.6, 0, 20);
    ladder(b, r + 0.35, 0, 0.6, y0 + h, 0);
    ringRail(b, r * 0.95, y0 + h, 0, 0);
    return { height: y0 + h + r * 0.55 + 1.2, radius: r, ports: { in: [0, y0 + h + r * .55 + 1.2, 0], out: [r, 1.5, 0] } };
  },
  // distillation column: insulated shell, platform every `step` metres with railing, ladder, top piping
  column(b, { r = 1.4, h = 30, step = 6, mat = "insulation" } = {}) {
    const M = b.M;
    b.cyl(M.concrete, r + 1.2, 1, 0, 0.5, 0, 24);
    b.cyl(M.darkSteel, r + 0.15, 2, 0, 2, 0, 32);
    b.cyl(M[mat], r, h, 0, 3 + h / 2, 0, 40);
    b.sphereCap(M[mat], r, 3 + h, r * 0.6, 0, 0, 32);
    for (let y = 3 + step; y < 3 + h - 1; y += step) {
      b.add(M.grating, new THREE.RingGeometry(r + 0.05, r + 1.4, 32, 1), b.T(0, y, 0, 0, -Math.PI / 2));
      b.add(M.paintGrey, new THREE.CylinderGeometry(r + 1.4, r + 1.4, 0.12, 32, 1, true), b.T(0, y - 0.06, 0));
      ringRail(b, r + 1.35, y);
      nozzles(b, r, y - 1.2, 2, y * 0.7, 0.5, 0.14);
    }
    ladder(b, r + 0.35, 0, 0, 3 + h, 0, true);
    b.rod(M.steel, 0.2, [0, 3 + h + r * .6, 0], [0, 3 + h + r * .6 + 1.4, 0], 12);
    b.rod(M.steel, 0.2, [0, 3 + h + r * .6 + 1.4, 0], [-(r + 2), 3 + h + r * .6 + 1.4, 0], 12);
    b.rod(M.steel, 0.2, [-(r + 2), 3 + h + r * .6 + 1.4, 0], [-(r + 2), 2, 0], 12);
    return { height: 3 + h + r * .6 + 1.6, radius: r + 1.4, ports: { in: [r + .5, 3 + h * .5, 0], out: [-(r + 2), 2, 0], bottom: [r + .3, 2.5, 0] } };
  },
  // small vertical process vessel on legs (yeast propagation, sieve bed, evaporator body)
  vessel(b, { r = 1.5, h = 8, mat = "steel", legs = 1.6 } = {}) {
    const M = b.M;
    for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + Math.PI / 4; b.rod(M.paintGrey, 0.12, [Math.cos(t) * r * .85, 0, Math.sin(t) * r * .85], [Math.cos(t) * r * .85, legs + r * .3, Math.sin(t) * r * .85], 8); }

    b.cone(M[mat], r, r * .5, 0, legs + r * .25, 0, 32, true);
    b.cyl(M[mat], r, h, 0, legs + r * .5 + h / 2, 0, 40);
    b.sphereCap(M[mat], r, legs + r * .5 + h, r * .4);
    for (let y = legs + 2; y < legs + h; y += 2) b.torus(M.steel, r + 0.02, 0.03, 0, y, 0);
    nozzles(b, r, legs + h * .8, 2, 0.3, 0.5, 0.12);
    return { height: legs + h + r, radius: r, ports: { in: [0, legs + h + r * .9, 0], out: [r + .5, legs + 1.5, 0] } };
  },
  // horizontal shell & tube heat exchanger on saddles
  exchanger(b, { r = 0.7, len = 6 } = {}) {
    const M = b.M;
    for (const x of [-len * .3, len * .3]) { b.box(M.paintGrey, 0.4, 1.2, r * 2.2, x, 0.6, 0); b.box(M.concrete, 0.8, 0.3, r * 2.6, x, 0.15, 0); }
    b.add(M.steel, new THREE.CylinderGeometry(r, r, len, 32), b.T(0, 1.2 + r, 0, 0, 0, Math.PI / 2));
    for (const x of [-len / 2, len / 2]) b.add(M.paintBlue, new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.25, 32), b.T(x, 1.2 + r, 0, 0, 0, Math.PI / 2));
    b.rod(M.steel, 0.14, [-len * .35, 1.2 + r * 2, 0], [-len * .35, 1.2 + r * 2 + .6, 0], 10);
    b.rod(M.steel, 0.14, [len * .35, 1.2, 0], [len * .35, 0.4, 0], 10);
    return { height: 1.2 + r * 2 + .6, radius: len / 2, ports: { in: [-len * .35, 1.2 + r * 2 + .6, 0], out: [len * .35, 0.4, 0] } };
  },
  // centrifugal pump + motor on a skid
  pump(b, { color = "paintBlue" } = {}) {
    const M = b.M;
    b.box(M.paintGrey, 2.2, 0.2, 0.9, 0, 0.1, 0);
    b.add(M[color], new THREE.CylinderGeometry(0.32, 0.32, 1.1, 20), b.T(-0.4, 0.55, 0, 0, 0, Math.PI / 2));
    b.add(M[color], new THREE.CylinderGeometry(0.38, 0.38, 0.3, 20), b.T(0.45, 0.55, 0, 0, Math.PI / 2, 0));
    b.cyl(M.steel, 0.12, 0.6, 0.45, 1.0, 0, 12);
    b.rod(M.steel, 0.12, [0.6, 0.55, 0], [1.1, 0.55, 0], 12);
    return { height: 1.3, radius: 1.1, ports: { in: [1.1, 0.55, 0], out: [0.45, 1.3, 0] } };
  },
  // industrial building: panel walls, ribbon windows, roller doors, low-pitch roof, roof units
  building(b, { w = 30, d = 18, h = 10, wall = "wallPanel", windows = true, doors = 1, glass = false, lit = true } = {}) {
    const M = b.M, W = M[wall] || M.wallPanel;
    b.box(M.concrete, w + 1, 0.4, d + 1, 0, 0.2, 0);
    b.box(W, w, h, d, 0, 0.4 + h / 2, 0);
    // roof with a slight ridge and parapet
    b.box(M.roof, w + 0.6, 0.4, d + 0.6, 0, 0.4 + h + 0.2, 0);
    b.box(M.darkSteel, w + 0.8, 0.8, 0.25, 0, 0.4 + h + 0.4, (d + 0.6) / 2);
    b.box(M.darkSteel, w + 0.8, 0.8, 0.25, 0, 0.4 + h + 0.4, -(d + 0.6) / 2);
    if (glass) { b.box(M.glass, w + 0.05, h * 0.55, d + 0.05, 0, 0.4 + h * 0.5, 0); for (let x = -w / 2; x <= w / 2 + 0.01; x += 3) b.box(M.darkSteel, 0.12, h * 0.6, d + 0.1, x, 0.4 + h * 0.5, 0); }
    else if (windows) {
      const wy = 0.4 + h * 0.72;
      b.box(lit ? M.windowLit : M.glass, w * 0.86, 1.0, 0.06, 0, wy, d / 2 + 0.03);
      b.box(lit ? M.windowLit : M.glass, w * 0.86, 1.0, 0.06, 0, wy, -d / 2 - 0.03);
      for (let x = -w * .43; x <= w * .43; x += 2.5) { b.box(M.darkSteel, 0.1, 1.05, 0.08, x, wy, d / 2 + 0.04); b.box(M.darkSteel, 0.1, 1.05, 0.08, x, wy, -d / 2 - 0.04); }
    }
    for (let i = 0; i < doors; i++) { const x = -w / 2 + (w / (doors + 1)) * (i + 1); b.box(M.paintGrey, 4.2, Math.min(5, h * .55), 0.12, x, 0.4 + Math.min(5, h * .55) / 2, d / 2 + 0.06); for (let y = 0.6; y < Math.min(5, h * .55); y += 0.35) b.box(M.darkSteel, 4.1, 0.04, 0.14, x, 0.4 + y, d / 2 + 0.07); }
    // roof units / fans
    for (let i = 0; i < Math.max(1, Math.round(w / 12)); i++) { const x = -w / 2 + 5 + i * 10; b.box(M.paintGrey, 2.4, 1.2, 1.8, x, 0.4 + h + 1, -d * 0.2); b.cyl(M.darkSteel, 0.6, 0.3, x, 0.4 + h + 1.75, -d * 0.2, 16); }
    return { height: h + 2, radius: Math.max(w, d) / 2, ports: { in: [-w / 2, 2, 0], out: [w / 2, 2, 0] } };
  },
  // mechanical-draught cooling tower: cells with fan stacks
  coolingTower(b, { cells = 3, cw = 9, d = 10, h = 9 } = {}) {
    const M = b.M, w = cells * cw;
    b.box(M.concrete, w + 1, 1.2, d + 1, 0, 0.6, 0);
    b.box(M.wallPanel, w, h, d, 0, 1.2 + h / 2, 0);
    for (let i = 0; i < cells; i++) {
      const x = -w / 2 + cw * (i + .5);
      for (let y = 2; y < h; y += 0.5) b.box(M.darkSteel, cw - 1.2, 0.08, 0.2, x, 1.2 + y, d / 2 + 0.05);
      b.cyl(M.paintBlue, cw * .38, 2.6, x, 1.2 + h + 1.3, 0, 40, cw * .42, true);
      b.torus(M.steel, cw * .42, 0.06, x, 1.2 + h + 2.6, 0);
    }
    rectRail(b, w, d, 1.2 + h);
    ladder(b, w / 2 + 0.3, d * .3, 1.2, 1.2 + h, 0);
    return { height: h + 4, radius: w / 2, ports: { in: [w / 2, 3, 0], out: [-w / 2, 3, 0] } };
  },
  stack(b, { r = 1.2, h = 40 } = {}) {
    const M = b.M;
    b.cyl(M.concrete, r + 1, 1, 0, 0.5, 0, 24);
    b.cyl(M.steel, r, h, 0, 1 + h / 2, 0, 32, r * 0.85);
    for (const y of [h * .3, h * .62, h * .9]) { b.cyl(M.cabRed, r * 1.02, 2, 0, 1 + y, 0, 32); }
    b.add(M.grating, new THREE.RingGeometry(r * .9, r + 1.2, 24), b.T(0, 1 + h * .78, 0, 0, -Math.PI / 2)); ringRail(b, r + 1.15, 1 + h * .78);
    ladder(b, r + 0.3, 0, 1, 1 + h * .78, 0);
    return { height: h + 1, radius: r + 1, ports: { in: [r, 3, 0], out: [0, h, 0] } };
  },
  // rotary drum dryer on tyres and trunnions, burner box and discharge hood
  dryer(b, { r = 2.2, len = 26 } = {}) {
    const M = b.M, y = 3.2, tilt = 0.035;
    for (const x of [-len * .32, len * .32]) { b.box(M.concrete, 3, 1.4, 5.5, x, 0.7, 0); b.box(M.paintGrey, 1.2, 1.6, 4.6, x, 2.1, 0); }
    b.add(M.paintGreen, new THREE.CylinderGeometry(r, r, len, 40), b.T(0, y + r * 0.2, 0, 0, 0, Math.PI / 2 + tilt));
    for (const x of [-len * .32, len * .32]) b.add(M.darkSteel, new THREE.TorusGeometry(r + 0.18, 0.2, 8, 40), b.T(x, y + r * 0.2 + x * -tilt, 0, Math.PI / 2));
    b.box(M.paintGrey, 4, 6, 5, -len / 2 - 2, 3, 0);
    b.box(M.paintGrey, 4, 7, 6, len / 2 + 2, 3.5, 0);
    b.rod(M.steel, 0.8, [len / 2 + 2, 7, 0], [len / 2 + 2, 16, 0], 20);
    return { height: 16, radius: len / 2 + 4, ports: { in: [-len / 2 - 2, 6, 0], out: [len / 2 + 2, 2, 0] } };
  },
  centrifuge(b, { n = 3 } = {}) {
    const M = b.M;
    for (let i = 0; i < n; i++) {
      const z = (i - (n - 1) / 2) * 3;
      b.box(M.paintGrey, 6, 0.4, 2, 0, 0.2, z);
      b.add(M.steel, new THREE.CylinderGeometry(0.7, 0.55, 4.2, 24), b.T(0.2, 1.3, z, 0, 0, Math.PI / 2));
      b.box(M.paintBlue, 1.4, 1.4, 1.4, -2.4, 1.1, z);
    }
    return { height: 2.4, radius: 4, ports: { in: [-3, 1.5, 0], out: [3, 1.5, 0] } };
  },
  // open steel structure with grated floors, bracing, railings and a stair tower
  structure(b, { w = 14, d = 10, levels = 3, lh = 6 } = {}) {
    const M = b.M, cols = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, -d / 2], [0, d / 2]];
    for (const [x, z] of cols) { b.box(M.concrete, 1, 0.6, 1, x, 0.3, z); b.box(M.paintBlue, 0.35, levels * lh, 0.35, x, levels * lh / 2, z); }
    for (let l = 1; l <= levels; l++) {
      const y = l * lh;
      b.box(M.grating, w, 0.08, d, 0, y, 0);
      b.box(M.paintBlue, w, 0.35, 0.3, 0, y - 0.2, -d / 2); b.box(M.paintBlue, w, 0.35, 0.3, 0, y - 0.2, d / 2);
      b.box(M.paintBlue, 0.3, 0.35, d, -w / 2, y - 0.2, 0); b.box(M.paintBlue, 0.3, 0.35, d, w / 2, y - 0.2, 0);
      rectRail(b, w, d, y);
      b.rod(M.paintBlue, 0.08, [-w / 2, y - lh, -d / 2], [0, y, -d / 2], 6); b.rod(M.paintBlue, 0.08, [w / 2, y - lh, d / 2], [0, y, d / 2], 6);
    }
    // stair tower on the east side
    for (let l = 0; l < levels; l++) {
      const y0 = l * lh, sx = w / 2 + 1.5, steps = 18;
      for (let s = 0; s < steps; s++) { const t = s / steps, z = l % 2 ? d / 2 - 1 - t * (d - 2) : -d / 2 + 1 + t * (d - 2); b.box(M.grating, 1.4, 0.06, 0.45, sx, y0 + t * lh, z); }
      b.rod(M.yellow, 0.03, [sx + 0.75, y0 + 1, l % 2 ? d / 2 - 1 : -d / 2 + 1], [sx + 0.75, y0 + lh + 1, l % 2 ? -d / 2 + 1 : d / 2 - 1], 4);
    }
    for (const z of [-d / 2, d / 2]) b.box(M.paintBlue, 0.25, levels * lh, 0.25, w / 2 + 2.3, levels * lh / 2, z);
    return { height: levels * lh + 1.2, radius: Math.max(w, d) / 2, ports: { in: [-w / 2, lh, 0], out: [w / 2, lh, 0] } };
  },
  // pipe rack along the local x axis: portal frames every `bay` metres, two tiers
  pipeRack(b, { len = 120, w = 10, tiers = [6, 8.2, 10.4], bay = 7 } = {}) {
    const M = b.M, top = tiers[tiers.length - 1], n = Math.round(len / bay);
    for (let i = 0; i <= n; i++) {
      const x = -len / 2 + (len * i) / n;
      for (const z of [-w / 2, w / 2]) { b.box(M.concrete, 1.0, 0.6, 1.0, x, 0.3, z); b.box(M.paintGrey, 0.36, top + 0.4, 0.36, x, (top + 0.4) / 2, z); b.box(M.darkSteel, 0.7, 0.06, 0.7, x, 0.62, z); }
      for (const y of tiers) b.box(M.paintGrey, 0.3, 0.42, w + 0.5, x, y - 0.21, 0);
      // knee braces under the lowest beam
      for (const e of [-1, 1]) b.rod(M.paintGrey, 0.07, [x, tiers[0] - 1.4, e * (w / 2)], [x, tiers[0] - 0.4, e * (w / 2 - 1.0)], 6);
      // pipe shoes on the process and utility tiers
      if (i < n) for (const y of tiers.slice(0, -1)) for (let z = -w / 2 + 0.8; z < w / 2 - 0.5; z += 0.7) b.box(M.darkSteel, 0.16, 0.12, 0.22, x, y + 0.06, z);
    }
    for (const z of [-w / 2, w / 2]) for (const y of tiers) b.box(M.paintGrey, len, 0.26, 0.2, 0, y - 0.13, z);
    // longitudinal X-bracing every third bay on both frames
    for (let i = 0; i < n; i += 3) { const x0 = -len / 2 + (len * i) / n, x1 = -len / 2 + (len * (i + 1)) / n; for (const z of [-w / 2, w / 2]) { b.rod(M.paintGrey, 0.06, [x0, 0.6, z], [x1, tiers[0] - 0.4, z], 6); b.rod(M.paintGrey, 0.06, [x1, 0.6, z], [x0, tiers[0] - 0.4, z], 6); } }
    // cable-tray tier: ladder trays (two rails + rungs) on the top beams
    const ty = top + 0.02;
    for (const z of [-3.2, -1.6, 1.6, 3.2]) { for (const e of [-0.3, 0.3]) b.box(M.galv, len, 0.12, 0.04, 0, ty + 0.06, z + e); for (let x = -len / 2; x < len / 2; x += 1.2) b.box(M.galv, 0.05, 0.03, 0.6, x, ty + 0.02, z); }
    return { height: top + 0.6, radius: len / 2, ports: {} };
  },
  canopy(b, { w = 24, d = 14, h = 7 } = {}) {
    const M = b.M;
    b.box(M.concrete, w + 2, 0.3, d + 2, 0, 0.15, 0);
    for (const x of [-w / 2 + 1, 0, w / 2 - 1]) for (const z of [-d / 2 + 1, d / 2 - 1]) b.box(M.paintGrey, 0.4, h, 0.4, x, h / 2, z);
    b.box(M.roof, w, 0.5, d, 0, h + 0.25, 0);
    b.box(M.yellow, w, 0.4, 0.2, 0, h - 0.1, d / 2);
    for (const x of [-w / 4, w / 4]) { b.box(M.paintGrey, 1.2, 4, 1.2, x, 2, -d / 2 + 1.6); b.rod(M.steel, 0.1, [x, 4, -d / 2 + 1.6], [x, 4.8, 0], 8); }
    for (let x = -w / 2 + 2; x <= w / 2 - 2; x += 3) b.box(M.windowLit, 1.4, 0.08, 0.5, x, h - 0.05, 0);
    return { height: h + 0.5, radius: w / 2, ports: { in: [-w / 2, 3, 0], out: [w / 2, 3, 0] } };
  },
  // road tanker: cab + chassis + polished tank
  truck(b, {} = {}) {
    const M = b.M;
    b.box(M.cabRed, 2.5, 2.8, 2.4, -6, 1.9, 0);
    b.box(M.glass, 0.1, 1.1, 2.1, -7.26, 2.6, 0);
    b.box(M.darkSteel, 13, 0.5, 2.2, 0, 0.9, 0);
    b.add(M.tankerBody, new THREE.CylinderGeometry(1.25, 1.25, 9.6, 32), b.T(1.3, 2.45, 0, 0, 0, Math.PI / 2));
    for (const x of [-6.2, -2.4, 3.2, 4.6, 6]) for (const z of [-1.05, 1.05]) b.add(M.rubber, new THREE.CylinderGeometry(0.55, 0.55, 0.45, 18), b.T(x, 0.55, z, 0, Math.PI / 2));
    return { height: 3.8, radius: 7, ports: {} };
  },
  // low concrete bund wall around a tank farm (w × d)
  bund(b, { w = 60, d = 40, h = 1.4 } = {}) {
    const M = b.M;
    b.box(M.concrete, w, h, 0.4, 0, h / 2, -d / 2); b.box(M.concrete, w, h, 0.4, 0, h / 2, d / 2);
    b.box(M.concrete, 0.4, h, d, -w / 2, h / 2, 0); b.box(M.concrete, 0.4, h, d, w / 2, h / 2, 0);
    return { height: h, radius: Math.max(w, d) / 2, ports: {} };
  },
  // inclined conveyor gallery from (0,y0,0) to (len, y1, 0) along local x
  conveyor(b, { len = 40, y0 = 4, y1 = 24, w = 2.2 } = {}) {
    const M = b.M, a = Math.atan2(y1 - y0, len), L = Math.hypot(len, y1 - y0);
    b.add(M.wallPanel, new THREE.BoxGeometry(L, 2.2, w), b.T(len / 2, (y0 + y1) / 2, 0, 0, 0, a));
    b.add(M.roof, new THREE.BoxGeometry(L, 0.25, w + 0.4), b.T(len / 2, (y0 + y1) / 2 + 1.2, 0, 0, 0, a));
    for (let x = 6; x < len - 2; x += 10) { const y = y0 + (y1 - y0) * (x / len); b.box(M.paintGrey, 0.4, y - 1.1, 0.4, x, (y - 1.1) / 2, -w / 2); b.box(M.paintGrey, 0.4, y - 1.1, 0.4, x, (y - 1.1) / 2, w / 2); b.box(M.paintGrey, 0.4, 0.4, w, x, y - 1.1, 0); }
    return { height: y1 + 1.4, radius: len / 2, ports: {} };
  },
  // grain intake hopper: steel frame, inverted pyramid, open bin heaped with grain
  hopper(b, { w = 6, h = 8 } = {}) {
    const M = b.M, hw = w / 2;
    for (const [x, z] of [[-hw, -hw], [hw, -hw], [-hw, hw], [hw, hw]]) { b.box(M.concrete, 0.8, 0.4, 0.8, x, 0.2, z); b.box(M.paintGrey, 0.3, h, 0.3, x, h / 2, z); }
    for (const y of [h * .35, h * .7]) { b.box(M.paintGrey, w, 0.2, 0.2, 0, y, -hw); b.box(M.paintGrey, w, 0.2, 0.2, 0, y, hw); b.box(M.paintGrey, 0.2, 0.2, w, -hw, y, 0); b.box(M.paintGrey, 0.2, 0.2, w, hw, y, 0); }
    b.rod(M.paintGrey, 0.08, [-hw, 0.4, hw], [hw, h * .7, hw], 6); b.rod(M.paintGrey, 0.08, [hw, 0.4, -hw], [hw, h * .7, hw], 6);
    b.add(M.stainless, new THREE.CylinderGeometry(w * .72, 0.5, h * .45, 4, 1, true), b.T(0, h * .78, 0, Math.PI / 4));
    b.add(M.stainless, new THREE.CylinderGeometry(w * .72, w * .72, h * .28, 4, 1, true), b.T(0, h * 1.14, 0, Math.PI / 4));
    b.add(M.grain, new THREE.ConeGeometry(w * .68, h * .2, 4), b.T(0, h * 1.26, 0, Math.PI / 4));
    b.box(M.darkSteel, 1.2, 1.2, 1.2, 0, h * .5, 0);
    return { height: h * 1.4, radius: hw, ports: { in: [0, h * 1.4, 0], out: [0, h * .45, 0] } };
  },
  // inclined belt conveyor along local x, from (0, y0) to (len, y1); the belt texture is animated by the engine (M.belt)
  belt(b, { len = 12, y0 = 2, y1 = 8, w = 1.2 } = {}) {
    const M = b.M, a = Math.atan2(y1 - y0, len), L = Math.hypot(len, y1 - y0);
    b.add(M.belt, new THREE.BoxGeometry(L, 0.12, w), b.T(len / 2, (y0 + y1) / 2 + 0.3, 0, 0, 0, a));
    for (const z of [-w / 2 - 0.08, w / 2 + 0.08]) b.add(M.paintGrey, new THREE.BoxGeometry(L, 0.45, 0.12), b.T(len / 2, (y0 + y1) / 2 + 0.25, z, 0, 0, a));
    for (let x = 1; x < len; x += 3.2) { const y = y0 + (y1 - y0) * (x / len); for (const z of [-w / 2, w / 2]) b.box(M.paintGrey, 0.2, y, 0.2, x, y / 2, z); b.box(M.yellow, 0.2, 0.2, w, x, y * .5, 0); }
    return { height: y1 + 1, radius: len / 2, ports: { in: [0, y0, 0], out: [len, y1, 0] } };
  },
  // process machine / skid enclosure (mill, pump house): white casing, louvres, top unit and cyclone
  machine(b, { w = 8, d = 6, h = 5 } = {}) {
    const M = b.M;
    b.box(M.concrete, w + 0.8, 0.3, d + 0.8, 0, 0.15, 0);
    b.box(M.machine, w, h, d, 0, 0.3 + h / 2, 0);
    b.box(M.machine, w * .55, h * .5, d * .7, -w * .12, 0.3 + h + h * .25, 0);
    b.box(M.grille, w * .32, h * .38, 0.06, w * .25, 0.3 + h * .45, d / 2 + 0.03);
    b.box(M.grille, w * .32, h * .38, 0.06, -w * .2, 0.3 + h * .45, d / 2 + 0.03);
    b.box(M.grille, 0.06, h * .38, d * .5, w / 2 + 0.03, 0.3 + h * .45, 0);
    b.box(M.darkSteel, w * 1.02, 0.18, d * 1.02, 0, 0.3 + h, 0);
    b.cyl(M.stainless, 0.5, h * .6, w * .32, 0.3 + h + h * .3, -d * .2, 16);
    b.cone(M.stainless, 0.9, 1.4, w * .32, 0.3 + h + h * .6 + 0.7, -d * .2, 16);
    return { height: h * 1.8, radius: Math.max(w, d) / 2, ports: { in: [-w * .3, 0.3 + h * 1.5, 0], out: [w / 2, 1.4, 0] } };
  },
  // air-cooled chiller / dry cooler: grille box with fan rotors on top (animated)
  chiller(b, { w = 10, d = 5, h = 3.2, fans = 4 } = {}) {
    const M = b.M;
    b.box(M.concrete, w + 0.8, 0.3, d + 0.8, 0, 0.15, 0);
    b.box(M.wallPanel, w, h, d, 0, 0.3 + h / 2, 0);
    b.box(M.grille, w * .94, h * .7, 0.06, 0, 0.3 + h * .5, d / 2 + 0.03); b.box(M.grille, w * .94, h * .7, 0.06, 0, 0.3 + h * .5, -d / 2 - 0.03);
    const cell = w / fans, fr = Math.min(cell, d) * 0.4;
    for (let i = 0; i < fans; i++) {
      const x = -w / 2 + cell * (i + .5);
      b.cyl(M.darkSteel, fr + 0.15, 0.5, x, 0.3 + h + 0.25, 0, 32, fr + 0.15, true);
      b.torus(M.steel, fr + 0.15, 0.05, x, 0.3 + h + 0.5, 0);
      b.spinner(M.fan, rotor(fr), x, 0.3 + h + 0.3, 0, { speed: 9 + i, tag: "fan" });
    }
    return { height: h + 1, radius: w / 2, ports: { in: [w / 2, 1.2, 0], out: [-w / 2, 1.2, 0] } };
  },
  // office / laboratory: storeys of glazing between white slabs, entrance canopy, parapet and roof plant
  office(b, { w = 26, d = 14, floors = 3, fh = 3.6 } = {}) {
    const M = b.M, h = floors * fh;
    b.box(M.concrete, w + 2, 0.3, d + 2, 0, 0.15, 0);
    for (let i = 0; i < floors; i++) {
      const y = 0.3 + i * fh;
      b.box(M.officeWall, w, 0.6, d, 0, y + 0.3, 0);                                   // floor slab band
      b.box(M.curtain, w - 0.4, fh - 0.6, d - 0.4, 0, y + 0.6 + (fh - 0.6) / 2, 0);    // glazing
      for (let x = -w / 2 + 0.2; x <= w / 2 - 0.2 + 1e-6; x += 1.6) { b.box(M.officeWall, 0.12, fh - 0.6, 0.12, x, y + 0.6 + (fh - 0.6) / 2, d / 2 - 0.2); b.box(M.officeWall, 0.12, fh - 0.6, 0.12, x, y + 0.6 + (fh - 0.6) / 2, -d / 2 + 0.2); }
      for (let z = -d / 2 + 0.2; z <= d / 2 - 0.2 + 1e-6; z += 1.6) { b.box(M.officeWall, 0.12, fh - 0.6, 0.12, w / 2 - 0.2, y + 0.6 + (fh - 0.6) / 2, z); b.box(M.officeWall, 0.12, fh - 0.6, 0.12, -w / 2 + 0.2, y + 0.6 + (fh - 0.6) / 2, z); }
    }
    b.box(M.officeWall, w + 0.2, 1.0, d + 0.2, 0, 0.3 + h + 0.5, 0);                    // roof slab + parapet
    b.box(M.roof, w - 1, 0.1, d - 1, 0, 0.3 + h + 1.02, 0);
    b.box(M.paintGrey, w * .25, 1.4, d * .35, w * .2, 0.3 + h + 1.7, 0); b.box(M.paintGrey, w * .12, 1, d * .25, -w * .25, 0.3 + h + 1.5, -d * .15);
    b.box(M.officeWall, 6, 0.4, 3, 0, 3.4, d / 2 + 1.5); b.box(M.darkSteel, 0.2, 3.2, 0.2, -2.8, 1.8, d / 2 + 2.8); b.box(M.darkSteel, 0.2, 3.2, 0.2, 2.8, 1.8, d / 2 + 2.8);
    b.box(M.windowLit, 3, 2.6, 0.1, 0, 1.6, d / 2 + 0.02);
    return { height: h + 2.5, radius: Math.max(w, d) / 2, ports: { in: [-w / 2, 2, 0], out: [w / 2, 2, 0] } };
  },
  // site entrance: guard house with a barrier arm across the lane (local +x)
  gatehouse(b, { w = 4, d = 4, h = 3.2 } = {}) {
    const M = b.M;
    b.box(M.concrete, w + 1, 0.3, d + 1, 0, 0.15, 0);
    b.box(M.officeWall, w, h, d, 0, 0.3 + h / 2, 0);
    b.box(M.curtain, w + 0.04, 1.2, d * .7, 0, 0.3 + h * .62, 0); b.box(M.curtain, w * .7, 1.2, d + 0.04, 0, 0.3 + h * .62, 0);
    b.box(M.officeWall, w + 1.2, 0.3, d + 1.2, 0, 0.3 + h + 0.15, 0);
    b.box(M.paintGrey, 0.4, 1.1, 0.4, w / 2 + 0.8, 0.85, 0);
    b.rod(M.cabRed, 0.07, [w / 2 + 0.8, 1.3, 0], [w / 2 + 8, 1.3, 0], 8);
    for (let x = w / 2 + 1.6; x < w / 2 + 8; x += 1.2) b.rod(M.white, 0.075, [x, 1.3, 0], [x + 0.6, 1.3, 0], 8);
    return { height: h + 1, radius: w, ports: {} };
  },
  // car park: asphalt with bay lines, rows of parked cars
  parking(b, { w = 30, d = 18, cars = 14 } = {}) {
    const M = b.M;
    b.add(M.asphalt, new THREE.PlaneGeometry(w, d), b.T(0, 0.1, 0, 0, -Math.PI / 2));
    const bays = Math.floor(w / 2.6), colors = [M.carSilver, M.carBlue, M.carWhite, M.carBlack, M.carSilver, M.cabRed, M.carWhite];
    let n = 0;
    for (const side of [-1, 1]) for (let i = 0; i <= bays; i++) {
      const x = -w / 2 + 1.3 + i * 2.6;
      b.add(M.white, new THREE.PlaneGeometry(0.12, 5), b.T(x - 1.3, 0.18, side * (d / 2 - 2.8), 0, -Math.PI / 2));
      if (i < bays && ((i * 7 + (side > 0 ? 3 : 0)) % 10) < 7 && n < cars) { car(b, x, side * (d / 2 - 2.8), side > 0 ? Math.PI / 2 : -Math.PI / 2, colors[n % colors.length]); n++; }
    }
    return { height: 1.6, radius: Math.max(w, d) / 2, ports: {} };
  },
  // deciduous tree: trunk + two faceted crowns (size varies with the seed)
  tree(b, { s = 1, seed = 0 } = {}) {
    const M = b.M, k = s * (0.85 + ((seed * 37) % 10) / 30);
    b.cyl(M.bark, 0.22 * k, 2.6 * k, 0, 1.3 * k, 0, 8);
    b.add(seed % 2 ? M.leaf : M.leafDark, new THREE.IcosahedronGeometry(2.1 * k, 0), b.T(0, 3.6 * k, 0, seed));
    b.add(M.leaf, new THREE.IcosahedronGeometry(1.4 * k, 0), b.T(0.6 * k, 4.8 * k, -0.3 * k, seed * 2));
    return { height: 6 * k, radius: 2 * k, ports: {} };
  },
  // street light: pole, arm and a lit head
  lamp(b, { h = 8 } = {}) {
    const M = b.M;
    b.box(M.concrete, 0.6, 0.3, 0.6, 0, 0.15, 0);
    b.cyl(M.paintGrey, 0.1, h, 0, h / 2, 0, 8);
    b.rod(M.paintGrey, 0.07, [0, h - 0.2, 0], [1.4, h, 0], 6);
    b.box(M.lampHead, 0.8, 0.12, 0.35, 1.5, h - 0.05, 0);
    return { height: h, radius: 1, ports: {} };
  },
  // outdoor substation: fenced gravel yard, power transformers with radiators and bushings, gantry, switchgear kiosk
  substation(b, { w = 22, d = 16, units = 2 } = {}) {
    const M = b.M;
    b.box(M.concrete, w, 0.2, d, 0, 0.1, 0);
    for (const [x0, z0, x1, z1] of [[-w / 2, -d / 2, w / 2, -d / 2], [w / 2, -d / 2, w / 2, d / 2], [w / 2, d / 2, -w / 2, d / 2], [-w / 2, d / 2, -w / 2, -d / 2]]) {
      const L = Math.hypot(x1 - x0, z1 - z0), k = Math.round(L / 2.5);
      for (let i = 0; i <= k; i++) b.box(M.galv, 0.08, 2.4, 0.08, x0 + ((x1 - x0) * i) / k, 1.3, z0 + ((z1 - z0) * i) / k);
      for (const y of [0.5, 1.5, 2.4]) b.rod(M.galv, 0.025, [x0, y, z0], [x1, y, z1], 4);
    }
    for (let i = 0; i < units; i++) {
      const x = -w / 2 + (w / (units + 1)) * (i + 1);
      b.box(M.concrete, 4.2, 0.5, 3.6, x, 0.45, -1);
      b.box(M.transformer, 3, 2.6, 2.2, x, 2, -1);                                       // tank
      for (let k = -1.2; k <= 1.21; k += 0.3) { b.box(M.transformer, 0.06, 2, 0.9, x + k, 1.9, -2.6); b.box(M.transformer, 0.06, 2, 0.9, x + k, 1.9, 0.6); }   // radiators
      b.cyl(M.transformer, 0.45, 1.4, x + 1.0, 3.9, -1.6, 14);                           // conservator
      for (const k of [-0.8, 0, 0.8]) { b.cyl(M.porcelain, 0.12, 1.3, x + k, 3.95, -0.6, 10); b.cyl(M.galv, 0.18, 0.08, x + k, 4.6, -0.6, 10); }
    }
    // incoming line gantry
    for (const x of [-w / 2 + 2, w / 2 - 2]) b.box(M.galv, 0.3, 9, 0.3, x, 4.5, d / 2 - 2.5);
    b.box(M.galv, w - 3.6, 0.35, 0.35, 0, 8.8, d / 2 - 2.5);
    for (let x = -w / 2 + 4; x < w / 2 - 3; x += 3) b.cyl(M.porcelain, 0.1, 1, x, 8.1, d / 2 - 2.5, 8);
    b.box(M.wallDark, 5, 3, 3.4, w / 2 - 3.6, 1.7, -d / 2 + 2.6);                       // switchgear kiosk
    return { height: 9.2, radius: Math.max(w, d) / 2, ports: { out: [w / 2 - 1, 1.2, -d / 2 + 2.6], in: [-w / 2 + 2, 8.8, d / 2 - 2.5] } };
  },
  // emergency diesel generator: acoustic container, exhaust stack, day tank
  egen(b, { w = 8, d = 3, h = 3.2 } = {}) {
    const M = b.M;
    b.box(M.concrete, w + 1, 0.3, d + 1, 0, 0.15, 0);
    b.box(M.paintGreen, w, h, d, 0, 0.3 + h / 2, 0);
    for (let x = -w / 2 + 0.6; x < w / 2; x += 0.35) b.box(M.darkSteel, 0.06, h * 0.6, 0.04, x, 0.3 + h / 2, d / 2 + 0.02);
    b.cyl(M.steel, 0.25, 2.2, w / 2 - 1, 0.3 + h + 1.1, 0, 12);
    b.box(M.white, 1.6, 1.2, 1.2, -w / 2 - 1.4, 0.9, 0);
    return { height: h + 2.6, radius: w / 2, ports: { out: [0, 1.2, d / 2] } };
  },
  // circular clarifier: concrete ring wall, water surface, rotating bridge (animated)
  clarifier(b, { r = 7, h = 2.4 } = {}) {
    const M = b.M;
    b.add(M.concrete, new THREE.CylinderGeometry(r + 0.35, r + 0.35, h, 48, 1, true), b.T(0, h / 2, 0));
    b.add(M.concrete, new THREE.TorusGeometry(r + 0.17, 0.18, 6, 48), b.T(0, h, 0, 0, Math.PI / 2));
    b.add(M.water, new THREE.CircleGeometry(r, 48), b.T(0, h - 0.3, 0, 0, -Math.PI / 2));
    b.cyl(M.steel, 0.9, 1.2, 0, h + 0.3, 0, 16);
    b.spinner(M.galv, [new THREE.BoxGeometry(r * 2, 0.4, 0.9), new THREE.BoxGeometry(0.9, 0.9, 0.9)], 0, h + 0.4, 0, { speed: 0.12, tag: "bridge" });
    return { height: h + 1.2, radius: r + 0.4, ports: { in: [r + 0.4, 1.2, 0], out: [-r - 0.4, 1.2, 0] } };
  },
  // rectangular basin (aeration / equalisation) with walkway
  basin(b, { w = 16, d = 8, h = 3, mat = "water" } = {}) {
    const M = b.M;
    for (const [bw, bd, x, z] of [[w, 0.4, 0, -d / 2], [w, 0.4, 0, d / 2], [0.4, d, -w / 2, 0], [0.4, d, w / 2, 0]]) b.box(M.concrete, bw, h, bd, x, h / 2, z);
    b.add(M[mat] || M.water, new THREE.PlaneGeometry(w - 0.4, d - 0.4), b.T(0, h - 0.35, 0, 0, -Math.PI / 2));
    b.box(M.grating, w, 0.08, 1.2, 0, h + 0.04, 0);
    for (const e of [-0.6, 0.6]) b.rod(M.yellow, 0.03, [-w / 2, h + 1.05, e], [w / 2, h + 1.05, e], 4);
    return { height: h + 1.2, radius: Math.max(w, d) / 2, ports: { in: [w / 2, 1.2, 0], out: [-w / 2, 1.2, 0] } };
  },
  // well head: kiosk, pump motor and riser
  wellhead(b, {} = {}) {
    const M = b.M;
    b.box(M.concrete, 3, 0.3, 3, 0, 0.15, 0);
    b.cyl(M.steel, 0.35, 1.2, -0.6, 0.9, 0, 14); b.cyl(M.paintBlue, 0.4, 0.9, -0.6, 1.95, 0, 14);
    b.box(M.cabinet, 1, 1.6, 0.5, 0.8, 1.1, 0.6);
    return { height: 2.6, radius: 1.6, ports: { out: [0.8, 1.2, 0], in: [0.8, 1.2, 0.6] } };
  },
  // local control / motor control cabinet with a status light
  cabinet(b, { w = 1.2, h = 2 } = {}) {
    const M = b.M;
    b.box(M.cabinet, w, h, 0.5, 0, 0.15 + h / 2, 0); b.box(M.darkSteel, w + 0.1, 0.15, 0.6, 0, 0.075, 0);
    b.box(M.signal, 0.12, 0.12, 0.04, w / 2 - 0.2, h - 0.15, 0.26);
    return { height: h + 0.2, radius: 0.7, ports: { in: [0, h * 0.6, 0.25], out: [0, h * 0.6, -0.25] } };
  },
  // fire hydrant
  hydrant(b, {} = {}) {
    const M = b.M;
    b.cyl(M.fireRed, 0.16, 0.9, 0, 0.45, 0, 10); b.cyl(M.fireRed, 0.2, 0.12, 0, 0.92, 0, 10); b.rod(M.fireRed, 0.07, [-0.25, 0.6, 0], [0.25, 0.6, 0], 8);
    return { height: 1, radius: 0.3, ports: { in: [0, 0.4, 0] } };
  },
  // waste skip
  skip(b, { color = "paintBlue" } = {}) {
    const M = b.M;
    b.add(M[color], new THREE.CylinderGeometry(1.6, 1.15, 1.4, 4, 1), b.T(0, 0.75, 0, Math.PI / 4, 0, 0, [1.3, 1, 0.7]));
    return { height: 1.5, radius: 2, ports: {} };
  },
  // environmental monitoring mast: lattice pole, wind sensors, solar panel, analyser box
  monitor(b, { h = 10 } = {}) {
    const M = b.M;
    b.box(M.concrete, 1.2, 0.3, 1.2, 0, 0.15, 0);
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [0, 0.22]]) b.rod(M.galv, 0.03, [x, 0.3, z], [x * 0.4, h, z * 0.4], 4);
    for (let y = 1; y < h; y += 1) b.torus(M.galv, 0.18, 0.015, 0, y, 0);
    b.rod(M.galv, 0.02, [0, h, 0], [0.9, h, 0], 4); b.cone(M.white, 0.15, 0.25, 0.9, h + 0.15, 0, 8);
    b.box(M.darkSteel, 0.9, 0.05, 0.6, -0.3, h * 0.55, 0.4);
    b.box(M.cabinet, 0.7, 1, 0.4, 0, 1.0, 0.5);
    return { height: h + 0.4, radius: 0.8, ports: { in: [0, 1, 0.7] } };
  },
  // concrete bunker (three walls) holding a heap of wet distillers grain
  bunker(b, { w = 18, d = 10, h = 3 } = {}) {
    const M = b.M;
    b.box(M.concrete, w, 0.25, d, 0, 0.12, 0);
    b.box(M.concrete, w, h, 0.5, 0, h / 2, -d / 2); b.box(M.concrete, 0.5, h, d, -w / 2, h / 2, 0); b.box(M.concrete, 0.5, h, d, w / 2, h / 2, 0);
    b.add(M.wdg, new THREE.ConeGeometry(d * 0.55, h * 0.9, 7), b.T(-w * 0.2, h * 0.45 + 0.25, -d * 0.05, 0.4, 0, 0, [1.4, 1, 1]));
    b.add(M.wdg, new THREE.ConeGeometry(d * 0.45, h * 0.7, 7), b.T(w * 0.22, h * 0.35 + 0.25, -d * 0.1, 1.1, 0, 0, [1.2, 1, 1]));
    return { height: h + 0.5, radius: Math.max(w, d) / 2, ports: { in: [0, h + 0.4, -d / 2], out: [w / 2, 1, 0] } };
  },
  // pipeline terminal at the site boundary (pig trap style), with a sign post
  terminal(b, {} = {}) {
    const M = b.M;
    b.box(M.concrete, 4, 0.3, 2.4, 0, 0.15, 0);
    b.add(M.steel, new THREE.CylinderGeometry(0.4, 0.4, 3, 16), b.T(0, 1.2, 0, 0, 0, Math.PI / 2));
    for (const x of [-1, 1]) b.box(M.paintGrey, 0.3, 1, 0.6, x, 0.6, 0);
    b.cyl(M.cabRed, 0.22, 0.4, 0.4, 1.8, 0, 10);
    b.box(M.paintGrey, 0.1, 2.4, 0.1, -1.6, 1.2, 0.9); b.box(M.paintGreen, 1.6, 0.8, 0.06, -1.6, 2.2, 0.9);
    return { height: 2.6, radius: 2, ports: { in: [-1.5, 1.2, 0], out: [1.5, 1.2, 0] } };
  },
  // bucket-elevator tower with head house
  elevator(b, { h = 34 } = {}) {
    const M = b.M;
    b.box(M.concrete, 4, 0.5, 4, 0, 0.25, 0);
    b.box(M.paintGrey, 1.4, h, 1.4, -0.9, h / 2, 0); b.box(M.paintGrey, 1.4, h, 1.4, 0.9, h / 2, 0);
    b.box(M.wallPanel, 4.2, 4, 4.2, 0, h + 2, 0); b.box(M.roof, 4.6, 0.3, 4.6, 0, h + 4.15, 0);
    for (let y = 6; y < h; y += 6) { b.box(M.grating, 3.4, 0.06, 3.4, 0, y, 0); rectRail(b, 3.4, 3.4, y); }
    ladder(b, 0, 2.1, 0, h, Math.PI / 2);
    return { height: h + 4.5, radius: 2.5, ports: {} };
  }
};

/** Build one equipment item. Returns { group, info } (info: height, radius, ports in local space). */
export function buildEquipment(M, type, params = {}) {
  const gen = G[type];
  if (!gen) throw new Error(`unknown equipment type "${type}"`);
  const b = createBuilder(M);
  const info = gen(b, params);
  const group = b.group(type);
  return { group, info };
}
export const EQUIPMENT_TYPES = Object.keys(G);
