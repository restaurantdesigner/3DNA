/*
 * Shared architectural-visualisation kit for the homepage 3D scenes
 * (fitness planner: assets/js/fitness-3d/, hospital naming: assets/js/healthcare-3d/).
 *
 * Same techniques as the Fitness page club (assets/js/fitness-club-3d/), kept
 * separate so that model stays untouched:
 *   - image-based lighting (RoomEnvironment) + one soft shadowed key light
 *   - canvas-generated floor / surface textures (no downloads)
 *   - a procedural model builder: rounded boxes, tubes, swept rails, lathes,
 *     merged into one geometry per material and cached per model key
 *   - a geometry merge that accepts indexed and non-indexed inputs
 *   - an exact "fit the whole building" camera distance
 */
import * as THREE from "three";
import { mergeGeometries as mergeRaw } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export { RoundedBoxGeometry };

// all inputs indexed (RoundedBoxGeometry is not), so mixed lists merge
export const mergeGeometries = (list, groups = false) => mergeRaw(list.map((g) => {
  if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
  return g;
}), groups);

// ---------------------------------------------------------------------------
// renderer, environment, lights
// ---------------------------------------------------------------------------
export function createRenderer({ lowPower, exposure = 1.1, className = "" }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (className) renderer.domElement.className = className;
  return renderer;
}

/** Image-based fill + hemisphere + one warm key light (shadowed) + a cool rim. */
export function setupLighting(renderer, scene, { center, span, hemi = [0xdde8ff, 0x24211e, 0.8], key = 0xfff1e2, keyIntensity = 1.9, keyFrom = [-0.35, 1, 0.6], fill = [0x9cc4ff, 0.45] }) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(hemi[0], hemi[1], hemi[2]));
  const sun = new THREE.DirectionalLight(key, keyIntensity);
  const d = span * 0.9;
  sun.position.set(center.x + keyFrom[0] * d, keyFrom[1] * d * 1.1, center.z + keyFrom[2] * d);
  sun.target.position.copy(center);
  scene.add(sun, sun.target);
  if (renderer.shadowMap.enabled) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const h = span * 0.62;
    Object.assign(sun.shadow.camera, { left: -h, right: h, top: h, bottom: -h, near: 2, far: span * 3 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
  }
  if (fill) {
    const f = new THREE.DirectionalLight(fill[0], fill[1]);
    f.position.set(center.x + span, span * 0.5, center.z - span * 0.6);
    scene.add(f);
  }
  return sun;
}

// ---------------------------------------------------------------------------
// materials
// ---------------------------------------------------------------------------
export const BASE_MATS = {
  frame:       { color: 0x272a2e, roughness: 0.38, metalness: 0.65 },
  chrome:      { color: 0xe4e7ea, roughness: 0.16, metalness: 1 },
  steel:       { color: 0x8f959b, roughness: 0.32, metalness: 0.85 },
  pad:         { color: 0x161618, roughness: 0.5 },
  rubber:      { color: 0x111213, roughness: 0.85 },
  rubberGrip:  { color: 0x2a2c30, roughness: 0.95 },
  plate:       { color: 0x18191b, roughness: 0.55, metalness: 0.25 },
  screen:      { color: 0x05080d, roughness: 0.2, emissive: 0x2a64a8, emissiveIntensity: 0.9 },
  screenBright:{ color: 0x05080d, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 1.1, emissiveMap: "screen" },
  glass:       { color: 0xc6dbe4, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false },
  mirror:      { color: 0x93a3ad, roughness: 0.05, metalness: 1 },
  oak:         { color: 0xa97c52, roughness: 0.55 },
  oakLocker:   { color: 0xae8459, roughness: 0.5 },
  walnut:      { color: 0x4a3324, roughness: 0.5 },
  stone:       { color: 0xe4e0d8, roughness: 0.28 },
  tile:        { color: 0xc9c4bb, roughness: 0.35 },
  fabric:      { color: 0x55524e, roughness: 0.95 },
  fabricLight: { color: 0x8d867c, roughness: 0.95 },
  fabricDark:  { color: 0x2b2c31, roughness: 0.9 },
  leather:     { color: 0x7a4a2b, roughness: 0.48 },
  white:       { color: 0xf0efeb, roughness: 0.5 },
  led:         { color: 0x000000, emissive: 0xeaf4ff, emissiveIntensity: 2.4 },
  ledWarm:     { color: 0x000000, emissive: 0xffd2a0, emissiveIntensity: 2.0 },
  ledBlue:     { color: 0x000000, emissive: 0x4aa2ff, emissiveIntensity: 2.6 },
  leaf:        { color: 0x3a5e36, roughness: 0.75 },
  trunk:       { color: 0x4a3a2c, roughness: 0.9 },
  pot:         { color: 0x2c2c2e, roughness: 0.65 },
  rock:        { color: 0x55575b, roughness: 0.9 },
  water:       { color: 0x4f9fbf, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.78, emissive: 0x0a3550, emissiveIntensity: 0.6 },
  sauna:       { color: 0xc59b6b, roughness: 0.7 },
  saunaDark:   { color: 0x6e4f34, roughness: 0.8 },
  mat:         { color: 0x2c2e33, roughness: 0.95 },
  matLight:    { color: 0x66717c, roughness: 0.85 },
  track:       { color: 0xffffff, roughness: 0.9, map: "track" },
  rug:         { color: 0xffffff, roughness: 1, map: "rug" },
  accent:      { color: 0x2f6fb8, roughness: 0.4, metalness: 0.3 },
  darkStep:    { color: 0x1b1c1f, roughness: 0.8 },
};

/** Material factory: makeMat(key) always returns a NEW material (per zone highlight). */
export function createMaterials(textures, palette = {}) {
  const P = { ...BASE_MATS, ...palette };
  const shared = {};
  function makeMat(key) {
    const p = { ...(P[key] || P.frame) };
    ["map", "emissiveMap"].forEach((slot) => { if (typeof p[slot] === "string") p[slot] = textures[p[slot]]; });
    const m = new THREE.MeshStandardMaterial(p);
    m.envMapIntensity = key === "mirror" || key === "chrome" || key === "glass" ? 1.2 : 0.7;
    m.userData.key = key;
    m.userData.baseColor = m.color.clone();
    m.userData.baseEmissive = m.emissiveIntensity;
    return m;
  }
  return { makeMat, shared: (key) => shared[key] || (shared[key] = makeMat(key)), palette: P };
}

/** Flat, textured or plain surface material (floors, walls). */
export function surfaceMat(textures, texKey, { color = 0xffffff, roughness = 0.6, metalness = 0, repeat = [1, 1] } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  if (texKey && textures[texKey]) {
    m.map = textures[texKey].clone();
    m.map.needsUpdate = true;
    m.map.repeat.set(repeat[0], repeat[1]);
  }
  m.envMapIntensity = 0.6;
  m.userData.baseColor = m.color.clone();
  m.userData.baseEmissive = 0;
  return m;
}

// ---------------------------------------------------------------------------
// canvas textures
// ---------------------------------------------------------------------------
export function makeTextures(renderer, seed = 7) {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  let a = seed;
  const rnd = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const tex = (size, draw, { repeat = true, h = size } = {}) => {
    const c = document.createElement("canvas");
    c.width = size; c.height = h;
    draw(c.getContext("2d"), size, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, maxAniso);
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  const speckle = (g, s, h, n, colors, rMax = 2) => {
    for (let i = 0; i < n; i++) { g.fillStyle = colors[i % colors.length]; g.fillRect(rnd() * s, rnd() * h, 1 + rnd() * rMax, 1 + rnd() * rMax); }
  };
  const mottle = (g, s, n, alpha) => {
    for (let i = 0; i < n; i++) {
      const x = rnd() * s, y = rnd() * s, r = 20 + rnd() * 70;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const c = rnd() > 0.5 ? "255,255,255" : "0,0,0";
      gr.addColorStop(0, `rgba(${c},${alpha})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  };
  const planks = (g, s, base, spread, plankW, grainA) => {
    const rows = Math.round(1 / plankW);
    const ph = s / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * s * 0.5;
      while (x < s) {
        const len = s * (0.35 + rnd() * 0.4);
        const k = (rnd() - 0.5) * spread;
        g.fillStyle = `rgb(${base[0] + k},${base[1] + k * 0.8},${base[2] + k * 0.6})`;
        g.fillRect(x, r * ph, len, ph);
        g.strokeStyle = `rgba(30,18,10,${grainA})`;
        for (let j = 0; j < 7; j++) {
          const y = r * ph + rnd() * ph;
          g.lineWidth = 0.6 + rnd();
          g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len * 0.3, y + (rnd() - 0.5) * 6, x + len * 0.7, y + (rnd() - 0.5) * 6, x + len, y); g.stroke();
        }
        g.fillStyle = "rgba(20,12,6,.5)"; g.fillRect(x, r * ph, 1.5, ph);
        x += len;
      }
      g.fillStyle = "rgba(20,12,6,.4)"; g.fillRect(0, r * ph, s, 1.2);
    }
  };
  const grid = (g, s, n, line, width) => {
    const t = s / n; g.strokeStyle = line; g.lineWidth = width;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, s); g.moveTo(0, i * t); g.lineTo(s, i * t); g.stroke(); }
  };
  const T = {
    oak: tex(1024, (g, s) => planks(g, s, [168, 124, 84], 34, 1 / 12, 0.12)),
    oakLight: tex(1024, (g, s) => planks(g, s, [205, 172, 128], 22, 1 / 10, 0.08)),
    sprung: tex(1024, (g, s) => planks(g, s, [184, 146, 102], 26, 1 / 16, 0.1)),
    rubber: tex(512, (g, s) => { g.fillStyle = "#303236"; g.fillRect(0, 0, s, s); speckle(g, s, s, 5200, ["#43464c", "#50535a", "#24252a", "#36506c"]); }),
    rubberThick: tex(512, (g, s) => {
      g.fillStyle = "#1f2023"; g.fillRect(0, 0, s, s); speckle(g, s, s, 3200, ["#303236", "#16171a", "#3a3c41"]);
      g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 2; [0, s / 2].forEach((p) => { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.moveTo(0, p); g.lineTo(s, p); g.stroke(); });
    }),
    turf: tex(512, (g, s) => {
      g.fillStyle = "#4f5b45"; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 14000; i++) { const v = (rnd() - 0.5) * 30; g.fillStyle = `rgb(${80 + v},${94 + v},${70 + v * 0.8})`; g.fillRect(rnd() * s, rnd() * s, 1, 2 + rnd() * 3); }
    }),
    dark: tex(512, (g, s) => { g.fillStyle = "#151619"; g.fillRect(0, 0, s, s); speckle(g, s, s, 2400, ["#1d1e22", "#101113"]); }),
    tile: tex(512, (g, s) => {
      const n = 4, t = s / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const k = (rnd() - 0.5) * 10; g.fillStyle = `rgb(${190 + k},${186 + k},${178 + k})`; g.fillRect(i * t, j * t, t, t); }
      speckle(g, s, s, 1500, ["rgba(120,115,108,.35)", "rgba(230,226,220,.4)"]);
      grid(g, s, n, "#8f8a83", 2);
    }),
    tileWhite: tex(512, (g, s) => {
      const n = 6, t = s / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const k = (rnd() - 0.5) * 6; g.fillStyle = `rgb(${236 + k},${236 + k},${232 + k})`; g.fillRect(i * t, j * t, t, t); }
      grid(g, s, n, "#c9c6bf", 2);
    }),
    concrete: tex(512, (g, s) => { g.fillStyle = "#4e5054"; g.fillRect(0, 0, s, s); mottle(g, s, 90, 0.05); speckle(g, s, s, 1600, ["rgba(255,255,255,.08)", "rgba(0,0,0,.12)"]); }),
    concreteLight: tex(512, (g, s) => { g.fillStyle = "#cfcbc3"; g.fillRect(0, 0, s, s); mottle(g, s, 90, 0.05); speckle(g, s, s, 1600, ["rgba(255,255,255,.18)", "rgba(0,0,0,.06)"]); }),
    terrazzo: tex(1024, (g, s) => {
      g.fillStyle = "#e9e5de"; g.fillRect(0, 0, s, s); mottle(g, s, 60, 0.03);
      for (let i = 0; i < 2600; i++) {
        const c = ["#bfb6a8", "#9a9387", "#d8cfc0", "#7f8a86", "#c9b79c"][i % 5];
        g.fillStyle = c; g.beginPath(); g.ellipse(rnd() * s, rnd() * s, 1 + rnd() * 4, 1 + rnd() * 3, rnd() * 3, 0, 7); g.fill();
      }
      grid(g, s, 2, "rgba(150,144,134,.5)", 2);
    }),
    vinyl: tex(512, (g, s) => { g.fillStyle = "#dfe6e3"; g.fillRect(0, 0, s, s); mottle(g, s, 70, 0.025); speckle(g, s, s, 3000, ["rgba(140,160,156,.25)", "rgba(255,255,255,.4)"], 1.5); }),
    vinylWarm: tex(512, (g, s) => { g.fillStyle = "#e8e1d4"; g.fillRect(0, 0, s, s); mottle(g, s, 70, 0.025); speckle(g, s, s, 3000, ["rgba(160,145,120,.22)", "rgba(255,255,255,.4)"], 1.5); }),
    carpet: tex(512, (g, s) => { g.fillStyle = "#8d8a83"; g.fillRect(0, 0, s, s); speckle(g, s, s, 16000, ["#97948c", "#827f78", "#a19d94"], 1.2); }),
    rug: tex(512, (g, s) => {
      g.fillStyle = "#3f3c39"; g.fillRect(0, 0, s, s); speckle(g, s, s, 9000, ["#47433f", "#36332f", "#4d4a46"], 1.5);
      g.strokeStyle = "#8a7f72"; g.lineWidth = 6; g.strokeRect(18, 18, s - 36, s - 36);
    }, { repeat: false }),
    rugLight: tex(512, (g, s) => {
      g.fillStyle = "#cfc6b6"; g.fillRect(0, 0, s, s); speckle(g, s, s, 9000, ["#d8d0c1", "#c4baa8", "#ddd6c8"], 1.5);
      g.strokeStyle = "#a8997f"; g.lineWidth = 5; g.strokeRect(16, 16, s - 32, s - 32);
    }, { repeat: false }),
    track: tex(2048, (g, s, h) => {
      g.fillStyle = "#16171a"; g.fillRect(0, 0, s, h); speckle(g, s, h, 6000, ["#202226", "#0f1012"]);
      g.fillStyle = "#e9ecef"; g.fillRect(0, 10, s, 7); g.fillRect(0, h - 17, s, 7);
      g.font = "600 34px Inter, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      for (let m = 1; m < 10; m++) {
        const x = (m / 10) * s;
        g.fillRect(x - 2, 30, 4, m % 2 ? 40 : 70);
        g.fillRect(x - 2, h - 30 - (m % 2 ? 40 : 70), 4, m % 2 ? 40 : 70);
        if (m % 2 === 0) g.fillText(String(m).padStart(2, "0"), x, h / 2);
      }
    }, { h: 288 }),
    screen: tex(512, (g, s, h) => {
      const gr = g.createLinearGradient(0, 0, s, h);
      gr.addColorStop(0, "#0d2a5c"); gr.addColorStop(0.55, "#2f7ad6"); gr.addColorStop(1, "#7fd0ff");
      g.fillStyle = gr; g.fillRect(0, 0, s, h);
      g.fillStyle = "rgba(255,255,255,.85)";
      for (let i = 0; i < 18; i++) { const bh = 20 + rnd() * 110; g.fillRect(40 + i * 24, h - 40 - bh, 12, bh); }
      g.fillRect(40, 50, 180, 18); g.fillRect(40, 80, 110, 12);
    }, { repeat: false, h: 170 }),
    shadow: tex(256, (g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s / 2);
      gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    }, { repeat: false }),
  };
  return T;
}

// ---------------------------------------------------------------------------
// procedural model builder
// ---------------------------------------------------------------------------
/**
 * createModelKit() -> { define(key, fn), get(key), has(key), h }
 * fn(h) builds one model with the helpers in h (front / user side = +Z,
 * origin on the floor at the footprint centre). get(key) returns
 * [{ mat, geometry }], one merged geometry per material, cached.
 */
export function createModelKit() {
  const defs = {};
  const cache = new Map();
  let parts = null;
  const frames = [new THREE.Matrix4()];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const UP = V(0, 1, 0);

  function add(mat, g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    if (rx || ry || rz) g.applyMatrix4(tmpM.makeRotationFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")));
    g.translate(x, y, z);
    g.applyMatrix4(frames[frames.length - 1]);
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    parts.push([mat, g]);
  }
  const h = {
    add,
    G(x, y, z, rx, ry, rz, fn) {
      const m = new THREE.Matrix4().compose(V(x, y, z), tmpQ.setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, "YXZ")).clone(), V(1, 1, 1));
      frames.push(frames[frames.length - 1].clone().multiply(m));
      fn();
      frames.pop();
    },
    B: (w, hh, d, mat, x, y, z, rx, ry, rz) => add(mat, new THREE.BoxGeometry(w, hh, d), x, y, z, rx, ry, rz),
    RB: (w, hh, d, r, mat, x, y, z, rx, ry, rz) => {
      const rr = Math.max(0.002, Math.min(r, Math.min(w, hh, d) / 2 - 0.001));
      add(mat, new RoundedBoxGeometry(w, hh, d, 2, rr), x, y, z, rx, ry, rz);
    },
    CY: (r, len, mat, x, y, z, axis = "y", seg = 16, r2 = r) => {
      const g = new THREE.CylinderGeometry(r2, r, len, seg);
      if (axis === "x") g.rotateZ(Math.PI / 2);
      if (axis === "z") g.rotateX(Math.PI / 2);
      add(mat, g, x, y, z);
    },
    S: (r, mat, x, y, z, sx = 1, sy = 1, sz = 1, seg = 14) => {
      const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.7 | 0));
      if (sx !== 1 || sy !== 1 || sz !== 1) g.scale(sx, sy, sz);
      add(mat, g, x, y, z);
    },
    TOR: (r, tube, mat, x, y, z, rx = 0, ry = 0, arc = Math.PI * 2, seg = 20) => add(mat, new THREE.TorusGeometry(r, tube, 6, seg, arc), x, y, z, rx, ry),
    T: (a, b, r, mat, seg = 10) => {
      const A = V(...a), Bv = V(...b);
      const dir = Bv.clone().sub(A);
      const g = new THREE.CylinderGeometry(r, r, dir.length(), seg);
      g.applyQuaternion(tmpQ.setFromUnitVectors(UP, dir.normalize()));
      g.translate((A.x + Bv.x) / 2, (A.y + Bv.y) / 2, (A.z + Bv.z) / 2);
      add(mat, g);
    },
    P: (pts, r, mat, seg = 8, steps = 28) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)), false, "centripetal");
      add(mat, new THREE.TubeGeometry(curve, steps, r, seg, false));
    },
    LATHE: (pts, mat, x, y, z, seg = 20) => add(mat, new THREE.LatheGeometry(pts.map(([px, py]) => new THREE.Vector2(px, py)), seg), x, y, z),
    PLANE: (w, d, mat, x, y, z) => add(mat, new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), x, y, z),
    mirrorX: (fn) => { fn(1); fn(-1); },
  };

  function get(key) {
    if (cache.has(key)) return cache.get(key);
    parts = [];
    (defs[key] || (() => h.RB(0.6, 0.8, 0.6, 0.04, "frame", 0, 0.4, 0)))(h);
    const byMat = new Map();
    parts.forEach(([mat, g]) => { if (!byMat.has(mat)) byMat.set(mat, []); byMat.get(mat).push(g); });
    const result = [...byMat].map(([mat, list]) => {
      const geometry = list.length === 1 ? list[0] : mergeGeometries(list, false);
      list.forEach((g) => { if (g !== geometry) g.dispose(); });
      return { mat, geometry };
    });
    parts = null;
    cache.set(key, result);
    return result;
  }
  return { define: (key, fn) => { defs[key] = fn; }, get, has: (key) => key in defs, h };
}

/**
 * Bake placed copies of models into one merged mesh per material.
 * items: [{ k, p: [x, z], r (deg), n, s: [dx, dz], y }]; getParts(key) -> [{ mat, geometry }]
 * returns Map(matKey -> BufferGeometry)
 */
export function bakeItems(items, getParts) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  const byMat = new Map();
  items.forEach((it) => {
    const n = it.n || 1, st = it.s || [0, 0];
    const parts = getParts(it.k);
    for (let i = 0; i < n; i++) {
      q.setFromAxisAngle(up, THREE.MathUtils.degToRad(it.r || 0));
      m4.compose(new THREE.Vector3(it.p[0] + st[0] * i, it.y || 0, it.p[1] + st[1] * i), q, s1);
      parts.forEach(({ mat, geometry }) => {
        if (!byMat.has(mat)) byMat.set(mat, []);
        byMat.get(mat).push(geometry.clone().applyMatrix4(m4));
      });
    }
  });
  const out = new Map();
  byMat.forEach((list, key) => {
    const g = list.length === 1 ? list[0] : mergeGeometries(list, false);
    list.forEach((x) => { if (x !== g) x.dispose(); });
    out.set(key, g);
  });
  return out;
}

/** Straight wall / strip segment from a to b ([x, z]), height h, thickness t, base y0. */
export function segment(a, b, h, t, y0 = 0) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const g = new THREE.BoxGeometry(len, h, t);
  g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0]));
  g.translate((a[0] + b[0]) / 2, y0 + h / 2, (a[1] + b[1]) / 2);
  return g;
}

/**
 * Smallest camera distance (along dir from target) at which every point
 * projects inside |x| <= xLim, |y| <= yLim for a camera with the given fov/aspect.
 */
export function fitDistance(camera, target, dir, points, xLim = 0.94, yLim = 0.9) {
  const probe = camera.clone();
  probe.clearViewOffset();
  probe.updateProjectionMatrix();
  const fits = (d) => {
    probe.position.copy(target).addScaledVector(dir, d);
    probe.lookAt(target);
    probe.updateMatrixWorld();
    return points.every((c) => { const v = c.clone().project(probe); return Math.abs(v.x) <= xLim && Math.abs(v.y) <= yLim && v.z < 1; });
  };
  let lo = 4, hi = 400;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  return hi;
}
