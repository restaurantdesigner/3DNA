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
    steel: std({ color: 0xb9c0c8, metalness: 0.75, roughness: 0.32 }),
    cladding: std({ color: 0xd8dde3, metalness: 0.6, roughness: 0.38, map: tex.cladding }),
    white: std({ color: 0xeef1f4, metalness: 0.15, roughness: 0.45 }),
    paintBlue: std({ color: 0x23508f, metalness: 0.3, roughness: 0.45 }),
    paintGreen: std({ color: 0x2f6b4f, metalness: 0.3, roughness: 0.5 }),
    paintGrey: std({ color: 0x5c6470, metalness: 0.35, roughness: 0.55 }),
    darkSteel: std({ color: 0x2d323a, metalness: 0.6, roughness: 0.45 }),
    yellow: std({ color: 0xf2b705, metalness: 0.2, roughness: 0.5 }),
    orange: std({ color: 0xe1661c, metalness: 0.25, roughness: 0.5 }),
    concrete: std({ color: 0x8e918f, roughness: 0.92, map: tex.concrete }),
    asphalt: std({ color: 0x2a2d33, roughness: 0.96, map: tex.asphalt }),
    grass: std({ color: 0x1c2418, roughness: 1 }),
    grating: std({ color: 0x8b939c, metalness: 0.5, roughness: 0.5, map: tex.grating, transparent: true, alphaTest: 0.35 }),
    wallPanel: std({ color: 0xc9ced4, metalness: 0.3, roughness: 0.5, map: tex.panel }),
    wallDark: std({ color: 0x3b4350, metalness: 0.3, roughness: 0.55, map: tex.panel }),
    roof: std({ color: 0x8e959e, metalness: 0.45, roughness: 0.45, map: tex.panel }),
    glass: std({ color: 0x9fc2e6, metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.55, emissive: 0x2a4a6a, emissiveIntensity: 0.35 }),
    windowLit: std({ color: 0xfff1c8, emissive: 0xffc56e, emissiveIntensity: 1.6 }),
    rubber: std({ color: 0x15171a, roughness: 0.85 }),
    silo: std({ color: 0xe3e6e9, metalness: 0.65, roughness: 0.35, map: tex.corrugated }),
    tankerBody: std({ color: 0xd9dde2, metalness: 0.8, roughness: 0.25 }),
    cabRed: std({ color: 0xb3261e, metalness: 0.3, roughness: 0.4 }),
    insulation: std({ color: 0xc8ccd1, metalness: 0.8, roughness: 0.28, map: tex.bands })
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
    bands: make(64, 64, (x, w, h) => { x.fillStyle = "#cfd3d8"; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(0,0,0,.2)"; x.fillRect(0, 0, w, 2); x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(0, 3, w, 1); }, [6, 10])
  };
}

// ------------------------------------------------------------------ builder: parts collected per material, merged once
export function createBuilder(M) {
  const lists = new Map();
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
function nozzles(b, r, y, n, a0 = 0, len = 0.6, rr = 0.18) {
  for (let i = 0; i < n; i++) { const t = a0 + (i / n) * Math.PI * 2; b.rod(b.M.steel, rr, [Math.cos(t) * r, y, Math.sin(t) * r], [Math.cos(t) * (r + len), y, Math.sin(t) * (r + len)], 12); b.rod(b.M.steel, rr * 1.5, [Math.cos(t) * (r + len - 0.05), y, Math.sin(t) * (r + len - 0.05)], [Math.cos(t) * (r + len + 0.05), y, Math.sin(t) * (r + len + 0.05)], 12); }
}

// ------------------------------------------------------------------ generators
const G = {
  // vertical storage tank / fermenter: cladding rings, cone or dome roof, top railing, caged ladder
  tank(b, { r = 6, h = 12, roof = "cone", mat = "white", ladder: lad = true, legs = 0, base = 0.4 } = {}) {
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
  pipeRack(b, { len = 120, w = 8, h = 8, bay = 8 } = {}) {
    const M = b.M;
    for (let x = -len / 2; x <= len / 2 + 0.01; x += bay) {
      for (const z of [-w / 2, w / 2]) { b.box(M.concrete, 0.9, 0.5, 0.9, x, 0.25, z); b.box(M.paintGrey, 0.4, h + 2.4, 0.4, x, (h + 2.4) / 2, z); }
      b.box(M.paintGrey, 0.35, 0.45, w + 0.4, x, h, 0); b.box(M.paintGrey, 0.35, 0.45, w + 0.4, x, h + 2.2, 0);
    }
    for (const z of [-w / 2, w / 2]) for (const y of [h, h + 2.2]) b.box(M.paintGrey, len, 0.3, 0.25, 0, y + 0.05, z);
    return { height: h + 2.6, radius: len / 2, ports: {} };
  },
  canopy(b, { w = 24, d = 14, h = 7 } = {}) {
    const M = b.M;
    b.box(M.concrete, w + 2, 0.3, d + 2, 0, 0.15, 0);
    for (const x of [-w / 2 + 1, 0, w / 2 - 1]) for (const z of [-d / 2 + 1, d / 2 - 1]) b.box(M.paintGrey, 0.4, h, 0.4, x, h / 2, z);
    b.box(M.roof, w, 0.5, d, 0, h + 0.25, 0);
    b.box(M.yellow, w, 0.4, 0.2, 0, h - 0.1, d / 2);
    for (const x of [-w / 4, w / 4]) { b.box(M.paintGrey, 1.2, 4, 1.2, x, 2, 0); b.rod(M.steel, 0.1, [x, 4, 0], [x, 4.8, 2.6], 8); }
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
