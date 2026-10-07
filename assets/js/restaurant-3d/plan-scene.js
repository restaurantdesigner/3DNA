/*
 * Restaurants page — isometric 3D restaurant plan (ES module, lazy-loaded by plan-app.js).
 *
 * Geometry comes from assets/data/restaurant-plan.json (embedded in the page as
 * #rplan-data): zone floors, walls (cut at ~1.1 m so the plan reads from above),
 * furniture / equipment items and pendant lights. Units are metres; origin at
 * the back-left inner corner, +x to the right, +z towards the street.
 *
 * Style (approved direction): a premium architectural planning model — dark
 * structural perimeter with pilasters, warm stone floors, walnut and oak,
 * olive upholstery, a U-shaped bar with a slatted green front and lit back
 * bar, curved upholstered alcoves, warm pendant light with soft pools, a
 * planted pavement and thin dimension lines. Everything is built here from
 * simple shapes (no downloads) and merged per material: a few dozen draw
 * calls for the whole restaurant. Table-top details (plates, glasses,
 * bottles) are skipped on narrow screens to keep it calm.
 *
 * The orthographic camera uses exactly the projection of the build-time SVG
 * drawing (scripts/restaurant-plan.js), so the 3D model replaces the drawing
 * without a jump and the HTML zone labels keep their places.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// hospitality palette: premium but calm
const MATS = {
  walnut:     { color: 0x6a4630, roughness: 0.5 },
  walnutTop:  { color: 0x7a5236, roughness: 0.42 },
  oak:        { color: 0xbf9466, roughness: 0.6 },
  olive:      { color: 0x6f7552, roughness: 0.9 },          // dining chairs, stools
  oliveDark:  { color: 0x3f4a3c, roughness: 0.9 },          // private dining chairs
  leather:    { color: 0x9a6038, roughness: 0.5 },          // curved alcoves
  barFront:   { color: 0x2f3c33, roughness: 0.6 },          // slatted bar front
  linen:      { color: 0xd8cbb6, roughness: 0.95 },
  marble:     { color: 0xf0ebe3, roughness: 0.25 },
  brass:      { color: 0xc49a55, roughness: 0.32, metalness: 0.45 },
  brassShade: { color: 0xb48a48, roughness: 0.35, metalness: 0.4 },
  black:      { color: 0x24211f, roughness: 0.55, metalness: 0.1 },
  steel:      { color: 0xc4c8ca, roughness: 0.32, metalness: 0.35 },
  white:      { color: 0xf3f1ec, roughness: 0.55 },
  ceramic:    { color: 0xfcfbf8, roughness: 0.22 },
  plaster:    { color: 0xeee8de, roughness: 0.95 },
  structure:  { color: 0x2b2724, roughness: 0.85 },         // dark structural walls
  structureTop: { color: 0x47403a, roughness: 0.9 },        // their cut tops
  rug:        { color: 0xb7a58a, roughness: 1 },
  mat:        { color: 0x4a443e, roughness: 1 },
  pot:        { color: 0xb9ab98, roughness: 0.85 },
  concrete:   { color: 0xc9c2b6, roughness: 0.95 },
  paving:     { color: 0xddd6ca, roughness: 0.95 },
  trunk:      { color: 0x6b5442, roughness: 0.9 },
  leaf:       { color: 0x637f52, roughness: 0.8, flatShading: true },
  leafDark:   { color: 0x4b6a42, roughness: 0.8, flatShading: true },
  card:       { color: 0xc8a57a, roughness: 0.9 },
  amber:      { color: 0x9a5a22, roughness: 0.15 },
  bottle:     { color: 0x4f6b4b, roughness: 0.15 },
  clear:      { color: 0xdfe8e5, roughness: 0.1 },
  slab:       { color: 0xcfc7ba, roughness: 0.95 },
  glass:      { color: 0xdfeaec, roughness: 0.08, transparent: true, opacity: 0.2, depthWrite: false },
  mullion:    { color: 0x2b2724, roughness: 0.5 },
};
const FINISH = {
  wood:      { base: "#b98f66", line: "rgba(60,38,20,.25)", kind: "planks", size: 2 },
  stone:     { base: "#ece5d9", line: "rgba(130,116,98,.2)", kind: "tiles", size: 1.6, n: 2 },
  tile:      { base: "#dfe0dc", line: "rgba(110,110,104,.2)", kind: "tiles", size: 1.2, n: 4 },
  tileGreen: { base: "#7d8a78", line: "rgba(40,50,40,.25)", kind: "tiles", size: 1.2, n: 6 },
  service:   { base: "#e2ddd4", line: "rgba(110,100,90,.12)", kind: "tiles", size: 1.2, n: 1 },
};
const ACCENT = 0xc0682c;      // restrained orange: selected zone only
const WARM = 0xffc58a;        // lamp light

export async function createPlanScene({ container, labels, data, reducedMotion = false, ariaLabel = "", onSelect }) {
  const fine = window.matchMedia("(pointer: fine)").matches;
  const lowPower = !fine || (navigator.hardwareConcurrency || 8) <= 4;
  const rich = container.clientWidth >= 560;     // table-top details only where they can be seen
  const { width: W, depth: D } = data.floor;
  const H = data.wallHeight;

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = "rplan3d__canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", ariaLabel);
  container.insertBefore(canvas, container.firstChild);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();

  // ---------- camera: orthographic, same projection as the SVG ----------
  const E = data.view.extent;
  const target = new THREE.Vector3((E.x0 + E.x1) / 2, 0, (E.z0 + E.z1) / 2);
  const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 300);
  camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(80, data.view.polar, data.view.azimuth)));
  camera.lookAt(target);

  const A = data.view.azimuth, P = data.view.polar, M = data.view.margin;
  const rV = [Math.cos(A), 0, -Math.sin(A)];
  const uV = [-Math.cos(P) * Math.sin(A), Math.sin(P), -Math.cos(P) * Math.cos(A)];
  const proj = ([x, y, z]) => [x * rV[0] + y * rV[1] + z * rV[2], x * uV[0] + y * uV[1] + z * uV[2]];
  const pts = [];
  [0, H].forEach((y) => [[E.x0, E.z0], [E.x1, E.z0], [E.x0, E.z1], [E.x1, E.z1]].forEach(([x, z]) => pts.push(proj([x, y, z]))));
  const [tx, ty] = proj([target.x, target.y, target.z]);
  const bx0 = Math.min(...pts.map((p) => p[0])) - M - tx, bx1 = Math.max(...pts.map((p) => p[0])) + M - tx;
  const by0 = Math.min(...pts.map((p) => p[1])) - M - ty, by1 = Math.max(...pts.map((p) => p[1])) + M - ty;
  function fitCamera(w, h) {
    let l = bx0, r = bx1, b = by0, t = by1;
    const want = (r - l) / (t - b), have = w / h;
    if (have > want) { const extra = ((t - b) * have - (r - l)) / 2; l -= extra; r += extra; }
    else { const extra = ((r - l) / have - (t - b)) / 2; b -= extra; t += extra; }
    Object.assign(camera, { left: l, right: r, top: t, bottom: b });
    camera.updateProjectionMatrix();
  }

  // ---------- lights: soft warm daylight; lamp light added with the pendants ----------
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xd6c8b4, 1.3));
  const sun = new THREE.DirectionalLight(0xfff0dc, 1.35);
  sun.position.set(-6, 24, D + 12);
  sun.target.position.set(W / 2, 0, D / 2);
  scene.add(sun, sun.target);
  if (renderer.shadowMap.enabled) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 2, far: 70 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
  }

  // ---------- geometry bins (merged per material at the end) ----------
  const bins = new Map();
  const put = (mat, geo) => { if (!bins.has(mat)) bins.set(mat, []); bins.get(mat).push(geo); };
  const at = (g, x, y, z) => { g.translate(x, y, z); return g; };
  const B = (w, h, d, x, y, z) => at(new THREE.BoxGeometry(w, h, d), x, y, z);
  const RB = (w, h, d, r, x, y, z) => at(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), x, y, z);
  const C = (rt, rb, h, x, y, z, seg = 16) => at(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z);
  const box = (mat, ...a) => put(mat, B(...a));
  const rbox = (mat, ...a) => put(mat, RB(...a));
  const cyl = (mat, ...a) => put(mat, C(...a));
  // local-frame helper: parts built around the origin, turned by `a`, moved to (cx, cz)
  const local = (cx, cz, a) => (mat, g) => { g.rotateY(a); g.translate(cx, 0, cz); put(mat, g); };
  const rnd = ((seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647))(4242);

  // ---------- floors: slab, pavement, textured zone finishes ----------
  box("slab", W + 0.7, 0.26, D + 0.35, W / 2, -0.13, (D + 0.35) / 2 - 0.35);
  const texCache = new Map();
  function finishTexture(key) {
    if (texCache.has(key)) return texCache.get(key);
    const f = FINISH[key] || FINISH.service;
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d");
    g.fillStyle = f.base; g.fillRect(0, 0, 512, 512);
    if (f.kind === "planks") {
      const rows = 12, rh = 512 / rows;
      for (let r = 0; r < rows; r++) {
        let x = -rnd() * 300;
        while (x < 512) {
          const len = 180 + rnd() * 220, shade = (rnd() - 0.5) * 0.1;
          g.fillStyle = shade > 0 ? `rgba(255,248,236,${shade})` : `rgba(60,38,20,${-shade})`;
          g.fillRect(x, r * rh, len, rh);
          g.fillStyle = f.line; g.fillRect(x + len - 1, r * rh, 1.5, rh);
          x += len;
        }
        g.fillStyle = f.line; g.fillRect(0, r * rh, 512, 1.2);
      }
    } else {
      for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? "255,255,255" : "90,80,70"},${rnd() * 0.05})`; g.fillRect(rnd() * 512, rnd() * 512, 2, 2); }
      const n = f.n || 2;
      g.fillStyle = f.line;
      for (let i = 0; i <= n; i++) { const p = (i * 512) / n; g.fillRect(p - 1, 0, 2, 512); g.fillRect(0, p - 1, 512, 2); }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAniso;
    texCache.set(key, t);
    return t;
  }
  const floorPlane = (finish, x, z, w, d, y = 0.02) => {
    const f = FINISH[finish] || FINISH.service;
    const tex = finishTexture(finish).clone();
    tex.needsUpdate = true;
    tex.repeat.set(w / f.size, d / f.size);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: finish === "wood" ? 0.6 : 0.8 }));
    mesh.position.set(x + w / 2, y, z + d / 2);
    mesh.receiveShadow = true;
    scene.add(mesh);
  };
  data.zones.forEach((zn) => zn.rects.forEach(({ x, z, w, d }) => floorPlane(zn.finish, x, z, w, d)));

  // ---------- walls: dark structural shell with pilasters, glazed street front ----------
  const edges = [];
  data.walls.forEach((wl) => {
    const [x1, z1] = wl.from, [x2, z2] = wl.to;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ang = -Math.atan2(z2 - z1, x2 - x1);
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const seg = (w, h, d, y, mat) => { const g = new THREE.BoxGeometry(w, h, d); g.rotateY(ang); g.translate(cx, y, cz); put(mat, g); return g; };
    if (wl.type === "glass") {
      seg(len, H * 0.88, 0.04, H * 0.44, "glass");
      seg(len, 0.04, 0.08, H * 0.88, "mullion");
      seg(len, 0.12, 0.2, 0.06, "structure");
      const n = Math.max(1, Math.round(len / 1.6));
      for (let i = 0; i <= n; i++) box("mullion", 0.05, H * 0.88, 0.07, x1 + ((x2 - x1) * i) / n, H * 0.44, z1 + ((z2 - z1) * i) / n);
      return;
    }
    const th = wl.type === "exterior" ? 0.36 : 0.2;
    const g = seg(len + th, H - 0.03, th, (H - 0.03) / 2, "structure");
    seg(len + th, 0.03, th, H - 0.015, "structureTop");
    edges.push(new THREE.EdgesGeometry(g, 30));
    if (wl.type === "exterior") {
      // pilasters on the outer face every ~3.3 m
      const vertical = x1 === x2;
      const out = vertical ? (x1 === 0 ? -1 : 1) : (z1 === 0 ? -1 : 1);
      const n = Math.max(1, Math.round(len / 3.3));
      for (let i = 0; i <= n; i++) {
        const t = i / n, px = x1 + (x2 - x1) * t, pz = z1 + (z2 - z1) * t, o = out * (th / 2 + 0.1);
        if (vertical) box("structure", 0.2, H + 0.04, 0.5, px + o, (H + 0.04) / 2, pz);
        else box("structure", 0.5, H + 0.04, 0.2, px, (H + 0.04) / 2, pz + o);
      }
    }
  });

  // ---------- furniture ----------
  // upholstered dining chair with walnut frame (local: back towards -z, table towards +z)
  function chair(cx, cz, a, priv) {
    const add = local(cx, cz, a);
    const fab = priv ? "oliveDark" : "olive";
    [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]].forEach(([x, z]) => add("walnut", C(0.018, 0.015, 0.44, x, 0.22, z, 8)));
    add(fab, RB(0.48, 0.09, 0.46, 0.035, 0, 0.48, 0.01));
    const back = new THREE.CylinderGeometry(0.3, 0.3, 0.36, 18, 1, true, Math.PI - 0.75, 1.5);
    back.translate(0, 0.72, 0.1);
    add(fab, back);
    const rail = new THREE.TorusGeometry(0.3, 0.02, 6, 18, 1.5); rail.rotateX(Math.PI / 2); rail.rotateY(Math.PI / 2 + 0.75); rail.translate(0, 0.9, 0.1);
    add("walnut", rail);
  }
  const setting = (x, z, y = 0.778) => {
    if (!rich) return;
    cyl("ceramic", 0.11, 0.09, 0.014, x, y, z, 20);
    cyl("clear", 0.026, 0.02, 0.1, x + 0.13, y + 0.05, z - 0.06, 10);
  };
  function table(it) {
    const priv = it.zone === "private-dining";
    if (it.shape === "long") {
      const w = it.w || 1, d = it.d || 3;
      rbox("walnutTop", w, 0.05, d, 0.015, it.x, 0.75, it.z);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box("walnut", 0.07, 0.72, 0.07, it.x + sx * (w / 2 - 0.1), 0.36, it.z + sz * (d / 2 - 0.1)));
      const per = Math.ceil((it.chairs || 0) / 2);
      for (let i = 0; i < per; i++) {
        const z = it.z - d / 2 + (d / per) * (i + 0.5);
        chair(it.x - w / 2 - 0.25, z, Math.PI / 2, priv);
        chair(it.x + w / 2 + 0.25, z, -Math.PI / 2, priv);
        setting(it.x - w / 2 + 0.2, z); setting(it.x + w / 2 - 0.2, z);
      }
      if (rich) for (let i = 0; i < 3; i++) cyl("white", 0.03, 0.03, 0.08, it.x, 0.81, it.z - d / 3 + (d / 3) * i, 10);
      return;
    }
    const s = it.size || 0.8;
    if (it.shape === "square") {
      rbox("walnutTop", s, 0.04, s, 0.012, it.x, 0.755, it.z);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => cyl("walnut", 0.022, 0.016, 0.72, it.x + sx * (s / 2 - 0.06), 0.36, it.z + sz * (s / 2 - 0.06), 8));
    } else {
      cyl("walnutTop", s / 2, s / 2, 0.04, it.x, 0.755, it.z, 36);
      cyl("black", 0.04, 0.04, 0.7, it.x, 0.38, it.z, 10);
      cyl("black", s * 0.28, s * 0.3, 0.025, it.x, 0.013, it.z, 24);
    }
    const n = it.chairs || 0;
    const angles = it.chairAngles || Array.from({ length: n }, (_, i) => 45 + (360 / n) * i);
    const dist = s / 2 + 0.33;
    angles.slice(0, n).forEach((deg) => {
      const r = (deg * Math.PI) / 180;
      const cx = it.x + Math.cos(r) * dist, cz = it.z + Math.sin(r) * dist;
      chair(cx, cz, Math.atan2(it.x - cx, it.z - cz), priv);
      setting(it.x + Math.cos(r) * (s / 2 - 0.16), it.z + Math.sin(r) * (s / 2 - 0.16));
    });
    if (rich) cyl("white", 0.028, 0.028, 0.07, it.x, 0.81, it.z, 10); // candle
  }
  function stool(cx, cz) {
    cyl("olive", 0.2, 0.19, 0.08, cx, 0.77, cz, 24);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const g = new THREE.CylinderGeometry(0.015, 0.017, 0.76, 8);
      g.rotateZ(-sx * 0.08); g.rotateX(sz * 0.08);
      g.translate(cx + sx * 0.12, 0.38, cz + sz * 0.12); put("walnut", g);
    });
    const ring = new THREE.TorusGeometry(0.15, 0.011, 6, 24); ring.rotateX(Math.PI / 2); ring.translate(cx, 0.3, cz); put("brass", ring);
  }
  function highTable(it) {
    cyl("marble", 0.36, 0.36, 0.035, it.x, 1.05, it.z, 32);
    cyl("black", 0.04, 0.04, 1.03, it.x, 0.52, it.z, 10);
    cyl("black", 0.25, 0.27, 0.025, it.x, 0.013, it.z, 24);
    for (let i = 0; i < (it.stools || 0); i++) {
      const a = (i / it.stools) * Math.PI * 2;
      stool(it.x, it.z + Math.cos(a) * 0.62);
    }
  }
  // curved upholstered alcove: half ring open towards +x, tufted panels, walnut cap, sconces
  function alcove(it) {
    const r = it.r || 1.1, segs = 14;
    for (let i = 0; i < segs; i++) {
      const a0 = Math.PI / 2 + (Math.PI * i) / segs, a1 = Math.PI / 2 + (Math.PI * (i + 1)) / segs, am = (a0 + a1) / 2;
      const len = 2 * r * Math.sin((a1 - a0) / 2) + 0.01;
      const px = it.x + Math.cos(am) * r, pz = it.z + Math.sin(am) * r;
      const g = RB(0.16, 0.95, len - 0.02, 0.04, 0, 0.5, 0); g.rotateY(-am); g.translate(px, 0, pz); put("leather", g);
      const cap = B(0.2, 0.04, len, 0, 0.99, 0); cap.rotateY(-am); cap.translate(px + Math.cos(am) * 0.03, 0, pz + Math.sin(am) * 0.03); put("walnut", cap);
      const base = B(0.22, 0.1, len, 0, 0.05, 0); base.rotateY(-am); base.translate(px + Math.cos(am) * 0.03, 0, pz + Math.sin(am) * 0.03); put("walnut", base);
    }
    glowGeos.push(at(new THREE.SphereGeometry(0.05, 10, 8), it.x - r - 0.02, 1.04, it.z));
  }
  // bar run: slatted dark green front on the guest side, marble top with overhang, brass foot rail
  function barRun(it) {
    const { x, z, w, d } = it;
    const g = it.guest || "south";
    box("walnut", w, 1.0, d, x + w / 2, 0.5, z + d / 2);
    const over = 0.14;
    const ox = g === "west" ? -over / 2 : g === "east" ? over / 2 : 0, oz = g === "south" ? over / 2 : 0;
    rbox("marble", w + (g === "south" ? 0.04 : over), 0.05, d + (g === "south" ? over : 0.04), 0.015, x + w / 2 + ox, 1.075, z + d / 2 + oz);
    const slats = (along, from, to, fixed, horizontal) => {
      for (let p = from + 0.05; p < to - 0.03; p += rich ? 0.085 : 0.17) {
        if (horizontal) box("barFront", 0.055, 0.94, 0.035, p, 0.5, fixed);
        else box("barFront", 0.035, 0.94, 0.055, fixed, 0.5, p);
      }
    };
    if (g === "south") { box("barFront", w, 0.94, 0.02, x + w / 2, 0.5, z + d + 0.005); slats("x", x, x + w, z + d + 0.03, true); }
    if (g === "west") { box("barFront", 0.02, 0.94, d, x - 0.005, 0.5, z + d / 2); slats("z", z, z + d, x - 0.03, false); }
    if (g === "east") { box("barFront", 0.02, 0.94, d, x + w + 0.005, 0.5, z + d / 2); slats("z", z, z + d, x + w + 0.03, false); }
    const rail = g === "south"
      ? (() => { const r = new THREE.CylinderGeometry(0.02, 0.02, w - 0.1, 10); r.rotateZ(Math.PI / 2); r.translate(x + w / 2, 0.22, z + d + 0.22); return r; })()
      : (() => { const r = new THREE.CylinderGeometry(0.02, 0.02, d - 0.1, 10); r.rotateX(Math.PI / 2); r.translate(g === "west" ? x - 0.22 : x + w + 0.22, 0.22, z + d / 2); return r; })();
    put("brass", rail);
    if (rich && g === "south") [0.3, 0.42, 0.54].forEach((t) => cyl("brass", 0.018, 0.018, 0.2, x + w * t, 1.2, z + 0.12, 8));
  }
  function backBar(it) {
    const { x, z, w, d } = it;
    box("walnut", w, 0.92, d, x + w / 2, 0.46, z + d / 2);
    box("marble", w, 0.03, d + 0.02, x + w / 2, 0.935, z + d / 2);
    [1.22, 1.5].forEach((y) => box("oak", w - 0.2, 0.03, 0.26, x + w / 2, y, z + 0.13));
    [0.12, w / 3, (2 * w) / 3, w - 0.12].forEach((p) => box("black", 0.03, 0.75, 0.03, x + p, 1.3, z + 0.02));
    glowGeos.push(B(w - 0.24, 0.012, 0.04, x + w / 2, 1.2, z + 0.24), B(w - 0.24, 0.012, 0.04, x + w / 2, 1.48, z + 0.24));
    if (!rich) return;
    const kinds = ["amber", "bottle", "clear", "amber", "clear", "bottle"];
    let k = 0;
    [[0.95, 0.24], [1.235, 0.22], [1.515, 0.22]].forEach(([y, h]) => {
      for (let p = x + 0.2; p < x + w - 0.15; p += 0.15) {
        const r = 0.03 + (k % 3) * 0.004, bh = h * (0.75 + (k % 4) * 0.08);
        cyl(kinds[k++ % kinds.length], r, r, bh, p, y + bh / 2, z + 0.13, 10);
      }
    });
  }
  function plant(it) {
    const s = it.size || 0.6;
    cyl("pot", s * 0.32, s * 0.26, s * 0.55, it.x, s * 0.275, it.z, 20);
    for (let i = 0; i < 10; i++) {
      const g = new THREE.IcosahedronGeometry(s * (0.15 + rnd() * 0.12), 0);
      const a = rnd() * Math.PI * 2, r = rnd() * s * 0.32;
      g.translate(it.x + Math.cos(a) * r, s * (0.62 + rnd() * 0.8), it.z + Math.sin(a) * r);
      put(i % 3 ? "leaf" : "leafDark", g);
    }
  }
  function planter(it) {
    box("concrete", 0.75, 0.5, 0.75, it.x, 0.25, it.z);
    cyl("trunk", 0.04, 0.05, 0.9, it.x, 0.9, it.z, 8);
    for (let i = 0; i < 12; i++) {
      const g = new THREE.IcosahedronGeometry(0.2 + rnd() * 0.14, 0);
      const a = rnd() * Math.PI * 2, r = rnd() * 0.32;
      g.translate(it.x + Math.cos(a) * r, 1.3 + rnd() * 0.5, it.z + Math.sin(a) * r);
      put(i % 3 ? "leaf" : "leafDark", g);
    }
  }
  function shelving(it) {
    const { x, z, w, d } = it;
    [0.05, 0.4, 0.75, 1.0].forEach((y) => box("steel", w, 0.025, d, x + w / 2, y, z + d / 2));
    [[x + 0.02, z + 0.02], [x + w - 0.02, z + 0.02], [x + 0.02, z + d - 0.02], [x + w - 0.02, z + d - 0.02]].forEach(([px, pz]) => box("steel", 0.03, 1.0, 0.03, px, 0.5, pz));
    const long = w > d, L = long ? w : d;
    [0.065, 0.415, 0.765].forEach((y) => {
      for (let p = 0.14; p < L - 0.1; p += 0.32) {
        if (rnd() < 0.25) continue;
        const bw = 0.22 + rnd() * 0.06, bh = 0.18 + rnd() * 0.1;
        if (long) box("card", bw, bh, d * 0.7, x + p, y + bh / 2, z + d / 2);
        else box("card", w * 0.7, bh, bw, x + w / 2, y + bh / 2, z + p);
      }
    });
  }
  function kitchenCounter(it, { burners = false, sink = false, upstand = true } = {}) {
    const { x, z, w, d } = it;
    box("steel", w, 0.88, d, x + w / 2, 0.44, z + d / 2);
    box("steel", w, 0.03, d + 0.02, x + w / 2, 0.895, z + d / 2);
    if (upstand) box("steel", w, 0.12, 0.03, x + w / 2, 0.97, z + 0.015);
    if (burners) for (let p = x + 0.35; p < x + w - 0.3; p += 0.42) [-0.2, 0.2].forEach((o) => cyl("black", 0.11, 0.11, 0.02, p, 0.92, z + d / 2 + o, 16));
    if (sink) box("black", Math.min(0.5, w * 0.6), 0.02, Math.min(0.5, d * 0.4), x + w / 2, 0.915, z + d / 2);
  }

  const glowGeos = [];
  data.items.forEach((it) => {
    const cxr = it.x + (it.w || 0) / 2, czr = it.z + (it.d || 0) / 2;
    switch (it.type) {
      case "table": table(it); break;
      case "stool": stool(it.x, it.z); break;
      case "highTable": highTable(it); break;
      case "alcove": alcove(it); break;
      case "barRun": barRun(it); break;
      case "backBar": backBar(it); break;
      case "plant": plant(it); break;
      case "planter": planter(it); break;
      case "pavement": floorPlane("stone", it.x, it.z, it.w, it.d, 0.01); box("paving", it.w, 0.1, it.d, cxr, -0.05, czr); break;
      case "rug": box("rug", it.w, 0.012, it.d, cxr, 0.028, czr); break;
      case "mat": box("mat", it.w, 0.012, it.d, cxr, 0.028, czr); break;
      case "sideboard":
        box("walnut", it.w, 0.8, it.d, cxr, 0.4, czr);
        box("marble", it.w + 0.02, 0.03, it.d + 0.02, cxr, 0.815, czr);
        if (rich) { cyl("ceramic", 0.07, 0.05, 0.26, cxr, 0.96, it.z + it.d * 0.25, 16); cyl("brass", 0.05, 0.05, 0.12, cxr, 0.89, it.z + it.d * 0.7, 12); }
        break;
      case "hostStand":
        box("walnut", it.w, 1.0, it.d, cxr, 0.5, czr);
        box("brass", it.w + 0.04, 0.03, it.d + 0.04, cxr, 1.015, czr);
        break;
      case "bench":
        if (it.plain) { box("oak", it.w, 0.45, it.d, cxr, 0.225, czr); break; }
        box("walnut", it.w, 0.3, it.d, cxr, 0.15, czr);
        rbox("linen", it.w - 0.02, 0.12, it.d - 0.02, 0.04, cxr, 0.36, czr);
        rbox("linen", 0.12, 0.42, it.d - 0.02, 0.04, it.x + it.w - 0.06, 0.64, czr);
        break;
      case "kitchenCounter": kitchenCounter(it); break;
      case "cookline": kitchenCounter(it, { burners: true, upstand: false }); break;
      case "dishwash": kitchenCounter(it, { sink: true, upstand: false }); break;
      case "pass":
        kitchenCounter(it, { upstand: false });
        if (rich) for (let p = it.x + 0.2; p < it.x + it.w; p += 0.32) cyl("ceramic", 0.11, 0.09, 0.014, p, 0.92, czr, 18);
        break;
      case "coldRoom":
        box("white", it.w, 1.0, it.d, cxr, 0.5, czr);
        box("steel", 0.02, 0.9, 0.7, it.x + it.w + 0.01, 0.47, czr);
        break;
      case "lockers":
        box("white", it.w, 1.0, it.d, cxr, 0.5, czr);
        if (it.along === "x") for (let p = it.x + 0.3; p < it.x + it.w; p += 0.3) box("black", 0.01, 0.98, it.d + 0.01, p, 0.5, czr);
        else for (let p = it.z + 0.3; p < it.z + it.d; p += 0.3) box("black", it.w + 0.01, 0.98, 0.01, cxr, 0.5, p);
        break;
      case "shelving": shelving(it); break;
      case "partitionPanel": box("plaster", it.w, 0.95, it.d, cxr, 0.475, czr); break;
      case "wcPan":
        rbox("ceramic", 0.38, 0.4, 0.55, 0.12, it.x + 0.19, 0.2, it.z + 0.35);
        box("ceramic", 0.4, 0.3, 0.16, it.x + 0.19, 0.55, it.z + 0.08);
        break;
      case "vanity":
        box("walnut", it.w, 0.8, it.d, cxr, 0.4, czr);
        box("marble", it.w + 0.02, 0.04, it.d + 0.02, cxr, 0.82, czr);
        [0.3, 0.7].forEach((t) => cyl("ceramic", 0.16, 0.13, 0.05, it.x + it.w * t, 0.86, czr, 20));
        break;
      default:
        if (it.w) box("white", it.w, it.h || 0.9, it.d, cxr, (it.h || 0.9) / 2, czr);
    }
  });

  // ---------- pendant lights: shades, glowing bulbs, warm pools, a few real lights ----------
  const tablePools = [], floorPools = [];
  const pool = (list, x, y, z, r) => list.push(at(new THREE.PlaneGeometry(r * 2, r * 2).rotateX(-Math.PI / 2), x, y, z));
  let realLights = 0;
  const CEILING = 2.2; // cords run up to here (no ceiling is drawn)
  (data.lights || []).forEach((L) => {
    const small = !!L.small;
    const overBar = L.zone === "bar";
    const y = overBar ? 1.7 : L.style === "globe" ? 1.58 : 1.52;
    if (L.style === "globe") {
      const r = small ? 0.08 : 0.11;
      glowGeos.push(at(new THREE.SphereGeometry(r, 18, 12), L.x, y, L.z));
      cyl("brass", 0.03, 0.03, 0.03, L.x, y + r, L.z, 10);
    } else {
      const r = small ? 0.15 : 0.24;
      const shade = new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      shade.scale(1, 0.62, 1); shade.translate(L.x, y, L.z); put("brassShade", shade);
      glowGeos.push(at(new THREE.SphereGeometry(r * 0.3, 12, 8), L.x, y - 0.01, L.z));
    }
    cyl("black", 0.005, 0.005, CEILING - y, L.x, (CEILING + y) / 2, L.z, 6);
    pool(tablePools, L.x, overBar ? 1.108 : 0.785, L.z, small ? 0.42 : 0.6);
    pool(floorPools, L.x, 0.035, L.z, small ? 0.75 : 1.05);
    if (L.glow && realLights < 8) {
      const pl = new THREE.PointLight(WARM, 2.0, 3.6, 2);
      pl.position.set(L.x, 1.35, L.z);
      scene.add(pl);
      realLights++;
    }
  });

  // ---------- dimension lines (architectural drawing cue) ----------
  const dimPts = [];
  const seg2 = (a, b) => dimPts.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
  const dx = -0.85, dz = D + 2.0;
  seg2([dx, 0.01, 0], [dx, 0.01, D]); seg2([dx - 0.15, 0.01, 0], [dx + 0.15, 0.01, 0]); seg2([dx - 0.15, 0.01, D], [dx + 0.15, 0.01, D]);
  seg2([0, 0.01, dz], [W, 0.01, dz]); seg2([0, 0.01, dz - 0.15], [0, 0.01, dz + 0.15]); seg2([W, 0.01, dz - 0.15], [W, 0.01, dz + 0.15]);
  for (let x = 0; x <= W; x += 2) seg2([x, 0.01, dz - 0.06], [x, 0.01, dz + 0.06]);
  for (let z = 0; z <= D; z += 2) seg2([dx - 0.06, 0.01, z], [dx + 0.06, 0.01, z]);
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(dimPts), new THREE.LineBasicMaterial({ color: 0x8c8378, transparent: true, opacity: 0.7 })));

  // ---------- merge ----------
  const flat = (geos) => mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));
  bins.forEach((geos, key) => {
    const mesh = new THREE.Mesh(flat(geos), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...(MATS[key] || { color: 0xffffff }) }));
    mesh.castShadow = !["glass", "rug", "mat", "slab", "paving"].includes(key);
    mesh.receiveShadow = true;
    scene.add(mesh);
  });
  if (glowGeos.length) scene.add(new THREE.Mesh(flat(glowGeos), new THREE.MeshBasicMaterial({ color: 0xffeccb, toneMapped: false })));
  const poolTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,210,150,1)"); grd.addColorStop(0.45, "rgba(255,196,132,.42)"); grd.addColorStop(1, "rgba(255,190,130,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  [[tablePools, 0.24], [floorPools, 0.18]].forEach(([list, opacity]) => {
    if (!list.length) return;
    const m = new THREE.Mesh(mergeGeometries(list), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.renderOrder = 2;
    scene.add(m);
  });
  if (edges.length) scene.add(new THREE.LineSegments(mergeGeometries(edges), new THREE.LineBasicMaterial({ color: 0x5a524a, transparent: true, opacity: 0.35 })));

  // ---------- zone highlight overlays + outlines ----------
  const zones = new Map();
  data.zones.forEach((zn) => {
    const fills = [], lines = [];
    zn.rects.forEach(({ x, z, w, d }) => {
      const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.12, d - 0.12).rotateX(-Math.PI / 2).translate(x + w / 2, 0.04, z + d / 2),
        new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthWrite: false })
      );
      fill.renderOrder = 1;
      const i = 0.08;
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x + i, 0.045, z + i), new THREE.Vector3(x + w - i, 0.045, z + i),
          new THREE.Vector3(x + w - i, 0.045, z + d - i), new THREE.Vector3(x + i, 0.045, z + d - i),
        ]),
        new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.95 })
      );
      line.visible = false;
      scene.add(fill, line);
      fills.push(fill); lines.push(line);
    });
    const r0 = zn.rects[0];
    const c = zn.label ? new THREE.Vector3(zn.label.x, 0.05, zn.label.z) : new THREE.Vector3(r0.x + r0.w / 2, 0.05, r0.z + r0.d / 2);
    zones.set(zn.id, { rects: zn.rects, fills, lines, label: labels.querySelector(`[data-zone="${zn.id}"]`), center: c });
  });

  // ---------- controls: a gentle turn on desktop only (touch keeps page scroll) ----------
  let controls = null;
  if (fine) {
    controls = new OrbitControls(camera, canvas);
    controls.target.copy(target);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = !reducedMotion;
    controls.dampingFactor = 0.09;
    controls.rotateSpeed = 0.5;
    controls.minAzimuthAngle = A - 0.4;
    controls.maxAzimuthAngle = A + 0.4;
    controls.minPolarAngle = P - 0.2;
    controls.maxPolarAngle = P + 0.1;
    controls.update();
  }

  // ---------- state ----------
  let selected = null, hovered = null, dirty = true, active = true, raf = 0;
  function applyHighlight() {
    zones.forEach((zn, id) => {
      const sel = id === selected, hov = id === hovered && !sel;
      zn.fills.forEach((f) => { f.material.opacity = sel ? 0.14 : hov ? 0.08 : 0; });
      zn.lines.forEach((l) => { l.visible = sel; });
    });
    canvas.style.cursor = hovered ? "pointer" : "";
    dirty = true;
  }
  function select(id) { selected = zones.has(id) ? id : null; applyHighlight(); }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function zoneAt(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(floor, hit)) return null;
    for (const [id, zn] of zones) {
      if (zn.rects.some(({ x, z, w, d }) => hit.x >= x && hit.x <= x + w && hit.z >= z && hit.z <= z + d)) return id;
    }
    return null;
  }
  let down = null;
  canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const id = zoneAt(e);
    if (id && onSelect) onSelect(id);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || e.buttons) return;
    const id = zoneAt(e);
    if (id !== hovered) { hovered = id; applyHighlight(); }
  });
  canvas.addEventListener("pointerleave", () => { if (hovered) { hovered = null; applyHighlight(); } });

  // ---------- size, labels, render loop ----------
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    fitCamera(w, h);
    dirty = true;
  }
  new ResizeObserver(resize).observe(container);
  resize();
  controls?.addEventListener("change", () => { dirty = true; });

  const v = new THREE.Vector3();
  function placeLabels() {
    zones.forEach((zn) => {
      if (!zn.label) return;
      v.copy(zn.center).project(camera);
      zn.label.style.left = `${((v.x + 1) / 2) * 100}%`;
      zn.label.style.top = `${((1 - v.y) / 2) * 100}%`;
    });
  }
  function frame() {
    raf = 0;
    if (!active) return;
    if (controls && controls.update()) dirty = true;
    if (dirty) { dirty = false; renderer.render(scene, camera); placeLabels(); }
    raf = requestAnimationFrame(frame);
  }
  renderer.render(scene, camera);
  placeLabels();
  raf = requestAnimationFrame(frame);

  return {
    select,
    setActive(on) {
      active = on;
      if (on && !raf) { dirty = true; raf = requestAnimationFrame(frame); }
    },
  };
}
